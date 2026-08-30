import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/service/mongo";

async function getAuthUser(cookieStore) {
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/visitor-stats
 *
 * Returns:
 *  - Last 30 days of daily visitor counts
 *  - Today's hourly breakdown
 *  - Teacher counts by status
 *  - Student counts by status
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const decoded = await getAuthUser(cookieStore);

    if (!decoded) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }
    if (decoded.role !== "super-admin" && decoded.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { visitorCountModel } = await import("@/model/visitorCount-model");
    const { VisitorCountDayModel } = await import("@/model/visitorCountDay-model");
    const { TeacherModel } = await import("@/model/teacher-model");
    const { StudentModel } = await import("@/model/student-model");

    // ── Last 30 days of visitor data ─────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromStr = thirtyDaysAgo.toISOString().split("T")[0];

    const dailyVisitors = await visitorCountModel
      .find({ date: { $gte: fromStr } })
      .sort({ date: 1 })
      .lean();

    // ── Today's hourly breakdown ──────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const todayRecord = await VisitorCountDayModel.findOne({ date: today }).lean();
    const hourlyData = todayRecord?.hourlyCounts || Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

    // ── Teacher counts by status ──────────────────────────────────────────
    const teacherAgg = await TeacherModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const teacherCounts = {
      active: 0,
      inactive: 0,
      "on-leave": 0,
      terminated: 0,
      total: 0,
    };
    for (const t of teacherAgg) {
      if (t._id in teacherCounts) teacherCounts[t._id] = t.count;
      teacherCounts.total += t.count;
    }

    // ── Student counts by status ──────────────────────────────────────────
    const studentAgg = await StudentModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const studentCounts = {
      active: 0,
      inactive: 0,
      completed: 0,
      "at-risk": 0,
      suspended: 0,
      total: 0,
    };
    for (const s of studentAgg) {
      if (s._id in studentCounts) studentCounts[s._id] = s.count;
      studentCounts.total += s.count;
    }

    // ── Grand totals ──────────────────────────────────────────────────────
    const totalVisitors = dailyVisitors.reduce((sum, d) => sum + (d.dailyCount || 0), 0);
    const todayVisitors = todayRecord?.totalCount || dailyVisitors.at(-1)?.dailyCount || 0;

    return NextResponse.json({
      success: true,
      data: {
        visitors: {
          daily: dailyVisitors,
          hourly: hourlyData,
          todayTotal: todayVisitors,
          last30DaysTotal: totalVisitors,
        },
        teachers: teacherCounts,
        students: studentCounts,
      },
    });
  } catch (error) {
    console.error("[visitor-stats GET]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
