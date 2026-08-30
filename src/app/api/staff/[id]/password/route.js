import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { StaffModel } from "@/model/staff-model";
import bcrypt from "bcryptjs";
import { recordAuditLog } from "@/lib/audit-logger";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await dbConnect();
    const hashed = await bcrypt.hash(newPassword, 12);
    const staff = await StaffModel.findByIdAndUpdate(
      id,
      { $set: { password: hashed } },
      { returnDocument: "after" }
    ).lean();

    if (!staff) {
      return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    }

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Staff",
      resourceId: id,
      description: `Updated password for staff member: ${staff.fullName}`,
      severity: "warning"
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
