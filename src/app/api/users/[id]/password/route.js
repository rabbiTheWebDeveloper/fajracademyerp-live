import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { UserModel } from "@/model/user-model";
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
    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: { password: hashed } },
      { returnDocument: "after" }
    ).lean();

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Sync corresponding Teacher, Student, or Staff profiles if they exist
    const emailLower = user.email.toLowerCase();
    
    const { TeacherModel } = await import("@/model/teacher-model");
    await TeacherModel.findOneAndUpdate(
      { email: emailLower },
      { $set: { password: hashed } }
    );

    const { StudentModel } = await import("@/model/student-model");
    await StudentModel.findOneAndUpdate(
      { email: emailLower },
      { $set: { password: hashed } }
    );

    const { StaffModel } = await import("@/model/staff-model");
    await StaffModel.findOneAndUpdate(
      { email: emailLower },
      { $set: { password: hashed } }
    );

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "User",
      resourceId: id,
      description: `Reset password for user: ${user.fullName || user.email}`,
      severity: "warning"
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
