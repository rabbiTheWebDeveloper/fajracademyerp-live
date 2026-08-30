import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { UserModel } from "@/model/user-model";
import { StudentModel } from "@/model/student-model";

async function resolveTeacher(userId) {
  await dbConnect();
  let teacher = await TeacherModel.findById(userId).select("_id teacherId").lean();
  if (teacher) return teacher;
  const user = await UserModel.findById(userId).select("email").lean();
  if (user?.email) {
    teacher = await TeacherModel.findOne({ email: user.email }).select("_id teacherId").lean();
    if (teacher) return teacher;
  }
  return null;
}

/**
 * GET /api/teacher-portal/student-history
 * Returns all students that were previously assigned to this teacher
 * (i.e., students whose teacherHistory array contains a record for this teacher).
 * Includes currently-assigned students that have at least one history entry.
 */
export async function GET() {
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
    // Find all students with a history entry for this teacher, bypass schema filter with strictQuery: false
    const students = await StudentModel.find(
      { "teacherHistory.teacher": teacher._id },
      null,
      { strictQuery: false }
    )
      .select("fullName studentId email phone gender status course avatar teacherId teacherHistory createdAt")
      .populate("course", "title courseId")
      .lean();

    // Build a flat list of history events for this teacher
    const historyEvents = [];
    for (const student of students) {
      const entries = (student.teacherHistory || []).filter(
        (h) => h.teacher?.toString() === teacher._id.toString()
      );
      for (const entry of entries) {
        historyEvents.push({
          student: {
            _id:        student._id,
            fullName:   student.fullName,
            studentId:  student.studentId,
            email:      student.email,
            phone:      student.phone,
            gender:     student.gender,
            status:     student.status,
            course:     student.course,
            avatar:     student.avatar,
            isCurrentlyAssigned: student.teacherId?.toString() === teacher._id.toString(),
          },
          assignedAt:   entry.assignedAt,
          unassignedAt: entry.unassignedAt || null,
          note:         entry.note || "",
          isActive:     !entry.unassignedAt,
        });
      }
    }

    // Sort by most recently unassigned first
    historyEvents.sort(
      (a, b) => new Date(b.unassignedAt || b.assignedAt) - new Date(a.unassignedAt || a.assignedAt)
    );

    return NextResponse.json({ success: true, history: historyEvents }, { status: 200 });
  } catch (err) {
    console.error("GET /api/teacher-portal/student-history:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
