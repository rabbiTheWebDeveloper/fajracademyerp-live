import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { incrementVisitorCount } from "@/queries/visitorCount";
import { incrementCurrentVisitorCount } from "@/queries/visitorCountDay";

/**
 * POST /api/track-visit
 *
 * Called client-side on every authenticated page load to record a visit.
 * Uses x-user-role header (injected by proxy middleware) to tag the visitor type.
 * Increments both daily (visitorCountModel) and hourly (visitorCountDayModel) counters.
 *
 * Returns quickly — fire-and-forget from the client.
 */
export async function POST() {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role") || "unknown";

    // Run both increments in parallel — non-blocking
    await Promise.allSettled([
      incrementVisitorCount(),
      incrementCurrentVisitorCount(),
    ]);

    return NextResponse.json({ success: true, role }, { status: 200 });
  } catch (error) {
    // Never let a tracking failure break the user experience
    console.error("[track-visit]", error);
    return NextResponse.json({ success: false }, { status: 200 }); // 200 intentional
  }
}
