import mongoose, { Schema } from "mongoose";

const noticeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: [String], required: true },
    bottomQuote: { type: String },
    modalDuration: { type: String, default: "10s" }, // Duration in days for which the modal should not show again defult 10s see then close button appere to user and 10d means 10 days 
    signOff: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    targetRole: {
      type: String,
      enum: ["all", "teacher", "student", "admin","staff"],
      default: "all",
      index: true,
    },
    archiveDate: { type: Date }, // Date when this notice should stop showing or be archived
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    versionKey: false,
  }
);

noticeSchema.index({ createdAt: -1 });

export const NoticeModel = mongoose.models.Notice ?? mongoose.model("Notice", noticeSchema);
