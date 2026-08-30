import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";
import { TeacherModel } from "@/model/teacher-model";
import { UserModel } from "@/model/user-model";
import { CourseModel } from "@/model/course-model";
import { EnrollmentModel } from "@/model/enrollment-model";
import { StudentModel } from "@/model/student-model";
import { AssessmentModel } from "@/model/assessment-model";
import { SubmissionModel } from "@/model/submission-model";
import { SupportTicketModel } from "@/model/support-ticket-model";
import { ScheduleModel } from "@/model/schedule-model";
import { AttendanceModel } from "@/model/attendance-model";
import { ClassroomModel } from "@/model/classroom-model";
import { DailyReportModel } from "@/model/dailyReport-model";
import { TeacherSalaryModel } from "@/model/teacherSalary-model";
import { TeacherAttendanceModel } from "@/model/teacherAttendance-model";
import { AnnouncementModel } from "@/model/announcement-model";

// Helper to get Models safely
const getModels = async () => {
  await dbConnect();
  return {
    Teacher: TeacherModel,
    Course: CourseModel,
    Enrollment: EnrollmentModel,
    Student: StudentModel,
    Assessment: AssessmentModel,
    Submission: SubmissionModel,
    SupportTicket: SupportTicketModel,
    Schedule: ScheduleModel,
    Attendance: AttendanceModel,
    Classroom: ClassroomModel,
    DailyReport: DailyReportModel,
    TeacherSalary: TeacherSalaryModel,
    TeacherAttendance: TeacherAttendanceModel,
    Announcement: AnnouncementModel,
  };
};

/**
 * Shared helper: resolve the real Teacher._id from a session userId.
 * The session userId can be either:
 *   (a) the Teacher document _id directly, or
 *   (b) a User document _id → find teacher by matching email.
 *
 * Returns the string representation of Teacher._id, or null if not found.
 *
 * ✅ OPTIMIZED: In-memory TTL cache (5 min) to skip repeated DB lookups
 * across warm serverless container reuses on Vercel.
 */
const _resolveCache = new Map(); // userId → { id, exp }
const RESOLVE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function resolveTeacherId(userId) {
  if (!userId) return null;

  // Check cache first
  const cached = _resolveCache.get(userId);
  if (cached && cached.exp > Date.now()) return cached.id;

  await dbConnect();
  try {
    let teacherId = null;

    // Case A: userId IS the teacher _id
    const directMatch = await TeacherModel.findById(userId).select("_id").lean();
    if (directMatch) {
      teacherId = directMatch._id.toString();
    } else {
      // Case B: userId is a User record — match teacher by email
      const user = await UserModel.findById(userId).select("email").lean();
      if (user?.email) {
        const emailMatch = await TeacherModel.findOne({ email: user.email }).select("_id").lean();
        if (emailMatch) teacherId = emailMatch._id.toString();
      }
    }

    // Cache the result (even null — avoids repeated misses)
    _resolveCache.set(userId, { id: teacherId, exp: Date.now() + RESOLVE_TTL_MS });
    return teacherId;
  } catch {
    // Invalid ObjectId or DB error — fall through to return null
    return null;
  }
}


