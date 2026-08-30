import mongoose, { Schema } from "mongoose";

/**
 * Staff Attendance Model
 * One document = one staff member's attendance for one day.
 * Compound unique index prevents duplicate entries per staff per day.
 */
const staffAttendanceSchema = new Schema(
  {
    staff: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "late", "half-day", "on-leave", "holiday"],
      required: true,
      index: true,
    },

    checkInTime: {
      type: String,  // e.g. "09:05"
      default: null,
    },

    checkOutTime: {
      type: String,  // e.g. "18:15"
      default: null,
    },

    /**
     * Working hours in minutes, calculated from checkIn → checkOut.
     * Populated via API after checkout.
     */
    workingMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Marked by admin / manager (null = self check-in)
     */
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicate attendance per staff per day
staffAttendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

// Common query patterns
staffAttendanceSchema.index({ date: -1 });
staffAttendanceSchema.index({ staff: 1, date: -1 });
staffAttendanceSchema.index({ staff: 1, status: 1 });

export const StaffAttendanceModel =
  mongoose.models.StaffAttendance ??
  mongoose.model("StaffAttendance", staffAttendanceSchema);
