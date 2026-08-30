import { NextResponse } from "next/server";
import { getTeacherAllNotices } from "@/queries/teacher-portal-queries";
import { headers } from "next/headers";

export async function GET(request) {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const result = await getTeacherAllNotices(page, limit);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
