import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { UserModel } from "@/model/user-model";
import { escapeRegex } from "@/lib/utils";

// Resolve the real Teacher document from session userId
async function resolveTeacher(userId) {
  await dbConnect();
  let teacher = await TeacherModel.findById(userId).select("_id teacherId fullName email").lean();
  if (teacher) return teacher;
  const user = await UserModel.findById(userId).select("email").lean();
  if (user?.email) {
    teacher = await TeacherModel.findOne({ email: user.email }).select("_id teacherId fullName email").lean();
    if (teacher) return teacher;
  }
  return null;
}

// POST /api/teacher-portal/students/lookup
// Body: { studentId: "STUM0820260001" }
// Returns the student profile + their admission status + schedule
export async function POST(req) {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
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
    const rawId = (body.studentId || "").trim();

    if (!rawId) {
      return NextResponse.json({ success: false, message: "Student ID is required." }, { status: 400 });
    }

    const escapedId = escapeRegex(rawId);

    // Look up student by studentId (case-insensitive)
    const student = await StudentModel.findOne({
      studentId: { $regex: new RegExp(`^${escapedId}$`, "i") },
    })
      .populate("course", "title courseId level")
      .lean();

    if (!student) {
      return NextResponse.json({
        success: false,
        message: `No student found with ID "${rawId}". Please check the ID and try again.`,
        notFound: true,
      }, { status: 404 });
    }

    // ── Admission / approval check ─────────────────────────────────────────────
    // Student must be active and not suspended
    const isAdmitted = student.isActive === true && student.status === "active";
    const isSuspended = student.status === "suspended";
    const isInactive  = student.status === "inactive";
    const isAlreadyAssigned = student.teacherId?.toString() === teacher._id.toString();

    // Fetch their latest schedule
    const schedule = await ScheduleModel.findOne({ student: student._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      student: {
        _id:               student._id,
        studentId:         student.studentId,
        fullName:          student.fullName,
        phone:             student.phone,
        gender:            student.gender,
        status:            student.status,
        isActive:          student.isActive,
        course:            student.course,
        admissionDate:     student.admissionDate,
        classStartingDate: student.classStartingDate,
        teacherId:         student.teacherId,
        avatar:            student.avatar || null,
      },
      schedule: schedule || null,
      isAdmitted,
      isSuspended,
      isInactive,
      isAlreadyAssigned,
    });
  } catch (err) {
    console.error("POST /api/teacher-portal/students/lookup:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
