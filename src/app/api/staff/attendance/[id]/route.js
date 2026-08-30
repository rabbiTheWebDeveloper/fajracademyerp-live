import { NextResponse } from "next/server";
import { updateAttendance } from "@/queries/staff-queries";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const record = await updateAttendance(id, body);
    if (!record) return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    return NextResponse.json({ success: true, record }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
