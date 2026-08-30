import { NextResponse } from "next/server";
import { getAllUsers, createUser } from "@/queries/user-queries";
import { recordAuditLog } from "@/lib/audit-logger";
import { dbConnect } from "@/service/mongo";
import { RoleModel } from "@/model/role-model";

const SYSTEM_ROLES_PERMISSIONS = {
  "super-admin": ["*"],
  "admin":       ["*"],
  "teacher":     ["teacher-portal"],
  "student":     ["student-portal"],
  "staff":       ["staff-portal"],
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getAllUsers({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
      role: searchParams.get("role") || "",
      search: searchParams.get("search") || "",
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.fullName || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, message: "fullName, email, and password are required" },
        { status: 400 }
      );
    }

    // Resolve permissions for the assigned role
    let permissions = body.permissions || [];
    if (!permissions.length && body.role) {
      if (SYSTEM_ROLES_PERMISSIONS[body.role]) {
        permissions = SYSTEM_ROLES_PERMISSIONS[body.role];
      } else {
        const roleDoc = await RoleModel.findOne({ name: body.role }).lean();
        permissions = roleDoc?.permissions || [];
      }
    }

    const user = await createUser({ ...body, permissions });
    const { password: _, ...safeUser } = user;

    await recordAuditLog(request, {
      action: "CREATE",
      resource: "User",
      resourceId: user._id?.toString() || null,
      description: `Created new user: ${user.fullName} (${user.email}) with role: ${user.role}`,
      changes: { after: safeUser }
    });

    return NextResponse.json({ success: true, user: safeUser }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A user with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
