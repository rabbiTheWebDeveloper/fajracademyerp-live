import { dbConnect } from "@/service/mongo";
import { AssessmentModel } from "@/model/assessment-model";
import { SubmissionModel } from "@/model/submission-model";
import { escapeRegex } from "@/lib/utils";

/**
 * Get paginated list of assessments
 */
export async function getAllAssessments({
  page = 1,
  limit = 20,
  courseId = "",
  type = "",
  status = "",
  search = "",
} = {}) {
  await dbConnect();

  const query = {};
  if (courseId && courseId !== "all") query.course = courseId;
  if (type && type !== "all") query.type = type;
  if (status && status !== "all") query.status = status;
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { assessmentId: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [assessments, total] = await Promise.all([
    AssessmentModel.find(query)
      .populate("course", "title category")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AssessmentModel.countDocuments(query),
  ]);

  return {
    assessments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single assessment with its submissions
 */
export async function getAssessmentById(id) {
  await dbConnect();
  const assessment = await AssessmentModel.findById(id)
    .populate("course", "title category")
    .populate("createdBy", "fullName")
    .lean();
  if (!assessment) return null;

  const submissions = await SubmissionModel.find({ assessment: id })
    .populate("student", "fullName studentId avatar")
    .lean();

  return { ...assessment, submissions };
}

/**
 * Create a new assessment
 */
export async function createAssessment(data) {
  await dbConnect();
  const assessment = new AssessmentModel(data);
  await assessment.save();
  return assessment.toObject();
}

/**
 * Update an assessment
 */
export async function updateAssessment(id, data) {
  await dbConnect();
  const assessment = await AssessmentModel.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  return assessment;
}

/**
 * Delete an assessment and its submissions
 */
export async function deleteAssessment(id) {
  await dbConnect();
  await AssessmentModel.findByIdAndDelete(id);
  await SubmissionModel.deleteMany({ assessment: id });
  return { success: true };
}

/**
 * Grade a student submission
 */
export async function gradeSubmission(submissionId, { marks, feedback, gradedBy }) {
  await dbConnect();
  const submission = await SubmissionModel.findByIdAndUpdate(
    submissionId,
    {
      $set: {
        marks,
        feedback,
        gradedBy,
        gradedAt: new Date(),
        status: "graded",
      },
    },
    { new: true }
  ).lean();
  return submission;
}

/**
 * Get assessment dashboard stats
 */
export async function getAssessmentDashboardStats() {
  await dbConnect();
  const [active, grading, upcoming] = await Promise.all([
    AssessmentModel.countDocuments({ status: "active" }),
    AssessmentModel.countDocuments({ status: "grading" }),
    AssessmentModel.countDocuments({ status: "upcoming" }),
  ]);
  return { active, grading, upcoming };
}
