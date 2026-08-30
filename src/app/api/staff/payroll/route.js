import { NextResponse } from "next/server";
import { getPayroll, createPayroll } from "@/queries/staff-queries";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getPayroll({
      month:   searchParams.get("month")   || "",
      staffId: searchParams.get("staffId") || undefined,
      status:  searchParams.get("status")  || "",
      page:    Number(searchParams.get("page"))  || 1,
      limit:   Number(searchParams.get("limit")) || 20,
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/staff/payroll:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.staff)  return NextResponse.json({ success: false, message: "Staff ID is required." }, { status: 400 });
    if (!body.month)  return NextResponse.json({ success: false, message: "Month is required (YYYY-MM)." }, { status: 400 });
    if (!body.basicSalary && body.basicSalary !== 0)
      return NextResponse.json({ success: false, message: "Basic salary is required." }, { status: 400 });

    const payroll = await createPayroll(body);
    return NextResponse.json({ success: true, payroll }, { status: 201 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map(e => e.message).join(" ");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Payroll for this staff member and month already exists." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
