import jwt from "jsonwebtoken";
import { headers } from "next/headers";

export async function getStudentAuth(request) {
  let userId = request?.headers?.get("x-user-id");
  let userRole = request?.headers?.get("x-user-role");

  if (userId && userRole) {
    return { userId, userRole };
  }

  try {
    const headersList = await headers();
    userId = headersList.get("x-user-id");
    userRole = headersList.get("x-user-role");
  } catch {}

  if (userId && userRole) {
    return { userId, userRole };
  }

  // Fallback: extract auth_token cookie from request or headersList
  let cookieHeader = request?.headers?.get("cookie");
  if (!cookieHeader) {
    try {
      const headersList = await headers();
      cookieHeader = headersList.get("cookie");
    } catch {}
  }

  const authCookieMatch = (cookieHeader || "").match(/(?:^|;\s*)auth_token=([^;]+)/);
  const token = authCookieMatch?.[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return { userId: decoded.id, userRole: decoded.role };
    } catch (err) {
      console.error("Student JWT verification error:", err.message);
    }
  }

  return { userId: null, userRole: null };
}
