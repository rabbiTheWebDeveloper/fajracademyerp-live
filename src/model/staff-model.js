import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Staff Model
 * Represents an office staff member (Sales, Marketing, BD, CAM, Customer Executive, Admin, etc.)
 */
const staffSchema = new Schema(
  {
    // ─── Identity ────────────────────────────────────────────────────────────
    staffId: {
      type: String,
      unique: true,
      index: true,
      // Auto-generated via pre-save hook (e.g. FJRS072026001)
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          // Optional — only validate if a value is provided
          if (!v || v.trim() === "") return true;
          return /^[0-9+\-\s]{10,15}$/.test(v);
        },
        message: "Phone number format is invalid (10-15 digits).",
      },
    },

    emergencyContactNumber: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          if (!v || v.trim() === "") return true;
          return /^[0-9+\-\s]{10,15}$/.test(v);
        },
        message: "Emergency contact format is invalid (10-15 digits).",
      },
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    avatar: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      default: null,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    nidOrBirthCertificatePicture: {
      type: String,
      default: "",
    },

    // ─── Department & Role ───────────────────────────────────────────────────
    department: {
      type: String,
      enum: [
        "after-sales",
        "sales",
        "business-development",
        "marketing",
        "cam",              // Customer Account Management
        "customer-executive",
        "admin",
        "hr",
        "finance",
        "it",
        "other",
      ],
      required: true,
      index: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Senior Sales Executive", "Marketing Coordinator"
    },

    reportingTo: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
      // Manager/supervisor this staff reports to
    },

    // ─── Employment Details ──────────────────────────────────────────────────
    joiningDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "intern"],
      default: "full-time",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "on-leave", "terminated", "suspended"],
      default: "active",
      index: true,
    },

    // ─── Address ─────────────────────────────────────────────────────────────
    presentAddress: {
      type: String,
      trim: true,
      default: "",
    },

    permanentAddress: {
      type: String,
      trim: true,
      default: "",
    },

    // ─── Salary ──────────────────────────────────────────────────────────────
    basicSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ─── Leave Balance ───────────────────────────────────────────────────────
    leaveBalance: {
      sickLeave: { type: Number, default: 14 },
      casualLeave: { type: Number, default: 10 },
      annualLeave: { type: Number, default: 21 },
      earnedLeave: { type: Number, default: 0 },
    },

    // ─── Work Schedule ───────────────────────────────────────────────────────
    workingDays: {
      type: [String],
      enum: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      default: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
    },

    officeStartTime: {
      type: String,   // e.g. "09:00"
      default: "09:00",
    },

    officeEndTime: {
      type: String,   // e.g. "18:00"
      default: "18:00",
    },

    // ─── Bio ─────────────────────────────────────────────────────────────────
    bio: {
      type: String,
      default: "",
      trim: true,
    },

    // ─── Social / LinkedIn ───────────────────────────────────────────────────
    linkedIn: {
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

// ─── Pre-save: Generate Staff ID ───────────────────────────────────────────────
/**
 * Format: FJRS<MM><YYYY><sequence>
 * Example: FJRS0720261001
 * Loops until a unique ID is guaranteed (avoids duplicates on deletion / concurrent saves).
 */
staffSchema.pre("save", async function () {
  if (this.staffId) return;

  const joinDate = this.joiningDate || new Date();
  const month = String(joinDate.getMonth() + 1).padStart(2, "0");
  const year = joinDate.getFullYear();

  const startDate = new Date(year, joinDate.getMonth(), 1);
  const endDate = new Date(year, joinDate.getMonth() + 1, 1);

  let count = await this.constructor.countDocuments({
    joiningDate: { $gte: startDate, $lt: endDate },
  });

  let candidateId;
  let exists = true;

  while (exists) {
    const sequence = String(1000 + count).padStart(4, "0");
    candidateId = `FJRS${month}${year}${sequence}`;
    exists = await this.constructor.exists({ staffId: candidateId });
    if (exists) count++;
  }

  this.staffId = candidateId;
});

// ─── Pre-save: Hash Password ───────────────────────────────────────────────────
staffSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ─── Method: Compare Password ──────────────────────────────────────────────────
staffSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// ─── toJSON: Remove password ───────────────────────────────────────────────────
staffSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

// ─── Indexes ───────────────────────────────────────────────────────────────────
staffSchema.index({ createdAt: -1 });
staffSchema.index({ department: 1, status: 1 });
staffSchema.index({ fullName: "text", email: "text", designation: "text" });

export const StaffModel =
  mongoose.models.Staff ?? mongoose.model("Staff", staffSchema);
