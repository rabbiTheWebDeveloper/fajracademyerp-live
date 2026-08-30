import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { StaffModel } from "@/model/staff-model";
import { PaymentInfoModel } from "@/model/paymentInfo-model";
import { TeacherSalaryModel } from "@/model/teacherSalary-model";
import { StaffPayrollModel } from "@/model/staff-payroll-model";
import { UserModel } from "@/model/user-model";
import { RoleModel } from "@/model/role-model";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "";
    const selectedEmpId = searchParams.get("employeeId") || searchParams.get("teacherId") || "";
    const historyEmpId = searchParams.get("historyEmployeeId") || searchParams.get("historyTeacherId") || selectedEmpId;
    const typeFilter = searchParams.get("type") || "all";

    // ── Check Logged In User from Token ──────────────────────────────────────
    const cookieHeader = request.headers.get("cookie") || "";
    const authMatch = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    const token = authMatch?.[1];

    let currentUser = null;
    let isAdmin = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded?.role;

        if (role === "super-admin" || role === "admin") {
          isAdmin = true;
          currentUser = await UserModel.findById(decoded.id).select("-password").lean();
          if (currentUser) currentUser.role = role;
        } else if (role === "teacher") {
          currentUser = await TeacherModel.findById(decoded.id).select("-password").lean();
          if (currentUser) currentUser.role = "teacher";
        } else if (role === "staff") {
          currentUser = await StaffModel.findById(decoded.id).select("-password").lean();
          if (currentUser) currentUser.role = "staff";
        } else if (decoded?.id) {
          currentUser = await UserModel.findById(decoded.id).select("-password").lean();
          // Check role permissions for custom roles
          if (currentUser?.role) {
            const roleDoc = await RoleModel.findOne({ name: currentUser.role }).lean();
            if (roleDoc?.permissions?.includes("*")) {
              isAdmin = true;
            }
          }
        }
      } catch (err) {
        console.error("JWT verification failed:", err);
      }
    }

    // Default to admin for dev/testing if no token, but if user is specifically a non-admin staff/teacher:
    // If not authenticated or role is staff/teacher, lock down to user-wise only.
    const isStaffOrTeacher = currentUser && (currentUser.role === "staff" || currentUser.role === "teacher");
    if (isStaffOrTeacher && !isAdmin) {
      isAdmin = false;
    } else if (!currentUser) {
      // If browsing in dev without token, allow full view or fallback
      isAdmin = true;
    }

    // 1. Fetch Payment Infos mapped by userId
    const paymentInfos = await PaymentInfoModel.find({}).lean();
    const paymentMap = {};
    for (const p of paymentInfos) {
      paymentMap[p.userId.toString()] = p;
    }

    // 2. Fetch Teachers
    let teachersList = [];
    if (isAdmin || currentUser?.role === "teacher") {
      const teacherQuery = { status: { $ne: "deleted" } };
      if (!isAdmin && currentUser?.role === "teacher") {
        teacherQuery._id = currentUser._id;
      }

      const rawTeachers = await TeacherModel.find(teacherQuery)
        .select("_id fullName teacherId email phone salary salaryType status paymentInfo avatar")
        .sort({ fullName: 1 })
        .lean();

      teachersList = rawTeachers.map((t) => ({
        _id: t._id.toString(),
        fullName: t.fullName,
        employeeId: t.teacherId || "T-ID",
        email: t.email,
        phone: t.phone,
        type: "teacher",
        department: "Teacher / Academic",
        designation: "Teacher",
        salary: t.salary || 0,
        status: t.status,
        avatar: t.avatar,
        paymentInfo: paymentMap[t._id.toString()] || t.paymentInfo || null,
      }));
    }

    // 3. Fetch Staff (e.g. Sadia - After Sales)
    let staffList = [];
    if (isAdmin || currentUser?.role === "staff") {
      const staffQuery = { status: { $ne: "deleted" } };
      if (!isAdmin && currentUser?.role === "staff") {
        staffQuery._id = currentUser._id;
      }

      const rawStaff = await StaffModel.find(staffQuery)
        .select("_id fullName staffId email phone basicSalary department designation status bankInfo avatar")
        .sort({ fullName: 1 })
        .lean();

      staffList = rawStaff.map((s) => {
        const bInfo = s.bankInfo || {};
        const fallbackPayment = {
          method: bInfo.mobileBankingProvider ? bInfo.mobileBankingProvider : "Bank_Transfer",
          bankName: bInfo.bankName || "Islami Bank Bangladesh PLC.",
          accountName: s.fullName,
          accountNumber: bInfo.accountNumber || bInfo.mobileBankingNumber || "",
          branchName: bInfo.branchName || "",
          routingNumber: bInfo.routingNumber || "",
          accountType: bInfo.accountType || "Savings",
        };

        const deptLabel = s.department
          ? s.department.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : "Staff";

        return {
          _id: s._id.toString(),
          fullName: s.fullName,
          employeeId: s.staffId || "S-ID",
          email: s.email,
          phone: s.phone,
          type: "staff",
          department: deptLabel,
          designation: s.designation || deptLabel,
          salary: s.basicSalary || 0,
          status: s.status,
          avatar: s.avatar,
          paymentInfo: paymentMap[s._id.toString()] || fallbackPayment,
        };
      });
    }

    // Unified employees list (If user is non-admin, this contains ONLY their own profile!)
    let allEmployees = [...teachersList, ...staffList];
    if (typeFilter === "teacher") allEmployees = teachersList;
    if (typeFilter === "staff") allEmployees = staffList;

    // 4. Fetch Salaries for current month filter
    // 4a. Teacher Salaries
    const tQuery = {};
    if (month) tQuery.month = month;
    if (!isAdmin && currentUser?.role === "teacher") {
      tQuery.teacher = currentUser._id;
    } else if (selectedEmpId) {
      tQuery.teacher = selectedEmpId;
    }

    const teacherSalaries = (isAdmin || currentUser?.role === "teacher")
      ? await TeacherSalaryModel.find(tQuery)
          .populate("teacher", "fullName teacherId email phone salary salaryType avatar")
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const formattedTeacherSalaries = teacherSalaries.map((s) => {
      const tid = s.teacher?._id?.toString();
      const pInfo = tid ? paymentMap[tid] : null;
      return {
        _id: s._id.toString(),
        employeeId: s.teacher?._id?.toString(),
        type: "teacher",
        employee: {
          _id: s.teacher?._id?.toString(),
          fullName: s.teacher?.fullName || "Teacher",
          code: s.teacher?.teacherId || "T-ID",
          department: "Teacher / Academic",
          designation: "Teacher",
          avatar: s.teacher?.avatar,
        },
        month: s.month,
        baseValue: Number(s.baseValue || 0),
        bonus: Number(s.bonus || 0),
        deduction: Number(s.deduction || 0),
        calculatedAmount: Number(s.calculatedAmount || s.baseValue || 0),
        netAmount: Number(s.calculatedAmount || s.baseValue || 0) + Number(s.bonus || 0) - Number(s.deduction || 0),
        status: s.status || "pending",
        paidAt: s.paidAt || null,
        paymentInfo: pInfo,
        notes: s.notes || "",
      };
    });

    // 4b. Staff Payrolls (for Sadia - After Sales, etc.)
    const sQuery = {};
    if (month) sQuery.month = month;
    if (!isAdmin && currentUser?.role === "staff") {
      sQuery.staff = currentUser._id;
    } else if (selectedEmpId) {
      sQuery.staff = selectedEmpId;
    }

    const staffPayrolls = (isAdmin || currentUser?.role === "staff")
      ? await StaffPayrollModel.find(sQuery)
          .populate("staff", "fullName staffId email phone basicSalary department designation avatar")
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const formattedStaffSalaries = staffPayrolls.map((p) => {
      const sid = p.staff?._id?.toString();
      const pInfo = sid ? paymentMap[sid] : null;
      const deptLabel = p.staff?.department
        ? p.staff.department.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "Staff";

      const totalAllowances =
        Number(p.houseRentAllowance || 0) +
        Number(p.medicalAllowance || 0) +
        Number(p.transportAllowance || 0) +
        Number(p.performanceBonus || 0) +
        Number(p.overtimePay || 0);

      const totalDeductions =
        Number(p.providentFund || 0) +
        Number(p.taxDeduction || 0) +
        Number(p.unpaidLeaveDeduction || 0) +
        Number(p.lateDeduction || 0) +
        Number(p.otherDeductions || 0);

      return {
        _id: p._id.toString(),
        employeeId: p.staff?._id?.toString(),
        type: "staff",
        employee: {
          _id: p.staff?._id?.toString(),
          fullName: p.staff?.fullName || "Staff",
          code: p.staff?.staffId || "S-ID",
          department: deptLabel,
          designation: p.staff?.designation || deptLabel,
          avatar: p.staff?.avatar,
        },
        month: p.month,
        baseValue: Number(p.basicSalary || 0),
        bonus: totalAllowances,
        deduction: totalDeductions,
        calculatedAmount: Number(p.basicSalary || 0),
        netAmount: Number(p.netSalary || Number(p.basicSalary || 0) + totalAllowances - totalDeductions),
        status: p.status === "paid" ? "paid" : "pending",
        paidAt: p.paidAt || null,
        paymentInfo: pInfo,
        notes: p.notes || "",
      };
    });

    const unifiedSalaries = [...formattedTeacherSalaries, ...formattedStaffSalaries];

    // 5. Fetch Previous Months Salary History for the target employee
    let employeeHistory = [];
    const targetHistId = !isAdmin && currentUser?._id
      ? currentUser._id.toString()
      : (historyEmpId || allEmployees[0]?._id);

    if (targetHistId) {
      // Check in TeacherSalaryModel
      const tHist = await TeacherSalaryModel.find({ teacher: targetHistId })
        .populate("teacher", "fullName teacherId email phone salary salaryType avatar")
        .sort({ month: -1 })
        .lean();

      if (tHist.length > 0) {
        employeeHistory = tHist.map((h) => ({
          _id: h._id.toString(),
          month: h.month,
          baseValue: Number(h.baseValue || 0),
          bonus: Number(h.bonus || 0),
          deduction: Number(h.deduction || 0),
          calculatedAmount: Number(h.calculatedAmount || h.baseValue || 0),
          netAmount: Number(h.calculatedAmount || h.baseValue || 0) + Number(h.bonus || 0) - Number(h.deduction || 0),
          status: h.status || "pending",
          paidAt: h.paidAt,
        }));
      } else {
        // Check in StaffPayrollModel
        const sHist = await StaffPayrollModel.find({ staff: targetHistId })
          .populate("staff", "fullName staffId email phone basicSalary department designation avatar")
          .sort({ month: -1 })
          .lean();

        employeeHistory = sHist.map((h) => {
          const totalAllowances =
            Number(h.houseRentAllowance || 0) +
            Number(h.medicalAllowance || 0) +
            Number(h.transportAllowance || 0) +
            Number(h.performanceBonus || 0) +
            Number(h.overtimePay || 0);

          const totalDeds =
            Number(h.providentFund || 0) +
            Number(h.taxDeduction || 0) +
            Number(h.unpaidLeaveDeduction || 0) +
            Number(h.lateDeduction || 0) +
            Number(h.otherDeductions || 0);

          return {
            _id: h._id.toString(),
            month: h.month,
            baseValue: Number(h.basicSalary || 0),
            bonus: totalAllowances,
            deduction: totalDeds,
            calculatedAmount: Number(h.basicSalary || 0),
            netAmount: Number(h.netSalary || Number(h.basicSalary || 0) + totalAllowances - totalDeds),
            status: h.status === "paid" ? "paid" : "pending",
            paidAt: h.paidAt,
          };
        });
      }
    }

    // 6. Summary metrics calculation
    let totalGross = 0;
    let totalNet = 0;
    let totalBonus = 0;
    let totalDeductions = 0;
    let paidCount = 0;
    let pendingCount = 0;

    unifiedSalaries.forEach((s) => {
      totalGross += Number(s.baseValue || 0);
      totalBonus += Number(s.bonus || 0);
      totalDeductions += Number(s.deduction || 0);
      totalNet += Number(s.netAmount || 0);
      if (s.status === "paid") paidCount++;
      else pendingCount++;
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      currentUser,
      employees: allEmployees,
      teachers: teachersList,
      staff: staffList,
      salaries: unifiedSalaries,
      teacherHistory: employeeHistory,
      summary: {
        totalRecords: unifiedSalaries.length,
        totalGross,
        totalBonus,
        totalDeductions,
        totalNet,
        paidCount,
        pendingCount,
        employeesCount: allEmployees.length,
        teachersCount: teachersList.length,
        staffCount: staffList.length,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/salary error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const action = body.action || "save_payment";

    // ── Check Logged In User from Token ──────────────────────────────────────
    const cookieHeader = request.headers.get("cookie") || "";
    const authMatch = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    const token = authMatch?.[1];

    let currentUserId = null;
    let isAdmin = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded?.id;
        if (decoded?.role === "super-admin" || decoded?.role === "admin") {
          isAdmin = true;
        }
      } catch {}
    }

    // ── ACTION 1: SAVE / UPDATE PAYMENT INFO ─────────────────────────────────
    if (action === "save_payment" || action === "update_payment") {
      const {
        employeeId,
        teacherId,
        method = "Bank_Transfer",
        accountName = "",
        accountNumber = "",
        bankName = "Islami Bank Bangladesh PLC.",
        branchName = "",
        routingNumber = "",
        accountType = "Savings",
      } = body;

      // If non-admin user is submitting, force targetId to be their own ID!
      let targetId = employeeId || teacherId;
      if (!isAdmin && currentUserId) {
        targetId = currentUserId;
      }

      if (!targetId) {
        return NextResponse.json(
          { success: false, message: "Please select an employee / teacher." },
          { status: 400 }
        );
      }

      // Check if employee is in TeacherModel or StaffModel
      let emp = await TeacherModel.findById(targetId);
      let userModel = "Teacher";

      if (!emp) {
        emp = await StaffModel.findById(targetId);
        userModel = "Staff";
      }

      if (!emp) {
        return NextResponse.json(
          { success: false, message: "Employee record not found." },
          { status: 404 }
        );
      }

      const paymentData = {
        userId: emp._id,
        userModel: userModel === "Staff" ? "User" : "Teacher",
        method,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        routingNumber: routingNumber.trim(),
        accountType: accountType || "Savings",
        lastUpdatedMonth: new Date().toISOString().slice(0, 7),
      };

      // Upsert in PaymentInfoModel
      const updatedPaymentInfo = await PaymentInfoModel.findOneAndUpdate(
        { userId: emp._id },
        {
          $set: paymentData,
          $inc: { updateCount: 1, updateCountThisMonth: 1 },
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Sync embedded fields
      if (userModel === "Teacher") {
        emp.paymentInfo = {
          method,
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          routingNumber: routingNumber.trim(),
          accountType: accountType || "Savings",
          updateCount: (emp.paymentInfo?.updateCount || 0) + 1,
        };
        await emp.save();
      } else {
        emp.bankInfo = {
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          branchName: branchName.trim(),
          routingNumber: routingNumber.trim(),
          accountType: accountType || "Savings",
          mobileBankingProvider: method !== "Bank_Transfer" ? method : "",
          mobileBankingNumber: accountNumber.trim(),
        };
        await emp.save();
      }

      await recordAuditLog(request, {
        action: "UPDATE",
        resource: "PaymentInfo",
        resourceId: emp._id.toString(),
        description: `Updated payment info for ${emp.fullName} (${userModel})`,
        changes: { after: paymentData },
      });

      return NextResponse.json({
        success: true,
        message: `Payment info for ${emp.fullName} saved successfully!`,
        paymentInfo: updatedPaymentInfo,
      });
    }

    // ── ACTION 2: GENERATE SALARY (Admin only) ───────────────────────────────
    if (action === "generate_salary") {
      const {
        employeeId,
        teacherId,
        month,
        salaryType = "monthly",
        baseValue = 0,
        bonus = 0,
        deduction = 0,
        calculatedAmount = 0,
        status = "pending",
        notes = "",
      } = body;

      const targetId = employeeId || teacherId;
      if (!targetId || !month) {
        return NextResponse.json(
          { success: false, message: "Employee and month are required." },
          { status: 400 }
        );
      }

      const isTeacher = await TeacherModel.findById(targetId);

      if (isTeacher) {
        let salaryDoc = await TeacherSalaryModel.findOne({ teacher: targetId, month });
        if (salaryDoc) {
          salaryDoc.salaryType = salaryType;
          salaryDoc.baseValue = Number(baseValue);
          salaryDoc.bonus = Number(bonus);
          salaryDoc.deduction = Number(deduction);
          salaryDoc.calculatedAmount = Number(calculatedAmount || baseValue);
          salaryDoc.status = status;
          if (notes) salaryDoc.notes = notes;
          await salaryDoc.save();
        } else {
          salaryDoc = await TeacherSalaryModel.create({
            teacher: targetId,
            month,
            salaryType,
            baseValue: Number(baseValue),
            bonus: Number(bonus),
            deduction: Number(deduction),
            calculatedAmount: Number(calculatedAmount || baseValue),
            status,
            notes,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Teacher salary for ${month} generated successfully!`,
          salary: salaryDoc,
        });
      } else {
        const netSalary = Math.max(0, Number(baseValue) + Number(bonus) - Number(deduction));
        let staffDoc = await StaffPayrollModel.findOne({ staff: targetId, month });

        if (staffDoc) {
          staffDoc.basicSalary = Number(baseValue);
          staffDoc.performanceBonus = Number(bonus);
          staffDoc.otherDeductions = Number(deduction);
          staffDoc.netSalary = netSalary;
          staffDoc.status = status === "paid" ? "paid" : "approved";
          if (notes) staffDoc.notes = notes;
          await staffDoc.save();
        } else {
          staffDoc = await StaffPayrollModel.create({
            staff: targetId,
            month,
            basicSalary: Number(baseValue),
            performanceBonus: Number(bonus),
            otherDeductions: Number(deduction),
            netSalary,
            status: status === "paid" ? "paid" : "approved",
            notes,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Staff salary for ${month} generated successfully!`,
          salary: staffDoc,
        });
      }
    }

    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin/salary error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { salaryId, status, bonus, deduction, notes } = body;

    if (!salaryId) {
      return NextResponse.json(
        { success: false, message: "Salary record ID is required." },
        { status: 400 }
      );
    }

    let updated = await TeacherSalaryModel.findById(salaryId);
    if (updated) {
      if (status !== undefined) {
        updated.status = status;
        updated.paidAt = status === "paid" ? new Date() : null;
      }
      if (bonus !== undefined) updated.bonus = Number(bonus);
      if (deduction !== undefined) updated.deduction = Number(deduction);
      if (notes !== undefined) updated.notes = notes;
      await updated.save();
      return NextResponse.json({ success: true, message: "Salary updated!", salary: updated });
    }

    let staffUpdated = await StaffPayrollModel.findById(salaryId);
    if (staffUpdated) {
      if (status !== undefined) {
        staffUpdated.status = status === "paid" ? "paid" : "approved";
        staffUpdated.paidAt = status === "paid" ? new Date() : null;
      }
      if (bonus !== undefined) staffUpdated.performanceBonus = Number(bonus);
      if (deduction !== undefined) staffUpdated.otherDeductions = Number(deduction);
      if (notes !== undefined) staffUpdated.notes = notes;
      staffUpdated.netSalary = Math.max(
        0,
        Number(staffUpdated.basicSalary || 0) + Number(staffUpdated.performanceBonus || 0) - Number(staffUpdated.otherDeductions || 0)
      );
      await staffUpdated.save();
      return NextResponse.json({ success: true, message: "Staff salary updated!", salary: staffUpdated });
    }

    return NextResponse.json({ success: false, message: "Salary record not found." }, { status: 404 });
  } catch (error) {
    console.error("PATCH /api/admin/salary error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Salary record ID is required." }, { status: 400 });
    }

    let deleted = await TeacherSalaryModel.findByIdAndDelete(id);
    if (!deleted) {
      deleted = await StaffPayrollModel.findByIdAndDelete(id);
    }

    return NextResponse.json({ success: true, message: "Salary record deleted successfully." });
  } catch (error) {
    console.error("DELETE /api/admin/salary error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
