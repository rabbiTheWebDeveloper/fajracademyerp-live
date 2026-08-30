import { NextResponse } from "next/server";
import { getAttendance, markAttendance } from "@/queries/staff-queries";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getAttendance({
      staffId: searchParams.get("staffId") || undefined,
      date:    searchParams.get("date")    || undefined,
      month:   searchParams.get("month")   || undefined,
      page:    Number(searchParams.get("page"))  || 1,
      limit:   Number(searchParams.get("limit")) || 50,
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/staff/attendance:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.staff) return NextResponse.json({ success: false, message: "Staff ID is required" }, { status: 400 });
    if (!body.status) return NextResponse.json({ success: false, message: "Status is required" }, { status: 400 });
    if (!body.date) body.date = new Date().toISOString();
    const record = await markAttendance(body);
    return NextResponse.json({ success: true, record }, { status: 200 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map(e => e.message).join(" ");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
