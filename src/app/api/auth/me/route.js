import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/service/mongo";
import { UserModel } from "@/model/user-model";
import { RoleModel } from "@/model/role-model";

// ── Cache control header shared across the response ───────────────────────────
const NO_STORE = { "Cache-Control": "no-store, no-cache" };

// Hardcoded system roles that always get full or portal access
const SYSTEM_ROLES_PERMISSIONS = {
  "super-admin": ["*"],
  "admin":       ["*"],
  "teacher":     ["teacher-portal"],
  "student":     ["student-portal"],
  "staff":       ["staff-portal"],
};

export async function GET(request) {
  try {
    await dbConnect();

    const cookieHeader = request.headers.get("cookie") || "";
    const authCookieMatch = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    const token = authCookieMatch?.[1];

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401, headers: NO_STORE }
      );
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session. Please log in again." },
        { status: 401, headers: NO_STORE }
      );
    }

    const role = decoded.role;

    // ── Fetch user from correct model ────────────────────────────────────────
    let user = null;

    if (role === "teacher") {
      const { TeacherModel } = await import("@/model/teacher-model");
      user = await TeacherModel.findById(decoded.id).select("-password -resetPasswordToken").lean();
      if (user) user.role = "teacher";
    } else if (role === "student") {
      const { StudentModel } = await import("@/model/student-model");
      user = await StudentModel.findById(decoded.id).select("-password -resetPasswordToken").lean();
      if (user) user.role = "student";
    } else if (role === "staff") {
      const { StaffModel } = await import("@/model/staff-model");
      user = await StaffModel.findById(decoded.id).select("-password -resetPasswordToken").lean();
      if (user) user.role = "staff";
    } else {
      // admin, super-admin, or any custom role — all live in UserModel
      user = await UserModel.findById(decoded.id).select("-password -resetPasswordToken").lean();
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found. Please log in again." },
        { status: 404, headers: NO_STORE }
      );
    }

    // Ensure role is always present
    if (!user.role) user.role = role;

    // ── Resolve permissions (live from RoleModel — no stale cache) ──────────
    // System roles get fixed permissions; custom roles ALWAYS read from RoleModel.
    // This ensures any role permission change takes effect on the very next request
    // without requiring the user to log out and back in.
    let permissions;

    if (role === "super-admin" || user.permissions?.includes("*")) {
      // Super-admin or any user explicitly granted wildcard
      permissions = ["*"];
    } else if (SYSTEM_ROLES_PERMISSIONS[role]) {
      // Built-in system role (admin, teacher, student, staff)
      permissions = SYSTEM_ROLES_PERMISSIONS[role];
    } else {
      // Custom role — ALWAYS fetch live from RoleModel (source of truth).
      // Never use user.permissions from DB here — it may be stale if the role
      // was edited after the user was created.
      const roleDoc = await RoleModel.findOne({ name: role }).lean();
      permissions = roleDoc?.permissions || [];
    }

    user.permissions = permissions;

    return NextResponse.json(
      { success: true, user },
      { status: 200, headers: NO_STORE }
    );
  } catch (error) {
    console.error("[/api/auth/me] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500, headers: NO_STORE }
    );
  }
}
