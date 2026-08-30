import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/service/mongo";

async function getAdmin(cookieStore) {
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    if (d.role !== "super-admin" && d.role !== "admin") return null;
    return d;
  } catch { return null; }
}

/**
 * GET /api/admin/audit-logs/retention
 * Returns current retention config and how many logs are older than the window.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    if (!await getAdmin(cookieStore)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const { AuditLogModel } = await import("@/model/audit-log-model");

    const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || "30", 10);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const [total, expiredCount] = await Promise.all([
      AuditLogModel.countDocuments(),
      AuditLogModel.countDocuments({ createdAt: { $lt: cutoff } }),
    ]);

    return NextResponse.json({
      success: true,
      retention: {
        days: retentionDays,
        cutoffDate: cutoff.toISOString(),
        totalLogs: total,
        expiredLogs: expiredCount,   // will be auto-deleted by MongoDB TTL (within ~60s)
        activeLogs: total - expiredCount,
      },
    });
  } catch (e) {
    console.error("[retention GET]", e);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/audit-logs/retention
 * Manually delete audit logs older than `days` (defaults to AUDIT_LOG_RETENTION_DAYS).
 * Body: { days?: number }
 *
 * Useful when TTL hasn't fired yet or when you want to purge immediately.
 */
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const admin = await getAdmin(cookieStore);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    let days = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || "30", 10);
    let purgeAll = false;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const body = await request.json();
        if (body?.purgeAll) purgeAll = true;
        if (typeof body?.days === "number" && body.days >= 0) {
          days = body.days;
        }
      } catch { /* ignore parse error */ }
    }

    await dbConnect();
    const { AuditLogModel } = await import("@/model/audit-log-model");

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filter = purgeAll ? {} : { createdAt: { $lt: cutoff } };
    const result = await AuditLogModel.deleteMany(filter);

    // Write an audit log entry about the purge itself
    try {
      await AuditLogModel.create({
        actor: { name: admin.fullName || admin.name || "Admin", role: admin.role, email: admin.email || "" },
        action: "DELETE",
        resource: "AuditLog",
        description: purgeAll
          ? `Manual purge: deleted ALL ${result.deletedCount} audit log(s).`
          : `Manual purge: deleted ${result.deletedCount} audit log(s) older than ${days} days.`,
        status: "success",
        severity: "warning",
      });
    } catch { /* don't fail if this write fails */ }

    return NextResponse.json({
      success: true,
      message: purgeAll
        ? `Successfully purged ALL ${result.deletedCount} audit log(s).`
        : `Deleted ${result.deletedCount} audit log(s) older than ${days} days.`,
      deletedCount: result.deletedCount,
      cutoffDate: cutoff.toISOString(),
    });
  } catch (e) {
    console.error("[retention DELETE]", e);
    return NextResponse.json({ success: false, message: "Server error: " + e.message }, { status: 500 });
  }
}
