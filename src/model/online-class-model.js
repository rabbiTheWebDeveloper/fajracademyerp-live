import mongoose, { Schema } from "mongoose";

/**
 * OnlineClass Model
 * 
 * Supports Zoom Video SDK Web integration.
 * Stores scheduled/in-progress/completed online classes with Zoom session identifier.
 */
const onlineClassSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Class title or subject is required"],
      trim: true,
    },
    topic: {
      type: String,
      default: "",
      trim: true,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    // Associated Teacher
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher is required"],
      index: true,
    },
    // Associated Student (for 1-on-1 or designated primary student)
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    // Optional Course reference
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    // Optional link to existing ClassSession
    classSession: {
      type: Schema.Types.ObjectId,
      ref: "ClassSession",
      default: null,
      index: true,
    },
    // Video meeting platform: livekit | google-meet | zoom
    platform: {
      type: String,
      enum: ["livekit", "google-meet", "zoom"],
      default: "livekit",
      index: true,
    },
    // Direct meeting link (for Google Meet or external rooms)
    meetLink: {
      type: String,
      default: "",
      trim: true,
    },
    // Zoom/LiveKit session identifier (topic/channel name used for Video SDK join)
    sessionName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionPassword: {
      type: String,
      default: "",
    },
    // Schedule details
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
      index: true,
    },
    scheduledStartTime: {
      type: String,
      required: [true, "Start time (HH:MM) is required"],
    },
    scheduledEndTime: {
      type: String,
      default: "",
    },
    duration: {
      type: Number,
      default: 45, // Duration in minutes
    },
    // Lifecycle status: scheduled -> in-progress -> completed (or cancelled)
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    actualDuration: {
      type: Number,
      default: null, // Computed in minutes upon end of class
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for fast lookup
onlineClassSchema.index({ teacher: 1, status: 1 });
onlineClassSchema.index({ student: 1, status: 1 });
onlineClassSchema.index({ scheduledDate: -1 });
onlineClassSchema.index({ createdAt: -1 });

export const OnlineClassModel =
  mongoose.models.OnlineClass || mongoose.model("OnlineClass", onlineClassSchema);
