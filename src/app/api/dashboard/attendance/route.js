import { NextResponse } from "next/server";
import {
  getMonthlyAttendanceSummary,
  getStudentAttendanceList,
} from "@/queries/dashboard-queries";

/**
 * GET /api/dashboard/attendance
 *
 * Query params:
 *   type=summary&year=2026            → 12-month bar chart data
 *   type=list&month=7&year=2026       → per-student list for that month
 *   type=list&month=7&year=2026&search=ali&page=1&limit=20
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type   = searchParams.get("type") || "summary";
    const month  = searchParams.get("month");
    const year   = searchParams.get("year");
    const search = searchParams.get("search") || "";
    const page   = parseInt(searchParams.get("page") || "1");
    const limit  = parseInt(searchParams.get("limit") || "20");

    if (type === "list") {
      const result = await getStudentAttendanceList({ month, year, search, page, limit });
      return NextResponse.json({ success: true, ...result }, { status: 200 });
    }

    // Default: 12-month summary
    const chartData = await getMonthlyAttendanceSummary(year ? parseInt(year) : undefined);
    return NextResponse.json({ success: true, chartData }, { status: 200 });
  } catch (error) {
    console.error("Attendance dashboard error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
