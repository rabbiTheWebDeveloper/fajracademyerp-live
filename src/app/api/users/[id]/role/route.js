import { NextResponse } from "next/server";
import { updateUserRole, getUserById } from "@/queries/user-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { role, permissions } = await request.json();
    if (!role) {
      return NextResponse.json({ success: false, message: "role is required" }, { status: 400 });
    }
    const beforeUser = await getUserById(id);
    const user = await updateUserRole(id, role, permissions || []);
    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "UserRole",
      resourceId: id,
      description: `Updated role for user ${user.fullName || user.email} to ${role}`,
      changes: {
        before: beforeUser ? { role: beforeUser.role, permissions: beforeUser.permissions } : null,
        after: { role: user.role, permissions: user.permissions }
      }
    });

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
