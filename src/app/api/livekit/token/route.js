import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import { generateLiveKitToken } from "@/lib/livekit";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * GET/POST /api/livekit/token
 * Generate LiveKit token for any room with user authentication
 */
export async function GET(request) {
  return handleToken(request);
}

export async function POST(request) {
  return handleToken(request);
}

async function handleToken(request) {
  try {
    const auth = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    
    let room = searchParams.get("room");
    let name = searchParams.get("name");
    let identity = searchParams.get("identity");

    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.room) room = body.room;
        if (body.name) name = body.name;
        if (body.identity) identity = body.identity;
      } catch (_) {}
    }

    if (!room) {
      return NextResponse.json(
        { success: false, message: "Missing required 'room' parameter" },
        { status: 400, headers: NO_CACHE }
      );
    }

    const userId = auth?.id || `anon_${Date.now()}`;
    const userRole = auth?.role || "participant";
    const userName = name || auth?.user?.fullName || (userRole === "teacher" ? "Teacher" : "Student");
    const userIdentity = identity || `${userRole}_${userId}`;
    const isHost = ["teacher", "admin", "super-admin"].includes(userRole);

    const { token, serverUrl } = await generateLiveKitToken({
      roomName: room,
      identity: userIdentity,
      name: userName,
      isHost,
      metadata: {
        userId,
        userRole,
        fullName: userName,
        isHost,
      },
    });

    return NextResponse.json(
      {
        success: true,
        token,
        serverUrl,
        room,
        identity: userIdentity,
        name: userName,
        isHost,
      },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[/api/livekit/token] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate LiveKit token" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
