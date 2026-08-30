import mongoose, { Schema } from "mongoose";

/**
 * OnlineClassAttendance Model
 * 
 * Tracks participant entry, exit, live duration, and attendance status
 * for Zoom Video SDK classroom sessions.
 */
const onlineClassAttendanceSchema = new Schema(
  {
    onlineClass: {
      type: Schema.Types.ObjectId,
      ref: "OnlineClass",
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ["teacher", "student", "admin", "guest"],
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
    },
    joinTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    leaveTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["present", "late", "left-early", "absent"],
      default: "present",
      index: true,
    },
    deviceInfo: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

onlineClassAttendanceSchema.index({ onlineClass: 1, userId: 1 });
onlineClassAttendanceSchema.index({ onlineClass: 1, joinTime: -1 });

export const OnlineClassAttendanceModel =
  mongoose.models.OnlineClassAttendance ||
  mongoose.model("OnlineClassAttendance", onlineClassAttendanceSchema);
