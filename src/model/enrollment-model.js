import mongoose, { Schema } from "mongoose";

const enrollmentSchema = new Schema(
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
    enrollmentDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "completed", "dropped", "suspended"],
      default: "active",
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completionDate: { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "partial", "waived"],
      default: "pending",
      index: true,
    },
    lastAccessedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ createdAt: -1 });

export const EnrollmentModel =
  mongoose.models.Enrollment ?? mongoose.model("Enrollment", enrollmentSchema);
