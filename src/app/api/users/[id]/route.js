import { NextResponse } from "next/server";
import { getUserById, updateUser, deleteUser } from "@/queries/user-queries";
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

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    delete body.password; // Password updates go through /password endpoint

    const beforeUser = await getUserById(id);
    if (!beforeUser) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    // If role is being changed, auto-resolve permissions from RoleModel
    if (body.role && body.role !== beforeUser.role) {
      // Only override permissions if not explicitly provided
      if (!body.permissions?.length) {
        if (SYSTEM_ROLES_PERMISSIONS[body.role]) {
          body.permissions = SYSTEM_ROLES_PERMISSIONS[body.role];
        } else {
          const roleDoc = await RoleModel.findOne({ name: body.role }).lean();
          body.permissions = roleDoc?.permissions || [];
        }
      }
    }

    const user = await updateUser(id, body);
    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const cleanBefore = { ...beforeUser };
    delete cleanBefore.password;
    const cleanAfter = { ...user };
    delete cleanAfter.password;

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "User",
      resourceId: id,
      description: `Updated user: ${user.fullName || user.email}${body.role !== beforeUser.role ? ` (role changed: ${beforeUser.role} → ${body.role})` : ""}`,
      changes: { before: cleanBefore, after: cleanAfter }
    });

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const beforeUser = await getUserById(id);
    if (!beforeUser) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const cleanBefore = { ...beforeUser };
    delete cleanBefore.password;

    await deleteUser(id);

    await recordAuditLog(request, {
      action: "DELETE",
      resource: "User",
      resourceId: id,
      description: `Deleted user: ${beforeUser.fullName || beforeUser.email}`,
      changes: { before: cleanBefore }
    });

    return NextResponse.json({ success: true, message: "User deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
