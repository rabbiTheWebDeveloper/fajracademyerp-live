import { NextResponse } from "next/server";
import { getUserByEmail } from "@/queries/user-queries";

export async function POST(request) {
  try {
    const { identifier } = await request.json();

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { success: false, message: "Email or ID is required." },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(identifier.trim());

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Email or ID not found. User is not registered. Please contact support: 01641028312." 
        },
        { status: 404 }
      );
    }

    const name = user.fullName || "User";
    const role = user.role ? user.role.toUpperCase() : "ACCOUNT";

    return NextResponse.json(
      {
        success: true,
        message: `Account found for ${name} (${role}). Please contact support at 01641028312 or your system administrator to reset your password.`,
        user: {
          fullName: name,
          role: user.role,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
