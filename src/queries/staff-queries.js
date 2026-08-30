import { dbConnect } from "@/service/mongo";
import { StaffModel } from "@/model/staff-model";
import { UserModel } from "@/model/user-model";
import { StaffAttendanceModel } from "@/model/staff-attendance-model";
import { StaffLeaveModel } from "@/model/staff-leave-model";
import { StaffPayrollModel } from "@/model/staff-payroll-model";
import { StaffDailyReportModel } from "@/model/staff-daily-report-model";
import { StaffActivityModel } from "@/model/staff-activity-model";
import { escapeRegex } from "@/lib/utils";

// ─── STAFF CRUD ───────────────────────────────────────────────────────────────

export async function getAllStaff({ page = 1, limit = 50, search = "", department = "", status = "" } = {}) {
  await dbConnect();
  const query = {};
  if (status && status !== "all") query.status = status;
  if (department && department !== "all") query.department = department;
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    query.$or = [
      { fullName:    { $regex: escaped, $options: "i" } },
      { email:       { $regex: escaped, $options: "i" } },
      { staffId:     { $regex: escaped, $options: "i" } },
      { designation: { $regex: escaped, $options: "i" } },
    ];
  }

  // 1. Fetch from StaffModel
  const staffList = await StaffModel.find(query).sort({ createdAt: -1 }).lean();

  // 2. Fetch from UserModel (excluding admin & super-admin)
  const userQuery = { role: { $nin: ["admin", "super-admin"] } };
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    userQuery.$or = [
      { fullName: { $regex: escaped, $options: "i" } },
      { email:    { $regex: escaped, $options: "i" } },
      { role:     { $regex: escaped, $options: "i" } },
    ];
  }
  if (status && status !== "all") {
    userQuery.isActive = status === "active";
  }

  const nonAdminUsers = await UserModel.find(userQuery).sort({ createdAt: -1 }).lean();


  const mappedUsers = nonAdminUsers
    .map(u => ({
      _id: u._id,
      staffId: `USR-${u._id.toString().slice(-4).toUpperCase()}`,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone || "",
      department: u.role || "other",
      designation: (u.role || "Staff Member").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      employmentType: "full-time",
      basicSalary: 0,
      status: u.isActive ? "active" : "inactive",
      avatar: u.avatar || "",
      source: "user_account",
      createdAt: u.createdAt,
    }));

  let combined = [ ...mappedUsers];

  if (department && department !== "all") {
    combined = combined.filter(c => c.department === department);
  }

  const total = combined.length;
  const skip = (page - 1) * limit;
  const paginated = combined.slice(skip, skip + limit);

  return { staff: paginated, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

export async function getStaffById(id) {
  await dbConnect();
  return StaffModel.findById(id).lean();
}

export async function createStaff(data) {
  await dbConnect();
  if (!data.email?.trim()) data = { ...data, email: undefined };
  const staff = new StaffModel(data);
  await staff.save();
  return staff.toObject();
}

export async function updateStaff(id, data) {
  await dbConnect();
  return StaffModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
}

export async function deleteStaff(id) {
  await dbConnect();
  await StaffModel.findByIdAndDelete(id);
  return { success: true };
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

export async function getAttendance({ staffId, date, month, page = 1, limit = 50 } = {}) {
  await dbConnect();
  const query = {};
  if (staffId) query.staff = staffId;
  if (date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    query.date = { $gte: start, $lt: end };
  } else if (month) {
    // month format: "YYYY-MM"
    const [y, m] = month.split("-").map(Number);
    query.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
  }
  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    StaffAttendanceModel.find(query)
      .populate("staff", "fullName department designation avatar staffId")
      .sort({ date: -1 })
      .skip(skip).limit(limit).lean(),
    StaffAttendanceModel.countDocuments(query),
  ]);
  return { records, total, page, totalPages: Math.ceil(total / limit) };
}

export async function markAttendance(data) {
  await dbConnect();
  const dateOnly = new Date(data.date);
  dateOnly.setHours(0, 0, 0, 0);
  // Upsert — update if exists, create if not
  const record = await StaffAttendanceModel.findOneAndUpdate(
    { staff: data.staff, date: dateOnly },
    { $set: { ...data, date: dateOnly } },
    { upsert: true, new: true, runValidators: true }
  ).lean();
  return record;
}

export async function updateAttendance(id, data) {
  await dbConnect();
  return StaffAttendanceModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
}

export async function getAttendanceSummary(staffId, month) {
  await dbConnect();
  const [y, m] = month.split("-").map(Number);
  const records = await StaffAttendanceModel.find({
    staff: staffId,
    date: { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) },
  }).lean();
  const summary = { present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, holiday: 0, totalWorkingMinutes: 0 };
  records.forEach(r => {
    if (r.status === "present")   summary.present++;
    if (r.status === "absent")    summary.absent++;
    if (r.status === "late")      summary.late++;
    if (r.status === "half-day")  summary.halfDay++;
    if (r.status === "on-leave")  summary.onLeave++;
    if (r.status === "holiday")   summary.holiday++;
    summary.totalWorkingMinutes += r.workingMinutes || 0;
  });
  return { ...summary, records };
}

// ─── LEAVE ────────────────────────────────────────────────────────────────────

export async function getLeaves({ staffId, status, page = 1, limit = 20 } = {}) {
  await dbConnect();
  const query = {};
  if (staffId) query.staff = staffId;
  if (status && status !== "all") query.status = status;
  const skip = (page - 1) * limit;
  const [leaves, total] = await Promise.all([
    StaffLeaveModel.find(query)
      .populate("staff", "fullName department designation avatar staffId")
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    StaffLeaveModel.countDocuments(query),
  ]);
  return { leaves, total, page, totalPages: Math.ceil(total / limit) };
}

