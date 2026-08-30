import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { resolveTeacherId } from "@/queries/teacher-portal-queries";
import { dbConnect } from "@/service/mongo";
import { escapeRegex } from "@/lib/utils";
import mongoose from "mongoose";

/**
 * GET /api/teacher-portal/class-monthly
 *
 * Query params:
 *   month      – YYYY-MM  (defaults to current month)
 *   date       – YYYY-MM-DD (optional specific day filter)
 *   page       – number (default 1)
 *   limit      – number (default 15)
 *   status     – "scheduled" | "in-progress" | "completed" | "cancelled" | "" (all)
 *   attendance – "present" | "absent" | "not-marked" | "" (all)
 *   search     – student name / studentId search
 */
export async function GET(request) {
  const h        = await headers();
  const userId   = h.get("x-user-id");
  const userRole = h.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  await dbConnect();

  try {
    const { ClassSessionModel } = await import("@/model/class-model");

    const { searchParams } = new URL(request.url);
    const monthParam  = searchParams.get("month")      || new Date().toISOString().slice(0, 7);
    const dateParam   = searchParams.get("date")       || "";
    const page        = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit       = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "15", 10)));
    const statusParam = searchParams.get("status")     || "";
    const attParam    = searchParams.get("attendance") || "";
    const search      = searchParams.get("search")     || "";

    // ── Build Date Query ──────────────────────────────────────────────────────
    let dateMatch = {};

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      // Specific single day filter
      const [dy, dm, dd] = dateParam.split("-").map(Number);
      const start = new Date(Date.UTC(dy, dm - 1, dd, 0, 0, 0, 0));
      const end   = new Date(Date.UTC(dy, dm - 1, dd, 23, 59, 59, 999));
      // Buffer by +/- 14h for timezone differences
      const startBuffer = new Date(start.getTime() - 14 * 3600 * 1000);
      const endBuffer   = new Date(end.getTime() + 14 * 3600 * 1000);

      dateMatch = {
        $or: [
          { startedAt: { $gte: startBuffer, $lte: endBuffer } },
          { createdAt: { $gte: startBuffer, $lte: endBuffer } },
        ],
      };
    } else {
      // Month range filter
      const [yr, mo] = monthParam.split("-").map(Number);
      const startDate = new Date(Date.UTC(yr, mo - 1, 1, 0, 0, 0, 0));
      const endDate   = new Date(Date.UTC(yr, mo,     1, 0, 0, 0, 0));
      const startBuffer = new Date(startDate.getTime() - 14 * 3600 * 1000);
      const endBuffer   = new Date(endDate.getTime() + 14 * 3600 * 1000);

      dateMatch = {
        $or: [
          { startedAt: { $gte: startBuffer, $lt: endBuffer } },
          { createdAt: { $gte: startBuffer, $lt: endBuffer } },
        ],
      };
    }

    const teacherObjId = new mongoose.Types.ObjectId(teacherId);

    // ── Build Pipeline ────────────────────────────────────────────────────────
    const pipeline = [
      {
        $match: {
          teacher: teacherObjId,
          ...dateMatch,
          ...(statusParam && { status: statusParam }),
          ...(attParam    && { studentAttendance: attParam }),
        },
      },

      // Lookup student
      {
        $lookup: {
          from:         "students",
          localField:   "student",
          foreignField: "_id",
          as:           "_studentArr",
        },
      },
      { $addFields: { studentObj: { $first: "$_studentArr" } } },

      // Lookup course
      {
        $lookup: {
          from:         "courses",
          localField:   "course",
          foreignField: "_id",
          as:           "_courseArr",
        },
      },
      { $addFields: { courseObj: { $first: "$_courseArr" } } },

      // Name / ID Search
      ...(search && search.trim() ? [{
        $match: {
          $or: [
            { "studentObj.fullName": { $regex: escapeRegex(search.trim()), $options: "i" } },
            { "studentObj.studentId": { $regex: escapeRegex(search.trim()), $options: "i" } },
          ],
        },
      }] : []),

      // Sort newest first
      { $sort: { createdAt: -1, startTime: 1 } },

      // Facet for list + counts + daily breakdown
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id:               1,
                classId:           1,
                dayOfWeek:         1,
                startTime:         1,
                endTime:           1,
                duration:          1,
                actualDuration:    1,
                status:            1,
                studentAttendance: 1,
                startedAt:         1,
                endedAt:           1,
                createdAt:         1,
                notes:             1,
                student: {
                  _id:       "$studentObj._id",
                  fullName:  "$studentObj.fullName",
                  studentId: "$studentObj.studentId",
                  avatar:    "$studentObj.avatar",
                  phone:     "$studentObj.phone",
                },
                course: {
                  _id:   "$courseObj._id",
                  title: "$courseObj.title",
                  level: "$courseObj.level",
                },
              },
            },
          ],
          totalCount: [{ $count: "n" }],
          summary: [
            {
              $group: {
                _id:       null,
                total:     { $sum: 1 },
                present:   { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"]    }, 1, 0] } },
                absent:    { $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"]     }, 1, 0] } },
                notMarked: { $sum: { $cond: [{ $eq: ["$studentAttendance", "not-marked"] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ["$status", "completed"]  }, 1, 0] } },
                scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"]  }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"]  }, 1, 0] } },
                totalMins: { $sum: { $ifNull: ["$actualDuration", "$duration"] } },
              },
            },
          ],
          dailyStats: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: { $ifNull: ["$startedAt", "$createdAt"] },
                    timezone: "+06:00"
                  }
                },
                total:     { $sum: 1 },
                present:   { $sum: { $cond: [{ $eq: ["$studentAttendance", "present"] }, 1, 0] } },
                absent:    { $sum: { $cond: [{ $eq: ["$studentAttendance", "absent"]  }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
                totalMins: { $sum: { $ifNull: ["$actualDuration", "$duration"] } },
              }
            },
            { $sort: { _id: -1 } }
          ]
        },
      },
    ];

    const [result] = await ClassSessionModel.aggregate(pipeline);
    const sessions   = result?.data       || [];
    const totalCount = result?.totalCount?.[0]?.n || 0;
    const summary    = result?.summary?.[0] || {
      total: 0, present: 0, absent: 0, notMarked: 0,
      completed: 0, scheduled: 0, cancelled: 0, totalMins: 0,
    };
    const dailyStats = result?.dailyStats || [];

    return NextResponse.json({
      success: true,
      sessions,
      summary,
      dailyStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      month: monthParam,
      date: dateParam,
    });
  } catch (err) {
    console.error("GET /api/teacher-portal/class-monthly error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/teacher-portal/class-monthly
 * Update attendance, status, or notes for a session date-wise
 */
export async function PATCH(request) {
  const h        = await headers();
  const userId   = h.get("x-user-id");
  const userRole = h.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const teacherId = await resolveTeacherId(userId);
  if (!teacherId) {
    return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
  }

  await dbConnect();

  try {
    const { ClassSessionModel } = await import("@/model/class-model");
    const body = await request.json();
    const { sessionId, attendance, status, notes } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, message: "sessionId is required" }, { status: 400 });
    }

    const session = await ClassSessionModel.findOne({
      _id: sessionId,
      teacher: teacherId,
    });

    if (!session) {
      return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 });
    }

    if (attendance !== undefined) {
      session.studentAttendance = attendance;
    }
    if (status !== undefined) {
      session.status = status;
      if (status === "completed" && !session.endedAt) {
        session.endedAt = new Date();
      }
    }
    if (notes !== undefined) {
      session.notes = notes;
    }

    await session.save();

    return NextResponse.json({
      success: true,
      message: "Session updated successfully",
      session,
    });
  } catch (err) {
    console.error("PATCH /api/teacher-portal/class-monthly error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
