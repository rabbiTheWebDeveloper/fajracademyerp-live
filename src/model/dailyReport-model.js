import mongoose, { Schema } from "mongoose";

const dailyReportSchema = new Schema(
  {
    classroom: {
      type: Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "daily",
      index: true,
    },
    date: { 
      type: Date, 
      required: true, 
      index: true 
    },
    topicCovered: { 
      type: String, 
      default: "Regular Session" 
    },
    studentsPresent: { 
      type: Number, 
      default: 0 
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    feedback: [
      {
        role: { type: String, required: true },
        message: { type: String, required: true },
        givenBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for the most common query patterns
dailyReportSchema.index({ recordedBy: 1, date: -1 });          // stats: today/monthly counts
dailyReportSchema.index({ classroom: 1, date: -1 });           // report list by classroom
dailyReportSchema.index({ recordedBy: 1, classroom: 1, date: -1 }); // full lookup combo

export const DailyReportModel =
  mongoose.models.DailyReport ?? mongoose.model("DailyReport", dailyReportSchema);
