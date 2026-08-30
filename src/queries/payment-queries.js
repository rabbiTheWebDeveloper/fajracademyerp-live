import { dbConnect } from "@/service/mongo";
import { PaymentModel } from "@/model/payment-model";
import { StudentModel } from "@/model/student-model";
import { escapeRegex } from "@/lib/utils";

/**
 * Get paginated list of payments with date range filter
 */
async function buildPaymentQuery({
  startDate = "",
  endDate = "",
  status = "",
  type = "",
  search = "",
  studentId = "",
  teacherId = "",
  month = "",
} = {}) {
  const query = {};
  if (status && status !== "all") query.status = status;
  if (type && type !== "all") query.type = type;
  if (month && month !== "all") query.month = month;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const andConditions = [];

  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    const searchRegex = { $regex: escaped, $options: "i" };
    // Search student records matching the search query
    const matchingStudents = await StudentModel.find({
      $or: [
        { studentId: searchRegex },
        { fullName: searchRegex },
        { email: searchRegex },
      ],
    }).select("_id").lean();

    const studentIdsArr = matchingStudents.map((s) => s._id);

    const searchConditions = [
      { transactionId: searchRegex },
      { invoiceId: searchRegex },
      { mrNumber: searchRegex },
    ];
    if (studentIdsArr.length > 0) {
      searchConditions.push({ student: { $in: studentIdsArr } });
    }

    andConditions.push({ $or: searchConditions });
  }

  if (studentId && studentId.trim()) {
    const trimmedStudentId = studentId.trim();
    if (trimmedStudentId.match(/^[0-9a-fA-F]{24}$/)) {
      andConditions.push({ student: trimmedStudentId });
    } else {
      const studentRegex = { $regex: escapeRegex(trimmedStudentId), $options: "i" };
      const matchingStudents = await StudentModel.find({
        $or: [
          { studentId: studentRegex },
          { fullName: studentRegex },
        ],
      }).select("_id").lean();

      const studentIdsArr = matchingStudents.map((s) => s._id);
      andConditions.push({ student: { $in: studentIdsArr } });
    }
  }

  if (teacherId && teacherId.trim()) {
    const { TeacherModel } = await import("@/model/teacher-model");
    const teacherRegex = { $regex: escapeRegex(teacherId.trim()), $options: "i" };
    const matchingTeachers = await TeacherModel.find({
      $or: [
        { teacherId: teacherRegex },
        { fullName: teacherRegex },
      ],
    }).select("_id").lean();

    const teacherIdsArr = matchingTeachers.map((t) => t._id);
    
    if (teacherIdsArr.length > 0) {
      const matchingStudents = await StudentModel.find({
        teacherId: { $in: teacherIdsArr }
      }).select("_id").lean();
      
      const studentIdsArr = matchingStudents.map((s) => s._id);
      andConditions.push({ student: { $in: studentIdsArr } });
    } else {
      // Force empty result if no teacher matches
      andConditions.push({ _id: null });
    }
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return query;
}

export async function getAllPayments(filters = {}) {
  await dbConnect();
  const query = await buildPaymentQuery(filters);
  const { page = 1, limit = 20 } = filters;

  const skip = (page - 1) * limit;
  const [payments, total, amountAgg] = await Promise.all([
    PaymentModel.find(query)
      .populate("student", "fullName studentId email avatar teacherId course")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentModel.countDocuments(query),
    PaymentModel.aggregate([
      { $match: query },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ])
  ]);

  const totalAmount = amountAgg[0]?.totalAmount || 0;

  const { TeacherModel } = await import("@/model/teacher-model");
  const resolvedPayments = await Promise.all(
    payments.map(async (p) => {
      if (p.student && p.student.teacherId) {
        const teacher = await TeacherModel.findById(p.student.teacherId).select("fullName avatar").lean();
        if (teacher) {
          p.student.teacherInfo = {
            name: teacher.fullName,
            avatar: teacher.avatar || ""
          };
        }
      }
      return p;
    })
  );

  return {
    payments: resolvedPayments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    totalAmount,
  };
}

/**
 * Get a single payment by ID
 */
export async function getPaymentById(id) {
  await dbConnect();
  const payment = await PaymentModel.findById(id)
    .populate("student", "fullName studentId email avatar teacherId course")
    .populate("course", "title")
    .lean();

  if (payment && payment.student && payment.student.teacherId) {
    const { TeacherModel } = await import("@/model/teacher-model");
    const teacher = await TeacherModel.findById(payment.student.teacherId).select("fullName avatar").lean();
    if (teacher) {
      payment.student.teacherInfo = {
        name: teacher.fullName,
        avatar: teacher.avatar || ""
      };
    }
  }
  return payment;
}

