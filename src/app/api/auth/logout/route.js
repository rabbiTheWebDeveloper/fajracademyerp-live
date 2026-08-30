import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit-logger";

export async function POST(request) {
  await recordAuditLog(request, {
    action: "LOGOUT",
    resource: "User",
    description: "User logged out successfully"
  });

  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );
  response.cookies.delete("auth_token");
  return response;
}
