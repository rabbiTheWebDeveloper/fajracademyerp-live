import { NextResponse } from "next/server";
import { getTeacherSalaries, generateTeacherSalary } from "@/queries/teacher-portal-queries";
import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await getTeacherSalaries(userId);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

export async function POST(req) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { month } = await req.json();
    
    if (!month) {
      return NextResponse.json({ success: false, message: "Month is required" }, { status: 400 });
    }

    const result = await generateTeacherSalary(userId, month);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
