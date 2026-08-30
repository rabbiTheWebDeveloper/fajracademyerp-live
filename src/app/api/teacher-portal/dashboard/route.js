import { NextResponse } from "next/server";
import { getTeacherDashboardStats, resolveTeacherId } from "@/queries/teacher-portal-queries";
import { headers } from "next/headers";

export async function GET(request) {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthFilter = searchParams.get("month") || "current"; // "current" or "previous"

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  const result = await getTeacherDashboardStats(teacherId, monthFilter);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
