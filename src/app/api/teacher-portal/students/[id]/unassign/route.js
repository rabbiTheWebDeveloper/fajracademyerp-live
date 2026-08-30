import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { StudentModel } from "@/model/student-model";
// ✅ OPTIMIZED: centralized, TTL-cached teacher resolver (no more local copy)
import { resolveTeacherId } from "@/queries/teacher-portal-queries";


/**
 * PATCH /api/teacher-portal/students/[id]/unassign
 * Unassign a student from this teacher. Records history entry, nullifies teacherId.
 */
export async function PATCH(req, { params }) {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // ✅ OPTIMIZED: uses centralized TTL-cached resolver + fetches fullName separately only when needed
  await dbConnect();
  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  // We still need fullName for the history entry — fetch only when needed
  const { TeacherModel } = await import("@/model/teacher-model");
  const teacherDoc = await TeacherModel.findById(teacherId).select("fullName teacherId").lean();
  const teacher = { _id: teacherId, fullName: teacherDoc?.fullName || "", teacherId: teacherDoc?.teacherId || "" };

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const note = body?.note || "";

    // Fetch student and verify ownership
    const student = await StudentModel.findById(id).lean();
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    if (student.teacherId?.toString() !== teacher._id.toString()) {
      return NextResponse.json(
        { success: false, message: "You can only unassign students assigned to you." },
        { status: 403 }
      );
    }

    const now = new Date();

    // Check if we already have an open history entry
    const lastEntry = student.teacherHistory?.findLast?.(
      (h) => h.teacher?.toString() === teacher._id.toString() && !h.unassignedAt
    );

    if (lastEntry) {
      // Update existing open history entry using Mongoose updateOne with strict: false
      await StudentModel.updateOne(
        { _id: id, "teacherHistory._id": lastEntry._id },
        {
          $set: {
            teacherId: null,
            "teacherHistory.$.unassignedAt": now,
            "teacherHistory.$.note": note
          }
        },
        { strict: false }
      );
    } else {
      // Push a new history entry and clear teacherId
      const newHistoryEntry = {
        teacher:      teacher._id,
        teacherName:  teacher.fullName || "",
        teacherId:    teacher.teacherId || "",
        assignedAt:   student.createdAt || now,
        unassignedAt: now,
        note,
      };

      await StudentModel.updateOne(
        { _id: id },
        {
          $set: { teacherId: null },
          $push: { teacherHistory: newHistoryEntry }
        },
        { strict: false }
      );
    }

    // Delete any schedule associated with this student and teacher
    const { ScheduleModel } = await import("@/model/schedule-model");
    await ScheduleModel.deleteMany({ student: id, teacher: teacher._id });

    return NextResponse.json({
      success: true,
      message: "Student unassigned successfully.",
      student: { _id: student._id, fullName: student.fullName, studentId: student.studentId },
    });
  } catch (err) {
    console.error("PATCH /api/teacher-portal/students/[id]/unassign:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
