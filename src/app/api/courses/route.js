import { NextResponse } from "next/server";
import { getAllCourses, createCourse } from "@/queries/course-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getAllCourses({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json(
        { success: false, message: "title is required" },
        { status: 400 }
      );
    }
    const course = await createCourse(body);

    await recordAuditLog(request, {
      action: "CREATE",
      resource: "Course",
      resourceId: course._id?.toString() || null,
      description: `Created new course: ${course.title}`,
      changes: { after: course }
    });

    return NextResponse.json({ success: true, course }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
