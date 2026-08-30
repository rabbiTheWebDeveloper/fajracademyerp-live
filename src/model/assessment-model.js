import mongoose, { Schema } from "mongoose";

const assessmentSchema = new Schema(
  {
    assessmentId: {
      type: String,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["exam", "assignment", "quiz"],
      required: true,
      index: true,
    },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "upcoming", "active", "grading", "completed"],
      default: "draft",
      index: true,
    },
    instructions: { type: String, default: "" },
    totalMarks: { type: Number, default: 100 },
    passingMarks: { type: Number, default: 50 },
    duration: { type: Number, default: 60 }, // minutes
    totalStudents: { type: Number, default: 0 },
    submissionsCount: { type: Number, default: 0 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      index: true,
    },
    attachments: [{ title: String, url: String }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-generate assessmentId before save
assessmentSchema.pre("save", async function () {
  if (!this.assessmentId) {
    const prefix = this.type === "exam" ? "EX" : this.type === "quiz" ? "QZ" : "AS";
    const lastDoc = await this.constructor.findOne(
      { assessmentId: { $regex: new RegExp(`^${prefix}-`) } },
      { assessmentId: 1 }
    ).sort({ assessmentId: -1 });

    let nextSerial = 1;
    if (lastDoc?.assessmentId) {
      const parts = lastDoc.assessmentId.split("-");
      const lastSerialNum = parseInt(parts[1], 10);
      if (!isNaN(lastSerialNum)) {
        nextSerial = lastSerialNum + 1;
      }
    }

    let finalAssessmentId = "";
    let serialNum = nextSerial;
    while (!finalAssessmentId) {
      const candidate = `${prefix}-${String(serialNum).padStart(3, "0")}`;
      const existing = await this.constructor.findOne({ assessmentId: candidate }, { _id: 1 });
      if (!existing) {
        finalAssessmentId = candidate;
      } else {
        serialNum++;
      }
    }
    this.assessmentId = finalAssessmentId;
  }
});

assessmentSchema.index({ createdAt: -1 });
assessmentSchema.index({ title: "text" });

export const AssessmentModel =
  mongoose.models.Assessment ?? mongoose.model("Assessment", assessmentSchema);
