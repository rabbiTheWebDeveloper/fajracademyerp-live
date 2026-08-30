import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";

// Helper to get Models safely
const getModels = async () => {
  await dbConnect();
  
  if (!mongoose.models.Student) await import("@/model/student-model");
  if (!mongoose.models.Course) await import("@/model/course-model");
  if (!mongoose.models.Enrollment) await import("@/model/enrollment-model");
  if (!mongoose.models.Assessment) await import("@/model/assessment-model");
  if (!mongoose.models.Submission) await import("@/model/submission-model");
  if (!mongoose.models.SupportTicket) await import("@/model/support-ticket-model");
  if (!mongoose.models.Schedule) await import("@/model/schedule-model");
  if (!mongoose.models.Payment) await import("@/model/payment-model");
  if (!mongoose.models.ClassSession) await import("@/model/class-model");

  return {
    Student: mongoose.models.Student,
    Course: mongoose.models.Course,
    Enrollment: mongoose.models.Enrollment,
    Assessment: mongoose.models.Assessment,
    Submission: mongoose.models.Submission,
    SupportTicket: mongoose.models.SupportTicket,
    Schedule: mongoose.models.Schedule,
    Payment: mongoose.models.Payment,
    ClassSession: mongoose.models.ClassSession,
  };
};

export async function getStudentDashboardStats(studentId) {
  try {
    const { Enrollment, Submission, SupportTicket, Student, Payment, Schedule, Assessment } = await getModels();
    
    const classesData = await getStudentClasses(studentId);
    const enrolledCoursesCount = classesData.classes.length;
    
    // Calculate average progress
    const totalProgress = classesData.classes.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    const avgProgress = enrolledCoursesCount > 0 ? Math.round(totalProgress / enrolledCoursesCount) : 0;

    const courseIds = classesData.classes.map(e => e._id).filter(Boolean);

    // Get assignments the student hasn't submitted yet
    const activeAssessments = courseIds.length > 0 ? await Assessment.find({ 
      course: { $in: courseIds },
      status: { $in: ["active", "grading"] } 
    }).lean() : [];
    
    const submittedDocs = await Submission.find({ student: studentId }).lean();
    const submittedIds = submittedDocs.map(s => s.assessment?.toString()).filter(Boolean);
    const pendingAssignments = activeAssessments.filter(a => !submittedIds.includes(a._id?.toString())).length;

    const studentUser = await Student.findById(studentId).lean();
    const unreadMessages = studentUser?.email ? await SupportTicket.countDocuments({ 
      raisedByModel: "Student", 
      raisedByEmail: studentUser.email,
      status: "in-progress"
    }) : 0;

    // Check payment status for the current month
    const now = new Date();
    const currentMonthString = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const hasPaid = await Payment.exists({
      student: studentId,
      month: currentMonthString,
      status: "completed"
    });

    let notice = null;
    if (!hasPaid) {
      notice = {
        type: "warning",
        message: `Please pay your due for ${currentMonthString}.`
      };
    }

    const schedule = await Schedule.findOne({ student: studentId })
      .populate('course', 'title')
      .populate('teacher', 'fullName')
      .lean();

    return {
      success: true,
      stats: {
        enrolledCourses: enrolledCoursesCount,
        avgProgress,
        pendingAssignments,
        unreadMessages,
        notice,
        schedule
      }
    };
  } catch (error) {
    console.error("Student Stats Error:", error);
    return { success: false, message: error.message };
  }
}

