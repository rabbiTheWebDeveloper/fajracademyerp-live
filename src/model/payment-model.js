import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },
    type: {
      type: String,
      enum: ["admission-fee", "monthly-fee", "installment", "refund"],
      default: "monthly-fee",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "refunded", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["credit-card", "bank-transfer", "paypal", "cash", "mobile-banking", "other"],
      default: "other",
    },
    paymentMethodDetails: { type: String, default: "" }, // e.g. "ending in 4242"
    invoiceId: { type: String, unique: true },
    mrNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
    month: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    print: { type: Boolean, default: false },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-generate IDs before save
paymentSchema.pre("save", async function () {
  if (!this.transactionId) {
    const lastDoc = await this.constructor.findOne({}, { transactionId: 1 })
      .sort({ transactionId: -1 });

    let nextSerial = 1;
    if (lastDoc?.transactionId) {
      const match = lastDoc.transactionId.match(/^TXN-(\d+)$/);
      if (match) {
        nextSerial = parseInt(match[1], 10) + 1;
      }
    }

    let finalTransactionId = "";
    let serialNum = nextSerial;
    while (!finalTransactionId) {
      const candidate = `TXN-${String(serialNum).padStart(3, "0")}`;
      const existing = await this.constructor.findOne({ transactionId: candidate }, { _id: 1 });
      if (!existing) {
        finalTransactionId = candidate;
      } else {
        serialNum++;
      }
    }
    this.transactionId = finalTransactionId;
  }
  if (!this.invoiceId) {
    const now = new Date();
    const year = now.getFullYear();
    const lastDoc = await this.constructor.findOne(
      { invoiceId: { $regex: new RegExp(`^INV-${year}-`) } },
      { invoiceId: 1 }
    ).sort({ invoiceId: -1 });

    let nextSerial = 1;
    if (lastDoc?.invoiceId) {
      const parts = lastDoc.invoiceId.split("-");
      const lastSerialNum = parseInt(parts[2], 10);
      if (!isNaN(lastSerialNum)) {
        nextSerial = lastSerialNum + 1;
      }
    }

    let finalInvoiceId = "";
    let serialNum = nextSerial;
    while (!finalInvoiceId) {
      const candidate = `INV-${year}-${String(serialNum).padStart(3, "0")}`;
      const existing = await this.constructor.findOne({ invoiceId: candidate }, { _id: 1 });
      if (!existing) {
        finalInvoiceId = candidate;
      } else {
        serialNum++;
      }
    }
    this.invoiceId = finalInvoiceId;
  }
});

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ paidAt: -1 });

if (mongoose.models.Payment) {
  delete mongoose.models.Payment;
}

export const PaymentModel = mongoose.model("Payment", paymentSchema);
