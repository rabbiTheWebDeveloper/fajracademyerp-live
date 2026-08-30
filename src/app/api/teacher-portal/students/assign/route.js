import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { UserModel } from "@/model/user-model";
import { escapeRegex } from "@/lib/utils";

async function resolveTeacher(userId) {
  await dbConnect();
  let teacher = await TeacherModel.findById(userId).select("_id teacherId fullName").lean();
  if (teacher) return teacher;
  const user = await UserModel.findById(userId).select("email").lean();
  if (user?.email) {
    teacher = await TeacherModel.findOne({ email: user.email }).select("_id teacherId fullName").lean();
    if (teacher) return teacher;
  }
  return null;
}

// POST /api/teacher-portal/students/assign
// Body: { studentId: "STUM0820260001" }  (the human-readable string ID)
// Assigns the student to the requesting teacher
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
      return NextResponse.json({ success: false, message: "studentId is required." }, { status: 400 });
    }

    const escapedId = escapeRegex(rawId);
    const student = await StudentModel.findOne({
      studentId: { $regex: new RegExp(`^${escapedId}$`, "i") },
    });

    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    // Admission check
    if (!student.isActive || student.status !== "active") {
      return NextResponse.json({
        success: false,
        message: `Student is not admitted/active (status: ${student.status}). Please contact admin.`,
      }, { status: 400 });
    }

    // Already assigned to this teacher?
    if (student.teacherId?.toString() === teacher._id.toString()) {
      return NextResponse.json({ success: false, message: "This student is already assigned to you." }, { status: 409 });
    }

    // Add to teacherHistory
    student.teacherHistory = student.teacherHistory || [];
    student.teacherHistory.push({
      teacher:    teacher._id,
      teacherName: teacher.fullName || "",
      teacherId:   teacher.teacherId || "",
      assignedAt:  new Date(),
    });

    student.teacherId = teacher._id;
    await student.save();

    // Also update any existing schedule to point to this teacher
    await ScheduleModel.updateMany(
      { student: student._id },
      { $set: { teacher: teacher._id } }
    );

    const populatedStudent = await StudentModel.findById(student._id)
      .populate("course", "title courseId level")
      .lean();

    return NextResponse.json({ success: true, student: populatedStudent });
  } catch (err) {
    console.error("POST /api/teacher-portal/students/assign:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
