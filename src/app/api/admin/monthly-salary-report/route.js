import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";

/**
 * GET /api/admin/monthly-salary-report
 *
 * Returns the full monthly salary data for all teachers.
 * Used for the Monthly Salary Report page — PDF / Excel / CSV export.
 *
 * Query params:
 *   month   – YYYY-MM  (required — the month to generate report for)
 *   status  – "pending" | "paid" | "" (all)
 *   search  – teacher name search
 */
export async function GET(request) {
  try {
    await dbConnect();

    // ── Load models ───────────────────────────────────────────────────────────
    const [
      { TeacherSalaryModel },
      { TeacherModel },
      { StudentModel },
    ] = await Promise.all([
      import("@/model/teacherSalary-model"),
      import("@/model/teacher-model"),
      import("@/model/student-model"),
    ]);

    const { searchParams } = new URL(request.url);
    const month  = searchParams.get("month")  || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    // ── Build query ───────────────────────────────────────────────────────────
    const query = {};
    if (month)  query.month  = month;
    if (status) query.status = status;

    // ── Fetch salary records ──────────────────────────────────────────────────
    let salaries = await TeacherSalaryModel.find(query)
      .populate("teacher", "fullName teacherId designation email phone avatar salary salaryType status")
      .sort({ calculatedAmount: -1 })
      .lean();

    // ── Apply name search (post-populate) ─────────────────────────────────────
    if (search) {
      const lc = search.toLowerCase();
      salaries = salaries.filter(
        (s) =>
          s.teacher?.fullName?.toLowerCase().includes(lc) ||
          s.teacher?.teacherId?.toLowerCase().includes(lc)
      );
    }

    // ── Attach student count per teacher ──────────────────────────────────────
    if (salaries.length > 0) {
      const teacherObjectIds = salaries.map((s) => s.teacher?._id).filter(Boolean);
      const students = await StudentModel.find({ teacherId: { $in: teacherObjectIds } })
        .select("teacherId fullName studentId course")
        .populate("course", "title")
        .lean();

      const studentsByTeacher = {};
      for (const stu of students) {
        const tid = stu.teacherId?.toString();
        if (!tid) continue;
        if (!studentsByTeacher[tid]) studentsByTeacher[tid] = [];
        studentsByTeacher[tid].push(stu);
      }

      salaries.forEach((s) => {
        const tid = s.teacher?._id?.toString();
        s.students = tid ? (studentsByTeacher[tid] || []) : [];
      });
    }

    // ── Summary aggregation ───────────────────────────────────────────────────
    const summaryAgg = await TeacherSalaryModel.aggregate([
      ...(month ? [{ $match: { month } }] : []),
      {
        $group: {
          _id: null,
          totalTeachers:   { $sum: 1 },
          totalPaid:       { $sum: { $cond: [{ $eq: ["$status", "paid"]    }, 1, 0] } },
          totalPending:    { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          totalAmount:     { $sum: "$calculatedAmount" },
          paidAmount:      { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$calculatedAmount", 0] } },
          pendingAmount:   { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$calculatedAmount", 0] } },
          totalStudents:   { $sum: "$totalStudents" },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      totalTeachers: 0,
      totalPaid: 0,
      totalPending: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      totalStudents: 0,
    };

    return NextResponse.json({
      success: true,
      month,
      salaries,
      summary,
    });
  } catch (error) {
    console.error("GET /api/admin/monthly-salary-report error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
