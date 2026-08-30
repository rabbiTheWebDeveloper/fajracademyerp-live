import mongoose, { Schema } from "mongoose";

/**
 * Staff Payroll Model
 * One record = one staff member's complete salary calculation for one month.
 * A unique compound index on (staff + month) prevents duplicate payroll entries.
 */
const staffPayrollSchema = new Schema(
  {
    staff: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },

    /**
     * Payroll period in "YYYY-MM" format (e.g. "2026-07").
     * Used for grouping, filtering, and preventing duplicates.
     */
    month: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },

    // ─── Earnings ─────────────────────────────────────────────────────────────
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    houseRentAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    medicalAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    transportAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    performanceBonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimePay: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherAllowances: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Gross = basic + HRA + medical + transport + bonus + OT + other
     * Stored for fast reporting (not virtual, to keep lean queries).
     */
    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // ─── Deductions ───────────────────────────────────────────────────────────
    /**
     * Deduction for absent days.
     * Formula: (basicSalary / workingDaysInMonth) × absentDays
     */
    absentDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Deduction for late arrivals (configurable per company policy).
     */
    lateDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    providentFund: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Total deductions = absent + late + tax + PF + other
     */
    totalDeductions: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    /**
     * Net salary = grossSalary − totalDeductions
     */
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // ─── Attendance Summary for this Month ────────────────────────────────────
    workingDaysInMonth: {
      type: Number,
      default: 26,
      min: 1,
    },

    presentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    absentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    leaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ─── Payment ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "on-hold"],
      default: "pending",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["bank-transfer", "cash", "mobile-banking", "cheque", ""],
      default: "",
    },

    paymentReference: {
      type: String,
      default: "",
      trim: true,
      // Bank transaction ID, cheque number, bKash ref, etc.
    },

    paidAt: {
      type: Date,
      default: null,
    },

    /**
     * Admin/finance officer who processed the payment.
     */
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One payroll entry per staff per month — no duplicates
staffPayrollSchema.index({ staff: 1, month: 1 }, { unique: true });

// Common query patterns
staffPayrollSchema.index({ month: 1, status: 1 });
staffPayrollSchema.index({ status: 1, createdAt: -1 });
staffPayrollSchema.index({ staff: 1, status: 1 });

export const StaffPayrollModel =
  mongoose.models.StaffPayroll ??
  mongoose.model("StaffPayroll", staffPayrollSchema);
