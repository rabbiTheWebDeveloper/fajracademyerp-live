import mongoose, { Schema } from "mongoose";
import "@/model/course-model";

const studentSchema = new Schema(
  {
    studentId: {
      type: String,
      unique: true,
      index: true,
    },
    fullName: { type: String, required: true },
    fatherName: { type: String, default: "" },
    motherName: { type: String, default: "" },
    age: { type: Number, default: null },
    phone: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    whatsappNumber: { type: String, default: "" },
    crmRefId: { type: String, default: "" },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, default: "" },
    avatar: { type: String, default: "" },
    admissionDate: { type: Date },
    admissionFee: { type: Number, default: 0 },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    monthlyFee: { type: Number, default: 0 },
    monthlyDue: { type: Number, default: 0 },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    classStartingDate: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },
    enrolledCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Enrollment",
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive", "completed", "at-risk", "suspended"],
      default: "active",
      index: true,
    },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    teacherHistory: [
      {
        teacher:      { type: Schema.Types.ObjectId, ref: "Teacher" },
        teacherName:  { type: String, default: "" },
        teacherId:    { type: String, default: "" },  // human-readable ID e.g. TCH0001
        assignedAt:   { type: Date },
        unassignedAt: { type: Date },
        note:         { type: String, default: "" },
      }
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

studentSchema.pre("save", async function () {
  if (this.studentId) return;

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  let genderCode = "O";
  if (this.gender === "male") genderCode = "M";
  if (this.gender === "female") genderCode = "F";

  const prefix = `STU${genderCode}${month}${year}`;

  const lastStudent = await this.constructor.findOne({
    studentId: { $regex: new RegExp(`^${prefix}`) }
  }).sort({ studentId: -1 });

  let nextSerial = 1;
  if (lastStudent?.studentId) {
    const lastSerialNum = parseInt(lastStudent.studentId.slice(-4), 10);
    if (!isNaN(lastSerialNum)) nextSerial = lastSerialNum + 1;
  }

  let serialNum = nextSerial;
  let finalStudentId = "";
  while (!finalStudentId) {
    const candidate = `${prefix}${String(serialNum).padStart(4, "0")}`;
    const existing = await this.constructor.findOne({ studentId: candidate });
    if (!existing) finalStudentId = candidate;
    else serialNum++;
  }

  this.studentId = finalStudentId;

  if (!this.email) {
    this.email = `${this.studentId.toLowerCase()}@fajracademy.com`;
  }
});

// Indexes for common query patterns
studentSchema.index({ createdAt: -1 });            // default sort
studentSchema.index({ status: 1, createdAt: -1 }); // status filter + sort
studentSchema.index({ fullName: 1 });               // name search
studentSchema.index({ studentId: 1 });              // studentId search
studentSchema.index({ email: 1 });                  // email search
studentSchema.index({ phone: 1 });                  // phone search
studentSchema.index({ crmRefId: 1 });               // crm ref search
studentSchema.index({ teacherId: 1 });              // filter by teacher

export const StudentModel =
  mongoose.models.Student || mongoose.model("Student", studentSchema);
