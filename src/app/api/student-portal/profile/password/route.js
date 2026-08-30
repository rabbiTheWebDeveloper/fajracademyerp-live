import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export async function PUT(req) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "student") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "All password fields are required." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "New password and confirm password do not match." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { success: false, message: "New password must be different from the current password." },
        { status: 400 }
      );
    }

    await dbConnect();

    const Student = mongoose.models.Student || (await import("@/model/student-model")).StudentModel;
    const student = await Student.findById(userId).select("+password");

    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Incorrect current password." },
        { status: 401 }
      );
    }

    // Hash and save new password using updateOne to bypass the pre-save hook
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await Student.updateOne({ _id: userId }, { $set: { password: hashedPassword } });

    return NextResponse.json(
      { success: true, message: "Password updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student password update error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