export async function getTeacherDashboardStats(teacherId, monthFilter = "current") {
  try {
    await dbConnect();
    const { ClassSessionModel } = await import("@/model/class-model");

    // Build date ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthOffset = monthFilter === "previous" ? -1 : 0;
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);

    // Current day name for schedule (only relevant for current month today's stats, but we keep it for structure)
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = days[now.getDay()];

    // Count elapsed working days (Mon–Fri) from start of month
    let elapsedWorkingDays = 0;
    const cursor = new Date(startOfMonth);
    
    // For previous month, all working days are elapsed. For current month, up to today.
    const stopDate = monthFilter === "previous" ? endOfMonth : todayStart;
    
    while (cursor < stopDate) {
      const d = cursor.getDay();
      if (d !== 0 && d !== 6) elapsedWorkingDays++;
      cursor.setDate(cursor.getDate() + 1);
    }
    
    // If we're including today for the current month, add it
    if (monthFilter === "current") {
      const d = todayStart.getDay();
      if (d !== 0 && d !== 6) elapsedWorkingDays++;
    }

    // Convert to ObjectId so both find() and aggregate() work correctly
    const tid = new mongoose.Types.ObjectId(teacherId);

    // ── Queries ─────────────────────────────────────────────────────────────
    const { ScheduleModel } = await import("@/model/schedule-model");

    const [facetResult, teacherPresent, totalStudents, activeSchedules] = await Promise.all([
      ClassSessionModel.aggregate([
        { $match: { teacher: tid, createdAt: { $gte: startOfMonth, $lt: endOfMonth } } },
        {
          $facet: {
            total:       [{ $count: "n" }],
            byStatus:    [{ $group: { _id: "$status",            n: { $sum: 1 } } }],
            byAttendance:[{ $group: { _id: "$studentAttendance", n: { $sum: 1 } } }],
            todayByStatus: [
              { $match: { dayOfWeek: todayName } },
              { $group: { _id: "$status", n: { $sum: 1 } } },
            ],
          },
        },
      ]),
      TeacherAttendanceModel.countDocuments({
        teacher: tid,
        date: { $gte: startOfMonth, $lt: endOfMonth },
      }),
      StudentModel.countDocuments({ teacherId: tid, status: "active" }), // Active students assigned to this teacher
      ScheduleModel.find({ teacher: tid, isActive: true }).lean(),
    ]);

    // Calculate occurrences of each weekday in the month
    const dayCounts = { sunday: 0, monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0 };
    const allDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    let cursorDay = new Date(startOfMonth);
    while (cursorDay < endOfMonth) {
      dayCounts[allDays[cursorDay.getDay()]]++;
      cursorDay.setDate(cursorDay.getDate() + 1);
    }

    let scheduleMonthlyTotal = 0;
    for (const sch of activeSchedules) {
      if (sch.weekly_days_list && Array.isArray(sch.weekly_days_list)) {
        for (const d of sch.weekly_days_list) {
          const dayName = d.toLowerCase();
          if (dayCounts[dayName]) {
            scheduleMonthlyTotal += dayCounts[dayName];
          }
        }
      }
    }

    // ── Parse facet result ────────────────────────────────────────────────────
    const facet = facetResult[0] ?? {};

    const totalClasses     = facet.total?.[0]?.n ?? 0;

    const toMap = (arr) =>
      Object.fromEntries((arr ?? []).map((x) => [x._id, x.n]));

    const statusMap    = toMap(facet.byStatus);
    const attendMap    = toMap(facet.byAttendance);
    const todayMap     = toMap(facet.todayByStatus);

    const absentCount  = Math.max(0, elapsedWorkingDays - teacherPresent);

    return {
      success: true,
      stats: {
        totalClassCount:         totalClasses,
        scheduleMonthlyTotal,
        totalStudents,
        statusScheduled:         statusMap["scheduled"]   ?? 0,
        statusInProgress:        statusMap["in-progress"] ?? 0,
        statusCompleted:         statusMap["completed"]   ?? 0,
        statusCancelled:         statusMap["cancelled"]   ?? 0,
        studentPresent:          attendMap["present"]     ?? 0,
        studentAbsent:           attendMap["absent"]      ?? 0,
        currentMonthPresent:     teacherPresent,
        currentMonthAbsent:      absentCount,
        todayTotalClassSchedule: (todayMap["scheduled"] ?? 0) + (todayMap["in-progress"] ?? 0) + (todayMap["completed"] ?? 0),
        todayInProgress:         todayMap["in-progress"] ?? 0,
        todayClassDone:          todayMap["completed"]   ?? 0,
      },
    };
  } catch (error) {
    console.error("Teacher Stats Error:", error);
    return { success: false, message: error.message };
  }
}

