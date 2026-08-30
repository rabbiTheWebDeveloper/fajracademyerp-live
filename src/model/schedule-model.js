import mongoose, { Schema } from "mongoose";

const scheduleSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      index: true,
    },
    weekly_days: {
      type: Number,
      default: 0,
    },
    weekly_days_list: [
      {
        type: String,
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      },
    ],
    dayOfWeek: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    duration: { type: Number, default: 45 },
    day_times: [
      {
        day: {
          type: String,
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
          required: true,
        },
        startTime: { type: String, default: "" },
        endTime: { type: String, default: "" },
        duration: { type: Number, default: 45 },
      },
    ],
    type: {
      type: String,
      enum: ["live", "recorded", "hybrid"],
      default: "live",
    },

    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

scheduleSchema.index({ dayOfWeek: 1, startTime: 1 });

if (mongoose.models.Schedule) {
  delete mongoose.models.Schedule;
}

export const ScheduleModel = mongoose.model("Schedule", scheduleSchema);
