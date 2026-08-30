import { NextResponse } from "next/server";
import { getAllCoursesForDropdown } from "@/queries/teacher-class-queries";
import { headers } from "next/headers";

// GET /api/teacher-portal/courses  — returns published courses for dropdowns
export async function GET() {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await getAllCoursesForDropdown();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}