export async function getTeacherCourses(teacherId) {
  try {
    const { Course } = await getModels();
    const courses = await Course.find({ instructor: teacherId }).sort({ createdAt: -1 }).lean();
    return { success: true, courses };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getTeacherStudents(teacherId) {
  try {
    const { Course, Enrollment, Student } = await getModels();
    
    // 1. Get students via Course Enrollments
    const courses = await Course.find({ instructor: teacherId }).select('_id title').lean();
    const courseIds = courses.map(c => c._id);
    
    const enrollments = await Enrollment.find({ course: { $in: courseIds } })
      .populate('student', 'fullName email phone studentNumber studentId avatar gender status monthlyFee course')
      .populate('course', 'title')
      .lean();
      
    const studentMap = new Map();
    
    enrollments.forEach(e => {
      if (!e.student) return;
      const sid = e.student._id.toString();
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          _id: e.student._id,
          studentId: e.student.studentId,
          fullName: e.student.fullName,
          email: e.student.email,
          phone: e.student.phone,
          studentNumber: e.student.studentNumber,
          avatar: e.student.avatar,
          gender: e.student.gender,
          studentStatus: e.student.status,
          monthlyFee: e.student.monthlyFee || 0,
          courses: []
        });
      }
      studentMap.get(sid).courses.push({
        title: e.course?.title || "Unknown Course",
        progress: e.progress,
        status: e.status
      });
    });

    // 2. Get students directly assigned via teacherId (now an ObjectId ref to Teacher)
    const { StudentModel } = await import("@/model/student-model");
    const directlyAssigned = await StudentModel.find({ teacherId: teacherId })
      .select("fullName email phone studentNumber studentId avatar gender status course monthlyFee classStartingDate")
      .populate("course", "title level")
      .lean();

    directlyAssigned.forEach(s => {
      const sid = s._id.toString();
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          _id:              s._id,
          studentId:        s.studentId,
          fullName:         s.fullName,
          email:            s.email,
          phone:            s.phone,
          studentNumber:    s.studentNumber,
          avatar:           s.avatar,
          gender:           s.gender,
          status:           s.status,
          studentStatus:    s.status,
          monthlyFee:       s.monthlyFee || 0,
          classStartingDate: s.classStartingDate,
          course:           s.course || null,   // populated: { _id, title, level }
          courses:          s.course ? [{ title: s.course.title || s.course, progress: 0, status: s.status }] : [],
        });
      }
    });

    // 3. Get active schedules for this teacher to attach to students
    const { ScheduleModel } = await import("@/model/schedule-model");
    const schedules = await ScheduleModel.find({ teacher: teacherId, isActive: true }).lean();
    const scheduleMap = new Map();
    schedules.forEach(sch => {
      if (sch.student) {
        scheduleMap.set(sch.student.toString(), sch);
      }
    });

    // 4. Aggregate monthly class sessions stats for this month
    const { ClassSessionModel } = await import("@/model/class-model");
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const sessionStats = await ClassSessionModel.aggregate([
      {
        $match: {
          teacher: new mongoose.Types.ObjectId(teacherId),
          createdAt: { $gte: startOfMonth, $lt: endOfMonth }
        }
      },
      {
        $group: {
          _id: { student: "$student", status: "$status" },
          count: { $sum: 1 }
        }
      }
    ]);

    const statsMap = new Map();
    sessionStats.forEach(item => {
      if (!item._id.student) return;
      const sid = item._id.student.toString();
      const status = item._id.status;
      const count = item.count;

      if (!statsMap.has(sid)) {
        statsMap.set(sid, { total: 0, done: 0, remaining: 0 });
      }
      const s = statsMap.get(sid);
      s.total += count;
      if (status === "completed") {
        s.done += count;
      } else if (["scheduled", "in-progress", "paused"].includes(status)) {
        s.remaining += count;
      }
    });

    const students = Array.from(studentMap.values()).map(s => {
      const studentIdStr = s._id.toString();
      return {
        ...s,
        schedule: scheduleMap.get(studentIdStr) || null,
        classStats: statsMap.get(studentIdStr) || { total: 0, done: 0, remaining: 0 }
      };
    });
    
    return { success: true, students };
  } catch (error) {
    console.error("Error in getTeacherStudents:", error);
    return { success: false, message: error.message };
  }
}

