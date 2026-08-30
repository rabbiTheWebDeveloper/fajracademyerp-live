import { NextResponse } from "next/server";
import { getTeachersForSalaryDropdown } from "@/queries/admin-salary-queries";

export async function GET() {
  try {
    const result = await getTeachersForSalaryDropdown();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
