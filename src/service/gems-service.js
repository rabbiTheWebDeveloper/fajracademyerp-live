import { dbConnect } from "@/service/mongo";
import { TeacherGemsModel } from "@/model/teacher-gems-model";
import mongoose from "mongoose";

// ── Tier definitions (sorted ascending by minGems) ───────────────────────────
export const TIERS = [
  { name: "starter",  label: "Starter",          emoji: "🌱", minGems: 0,      maxGems: 99 },
  { name: "bronze",   label: "Bronze Instructor", emoji: "🥉", minGems: 100,    maxGems: 499 },
  { name: "silver",   label: "Silver Instructor", emoji: "🥈", minGems: 500,    maxGems: 1499 },
  { name: "gold",     label: "Gold Instructor",   emoji: "🥇", minGems: 1500,   maxGems: 4999 },
  { name: "diamond",  label: "Diamond Instructor",emoji: "💎", minGems: 5000,   maxGems: 9999 },
  { name: "elite",    label: "Elite Master",      emoji: "👑", minGems: 10000,  maxGems: Infinity },
];

// Gem values per action (negative = deduction)
export const GEM_VALUES = {
  class_scheduled:    1,
  class_completed:    3,
  student_present:    2,
  student_absent:    -1,
  notes_bonus:        1,
  class_cancelled:   -2,
  class_reset:       -1,
  streak_7:           5,
  streak_30:         20,
  early_start_penalty: -10,  // Started 10+ min before scheduled time
  not_ended_penalty:   -20,  // Class not ended within 10 min after scheduled end time
};

export function getTierInfo(totalGems) {
  const t = [...TIERS].reverse().find((t) => totalGems >= t.minGems) || TIERS[0];
  const next = TIERS.find((tier) => tier.minGems > totalGems) || null;
  const progressToNext = next
    ? Math.round(((totalGems - t.minGems) / (next.minGems - t.minGems)) * 100)
    : 100;
  return { ...t, next, progressToNext };
}

/**
 * Award (or deduct) gems for a teacher action.
 * @param {string} teacherId  — Teacher._id (string or ObjectId)
 * @param {string} action     — key from GEM_VALUES
 * @param {string|null} refId — ClassSession._id (optional)
 * @returns {{ gems: number, totalGems: number, monthlyGems: number, tier: object, streakBonus: number }}
 */
export async function awardGems(teacherId, action, refId = null) {
  await dbConnect();

  const gems = GEM_VALUES[action];
  if (gems === undefined) throw new Error(`Unknown gem action: ${action}`);

  const tid = typeof teacherId === "string"
    ? new mongoose.Types.ObjectId(teacherId)
    : teacherId;

  // ── Monthly reset check ──────────────────────────────────────────────────
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Streak update (only for class_completed) ─────────────────────────────
  let streakBonus = 0;

  // Upsert the gems doc
  const doc = await TeacherGemsModel.findOneAndUpdate(
    { teacher: tid },
    { $setOnInsert: { teacher: tid } },
    { upsert: true, new: true }
  );

  // Reset monthly gems if new month
  if (!doc.monthlyResetAt || doc.monthlyResetAt < firstOfMonth) {
    doc.monthlyGems = 0;
    doc.monthlyResetAt = firstOfMonth;
  }

  // Add gems
  doc.monthlyGems = (doc.monthlyGems || 0) + gems;
  doc.totalGems   = Math.max(0, (doc.totalGems || 0) + gems); // floor at 0

  // Streak logic — only on class_completed
  if (action === "class_completed") {
    const todayStr = now.toISOString().split("T")[0];
    const lastStr  = doc.lastStreakDate
      ? new Date(doc.lastStreakDate).toISOString().split("T")[0]
      : null;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastStr === todayStr) {
      // Already counted today — no streak change
    } else if (lastStr === yesterdayStr) {
      // Consecutive day
      doc.streak = (doc.streak || 0) + 1;
      doc.lastStreakDate = now;
    } else {
      // Streak broken or first class
      doc.streak = 1;
      doc.lastStreakDate = now;
    }

    // ✅ Fixed: Award streak_7 every multiple of 7 (7, 14, 21...) up to streak 29
    //    and streak_30 exactly at 30. Previously the condition was logically impossible.
    if (doc.streak > 0 && doc.streak % 7 === 0 && doc.streak < 30) {
      streakBonus = GEM_VALUES.streak_7;
      doc.totalGems   = Math.max(0, doc.totalGems + streakBonus);
      doc.monthlyGems = doc.monthlyGems + streakBonus;
      doc.history.push({ action: "streak_7", gems: streakBonus, ref: refId });
    } else if (doc.streak === 30) {
      streakBonus = GEM_VALUES.streak_30;
      doc.totalGems   = Math.max(0, doc.totalGems + streakBonus);
      doc.monthlyGems = doc.monthlyGems + streakBonus;
      doc.history.push({ action: "streak_30", gems: streakBonus, ref: refId });
    }
  }

  // Recalculate tier
  const tierInfo = getTierInfo(doc.totalGems);
  doc.tier = tierInfo.name;

  // Add to history (cap at 100 entries)
  doc.history.push({ action, gems, ref: refId || null });
  if (doc.history.length > 100) {
    doc.history = doc.history.slice(-100);
  }

  await doc.save();

  return {
    gems,
    streakBonus,
    totalGems:   doc.totalGems,
    monthlyGems: doc.monthlyGems,
    streak:      doc.streak,
    tier:        tierInfo,
  };
}

/**
 * ✅ OPTIMIZED: Award multiple gem actions in a SINGLE DB round-trip.
 * Replaces calling awardGems() 2–4 times sequentially on class end.
 *
 * @param {string} teacherId  — Teacher._id (string or ObjectId)
 * @param {Array<{action: string, refId?: string|null}>} actions — list of actions to apply
 * @returns {{ totalGems, monthlyGems, streak, tier, breakdown }}
 */
