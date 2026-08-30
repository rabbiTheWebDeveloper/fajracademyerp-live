import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";

// Ensure models are registered
const getModels = async () => {
  await dbConnect();
  if (!mongoose.models.Student) await import("@/model/student-model");
  if (!mongoose.models.Course) await import("@/model/course-model");
  if (!mongoose.models.Teacher) await import("@/model/teacher-model");
  if (!mongoose.models.Feedback) await import("@/model/feedback-model");
  return { Feedback: mongoose.models.Feedback };
};

export async function GET() {
  try {
    const { Feedback } = await getModels();
    
    // Fetch all feedback with populated references
    const feedbacks = await Feedback.find()
      .populate("student", "fullName")
      .populate("course", "title")
      .populate("teacher", "fullName email")
      .sort({ createdAt: -1 })
      .lean();

    // Aggregation maps
    const teacherMap = {};
    const courseMap = {};

    feedbacks.forEach(f => {
      // Aggregate Teacher Stats
      if (f.teacher) {
        const tId = f.teacher._id.toString();
        if (!teacherMap[tId]) {
          teacherMap[tId] = {
            id: tId,
            name: f.teacher.fullName,
            email: f.teacher.email,
            totalRating: 0,
            reviewCount: 0,
          };
        }
        teacherMap[tId].totalRating += f.rating;
        teacherMap[tId].reviewCount += 1;
      }

      // Aggregate Course Stats
      if (f.course) {
        const cId = f.course._id.toString();
        if (!courseMap[cId]) {
          courseMap[cId] = {
            id: cId,
            title: f.course.title,
            totalRating: 0,
            reviewCount: 0,
          };
        }
        courseMap[cId].totalRating += f.rating;
        courseMap[cId].reviewCount += 1;
      }
    });

    // Compute averages and sort (descending by average rating, then by review count)
    const teacherLeaderboard = Object.values(teacherMap).map((t) => ({
      ...t,
      avgRating: Number((t.totalRating / t.reviewCount).toFixed(1))
    })).sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);

    const courseLeaderboard = Object.values(courseMap).map((c) => ({
      ...c,
      avgRating: Number((c.totalRating / c.reviewCount).toFixed(1))
    })).sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);

    return NextResponse.json({
      success: true,
      feedbacks,
      teacherLeaderboard,
      courseLeaderboard
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
