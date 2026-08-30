import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { CourseModel } from "@/model/course-model";
import { UserModel } from "@/model/user-model";
import { PaymentInfoModel } from "@/model/paymentInfo-model";
import { TeacherCategoryModel } from "@/model/teacher-category-model";
import { escapeRegex } from "@/lib/utils";

/**
 * Get paginated list of teachers
 */
export async function getAllTeachers({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  version = "",
  category = "",
  idCardStatus = "",
} = {}) {
  await dbConnect();

  const query = {};
  if (status && status !== "all") query.status = status;
  if (version && version !== "all") query.version = version;
  if (category && category !== "all") query.category = category;
  if (idCardStatus && idCardStatus !== "all") query.idCardStatus = idCardStatus;
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    query.$or = [
      { fullName: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { teacherId: { $regex: escaped, $options: "i" } },
      { specialization: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [teachers, total] = await Promise.all([
    TeacherModel.find(query)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TeacherModel.countDocuments(query),
  ]);

  // Attach PaymentInfo to teachers
  if (teachers.length > 0) {
    const emails = teachers.map(t => t.email).filter(Boolean);
    const users = await UserModel.find({ email: { $in: emails } }).select('_id email').lean();
    const emailToUserId = {};
    users.forEach(u => emailToUserId[u.email] = u._id.toString());
    
    const searchIds = [...teachers.map(t => t._id)];
    users.forEach(u => searchIds.push(u._id));

    const paymentInfos = await PaymentInfoModel.find({ userId: { $in: searchIds } }).lean();
    const idToPaymentInfo = {};
    paymentInfos.forEach(p => idToPaymentInfo[p.userId.toString()] = p);
    
    // Fetch all students assigned to these teachers
    const { StudentModel } = await import("@/model/student-model");
    const teacherObjectIds = teachers.map(t => t._id);
    const allStudents = await StudentModel.find({ teacherId: { $in: teacherObjectIds } })
      .select("fullName phone studentId teacherId")
      .lean();
    
    teachers.forEach(t => {
      const tId = t._id.toString();
      const uId = t.email && emailToUserId[t.email];
      t.paymentInfo = idToPaymentInfo[tId] || (uId ? idToPaymentInfo[uId] : null) || null;
      
      // Filter students for this teacher
      const assigned = allStudents.filter(s => s.teacherId?.toString() === tId);
      t.studentCount = assigned.length;
      t.studentsList = assigned.map(s => ({
        fullName: s.fullName,
        phone: s.phone,
        studentId: s.studentId
      }));
    });
  }

  return {
    teachers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single teacher by ID with their courses
 */
export async function getTeacherById(id) {
  await dbConnect();
  const teacher = await TeacherModel.findById(id).populate("category").lean();
  if (!teacher) return null;

  const courses = await CourseModel.find({ instructor: id })
    .select("title status enrolledCount category")
    .lean();

  const teacherId = teacher._id.toString();
  let pInfo = await PaymentInfoModel.findOne({ userId: teacherId }).lean();
  
  if (!pInfo && teacher.email) {
    const user = await UserModel.findOne({ email: teacher.email }).select('_id').lean();
    if (user) {
      pInfo = await PaymentInfoModel.findOne({ userId: user._id }).lean();
    }
  }

  if (pInfo) {
    teacher.paymentInfo = pInfo;
  }

  return { ...teacher, courses };
}

/**
 * Create a new teacher.
 * Normalizes empty-string email → undefined so the sparse unique index
 * is never triggered by teachers without an email address.
 */
export async function createTeacher(data) {
  await dbConnect();

  // Normalize: treat empty / whitespace-only email as "no email"
  if (!data.email || !data.email.trim()) {
    data = { ...data, email: undefined };
  }

  if (data.category === "") {
    delete data.category;
  }

  const teacher = new TeacherModel(data);
  await teacher.save();
  return teacher.toObject();
}

/**
 * Update a teacher by ID
 */
export async function updateTeacher(id, data) {
  await dbConnect();
  
  if (data.category === "") {
    data.category = undefined;
  }

  if (data.paymentInfo) {
    // 1. Update/insert payment info directly linked to the Teacher's own ID
    await PaymentInfoModel.findOneAndUpdate(
      { userId: id },
      { $set: { ...data.paymentInfo, userModel: "Teacher" } },
      { upsert: true }
    );

    // 2. Also update/insert linked to the User ID if it exists
    const teacherForEmail = await TeacherModel.findById(id).select('email').lean();
    if (teacherForEmail && teacherForEmail.email) {
      const user = await UserModel.findOne({ email: teacherForEmail.email }).select('_id').lean();
      if (user) {
        await PaymentInfoModel.findOneAndUpdate(
          { userId: user._id },
          { $set: { ...data.paymentInfo, userModel: "Teacher" } },
          { upsert: true }
        );
      }
    }
    delete data.paymentInfo;
  }

  const teacher = await TeacherModel.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  return teacher;
}

/**
 * Delete a teacher by ID
 */
export async function deleteTeacher(id) {
  await dbConnect();
  await TeacherModel.findByIdAndDelete(id);
  return { success: true };
}

/**
 * Get teacher dashboard stats
 */
export async function getTeacherDashboardStats() {
  await dbConnect();
  const [total, active, onLeave] = await Promise.all([
    TeacherModel.countDocuments(),
    TeacherModel.countDocuments({ status: "active" }),
    TeacherModel.countDocuments({ status: "on-leave" }),
  ]);

  // Average rating
  const ratingAgg = await TeacherModel.aggregate([
    { $match: { totalRatings: { $gt: 0 } } },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } },
  ]);
  const avgRating = ratingAgg[0]?.avgRating?.toFixed(1) || 0;

  return { total, active, onLeave, avgRating };
}

// ─── TEACHER CATEGORIES ───────────────────────────────────────────────────────

export async function getTeacherCategories() {
  await dbConnect();
  let categories = await TeacherCategoryModel.find({}).sort({ name: 1 }).lean();
  if (categories.length === 0) {
    const defaults = [
      { name: "Senior Teacher", description: "Highly experienced senior teacher" },
      { name: "Junior Teacher", description: "Regular junior teacher" },
      { name: "Kids Specialist Teacher", description: "Specialized in teaching children" },
      { name: "Kids Junior Teacher", description: "Junior instructor for children" },
      { name: "Kids Basic Teacher", description: "Basic instructor for children" },
      { name: "Hifz Teacher", description: "Specialized in Quran memorization (Hifz)" },
      { name: "Pre-Hifz Teacher", description: "Specialized in preparation for Quran memorization" },
    ];
    const seeded = defaults.map(d => ({
      ...d,
      slug: d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
    }));
    await TeacherCategoryModel.insertMany(seeded);
    categories = await TeacherCategoryModel.find({}).sort({ name: 1 }).lean();
  }
  return categories;
}

export async function createTeacherCategory(data) {
  await dbConnect();
  const slug = data.slug || (data.name ? data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") : "");
  const category = new TeacherCategoryModel({
    name: data.name?.trim(),
    slug,
    description: data.description?.trim() || "",
    status: data.status || "active",
  });
  await category.save();
  return category.toObject();
}

export async function updateTeacherCategory(id, data) {
  await dbConnect();
  const updatePayload = {};
  if (data.name !== undefined) {
    updatePayload.name = data.name.trim();
    updatePayload.slug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  }
  if (data.description !== undefined) {
    updatePayload.description = data.description.trim();
  }
  if (data.status !== undefined) {
    updatePayload.status = data.status;
  }

  const updated = await TeacherCategoryModel.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).lean();
  return updated;
}

export async function deleteTeacherCategory(id) {
  await dbConnect();
  await TeacherCategoryModel.findByIdAndDelete(id);
  return { success: true };
}
