import { dbConnect } from "@/service/mongo";
import { ClassSessionModel } from "@/model/class-model";
import { CourseModel } from "@/model/course-model";

const DEFAULT_DURATION = 45;
const MIN_DURATION = 15;
const MAX_DURATION = 180;

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

async function ensureModels() {
  await dbConnect();
  await Promise.all([
    import("@/model/course-model"),
    import("@/model/student-model"),
  ]);
}

const POPULATE = [
  { path: "course",  select: "title courseId thumbnail level" },
  { path: "student", select: "fullName studentId avatar" },
];

/** Fetch all classes for a teacher */
export async function getTeacherClasses(teacherId) {
  try {
    await ensureModels();
    const classes = await ClassSessionModel.find({ teacher: teacherId })
      .populate(POPULATE)
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, classes };
  } catch (e) {
    console.error("getTeacherClasses:", e);
    return { success: false, message: e.message };
  }
}

/** Create a new scheduled class */
export async function createTeacherClass(teacherId, payload) {
  try {
    await ensureModels();
    const { studentId, courseId, dayOfWeek, startTime, notes, duration: rawDuration, meetLink, topic } = payload;

    if (!studentId || !courseId || !dayOfWeek || !startTime || !topic?.trim())
      return { success: false, message: "studentId, courseId, dayOfWeek, startTime, and topic are required." };

    if (!/^\d{2}:\d{2}$/.test(startTime))
      return { success: false, message: "startTime must be HH:MM format." };

    const duration = Number(rawDuration) || DEFAULT_DURATION;
    if (duration < MIN_DURATION || duration > MAX_DURATION)
      return { success: false, message: `Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes.` };

    const startMins = timeToMinutes(startTime);
    const endMins   = startMins + duration;
    if (endMins > 24 * 60)
      return { success: false, message: "Class would extend past midnight." };
    const endTime = minutesToTime(endMins);

    // Duplicate topic check (case-insensitive) for same teacher
    const topicTrimmed = topic.trim();
    const duplicateTopic = await ClassSessionModel.findOne({
      teacher: teacherId,
      status: { $in: ["scheduled", "in-progress"] },
      topic: { $regex: new RegExp(`^${topicTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    }).lean();
    if (duplicateTopic) {
      return {
        success: false,
        message: `A class with the topic "${topicTrimmed}" already exists. Please use a unique topic.`,
      };
    }

    // Teacher overlap check
    const teacherClashes = await ClassSessionModel.find({
      teacher: teacherId, dayOfWeek,
      status: { $in: ["scheduled", "in-progress"] },
    }).lean();
    for (const c of teacherClashes) {
      const cs = timeToMinutes(c.startTime), ce = timeToMinutes(c.endTime);
      if (startMins < ce && endMins > cs)
        return { success: false, message: `Conflict: you have a class ${c.startTime}–${c.endTime} on ${dayOfWeek}.` };
    }

    // Student overlap check
    const studentClashes = await ClassSessionModel.find({
      student: studentId, dayOfWeek,
      status: { $in: ["scheduled", "in-progress"] },
    }).lean();
    for (const c of studentClashes) {
      const cs = timeToMinutes(c.startTime), ce = timeToMinutes(c.endTime);
      if (startMins < ce && endMins > cs)
        return { success: false, message: `Student has a class ${c.startTime}–${c.endTime} on ${dayOfWeek}.` };
    }

    const doc = new ClassSessionModel({
      teacher: teacherId, student: studentId, course: courseId,
      dayOfWeek, startTime, endTime, duration,
      notes: notes || "", status: "scheduled",
      meetLink: meetLink || null,
      topic: topicTrimmed,
    });
    await doc.save();

    const populated = await ClassSessionModel.findById(doc._id).populate(POPULATE).lean();
    return { success: true, class: populated };
  } catch (e) {
    console.error("createTeacherClass:", e);
    return { success: false, message: e.message };
  }
}

/** Start a class: scheduled → in-progress */
export async function startTeacherClass(classId, teacherId) {
  try {
    await ensureModels();
    const doc = await ClassSessionModel.findOne({ _id: classId, teacher: teacherId });
    if (!doc) return { success: false, message: "Class not found." };
    if (doc.status !== "scheduled")
      return { success: false, message: `Cannot start — class is already ${doc.status}.` };

    doc.status    = "in-progress";
    doc.startedAt = new Date();
    await doc.save();

    const populated = await ClassSessionModel.findById(doc._id).populate(POPULATE).lean();
    return { success: true, class: populated };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/** End a class: in-progress → completed */
export async function endTeacherClass(classId, teacherId, studentAttendance = "not-marked") {
  try {
    await ensureModels();
    const doc = await ClassSessionModel.findOne({ _id: classId, teacher: teacherId });
    if (!doc) return { success: false, message: "Class not found." };
    if (doc.status !== "in-progress" && doc.status !== "paused")
      return { success: false, message: `Cannot end — class is ${doc.status}.` };

    const now         = new Date();
    const actualMins  = doc.startedAt
      ? Math.round((now - new Date(doc.startedAt)) / 60000)
      : DEFAULT_DURATION;

    doc.status             = "completed";
    doc.endedAt            = now;
    doc.actualDuration     = actualMins;
    doc.studentAttendance  = ["present", "absent", "not-marked"].includes(studentAttendance)
      ? studentAttendance
      : "not-marked";
    await doc.save();

    const populated = await ClassSessionModel.findById(doc._id).populate(POPULATE).lean();
    return { success: true, class: populated };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/** Pause a class: in-progress → paused */
export async function pauseTeacherClass(classId, teacherId) {
  try {
    await ensureModels();
    const doc = await ClassSessionModel.findOne({ _id: classId, teacher: teacherId });
    if (!doc) return { success: false, message: "Class not found." };
    if (doc.status !== "in-progress")
      return { success: false, message: `Cannot pause — class is ${doc.status}.` };

    doc.status = "paused";
    await doc.save();

    const populated = await ClassSessionModel.findById(doc._id).populate(POPULATE).lean();
    return { success: true, class: populated };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/** Resume a class: paused → in-progress */
export async function resumeTeacherClass(classId, teacherId) {
  try {
    await ensureModels();
    const doc = await ClassSessionModel.findOne({ _id: classId, teacher: teacherId });
    if (!doc) return { success: false, message: "Class not found." };
    if (doc.status !== "paused")
      return { success: false, message: `Cannot resume — class is ${doc.status}.` };

    doc.status = "in-progress";
    await doc.save();

    const populated = await ClassSessionModel.findById(doc._id).populate(POPULATE).lean();
    return { success: true, class: populated };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/** Reset a class: in-progress/paused → scheduled */
export async function resetTeacherClass(classId, teacherId) {
  try {
    await ensureModels();
    const doc = await ClassSessionModel.findOne({ _id: classId, teacher: teacherId });
    if (!doc) return { success: false, message: "Class not found." };
    if (doc.status !== "in-progress" && doc.status !== "paused")
      return { success: false, message: `Cannot reset — class is ${doc.status}.` };

    doc.status = "scheduled";
    doc.startedAt = null;
    doc.endedAt = null;
    await doc.save();

    const populated = await ClassSessionModel.findById(doc._id).populate(POPULATE).lean();
    return { success: true, class: populated };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/** Delete a class */
export async function deleteTeacherClass(classId, teacherId) {
  try {
    await dbConnect();
    const doc = await ClassSessionModel.findOne({ _id: classId, teacher: teacherId });
    if (!doc) return { success: false, message: "Class not found." };
    if (doc.status === "completed")
      return { success: false, message: "Cannot delete a completed class." };
    await ClassSessionModel.findByIdAndDelete(classId);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/** Courses for dropdown */
export async function getAllCoursesForDropdown() {
  try {
    await dbConnect();
    const courses = await CourseModel.find({ isActive: true })
      .select("_id title courseId level")
      .sort({ title: 1 })
      .lean();
    return { success: true, courses };
  } catch (e) {
    return { success: false, message: e.message };
  }
}