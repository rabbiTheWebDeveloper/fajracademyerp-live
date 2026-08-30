import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/service/mongo";
import { AuditLogModel } from "@/model/audit-log-model";
import { escapeRegex } from "@/lib/utils";

async function getAuthUser(cookieStore) {
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/audit-logs
 *
 * Query params:
 *   page     - page number (default 1)
 *   limit    - items per page (default 25, max 100)
 *   action   - filter by action string (e.g. CREATE, DELETE)
 *   resource - filter by resource (e.g. Teacher, Student)
 *   status   - success | failure | warning
 *   severity - info | warning | critical
 *   actor    - filter by actor name (partial, case-insensitive)
 *   from     - ISO date string start
 *   to       - ISO date string end
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const decoded = await getAuthUser(cookieStore);

    if (!decoded) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }
    if (decoded.role !== "super-admin" && decoded.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page     = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit    = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const action   = searchParams.get("action")   || "";
    const resource = searchParams.get("resource") || "";
    const status   = searchParams.get("status")   || "";
    const severity = searchParams.get("severity") || "";
    const actor    = searchParams.get("actor")    || "";
    const from     = searchParams.get("from")     || "";
    const to       = searchParams.get("to")       || "";

    // Build filter
    const filter = {};
    if (action)   filter.action   = { $regex: escapeRegex(action),   $options: "i" };
    if (resource) filter.resource = { $regex: escapeRegex(resource), $options: "i" };
    if (status)   filter.status   = status;
    if (severity) filter.severity = severity;
    if (actor)    filter["actor.name"] = { $regex: escapeRegex(actor), $options: "i" };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    // Aggregate summary counts for current filter (without pagination)
    const [summary] = await AuditLogModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total:    { $sum: 1 },
          success:  { $sum: { $cond: [{ $eq: ["$status", "success"]  }, 1, 0] } },
          failure:  { $sum: { $cond: [{ $eq: ["$status", "failure"]  }, 1, 0] } },
          warning:  { $sum: { $cond: [{ $eq: ["$status", "warning"]  }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] } },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      logs,
      summary: summary || { total: 0, success: 0, failure: 0, warning: 0, critical: 0 },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[audit-logs GET]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
