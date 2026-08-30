import mongoose, { Schema } from "mongoose";

const emailLogSchema = new Schema(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["success", "failed"], default: "success", index: true },
    sentBy: { type: String, default: "System Admin" },
    error: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

emailLogSchema.index({ createdAt: -1 });

export const EmailLogModel = mongoose.models.EmailLog ?? mongoose.model("EmailLog", emailLogSchema);
