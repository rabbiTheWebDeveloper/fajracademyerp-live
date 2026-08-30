import { NextResponse } from "next/server";
import {
  getTeacherClasses, createTeacherClass,
  startTeacherClass, endTeacherClass, deleteTeacherClass,
  pauseTeacherClass, resumeTeacherClass, resetTeacherClass,
} from "@/queries/teacher-class-queries";
import { resolveTeacherId } from "@/queries/teacher-portal-queries";
import { awardGems, awardGemsMultiple } from "@/service/gems-service";
import { headers } from "next/headers";

export const maxDuration = 10; // prevent zombie functions consuming Vercel CPU budget

async function auth() {
  const h = await headers();
  return { userId: h.get("x-user-id"), userRole: h.get("x-user-role") };
}

// GET — list all classes for the teacher with pagination & filtering
export async function GET(req) {
  const { userId, userRole } = await auth();
  if (!userId || userRole !== "teacher")
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId)
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const pageParam      = searchParams.get("page");
  const limitParam     = searchParams.get("limit");
  const statusParam    = searchParams.get("status");
  const monthParam     = searchParams.get("month");
  const searchParam    = (searchParams.get("search") || "").trim().toLowerCase();
  const allParam       = searchParams.get("all") === "true";
  const dayOfWeekParam = (searchParams.get("dayOfWeek") || "").toLowerCase().trim();
  const dateParam      = (searchParams.get("date") || "").trim(); // YYYY-MM-DD

  const result = await getTeacherClasses(teacherId);
  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  let all = result.classes || [];

  if (statusParam) {
    if (statusParam === "in-progress") {
      all = all.filter((c) => c.status === "in-progress" || c.status === "paused");
    } else {
      all = all.filter((c) => c.status === statusParam);
    }
  }

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    all = all.filter((c) => {
      // Don't exclude active/scheduled classes just because they were scheduled in another month
      if (c.status === "scheduled" || c.status === "in-progress" || c.status === "paused") return true;
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      const year  = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", year: "numeric" }).format(d);
      const month = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "2-digit" }).format(d);
      return `${year}-${month}` === monthParam;
    });
  }

  // Filter by exact day of week in BD Time (e.g., "tuesday")
  if (dayOfWeekParam) {
    const todayBdStr = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Dhaka" });
    all = all.filter((c) => {
      const matchDay = (c.dayOfWeek || "").toLowerCase().trim() === dayOfWeekParam;
      const isCreatedToday = c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US", { timeZone: "Asia/Dhaka" }) === todayBdStr : false;
      return matchDay || isCreatedToday;
    });
  }

  // Filter by exact calendar date in BD Time — checks createdAt, startedAt, or endedAt
  if (dateParam) {
    const targetDateBdStr = new Date(dateParam).toLocaleDateString("en-US", { timeZone: "Asia/Dhaka" });
    const matchDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { timeZone: "Asia/Dhaka" }) === targetDateBdStr : false;
    all = all.filter((c) => matchDate(c.createdAt) || matchDate(c.startedAt) || matchDate(c.endedAt));
  }

  if (searchParam) {
    all = all.filter((c) => {
      const studentName = c.student?.fullName?.toLowerCase() || "";
      const studentId   = c.student?.studentId?.toLowerCase() || "";
      const courseTitle = c.course?.title?.toLowerCase() || "";
      const topic       = c.topic?.toLowerCase() || "";
      return (
        studentName.includes(searchParam) ||
        studentId.includes(searchParam) ||
        courseTitle.includes(searchParam) ||
        topic.includes(searchParam)
      );
    });
  }

  const total = all.length;

  if (allParam) {
    return NextResponse.json({
      success: true,
      classes: all,
      pagination: {
        total,
        page: 1,
        limit: total,
        totalPages: 1,
      },
    }, {
      headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" },
    });
  }

  const page  = Math.max(1, parseInt(pageParam || "1", 10));
  const limit = Math.min(10, Math.max(1, parseInt(limitParam || "10", 10))); // max 10
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedClasses = all.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    success: true,
    classes: paginatedClasses,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  }, {
    headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" },
  });
}

