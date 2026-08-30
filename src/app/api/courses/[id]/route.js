import { NextResponse } from "next/server";
import { getCourseById, updateCourse, deleteCourse } from "@/queries/course-queries";
import { recordAuditLog } from "@/lib/audit-logger";

// Allowed fields in the course model
const COURSE_FIELDS = ["title", "description", "level", "status", "thumbnail", "language", "isActive"];

// GET /api/courses/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const course = await getCourseById(id);
    if (!course) {
      return NextResponse.json({ success: false, message: "Course not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, course }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT /api/courses/[id]
// Body: any subset of { title, description, level, status, thumbnail, language, isActive }
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate at least one valid field is provided
    const hasValidField = COURSE_FIELDS.some((f) => body[f] !== undefined);
    if (!hasValidField) {
      return NextResponse.json(
        { success: false, message: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    // Validate title is not empty
    if (body.title !== undefined && !String(body.title).trim()) {
      return NextResponse.json(
        { success: false, message: "Course title cannot be empty" },
        { status: 400 }
      );
    }

    // Validate level enum
    if (body.level && !["beginner", "intermediate", "advanced"].includes(body.level)) {
      return NextResponse.json(
        { success: false, message: "level must be beginner, intermediate, or advanced" },
        { status: 400 }
      );
    }

    // Validate status enum
    if (body.status && !["draft", "published", "archived"].includes(body.status)) {
      return NextResponse.json(
        { success: false, message: "status must be draft, published, or archived" },
        { status: 400 }
      );
    }

    const beforeCourse = await getCourseById(id);
    if (!beforeCourse) {
      return NextResponse.json({ success: false, message: "Course not found" }, { status: 404 });
    }

    const course = await updateCourse(id, body);
    if (!course) {
      return NextResponse.json({ success: false, message: "Course not found" }, { status: 404 });
    }

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Course",
      resourceId: id,
      description: `Updated course: ${course.title}`,
      changes: { before: beforeCourse, after: course }
    });

    return NextResponse.json({ success: true, course }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/courses/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const beforeCourse = await getCourseById(id);
    if (!beforeCourse) {
      return NextResponse.json({ success: false, message: "Course not found" }, { status: 404 });
    }

    await deleteCourse(id);

    await recordAuditLog(request, {
      action: "DELETE",
      resource: "Course",
      resourceId: id,
      description: `Deleted course: ${beforeCourse.title}`,
      changes: { before: beforeCourse }
    });

    return NextResponse.json({ success: true, message: "Course deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}