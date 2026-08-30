import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/service/mongo";
import { ClassSessionModel } from "@/model/class-model";
import { resolveTeacherId } from "@/queries/teacher-portal-queries";
import { headers } from "next/headers";

export const maxDuration = 10;

async function auth() {
  const h = await headers();
  return { userId: h.get("x-user-id"), userRole: h.get("x-user-role") };
}

export async function GET(req) {
  const { userId, userRole } = await auth();
  if (!userId || userRole !== "teacher")
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId)
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // e.g. "2026-08"

  // Build date range filter if month is provided (aligned with Bangladesh Time UTC+6)
  let dateFilter = {};
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split("-").map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1, -6, 0, 0)); // 1st of month 00:00 BD
    const to   = new Date(Date.UTC(year, month, 1, -6, 0, 0));     // 1st of next month 00:00 BD
    dateFilter = { createdAt: { $gte: from, $lt: to } };
  }

  try {
    // resolveTeacherId returns a plain string — cast to ObjectId for aggregation $match
    const teacherObjId = new mongoose.Types.ObjectId(teacherId);

    const [agg] = await ClassSessionModel.aggregate([
      {
        $match: {
          teacher: teacherObjId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalClasses:  { $sum: 1 },
          inProgress:    { $sum: { $cond: [{ $in: ["$status", ["in-progress", "paused"]] }, 1, 0] } },
          scheduled:     { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
          completed:     { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          totalMins:     { $sum: { $ifNull: ["$actualDuration", "$duration"] } },
          totalPresent:  { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] } },
          totalAbsent:   { $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"] },  1, 0] } },
        },
      },
    ]);

    if (!agg) {
      return NextResponse.json({
        success: true,
        stats: {
          totalClasses: 0, inProgress: 0, scheduled: 0,
          completed: 0, totalMins: 0, teachingHours: "0h",
          totalPresent: 0, totalAbsent: 0, attendanceRate: 0,
        },
      });
    }

    const teachingHoursRaw = (agg.totalMins || 0) / 60;
    const attendanceRate   = agg.completed > 0
      ? Math.round(((agg.totalPresent || 0) / agg.completed) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalClasses:  agg.totalClasses  || 0,
        inProgress:    agg.inProgress    || 0,
        scheduled:     agg.scheduled     || 0,
        completed:     agg.completed     || 0,
        totalMins:     agg.totalMins     || 0,
        teachingHours: `${Math.round(teachingHoursRaw * 10) / 10}h`,
        totalPresent:  agg.totalPresent  || 0,
        totalAbsent:   agg.totalAbsent   || 0,
        attendanceRate,
      },
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (e) {
    console.error("GET /api/teacher-portal/class/stats:", e);
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
