import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { getAuthUser } from "@/lib/auth-server";
import { OnlineClassModel } from "@/model/online-class-model";
import { OnlineClassAttendanceModel } from "@/model/online-class-attendance-model";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * POST /api/online-classes/[id]/end
 * Host/Teacher/Admin ends the online class session.
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
    const isAdmin = ["admin", "super-admin", "staff"].includes(auth.role);

    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Only the assigned teacher or admin can end the class" },
        { status: 403, headers: NO_CACHE }
      );
    }

    const now = new Date();
    onlineClass.status = "completed";
    onlineClass.endedAt = now;

    if (!onlineClass.startedAt) {
      onlineClass.startedAt = now;
      onlineClass.actualDuration = 0;
    } else {
      const durMs = now.getTime() - new Date(onlineClass.startedAt).getTime();
      onlineClass.actualDuration = Math.max(1, Math.round(durMs / 60000));
    }

    await onlineClass.save();

    // Close all open attendance logs for this class
    const openAttendance = await OnlineClassAttendanceModel.find({
      onlineClass: id,
      leaveTime: null,
    });

    for (const record of openAttendance) {
      record.leaveTime = now;
      const ms = now.getTime() - new Date(record.joinTime).getTime();
      record.durationMinutes = Math.max(1, Math.round(ms / 60000));
      await record.save();
    }

    return NextResponse.json(
      {
        success: true,
        message: "Online class ended successfully",
        actualDuration: onlineClass.actualDuration,
        endedAt: onlineClass.endedAt,
      },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[POST /api/online-classes/[id]/end] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to end class" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
