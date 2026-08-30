import { NextResponse } from "next/server";
import { updatePayroll, deletePayroll } from "@/queries/staff-queries";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.status === "paid" && !body.paidAt) body.paidAt = new Date();
    const payroll = await updatePayroll(id, body);
    if (!payroll) return NextResponse.json({ success: false, message: "Payroll not found" }, { status: 404 });
    return NextResponse.json({ success: true, payroll }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const payroll = await deletePayroll(id);
    if (!payroll) return NextResponse.json({ success: false, message: "Payroll not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Payroll deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
