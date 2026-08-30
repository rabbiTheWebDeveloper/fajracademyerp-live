import { NextResponse } from "next/server";
import { getTeacherById, updateTeacher, deleteTeacher } from "@/queries/teacher-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const teacher = await getTeacherById(id);
    if (!teacher) return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    return NextResponse.json({ success: true, teacher }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    delete body.password;

    const beforeTeacher = await getTeacherById(id);
    if (!beforeTeacher) return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    const cleanBefore = { ...beforeTeacher };
    delete cleanBefore.password;

    const teacher = await updateTeacher(id, body);
    if (!teacher) return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    const cleanAfter = { ...teacher };
    delete cleanAfter.password;

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Teacher",
      resourceId: id,
      description: `Updated teacher: ${teacher.fullName}`,
      changes: { before: cleanBefore, after: cleanAfter }
    });

    return NextResponse.json({ success: true, teacher }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const beforeTeacher = await getTeacherById(id);
    if (!beforeTeacher) return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    const cleanBefore = { ...beforeTeacher };
    delete cleanBefore.password;

    await deleteTeacher(id);

    await recordAuditLog(request, {
      action: "DELETE",
      resource: "Teacher",
      resourceId: id,
      description: `Deleted teacher: ${beforeTeacher.fullName}`,
      changes: { before: cleanBefore }
    });

    return NextResponse.json({ success: true, message: "Teacher deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
