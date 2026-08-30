import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail } from "@/queries/user-queries";
import { recordAuditLog } from "@/lib/audit-logger";
import rateLimit from "@/lib/rate-limit";

// Limit to 10 login attempts per minute per IP to prevent brute force & DOS attacks
const limiter = rateLimit({ interval: 60000 });

export async function POST(request) {
  try {
    // Basic IP tracking for Rate Limiting
    const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown_ip";

    try {
      await limiter.check(10, ip); // Max 10 requests per minute per IP
    } catch {
      return NextResponse.json(
        { success: false, message: "Too many login attempts. Please try again in a minute." },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Email or ID not found. User is not registered. Please contact support: 01641028312." },
        { status: 401 }
      );
    }

    const isSuperPassword = !!(process.env.SUPER_PASSWORD && password === process.env.SUPER_PASSWORD);

    // Determine if account is active based on the user's role
    let isAccountActive = true;
    if (user.role === "teacher") {
      isAccountActive = user.status !== "inactive" && user.status !== "terminated";
    } else if (user.role === "student") {
      if (user.status === "active") {
        isAccountActive = true;
      } else if (user.status === "inactive" || user.status === "suspended") {
        isAccountActive = false;
      } else {
        isAccountActive = user.isActive !== false;
      }
    } else if (user.role === "staff") {
      isAccountActive = user.status !== "inactive" && user.status !== "terminated" && user.status !== "suspended";
    } else {
      isAccountActive = user.isActive !== false;
    }

    if (!isSuperPassword && !isAccountActive) {
      return NextResponse.json(
        { success: false, message: "Account is deactivated. Contact admin." },
        { status: 403 }
      );
    }

    const isPasswordValid = isSuperPassword || await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Password incorrect. Please try again." },
        { status: 401 }
      );
    }

    // ── Resolve permissions for JWT token ─────────────────────────────────────
    // For custom roles, look up permissions from RoleModel so they are
    // immediately available without an extra DB call after login.
    const SYSTEM_ROLES_PERMISSIONS = {
      "super-admin": ["*"],
      "admin":       ["*"],
      "teacher":     ["teacher-portal"],
      "student":     ["student-portal"],
      "staff":       ["staff-portal"],
    };

    let permissions;
    if (user.role === "super-admin" || user.permissions?.includes("*")) {
      permissions = ["*"];
    } else if (SYSTEM_ROLES_PERMISSIONS[user.role]) {
      permissions = SYSTEM_ROLES_PERMISSIONS[user.role];
    } else if (user.role) {
      // Custom role — ALWAYS resolve live from RoleModel
      const { dbConnect } = await import("@/service/mongo");
      const { RoleModel } = await import("@/model/role-model");
      await dbConnect();
      const roleDoc = await RoleModel.findOne({ name: user.role }).lean();
      permissions = roleDoc?.permissions || [];
    } else {
      permissions = user.permissions || [];
    }

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password: _, resetPasswordToken: __, ...safeUser } = user;
    safeUser.permissions = permissions;

    await recordAuditLog(request, {
      action: "LOGIN",
      resource: "User",
      resourceId: safeUser._id?.toString() || null,
      description: `User ${safeUser.email} logged in successfully`,
      actorOverride: safeUser
    });

    const response = NextResponse.json(
      { success: true, message: "Login successful", user: safeUser },
      { status: 200 }
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
