import mongoose, { Schema } from "mongoose";

const classSessionSchema = new Schema({
  title: { type: String, required: true },
  date: { type: Date, default: Date.now },
  summary: { type: String, default: "" },
});

const classroomSchema = new Schema(
  {
    classroomId: {
      type: String,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
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
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    sessions: [classSessionSchema],
    status: {
      type: String,
      enum: ["active", "inactive", "completed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-generate classroomId before save
classroomSchema.pre("save", async function () {
  if (!this.classroomId) {
    const lastDoc = await this.constructor.findOne({}, { classroomId: 1 })
      .sort({ classroomId: -1 });

    let nextSerial = 1;
    if (lastDoc?.classroomId) {
      const match = lastDoc.classroomId.match(/^CLS-(\d+)$/);
      if (match) {
        nextSerial = parseInt(match[1], 10) + 1;
      }
    }

    let finalClassroomId = "";
    let serialNum = nextSerial;
    while (!finalClassroomId) {
      const candidate = `CLS-${String(serialNum).padStart(3, "0")}`;
      const existing = await this.constructor.findOne({ classroomId: candidate }, { _id: 1 });
      if (!existing) {
        finalClassroomId = candidate;
      } else {
        serialNum++;
      }
    }
    this.classroomId = finalClassroomId;
  }
});

// Compound indexes for fast teacher-specific queries
classroomSchema.index({ teacher: 1, status: 1 });   // lookup classrooms by teacher+status
classroomSchema.index({ teacher: 1, createdAt: -1 }); // teacher's classroom list sorted by newest

export const ClassroomModel =
  mongoose.models.Classroom ?? mongoose.model("Classroom", classroomSchema);
