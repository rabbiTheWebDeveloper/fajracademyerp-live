import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { ClassSessionModel } from "@/model/class-model";
import { TeacherModel } from "@/model/teacher-model";
import { escapeRegex } from "@/lib/utils";

/**
 * GET /api/admin/classes
 *
 * Comprehensive classes overview API supporting:
 * - Monthly Total, Monthly Completed, Monthly Remaining, Monthly Scheduled, Monthly In-Progress, Monthly Cancelled classes.
 * - Daily/selected date Total, Completed, Remaining, Scheduled, In-Progress, Cancelled classes.
 * - Student attendance (Present, Absent, Not-Marked) and participation rates.
 * - All-time stats per teacher.
 * - Paginated list of teachers with detailed class sessions.
 *
 * Query Params:
 *   date     - ISO date string for a specific day (defaults to today, e.g. "YYYY-MM-DD")
 *   month    - Month string (defaults to current month or date's month, e.g. "YYYY-MM")
 *   viewMode - "day" | "month" (default: "month")
 *   status   - filter by class status: scheduled | in-progress | completed | cancelled | all (default: all)
 *   search   - search teacher name or teacherId
 *   page     - page number (default: 1)
 *   limit    - items per page (default: 10)
 */
export async function GET(request) {
  try {
    await dbConnect();

    // Ensure models are registered
    await Promise.all([
      import("@/model/course-model"),
      import("@/model/student-model"),
      import("@/model/teacher-model"),
    ]);

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const monthParam = searchParams.get("month");
    const viewMode = searchParams.get("viewMode") || "month"; // "day" or "month"
    const statusFilter = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    // ── Build Date Boundaries ───────────────────────────────────────────────
    const now = new Date();
    let targetDate = now;
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = DAYS[targetDate.getDay()];

    // Month boundary
    let targetYear = targetDate.getFullYear();
    let targetMonth = targetDate.getMonth() + 1; // 1-12
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      targetYear = y;
      targetMonth = m;
    }
    const selectedMonthStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // ── Fetch Teachers Matching Search ──────────────────────────────────────
    const teacherQuery = {};
    if (search) {
      const escaped = escapeRegex(search);
      teacherQuery.$or = [
        { fullName: { $regex: escaped, $options: "i" } },
        { teacherId: { $regex: escaped, $options: "i" } },
      ];
    }

    const teachers = await TeacherModel.find(teacherQuery)
      .select("_id teacherId fullName designation avatar status phone")
      .lean();

    if (!teachers.length) {
      return NextResponse.json({
        success: true,
        teachers: [],
        summary: {
          monthlyTotalClasses: 0,
          monthlyCompleted: 0,
          monthlyRemaining: 0,
          monthlyScheduled: 0,
          monthlyInProgress: 0,
          monthlyCancelled: 0,
          monthlyPresent: 0,
          monthlyAbsent: 0,
          todayTotalClasses: 0,
          todayCompleted: 0,
          todayRemaining: 0,
          todayScheduled: 0,
          todayInProgress: 0,
          todayCancelled: 0,
          todayPresent: 0,
          todayAbsent: 0,
          todayNotMarked: 0,
          totalTeachers: 0,
          activeTeachersMonth: 0,
          activeTeachersToday: 0,
        },
        pagination: { page, limit, total: 0, totalPages: 0 },
        date: targetDate.toISOString().split("T")[0],
        month: selectedMonthStr,
        dayName: todayName,
      });
    }

    const teacherIds = teachers.map((t) => t._id);

    // ── 1. Monthly Aggregation per Teacher ──────────────────────────────────
    const monthlyAggPromise = ClassSessionModel.aggregate([
      {
        $match: {
          teacher: { $in: teacherIds },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$teacher",
          monthlyTotal:      { $sum: 1 },
          monthlyScheduled:  { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
          monthlyInProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
          monthlyCompleted:  { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          monthlyCancelled:  { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          monthlyPresent:    { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] } },
          monthlyAbsent:     { $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"] }, 1, 0] } },
          monthlyNotMarked:  { $sum: { $cond: [{ $eq: ["$studentAttendance", "not-marked"] }, 1, 0] } },
        },
      },
    ]);

    // ── 2. Daily / Selected Date Aggregation per Teacher ────────────────────
    const dailyAggPromise = ClassSessionModel.aggregate([
      {
        $match: {
          teacher: { $in: teacherIds },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$teacher",
          todayTotal:      { $sum: 1 },
          todayScheduled:  { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
          todayInProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
          todayCompleted:  { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          todayCancelled:  { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          todayPresent:    { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] } },
          todayAbsent:     { $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"] }, 1, 0] } },
          todayNotMarked:  { $sum: { $cond: [{ $eq: ["$studentAttendance", "not-marked"] }, 1, 0] } },
        },
      },
    ]);

    // ── 3. All-time Aggregation per Teacher ─────────────────────────────────
    const allTimeAggPromise = ClassSessionModel.aggregate([
      { $match: { teacher: { $in: teacherIds } } },
      {
        $group: {
          _id: "$teacher",
          totalClasses:    { $sum: 1 },
          presentCount:    { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] } },
          absentCount:     { $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"] }, 1, 0] } },
          completedCount:  { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          scheduledCount:  { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
          inProgressCount: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
        },
      },
    ]);

    // ── 4. Overall Monthly & Daily Summary Aggregates ────────────────────────
    const overallMonthlyPromise = ClassSessionModel.aggregate([
      {
        $match: {
          teacher: { $in: teacherIds },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        },
      },
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
          progress:  { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          present:   { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] } },
          absent:    { $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"] }, 1, 0] } },
          teachers:  { $addToSet: "$teacher" },
        },
      },
    ]);

    const overallDailyPromise = ClassSessionModel.aggregate([
      {
        $match: {
          teacher: { $in: teacherIds },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        },
      },
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
          progress:  { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          present:   { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] } },
          absent:    { $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"] }, 1, 0] } },
          teachers:  { $addToSet: "$teacher" },
        },
      },
    ]);

    const [monthlyAgg, dailyAgg, allTimeAgg, overallMonthly, overallDaily] = await Promise.all([
      monthlyAggPromise,
      dailyAggPromise,
      allTimeAggPromise,
      overallMonthlyPromise,
      overallDailyPromise,
    ]);

    const monthlyMap = {};
    for (const m of monthlyAgg) monthlyMap[m._id.toString()] = m;

    const dailyMap = {};
    for (const d of dailyAgg) dailyMap[d._id.toString()] = d;

    const allTimeMap = {};
    for (const a of allTimeAgg) allTimeMap[a._id.toString()] = a;

    // ── Build Merged Teacher List ───────────────────────────────────────────
    const enrichedTeachers = teachers.map((t) => {
      const tid = t._id.toString();
      const m = monthlyMap[tid] || {
        monthlyTotal: 0, monthlyScheduled: 0, monthlyInProgress: 0,
        monthlyCompleted: 0, monthlyCancelled: 0, monthlyPresent: 0,
        monthlyAbsent: 0, monthlyNotMarked: 0,
      };
      const d = dailyMap[tid] || {
        todayTotal: 0, todayScheduled: 0, todayInProgress: 0,
        todayCompleted: 0, todayCancelled: 0, todayPresent: 0,
        todayAbsent: 0, todayNotMarked: 0,
      };
      const a = allTimeMap[tid] || {
        totalClasses: 0, presentCount: 0, absentCount: 0,
        completedCount: 0, scheduledCount: 0, inProgressCount: 0,
      };

      const monthlyRemaining = Math.max(0, m.monthlyTotal - m.monthlyCompleted);
      const todayRemaining = Math.max(0, d.todayTotal - d.todayCompleted);

      return {
        _id:         t._id,
        teacherId:   t.teacherId,
        fullName:    t.fullName,
        designation: t.designation,
        avatar:      t.avatar,
        status:      t.status,
        phone:       t.phone || "",

        // Monthly Stats
        monthlyTotal:      m.monthlyTotal,
        monthlyCompleted:  m.monthlyCompleted,
        monthlyRemaining:  monthlyRemaining,
        monthlyScheduled:  m.monthlyScheduled,
        monthlyInProgress: m.monthlyInProgress,
        monthlyCancelled:  m.monthlyCancelled,
        monthlyPresent:    m.monthlyPresent,
        monthlyAbsent:     m.monthlyAbsent,
        monthlyNotMarked:  m.monthlyNotMarked,

        // Today / Selected Date Stats
        todayTotal:        d.todayTotal,
        todayCompleted:    d.todayCompleted,
        todayRemaining:    todayRemaining,
        todayScheduled:    d.todayScheduled,
        todayInProgress:   d.todayInProgress,
        todayCancelled:    d.todayCancelled,
        todayPresent:      d.todayPresent,
        todayAbsent:       d.todayAbsent,
        todayNotMarked:    d.todayNotMarked,

        // All-Time Stats
        totalClasses:      a.totalClasses,
        presentCount:      a.presentCount,
        absentCount:       a.absentCount,
        completedCount:    a.completedCount,
        scheduledCount:    a.scheduledCount,
        inProgressCount:   a.inProgressCount,
      };
    });

    // Sort by Monthly Total descending (secondary by Today Total, then All-Time)
    enrichedTeachers.sort((a, b) => {
      if (viewMode === "month") {
        return b.monthlyTotal - a.monthlyTotal || b.totalClasses - a.totalClasses;
      }
      return b.todayTotal - a.todayTotal || b.monthlyTotal - a.monthlyTotal || b.totalClasses - a.totalClasses;
    });

    // ── Pagination ──────────────────────────────────────────────────────────
    const total = enrichedTeachers.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedTeachers = enrichedTeachers.slice((page - 1) * limit, page * limit);
    const paginatedTeacherIds = paginatedTeachers.map((t) => t._id);

    // ── Fetch Detailed Class Sessions for Paginated Teachers ────────────────
    const sessionTimeFilter = viewMode === "month"
      ? { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
      : { createdAt: { $gte: startOfDay, $lte: endOfDay } };

    const sessionQuery = {
      teacher: { $in: paginatedTeacherIds },
      ...sessionTimeFilter,
    };
    if (statusFilter !== "all") {
      sessionQuery.status = statusFilter;
    }

    const sessions = await ClassSessionModel.find(sessionQuery)
      .populate({ path: "course",  select: "title courseId level thumbnail" })
      .populate({ path: "student", select: "fullName studentId avatar phone" })
      .sort({ startTime: 1, createdAt: -1 })
      .lean();

    // Group sessions by teacher
    const sessionsByTeacher = {};
    for (const s of sessions) {
      const tid = s.teacher.toString();
      if (!sessionsByTeacher[tid]) sessionsByTeacher[tid] = [];
      sessionsByTeacher[tid].push(s);
    }

    // Attach sessions to paginated teachers
    const result = paginatedTeachers.map((t) => {
      const tid = t._id.toString();
      return {
        ...t,
        sessions: sessionsByTeacher[tid] || [],
        // for backward compatibility
        todayClasses: sessionsByTeacher[tid] || [],
      };
    });

    // ── Assemble Overall Summary ────────────────────────────────────────────
    const mSummary = overallMonthly[0] || {};
    const dSummary = overallDaily[0] || {};

    const monthlyTotalClasses = mSummary.total || 0;
    const monthlyCompleted = mSummary.completed || 0;
    const monthlyRemaining = Math.max(0, monthlyTotalClasses - monthlyCompleted);

    const todayTotalClasses = dSummary.total || 0;
    const todayCompleted = dSummary.completed || 0;
    const todayRemaining = Math.max(0, todayTotalClasses - todayCompleted);

    const summary = {
      // Monthly KPIs
      monthlyTotalClasses,
      monthlyCompleted,
      monthlyRemaining,
      monthlyScheduled:    mSummary.scheduled || 0,
      monthlyInProgress:   mSummary.progress || 0,
      monthlyCancelled:    mSummary.cancelled || 0,
      monthlyPresent:      mSummary.present || 0,
      monthlyAbsent:       mSummary.absent || 0,
      activeTeachersMonth: mSummary.teachers?.length || 0,

      // Daily / Selected Date KPIs
      todayTotalClasses,
      todayCompleted,
      todayRemaining,
      todayScheduled:      dSummary.scheduled || 0,
      todayInProgress:     dSummary.progress || 0,
      todayCancelled:      dSummary.cancelled || 0,
      todayPresent:        dSummary.present || 0,
      todayAbsent:         dSummary.absent || 0,
      activeTeachersToday: dSummary.teachers?.length || 0,

      // Total Teacher Count
      totalTeachers: teachers.length,

      // Backward compatibility aliases
      totalClasses: viewMode === "month" ? monthlyTotalClasses : todayTotalClasses,
      totalPresent: viewMode === "month" ? (mSummary.present || 0) : (dSummary.present || 0),
      totalAbsent:  viewMode === "month" ? (mSummary.absent || 0) : (dSummary.absent || 0),
    };

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split("T")[0],
      month: selectedMonthStr,
      viewMode,
      dayName: todayName,
      teachers: result,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/classes error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
