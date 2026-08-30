import { NextResponse } from "next/server";
import { updateDailyReport } from "@/queries/staff-queries";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.status === "reviewed" && !body.reviewedAt) body.reviewedAt = new Date();
    const report = await updateDailyReport(id, body);
    if (!report) return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
