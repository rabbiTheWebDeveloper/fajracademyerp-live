import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true, default: "" },
    emergencyContactNumber: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "Administrator" },
    employeeId: { type: String, trim: true, default: "" },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: "",
    },
    department: { type: String, trim: true, default: "Administration" },
    password: { type: String, required: true },
    role: {
      type: String,
      default: "admin",
      index: true,
    },
    avatar: { type: String, default: "" },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
    lastLogin: { type: Date, default: null },
    emailVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1, role: 1 });

export const UserModel =
  mongoose.models.User ?? mongoose.model("User", userSchema);
