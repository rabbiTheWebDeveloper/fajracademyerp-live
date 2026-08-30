import { NextResponse } from "next/server";
import { getStaffById, updateStaff, deleteStaff } from "@/queries/staff-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const staff = await getStaffById(id);
    if (!staff) return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    return NextResponse.json({ success: true, staff }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    delete body.password; // password change is a separate endpoint

    const beforeStaff = await getStaffById(id);
    if (!beforeStaff) return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    const cleanBefore = { ...beforeStaff };
    delete cleanBefore.password;

    const staff = await updateStaff(id, body);
    if (!staff) return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    const cleanAfter = { ...staff };
    delete cleanAfter.password;

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Staff",
      resourceId: id,
      description: `Updated staff member: ${staff.fullName}`,
      changes: { before: cleanBefore, after: cleanAfter }
    });

    return NextResponse.json({ success: true, staff }, { status: 200 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map(e => e.message).join(" ");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const beforeStaff = await getStaffById(id);
    if (!beforeStaff) return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    const cleanBefore = { ...beforeStaff };
    delete cleanBefore.password;

    await deleteStaff(id);

    await recordAuditLog(request, {
      action: "DELETE",
      resource: "Staff",
      resourceId: id,
      description: `Deleted staff member: ${beforeStaff.fullName}`,
      changes: { before: cleanBefore }
    });

    return NextResponse.json({ success: true, message: "Staff member deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