/**
 * Create a new payment record
 */
export async function createPayment(data) {
  await dbConnect();

  const paymentType = data.type || "monthly-fee";
  if (data.student && data.month && (paymentType === "monthly-fee" || paymentType === "installment")) {
    const existing = await PaymentModel.findOne({
      student: data.student,
      month: data.month,
      type: { $in: ["monthly-fee", "installment"] },
      status: { $ne: "cancelled" }
    });

    if (existing) {
      throw new Error(`A monthly fee payment record for this student for ${data.month} already exists.`);
    }
  }

  const payment = new PaymentModel(data);
  await payment.save();

  // Auto-activate student account if created payment has status completed
  if (payment.status === "completed" && payment.student) {
    try {
      const { StudentModel } = await import("@/model/student-model");
      const studentDoc = await StudentModel.findById(payment.student);
      if (studentDoc && (studentDoc.status === "inactive" || studentDoc.isActive === false)) {
        studentDoc.status = "active";
        studentDoc.isActive = true;
        if (!studentDoc.admissionDate) {
          studentDoc.admissionDate = new Date();
        }
        await studentDoc.save();
      }
    } catch (stErr) {
      console.error("Failed to auto-activate student on payment creation:", stErr);
    }
  }

  return payment.toObject();
}

/**
 * Get revenue statistics
 */
export async function getRevenueStats(filters = {}) {
  await dbConnect();

  const statsFilters = { ...filters };
  delete statsFilters.status;

  const query = await buildPaymentQuery(statsFilters);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Build queries for each card
  const monthlyRevenueQuery = { ...query, status: "completed" };
  const pendingDuesQuery = { ...query, status: "pending" };
  const refundedQuery = { ...query, status: "refunded" };

  // If no Target Month filter and no date range filter is active, fall back to current calendar month for Monthly Revenue and Refunds
  if (!statsFilters.month && !statsFilters.startDate && !statsFilters.endDate) {
    monthlyRevenueQuery.createdAt = { $gte: startOfMonth };
    refundedQuery.createdAt = { $gte: startOfMonth };
  }

  // For comparison vs last month
  let lastMonthRevenueQuery = null;
  if (statsFilters.month) {
    const d = new Date(Date.parse(statsFilters.month + " 1"));
    if (!isNaN(d.getTime())) {
      d.setMonth(d.getMonth() - 1);
      const lastMonthName = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      lastMonthRevenueQuery = await buildPaymentQuery({ ...statsFilters, month: lastMonthName, status: "completed" });
    }
  } else {
    lastMonthRevenueQuery = {
      ...query,
      status: "completed",
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    };
  }

  const [monthlyRevenueAgg, pendingDuesAgg, refundedAgg, lastMonthRevenueAgg] = await Promise.all([
    PaymentModel.aggregate([
      { $match: monthlyRevenueQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    PaymentModel.aggregate([
      { $match: pendingDuesQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    PaymentModel.aggregate([
      { $match: refundedQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    lastMonthRevenueQuery ? PaymentModel.aggregate([
      { $match: lastMonthRevenueQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]) : Promise.resolve([])
  ]);

  const monthly = monthlyRevenueAgg[0]?.total || 0;
  const pending = pendingDuesAgg[0]?.total || 0;
  const ref = refundedAgg[0]?.total || 0;
  const lastMonthly = lastMonthRevenueAgg[0]?.total || 0;

  const monthlyChange = lastMonthly > 0
    ? (((monthly - lastMonthly) / lastMonthly) * 100).toFixed(1)
    : 0;

  return {
    monthlyRevenue: monthly,
    pendingDues: pending,
    refunded: ref,
    monthlyChange: Number(monthlyChange),
  };
}

/**
 * Get revenue chart data by month (last 6 months)
 */
export async function getRevenueChartData() {
  await dbConnect();
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const data = await Promise.all(
    months.map(async ({ year, month }) => {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const agg = await PaymentModel.aggregate([
        { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      return {
        month: start.toLocaleString("default", { month: "short" }),
        revenue: agg[0]?.total || 0,
      };
    })
  );
  return data;
}

/**
 * Get payments for a specific student
 */
export async function getPaymentsByStudent(studentId) {
  await dbConnect();
  return PaymentModel.find({ student: studentId })
    .populate("course", "title")
    .sort({ createdAt: -1 })
    .lean();
}