// POST — create a scheduled class
export async function POST(req) {
  const { userId, userRole } = await auth();
  if (!userId || userRole !== "teacher")
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId)
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });

  try {
    const payload = await req.json();
    const result  = await createTeacherClass(teacherId, payload);
    // Award gem for scheduling a class (fire-and-forget — don't block response)
    if (result.success && result.class?._id) {
      awardGems(teacherId, "class_scheduled", result.class._id).catch(() => {});
    }
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

// PATCH — action: "start" | "end" | "pause" | "resume" | "reset"
export async function PATCH(req) {
  const { userId, userRole } = await auth();
  if (!userId || userRole !== "teacher")
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId)
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });

  try {
    const { classId, action, attendance, notes, clientTime } = await req.json();
    if (!classId || !action)
      return NextResponse.json({ success: false, message: "classId and action required" }, { status: 400 });

    let result;
    if (action === "start")       result = await startTeacherClass(classId, teacherId);
    else if (action === "end")    result = await endTeacherClass(classId, teacherId, attendance);
    else if (action === "pause")  result = await pauseTeacherClass(classId, teacherId);
    else if (action === "resume") result = await resumeTeacherClass(classId, teacherId);
    else if (action === "reset")  result = await resetTeacherClass(classId, teacherId);
    else return NextResponse.json({ success: false, message: "action must be start, end, pause, resume, or reset" }, { status: 400 });

    // Award / deduct gems based on action result
    let gemsEarned = null;
    let earlyStartPenalty = null;

    if (result.success) {
      const sessionId = result.class?._id || result.session?._id || null;

      // ── Early-start penalty check ───────────────────────────────────────────
      // Use clientTime (HH:MM) from browser to avoid UTC vs local timezone mismatch.
      if (action === "start" && result.class?.startTime) {
        try {
          let currentMins;
          if (clientTime && /^\d{1,2}:\d{2}$/.test(clientTime)) {
            // Use the local time sent from the browser
            const [ch, cm] = clientTime.split(":").map(Number);
            currentMins = ch * 60 + cm;
          } else {
            // Fallback: server UTC time (less accurate for non-UTC timezones)
            const now = new Date();
            currentMins = now.getUTCHours() * 60 + now.getUTCMinutes();
          }
          const [sh, sm] = result.class.startTime.split(":").map(Number);
          const scheduledMins = sh * 60 + sm;
          const earlyBy = scheduledMins - currentMins; // positive = teacher started early
          if (earlyBy >= 10) {
            const pg = await awardGems(teacherId, "early_start_penalty", sessionId);
            earlyStartPenalty = {
              applied: true,
              earlyByMinutes: earlyBy,
              gems: -10,
              totalGems: pg.totalGems,
            };
          }
        } catch (penErr) {
          console.warn("[gems] early_start_penalty failed (non-fatal):", penErr.message);
        }
      }

      try {
        if (action === "end") {
          // ✅ OPTIMIZED: Batch all end-class gem awards into a SINGLE DB operation
          // (was 3–4 separate awardGems() calls = 3–4 DB round-trips)
          const actionsToAward = [
            { action: "class_completed", refId: sessionId },
          ];
          if (attendance === "present") {
            actionsToAward.push({ action: "student_present", refId: sessionId });
          } else if (attendance === "absent") {
            actionsToAward.push({ action: "student_absent", refId: sessionId });
          }
          if (notes && notes.trim().length > 0) {
            actionsToAward.push({ action: "notes_bonus", refId: sessionId });
          }

          const g = await awardGemsMultiple(teacherId, actionsToAward, sessionId);
          gemsEarned = {
            total:       g.breakdown.reduce((s, x) => s + x.gems, 0) + (g.streakBonus || 0),
            breakdown:   g.breakdown,
            totalGems:   g.totalGems,
            monthlyGems: g.monthlyGems,
            streak:      g.streak,
            tier:        g.tier,
          };
        } else if (action === "reset") {
          // -1 for resetting/abandoning a class
          await awardGems(teacherId, "class_reset", sessionId);
        }
      } catch (gemErr) {
        console.warn("[gems] award failed (non-fatal):", gemErr.message);
      }
    }

    return NextResponse.json({ ...result, gems: gemsEarned, earlyStartPenalty }, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

// DELETE — remove class (?id=classId)  → -2 gems for cancellation
export async function DELETE(req) {
  const { userId, userRole } = await auth();
  if (!userId || userRole !== "teacher")
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId)
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("id");
  if (!classId)
    return NextResponse.json({ success: false, message: "id required" }, { status: 400 });

  const result = await deleteTeacherClass(classId, teacherId);
  // Deduct gems for cancelling a class
  if (result.success) {
    awardGems(teacherId, "class_cancelled", null).catch(() => {});
  }
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}