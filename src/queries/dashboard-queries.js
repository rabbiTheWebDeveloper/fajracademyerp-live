import mongoose from "mongoose";
import { dbConnect } from "@/service/mongo";
import { StudentModel } from "@/model/student-model";
import { TeacherModel } from "@/model/teacher-model";
import { CourseModel } from "@/model/course-model";
import { PaymentModel } from "@/model/payment-model";
import { SupportTicketModel } from "@/model/support-ticket-model";
import { AssessmentModel } from "@/model/assessment-model";
import { EnrollmentModel } from "@/model/enrollment-model";
import { ClassSessionModel } from "@/model/class-model";
import { UserModel } from "@/model/user-model";

/**
 * Get all dashboard KPI cards data
 */
export async function getDashboardKPIs() {
  await dbConnect();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // ✅ OPTIMIZED: merged ratingAgg into the main Promise.all — was a sequential call after
  const [
    totalStudents,
    activeStudents,
    totalTeachers,
    activeTeachers,
    openTickets,
    monthlyRevenue,
    totalCourses,
    publishedCourses,
    ratingAgg,
  ] = await Promise.all([
    StudentModel.countDocuments(),
    StudentModel.countDocuments({ status: "active" }),
    TeacherModel.countDocuments(),
    TeacherModel.countDocuments({ status: "active" }),
    SupportTicketModel.countDocuments({ status: { $in: ["open", "in-progress"] } }),
    PaymentModel.aggregate([
      { $match: { status: "completed", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    CourseModel.countDocuments(),
    CourseModel.countDocuments({ status: "published" }),
    TeacherModel.aggregate([
      { $match: { totalRatings: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]),
  ]);

  return {
    totalStudents,
    activeStudents,
    totalTeachers,
    activeTeachers,
    avgTeacherRating: ratingAgg[0]?.avgRating?.toFixed(1) || "N/A",
    openTickets,
    monthlyRevenue: monthlyRevenue[0]?.total || 0,
    totalCourses,
    publishedCourses,
  };
}

/**
 * Get enrollment + revenue chart data for the last 7 days.
 * ✅ OPTIMIZED: was 14 DB queries (2 per day × 7 days).
 * Now uses 2 aggregate pipelines that cover the entire 7-day window at once.
 */
export async function getDashboardChartData() {
  await dbConnect();

  const now = new Date();

  // 1. Weekly Data boundaries (last 7 days, oldest to newest)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const weekStart = days[0];
  const weekEnd   = new Date(days[6].getFullYear(), days[6].getMonth(), days[6].getDate(), 23, 59, 59);

  // 2. Monthly Data boundaries (current calendar month)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Run all aggregates in parallel
  const [
    weekEnrollAgg,
    weekRevenueAgg,
    monthEnrollAgg,
    monthRevenueAgg,
    weekClassAgg,
    weekStudentAgg,
    monthStudentAgg,
  ] = await Promise.all([
    // Weekly enrollments (EnrollmentModel)
    EnrollmentModel.aggregate([
      { $match: { createdAt: { $gte: weekStart, $lte: weekEnd } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" }, d: { $dayOfMonth: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    // Weekly revenue
    PaymentModel.aggregate([
      { $match: { status: "completed", createdAt: { $gte: weekStart, $lte: weekEnd } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" }, d: { $dayOfMonth: "$createdAt" } },
          total: { $sum: "$amount" },
        },
      },
    ]),
    // Monthly enrollments
    EnrollmentModel.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]),
    // Monthly revenue
    PaymentModel.aggregate([
      { $match: { status: "completed", createdAt: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          total: { $sum: "$amount" },
        },
      },
    ]),
    // Teacher class sessions (weekly activity)
    ClassSessionModel.aggregate([
      { $match: { createdAt: { $gte: weekStart, $lte: weekEnd } } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]),
    // Weekly student registrations (StudentModel.createdAt)
    StudentModel.aggregate([
      { $match: { createdAt: { $gte: weekStart, $lte: weekEnd } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" }, d: { $dayOfMonth: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    // Monthly student registrations (StudentModel.createdAt)
    StudentModel.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Maps for quick lookup
  const weekEnrollMap  = new Map(weekEnrollAgg.map(r  => [`${r._id.y}-${r._id.m}-${r._id.d}`, r.count]));
  const weekRevenueMap = new Map(weekRevenueAgg.map(r => [`${r._id.y}-${r._id.m}-${r._id.d}`, r.total]));
  const weekStudentMap = new Map(weekStudentAgg.map(r => [`${r._id.y}-${r._id.m}-${r._id.d}`, r.count]));

  const monthEnrollMap  = new Map(monthEnrollAgg.map(r  => [r._id, r.count]));
  const monthRevenueMap = new Map(monthRevenueAgg.map(r => [r._id, r.total]));
  const monthStudentMap = new Map(monthStudentAgg.map(r => [r._id, r.count]));

  // Process Weekly Data
  const weeklyData = days.map(day => {
    const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
    return {
      day:      day.toLocaleDateString("en-US", { weekday: "short" }),
      students: weekEnrollMap.get(key) || 0,
      revenue:  weekRevenueMap.get(key) || 0,
    };
  });

  // Process Monthly Daily Data
  const daysInMonth = monthEnd.getDate();
  const monthlyDailyData = [];
  for (let i = 1; i <= daysInMonth; i++) {
    monthlyDailyData.push({
      day:      `${i}`,
      students: monthEnrollMap.get(i) || 0,
      revenue:  monthRevenueMap.get(i) || 0,
    });
  }

  // Process Weekly Student Registration Data (from StudentModel.createdAt)
  const weeklyStudentData = days.map(day => {
    const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
    return {
      day:   day.toLocaleDateString("en-US", { weekday: "short" }),
      count: weekStudentMap.get(key) || 0,
    };
  });

  // Process Monthly Student Registration Data (from StudentModel.createdAt)
  const monthlyStudentData = [];
  for (let i = 1; i <= daysInMonth; i++) {
    monthlyStudentData.push({
      day:   `${i}`,
      count: monthStudentMap.get(i) || 0,
    });
  }

  // Process Teacher Activity Data
  const classStatusMap = new Map(); // key: "YYYY-M-D" -> { completed, total }
  weekClassAgg.forEach(r => {
    const key = `${r._id.y}-${r._id.m}-${r._id.d}`;
    if (!classStatusMap.has(key)) {
      classStatusMap.set(key, { completed: 0, scheduled: 0 });
    }
    const val = classStatusMap.get(key);
    val.scheduled += r.count;
    if (r._id.status === "completed") {
      val.completed += r.count;
    }
  });

  const teacherActivityData = days.map(day => {
    const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
    const stats = classStatusMap.get(key) || { completed: 0, scheduled: 0 };
    return {
      day: day.toLocaleDateString("en-US", { weekday: "short" }),
      completed: stats.completed,
      scheduled: stats.scheduled,
    };
  });

  return {
    weeklyData,
    monthlyDailyData,
    teacherActivityData,
    weeklyStudentData,
    monthlyStudentData,
  };
}

/**
 * Get recent activity across the platform
 */
export async function getRecentActivity(limit = 10) {
  await dbConnect();

  const [recentStudents, recentTickets, recentPayments] = await Promise.all([
    StudentModel.find().sort({ createdAt: -1 }).limit(3).lean(),
    SupportTicketModel.find().sort({ createdAt: -1 }).limit(3).lean(),
    PaymentModel.find({ status: "completed" })
      .populate("student", "fullName")
      .sort({ createdAt: -1 })
      .limit(4)
      .lean(),
  ]);

  const activities = [
    ...recentStudents.map((s) => ({
      type: "student_enrolled",
      text: `${s.fullName} enrolled as a new student`,
      time: s.createdAt,
      icon: "user",
    })),
    ...recentTickets.map((t) => ({
      type: "ticket_opened",
      text: `New support ticket: "${t.title}"`,
      time: t.createdAt,
      icon: "ticket",
    })),
    ...recentPayments.map((p) => ({
      type: "payment_received",
      text: `Payment of $${p.amount} received from ${p.student?.fullName || "student"}`,
      time: p.createdAt,
      icon: "payment",
    })),
  ];

  return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, limit);
}

/**
 * Get at-risk students for dashboard alert
 */
export async function getDashboardAtRiskStudents(limit = 5) {
  await dbConnect();
  return StudentModel.find({ status: "at-risk" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Monthly attendance summary — 12-month chart data showing present/absent/late
 * counts per month for the whole academy.
 */
export async function getMonthlyAttendanceSummary(year) {
  const { AttendanceModel } = await import("@/model/attendance-model");
  await dbConnect();

  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);  // Jan 1
  const endDate   = new Date(targetYear, 11, 31, 23, 59, 59); // Dec 31

  const agg = await AttendanceModel.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { month: { $month: "$date" }, status: "$status" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.month",
        statuses: { $push: { status: "$_id.status", count: "$count" } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Build full 12-month array
  const result = MONTHS.map((name, idx) => {
    const monthNum = idx + 1;
    const found = agg.find((a) => a._id === monthNum);
    const present = found?.statuses?.find((s) => s.status === "present")?.count || 0;
    const absent  = found?.statuses?.find((s) => s.status === "absent")?.count  || 0;
    const late    = found?.statuses?.find((s) => s.status === "late")?.count    || 0;
    const excused = found?.statuses?.find((s) => s.status === "excused")?.count || 0;
    const total   = present + absent + late + excused;
    const rate    = total > 0 ? Math.round((present + late) / total * 100) : 0;
    return { name, month: monthNum, present, absent, late, excused, total, rate };
  });

  return result;
}

/**
 * Per-student attendance list for a specific month/year.
 * Starts from ALL students so rows always appear even with zero attendance.
 * Left-joins attendance records for the selected month.
 * Supports pagination and search.
 */
export async function getStudentAttendanceList({ month, year, search = "", page = 1, limit = 20 }) {
  const { AttendanceModel } = await import("@/model/attendance-model");
  await dbConnect();

  const targetYear  = parseInt(year)  || new Date().getFullYear();
  const targetMonth = parseInt(month) || new Date().getMonth() + 1;

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate   = new Date(targetYear, targetMonth, 0, 23, 59, 59); // last day of month

  // ── Step 1: Aggregate attendance records for the period ──────────────────────
  const attendanceAgg = await AttendanceModel.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: "$student",
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        absent:  { $sum: { $cond: [{ $eq: ["$status", "absent"]  }, 1, 0] } },
        late:    { $sum: { $cond: [{ $eq: ["$status", "late"]    }, 1, 0] } },
        excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } },
      },
    },
  ]);

  // Build a fast lookup: studentObjectId string → attendance counts
  const attendanceById = {};
  attendanceAgg.forEach((row) => {
    if (row._id) attendanceById[row._id.toString()] = row;
  });

  // ── Step 2: Fetch ALL students from the Student collection ───────────────────
  // This guarantees every student shows up in the list, even with 0 attendance.
  const allStudents = await StudentModel.find({})
    .select("_id studentId fullName email phone avatar gender status")
    .sort({ fullName: 1 })
    .lean();

  // ── Step 3: Merge student info with their attendance counts ──────────────────
  const merged = allStudents.map((s) => {
    const att     = attendanceById[s._id.toString()];
    const present = att?.present ?? 0;
    const absent  = att?.absent  ?? 0;
    const late    = att?.late    ?? 0;
    const excused = att?.excused ?? 0;
    const total   = present + absent + late + excused;
    const rate    = total > 0 ? Math.round((present + late) / total * 100) : 0;
    return {
      studentId:   s._id,
      studentCode: s.studentId || "",
      fullName:    s.fullName  || "",
      email:       s.email     || "",
      phone:       s.phone     || "",
      avatar:      s.avatar    || "",
      status:      s.status    || "active",
      present,
      absent,
      late,
      excused,
      total,
      rate,
    };
  });

  // Sort: students with most absences first, then alphabetically
  merged.sort((a, b) => b.absent - a.absent || a.fullName.localeCompare(b.fullName));

  // ── Step 4: Search filter ────────────────────────────────────────────────────
  const lowerSearch = search.toLowerCase().trim();
  const filtered = lowerSearch
    ? merged.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(lowerSearch) ||
          s.studentCode?.toLowerCase().includes(lowerSearch) ||
          s.email?.toLowerCase().includes(lowerSearch)
      )
    : merged;

  // ── Step 5: Paginate ─────────────────────────────────────────────────────────
  const total     = filtered.length;
  const pageCount = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  // ── Step 6: Summary totals (only from students who have attendance records) ──
  const summary = attendanceAgg.reduce(
    (acc, s) => ({
      present: acc.present + (s.present || 0),
      absent:  acc.absent  + (s.absent  || 0),
      late:    acc.late    + (s.late    || 0),
      excused: acc.excused + (s.excused || 0),
    }),
    { present: 0, absent: 0, late: 0, excused: 0 }
  );
  summary.total = summary.present + summary.absent + summary.late + summary.excused;
  summary.rate  = summary.total > 0
    ? Math.round((summary.present + summary.late) / summary.total * 100)
    : 0;

  return { students: paginated, total, pageCount, summary };
}

/**
 * Get CRM in-charge statistics (student count, admission fee, monthly fee, total amount) with optional monthly filtering
 * @param {Object} options
 * @param {string|number} [options.month] - 1 to 12 or 'all'
 * @param {string|number} [options.year] - e.g. 2026 or 'all'
 */
export async function getCrmInChargeStats({ month, year } = {}) {
  await dbConnect();

  const match = {};

  if (month && month !== "all" && year && year !== "all") {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);
      match.$or = [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { admissionDate: { $gte: startDate, $lte: endDate } },
      ];
    }
  } else if (year && year !== "all") {
    const y = parseInt(year, 10);
    if (!isNaN(y)) {
      const startDate = new Date(y, 0, 1);
      const endDate = new Date(y, 11, 31, 23, 59, 59, 999);
      match.$or = [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { admissionDate: { $gte: startDate, $lte: endDate } },
      ];
    }
  }

  const pipeline = [
    ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
    {
      $group: {
        _id: { $ifNull: ["$crmRefId", ""] },
        studentCount: { $sum: 1 },
        totalAdmissionFee: { $sum: { $ifNull: ["$admissionFee", 0] } },
        totalMonthlyFee: { $sum: { $ifNull: ["$monthlyFee", 0] } },
        totalMonthlyDue: { $sum: { $ifNull: ["$monthlyDue", 0] } },
      },
    },
    { $sort: { studentCount: -1 } },
  ];

  const rawStats = await StudentModel.aggregate(pipeline);

  // Find CRM users
  const validUserIds = rawStats
    .map((r) => r._id)
    .filter((id) => id && mongoose.isValidObjectId(id));

  const crmUsers = validUserIds.length > 0
    ? await UserModel.find({ _id: { $in: validUserIds } }).select("fullName email avatar role").lean()
    : [];

  const userMap = new Map(crmUsers.map((u) => [u._id.toString(), u]));

  let grandTotalStudents = 0;
  let grandTotalAdmission = 0;
  let grandTotalMonthly = 0;
  let grandTotalAmount = 0;
  let grandTotalDue = 0;

  const items = rawStats.map((r) => {
    const idStr = r._id ? r._id.toString() : "";
    const user = userMap.get(idStr);
    const crmName = user?.fullName || (idStr ? "Unknown CRM" : "Unassigned");
    const admissionFee = Number(r.totalAdmissionFee) || 0;
    const monthlyFee = Number(r.totalMonthlyFee) || 0;
    const monthlyDue = Number(r.totalMonthlyDue) || 0;
    const totalAmount = admissionFee + monthlyFee;
    const studentCount = Number(r.studentCount) || 0;

    grandTotalStudents += studentCount;
    grandTotalAdmission += admissionFee;
    grandTotalMonthly += monthlyFee;
    grandTotalAmount += totalAmount;
    grandTotalDue += monthlyDue;

    return {
      crmId: idStr || "unassigned",
      crmName,
      crmEmail: user?.email || "",
      crmAvatar: user?.avatar || "",
      crmRole: user?.role || "",
      studentCount,
      admissionFee,
      monthlyFee,
      monthlyDue,
      totalAmount,
    };
  });

  return {
    items,
    totals: {
      totalStudents: grandTotalStudents,
      totalAdmissionFee: grandTotalAdmission,
      totalMonthlyFee: grandTotalMonthly,
      totalAmount: grandTotalAmount,
      totalMonthlyDue: grandTotalDue,
    },
  };
}
