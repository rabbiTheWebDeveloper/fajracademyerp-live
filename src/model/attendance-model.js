import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      required: true,
      index: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
    session: { type: String, default: "" }, // e.g. "Morning Session"
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

attendanceSchema.index({ student: 1, course: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });

export const AttendanceModel =
  mongoose.models.Attendance ?? mongoose.model("Attendance", attendanceSchema);
