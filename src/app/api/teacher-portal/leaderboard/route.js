import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { resolveTeacherId } from "@/queries/teacher-portal-queries";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";
import { StudentModel } from "@/model/student-model";
import { AttendanceModel } from "@/model/attendance-model";
import { EnrollmentModel } from "@/model/enrollment-model";
import { CourseModel } from "@/model/course-model";

export async function GET(request) {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  try {
    await dbConnect();
    const { ClassSessionModel } = await import("@/model/class-model");

    const tid = new mongoose.Types.ObjectId(teacherId);

    // ── 1. Resolve all students assigned to this teacher ──────────────────────
    // Source A: students directly assigned via teacherId
    const directStudents = await StudentModel.find({ teacherId: teacherId.toString() })
      .select("_id fullName avatar gender studentId studentNumber course status")
      .lean();

    // Source B: students via course enrollments
    const courses = await CourseModel.find({ instructor: tid }).select("_id").lean();
    const courseIds = courses.map((c) => c._id);

    const enrollments = await EnrollmentModel.find({ course: { $in: courseIds } })
      .select("student")
      .lean();

    // Build unified student ID set
    const studentIdSet = new Set(directStudents.map((s) => s._id.toString()));
    enrollments.forEach((e) => e.student && studentIdSet.add(e.student.toString()));

    if (studentIdSet.size === 0) {
      return NextResponse.json({ success: true, leaderboard: [], totalStudents: 0 });
    }

    const studentObjectIds = [...studentIdSet].map((id) => new mongoose.Types.ObjectId(id));

    // ── 2. Fetch all student details for those IDs ────────────────────────────
    const allStudents = await StudentModel.find({ _id: { $in: studentObjectIds } })
      .select("_id fullName avatar gender studentId studentNumber course status")
      .lean();

    const now = new Date();
    const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const startOfBdMonth = new Date(Date.UTC(bdTime.getUTCFullYear(), bdTime.getUTCMonth(), 1));
    const startOfMonth = new Date(startOfBdMonth.getTime() - 6 * 60 * 60 * 1000);

    // ── 3. Attendance aggregation per student (current month) ───────────────────
    const attendanceAgg = await AttendanceModel.aggregate([
      {
        $match: {
          student: { $in: studentObjectIds },
          date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: "$student",
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          lateCount: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          excusedCount: {
            $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] },
          },
        },
      },
    ]);

    // ── 4. Class session aggregation per student (current month) ───────────────
    const classSessionAgg = await ClassSessionModel.aggregate([
      {
        $match: {
          teacher: tid,
          student: { $in: studentObjectIds },
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: "$student",
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          sessionPresent: {
            $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] },
          },
          sessionAbsent: {
            $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"] }, 1, 0] },
          },
        },
      },
    ]);

    // ── 5. Build lookup maps ──────────────────────────────────────────────────
    const attMap = {};
    attendanceAgg.forEach((a) => {
      attMap[a._id.toString()] = a;
    });

    const sessionMap = {};
    classSessionAgg.forEach((s) => {
      sessionMap[s._id.toString()] = s;
    });

    // ── 6. Compute score and build leaderboard entries ────────────────────────
    const leaderboard = allStudents.map((student) => {
      const sid = student._id.toString();
      const att = attMap[sid] || { totalRecords: 0, presentCount: 0, absentCount: 0, lateCount: 0, excusedCount: 0 };
      const ses = sessionMap[sid] || { totalSessions: 0, completedSessions: 0, sessionPresent: 0, sessionAbsent: 0 };

      // Attendance rate (0–100)
      const totalAtt = att.totalRecords || 0;
      const attendanceRate = totalAtt > 0 ? Math.round((att.presentCount / totalAtt) * 100) : 0;

      // Session attendance rate (from class sessions)
      const totalSessions = ses.totalSessions || 0;
      const sessionRate = totalSessions > 0 ? Math.round((ses.sessionPresent / totalSessions) * 100) : 0;

      // Composite score:
      //  60% attendance rate + 40% session presence rate
      //  Bonus: +5 for active status, bonus for high attendance
      let score = attendanceRate * 0.6 + sessionRate * 0.4;
      if (student.status === "active") score += 5;
      if (attendanceRate >= 90) score += 5; // perfect attendance bonus
      if (attendanceRate >= 80) score += 2;
      score = Math.min(Math.round(score), 100);

      return {
        _id: sid,
        fullName: student.fullName,
        avatar: student.avatar || null,
        gender: student.gender,
        studentId: student.studentId,
        studentNumber: student.studentNumber,
        course: student.course,
        status: student.status,
        // Attendance stats
        totalAttendance: totalAtt,
        presentCount: att.presentCount,
        absentCount: att.absentCount,
        lateCount: att.lateCount,
        excusedCount: att.excusedCount,
        attendanceRate,
        // Class session stats
        totalSessions,
        completedSessions: ses.completedSessions,
        sessionPresent: ses.sessionPresent,
        sessionAbsent: ses.sessionAbsent,
        sessionRate,
        // Composite score
        score,
      };
    });

    // Sort descending by score
    leaderboard.sort((a, b) => b.score - a.score || b.attendanceRate - a.attendanceRate);

    // Add rank
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return NextResponse.json({
      success: true,
      leaderboard,
      totalStudents: leaderboard.length,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
