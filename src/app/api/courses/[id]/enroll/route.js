import { NextResponse } from "next/server";
import { enrollStudentInCourse } from "@/queries/course-queries";

export async function POST(request, { params }) {
  try {
    const { id: courseId } = await params;
    const body = await request.json();
    
    if (!body.studentId) {
      return NextResponse.json(
        { success: false, message: "studentId is required" },
        { status: 400 }
      );
    }

    const result = await enrollStudentInCourse(body.studentId, courseId);
    
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Student enrolled successfully", enrollment: result },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
