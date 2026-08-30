import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { ScheduleModel } from "@/model/schedule-model";
import { ClassSessionModel } from "@/model/class-model";
import { StudentModel } from "@/model/student-model";
import { CourseModel } from "@/model/course-model";
// ✅ OPTIMIZED: centralized, TTL-cached teacher resolver (no more local copy)
import { resolveTeacherId } from "@/queries/teacher-portal-queries";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * POST /api/teacher-portal/class/auto-generate
 * Auto-generates ClassSession entries for today's scheduled students.
 * Skips any student/day combo that already has a scheduled/in-progress class today.
 */
export async function POST() {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // ✅ OPTIMIZED: uses centralized TTL-cached resolver
  await dbConnect();
  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }
  const teacher = { _id: teacherId };

  try {
    await dbConnect();

    // Ensure models are registered for population
    await Promise.all([
      import("@/model/student-model"),
      import("@/model/course-model"),
    ]);

    // Get today's day key (e.g. "monday")
    const now = new Date();
    const todayKey = DAY_KEYS[now.getDay()]; // getDay(): 0=Sun, 1=Mon, ...

    // Fetch all active schedules for this teacher for today
    const schedules = await ScheduleModel.find({
      teacher: teacher._id,
      isActive: true,
    })
      .populate("student", "fullName studentId avatar teacherId")
      .populate("course", "title courseId thumbnail level")
      .lean();

    // Filter to only today's schedules
    const todaySchedules = schedules.filter((s) => {
      if (!s.student) return false;
      // Verify student is still assigned to this teacher
      if (!s.student.teacherId || s.student.teacherId.toString() !== teacher._id.toString()) return false;

      const days = (s.weekly_days_list || []).map((d) => d.toLowerCase());
      return days.includes(todayKey);
    });

    if (todaySchedules.length === 0) {
      return NextResponse.json({
        success: true,
        classes: [],
        message: "No scheduled classes for today.",
        generated: 0,
        skipped: 0,
      });
    }

    // Get start of today (midnight local) in UTC
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const generated = [];
    const skipped   = [];

    for (const schedule of todaySchedules) {
      const studentId = schedule.student._id;
      const courseId  = schedule.course?._id || schedule.course;

      if (!studentId || !courseId) {
        skipped.push({ reason: "Missing student or course", scheduleId: schedule._id });
        continue;
      }

      // Extract day-specific time and duration if configured, otherwise fall back to top-level
      const dayTime = Array.isArray(schedule.day_times)
        ? schedule.day_times.find((dt) => dt.day?.toLowerCase() === todayKey)
        : null;

      const startTime = dayTime?.startTime || schedule.startTime || "09:00";
      const duration  = Number(dayTime?.duration) || Number(schedule.duration) || 45;
      const endMins   = timeToMinutes(startTime) + duration;
      const endTime   = dayTime?.endTime || minutesToTime(endMins);


      // Check if a class session already exists for this student + teacher today
      // (any status — including completed — to avoid re-creating finished classes)
      const existing = await ClassSessionModel.findOne({
        teacher:   teacher._id,
        student:   studentId,
        dayOfWeek: todayKey,
        status:    { $in: ["scheduled", "in-progress", "paused", "completed"] },
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).lean();

      if (existing) {
        skipped.push({ studentId, reason: "Already exists" });
        continue;
      }

      // Create the class session
      const doc = await ClassSessionModel.create({
        teacher:   teacher._id,
        student:   studentId,
        course:    courseId,
        dayOfWeek: todayKey,
        startTime,
        endTime,
        duration,
        status:    "scheduled",
        notes:     "",
        meetLink:  null,
        topic:     schedule.course?.title || "Regular Class",
      });

      const populated = await ClassSessionModel.findById(doc._id)
        .populate({ path: "course",  select: "title courseId thumbnail level" })
        .populate({ path: "student", select: "fullName studentId avatar" })
        .lean();

      generated.push(populated);
    }

    return NextResponse.json({
      success: true,
      classes: generated,
      generated: generated.length,
      skipped: skipped.length,
      message: generated.length > 0
        ? `Generated ${generated.length} class(es) for today.`
        : `All classes for today already exist (${skipped.length} skipped).`,
    });
  } catch (err) {
    console.error("POST /api/teacher-portal/class/auto-generate:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
