import { NextResponse } from "next/server";
import { getStudentAuth } from "@/lib/student-auth";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";
import { FeedbackModel } from "@/model/feedback-model";

export async function GET(request) {
  const { userId, userRole } = await getStudentAuth(request);

  if (!userId || userRole !== "student") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const Student = mongoose.models.Student;
    const Enrollment = mongoose.models.Enrollment;
    const Teacher = mongoose.models.Teacher;
    const Course = mongoose.models.Course;

    // 1. Fetch student details to get their assigned primary teacherId and profile course name
    const student = await Student.findById(userId).lean();
    let teacherInfo = null;
    if (student && student.teacherId) {
      const teacher = await Teacher.findById(student.teacherId).select("fullName avatar").lean();
      if (teacher) {
        teacherInfo = {
          _id: teacher._id.toString(),
          name: teacher.fullName,
          avatar: teacher.avatar || ""
        };
      }
    }

    // 2. Fetch active course enrollments
    const enrollments = await Enrollment.find({ student: userId, status: "active" })
      .populate("course", "title")
      .lean();
    const enrolledCourses = enrollments.map(e => e.course).filter(Boolean);

    // Resolve student.course (now stored as ObjectId) if not already in enrolledCourses list
    if (student && student.course) {
      const courseObj = await Course.findById(student.course).select("title").lean();
      if (courseObj) {
        const alreadyAdded = enrolledCourses.some(c => c._id.toString() === courseObj._id.toString());
        if (!alreadyAdded) {
          enrolledCourses.push({
            _id: courseObj._id.toString(),
            title: courseObj.title
          });
        }
      }
    }

    // 3. Fetch past feedback submitted by this student
    const pastFeedbacks = await FeedbackModel.find({ student: userId })
      .populate("course", "title")
      .populate("teacher", "fullName")
      .sort({ createdAt: -1 })
      .lean();

    // 4. Fetch courses evaluated in the current calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const feedbacksThisMonth = await FeedbackModel.find({
      student: userId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).select("course").lean();

    const submittedCourseIds = feedbacksThisMonth.map(f => f.course.toString());

    return NextResponse.json({
      success: true,
      teacherInfo,
      enrolledCourses,
      pastFeedbacks,
      submittedCourseIds
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { userId, userRole } = await getStudentAuth(req);

  if (!userId || userRole !== "student") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      courseId,
      teacherId,
      rating, // Overall satisfaction (1-5)
      teachingClarity,
      punctuality,
      subjectKnowledge,
      behaviorPatience,
      classEngagement,
      useOfClassTime,
      likeMost,
      couldImprove,
      issuesConcerns,
      recommend
    } = body;

    if (!courseId || !teacherId || !rating) {
      return NextResponse.json(
        { success: false, message: "Course, Teacher, and Overall Satisfaction rating are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Enforce monthly limit: 1 feedback per student + course in the current calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const existingFeedback = await FeedbackModel.findOne({
      student: userId,
      course: courseId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    if (existingFeedback) {
      return NextResponse.json(
        { success: false, message: "You have already submitted an evaluation for this course this month." },
        { status: 400 }
      );
    }

    // Construct unified comments string for backwards compatibility
    const commentParts = [];
    if (likeMost) commentParts.push(`Like most: ${likeMost}`);
    if (couldImprove) commentParts.push(`Could improve: ${couldImprove}`);
    if (issuesConcerns) commentParts.push(`Concerns: ${issuesConcerns}`);
    const comments = commentParts.join("\n") || "No written comments.";

    const feedback = new FeedbackModel({
      student: userId,
      course: courseId,
      teacher: teacherId,
      rating: Number(rating),
      comments,
      teachingClarity: Number(teachingClarity ?? 5),
      punctuality: Number(punctuality ?? 5),
      subjectKnowledge: Number(subjectKnowledge ?? 5),
      behaviorPatience: Number(behaviorPatience ?? 5),
      classEngagement: Number(classEngagement ?? 5),
      useOfClassTime: Number(useOfClassTime ?? 5),
      likeMost: likeMost || "",
      couldImprove: couldImprove || "",
      issuesConcerns: issuesConcerns || "",
      recommend: recommend === undefined ? true : Boolean(recommend)
    });

    await feedback.save();

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
