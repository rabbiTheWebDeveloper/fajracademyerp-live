import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { ScheduleModel } from "@/model/schedule-model";
import { ClassSessionModel } from "@/model/class-model";
import { StudentModel } from "@/model/student-model";
import { CourseModel } from "@/model/course-model";
import { TeacherCategoryModel } from "@/model/teacher-category-model";
import mongoose from "mongoose";
import { escapeRegex } from "@/lib/utils";

// Ensure Next.js never statically caches this route
export const dynamic = "force-dynamic";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Helper: parse HH:MM or 12h time string to minutes from midnight
function parseTimeToMins(timeStr) {
  if (!timeStr) return 0;
  const str = String(timeStr).trim().toUpperCase();
  const isPM = str.includes("PM");
  const isAM = str.includes("AM");
  const clean = str.replace(/(AM|PM)/g, "").trim();
  const parts = clean.split(":");
  let h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
}

// Helper: convert minutes from midnight to "HH:MM AM/PM"
function minsToDisplay(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
}

// Compute free gaps in [DAY_START_MIN, DAY_END_MIN] (default 08:00 AM to 10:00 PM -> 480 to 1320)
function computeFreeTimeGaps(busyIntervals, dayStart = 480, dayEnd = 1320) {
  if (!busyIntervals || busyIntervals.length === 0) {
    return [
      {
        startMins: dayStart,
        endMins: dayEnd,
        startTime: minsToDisplay(dayStart),
        endTime: minsToDisplay(dayEnd),
        durationMins: dayEnd - dayStart,
      },
    ];
  }

  // Sort by start time
  const sorted = [...busyIntervals].sort((a, b) => a.startMins - b.startMins);

  // Merge overlaps
  const merged = [];
  let curr = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.startMins <= curr.endMins) {
      curr.endMins = Math.max(curr.endMins, next.endMins);
    } else {
      merged.push(curr);
      curr = { ...next };
    }
  }
  merged.push(curr);

  const gaps = [];
  let lastEnd = dayStart;

  for (const interval of merged) {
    if (interval.startMins > lastEnd) {
      const duration = interval.startMins - lastEnd;
      if (duration >= 15) {
        gaps.push({
          startMins: lastEnd,
          endMins: interval.startMins,
          startTime: minsToDisplay(lastEnd),
          endTime: minsToDisplay(interval.startMins),
          durationMins: duration,
        });
      }
    }
    lastEnd = Math.max(lastEnd, interval.endMins);
  }

  if (lastEnd < dayEnd) {
    const duration = dayEnd - lastEnd;
    if (duration >= 15) {
      gaps.push({
        startMins: lastEnd,
        endMins: dayEnd,
        startTime: minsToDisplay(lastEnd),
        endTime: minsToDisplay(dayEnd),
        durationMins: duration,
      });
    }
  }

  return gaps;
}

/**
 * GET /api/admin/teachers/schedule
 * Fast DB-level pagination & lean execution
 */
