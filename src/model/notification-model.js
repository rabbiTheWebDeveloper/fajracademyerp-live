import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "warning", "success", "alert", "announcement"],
      default: "info",
      index: true,
    },
    category: {
      type: String,
      enum: ["payment", "academic", "attendance", "support", "system", "general"],
      default: "general",
    },
    recipients: [
      {
        type: Schema.Types.ObjectId,
        refPath: "recipientModel",
      },
    ],
    recipientModel: {
      type: String,
      enum: ["User", "Student", "Teacher", "all"],
      default: "all",
    },
    readBy: [{ type: Schema.Types.ObjectId }],
    link: { type: String, default: "" },
    icon: { type: String, default: "" },
    isGlobal: { type: Boolean, default: false }, // broadcast to everyone
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification ?? mongoose.model("Notification", notificationSchema);
