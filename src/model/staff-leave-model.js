import mongoose, { Schema } from "mongoose";

/**
 * Staff Leave Application Model
 * Tracks leave requests, approvals, and rejections for all staff members.
 */
const staffLeaveSchema = new Schema(
  {
    staff: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },

    leaveType: {
      type: String,
      enum: [
        "sick-leave",
        "casual-leave",
        "annual-leave",
        "emergency-leave",
        "maternity-leave",
        "paternity-leave",
        "earned-leave",
        "unpaid-leave",
      ],
      required: true,
      index: true,
    },

    fromDate: {
      type: Date,
      required: true,
      index: true,
    },

    toDate: {
      type: Date,
      required: true,
    },

    /**
     * Total number of working days requested.
     * Calculated and stored at the time of application.
     */
    totalDays: {
      type: Number,
      required: true,
      min: 0.5, // Half-day leave allowed
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Optional supporting document (e.g. doctor's certificate for sick leave).
     */
    attachmentUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },

    /**
     * Admin/manager who took action on this leave request.
     */
    actionBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    actionAt: {
      type: Date,
      default: null,
    },

    /**
     * Remarks from the approver/rejector.
     */
    actionRemark: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Efficient queries
staffLeaveSchema.index({ staff: 1, status: 1 });
staffLeaveSchema.index({ staff: 1, fromDate: -1 });
staffLeaveSchema.index({ status: 1, createdAt: -1 });
staffLeaveSchema.index({ fromDate: 1, toDate: 1 });

export const StaffLeaveModel =
  mongoose.models.StaffLeave ??
  mongoose.model("StaffLeave", staffLeaveSchema);