export async function createLeave(data) {
  await dbConnect();
  const leave = new StaffLeaveModel(data);
  await leave.save();
  return leave.toObject();
}

export async function updateLeave(id, data) {
  await dbConnect();
  return StaffLeaveModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate("staff", "fullName department designation").lean();
}

// ─── PAYROLL ──────────────────────────────────────────────────────────────────

export async function getPayroll({ month, staffId, status, page = 1, limit = 20 } = {}) {
  await dbConnect();
  const query = {};
  if (month)   query.month = month;
  if (staffId) query.staff = staffId;
  if (status && status !== "all") query.status = status;
  const skip = (page - 1) * limit;
  const [payrolls, total] = await Promise.all([
    StaffPayrollModel.find(query)
      .populate("staff", "fullName department designation avatar staffId basicSalary")
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    StaffPayrollModel.countDocuments(query),
  ]);
  // Aggregate totals for the current query
  const agg = await StaffPayrollModel.aggregate([
    { $match: query },
    { $group: {
      _id: null,
      totalGross: { $sum: "$grossSalary" },
      totalNet:   { $sum: "$netSalary" },
      totalBonus: { $sum: "$performanceBonus" },
      totalDeductions: { $sum: "$totalDeductions" },
    }},
  ]);
  const totals = agg[0] || { totalGross: 0, totalNet: 0, totalBonus: 0, totalDeductions: 0 };
  return { payrolls, total, page, totalPages: Math.ceil(total / limit), totals };
}

export async function createPayroll(data) {
  await dbConnect();
  // Auto-calculate gross and net if not provided
  const gross = (data.basicSalary || 0) + (data.houseRentAllowance || 0)
    + (data.medicalAllowance || 0) + (data.transportAllowance || 0)
    + (data.performanceBonus || 0) + (data.overtimePay || 0) + (data.otherAllowances || 0);
  const deductions = (data.absentDeduction || 0) + (data.lateDeduction || 0)
    + (data.taxDeduction || 0) + (data.providentFund || 0) + (data.otherDeductions || 0);
  const payroll = new StaffPayrollModel({
    ...data,
    grossSalary: data.grossSalary ?? gross,
    totalDeductions: data.totalDeductions ?? deductions,
    netSalary: data.netSalary ?? (gross - deductions),
  });
  await payroll.save();
  return payroll.toObject();
}

export async function updatePayroll(id, data) {
  await dbConnect();
  // Recalculate net if earnings/deductions changed
  if (data.grossSalary !== undefined || data.totalDeductions !== undefined) {
    const existing = await StaffPayrollModel.findById(id).lean();
    const gross = data.grossSalary ?? existing.grossSalary;
    const deductions = data.totalDeductions ?? existing.totalDeductions;
    data.netSalary = gross - deductions;
  }
  return StaffPayrollModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
}

export async function deletePayroll(id) {
  await dbConnect();
  return StaffPayrollModel.findByIdAndDelete(id).lean();
}

// ─── DAILY REPORTS ────────────────────────────────────────────────────────────

export async function getDailyReports({ staffId, date, status, page = 1, limit = 20 } = {}) {
  await dbConnect();
  const query = {};
  if (staffId) query.staff = staffId;
  if (status && status !== "all") query.status = status;
  if (date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    query.date = { $gte: start, $lt: end };
  }
  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    StaffDailyReportModel.find(query)
      .populate("staff", "fullName department designation avatar staffId")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    StaffDailyReportModel.countDocuments(query),
  ]);
  return { reports, total, page, totalPages: Math.ceil(total / limit) };
}

export async function createDailyReport(data) {
  await dbConnect();
  const dateOnly = new Date(data.date);
  dateOnly.setHours(0, 0, 0, 0);
  const report = new StaffDailyReportModel({ ...data, date: dateOnly });
  await report.save();
  return report.toObject();
}

export async function updateDailyReport(id, data) {
  await dbConnect();
  return StaffDailyReportModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
}

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

export async function getActivities({ staffId, date, status, category, page = 1, limit = 50 } = {}) {
  await dbConnect();
  const query = {};
  if (staffId) query.staff = staffId;
  if (status && status !== "all") query.status = status;
  if (category && category !== "all") query.category = category;
  if (date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    query.date = { $gte: start, $lt: end };
  }
  const skip = (page - 1) * limit;
  const [activities, total] = await Promise.all([
    StaffActivityModel.find(query)
      .populate("staff", "fullName department designation avatar")
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    StaffActivityModel.countDocuments(query),
  ]);
  return { activities, total, page, totalPages: Math.ceil(total / limit) };
}

export async function createActivity(data) {
  await dbConnect();
  const dateOnly = new Date(data.date || new Date());
  dateOnly.setHours(0, 0, 0, 0);
  const activity = new StaffActivityModel({ ...data, date: dateOnly });
  await activity.save();
  return activity.toObject();
}

export async function updateActivity(id, data) {
  await dbConnect();
  // Auto-calculate duration if both times are present
  if (data.startTime && data.endTime) {
    const [sh, sm] = data.startTime.split(":").map(Number);
    const [eh, em] = data.endTime.split(":").map(Number);
    data.durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
  }
  return StaffActivityModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
}

export async function deleteActivity(id) {
  await dbConnect();
  await StaffActivityModel.findByIdAndDelete(id);
  return { success: true };
}
