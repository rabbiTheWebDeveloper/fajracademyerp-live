import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { StudentModel } from "@/model/student-model";
// ✅ OPTIMIZED: centralized, TTL-cached teacher resolver (no more local copy)
import { resolveTeacherId } from "@/queries/teacher-portal-queries";


/**
 * DELETE /api/teacher-portal/students/[id]
 * Teacher can only delete a student that belongs to them (teacherId === teacher._id)
 */
export async function DELETE(req, { params }) {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }
  // Wrap teacherId in a teacher-like object for backward compat below
  const teacher = { _id: teacherId };

  try {
    const { id } = await params;

    // Only allow deletion if this student is directly assigned to this teacher
    const student = await StudentModel.findById(id).select("teacherId").lean();
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Security: ensure the student belongs to this teacher
    if (student.teacherId?.toString() !== teacher._id.toString()) {
      return NextResponse.json(
        { success: false, message: "You can only remove students assigned to you." },
        { status: 403 }
      );
    }

    // Also delete any schedules associated with this student
    const { ScheduleModel } = await import("@/model/schedule-model");
    await ScheduleModel.deleteMany({ student: id });

    await StudentModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Student removed successfully." }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/teacher-portal/students/[id]:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/teacher-portal/students/[id]
 * Teacher can edit details and schedule of a student assigned to them.
 */
export async function PUT(req, { params }) {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }
  const teacher = { _id: teacherId };

  try {
    const { id } = await params;
    const body = await req.json();

    const {
      fullName, phone, countryCode, course, classStartingDate, gender,
      // Schedule fields
      weeklyDaysCount, weeklyDays, startTime, endTime, duration, dayTimes, classType, effectiveFrom
    } = body;

    // 1. Fetch student and verify ownership
    const student = await StudentModel.findById(id);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    if (student.teacherId?.toString() !== teacher._id.toString()) {
      return NextResponse.json(
        { success: false, message: "You can only edit students assigned to you." },
        { status: 403 }
      );
    }

    // 2. Validate basic fields
    if (!fullName?.trim()) return NextResponse.json({ success: false, message: "Full name is required." }, { status: 400 });
    if (!phone?.trim())    return NextResponse.json({ success: false, message: "Phone number is required." }, { status: 400 });
    if (!course)           return NextResponse.json({ success: false, message: "Course is required." }, { status: 400 });
    if (!gender)           return NextResponse.json({ success: false, message: "Gender is required." }, { status: 400 });

    // Build phone with country code (handle cases where CC is already in phone)
    const cc = (countryCode || "+880").trim();
    let fullPhone = phone.trim();
    if (!fullPhone.startsWith("+") && !fullPhone.startsWith(cc)) {
      const rawPhone = fullPhone.replace(/^0+/, "");
      fullPhone = `${cc}${rawPhone}`;
    }

    // Update student fields
    student.fullName = fullName.trim();
    student.phone = fullPhone;
    student.gender = gender;
    student.course = course;
    if (classStartingDate) {
      student.classStartingDate = new Date(classStartingDate);
    }
    await student.save();

    // ── 3. Manage/Update schedule ──
    const { ScheduleModel } = await import("@/model/schedule-model");
    const days = Array.isArray(weeklyDays) ? weeklyDays.filter(Boolean) : [];

    // Helper for time calculation
    const calcEnd = (start, dur = 45) => {
      if (!start) return "";
      const [h, m] = start.split(":").map(Number);
      const totalMins = (h || 0) * 60 + (m || 0) + Number(dur);
      const endH = Math.floor(totalMins / 60) % 24;
      const endM = totalMins % 60;
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    };

    const finalDuration = Number(duration) || 45;
    const finalEndTime = endTime || calcEnd(startTime, finalDuration);

    // Format day_times array
    let formattedDayTimes = [];
    if (Array.isArray(dayTimes) && dayTimes.length > 0) {
      formattedDayTimes = dayTimes.map((dt) => {
        const dtDuration = Number(dt.duration) || finalDuration;
        const dtStart = dt.startTime || startTime || "";
        const dtEnd = dt.endTime || (dtStart ? calcEnd(dtStart, dtDuration) : finalEndTime);
        return {
          day: (dt.day || "").toLowerCase(),
          startTime: dtStart,
          endTime: dtEnd,
          duration: dtDuration,
        };
      }).filter((dt) => days.includes(dt.day));
    } else if (days.length > 0) {
      // Default day_times from top-level startTime/endTime for each selected day
      formattedDayTimes = days.map((d) => ({
        day: d.toLowerCase(),
        startTime: startTime || "",
        endTime: finalEndTime,
        duration: finalDuration,
      }));
    }

    // Find if a schedule already exists for this student & teacher
    let schedule = await ScheduleModel.findOne({ student: student._id, teacher: teacher._id });

    if (days.length > 0 && (startTime || formattedDayTimes.some(dt => dt.startTime))) {
      const primaryStartTime = startTime || formattedDayTimes[0]?.startTime || "";
      const primaryEndTime = finalEndTime || formattedDayTimes[0]?.endTime || "";
      const primaryDuration = finalDuration || formattedDayTimes[0]?.duration || 45;

      const scheduleData = {
        course:           course,
        weekly_days:      Number(weeklyDaysCount) || days.length,
        weekly_days_list: days,
        dayOfWeek:        days[0] || undefined,
        startTime:        primaryStartTime,
        endTime:          primaryEndTime,
        duration:         primaryDuration,
        day_times:        formattedDayTimes,
        type:             classType || "live",
        effectiveFrom:    effectiveFrom ? new Date(effectiveFrom) : (classStartingDate ? new Date(classStartingDate) : new Date()),
        isActive:         true,
      };

      if (schedule) {
        // Update existing schedule
        Object.assign(schedule, scheduleData);
        await schedule.save();
      } else {
        // Create a new schedule
        schedule = await ScheduleModel.create({
          student: student._id,
          teacher: teacher._id,
          ...scheduleData
        });
      }
    } else if (schedule) {
      // If days are empty, deactivate the existing schedule
      schedule.isActive = false;
      await schedule.save();
    }

    return NextResponse.json({ success: true, student, schedule }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/teacher-portal/students/[id]:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
