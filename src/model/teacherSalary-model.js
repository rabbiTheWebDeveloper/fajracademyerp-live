import mongoose, { Schema } from "mongoose";

const teacherSalarySchema = new Schema(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    month: {
      type: String, // Format: YYYY-MM
      required: true,
      index: true,
    },
    salaryType: {
      type: String,
      enum: ["monthly", "per-student-percentage"],
      required: true,
    },
    baseValue: {
      type: Number,
      required: true,
      min: 0,
    },
    totalStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalStudentFees: {
      type: Number,
      default: 0,
      min: 0,
    },
    calculatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    deduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    invoiceId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure a teacher can only have one salary record per month
teacherSalarySchema.index({ teacher: 1, month: 1 }, { unique: true });

export const TeacherSalaryModel =
  mongoose.models.TeacherSalary ?? mongoose.model("TeacherSalary", teacherSalarySchema);
