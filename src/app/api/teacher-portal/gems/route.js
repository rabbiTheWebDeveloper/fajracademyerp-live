import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { resolveTeacherId } from "@/queries/teacher-portal-queries";
import { getTeacherGems } from "@/service/gems-service";

export async function GET() {
  const h = await headers();
  const userId   = h.get("x-user-id");
  const userRole = h.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  try {
    const gems = await getTeacherGems(teacherId);
    return NextResponse.json({ success: true, ...gems });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
