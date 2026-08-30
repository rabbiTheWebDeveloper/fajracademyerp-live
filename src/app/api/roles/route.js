import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { RoleModel } from "@/model/role-model";
import { UserModel } from "@/model/user-model";
import { recordAuditLog } from "@/lib/audit-logger";

// Helper: sync usersCount for a given role name
async function syncUsersCount(roleName) {
  if (!roleName) return;
  try {
    const count = await UserModel.countDocuments({ role: roleName });
    await RoleModel.findOneAndUpdate({ name: roleName }, { $set: { usersCount: count } });
  } catch (e) {
    console.error("syncUsersCount error:", e.message);
  }
}

export async function GET() {
  try {
    await dbConnect();
    // Return roles with live user counts
    const roles = await RoleModel.find().lean();

    // Efficient bulk count using aggregation
    const counts = await UserModel.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    const countMap = counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {});

    const rolesWithCounts = roles.map(r => ({ ...r, usersCount: countMap[r.name] || 0 }));

    return NextResponse.json({ success: true, roles: rolesWithCounts }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();

    if (!data.name?.trim()) {
      return NextResponse.json({ success: false, message: "Role name is required" }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await RoleModel.findOne({ name: data.name.trim() });
    if (existing) {
      return NextResponse.json({ success: false, message: `Role "${data.name}" already exists` }, { status: 409 });
    }

    const role = new RoleModel({
      name: data.name.trim(),
      description: data.description || "",
      permissions: data.permissions || [],
      status: data.status || "active",
    });
    await role.save();

    await recordAuditLog(req, {
      action: "CREATE",
      resource: "Role",
      resourceId: role._id?.toString() || null,
      description: `Created new role: ${role.name}`,
      changes: { after: role }
    });

    return NextResponse.json({ success: true, role }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "A role with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "Missing ID" }, { status: 400 });

    const beforeRole = await RoleModel.findById(id).lean();
    if (!beforeRole) return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });

    // Prevent deletion if users are assigned to this role
    const assignedUsers = await UserModel.countDocuments({ role: beforeRole.name });
    if (assignedUsers > 0) {
      return NextResponse.json(
        { success: false, message: `Cannot delete: ${assignedUsers} user(s) are still assigned to this role. Reassign them first.` },
        { status: 409 }
      );
    }

    await RoleModel.findByIdAndDelete(id);

    await recordAuditLog(req, {
      action: "DELETE",
      resource: "Role",
      resourceId: id,
      description: `Deleted role: ${beforeRole?.name || id}`,
      changes: { before: beforeRole }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const { _id, name, description, permissions, status } = data;

    if (!_id) return NextResponse.json({ success: false, message: "Missing role ID" }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ success: false, message: "Role name is required" }, { status: 400 });

    // Check for duplicate name (excluding itself)
    const duplicate = await RoleModel.findOne({ name: name.trim(), _id: { $ne: _id } });
    if (duplicate) {
      return NextResponse.json({ success: false, message: `Role name "${name}" is already taken` }, { status: 409 });
    }

    const beforeRole = await RoleModel.findById(_id).lean();
    if (!beforeRole) return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });

    const role = await RoleModel.findByIdAndUpdate(
      _id,
      { $set: { name: name.trim(), description, permissions, ...(status && { status }) } },
      { new: true, runValidators: true }
    );

    // If role name changed, update all users with the old name
    if (beforeRole.name !== name.trim()) {
      await UserModel.updateMany(
        { role: beforeRole.name },
        { $set: { role: name.trim() } }
      );
    }

    // Also sync their permissions (update user.permissions if they use this role)
    await UserModel.updateMany(
      { role: name.trim(), permissions: { $exists: true, $size: 0 } },
      { $set: { permissions: permissions || [] } }
    );

    await recordAuditLog(req, {
      action: "UPDATE",
      resource: "Role",
      resourceId: _id,
      description: `Updated role: ${role.name}`,
      changes: { before: beforeRole, after: role }
    });

    return NextResponse.json({ success: true, role }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
