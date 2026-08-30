import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { getAuthUser } from "@/lib/auth-server";
import { OnlineClassModel } from "@/model/online-class-model";
import { generateLiveKitToken } from "@/lib/livekit";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * POST /api/online-classes/[id]/livekit-token
 * Securely generate LiveKit Video SDK Web JWT token.
 * 
 * Never exposes LIVEKIT_API_SECRET to the client.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Please log in to join online class" },
        { status: 401, headers: NO_CACHE }
      );
    }

    await dbConnect();
    const onlineClass = await OnlineClassModel.findById(id).lean();

    if (!onlineClass || !onlineClass.isActive) {
      return NextResponse.json(
        { success: false, message: "Online class not found or inactive" },
        { status: 404, headers: NO_CACHE }
      );
    }

    // Role Verification
    const isTeacher = auth.role === "teacher" && onlineClass.teacher?.toString() === auth.id;
    const isStudent = auth.role === "student" && onlineClass.student?.toString() === auth.id;
    const isAdmin = ["admin", "super-admin", "staff"].includes(auth.role);

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Access denied: You are not assigned to this online class" },
        { status: 403, headers: NO_CACHE }
      );
    }

    // Host = Teacher or Admin, Participant = Student
    const isHost = isTeacher || isAdmin;
    const userName = auth.user?.fullName || (isHost ? "Teacher" : "Student");
    const userIdentity = `${auth.role}_${auth.id}`;
    const roomName = onlineClass.sessionName || `fajr_class_${id}`;

    // Generate LiveKit Video SDK Token on the backend
    const { token, serverUrl } = await generateLiveKitToken({
      roomName,
      identity: userIdentity,
      name: userName,
      isHost,
      metadata: {
        userId: auth.id,
        userRole: auth.role,
        fullName: userName,
        isHost,
        classId: id,
        classTitle: onlineClass.title,
      },
      ttlSeconds: 14400, // 4 hours
    });

    return NextResponse.json(
      {
        success: true,
        token,
        serverUrl,
        roomName,
        isHost,
        userName,
        userId: auth.id,
        userRole: auth.role,
        classTitle: onlineClass.title,
      },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[POST /api/online-classes/[id]/livekit-token] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate LiveKit token" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
