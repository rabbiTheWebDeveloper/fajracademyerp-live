import { NextResponse } from "next/server";
import { getLeaves, createLeave } from "@/queries/staff-queries";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getLeaves({
      staffId: searchParams.get("staffId") || undefined,
      status:  searchParams.get("status")  || "",
      page:    Number(searchParams.get("page"))  || 1,
      limit:   Number(searchParams.get("limit")) || 20,
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/staff/leave:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const required = [["staff","Staff ID"],["leaveType","Leave type"],["fromDate","From date"],["toDate","To date"],["reason","Reason"]];
    for (const [field, label] of required) {
      if (!body[field]) return NextResponse.json({ success: false, message: `${label} is required.` }, { status: 400 });
    }
    // Calculate totalDays if not provided
    if (!body.totalDays) {
      const from = new Date(body.fromDate);
      const to   = new Date(body.toDate);
      body.totalDays = Math.max(1, Math.ceil((to - from) / 86400000) + 1);
    }
    const leave = await createLeave(body);
    return NextResponse.json({ success: true, leave }, { status: 201 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map(e => e.message).join(" ");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
