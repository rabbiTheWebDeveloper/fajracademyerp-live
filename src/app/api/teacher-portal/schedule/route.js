import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { ScheduleModel } from "@/model/schedule-model";
import { headers } from "next/headers";
// ✅ OPTIMIZED: use the centralized, cached resolveTeacherId instead of local copy
import { resolveTeacherId } from "@/queries/teacher-portal-queries";

export const maxDuration = 10; // prevent zombie functions consuming Vercel CPU budget

export async function GET() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    // ✅ OPTIMIZED: uses centralized TTL-cached resolver — removed inline TeacherModel/UserModel lookups
    const teacherId = await resolveTeacherId(userId);
    if (!teacherId) {
      return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
    }

    // ✅ Removed unnecessary StudentModel.init() / CourseModel.init() calls —
    //    Mongoose registers models automatically on import.

    // Fetch all active schedules for this teacher
    const rawSchedules = await ScheduleModel.find({ teacher: teacherId, isActive: true })
      .populate("course", "title")
      .populate("student", "fullName email teacherId")
      .lean();

    // ✅ Filter at application level: only return schedules still owned by this teacher.
    //    (Students who were unassigned have teacherId !== teacherId)
    const schedules = rawSchedules.filter((s) => {
      if (!s.student) return false; // Student was deleted
      if (
        !s.student.teacherId ||
        s.student.teacherId.toString() !== teacherId.toString()
      ) {
        return false; // Student was unassigned or assigned to someone else
      }
      return true;
    });

    return NextResponse.json({ success: true, schedules }, {
      status: 200,
      headers: {
        // ✅ Allow browser to cache this for 30s; stale data served for up to 60s more
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("GET /api/teacher-portal/schedule error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
