import mongoose, { Schema } from "mongoose";

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    tag: {
      type: String,
      default: "Notice",
      enum: ["Notice", "Feature Update", "System Update", "Reminder", "Important", "Holiday"],
    },
    tagColor: {
      type: String,
      default: "bg-blue-50 text-blue-700 border-blue-100",
    },
    targetRole: {
      type: String,
      enum: ["all", "teacher", "student", "admin"],
      default: "all",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

announcementSchema.index({ createdAt: -1 });

export const AnnouncementModel =
  mongoose.models.Announcement ?? mongoose.model("Announcement", announcementSchema);
