import mongoose, { Schema } from "mongoose";

const feedbackSchema = new Schema(
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
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comments: {
      type: String,
      default: "",
    },
    teachingClarity: { type: Number, default: 5 },
    punctuality: { type: Number, default: 5 },
    subjectKnowledge: { type: Number, default: 5 },
    behaviorPatience: { type: Number, default: 5 },
    classEngagement: { type: Number, default: 5 },
    useOfClassTime: { type: Number, default: 5 },
    likeMost: { type: String, default: "" },
    couldImprove: { type: String, default: "" },
    issuesConcerns: { type: String, default: "" },
    recommend: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

feedbackSchema.index({ createdAt: -1 });

export const FeedbackModel =
  mongoose.models.Feedback ?? mongoose.model("Feedback", feedbackSchema);
