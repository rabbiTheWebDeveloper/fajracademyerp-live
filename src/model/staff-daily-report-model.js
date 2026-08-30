import mongoose, { Schema } from "mongoose";

/**
 * Staff Daily Work Report Model
 * One record = one staff member's end-of-day report for a specific date.
 * Compound unique index prevents duplicate submissions per staff per day.
 */
const staffDailyReportSchema = new Schema(
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

    /**
     * Short summary of the day's work.
     */
    summary: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Structured list of completed tasks.
     */
    tasksCompleted: [
      {
        title: { type: String, required: true, trim: true },
        category: {
          type: String,
          enum: ["sales", "marketing", "bd", "cam", "support", "admin", "meeting", "training", "other"],
          default: "other",
        },
        // Estimated hours spent on this task
        hoursSpent: { type: Number, default: 0, min: 0 },
      },
    ],

    /**
     * Blockers or issues faced during the day.
     */
    challenges: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * Plan for the next working day.
     */
    nextDayPlan: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * KPIs / key numbers for the day (department-specific).
     * Stored as flexible key-value pairs.
     * Examples: { callsMade: 15, leadsConverted: 2, emailsSent: 30 }
     */
    kpiData: {
      type: Map,
      of: Number,
      default: {},
    },

    /**
     * Mood / energy level self-reported by the staff member.
     */
    mood: {
      type: String,
      enum: ["excellent", "good", "neutral", "tired", "stressed"],
      default: "good",
    },

    /**
     * Review status — set by manager/admin.
     */
    status: {
      type: String,
      enum: ["submitted", "reviewed", "needs-revision"],
      default: "submitted",
      index: true,
    },

    /**
     * Manager's feedback on this daily report.
     */
    reviewNote: {
      type: String,
      trim: true,
      default: "",
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicate report per staff per day
staffDailyReportSchema.index({ staff: 1, date: 1 }, { unique: true });

// Common query patterns
staffDailyReportSchema.index({ staff: 1, date: -1 });
staffDailyReportSchema.index({ date: -1, status: 1 });
staffDailyReportSchema.index({ staff: 1, status: 1 });

export const StaffDailyReportModel =
  mongoose.models.StaffDailyReport ??
  mongoose.model("StaffDailyReport", staffDailyReportSchema);