export async function awardGemsMultiple(teacherId, actions, defaultRefId = null) {
  await dbConnect();

  const tid = typeof teacherId === "string"
    ? new mongoose.Types.ObjectId(teacherId)
    : teacherId;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Upsert the gems doc in one query
  const doc = await TeacherGemsModel.findOneAndUpdate(
    { teacher: tid },
    { $setOnInsert: { teacher: tid } },
    { upsert: true, new: true }
  );

  // Reset monthly gems if new month
  if (!doc.monthlyResetAt || doc.monthlyResetAt < firstOfMonth) {
    doc.monthlyGems = 0;
    doc.monthlyResetAt = firstOfMonth;
  }

  const breakdown = [];
  let streakBonus = 0;

  // Apply all actions in a single pass
  for (const { action, refId = defaultRefId } of actions) {
    const gems = GEM_VALUES[action];
    if (gems === undefined) {
      console.warn(`[awardGemsMultiple] Unknown gem action skipped: ${action}`);
      continue;
    }

    doc.monthlyGems = (doc.monthlyGems || 0) + gems;
    doc.totalGems   = Math.max(0, (doc.totalGems || 0) + gems);
    doc.history.push({ action, gems, ref: refId || null });
    breakdown.push({ action, gems });

    // Streak logic — only on class_completed
    if (action === "class_completed") {
      const todayStr = now.toISOString().split("T")[0];
      const lastStr  = doc.lastStreakDate
        ? new Date(doc.lastStreakDate).toISOString().split("T")[0]
        : null;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastStr === todayStr) {
        // Already counted today
      } else if (lastStr === yesterdayStr) {
        doc.streak = (doc.streak || 0) + 1;
        doc.lastStreakDate = now;
      } else {
        doc.streak = 1;
        doc.lastStreakDate = now;
      }

      // ✅ Fixed streak milestone logic
      if (doc.streak > 0 && doc.streak % 7 === 0 && doc.streak < 30) {
        streakBonus = GEM_VALUES.streak_7;
        doc.totalGems   = Math.max(0, doc.totalGems + streakBonus);
        doc.monthlyGems = doc.monthlyGems + streakBonus;
        doc.history.push({ action: "streak_7", gems: streakBonus, ref: refId });
        breakdown.push({ action: "streak_7", gems: streakBonus });
      } else if (doc.streak === 30) {
        streakBonus = GEM_VALUES.streak_30;
        doc.totalGems   = Math.max(0, doc.totalGems + streakBonus);
        doc.monthlyGems = doc.monthlyGems + streakBonus;
        doc.history.push({ action: "streak_30", gems: streakBonus, ref: refId });
        breakdown.push({ action: "streak_30", gems: streakBonus });
      }
    }
  }

  // Cap history at 100 entries
  if (doc.history.length > 100) {
    doc.history = doc.history.slice(-100);
  }

  // Recalculate tier once
  const tierInfo = getTierInfo(doc.totalGems);
  doc.tier = tierInfo.name;

  // ✅ Single save — one DB write for all actions
  await doc.save();

  return {
    totalGems:   doc.totalGems,
    monthlyGems: doc.monthlyGems,
    streak:      doc.streak,
    tier:        tierInfo,
    breakdown,
    streakBonus,
  };
}

/**
 * Get a teacher's current gems data.
 * @param {string} teacherId
 */
export async function getTeacherGems(teacherId) {
  await dbConnect();
  const tid = typeof teacherId === "string"
    ? new mongoose.Types.ObjectId(teacherId)
    : teacherId;

  const doc = await TeacherGemsModel.findOne({ teacher: tid }).lean();
  if (!doc) {
    return {
      totalGems: 0,
      monthlyGems: 0,
      streak: 0,
      tier: getTierInfo(0),
      history: [],
    };
  }

  return {
    totalGems:   doc.totalGems,
    monthlyGems: doc.monthlyGems,
    streak:      doc.streak,
    tier:        getTierInfo(doc.totalGems),
    history:     (doc.history || []).slice(-20).reverse(), // last 20, newest first
  };
}

/**
 * Manually award or deduct a custom amount of gems for a teacher.
 * @param {string} teacherId
 * @param {number} amount
 * @param {string} note
 */
export async function manualGemsAdjustment(teacherId, amount, note = "Admin adjustment") {
  await dbConnect();
  const tid = typeof teacherId === "string"
    ? new mongoose.Types.ObjectId(teacherId)
    : teacherId;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Upsert the gems doc
  const doc = await TeacherGemsModel.findOneAndUpdate(
    { teacher: tid },
    { $setOnInsert: { teacher: tid } },
    { upsert: true, new: true }
  );

  // Reset monthly gems if new month
  if (!doc.monthlyResetAt || doc.monthlyResetAt < firstOfMonth) {
    doc.monthlyGems = 0;
    doc.monthlyResetAt = firstOfMonth;
  }

  // Update gems
  doc.monthlyGems = (doc.monthlyGems || 0) + amount;
  doc.totalGems   = Math.max(0, (doc.totalGems || 0) + amount); // floor at 0

  // History entry
  doc.history.push({
    action: "admin_adjustment",
    gems: amount,
    note: note,
  });

  if (doc.history.length > 100) {
    doc.history = doc.history.slice(-100);
  }

  // Recalculate tier
  const tierInfo = getTierInfo(doc.totalGems);
  doc.tier = tierInfo.name;

  await doc.save();

  return {
    success: true,
    totalGems: doc.totalGems,
    monthlyGems: doc.monthlyGems,
    tier: tierInfo,
    amountAdded: amount
  };
}

