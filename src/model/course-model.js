import mongoose, { Schema } from "mongoose";
const courseSchema = new Schema(
  {
    courseId: {
      type: String,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    enrolledCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    thumbnail: { type: String, default: "" },
    language: { type: String, default: "English" },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-generate courseId before save
courseSchema.pre("save", async function () {
  if (!this.courseId) {
    const lastDoc = await this.constructor.findOne({}, { courseId: 1 })
      .sort({ courseId: -1 });

    let nextSerial = 1;
    if (lastDoc?.courseId) {
      const match = lastDoc.courseId.match(/^CRS-(\d+)$/);
      if (match) {
        nextSerial = parseInt(match[1], 10) + 1;
      }
    }

    let finalCourseId = "";
    let serialNum = nextSerial;
    while (!finalCourseId) {
      const candidate = `CRS-${String(serialNum).padStart(3, "0")}`;
      const existing = await this.constructor.findOne({ courseId: candidate }, { _id: 1 });
      if (!existing) {
        finalCourseId = candidate;
      } else {
        serialNum++;
      }
    }
    this.courseId = finalCourseId;
  }
});

courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: "text", description: "text" });

export const CourseModel =
  mongoose.models.Course ?? mongoose.model("Course", courseSchema);
