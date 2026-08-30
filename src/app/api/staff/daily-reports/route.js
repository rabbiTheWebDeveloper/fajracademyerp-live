import { NextResponse } from "next/server";
import { getDailyReports, createDailyReport } from "@/queries/staff-queries";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getDailyReports({
      staffId: searchParams.get("staffId") || undefined,
      date:    searchParams.get("date")    || undefined,
      status:  searchParams.get("status")  || "",
      page:    Number(searchParams.get("page"))  || 1,
      limit:   Number(searchParams.get("limit")) || 20,
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/staff/daily-reports:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.staff)   return NextResponse.json({ success: false, message: "Staff ID is required." }, { status: 400 });
    if (!body.summary) return NextResponse.json({ success: false, message: "Summary is required." }, { status: 400 });
    if (!body.date) body.date = new Date().toISOString();
    const report = await createDailyReport(body);
    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "A daily report for this staff member already exists for today." }, { status: 409 });
    }
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map(e => e.message).join(" ");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
