import { NextResponse } from "next/server";
import { updateLeave } from "@/queries/staff-queries";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    // If approving or rejecting, record who took action and when
    if (body.status === "approved" || body.status === "rejected") {
      body.actionAt = new Date();
    }
    const leave = await updateLeave(id, body);
    if (!leave) return NextResponse.json({ success: false, message: "Leave not found" }, { status: 404 });
    return NextResponse.json({ success: true, leave }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
