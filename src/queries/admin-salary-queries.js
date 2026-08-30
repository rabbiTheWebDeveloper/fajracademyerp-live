import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";

// Helper to get Models safely
const getModels = async () => {
  await dbConnect();
  return {
    Teacher: mongoose.models.Teacher || (await import("@/model/teacher-model")).TeacherModel,
    TeacherSalary: mongoose.models.TeacherSalary || (await import("@/model/teacherSalary-model")).TeacherSalaryModel,
    User: mongoose.models.User || (await import("@/model/user-model")).UserModel,
    PaymentInfo: mongoose.models.PaymentInfo || (await import("@/model/paymentInfo-model")).PaymentInfoModel,
  };
};

export async function getAllTeacherSalaries(month) {
  try {
    const { TeacherSalary, User, PaymentInfo } = await getModels();
    
    let query = {};
    if (month && month !== "all") {
      query.month = month;
    }

    const salaries = await TeacherSalary.find(query)
      .populate("teacher", "fullName avatar email teacherId phone")
      .sort({ month: -1, createdAt: -1 })
      .lean();
      
    // Fetch Payment Info via Teacher IDs directly
    const teacherIds = salaries.map(s => s.teacher?._id).filter(Boolean);
    if (teacherIds.length > 0) {
      const paymentInfos = await PaymentInfo.find({ userId: { $in: teacherIds }, userModel: 'Teacher' }).lean();
      
      const teacherIdToPaymentInfo = {};
      paymentInfos.forEach(p => {
        teacherIdToPaymentInfo[p.userId.toString()] = p;
      });

      salaries.forEach(s => {
        if (s.teacher && s.teacher._id) {
          s.teacher.paymentInfo = teacherIdToPaymentInfo[s.teacher._id.toString()] || null;
        }
      });
    }

    return { success: true, salaries };
  } catch (error) {
    console.error("Error fetching admin salaries:", error);
    return { success: false, message: error.message };
  }
}

export async function approveTeacherSalary(salaryId) {
  try {
    const { TeacherSalary } = await getModels();
    
    const existing = await TeacherSalary.findById(salaryId).populate("teacher", "teacherId").lean();
    if (!existing) {
      return { success: false, message: "Salary record not found." };
    }

    const datePart = (existing.month || "2026-07").replace("-", "");
    const teacherIdPart = existing.teacher?.teacherId || "TCH";
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const invoiceId = `INV-${datePart}-${teacherIdPart}-${randomPart}`.toUpperCase();

    const salary = await TeacherSalary.findByIdAndUpdate(
      salaryId,
      { 
        $set: { 
          status: "paid", 
          paidAt: new Date(),
          invoiceId: invoiceId
        } 
      },
      { new: true }
    ).populate("teacher", "fullName");
    
    return { success: true, salary };
  } catch (error) {
    console.error("Error approving salary:", error);
    return { success: false, message: error.message };
  }
}

/** Create a new salary record */
export async function createTeacherSalary(data) {
  try {
    const { TeacherSalary } = await getModels();
    
    // Check if record already exists for this teacher and month
    const existing = await TeacherSalary.findOne({ teacher: data.teacherId, month: data.month }).lean();
    if (existing) {
      return { success: false, message: `Salary record already exists for this teacher in ${data.month}.` };
    }

    // Auto-generate invoiceId if creating directly as paid
    let invoiceId = null;
    let paidAt = null;
    if (data.status === "paid") {
      const { Teacher } = await getModels();
      const teacherObj = await Teacher.findById(data.teacherId).select("teacherId").lean();
      const datePart = data.month.replace("-", "");
      const teacherIdPart = teacherObj?.teacherId || "TCH";
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      invoiceId = `INV-${datePart}-${teacherIdPart}-${randomPart}`.toUpperCase();
      paidAt = new Date();
    }

    const newRecord = new TeacherSalary({
      teacher: data.teacherId,
      month: data.month,
      salaryType: data.salaryType || "monthly",
      baseValue: Number(data.baseValue || 0),
      totalStudents: Number(data.totalStudents || 0),
      totalStudentFees: Number(data.totalStudentFees || 0),
      calculatedAmount: Number(data.calculatedAmount || 0),
      bonus: Number(data.bonus || 0),
      deduction: Number(data.deduction || 0),
      status: data.status || "pending",
      paidAt,
      invoiceId,
      notes: data.notes || "",
    });

    await newRecord.save();
    
    const populated = await TeacherSalary.findById(newRecord._id)
      .populate("teacher", "fullName avatar email teacherId phone")
      .lean();

    return { success: true, salary: populated };
  } catch (error) {
    console.error("Error creating salary:", error);
    return { success: false, message: error.message };
  }
}

/** Update an existing salary record */
export async function updateTeacherSalary(salaryId, updateData) {
  try {
    const { TeacherSalary } = await getModels();
    
    const existing = await TeacherSalary.findById(salaryId).populate("teacher", "teacherId").lean();
    if (!existing) {
      return { success: false, message: "Salary record not found." };
    }

    const updates = { ...updateData };
    
    // Auto-generate invoiceId if status changes from pending to paid
    if (updateData.status === "paid" && existing.status !== "paid") {
      const datePart = (existing.month || "2026-07").replace("-", "");
      const teacherIdPart = existing.teacher?.teacherId || "TCH";
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      updates.invoiceId = `INV-${datePart}-${teacherIdPart}-${randomPart}`.toUpperCase();
      updates.paidAt = new Date();
    } else if (updateData.status === "pending") {
      updates.invoiceId = null;
      updates.paidAt = null;
    }

    const updated = await TeacherSalary.findByIdAndUpdate(
      salaryId,
      { $set: updates },
      { new: true }
    ).populate("teacher", "fullName avatar email teacherId phone").lean();

    return { success: true, salary: updated };
  } catch (error) {
    console.error("Error updating salary:", error);
    return { success: false, message: error.message };
  }
}

/** Delete a salary record */
export async function deleteTeacherSalary(salaryId) {
  try {
    const { TeacherSalary } = await getModels();
    const deleted = await TeacherSalary.findByIdAndDelete(salaryId);
    if (!deleted) {
      return { success: false, message: "Salary record not found." };
    }
    return { success: true, message: "Salary record deleted successfully." };
  } catch (error) {
    console.error("Error deleting salary:", error);
    return { success: false, message: error.message };
  }
}

/** Get list of all teachers for dropdown selection */
export async function getTeachersForSalaryDropdown() {
  try {
    const { Teacher } = await getModels();
    const teachers = await Teacher.find({}).select("_id fullName teacherId email phone").sort({ fullName: 1 }).lean();
    return { success: true, teachers };
  } catch (error) {
    console.error("Error fetching teachers for dropdown:", error);
    return { success: false, message: error.message };
  }
}
