import mongoose, { Schema } from "mongoose";

const paymentInfoSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: 'userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['User', 'Teacher']
    },
    method: { type: String, default: "Mobile Money" },
    accountName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    bankName: { type: String, default: "" },
    branchName: { type: String, default: "" },
    routingNumber: { type: String, default: "" },
    accountType: { type: String, default: "Savings" },
    lastUpdatedMonth: { type: String, default: "" }, // Format: "YYYY-MM"
    updateCountThisMonth: { type: Number, default: 0 },
    updateCount: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure a user only has one active payment info record
paymentInfoSchema.index({ userId: 1 }, { unique: true });

export const PaymentInfoModel = mongoose.models.PaymentInfo || mongoose.model("PaymentInfo", paymentInfoSchema);
