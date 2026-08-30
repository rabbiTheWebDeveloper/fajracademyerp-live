import mongoose, { Schema } from "mongoose";

const teacherAttendanceSchema = new Schema(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

teacherAttendanceSchema.index({ teacher: 1, date: -1 }, { unique: true });

export const TeacherAttendanceModel =
  mongoose.models.TeacherAttendance ?? mongoose.model("TeacherAttendance", teacherAttendanceSchema);
