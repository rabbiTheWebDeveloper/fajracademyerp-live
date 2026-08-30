import mongoose, { Schema } from "mongoose";

/**
 * AuditLog Model
 *
 * Records every significant admin/staff action in the system.
 * Used for compliance, security monitoring, and debugging.
 */
const auditLogSchema = new Schema(
  {
    // Who performed the action
    actor: {
      userId:   { type: Schema.Types.ObjectId, ref: "User", default: null },
      name:     { type: String, default: "System" },
      role:     { type: String, default: "system" },
      email:    { type: String, default: "" },
      ip:       { type: String, default: "" },
      userAgent:{ type: String, default: "" },
    },

    // What action was performed
    action: {
      type: String,
      required: true,
      index: true,
      // e.g. CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT, APPROVE, REJECT
    },

    // Which resource was affected
    resource: {
      type: String,
      required: true,
      index: true,
      // e.g. "Teacher", "Student", "Course", "ClassSession", "TeacherSalary"
    },

    // Resource ID (the document that was affected)
    resourceId: {
      type: String,
      default: null,
    },

    // Human-readable description
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Before/after snapshot (for UPDATE actions)
    changes: {
      before: { type: Schema.Types.Mixed, default: null },
      after:  { type: Schema.Types.Mixed, default: null },
    },

    // HTTP metadata
    method:     { type: String, default: "" },      // GET, POST, PATCH, DELETE
    endpoint:   { type: String, default: "" },      // /api/admin/teachers
    statusCode: { type: Number, default: 200 },

    // Outcome
    status: {
      type: String,
      enum: ["success", "failure", "warning"],
      default: "success",
      index: true,
    },

    // Severity
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// ─── Query Indexes ──────────────────────────────────────────────────────────
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ "actor.userId": 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

// ─── TTL Index — auto-delete documents older than 30 days ───────────────────
//
// MongoDB's background TTL thread (runs every ~60 s) automatically removes
// any AuditLog document whose `createdAt` is older than RETENTION_DAYS.
//
// To change retention:  set AUDIT_LOG_RETENTION_DAYS in your .env file.
//   e.g.  AUDIT_LOG_RETENTION_DAYS=60   → keep 60 days
//         AUDIT_LOG_RETENTION_DAYS=7    → keep 7 days
//
// IMPORTANT: If you change this value, you must also drop and recreate the
// TTL index in MongoDB for the change to take effect:
//   db.auditlogs.dropIndex("createdAt_ttl")
//   (then restart the server to re-create it)
//
const RETENTION_SECONDS =
  parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || "30", 10) * 24 * 60 * 60;

auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: RETENTION_SECONDS, name: "createdAt_ttl" }
);


export const AuditLogModel =
  mongoose.models.AuditLog ??
  mongoose.model("AuditLog", auditLogSchema);