export async function GET(request) {
  try {
    await dbConnect();

    // Ensure models are registered
    StudentModel.init();
    CourseModel.init();
    TeacherCategoryModel.init();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const dayFilter = (searchParams.get("day") || "all").toLowerCase();
    const sortFilter = searchParams.get("sort") || "highest_schedule";
    // Cap search length to avoid regex DoS
    const searchQuery = (searchParams.get("search") || "").trim().slice(0, 60);
    const categoryFilter = searchParams.get("category") || "all";
    const includeLookups = searchParams.get("includeLookups") === "true";

    // ── Build Teacher query filter ────────────────────────────────────────────
    const teacherQuery = { status: { $ne: "terminated" } };
    if (categoryFilter && categoryFilter !== "all") {
      try {
        teacherQuery.category = new mongoose.Types.ObjectId(categoryFilter);
      } catch (e) {
        teacherQuery.category = categoryFilter;
      }
    }
    if (searchQuery) {
      const escaped = escapeRegex(searchQuery);
      teacherQuery.$or = [
        { fullName: { $regex: escaped, $options: "i" } },
        { teacherId: { $regex: escaped, $options: "i" } },
        { designation: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
      ];
    }

    // ── Count total matching teachers & total students ────────────────────────
    const [totalTeachers, totalStudentsAll] = await Promise.all([
      TeacherModel.countDocuments(teacherQuery),
      StudentModel.countDocuments({}),
    ]);
    const totalPages = Math.ceil(totalTeachers / limit) || 1;
    const skip = (page - 1) * limit;

    const responseHeaders = {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    };

    if (totalTeachers === 0) {
      let emptyLookups = null;
      if (includeLookups) {
        const [allTeachers, allStudents, allCourses, allCategories] = await Promise.all([
          TeacherModel.find({ status: "active" }).select("fullName teacherId avatar designation").lean(),
          StudentModel.find({}).select("fullName studentId avatar email").lean(),
          CourseModel.find({ isActive: true }).select("title courseId level").lean(),
          TeacherCategoryModel.find({ status: "active" }).select("name slug").lean(),
        ]);
        emptyLookups = { teachers: allTeachers, students: allStudents, courses: allCourses, categories: allCategories };
      }
      return NextResponse.json({
        success: true,
        teachers: [],
        summary: { totalTeachers: 0, totalStudents: totalStudentsAll, totalClasses: 0, totalBusyHours: 0, avgClassesPerTeacher: 0, busyTeachersCount: 0, availableTeachersCount: 0 },
        pagination: { page, limit, totalTeachers: 0, totalPages: 0 },
        lookups: emptyLookups,
      }, { headers: responseHeaders });
    }

    // ── Fetch ONLY the paginated page of teachers ─────────────────────────────
    let teachersPage = [];

    if (sortFilter === "highest_schedule" || sortFilter === "lowest_schedule") {
      const sortDirection = sortFilter === "highest_schedule" ? -1 : 1;
      teachersPage = await TeacherModel.aggregate([
        { $match: teacherQuery },
        {
          $lookup: {
            from: "schedules",
            let: { tid: "$_id" },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ["$teacher", "$$tid"] }, { $eq: ["$isActive", true] }] } } },
              {
                $lookup: {
                  from: "students",
                  localField: "student",
                  foreignField: "_id",
                  as: "studentDoc"
                }
              },
              {
                $match: {
                  $expr: {
                    $eq: [{ $arrayElemAt: ["$studentDoc.teacherId", 0] }, "$$tid"]
                  }
                }
              }
            ],
            as: "schedulesList"
          }
        },
        {
          $lookup: {
            from: "teachercategories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDoc"
          }
        },
        {
          $addFields: {
            scheduleCount: { $size: "$schedulesList" },
            category: { $arrayElemAt: ["$categoryDoc", 0] }
          }
        },
        { $sort: { scheduleCount: sortDirection, fullName: 1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            teacherId: 1,
            fullName: 1,
            designation: 1,
            avatar: 1,
            status: 1,
            email: 1,
            phone: 1,
            gender: 1,
            category: { _id: "$category._id", name: "$category.name", slug: "$category.slug" }
          }
        }
      ]);
    } else {
      const nameSort = sortFilter === "name_desc" ? -1 : 1;
      teachersPage = await TeacherModel.find(teacherQuery)
        .populate("category", "name slug")
        .select("teacherId fullName designation avatar status email phone gender category")
        .sort({ fullName: nameSort })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const pageTeacherIds = teachersPage.map((t) => t._id);

    // ── Fetch Schedules & Direct Students ONLY for teachers on current page ───
    const [rawSchedules, rawSessions, directStudentsAgg] = await Promise.all([
      ScheduleModel.find({ teacher: { $in: pageTeacherIds }, isActive: true })
        .populate("teacher", "fullName teacherId avatar")
        .populate("student", "fullName studentId avatar email phone teacherId status")
        .populate("course", "title courseId level")
        .lean(),
      ClassSessionModel.find({ teacher: { $in: pageTeacherIds }, isActive: { $ne: false } })
        .populate("teacher", "fullName teacherId avatar")
        .populate("student", "fullName studentId avatar email phone teacherId status")
        .populate("course", "title courseId level")
        .lean(),
      StudentModel.aggregate([
        { $match: { teacherId: { $in: pageTeacherIds }, status: { $ne: "terminated" } } },
        { $group: { _id: "$teacherId", studentIds: { $push: "$_id" } } }
      ])
    ]);

    const directStudentsMap = {};
    for (const d of directStudentsAgg) {
      directStudentsMap[d._id.toString()] = d.studentIds.map((id) => id.toString());
    }

    // Map schedule items & calculate unique student IDs per teacher
    const teacherMap = {};
    for (const t of teachersPage) {
      const tidStr = t._id.toString();
      teacherMap[tidStr] = {
        _id: tidStr,
        teacherId: t.teacherId || "",
        fullName: t.fullName || "",
        designation: t.designation || "",
        avatar: t.avatar || "",
        status: t.status || "active",
        email: t.email || "",
        phone: t.phone || "",
        gender: t.gender || "",
        category: t.category || null,
        schedules: [],
        dayBreakdown: { sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [] },
        studentIdSet: new Set(directStudentsMap[tidStr] || []),
      };
    }

    // Process ScheduleModel items (Master active schedules)
    for (const s of rawSchedules) {
      const tid = s.teacher?._id?.toString() || s.teacher?.toString();
      if (!teacherMap[tid]) continue;

      // ✅ Only keep schedules belonging to students currently assigned to this teacher
      if (!s.student || !s.student._id) continue;
      const studentTeacherId = s.student.teacherId?._id?.toString() || s.student.teacherId?.toString();
      if (!studentTeacherId || studentTeacherId !== tid) continue;

      teacherMap[tid].studentIdSet.add(s.student._id.toString());

      const days = [];
      if (s.dayOfWeek) days.push(s.dayOfWeek.toLowerCase());
      if (Array.isArray(s.weekly_days_list)) {
        s.weekly_days_list.forEach((d) => {
          const l = d.toLowerCase();
          if (!days.includes(l)) days.push(l);
        });
      }

      const startM = parseTimeToMins(s.startTime || "09:00");
      let endM = parseTimeToMins(s.endTime || "10:00");
      if (endM <= startM) endM = startM + 45;

      const item = {
        _id: s._id.toString(),
        source: "schedule",
        dayOfWeek: days[0] || "monday",
        daysList: days.length > 0 ? days : ["monday"],
        startTime: s.startTime || "09:00",
        endTime: s.endTime || "10:00",
        startMins: startM,
        endMins: endM,
        type: s.type || "live",
        student: s.student || null,
        course: s.course || null,
        isActive: s.isActive,
      };

      teacherMap[tid].schedules.push(item);
      const targetDays = days.length > 0 ? days : ["monday"];
      targetDays.forEach((d) => {
        if (teacherMap[tid].dayBreakdown[d]) {
          teacherMap[tid].dayBreakdown[d].push(item);
        }
      });
    }

    // Process only standalone/unlinked ClassSessionModel items (avoid historical session duplication)
    for (const cs of rawSessions) {
      const tid = cs.teacher?._id?.toString() || cs.teacher?.toString();
      if (!teacherMap[tid]) continue;

      // ✅ Only keep sessions belonging to students currently assigned to this teacher
      if (!cs.student || !cs.student._id) continue;
      const studentTeacherId = cs.student.teacherId?._id?.toString() || cs.student.teacherId?.toString();
      if (!studentTeacherId || studentTeacherId !== tid) continue;

      teacherMap[tid].studentIdSet.add(cs.student._id.toString());

      const day = (cs.dayOfWeek || "monday").toLowerCase();
      const startM = parseTimeToMins(cs.startTime || "09:00");
      let endM = parseTimeToMins(cs.endTime || "09:45");
      if (endM <= startM) endM = startM + 45;

      // Only add if not already covered by an existing master schedule on that day
      const exists = teacherMap[tid].dayBreakdown[day]?.some(
        (existing) =>
          existing.startTime === cs.startTime &&
          (existing.student?._id?.toString() === cs.student?._id?.toString() || existing.endTime === cs.endTime)
      );

      if (!exists && cs.status !== "cancelled" && cs.status !== "completed") {
        const item = {
          _id: cs._id.toString(),
          source: "session",
          dayOfWeek: day,
          daysList: [day],
          startTime: cs.startTime || "09:00",
          endTime: cs.endTime || "09:45",
          startMins: startM,
          endMins: endM,
          type: "live",
          status: cs.status || "scheduled",
          student: cs.student || null,
          course: cs.course || null,
          isActive: cs.isActive !== false,
        };

        teacherMap[tid].schedules.push(item);
        if (teacherMap[tid].dayBreakdown[day]) {
          teacherMap[tid].dayBreakdown[day].push(item);
        }
      }
    }

    // Compute stats for each paginated teacher
    const currentDayKey = DAY_KEYS[new Date().getDay()] || "monday";
    const resultList = Object.values(teacherMap).map((t) => {
      let displayedSchedules = [];
      let busyIntervals = [];

      if (dayFilter === "all") {
        // Unique active weekly schedules
        displayedSchedules = t.schedules;
        // For daily timeline / free gaps when all is selected, use today's schedule
        const todayItems = t.dayBreakdown[currentDayKey] || [];
        todayItems.forEach((item) => {
          busyIntervals.push({ startMins: item.startMins, endMins: item.endMins });
        });
      } else {
        displayedSchedules = t.dayBreakdown[dayFilter] || [];
        displayedSchedules.forEach((item) => {
          busyIntervals.push({ startMins: item.startMins, endMins: item.endMins });
        });
      }

      // Calculate total weekly busy minutes across all distinct schedules
      const weeklyBusyMins = t.schedules.reduce((sum, item) => {
        const daysCount = item.daysList?.length || 1;
        const dur = Math.max(0, (item.endMins || 600) - (item.startMins || 540));
        return sum + dur * daysCount;
      }, 0);

      const freeGaps = computeFreeTimeGaps(busyIntervals, 480, 1320);
      const totalFreeMins = freeGaps.reduce((sum, g) => sum + g.durationMins, 0);

      let workloadLevel = "light";
      if (displayedSchedules.length >= 6 || weeklyBusyMins >= 1200) {
        workloadLevel = "heavy";
      } else if (displayedSchedules.length >= 3 || weeklyBusyMins >= 480) {
        workloadLevel = "moderate";
      }

      const totalStudentCount = t.studentIdSet.size;
      delete t.studentIdSet;

      return {
        ...t,
        displayedSchedules,
        dayBreakdown: t.dayBreakdown,
        totalScheduledClasses: t.schedules.length,
        totalStudentCount,
        totalBusyMins: weeklyBusyMins,
        totalBusyHours: Number((weeklyBusyMins / 60).toFixed(1)),
        totalFreeMins,
        totalFreeHours: Number((totalFreeMins / 60).toFixed(1)),
        freeGaps,
        workloadLevel,
      };
    });

    if (sortFilter === "free_time") {
      resultList.sort((a, b) => b.totalFreeMins - a.totalFreeMins);
    }

    // Global Summary Aggregation — run in parallel with lookups for speed
    const busyTeachersCount = resultList.filter((t) => t.workloadLevel === "heavy").length;
    const availableTeachersCount = resultList.filter((t) => t.workloadLevel === "light").length;

    const parallelQueries = [ScheduleModel.countDocuments({ isActive: true })];
    const lookupQueries = includeLookups
      ? [
        TeacherModel.find({ status: "active" }).select("fullName teacherId avatar designation").lean(),
        StudentModel.find({}).select("fullName studentId avatar email").lean(),
        CourseModel.find({ isActive: true }).select("title courseId level").lean(),
        TeacherCategoryModel.find({ status: "active" }).select("name slug").lean(),
      ]
      : [];

    const [totalSchedulesCount, ...lookupResults] = await Promise.all([
      ...parallelQueries,
      ...lookupQueries,
    ]);

    const avgClassesPerTeacher = totalTeachers > 0 ? (totalSchedulesCount / totalTeachers).toFixed(1) : 0;

    let lookups = null;
    if (includeLookups && lookupResults.length === 4) {
      lookups = {
        teachers: lookupResults[0],
        students: lookupResults[1],
        courses: lookupResults[2],
        categories: lookupResults[3],
      };
    }

    return NextResponse.json({
      success: true,
      teachers: resultList,
      pagination: {
        page,
        limit,
        totalTeachers,
        totalPages,
      },
      summary: {
        totalTeachers,
        totalStudents: totalStudentsAll,
        totalClasses: totalSchedulesCount,
        totalBusyHours: Number(((totalSchedulesCount * 45) / 60).toFixed(1)),
        avgClassesPerTeacher,
        busyTeachersCount,
        availableTeachersCount,
      },
      lookups,
    }, { headers: responseHeaders });
  } catch (error) {
    console.error("GET /api/admin/teachers/schedule error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/teachers/schedule
 * Body: { teacherId, studentId, courseId, dayOfWeek, weekly_days_list, startTime, endTime, type }
 */
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { teacherId, studentId, courseId, dayOfWeek, weekly_days_list, startTime, endTime, type } = body;

    if (!teacherId || !courseId) {
      return NextResponse.json(
        { success: false, message: "Teacher and Course are required" },
        { status: 400 }
      );
    }

    const selectedDay = (dayOfWeek || "monday").toLowerCase();
    const daysList = Array.isArray(weekly_days_list) && weekly_days_list.length > 0
      ? weekly_days_list
      : [selectedDay];

    const newSchedule = await ScheduleModel.create({
      teacher: teacherId,
      student: studentId || null,
      course: courseId,
      dayOfWeek: selectedDay,
      weekly_days: daysList.length,
      weekly_days_list: daysList,
      startTime: startTime || "09:00",
      endTime: endTime || "10:00",
      type: type || "live",
      isActive: true,
    });

    if (studentId) {
      try {
        await ClassSessionModel.create({
          teacher: teacherId,
          student: studentId,
          course: courseId,
          dayOfWeek: selectedDay,
          startTime: startTime || "09:00",
          endTime: endTime || "10:00",
          duration: Math.max(15, parseTimeToMins(endTime) - parseTimeToMins(startTime)) || 45,
          status: "scheduled",
          isActive: true,
        });
      } catch (err) {
        console.warn("Could not create synced ClassSession doc:", err.message);
      }
    }

    const populated = await ScheduleModel.findById(newSchedule._id)
      .populate("teacher", "fullName avatar teacherId")
      .populate("student", "fullName avatar studentId")
      .populate("course", "title courseId")
      .lean();

    return NextResponse.json({ success: true, schedule: populated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/teachers/schedule error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/teachers/schedule
 * Body: { scheduleId, dayOfWeek, weekly_days_list, startTime, endTime, type, isActive }
 */
export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { scheduleId, dayOfWeek, weekly_days_list, startTime, endTime, type, isActive } = body;

    if (!scheduleId) {
      return NextResponse.json({ success: false, message: "scheduleId is required" }, { status: 400 });
    }

    const updateFields = {};
    if (dayOfWeek) updateFields.dayOfWeek = dayOfWeek.toLowerCase();
    if (Array.isArray(weekly_days_list)) {
      updateFields.weekly_days_list = weekly_days_list;
      updateFields.weekly_days = weekly_days_list.length;
    }
    if (startTime !== undefined) updateFields.startTime = startTime;
    if (endTime !== undefined) updateFields.endTime = endTime;
    if (type !== undefined) updateFields.type = type;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const updated = await ScheduleModel.findByIdAndUpdate(scheduleId, updateFields, { returnDocument: "after" })
      .populate("teacher", "fullName avatar teacherId")
      .populate("student", "fullName avatar studentId")
      .populate("course", "title courseId")
      .lean();

    if (!updated) {
      const updatedSession = await ClassSessionModel.findByIdAndUpdate(scheduleId, updateFields, { returnDocument: "after" })
        .populate("teacher", "fullName avatar teacherId")
        .populate("student", "fullName avatar studentId")
        .populate("course", "title courseId")
        .lean();

      if (!updatedSession) {
        return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, schedule: updatedSession }, { status: 200 });
    }

    return NextResponse.json({ success: true, schedule: updated }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/admin/teachers/schedule error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/teachers/schedule
 * Query Param: id
 */
export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
    }

    let deleted = await ScheduleModel.findByIdAndDelete(id);
    if (!deleted) {
      deleted = await ClassSessionModel.findByIdAndDelete(id);
    }

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Schedule record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Schedule deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/admin/teachers/schedule error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