export async function getTeacherAssessments(teacherId) {
  try {
    const { Course, Assessment } = await getModels();
    const courses = await Course.find({ instructor: teacherId }).select('_id').lean();
    const courseIds = courses.map(c => c._id);
    
    const assessments = await Assessment.find({ course: { $in: courseIds } })
      .populate('course', 'title')
      .sort({ dueDate: 1 })
      .lean();
      
    return { success: true, assessments };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getTeacherSubmissionsToGrade(teacherId) {
  try {
    const { Course, Assessment, Submission } = await getModels();
    const courses = await Course.find({ instructor: teacherId }).select('_id').lean();
    const courseIds = courses.map(c => c._id);
    
    // Find assessments belonging to these courses
    const assessments = await Assessment.find({ course: { $in: courseIds } }).select('_id').lean();
    const assessmentIds = assessments.map(a => a._id);
    
    const submissions = await Submission.find({ assessment: { $in: assessmentIds } })
      .populate({
        path: 'assessment',
        populate: { path: 'course', select: 'title' }
      })
      .populate('student', 'fullName')
      .sort({ submittedAt: -1 })
      .lean();
      
    return { success: true, submissions };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function gradeSubmission(submissionId, marks, feedback, teacherId) {
  try {
    const { Submission } = await getModels();
    const submission = await Submission.findByIdAndUpdate(
      submissionId,
      { 
        marks, 
        feedback, 
        status: "graded", 
        gradedBy: teacherId, 
        gradedAt: new Date() 
      },
      { new: true }
    );
    return { success: true, submission };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function updateTeacherProfile(teacherId, data) {
  try {
    const { Teacher } = await getModels();
    const updated = await Teacher.findByIdAndUpdate(
      teacherId,
      { $set: data },
      { new: true }
    ).select('-password');
    return { success: true, teacher: updated };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getTeacherSalaries(teacherId) {
  try {
    const { TeacherSalary } = await getModels();
    const salaries = await TeacherSalary.find({ teacher: teacherId })
      .sort({ month: -1 })
      .lean();
    return { success: true, salaries };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function generateTeacherSalary(teacherId, month) {
  try {
    const { Teacher, TeacherSalary } = await getModels();
    
    // 1. Check if salary already generated
    const existing = await TeacherSalary.findOne({ teacher: teacherId, month });
    if (existing) {
      return { success: false, message: `Salary for ${month} has already been generated.` };
    }

    // 2. Get Teacher details
    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) throw new Error("Teacher not found");
    
    const salaryType = teacher.salaryType || "monthly";
    const baseValue = teacher.salary || 0;

    let calculatedAmount = 0;
    let totalStudents = 0;
    let totalStudentFees = 0;

    // 3. Calculate based on type
    if (salaryType === "monthly") {
      calculatedAmount = baseValue;
    } else if (salaryType === "per-student-percentage") {
      // Fetch students using our existing function to avoid rewriting the complex aggregation logic
      const result = await getTeacherStudents(teacherId);
      if (!result.success) throw new Error(result.message);
      
      const assignedStudents = result.students || [];
      totalStudents = assignedStudents.length;
      
      // Sum all monthly fees from assigned students
      totalStudentFees = assignedStudents.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
      
      // Apply percentage
      calculatedAmount = totalStudentFees * (baseValue / 100);
    }

    // 4. Save Record
    const salaryRecord = new TeacherSalary({
      teacher: teacherId,
      month,
      salaryType,
      baseValue,
      totalStudents,
      totalStudentFees,
      calculatedAmount,
      status: "pending"
    });

    await salaryRecord.save();
    return { success: true, salary: salaryRecord };
  } catch (error) {
    console.error("Salary Generation Error:", error);
    return { success: false, message: error.message || "Failed to generate salary" };
  }
}

/**
 * Fetches all students linked to a schedule slot and their existing attendance
 * records for the given date.
 *
 * Students are sourced from:
 *  1. The direct schedule.student field (one-to-one schedules)
 *  2. All enrollments for the schedule's course (batch / group schedules)
 *  3. All students with teacherId matching the teacher (legacy assignment)
 *
 * @param {string} teacherId  - MongoDB ObjectId string for the teacher
 * @param {string} scheduleId - MongoDB ObjectId string for the schedule
 * @param {string} date       - ISO date string e.g. "2026-07-10"
 */
export async function getScheduleStudentsWithAttendance(teacherId, scheduleId, date) {
  try {
    const { Schedule, Enrollment, Student, Attendance } = await getModels();

    // 1. Verify schedule belongs to this teacher
    const schedule = await Schedule.findOne({ _id: scheduleId, teacher: teacherId })
      .populate("course", "title")
      .lean();
    if (!schedule) return { success: false, message: "Schedule not found or not yours" };

    const courseId = schedule.course?._id || schedule.course;

    // 2. Collect student IDs from all three sources (union)
    const studentIdSet = new Set();

    // Source A: direct schedule.student (one-to-one)
    if (schedule.student) studentIdSet.add(schedule.student.toString());

    // Source B: all enrollments for this course (group/batch)
    if (courseId) {
      const enrollments = await Enrollment.find({ course: courseId })
        .select("student")
        .lean();
      enrollments.forEach((e) => e.student && studentIdSet.add(e.student.toString()));
    }

    // Source C: students directly assigned to this teacher via teacherId string
    const directStudents = await Student.find({ teacherId: teacherId.toString() })
      .select("_id")
      .lean();
    directStudents.forEach((s) => studentIdSet.add(s._id.toString()));

    if (studentIdSet.size === 0) {
      return { success: true, schedule, students: [], attendanceMap: {}, firstSavedAt: null };
    }

    // 3. Fetch full student details for all collected IDs
    const studentObjectIds = [...studentIdSet].map((id) => new mongoose.Types.ObjectId(id));
    const students = await Student.find({ _id: { $in: studentObjectIds } })
      .select("fullName studentId studentNumber email phone avatar gender status")
      .sort({ fullName: 1 })
      .lean();

    // 4. Fetch existing attendance for this course on the selected date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      course: courseId,
      student: { $in: studentObjectIds },
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    // 5. Build quick lookup: studentId → attendance record
    //    Also track firstSavedAt (earliest createdAt) for the 1-hour edit-lock feature
    const attendanceMap = {};
    let firstSavedAt = null;
    attendanceRecords.forEach((rec) => {
      attendanceMap[rec.student.toString()] = {
        status: rec.status,
        notes: rec.notes || "",
        _id: rec._id.toString(),
        createdAt: rec.createdAt,
      };
      if (!firstSavedAt || new Date(rec.createdAt) < new Date(firstSavedAt)) {
        firstSavedAt = rec.createdAt;
      }
    });

    return { success: true, schedule, students, attendanceMap, firstSavedAt };
  } catch (error) {
    console.error("getScheduleStudentsWithAttendance error:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Bulk-upsert attendance records for a schedule session.
 * Uses MongoDB upsert so re-saving the same date is idempotent.
 *
 * @param {string} teacherId      - MongoDB ObjectId string for the teacher (markedBy)
 * @param {string} scheduleId     - MongoDB ObjectId string for the schedule
 * @param {string} date           - ISO date string e.g. "2026-07-10"
 * @param {Array}  attendanceList - [{ studentId, status, notes? }]
 */
export async function markScheduleAttendance(teacherId, scheduleId, date, attendanceList) {
  try {
    const { Schedule, Attendance } = await getModels();

    // Verify ownership
    const schedule = await Schedule.findOne({ _id: scheduleId, teacher: teacherId })
      .select("course")
      .lean();
    if (!schedule) return { success: false, message: "Schedule not found or not yours" };

    const courseId = schedule.course;
    const sessionDate = new Date(date);
    sessionDate.setHours(12, 0, 0, 0); // normalise to noon to avoid timezone edge cases

    // Build bulk upsert operations
    const bulkOps = attendanceList.map(({ studentId, status, notes }) => ({
      updateOne: {
        filter: {
          student: new mongoose.Types.ObjectId(studentId),
          course: courseId,
          date: {
            $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
            $lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
          },
        },
        update: {
          $set: {
            student: new mongoose.Types.ObjectId(studentId),
            course: courseId,
            date: sessionDate,
            status,
            notes: notes || "",
            markedBy: new mongoose.Types.ObjectId(teacherId),
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length === 0) return { success: true, message: "Nothing to save" };

    await Attendance.bulkWrite(bulkOps);
    return { success: true, message: `Saved attendance for ${bulkOps.length} student(s)` };
  } catch (error) {
    console.error("markScheduleAttendance error:", error);
    return { success: false, message: error.message };
  }
}

/** Get active announcements/notices targeted for teachers */
export async function getTeacherAnnouncements() {
  try {
    const { Announcement } = await getModels();
    
    let announcements = await Announcement.find({
      isActive: true,
      targetRole: { $in: ["all", "teacher"] }
    }).sort({ createdAt: -1 }).lean();

    // If database has no announcements, seed default ones
    if (announcements.length === 0) {
      const defaults = [
        {
          title: "Custom Class Duration",
          content: "Instructors can now fully customize scheduled class durations from 15 minutes up to 180 minutes directly when creating a class session.",
          tag: "Feature Update",
          tagColor: "bg-blue-50 text-blue-700 border-blue-100",
          targetRole: "teacher",
          isActive: true
        },
        {
          title: "Unlimited Salary Account Updates",
          content: "The monthly limit of 3 updates on salary payment information has been removed. You can now update bank or mobile wallet details as needed.",
          tag: "System Update",
          tagColor: "bg-purple-50 text-purple-700 border-purple-100",
          targetRole: "teacher",
          isActive: true
        },
        {
          title: "Daily Attendance & Marking Rules",
          content: "Please remember to check in/out daily to track your working shift. Also ensure that student attendance is marked (Present/Absent) upon ending every session.",
          tag: "Reminder",
          tagColor: "bg-amber-50 text-amber-700 border-amber-100",
          targetRole: "teacher",
          isActive: true
        }
      ];
      await Announcement.insertMany(defaults);
      announcements = await Announcement.find({
        isActive: true,
        targetRole: { $in: ["all", "teacher"] }
      }).sort({ createdAt: -1 }).lean();
    }

    return { success: true, announcements };
  } catch (error) {
    console.error("getTeacherAnnouncements error:", error);
    return { success: false, message: error.message };
  }
}

/** Get the single active global Notice for teachers */
export async function getTeacherActiveNotice() {
  try {
    const { NoticeModel } = await import("@/model/notice-model");
    await dbConnect();
    
    // Check for an active notice targeted at teachers or all
    const notice = await NoticeModel.findOne({
      isActive: true,
      targetRole: { $in: ["all", "teacher"] },
      $or: [{ archiveDate: { $exists: false } }, { archiveDate: { $gt: new Date() } }]
    }).sort({ createdAt: -1 }).lean();

    return { success: true, notice: notice || null };
  } catch (error) {
    console.error("getTeacherActiveNotice error:", error);
    return { success: false, message: error.message };
  }
}

/** Get all notices for teachers with pagination */
export async function getTeacherAllNotices(page = 1, limit = 10) {
  try {
    const { NoticeModel } = await import("@/model/notice-model");
    await dbConnect();
    
    const query = {
      targetRole: { $in: ["all", "teacher"] }
    };

    const total = await NoticeModel.countDocuments(query);
    const notices = await NoticeModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { 
      success: true, 
      notices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("getTeacherAllNotices error:", error);
    return { success: false, message: error.message };
  }
}
