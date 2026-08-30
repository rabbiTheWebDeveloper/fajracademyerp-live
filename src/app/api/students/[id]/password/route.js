import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { StudentModel } from "@/model/student-model";
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
    const student = await StudentModel.findByIdAndUpdate(
      id,
      { $set: { password: hashed } },
      { returnDocument: "after" }
    ).lean();

    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Student",
      resourceId: id,
      description: `Updated password for student: ${student.fullName}`,
      severity: "warning"
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
