import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { getAuthUser } from "@/lib/auth-server";
import { OnlineClassModel } from "@/model/online-class-model";
import { OnlineClassAttendanceModel } from "@/model/online-class-attendance-model";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * POST /api/online-classes/[id]/join
 * Records participant join event & starts class if host/teacher enters.
 */
export async function POST(request, { params }) {
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
    const onlineClass = await OnlineClassModel.findById(id);

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
        { success: false, message: "Access denied to join this class" },
        { status: 403, headers: NO_CACHE }
      );
    }

    const now = new Date();

    // If teacher starts, transition status to 'in-progress'
    if (isTeacher && onlineClass.status === "scheduled") {
      onlineClass.status = "in-progress";
      onlineClass.startedAt = now;
      await onlineClass.save();
    }

    // Determine status (present vs late)
    let attendanceStatus = "present";
    if (onlineClass.startedAt) {
      const diffMinutes = (now.getTime() - new Date(onlineClass.startedAt).getTime()) / 60000;
      if (diffMinutes > 10) {
        attendanceStatus = "late";
      }
    }

    const userAgent = request.headers.get("user-agent") || "";
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "";

    // Create attendance record
    const attendance = await OnlineClassAttendanceModel.create({
      onlineClass: onlineClass._id,
      userType: auth.role,
      userId: auth.id,
      teacher: isTeacher ? auth.id : null,
      student: isStudent ? auth.id : null,
      userName: auth.user?.fullName || "User",
      userEmail: auth.user?.email || "",
      joinTime: now,
      status: attendanceStatus,
      deviceInfo: userAgent.substring(0, 200),
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Joined successfully",
        attendanceId: attendance._id.toString(),
        classStatus: onlineClass.status,
        startedAt: onlineClass.startedAt,
      },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[POST /api/online-classes/[id]/join] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to record join" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
