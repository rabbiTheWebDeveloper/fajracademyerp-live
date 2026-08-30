import { NextResponse } from "next/server";
import { getTeacherActiveNotice } from "@/queries/teacher-portal-queries";
import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await getTeacherActiveNotice();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
