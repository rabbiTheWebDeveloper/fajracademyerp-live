import { dbConnect } from "@/service/mongo";
import { UserModel } from "@/model/user-model";
import bcrypt from "bcryptjs";
import { escapeRegex } from "@/lib/utils";

/**
 * Get paginated list of users
 */
export async function getAllUsers({
  page = 1,
  limit = 20,
  role = "",
  search = "",
} = {}) {
  await dbConnect();

  const query = {};
  if (role && role !== "all") query.role = role;
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    query.$or = [
      { fullName: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    UserModel.find(query)
      .select("-password -resetPasswordToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(query),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a user by ID (no password)
 */
export async function getUserById(id) {
  await dbConnect();
  return UserModel.findById(id).select("-password -resetPasswordToken").lean();
}

function getPhoneVariants(input) {
  if (!input) return [];
  const clean = String(input).trim();
  const digitsOnly = clean.replace(/\D/g, "");
  const variants = [clean];
  if (clean.startsWith("+")) {
    variants.push(clean.slice(1));
  } else {
    variants.push(`+${clean}`);
  }
  if (/^01[3-9]\d{8}$/.test(digitsOnly)) {
    variants.push(`+88${digitsOnly}`);
    variants.push(`88${digitsOnly}`);
    variants.push(digitsOnly);
  } else if (/^8801[3-9]\d{8}$/.test(digitsOnly)) {
    variants.push(`+${digitsOnly}`);
    variants.push(digitsOnly);
    variants.push(`0${digitsOnly.slice(2)}`);
  }
  return [...new Set(variants.filter(Boolean))];
}

/**
 * Get user by email/ID/phone — runs all model lookups in parallel for fast login.
 * UserModel is checked first (admins/super-admins); then Teacher, Student, Staff
 * are queried simultaneously to eliminate serial round-trips.
 */
export async function getUserByEmail(email) {
  await dbConnect();

  const searchRaw = String(email).trim();
  const escapedSearch = searchRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exactRegex = new RegExp(`^${escapedSearch}$`, "i");
  const phoneVariants = getPhoneVariants(searchRaw);

  const phoneQuery = phoneVariants.length > 0
    ? { $in: phoneVariants }
    : exactRegex;

  // ── Fast path: admin/super-admin users live in UserModel ─────────────────────
  const adminUser = await UserModel.findOne({
    $or: [
      { email: exactRegex },
      { phone: phoneQuery },
    ],
  }).lean();
  if (adminUser) return adminUser;

  // ── Parallel lookup across Teacher, Student, Staff ───────────────────────────
  // All 3 queries fire simultaneously — total wait = slowest single query.
  const [TeacherModelMod, StudentModelMod, StaffModelMod] = await Promise.all([
    import("@/model/teacher-model"),
    import("@/model/student-model"),
    import("@/model/staff-model"),
  ]);

  const [teacher, student, staff] = await Promise.all([
    TeacherModelMod.TeacherModel.findOne({
      $or: [
        { email: exactRegex },
        { teacherId: exactRegex },
        { phone: phoneQuery },
      ],
    }).select("+password").lean(),
    StudentModelMod.StudentModel.findOne({
      $or: [
        { email: exactRegex },
        { studentId: exactRegex },
        { phone: phoneQuery },
        { whatsappNumber: phoneQuery },
      ],
    }).select("+password").lean(),
    StaffModelMod.StaffModel.findOne({
      $or: [
        { email: exactRegex },
        { staffId: exactRegex },
        { phone: phoneQuery },
      ],
    }).select("+password").lean(),
  ]);

  // Return first match, injecting role
  if (teacher) return { ...teacher, role: "teacher" };
  if (student) return { ...student, role: "student" };
  if (staff)   return { ...staff,   role: "staff"   };

  return null;
}

/**
 * Create a new user
 */
export async function createUser(data) {
  await dbConnect();
  const hashedPassword = await bcrypt.hash(data.password, 12);
  const user = new UserModel({ ...data, password: hashedPassword });
  await user.save();
  const { password, ...safeUser } = user.toObject();
  return safeUser;
}

/**
 * Update a user
 */
export async function updateUser(id, data) {
  await dbConnect();
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 12);
  }
  const user = await UserModel.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: "after", runValidators: true }
  )
    .select("-password -resetPasswordToken")
    .lean();
  return user;
}

/**
 * Delete a user
 */
export async function deleteUser(id) {
  await dbConnect();
  await UserModel.findByIdAndDelete(id);
  return { success: true };
}

/**
 * Update a user's role and permissions
 */
export async function updateUserRole(id, role, permissions = []) {
  await dbConnect();
  return UserModel.findByIdAndUpdate(
    id,
    { $set: { role, permissions } },
    { returnDocument: "after" }
  )
    .select("-password")
    .lean();
}

/**
 * Get role distribution stats
 */
export async function getRoleStats() {
  await dbConnect();
  const stats = await UserModel.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  return stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
}
