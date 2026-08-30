import { dbConnect } from "@/service/mongo";
import { StudentModel } from "@/model/student-model";
import { EnrollmentModel } from "@/model/enrollment-model";
import { CourseModel } from "@/model/course-model";
import { TeacherModel } from "@/model/teacher-model";
import { UserModel } from "@/model/user-model";
import { escapeRegex } from "@/lib/utils";


/**
 * Get paginated list of students with optional search and filters
 */
export async function getAllStudents({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  courseId = "",
  month = "",
  paymentStatus = "",
  teacherFilter = "",
  crmFilter = "",
  fromDate = "",
  toDate = "",
} = {}) {
  await dbConnect();
  const mongoose = (await import("mongoose")).default;

  const conditions = [];

  // Status Filter
  if (status && status !== "all") {
    conditions.push({ status });
  }

  // Course Filter
  if (courseId && mongoose.isValidObjectId(courseId)) {
    conditions.push({
      $or: [
        { course: new mongoose.Types.ObjectId(courseId) },
        { enrolledCourses: { $in: [new mongoose.Types.ObjectId(courseId)] } }
      ]
    });
  }

  // Date Wise Filtering on createdAt
  if (fromDate || toDate) {
    const dateQuery = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      dateQuery.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      dateQuery.$lte = to;
    }
    conditions.push({ createdAt: dateQuery });
  }

  // Teacher Filter (assigned, unassigned, or specific Teacher ID)
  if (teacherFilter === "assigned") {
    conditions.push({ teacherId: { $ne: null } });
  } else if (teacherFilter === "unassigned") {
    conditions.push({ teacherId: null });
  } else if (teacherFilter && teacherFilter !== "all") {
    if (mongoose.isValidObjectId(teacherFilter)) {
      conditions.push({ teacherId: new mongoose.Types.ObjectId(teacherFilter) });
    } else {
      conditions.push({ teacherId: teacherFilter });
    }
  }

  // CRM Filter (assigned, unassigned, or specific CRM User ID)
  if (crmFilter === "assigned") {
    conditions.push({ crmRefId: { $nin: [null, ""] } });
  } else if (crmFilter === "unassigned") {
    conditions.push({ crmRefId: { $in: [null, ""] } });
  } else if (crmFilter && crmFilter !== "all") {
    conditions.push({ crmRefId: crmFilter });
  }

  // Payment Status Filter
  if (paymentStatus && paymentStatus !== "all") {
    const { PaymentModel } = await import("@/model/payment-model");
    const targetMonth = month || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    
    if (paymentStatus === "paid") {
      const paidPayments = await PaymentModel.find({
        month: targetMonth,
        status: "completed",
      }).select("student").lean();
      const paidStudentIds = paidPayments.map((p) => p.student?.toString()).filter(Boolean);
      conditions.push({ _id: { $in: paidStudentIds } });
    } else if (paymentStatus === "pending") {
      const pendingPayments = await PaymentModel.find({
        month: targetMonth,
        status: "pending",
      }).select("student").lean();
      const pendingStudentIds = pendingPayments.map((p) => p.student?.toString()).filter(Boolean);
      conditions.push({ _id: { $in: pendingStudentIds } });
    } else if (paymentStatus === "unpaid") {
      const paidOrPendingPayments = await PaymentModel.find({
        month: targetMonth,
        status: { $in: ["completed", "pending"] },
      }).select("student").lean();
      const paidOrPendingStudentIds = paidOrPendingPayments.map((p) => p.student?.toString()).filter(Boolean);
      conditions.push({ _id: { $nin: paidOrPendingStudentIds } });
    }
  }

  // Search Filter (by student info, teacher name, or CRM name)
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    const searchRegex = { $regex: escaped, $options: "i" };

    // Also look up teachers and CRM users that match this search query
    const { TeacherModel } = await import("@/model/teacher-model");
    const { UserModel } = await import("@/model/user-model");

    let matchedTeacherIds = [];
    let matchedCrmUserIds = [];

    try {
      const [matchedTeachers, matchedCrmUsers] = await Promise.all([
        TeacherModel.find({
          $or: [
            { fullName: searchRegex },
            { teacherId: searchRegex }
          ]
        }).select("_id").lean(),
        UserModel.find({
          $or: [
            { fullName: searchRegex },
            { email: searchRegex }
          ]
        }).select("_id").lean()
      ]);
      matchedTeacherIds = matchedTeachers.map(t => t._id);
      matchedCrmUserIds = matchedCrmUsers.map(u => u._id.toString());
    } catch {
      // ignore lookup error
    }

    const orClauses = [
      { fullName: searchRegex },
      { fatherName: searchRegex },
      { motherName: searchRegex },
      { email: searchRegex },
      { studentId: searchRegex },
      { phone: searchRegex },
      { whatsappNumber: searchRegex },
      { crmRefId: searchRegex },
    ];

    if (matchedTeacherIds.length > 0) {
      orClauses.push({ teacherId: { $in: matchedTeacherIds } });
    }
    if (matchedCrmUserIds.length > 0) {
      orClauses.push({ crmRefId: { $in: matchedCrmUserIds } });
    }

    conditions.push({ $or: orClauses });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

  const skip = (page - 1) * limit;
  const [students, total] = await Promise.all([
    StudentModel.find(query)
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StudentModel.countDocuments(query),
  ]);

  // Resolve teacher details and CRM (User) details safely
  const { TeacherModel } = await import("@/model/teacher-model");
  const { UserModel } = await import("@/model/user-model");

  const teacherIds = Array.from(
    new Set(
      students
        .map((s) => s.teacherId?.toString())
        .filter((id) => id && mongoose.isValidObjectId(id))
    )
  );

  const crmIds = Array.from(
    new Set(
      students
        .map((s) => s.crmRefId?.toString())
        .filter((id) => id && mongoose.isValidObjectId(id))
    )
  );

  let teachers = [];
  let crms = [];
  try {
    [teachers, crms] = await Promise.all([
      teacherIds.length > 0
        ? TeacherModel.find({ _id: { $in: teacherIds } }).select("fullName avatar").lean()
        : [],
      crmIds.length > 0
        ? UserModel.find({ _id: { $in: crmIds } }).select("fullName avatar").lean()
        : [],
    ]);
  } catch (err) {
    console.error("[getAllStudents] teacher/crm lookup error:", err);
  }

  const teacherMap = {};
  teachers.forEach((t) => {
    if (t._id) teacherMap[t._id.toString()] = { name: t.fullName, avatar: t.avatar || "" };
  });

  const crmMap = {};
  crms.forEach((c) => {
    if (c._id) crmMap[c._id.toString()] = { name: c.fullName, avatar: c.avatar || "" };
  });

  // Resolve payment details for the selected month safely
  const targetMonth = month || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const { PaymentModel } = await import("@/model/payment-model");
  const studentIdsList = students.map(s => s._id);
  
  const monthPayments = await PaymentModel.find({
    student: { $in: studentIdsList },
    month: targetMonth
  }).lean();

  const paymentMap = {};
  monthPayments.forEach((p) => {
    if (p.student) {
      paymentMap[p.student.toString()] = {
        status: p.status,
        amount: p.amount,
        createdAt: p.createdAt,
        paymentMethod: p.paymentMethod,
        mrNumber: p.mrNumber,
      };
    }
  });

  const enrichedStudents = students.map((s) => ({
    ...s,
    teacherInfo: s.teacherId ? (teacherMap[s.teacherId.toString()] || null) : null,
    crmInfo: s.crmRefId ? (crmMap[s.crmRefId.toString()] || null) : null,
    paymentInfo: paymentMap[s._id.toString()] || null,
  }));

  return {
    students: enrichedStudents,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get a single student by ID with their enrollments
 */
export async function getStudentById(id) {
  await dbConnect();
  const mongoose = (await import("mongoose")).default;
  if (!id || !mongoose.isValidObjectId(id)) return null;

  const student = await StudentModel.findById(id).lean();
  if (!student) return null;

  let teacherInfo = null;
  if (student.teacherId && mongoose.isValidObjectId(student.teacherId)) {
    try {
      const { TeacherModel } = await import("@/model/teacher-model");
      const teacher = await TeacherModel.findById(student.teacherId).select("fullName avatar").lean();
      if (teacher) {
        teacherInfo = {
          name: teacher.fullName,
          avatar: teacher.avatar || "",
        };
      }
    } catch { /* silent */ }
  }

  let crmInfo = null;
  if (student.crmRefId && mongoose.isValidObjectId(student.crmRefId)) {
    try {
      const { UserModel } = await import("@/model/user-model");
      const crm = await UserModel.findById(student.crmRefId).select("fullName avatar").lean();
      if (crm) {
        crmInfo = {
          name: crm.fullName,
          avatar: crm.avatar || "",
        };
      }
    } catch { /* silent */ }
  }

  let enrollments = [];
  try {
    enrollments = await EnrollmentModel.find({ student: id })
      .populate("course", "title category thumbnail status")
      .lean();
  } catch { /* silent */ }

  return { ...student, teacherInfo, crmInfo, enrollments };
}

/**
 * Create a new student
 */
export async function createStudent(data) {
  await dbConnect();
  if (data) {
    if (data.teacherId === "") data.teacherId = null;
    if (data.course === "") data.course = null;
  }
  const student = new StudentModel(data);
  await student.save();

  // If monthly fee is provided and > 0, generate a pending invoice in PaymentModel
  const monthlyAmount = Number(data?.monthlyFee || student.monthlyFee || 0);
  if (monthlyAmount > 0) {
    try {
      const { PaymentModel } = await import("@/model/payment-model");
      const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const existing = await PaymentModel.findOne({
        student: student._id,
        month: currentMonth,
        type: "monthly-fee",
        status: { $ne: "cancelled" },
      });

      if (!existing) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const pendingPayment = new PaymentModel({
          student: student._id,
          course: student.course || null,
          amount: monthlyAmount,
          currency: "BDT",
          type: "monthly-fee",
          status: "pending",
          paymentMethod: "other",
          month: currentMonth,
          dueDate: dueDate,
          notes: `Monthly tuition fee invoice for ${currentMonth}`,
        });

        await pendingPayment.save();
      }
    } catch (paymentErr) {
      console.error("Failed to auto-create monthly pending invoice in createStudent:", paymentErr);
    }
  }

  return student.toObject();
}

