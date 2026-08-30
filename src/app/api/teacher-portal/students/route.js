import { NextResponse } from "next/server";
import { getTeacherStudents } from "@/queries/teacher-portal-queries";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { UserModel } from "@/model/user-model";
import bcrypt from "bcryptjs";

// ── Resolve real Teacher doc from session userId ─
async function resolveTeacher(userId) {
  await dbConnect();

  // Case 1: userId IS the Teacher _id directly
  let teacher = await TeacherModel.findById(userId).select("_id teacherId fullName email").lean();
  if (teacher) return teacher;

  // Case 2: userId is a User record → match teacher by email
  const user = await UserModel.findById(userId).select("email").lean();
  if (user?.email) {
    teacher = await TeacherModel.findOne({ email: user.email }).select("_id teacherId fullName email").lean();
    if (teacher) return teacher;
  }

  return null;
}

export async function GET(req) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const teacher = await resolveTeacher(userId);
  if (!teacher) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  const result = await getTeacherStudents(teacher._id.toString());
  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const pageParam   = searchParams.get("page");
  const limitParam  = searchParams.get("limit");
  const searchParam = (searchParams.get("search") || "").trim().toLowerCase();
  const allParam    = searchParams.get("all") === "true";

  let allStudents = result.students || [];

  if (searchParam) {
    allStudents = allStudents.filter((s) => {
      const name  = (s.fullName || "").toLowerCase();
      const id    = (s.studentId || "").toLowerCase();
      const email = (s.email || "").toLowerCase();
      const phone = s.phone || s.studentNumber || "";
      return (
        name.includes(searchParam) ||
        id.includes(searchParam) ||
        email.includes(searchParam) ||
        phone.includes(searchParam)
      );
    });
  }

  const total = allStudents.length;

  // Return all records (used for dropdowns / schedule mapping in page.tsx)
  if (allParam) {
    return NextResponse.json({
      success: true,
      students: allStudents,
      pagination: {
        total,
        page: 1,
        limit: total,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  }

  // Paginated response — default limit 10, max 100
  const page  = Math.max(1, parseInt(pageParam || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || "10", 10)));
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;

  return NextResponse.json({
    success: true,
    students: allStudents.slice(startIndex, startIndex + limit),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }, {
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
  });
}

export async function POST(req) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const teacher = await resolveTeacher(userId);
  if (!teacher) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  try {
    await dbConnect();
    const { StudentModel } = await import("@/model/student-model");
    const { ScheduleModel } = await import("@/model/schedule-model");
    const body = await req.json();

    const {
      fullName, phone, countryCode, course, classStartingDate, gender,
      // Schedule fields
      weeklyDaysCount, weeklyDays, startTime, endTime, duration, dayTimes, classType, effectiveFrom,
    } = body;

    // Validate required fields
    if (!fullName?.trim()) return NextResponse.json({ success: false, message: "Full name is required." }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ success: false, message: "Phone number is required." }, { status: 400 });
    if (!course) return NextResponse.json({ success: false, message: "Course is required." }, { status: 400 });
    if (!gender) return NextResponse.json({ success: false, message: "Gender is required." }, { status: 400 });

    // Build full phone with country code
    const cc = (countryCode || "+880").trim();
    const rawPhone = phone.trim().replace(/^0+/, ""); // remove leading zeros
    const fullPhone = `${cc}${rawPhone}`;

    // Auto-generate password: first 4 digits of phone + gender initial + @Fajr
    const digits = phone.replace(/\D/g, "").slice(0, 4).padEnd(4, "0");
    const plainPassword = `${digits}${gender.charAt(0).toLowerCase()}@Fajr`;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // ── 1. Create student ──
    const student = new StudentModel({
      fullName: fullName.trim(),
      phone: fullPhone,
      gender,
      course: course || null,
      classStartingDate: classStartingDate ? new Date(classStartingDate) : undefined,
      teacherId: teacher._id,
      password: hashedPassword,
      status: "active",
      isActive: true,
    });

    await student.save();

    // ── 2. Create schedule (if schedule info provided) ──
    let schedule = null;
    const days = Array.isArray(weeklyDays) ? weeklyDays.filter(Boolean) : [];

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
      formattedDayTimes = days.map((d) => ({
        day: d.toLowerCase(),
        startTime: startTime || "",
        endTime: finalEndTime,
        duration: finalDuration,
      }));
    }

    if (days.length > 0 && (startTime || formattedDayTimes.some(dt => dt.startTime)) && course) {
      try {
        const primaryStartTime = startTime || formattedDayTimes[0]?.startTime || "";
        const primaryEndTime = finalEndTime || formattedDayTimes[0]?.endTime || "";
        const primaryDuration = finalDuration || formattedDayTimes[0]?.duration || 45;

        schedule = await ScheduleModel.create({
          course: course,
          teacher: teacher._id,
          student: student._id,
          weekly_days: Number(weeklyDaysCount) || days.length,
          weekly_days_list: days,
          dayOfWeek: days[0] || undefined,   // primary day
          startTime: primaryStartTime,
          endTime: primaryEndTime,
          duration: primaryDuration,
          day_times: formattedDayTimes,
          type: classType || "live",
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : (classStartingDate ? new Date(classStartingDate) : new Date()),
          isActive: true,
        });
      } catch (schedErr) {
        // Schedule creation is non-critical — log but don't fail the whole request
        console.error("Schedule creation failed (non-fatal):", schedErr.message);
      }
    }

    // Return student + plain password + schedule
    const safe = student.toObject();
    safe.plainPassword = plainPassword;

    return NextResponse.json({ success: true, student: safe, plainPassword, schedule }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      const keyPattern = err.keyPattern || {};
      const keyValue = err.keyValue || {};
      let key = Object.keys(keyPattern)[0] || "";
      if (!key && err.message) {
        if (err.message.includes("phone")) key = "phone";
        else if (err.message.includes("email")) key = "email";
      }

      if (key === "phone") {
        const val = keyValue.phone;
        const existing = val ? await StudentModel.findOne({ phone: val }).select("studentId fullName").lean() : null;
        const idText = existing?.studentId ? ` with Student ID: ${existing.studentId}${existing.fullName ? ` (${existing.fullName})` : ""}` : "";
        return NextResponse.json({
          success: false,
          message: `This phone number is already registered${idText}.`,
          studentId: existing?.studentId || null,
          field: "phone",
        }, { status: 409 });
      }

      if (key === "email") {
        const val = keyValue.email;
        const existing = val ? await StudentModel.findOne({ email: String(val).toLowerCase().trim() }).select("studentId fullName").lean() : null;
        const idText = existing?.studentId ? ` with Student ID: ${existing.studentId}${existing.fullName ? ` (${existing.fullName})` : ""}` : "";
        return NextResponse.json({
          success: false,
          message: `This email is already registered${idText}.`,
          studentId: existing?.studentId || null,
          field: "email",
        }, { status: 409 });
      }

      return NextResponse.json({ success: false, message: `A student with this ${key || "information"} already exists.` }, { status: 409 });
    }
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map(e => e.message).join(" ");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    console.error("POST /api/teacher-portal/students:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}


