import mongoose, { Schema } from "mongoose";

/**
 * TeacherGems — persistent gems (points) for each teacher.
 *
 * Earning rules:
 *  +1  class_scheduled       — teacher scheduled a new class
 *  +3  class_completed       — teacher properly ended a class
 *  +2  student_present       — student was marked present when class ended
 *  +1  notes_bonus           — teacher added notes when ending class
 *  +5  streak_7              — completed a class every day for 7 consecutive days
 *  +20 streak_30             — completed a class every day for 30 consecutive days
 *
 * Deduction rules:
 *  -2  class_cancelled       — teacher cancelled a scheduled class
 *  -1  class_reset           — teacher reset a mid-session class (abandoned)
 *  -1  student_absent        — student was marked absent when class ended
 *  -10 early_start_penalty   — teacher started class 10+ min before scheduled time
 *  -20 not_ended_penalty     — class not ended within 10 min after scheduled end time
 */

const gemHistorySchema = new Schema(
  {
    action: {
      type: String,
      enum: [
        "class_scheduled",
        "class_completed",
        "student_present",
        "student_absent",
        "notes_bonus",
        "class_cancelled",
        "class_reset",
        "streak_7",
        "streak_30",
        "ceo_meeting",
        "early_start_penalty",
        "not_ended_penalty",
        "admin_adjustment",
      ],
      required: true,
    },
    gems: { type: Number, required: true }, // positive or negative
    ref: { type: Schema.Types.ObjectId, default: null }, // classSession _id
    note: { type: String, default: "" }, // Admin notes or reasons
  },
  { timestamps: true, _id: true }
);

const teacherGemsSchema = new Schema(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      unique: true,
      index: true,
    },
    totalGems:     { type: Number, default: 0, min: 0 }, // all-time (floor 0)
    monthlyGems:   { type: Number, default: 0 },          // current month (can go negative)
    monthlyResetAt: { type: Date, default: null },         // when monthly was last reset

    tier: {
      type: String,
      enum: ["starter", "bronze", "silver", "gold", "diamond", "elite"],
      default: "starter",
    },

    // Streak tracking — consecutive calendar days with at least 1 completed class
    streak:        { type: Number, default: 0 },
    lastStreakDate: { type: Date, default: null }, // the last date a class was completed

    // Capped history — keep last 100 entries per teacher
    history: { type: [gemHistorySchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

teacherGemsSchema.index({ totalGems: -1 });   // leaderboard sort
teacherGemsSchema.index({ monthlyGems: -1 });  // monthly leaderboard sort

export const TeacherGemsModel =
  mongoose.models.TeacherGems ||
  mongoose.model("TeacherGems", teacherGemsSchema);