export async function getStudentClasses(studentId) {
  try {
    const { Student, Course, Enrollment, ClassSession, Schedule } = await getModels();
    
    // 1. Fetch direct Enrollments
    const enrollments = await Enrollment.find({ student: studentId })
      .populate('course')
      .sort({ createdAt: -1 })
      .lean();
      
    // Format classes from enrollments
    const classes = (enrollments || [])
      .filter(e => e.course)
      .map(e => ({
        ...e.course,
        enrollmentId: e._id,
        progress: e.progress || 0,
        enrollmentStatus: e.status || "active"
      }));

    // 2. Also check Student profile course & Schedule courses
    const studentDoc = await Student.findById(studentId).lean();
    let assignedTeacher = null;
    if (studentDoc?.teacherId) {
      try {
        const { TeacherModel } = await import("@/model/teacher-model");
        assignedTeacher = await TeacherModel.findById(studentDoc.teacherId).select("fullName email avatar").lean();
      } catch {}
    }

    if (studentDoc?.course) {
      const courseVal = studentDoc.course;
      const alreadyInList = classes.some(c => c._id?.toString() === courseVal?.toString() || c.title?.toLowerCase() === String(courseVal).toLowerCase());
      if (!alreadyInList) {
        let courseDoc = null;
        try {
          if (mongoose.isValidObjectId(courseVal)) {
            courseDoc = await Course.findById(courseVal).lean();
          } else {
            courseDoc = await Course.findOne({ title: courseVal }).lean();
          }
        } catch {}

        if (courseDoc) {
          classes.push({
            ...courseDoc,
            instructor: assignedTeacher,
            progress: 0,
            enrollmentStatus: "active"
          });
        } else if (typeof courseVal === "string" && courseVal.trim()) {
          classes.push({
            _id: `course_profile_${studentDoc._id}`,
            title: courseVal,
            category: "Islamic Studies",
            level: "Standard",
            instructor: assignedTeacher || { fullName: "FAJR Instructor" },
            progress: 0,
            enrollmentStatus: "active",
            createdAt: studentDoc.createdAt || new Date(),
            updatedAt: studentDoc.updatedAt || new Date()
          });
        }
      }
    }

    // 3. Check Schedule for any additional courses & teacher info
    const schedules = await Schedule.find({ student: studentId, isActive: true })
      .populate('course')
      .populate('teacher', 'fullName email avatar')
      .lean();

    (schedules || []).forEach(s => {
      if (s.course) {
        const cTitle = typeof s.course === "object" ? s.course.title : s.course;
        const cId = typeof s.course === "object" && s.course._id ? s.course._id.toString() : "";
        const alreadyInList = classes.some(c => (cId && c._id?.toString() === cId) || (cTitle && c.title?.toLowerCase() === cTitle.toLowerCase()));
        if (!alreadyInList) {
          classes.push({
            ...(typeof s.course === "object" ? s.course : { _id: `sch_${s._id}`, title: s.course }),
            instructor: s.teacher || assignedTeacher,
            progress: 0,
            enrollmentStatus: "active"
          });
        }
      }
    });

    // 4. Fetch class history (completed sessions)
    const history = await ClassSession.find({ student: studentId, status: "completed" })
      .populate('course', 'title level category')
      .populate('teacher', 'fullName avatar')
      .sort({ endedAt: -1, createdAt: -1 })
      .lean();

    // 5. Fetch active/scheduled class sessions
    let activeSessions = await ClassSession.find({
      student: studentId,
      status: { $in: ["scheduled", "in-progress"] }
    })
      .populate('course', 'title level category')
      .populate('teacher', 'fullName avatar')
      .sort({ startTime: 1 })
      .lean();

    // If no explicit ClassSession records exist yet, generate upcoming scheduled cards from active Schedule
    if (activeSessions.length === 0 && schedules.length > 0) {
      activeSessions = schedules.flatMap(sch => {
        const list = sch.day_times && sch.day_times.length > 0
          ? sch.day_times
          : [{ day: sch.dayOfWeek || "monday", startTime: sch.startTime || "10:00", endTime: sch.endTime || "10:45" }];

        return list.map((dt, idx) => ({
          _id: `${sch._id}_${idx}`,
          course: sch.course || { title: "Enrolled Course" },
          teacher: sch.teacher || assignedTeacher || { fullName: "Certified Instructor" },
          dayOfWeek: dt.day,
          startTime: dt.startTime,
          endTime: dt.endTime,
          status: "scheduled",
          meetLink: sch.meetLink || null
        }));
      });
    }

    // 6. Ensure every course from activeSessions & history is also counted in Enrolled Classes if not already present
    [...activeSessions, ...history].forEach(sess => {
      if (sess.course) {
        const courseTitle = typeof sess.course === "object" ? sess.course.title : sess.course;
        const courseId = typeof sess.course === "object" && sess.course._id ? sess.course._id.toString() : "";
        
        const alreadyInList = classes.some(c => 
          (courseId && c._id?.toString() === courseId) || 
          (courseTitle && c.title?.toLowerCase() === courseTitle.toLowerCase())
        );

        if (!alreadyInList && courseTitle) {
          classes.push({
            _id: courseId || `session_course_${sess._id}`,
            title: courseTitle,
            category: (typeof sess.course === "object" && sess.course.category) || "Islamic Studies",
            level: (typeof sess.course === "object" && sess.course.level) || "All Levels",
            instructor: (typeof sess.course === "object" && sess.course.instructor) || sess.teacher || assignedTeacher,
            progress: 0,
            enrollmentStatus: "active",
            createdAt: sess.createdAt || new Date(),
            updatedAt: sess.updatedAt || new Date()
          });
        }
      }
    });

    // 7. Compute dynamic progress for each course based on completed class sessions & curriculum progression
    classes.forEach(c => {
      const cId = c._id ? c._id.toString() : "";
      const cTitle = c.title || "";

      // Count completed sessions for this specific course
      const completedForCourse = history.filter(h => {
        const hId = h.course?._id ? h.course._id.toString() : (h.course?.toString() || "");
        const hTitle = h.course?.title || (typeof h.course === "string" ? h.course : "");
        return (
          (cId && hId && cId === hId) ||
          (cTitle && hTitle && cTitle.toLowerCase() === hTitle.toLowerCase())
        );
      }).length;

      // If explicit enrollment progress > 0, use it; otherwise compute based on completed sessions
      if (typeof c.progress === "number" && c.progress > 0) {
        c.progress = Math.min(100, c.progress);
      } else if (completedForCourse > 0) {
        // Milestone formula: 12 sessions per term (1 session = ~8-10%, 2 sessions = ~17-20%, 12+ sessions = 100%)
        c.progress = Math.min(100, Math.round((completedForCourse / 10) * 100));
      } else {
        c.progress = 0;
      }
    });

    return { success: true, classes, history, activeSessions };
  } catch (error) {
    console.error("getStudentClasses error:", error);
    return { success: false, message: error.message, classes: [], history: [], activeSessions: [] };
  }
}

