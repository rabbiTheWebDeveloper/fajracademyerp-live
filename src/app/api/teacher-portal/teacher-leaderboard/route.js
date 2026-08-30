import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { resolveTeacherId } from "@/queries/teacher-portal-queries";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";
import { TeacherModel } from "@/model/teacher-model";
import { TeacherAttendanceModel } from "@/model/teacherAttendance-model";
import { TeacherGemsModel } from "@/model/teacher-gems-model";
import { getTierInfo } from "@/service/gems-service";

export async function GET() {
  const headersList = await headers();
  const userId   = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const myTeacherId = await resolveTeacherId(userId);
  if (!myTeacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  try {
    await dbConnect();
    const { ClassSessionModel } = await import("@/model/class-model");

    // 1. Get all active/on-leave teachers
    const allTeachers = await TeacherModel.find({
      status: { $in: ["active", "on-leave"] },
    })
      .select("_id fullName avatar gender teacherId designation status rating joinDate createdAt")
      .lean();

    if (allTeachers.length === 0) {
      return NextResponse.json({
        success: true,
        teacherLeaderboard: [],
        myRank: null,
        myEntry: null,
        totalTeachers: 0,
      });
    }

    const allTeacherIds = allTeachers.map((t) => t._id);
    const now = new Date();
    const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const startOfBdMonth = new Date(Date.UTC(bdTime.getUTCFullYear(), bdTime.getUTCMonth(), 1));
    const startOfMonth = new Date(startOfBdMonth.getTime() - 6 * 60 * 60 * 1000);

    // 2. Class session stats per teacher (current month)
    const sessionAgg = await ClassSessionModel.aggregate([
      {
        $match: {
          teacher: { $in: allTeacherIds },
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: "$teacher",
          totalSessions:     { $sum: 1 },
          completedSessions: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          uniqueStudents:    { $addToSet: "$student" },
          presentStudents:   { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] } },
        },
      },
    ]);

    const sessionMap = {};
    sessionAgg.forEach((s) => { sessionMap[s._id.toString()] = s; });

    // 3. Fetch gems for all teachers
    const gemsMap = {};
    const gemsDocs = await TeacherGemsModel.find(
      { teacher: { $in: allTeacherIds } },
      { teacher: 1, totalGems: 1, monthlyGems: 1, tier: 1 }
    ).lean();
    gemsDocs.forEach((g) => { gemsMap[g.teacher.toString()] = g; });

    // 4. Compute score
    const fullLeaderboard = allTeachers.map((teacher) => {
      const tid = teacher._id.toString();
      const ses = sessionMap[tid] || {
        totalSessions: 0, completedSessions: 0, uniqueStudents: [], presentStudents: 0,
      };
      const gem = gemsMap[tid] || { totalGems: 0, monthlyGems: 0, tier: "starter" };

      const completionRate =
        ses.totalSessions > 0
          ? Math.round((ses.completedSessions / ses.totalSessions) * 100)
          : 0;
      const studentCount = Array.isArray(ses.uniqueStudents) ? ses.uniqueStudents.length : 0;
      const rating = Number(teacher.rating) || 0;

      // Score: 60% completion + 25% students(capped) + 15% rating
      let score =
        completionRate * 0.60 +
        Math.min(studentCount * 3, 25) +
        rating * 3;
      if (completionRate >= 90) score += 5;
      score = Math.min(Math.round(score), 100);

      const tierInfo = getTierInfo(gem.totalGems);

      return {
        _id: tid,
        fullName: teacher.fullName,
        avatar: teacher.avatar || null,
        gender: teacher.gender,
        teacherId: teacher.teacherId,
        designation: teacher.designation,
        status: teacher.status,
        rating,
        totalSessions: ses.totalSessions,
        completedSessions: ses.completedSessions,
        completionRate,
        studentCount,
        presentStudents: ses.presentStudents,
        score,
        totalGems:   gem.totalGems   || 0,
        monthlyGems: gem.monthlyGems || 0,
        tierName:    tierInfo.name,
        tierEmoji:   tierInfo.emoji,
        tierLabel:   tierInfo.label,
        isMe: tid === myTeacherId,
      };
    });

    // Sort by score desc
    fullLeaderboard.sort((a, b) => b.score - a.score || b.completionRate - a.completionRate);
    fullLeaderboard.forEach((t, i) => { t.rank = i + 1; });

    const myEntry = fullLeaderboard.find((t) => t.isMe) || null;
    const myRank  = myEntry ? myEntry.rank : null;
    const top10   = fullLeaderboard.slice(0, 10);

    return NextResponse.json({
      success: true,
      teacherLeaderboard: top10,
      myRank,
      myEntry,
      totalTeachers: fullLeaderboard.length,
    });
  } catch (error) {
    console.error("Teacher leaderboard error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
