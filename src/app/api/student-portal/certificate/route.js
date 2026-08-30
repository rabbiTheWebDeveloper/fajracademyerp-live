import { NextResponse } from "next/server";
import { getStudentAuth } from "@/lib/student-auth";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";

export async function GET(request) {
  const { userId, userRole } = await getStudentAuth(request);

  if (!userId || userRole !== "student") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    if (!mongoose.models.Student) await import("@/model/student-model");
    if (!mongoose.models.Schedule) await import("@/model/schedule-model");
    if (!mongoose.models.Course) await import("@/model/course-model");
    if (!mongoose.models.Teacher) await import("@/model/teacher-model");

    const student = await mongoose.models.Student.findById(userId)
      .select("-password")
      .lean();

    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Get schedule for course/teacher info
    const schedule = await mongoose.models.Schedule.findOne({ student: userId })
      .populate("course", "title")
      .populate("teacher", "fullName")
      .lean();

    // Also try getting teacher name from teacherId field
    let teacherName = schedule?.teacher?.fullName || "";
    if (!teacherName && student.teacherId) {
      const teacher = await mongoose.models.Teacher.findById(student.teacherId)
        .select("fullName")
        .lean();
      if (teacher) teacherName = teacher.fullName;
    }

    // Resolve course name: prefer schedule's populated course, then look up from student.course
    let courseName = schedule?.course?.title || "";
    if (!courseName && student.course) {
      const course = await mongoose.models.Course.findById(student.course)
        .select("title")
        .lean();
      if (course) courseName = course.title;
    }
    if (!courseName) courseName = "Enrolled Course";

    return NextResponse.json({
      success: true,
      certificate: {
        studentName: student.fullName,
        studentId: student.studentId,
        email: student.email,
        courseName,
        teacherName: teacherName || "Instructor",
        admissionDate: student.admissionDate,
        classStartingDate: student.classStartingDate,
        status: student.status,
        gender: student.gender,
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
