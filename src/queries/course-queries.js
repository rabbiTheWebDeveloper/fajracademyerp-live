import { dbConnect } from "@/service/mongo";
import { CourseModel } from "@/model/course-model";
import { EnrollmentModel } from "@/model/enrollment-model";
import { StudentModel } from "@/model/student-model";
import { escapeRegex } from "@/lib/utils";

/**
 * Get paginated list of courses
 */
export async function getAllCourses({
  page = 1,
  limit = 10,
  search = "",
  status = "",
} = {}) {
  await dbConnect();

  const query = {};
  if (status && status !== "all") query.status = status;
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { courseId: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [courses, total] = await Promise.all([
    CourseModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CourseModel.countDocuments(query),
  ]);

  return {
    courses,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single course by ID with enrollments
 */
export async function getCourseById(id) {
  await dbConnect();
  const course = await CourseModel.findById(id).lean();
  if (!course) return null;

  const enrollments = await EnrollmentModel.find({ course: id })
    .populate("student", "fullName studentId avatar status")
    .lean();

  return { ...course, enrollments };
}

/**
 * Create a new course
 */
export async function createCourse(data) {
  await dbConnect();
  // Only pick allowed fields from the new schema
  const { title, description, level, status, thumbnail, language, isActive } = data;
  const course = new CourseModel({ title, description, level, status, thumbnail, language, isActive });
  await course.save();
  return course.toObject();
}

/**
 * Update a course by ID
 */
export async function updateCourse(id, data) {
  await dbConnect();
  // Only allow updating fields that exist in the new schema
  const allowedFields = ["title", "description", "level", "status", "thumbnail", "language", "isActive"];
  const update = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  const course = await CourseModel.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  ).lean();
  return course;
}

/**
 * Delete a course by ID
 */
export async function deleteCourse(id) {
  await dbConnect();
  await CourseModel.findByIdAndDelete(id);
  await EnrollmentModel.deleteMany({ course: id });
  return { success: true };
}

/**
 * Enroll a student in a course
 */
export async function enrollStudentInCourse(studentId, courseId) {
  await dbConnect();
  const existing = await EnrollmentModel.findOne({ student: studentId, course: courseId });
  if (existing) return { error: "Student already enrolled in this course" };

  const enrollment = new EnrollmentModel({ student: studentId, course: courseId });
  await enrollment.save();

  // Increment enrolled count
  await CourseModel.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });

  // Add enrollment ref to student
  await StudentModel.findByIdAndUpdate(studentId, {
    $addToSet: { enrolledCourses: enrollment._id },
  });

  return enrollment.toObject();
}

/**
 * Get course dashboard stats
 */
export async function getCourseDashboardStats() {
  await dbConnect();
  const [total, published, draft] = await Promise.all([
    CourseModel.countDocuments(),
    CourseModel.countDocuments({ status: "published" }),
    CourseModel.countDocuments({ status: "draft" }),
  ]);
  return { total, published, draft };
}
