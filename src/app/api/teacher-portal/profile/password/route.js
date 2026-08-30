import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { UserModel } from "@/model/user-model";
import bcrypt from "bcryptjs";

export async function PUT(req) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: "Both current and new passwords are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: "New password must be at least 6 characters long" }, { status: 400 });
    }

    await dbConnect();

    // Find teacher
    let teacher = await TeacherModel.findById(userId).select("+password");
    let user = null;

    if (!teacher) {
      // Look up in UserModel
      user = await UserModel.findById(userId).select("+password");
      if (!user) {
        return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
      }
      
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ success: false, message: "Incorrect current password" }, { status: 401 });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      user.password = hashedPassword;
      await user.save();

      // If there is a corresponding teacher profile, update it too
      teacher = await TeacherModel.findOne({ email: user.email });
      if (teacher) {
        teacher.password = newPassword;
        await teacher.save();
      }

    } else {
      // Found teacher
      const isMatch = await teacher.comparePassword(currentPassword);
      if (!isMatch) {
        return NextResponse.json({ success: false, message: "Incorrect current password" }, { status: 401 });
      }

      teacher.password = newPassword; // Pre-save hook will hash it
      await teacher.save();

      // Update UserModel as well
      user = await UserModel.findOne({ email: teacher.email });
      if (user) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
      }
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
