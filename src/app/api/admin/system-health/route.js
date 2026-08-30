import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/service/mongo";
import { getRequestStats, recordRequest } from "@/lib/request-counter";

async function getAuthUser(cookieStore) {
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET() {
  // ── Count this request itself ────────────────────────────────────────────
  recordRequest("GET", 200);

  try {
    const cookieStore = await cookies();
    const decoded = await getAuthUser(cookieStore);

    if (!decoded) {
      recordRequest("GET", 401);
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const role = decoded.role;
    if (role !== "super-admin" && role !== "admin") {
      recordRequest("GET", 403);
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // ── DB status ──────────────────────────────────────────────────────────
    let dbStatus = "disconnected";
    let dbLatencyMs = null;
    try {
      const mongoose = (await import("mongoose")).default;
      const start = Date.now();
      await dbConnect();
      dbLatencyMs = Date.now() - start;
      const state = mongoose.connection.readyState;
      dbStatus = state === 1 ? "connected" : state === 2 ? "connecting" : "disconnected";
    } catch {
      dbStatus = "error";
    }

    // ── Memory ────────────────────────────────────────────────────────────
    const mem = process.memoryUsage();
    const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(1);

    // ── Uptime ────────────────────────────────────────────────────────────
    const uptimeSeconds = Math.floor(process.uptime());

    // ── In-memory request stats (this process) ────────────────────────────
    const inMemStats = getRequestStats();

    // ── DB-level request stats from AuditLog ──────────────────────────────
    let dbRequestStats = {
      total: 0,
      todayTotal: 0,
      successCount: 0,
      failureCount: 0,
      warningCount: 0,
      byMethod: { GET: 0, POST: 0, PATCH: 0, PUT: 0, DELETE: 0 },
      byHour: [],      // last 24h breakdown
    };

    try {
      const { AuditLogModel } = await import("@/model/audit-log-model");

      // Total all-time counts
      const [overall] = await AuditLogModel.aggregate([
        {
          $group: {
            _id: null,
            total:        { $sum: 1 },
            successCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
            failureCount: { $sum: { $cond: [{ $eq: ["$status", "failure"] }, 1, 0] } },
            warningCount: { $sum: { $cond: [{ $eq: ["$status", "warning"] }, 1, 0] } },
          },
        },
      ]);
      if (overall) {
        dbRequestStats.total        = overall.total;
        dbRequestStats.successCount = overall.successCount;
        dbRequestStats.failureCount = overall.failureCount;
        dbRequestStats.warningCount = overall.warningCount;
      }

      // Today's total
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      dbRequestStats.todayTotal = await AuditLogModel.countDocuments({
        createdAt: { $gte: startOfToday },
      });

      // By HTTP method
      const methodAgg = await AuditLogModel.aggregate([
        { $match: { method: { $in: ["GET", "POST", "PATCH", "PUT", "DELETE"] } } },
        { $group: { _id: "$method", count: { $sum: 1 } } },
      ]);
      for (const m of methodAgg) {
        if (m._id in dbRequestStats.byMethod) {
          dbRequestStats.byMethod[m._id] = m.count;
        }
      }

      // Last 24 hours — requests per hour
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const hourlyAgg = await AuditLogModel.aggregate([
        { $match: { createdAt: { $gte: last24h } } },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      dbRequestStats.byHour = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, "0")}:00`,
        count: hourlyAgg.find((x) => x._id === h)?.count || 0,
      }));
    } catch (e) {
      console.error("[system-health] db request stats error:", e);
    }

    // ── Recent critical / warning audit logs ──────────────────────────────
    let recentErrors = [];
    try {
      const { AuditLogModel } = await import("@/model/audit-log-model");
      recentErrors = await AuditLogModel.find({
        severity: { $in: ["critical", "warning"] },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    } catch {
      recentErrors = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        dbStatus,
        dbLatencyMs,
        uptime: uptimeSeconds,
        memory: {
          heapUsed: toMB(mem.heapUsed),
          heapTotal: toMB(mem.heapTotal),
          rss: toMB(mem.rss),
          external: toMB(mem.external),
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV || "development",
        // ── Request stats ──
        requests: {
          // In-memory (current process session)
          inMemory: {
            total:     inMemStats.total,
            success:   inMemStats.success,
            redirect:  inMemStats.redirect,
            clientErr: inMemStats.clientErr,
            serverErr: inMemStats.serverErr,
            byMethod:  inMemStats.byMethod,
            sessionStartedAt: inMemStats.startedAt,
            lastResetAt: inMemStats.lastResetAt,
          },
          // DB-level (all recorded audit log actions)
          db: dbRequestStats,
        },
        recentErrors,
      },
    });
  } catch (error) {
    console.error("[system-health]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/system-health
 * Reset the in-memory request counter.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "super-admin" && decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }
    const { resetRequestStats } = await import("@/lib/request-counter");
    resetRequestStats();
    return NextResponse.json({ success: true, message: "Counter reset" });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
