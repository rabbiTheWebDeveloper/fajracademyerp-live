import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const teacherSchema = new Schema(
  {
    teacherId: {
      type: String,
      unique: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "TeacherCategory",
      required: false,
      set: v => v === "" ? undefined : v,
    },

    version: {
      type: [String],
      enum: ["Bangla", "English", "Arabic"],
      default: [],
    },

    email: {
      type: String,
      required: false,          // email is optional — not every teacher has one
      unique: true,
      sparse: true,             // sparse: allows many docs with null/undefined email
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          // Allow empty string (optional field), only validate if a value is provided
          if (!v || v.trim() === "") return true;
          return /^[0-9+\-\s]{10,15}$/.test(v);
        },
        message: "Phone number format is invalid (10-15 digits).",
      },
    },

    emergencyContactNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9+\-\s]{10,15}$/,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
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

    qualifications: [
      {
        degree: {
          type: String,
          trim: true,
        },
        institute: {
          type: String,
          trim: true,
        },
        passingYear: Number,
      },
    ],

    salary: {
      type: Number,
      default: 0,
      min: 0,
    },

    salaryType: {
      type: String,
      enum: ["monthly", "per-student-percentage", "per-student-amount"],
      default: "monthly",
    },

    joinDate: {
      type: Date,
      default: Date.now,
    },

    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    presentAddress: {
      type: String,
      required: true,
      trim: true,
    },

    permanentAddress: {
      type: String,
      required: true,
      trim: true,
    },

    nidOrBirthCertificatePicture: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "on-leave", "terminated"],
      default: "active",
      index: true,
    },

    idCardStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
      index: true,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },

    bio: {
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

/**
 * Normalize empty-string email to undefined so the sparse unique index
 * does not treat "" as a duplicate value across multiple teachers.
 */
teacherSchema.pre("save", function () {
  if (this.email === "" || this.email === null) {
    this.email = undefined;
  }
});

/**
 * Hash password before save
 */
teacherSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

/**
 * Generate Teacher ID
 * Format: FJRT<MM><YYYY><sequence>
 * Loops until a unique ID is found to avoid duplicates caused by
 * deletions, concurrent registrations, or count gaps.
 */
teacherSchema.pre("save", async function () {
  if (this.teacherId) return;

  const joinDate = this.joinDate || new Date();
  const month = String(joinDate.getMonth() + 1).padStart(2, "0");
  const year = joinDate.getFullYear();

  const startDate = new Date(year, joinDate.getMonth(), 1);
  const endDate = new Date(year, joinDate.getMonth() + 1, 1);

  // Start sequence from count of existing teachers this month
  let count = await this.constructor.countDocuments({
    joinDate: { $gte: startDate, $lt: endDate },
  });

  let candidateId;
  let exists = true;

  // Keep incrementing until we find an ID that doesn't already exist
  while (exists) {
    const sequence = String(1030 + count).padStart(4, "0");
    candidateId = `FJRT${month}${year}${sequence}`;
    exists = await this.constructor.exists({ teacherId: candidateId });
    if (exists) count++;
  }

  this.teacherId = candidateId;
});

/**
 * Compare Password
 */
teacherSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

/**
 * Remove password from API response
 */
teacherSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

/**
 * Indexes
 */
teacherSchema.index({ createdAt: -1 });
teacherSchema.index({
  fullName: "text",
  email: "text",
});

export const TeacherModel =
  mongoose.models.Teacher ||
  mongoose.model("Teacher", teacherSchema);