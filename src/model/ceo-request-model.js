import mongoose, { Schema } from "mongoose";

const ceoRequestSchema = new Schema(
  {
    requestId: {
      type: String,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["meeting_request", "problem_report"],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    teacherName: { type: String, default: "" },
    teacherEmail: { type: String, default: "" },
    teacherPhone: { type: String, default: "" },
    teacherDesignation: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "seen", "in-review", "responded", "closed"],
      default: "pending",
      index: true,
    },
    adminResponse: { type: String, default: "" },
    respondedBy: { type: String, default: "" },
    respondedAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
    telegramSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-generate requestId before save
ceoRequestSchema.pre("save", async function () {
  if (!this.requestId) {
    const count = await this.constructor.countDocuments();
    let serial = count + 1;
    let finalId = "";
    while (!finalId) {
      const candidate = `CEO-${String(serial).padStart(4, "0")}`;
      const existing = await this.constructor.findOne({ requestId: candidate }, { _id: 1 });
      if (!existing) finalId = candidate;
      else serial++;
    }
    this.requestId = finalId;
  }
});

ceoRequestSchema.index({ createdAt: -1 });

export const CeoRequestModel =
  mongoose.models.CeoRequest ?? mongoose.model("CeoRequest", ceoRequestSchema);
