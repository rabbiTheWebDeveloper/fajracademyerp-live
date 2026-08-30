import mongoose, { Schema } from "mongoose";

const submissionSchema = new Schema(
  {
    assessment: {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    content: { type: String, default: "" },
    attachments: [{ title: String, url: String }],
    marks: { type: Number, default: null },
    feedback: { type: String, default: "" },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
    gradedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["submitted", "graded", "late", "absent", "returned"],
      default: "submitted",
      index: true,
    },
    isLate: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

submissionSchema.index({ assessment: 1, student: 1 }, { unique: true });
submissionSchema.index({ createdAt: -1 });

export const SubmissionModel =
  mongoose.models.Submission ?? mongoose.model("Submission", submissionSchema);
