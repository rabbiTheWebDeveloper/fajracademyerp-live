import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { dbConnect } from "@/service/mongo";
import { AuditLogModel } from "@/model/audit-log-model";

export async function recordAuditLog(request, {
  action,
  resource,
  resourceId = null,
  description,
  changes = null,
  status = "success",
  severity = "info",
  actorOverride = null
}) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    let actor = { name: "System", role: "system", email: "", ip: "", userAgent: "" };

    if (actorOverride) {
      actor = {
        userId: actorOverride._id || actorOverride.id || null,
        name: actorOverride.fullName || actorOverride.name || "Unknown",
        role: actorOverride.role || "unknown",
        email: actorOverride.email || "",
        ip: "",
        userAgent: ""
      };
    } else if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        actor = {
          userId: decoded.id || null,
          name: decoded.fullName || decoded.name || "Unknown",
          role: decoded.role || "unknown",
          email: decoded.email || "",
          ip: "",
          userAgent: ""
        };
      } catch {
        // Keep System/anonymous defaults
      }
    }

    let method = "";
    let endpoint = "";
    if (request) {
      method = request.method || "";
      endpoint = request.nextUrl?.pathname || request.url || "";
      const ip = request.headers.get("x-forwarded-for") || request.ip || "";
      const userAgent = request.headers.get("user-agent") || "";
      actor.ip = ip;
      actor.userAgent = userAgent;
    }

    await dbConnect();
    const log = await AuditLogModel.create({
      actor,
      action,
      resource,
      resourceId,
      description,
      changes,
      method,
      endpoint,
      status,
      severity,
    });
    return log;
  } catch (error) {
    console.error("[recordAuditLog error]", error);
  }
}
