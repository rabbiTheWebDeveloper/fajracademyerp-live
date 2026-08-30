import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { ClassSessionModel } from "@/model/class-model";
import { TeacherModel } from "@/model/teacher-model";
import { startOfMonth, endOfMonth } from "date-fns";
import { escapeRegex } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    await dbConnect();

    // Ensure models are registered
    await Promise.all([
      import("@/model/course-model"),
      import("@/model/student-model"),
      import("@/model/teacher-model"),
    ]);

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // Format: YYYY-MM
    const search = searchParams.get("search") || "";

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      year = y;
      month = m;
    }

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1, 1));
    // Correct days in month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Teacher search query
    const teacherQuery: any = { status: { $in: ["active", "on-leave"] } };
    if (search.trim()) {
      const escaped = escapeRegex(search.trim());
      teacherQuery.$or = [
        { fullName: { $regex: escaped, $options: "i" } },
        { teacherId: { $regex: escaped, $options: "i" } },
      ];
    }

    // Fetch teachers
    const teachers = await TeacherModel.find(
      teacherQuery,
      { _id: 1, teacherId: 1, fullName: 1, phone: 1, avatar: 1, status: 1 }
    ).lean();

    if (!teachers.length) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          totalClasses: 0,
          completedClasses: 0,
          remainingClasses: 0,
          scheduledClasses: 0,
          inProgressClasses: 0,
          cancelledClasses: 0,
          studentAttendance: 0,
          studentAbsent: 0,
          totalTeachers: 0,
          activeTeachers: 0,
        },
      });
    }

    const teacherIds = teachers.map((t) => t._id);

    // Fetch classes for this month for these teachers
    const classes = await ClassSessionModel.aggregate([
      {
        $match: {
          teacher: { $in: teacherIds },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$teacher",
          totalClasses: { $sum: 1 },
          completedClasses: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          scheduledClasses: {
            $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] },
          },
          inProgressClasses: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          cancelledClasses: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"] }, 1, 0] },
          },
          classDates: {
            $addToSet: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
        },
      },
    ]);

    const classStatsMap = classes.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr;
      return acc;
    }, {} as Record<string, any>);

    const reportData = teachers.map((teacher, index) => {
      const stats = classStatsMap[teacher._id.toString()] || {
        totalClasses: 0,
        completedClasses: 0,
        scheduledClasses: 0,
        inProgressClasses: 0,
        cancelledClasses: 0,
        presentCount: 0,
        absentCount: 0,
        classDates: [],
      };

      const totalClasses = stats.totalClasses || 0;
      const completedClasses = stats.completedClasses || 0;
      const scheduledClasses = stats.scheduledClasses || 0;
      const inProgressClasses = stats.inProgressClasses || 0;
      const cancelledClasses = stats.cancelledClasses || 0;
      const presentCount = stats.presentCount || 0;
      const absentCount = stats.absentCount || 0;

      const activeDays = stats.classDates ? stats.classDates.length : 0;
      const missingDays = Math.max(0, daysInMonth - activeDays);
      const remainingClasses = Math.max(0, totalClasses - completedClasses);

      const averageClass = daysInMonth > 0 ? (totalClasses / daysInMonth).toFixed(2) : "0.00";

      const classPercentage = totalClasses > 0
        ? ((completedClasses / totalClasses) * 100).toFixed(2)
        : "0.00";

      const totalAttendanceMarked = presentCount + absentCount;
      const attendancePercentage = totalAttendanceMarked > 0
        ? ((presentCount / totalAttendanceMarked) * 100).toFixed(2)
        : "0.00";

      return {
        serial: index + 1,
        teacherIdStr: teacher._id.toString(),
        teacherName: teacher.fullName || "—",
        teacherId: teacher.teacherId || "—",
        avatar: teacher.avatar || "",
        phoneNumber: teacher.phone || "—",
        status: teacher.status || "active",
        totalDays: daysInMonth,
        activeDays,
        missingDays,
        totalClasses,
        completedClasses,
        remainingClasses,
        missingClasses: remainingClasses,
        scheduledClasses,
        inProgressClasses,
        cancelledClasses,
        dayWiseClass: totalClasses,
        averageClass: parseFloat(averageClass),
        classPercentage: parseFloat(classPercentage),
        studentAttendance: presentCount,
        studentAbsent: absentCount,
        attendancePercentage: parseFloat(attendancePercentage),
        activelyPercentage: parseFloat(classPercentage),
      };
    });

    // Sort alphabetically by teacher name (A to Z) as default
    reportData.sort((a, b) => (a.teacherName || "").localeCompare(b.teacherName || ""));
    reportData.forEach((row, index) => {
      row.serial = index + 1;
    });

    // Summary Totals
    const summary = {
      totalClasses: reportData.reduce((acc, r) => acc + r.totalClasses, 0),
      completedClasses: reportData.reduce((acc, r) => acc + r.completedClasses, 0),
      remainingClasses: reportData.reduce((acc, r) => acc + r.remainingClasses, 0),
      scheduledClasses: reportData.reduce((acc, r) => acc + r.scheduledClasses, 0),
      inProgressClasses: reportData.reduce((acc, r) => acc + r.inProgressClasses, 0),
      cancelledClasses: reportData.reduce((acc, r) => acc + r.cancelledClasses, 0),
      studentAttendance: reportData.reduce((acc, r) => acc + r.studentAttendance, 0),
      studentAbsent: reportData.reduce((acc, r) => acc + r.studentAbsent, 0),
      totalTeachers: reportData.length,
      activeTeachers: reportData.filter((r) => r.activeDays > 0).length,
    };

    return NextResponse.json({ success: true, data: reportData, summary });
  } catch (error: any) {
    console.error("Error fetching teacher activity report:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
