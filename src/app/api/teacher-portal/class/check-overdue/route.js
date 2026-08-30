import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { ClassSessionModel } from "@/model/class-model";
import { awardGems, getTeacherGems } from "@/service/gems-service";
// ✅ OPTIMIZED: use the centralized, cached resolveTeacherId instead of local copy
import { resolveTeacherId } from "@/queries/teacher-portal-queries";

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * POST /api/teacher-portal/class/check-overdue
 * Overdue class penalty is turned OFF. Returns empty list with 0 penalties.
 */
export async function POST() {
  return NextResponse.json({
    success: true,
    penalized: [],
    message: "Overdue penalty is disabled",
  });
}
