import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { getAuthUser } from "@/lib/auth-server";
import { OnlineClassAttendanceModel } from "@/model/online-class-attendance-model";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * POST /api/online-classes/[id]/leave
 * Records participant leave time & calculates attended duration.
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
    const body = await request.json().catch(() => ({}));
    const { attendanceId } = body;

    const now = new Date();
    let record = null;

    if (attendanceId) {
      record = await OnlineClassAttendanceModel.findById(attendanceId);
    }

    // Fallback: find the latest open attendance record for this user and class
    if (!record) {
      record = await OnlineClassAttendanceModel.findOne({
        onlineClass: id,
        userId: auth.id,
        leaveTime: null,
      }).sort({ joinTime: -1 });
    }

    if (record) {
      record.leaveTime = now;
      const durationMs = now.getTime() - new Date(record.joinTime).getTime();
      const minutes = Math.max(1, Math.round(durationMs / 60000));
      record.durationMinutes = minutes;

      // If user stayed less than 10 mins and was originally marked present, set to left-early
      if (minutes < 10 && record.status === "present") {
        record.status = "left-early";
      }

      await record.save();
    }

    return NextResponse.json(
      {
        success: true,
        message: "Leave recorded successfully",
        durationMinutes: record?.durationMinutes || 0,
      },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[POST /api/online-classes/[id]/leave] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to record leave" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