/**
 * Update a student by ID
 */
export async function updateStudent(id, data) {
  await dbConnect();
  if (data) {
    if (data.teacherId === "") data.teacherId = null;
    if (data.course === "") data.course = null;
    if (data.status) {
      if (data.status === "active") {
        data.isActive = true;
      } else if (data.status === "inactive" || data.status === "suspended") {
        data.isActive = false;
      }
    }
  }
  const student = await StudentModel.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  return student;
}

/**
 * Delete a student by ID
 */
export async function deleteStudent(id) {
  await dbConnect();
  await StudentModel.findByIdAndDelete(id);
  await EnrollmentModel.deleteMany({ student: id });
  try {
    const { ScheduleModel } = await import("@/model/schedule-model");
    await ScheduleModel.deleteMany({ student: id });
  } catch (e) {
    // ignore if schedule model cleanup fails
  }
  return { success: true };
}

/**
 * Get dashboard KPIs for students
 */
export async function getStudentDashboardStats() {
  await dbConnect();
  const [total, active, atRisk, completed] = await Promise.all([
    StudentModel.countDocuments(),
    StudentModel.countDocuments({ status: "active" }),
    StudentModel.countDocuments({ status: "at-risk" }),
    StudentModel.countDocuments({ status: "completed" }),
  ]);
  return { total, active, atRisk, completed };
}

/**
 * Get students flagged as at-risk
 */
export async function getStudentsAtRisk(limit = 5) {
  await dbConnect();
  return StudentModel.find({ status: "at-risk" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get recent students
 */
export async function getRecentStudents(limit = 5) {
  await dbConnect();
  return StudentModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