export async function getStudentSchedule(studentId) {
  try {
    const { Schedule } = await getModels();
    const schedule = await Schedule.findOne({ student: studentId })
      .populate('course', 'title')
      .populate('teacher', 'fullName email')
      .lean();
      
    return { success: true, schedule };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getStudentAssignments(studentId) {
  try {
    const { Enrollment, Assessment, Submission } = await getModels();
    const enrollments = await Enrollment.find({ student: studentId }).lean();
    const courseIds = enrollments.map(e => e.course);
    
    const assessments = await Assessment.find({ course: { $in: courseIds } })
      .populate('course', 'title')
      .sort({ dueDate: 1 })
      .lean();
      
    const submissions = await Submission.find({ student: studentId }).lean();
    
    // Map submissions onto assessments for the student's view
    const formatted = assessments.map(a => {
      const sub = submissions.find(s => s.assessment.toString() === a._id.toString());
      return {
        ...a,
        submission: sub || null,
        isSubmitted: !!sub,
      };
    });
      
    return { success: true, assignments: formatted };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getStudentGrades(studentId) {
  try {
    const { Submission } = await getModels();
    const submissions = await Submission.find({ student: studentId, status: "graded" })
      .populate({
        path: 'assessment',
        populate: { path: 'course', select: 'title' }
      })
      .populate('gradedBy', 'fullName')
      .sort({ gradedAt: -1 })
      .lean();
      
    return { success: true, grades: submissions };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function submitAssignment(studentId, assessmentId, content) {
  try {
    const { Submission, Assessment } = await getModels();
    
    // Ensure not already submitted
    const existing = await Submission.findOne({ student: studentId, assessment: assessmentId });
    if (existing) {
      return { success: false, message: "Already submitted." };
    }
    
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) return { success: false, message: "Assessment not found." };
    
    const isLate = new Date() > new Date(assessment.dueDate);

    const submission = new Submission({
      student: studentId,
      assessment: assessmentId,
      content,
      status: "submitted",
      isLate
    });
    
    await submission.save();
    
    // Increment submission count on assessment
    await Assessment.findByIdAndUpdate(assessmentId, { $inc: { submissionsCount: 1 } });
    
    return { success: true, submission };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function updateStudentProfile(studentId, data) {
  try {
    const { Student } = await getModels();
    const updated = await Student.findByIdAndUpdate(
      studentId,
      { $set: data },
      { new: true }
    ).select('-password');
    return { success: true, student: updated };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
