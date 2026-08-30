import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, refPath: "senderModel" },
  senderModel: { type: String, enum: ["User", "Student", "Teacher"] },
  senderName: { type: String, default: "" },
  content: { type: String, required: true },
  attachments: [{ title: String, url: String }],
  sentAt: { type: Date, default: Date.now },
  isInternal: { type: Boolean, default: false }, // staff-only note
});

const supportTicketSchema = new Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    raisedBy: {
      type: Schema.Types.ObjectId,
      refPath: "raisedByModel",
      required: true,
      index: true,
    },
    raisedByModel: {
      type: String,
      enum: ["Student", "Teacher", "User"],
      default: "Student",
    },
    raisedByName: { type: String, default: "" },
    raisedByEmail: { type: String, default: "" },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedToName: { type: String, default: "" },
    category: {
      type: String,
      enum: ["technical", "billing", "academic", "administrative", "general"],
      default: "general",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed", "on-hold"],
      default: "open",
      index: true,
    },
    messages: [messageSchema],
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-generate ticketId before save
supportTicketSchema.pre("save", async function () {
  if (!this.ticketId) {
    const lastDoc = await this.constructor.findOne({}, { ticketId: 1 })
      .sort({ ticketId: -1 });

    let nextSerial = 1;
    if (lastDoc?.ticketId) {
      const match = lastDoc.ticketId.match(/^TKT-(\d+)$/);
      if (match) {
        nextSerial = parseInt(match[1], 10) + 1;
      }
    }

    let finalTicketId = "";
    let serialNum = nextSerial;
    while (!finalTicketId) {
      const candidate = `TKT-${String(serialNum).padStart(4, "0")}`;
      const existing = await this.constructor.findOne({ ticketId: candidate }, { _id: 1 });
      if (!existing) {
        finalTicketId = candidate;
      } else {
        serialNum++;
      }
    }
    this.ticketId = finalTicketId;
  }
});

supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ title: "text", description: "text" });

export const SupportTicketModel =
  mongoose.models.SupportTicket ?? mongoose.model("SupportTicket", supportTicketSchema);
