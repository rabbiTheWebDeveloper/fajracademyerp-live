import { NextResponse } from "next/server";
import { getTeacherCategories, createTeacherCategory } from "@/queries/teacher-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET() {
  try {
    const categories = await getTeacherCategories();
    return NextResponse.json({ success: true, categories }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, message: "Category name is required" }, { status: 400 });
    }
    const category = await createTeacherCategory(body);

    await recordAuditLog(request, {
      action: "CREATE",
      resource: "TeacherCategory",
      resourceId: category._id?.toString() || null,
      description: `Created teacher category: ${category.name}`,
      changes: { after: category }
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Category name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
