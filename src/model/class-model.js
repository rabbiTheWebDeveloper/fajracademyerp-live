import mongoose, { Schema } from "mongoose";

/**
 * ClassSession Model
 *
 * Session lifecycle:
 *   scheduled  → teacher created it, waiting to start
 *   in-progress → teacher clicked "Start Class" (startedAt set)
 *   completed  → teacher clicked "End Class"   (endedAt set, actualDuration computed)
 *   cancelled  → removed before it started
 */
const classSessionSchema = new Schema(
  {
    classId: { type: String, unique: true, index: true },

    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    course:  { type: Schema.Types.ObjectId, ref: "Course",  required: true, index: true },

    // Scheduled day/time (HH:MM 24h)
    dayOfWeek: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: true,
    },
    startTime: { type: String, required: true },  // "HH:MM" — scheduled start
    endTime:   { type: String, required: true },  // "HH:MM" — scheduled end (startTime + 45 min)

    // Duration in minutes — set by teacher when scheduling (15–180 min, default 45)
    duration: { type: Number, default: 45 },

    // Lifecycle status
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled", "paused"],
      default: "scheduled",
      index: true,
    },

    // Actual session timestamps (set when teacher starts/ends)
    startedAt:      { type: Date, default: null },  // when teacher clicked "Start"
    endedAt:        { type: Date, default: null },  // when teacher clicked "End"
    actualDuration: { type: Number, default: null }, // real minutes the class ran

    // Student attendance for this session (marked when teacher ends the class)
    studentAttendance: {
      type: String,
      enum: ["present", "absent", "not-marked"],
      default: "not-marked",
      index: true,
    },

    notes: { type: String, default: "", trim: true },
    meetLink: { type: String, default: null },
    topic: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

// Auto-generate classId before save
classSessionSchema.pre("save", async function () {
  if (!this.classId) {
    const lastDoc = await this.constructor.findOne({}, { classId: 1 })
      .sort({ classId: -1 });

    let nextSerial = 1;
    if (lastDoc?.classId) {
      const match = lastDoc.classId.match(/^CLS-(\d+)$/);
      if (match) {
        nextSerial = parseInt(match[1], 10) + 1;
      }
    }

    let finalClassId = "";
    let serialNum = nextSerial;
    while (!finalClassId) {
      const candidate = `CLS-${String(serialNum).padStart(4, "0")}`;
      const existing = await this.constructor.findOne({ classId: candidate }, { _id: 1 });
      if (!existing) {
        finalClassId = candidate;
      } else {
        serialNum++;
      }
    }
    this.classId = finalClassId;
  }
});

classSessionSchema.index({ teacher: 1, status: 1 });
classSessionSchema.index({ teacher: 1, dayOfWeek: 1, startTime: 1 });
classSessionSchema.index({ teacher: 1, studentAttendance: 1 });
classSessionSchema.index({ student: 1, dayOfWeek: 1 });
classSessionSchema.index({ createdAt: -1 });

if (mongoose.models.ClassSession) {
  delete mongoose.models.ClassSession;
}

export const ClassSessionModel = mongoose.model("ClassSession", classSessionSchema);
