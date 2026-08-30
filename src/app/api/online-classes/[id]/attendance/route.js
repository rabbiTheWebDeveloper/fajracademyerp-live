import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { getAuthUser } from "@/lib/auth-server";
import { OnlineClassModel } from "@/model/online-class-model";
import { OnlineClassAttendanceModel } from "@/model/online-class-attendance-model";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * GET /api/online-classes/[id]/attendance
 * Retrieves attendance logs and participant duration summary for an online class.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: NO_CACHE }
      );
    }

    await dbConnect();
    const onlineClass = await OnlineClassModel.findById(id).lean();

    if (!onlineClass || !onlineClass.isActive) {
      return NextResponse.json(
        { success: false, message: "Online class not found" },
        { status: 404, headers: NO_CACHE }
      );
    }

    const isTeacher = auth.role === "teacher" && onlineClass.teacher?.toString() === auth.id;
    const isStudent = auth.role === "student" && onlineClass.student?.toString() === auth.id;
    const isAdmin = ["admin", "super-admin", "staff"].includes(auth.role);

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403, headers: NO_CACHE }
      );
    }

    const query = { onlineClass: id };
    // If student, only view own attendance
    if (isStudent && !isAdmin && !isTeacher) {
      query.userId = auth.id;
    }

    const attendanceRecords = await OnlineClassAttendanceModel.find(query)
      .populate("teacher", "fullName teacherId designation avatar")
      .populate("student", "fullName studentId avatar phone")
      .sort({ joinTime: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: attendanceRecords.length,
        attendance: attendanceRecords,
        classDetails: {
          title: onlineClass.title,
          status: onlineClass.status,
          startedAt: onlineClass.startedAt,
          endedAt: onlineClass.endedAt,
          actualDuration: onlineClass.actualDuration,
          duration: onlineClass.duration,
        },
      },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[GET /api/online-classes/[id]/attendance] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch attendance" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
