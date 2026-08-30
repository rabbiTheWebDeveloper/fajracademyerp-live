import { NextResponse } from "next/server";
import { getCrmInChargeStats } from "@/queries/dashboard-queries";

export const maxDuration = 10;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "all";
    const year = searchParams.get("year") || "all";

    const data = await getCrmInChargeStats({ month, year });

    return NextResponse.json({
      success: true,
      data,
    }, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("CRM In-Charge stats error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
