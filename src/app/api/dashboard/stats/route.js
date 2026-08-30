import { NextResponse } from "next/server";
import { getDashboardKPIs, getDashboardChartData, getRecentActivity } from "@/queries/dashboard-queries";

export const maxDuration = 10; // prevent zombie functions consuming Vercel CPU budget

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    // ✅ OPTIMIZED: "all" mode fetches KPIs + chart + activity in ONE request
    // (was 3 separate fetches from the client = 3 function invocations)
    if (type === "all") {
      const [kpis, chartData, activity] = await Promise.all([
        getDashboardKPIs(),
        getDashboardChartData(),
        getRecentActivity(),
      ]);
      return NextResponse.json({ success: true, kpis, chartData, activity }, {
        status: 200,
        headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
      });
    }

    if (type === "chart") {
      const chartData = await getDashboardChartData();
      return NextResponse.json({ success: true, chartData }, {
        status: 200,
        headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
      });
    }

    if (type === "activity") {
      const activity = await getRecentActivity();
      return NextResponse.json({ success: true, activity }, {
        status: 200,
        headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
      });
    }

    // Default: KPIs only
    const kpis = await getDashboardKPIs();
    return NextResponse.json({ success: true, kpis }, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
