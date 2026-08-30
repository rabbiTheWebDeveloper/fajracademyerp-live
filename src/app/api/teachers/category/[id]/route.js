import { NextResponse } from "next/server";
import { updateTeacherCategory, deleteTeacherCategory } from "@/queries/teacher-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, message: "Category name is required" }, { status: 400 });
    }
    const category = await updateTeacherCategory(id, body);
    if (!category) {
      return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
    }

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "TeacherCategory",
      resourceId: id,
      description: `Updated teacher category: ${category.name}`,
      changes: { after: category }
    });

    return NextResponse.json({ success: true, category }, { status: 200 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Category name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteTeacherCategory(id);

    await recordAuditLog(request, {
      action: "DELETE",
      resource: "TeacherCategory",
      resourceId: id,
      description: `Deleted teacher category ID: ${id}`
    });

    return NextResponse.json({ success: true, message: "Category deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
