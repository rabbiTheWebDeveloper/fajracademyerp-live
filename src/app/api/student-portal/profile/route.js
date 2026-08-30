import { NextResponse } from "next/server";
import { updateStudentProfile } from "@/queries/student-portal-queries";
import { getStudentAuth } from "@/lib/student-auth";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    const { userId, userRole } = await getStudentAuth(request);

    if (!userId || userRole !== "student") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    if (!mongoose.models.Course) await import("@/model/course-model");
    const Student = mongoose.models.Student;
    const student = await Student.findById(userId).select('-password').lean();
    
    if (student && student.teacherId) {
      const { TeacherModel } = await import("@/model/teacher-model");
      const teacher = await TeacherModel.findById(student.teacherId).select("fullName").lean();
      if (teacher) {
        student.teacherName = teacher.fullName;
      }
    }

    // Resolve course ObjectId → course title
    if (student && student.course) {
      const course = await mongoose.models.Course.findById(student.course).select("title").lean();
      if (course) {
        student.course = course.title;
      }
    }

    return NextResponse.json({ success: true, student }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { userId, userRole } = await getStudentAuth(req);

    if (!userId || userRole !== "student") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Only allow updating fullName, gender, and avatar
    const updateData = {};
    if (body.fullName !== undefined) updateData.fullName = body.fullName;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;

    const result = await updateStudentProfile(userId, updateData);
    
    // Fetch and append teacherName and courseName to the returned updated student document
    if (result.success && result.student) {
      const studentObj = result.student.toObject ? result.student.toObject() : result.student;
      if (studentObj.teacherId) {
        const { TeacherModel } = await import("@/model/teacher-model");
        const teacher = await TeacherModel.findById(studentObj.teacherId).select("fullName").lean();
        if (teacher) {
          studentObj.teacherName = teacher.fullName;
        }
      }
      // Resolve course ObjectId → course title
      if (studentObj.course) {
        if (!mongoose.models.Course) await import("@/model/course-model");
        const course = await mongoose.models.Course.findById(studentObj.course).select("title").lean();
        if (course) studentObj.course = course.title;
      }
      result.student = studentObj;
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
