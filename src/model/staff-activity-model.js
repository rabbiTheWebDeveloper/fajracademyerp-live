import mongoose, { Schema } from "mongoose";

/**
 * Staff Activity Log Model
 * Tracks granular work activities throughout the day.
 * Multiple activity logs can exist per staff per day (unlike daily reports which are one per day).
 */
const staffActivitySchema = new Schema(
  {
    staff: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "sales-call",
        "email",
        "meeting",
        "research",
        "admin",
        "marketing",
        "support",
        "training",
        "bd",
        "other",
      ],
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
      index: true,
    },

    status: {
      type: String,
      enum: ["todo", "in-progress", "done", "cancelled"],
      default: "todo",
      index: true,
    },

    startTime: {
      type: String,    // e.g. "09:30"
      default: null,
    },

    endTime: {
      type: String,    // e.g. "10:15"
      default: null,
    },

    /**
     * Duration in minutes — calculated on completion.
     * Stored for quick reporting without recomputing.
     */
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Outcome or result of the activity (optional free-text).
     * e.g. "Lead converted", "Meeting scheduled for Friday"
     */
    outcome: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * Linked resource (optional) — e.g. a lead ID, student ID, etc.
     */
    relatedTo: {
      type: String,   // Free-form reference — flexible for any department
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Common query patterns
staffActivitySchema.index({ staff: 1, date: -1 });
staffActivitySchema.index({ staff: 1, date: 1, status: 1 });
staffActivitySchema.index({ staff: 1, category: 1, date: -1 });
staffActivitySchema.index({ date: -1, status: 1 });

export const StaffActivityModel =
  mongoose.models.StaffActivity ??
  mongoose.model("StaffActivity", staffActivitySchema);
