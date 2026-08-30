import { NextResponse } from "next/server";
import { getStudentClasses } from "@/queries/student-portal-queries";
import { getStudentAuth } from "@/lib/student-auth";

export async function GET(request) {
  try {
    const { userId, userRole } = await getStudentAuth(request);

    if (!userId || userRole !== "student") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const result = await getStudentClasses(userId);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error("GET /api/student-portal/classes error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
