import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { TeacherGemsModel } from "@/model/teacher-gems-model";
import { getTierInfo, manualGemsAdjustment } from "@/service/gems-service";

export async function GET(req) {
  try {
    await dbConnect();

    // 1. Fetch all active teachers
    const teachers = await TeacherModel.find({ status: "active" })
      .select("_id fullName teacherId")
      .lean();

    const teacherIds = teachers.map((t) => t._id);

    // 2. Fetch gems for these teachers
    const gemsDocs = await TeacherGemsModel.find({ teacher: { $in: teacherIds } }).lean();
    const gemsMap = {};
    gemsDocs.forEach((g) => {
      gemsMap[g.teacher.toString()] = g;
    });

    // 3. Map together
    const result = teachers.map((t) => {
      const g = gemsMap[t._id.toString()];
      return {
        _id: t._id,
        teacherId: t.teacherId,
        fullName: t.fullName,
        totalGems: g?.totalGems || 0,
        monthlyGems: g?.monthlyGems || 0,
        streak: g?.streak || 0,
        tier: getTierInfo(g?.totalGems || 0),
      };
    });

    return NextResponse.json({ success: true, teachers: result });
  } catch (error) {
    console.error("Admin teacher-gems GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { teacherId, amount, note } = await req.json();

    if (!teacherId || typeof amount !== "number") {
      return NextResponse.json(
        { success: false, message: "Missing teacherId or amount" },
        { status: 400 }
      );
    }

    const result = await manualGemsAdjustment(teacherId, amount, note);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin teacher-gems POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
