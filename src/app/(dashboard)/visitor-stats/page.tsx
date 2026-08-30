"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users2,
  GraduationCap,
  Users,
  Eye,
  TrendingUp,
  RefreshCw,
  XCircle,
  BarChart2,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DailyVisitor { date: string; dailyCount: number; totalCount: number }
interface HourlyCount  { hour: number; count: number }
interface TeacherCounts { active: number; inactive: number; "on-leave": number; terminated: number; total: number }
interface StudentCounts { active: number; inactive: number; completed: number; "at-risk": number; suspended: number; total: number }
interface VisitorData {
  visitors: { daily: DailyVisitor[]; hourly: HourlyCount[]; todayTotal: number; last30DaysTotal: number };
  teachers: TeacherCounts;
  students: StudentCounts;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const TEACHER_COLORS: Record<string, string> = {
  active:     "#10b981",
  inactive:   "#6b7280",
  "on-leave": "#f59e0b",
  terminated: "#ef4444",
};
const STUDENT_COLORS: Record<string, string> = {
  active:    "#3b82f6",
  inactive:  "#6b7280",
  completed: "#10b981",
  "at-risk": "#f97316",
  suspended: "#ef4444",
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, gradient,
}: { icon: any; label: string; value: string | number; sub?: string; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient} shadow-sm border border-white/20`}>
      <div className="flex items-start justify-between">
        <div className="bg-white/25 p-2.5 rounded-xl">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <TrendingUp className="w-4 h-4 text-white/50" />
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-sm font-medium text-white/80 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function DonutSegment({
  label, value, total, color,
}: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm capitalize text-gray-700 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-sm font-bold text-gray-900 w-8 text-right">{value}</span>
        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
      </div>
    </div>
  );
}

const HourLabel = ({ x, y, value }: any) => (
  <text x={x} y={y + 12} textAnchor="middle" fontSize={10} fill="#9ca3af">
    {value % 6 === 0 ? `${String(value).padStart(2, "0")}:00` : ""}
  </text>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VisitorStatsPage() {
  const [data, setData]       = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing]   = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/visitor-stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Prepare chart data
  const dailyChartData = (data?.visitors.daily || []).map((d) => ({
    date: shortDate(d.date),
    visitors: d.dailyCount,
  }));

  const hourlyChartData = (data?.visitors.hourly || []).map((h) => ({
    hour: h.hour,
    label: `${String(h.hour).padStart(2, "0")}:00`,
    count: h.count,
  }));

  const peakHour = hourlyChartData.reduce((a, b) => (b.count > a.count ? b : a), { hour: 0, label: "00:00", count: 0 });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-sm">
              <Users2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Visitor &amp; User Stats</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            Site traffic · teacher &amp; student analytics ·{" "}
            <span className="font-medium">Updated: {lastRefresh.toLocaleTimeString()}</span>
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse bg-gray-100 rounded-2xl" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-5">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">Failed to load visitor stats</p>
            <p className="text-sm text-red-500 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Top stat cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={Eye}
              label="Today's Visitors"
              value={data.visitors.todayTotal}
              sub="Unique page visits today"
              gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
            />
            <StatCard
              icon={BarChart2}
              label="Last 30 Days"
              value={data.visitors.last30DaysTotal}
              sub="Total visitor sessions"
              gradient="bg-gradient-to-br from-violet-500 to-indigo-600"
            />
            <StatCard
              icon={GraduationCap}
              label="Total Teachers"
              value={data.teachers.total}
              sub={`${data.teachers.active} active · ${data.teachers["on-leave"]} on leave`}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <StatCard
              icon={Users}
              label="Total Students"
              value={data.students.total}
              sub={`${data.students.active} active · ${data.students["at-risk"]} at-risk`}
              gradient="bg-gradient-to-br from-amber-500 to-orange-500"
            />
          </div>

          {/* ── 30-day visitor area chart ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> 30-Day Visitor Trend
              </h2>
              <span className="text-xs text-gray-400">Daily unique visits</span>
            </div>
            {dailyChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-300">
                <p className="text-sm">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }}
                    labelStyle={{ fontWeight: 700 }}
                  />
                  <Area type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2.5}
                    fill="url(#visitorGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#3b82f6" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Hourly bar chart + peak info ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" /> Today's Hourly Traffic
              </h2>
              {peakHour.count > 0 && (
                <span className="text-xs font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                  Peak: {peakHour.label} ({peakHour.count} visits)
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="hour" tick={<HourLabel />} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(v: any, _: any, props: any) => [v, `${props.payload.label}`]}
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {hourlyChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.hour === peakHour.hour && entry.count > 0 ? "#7c3aed" : "#c4b5fd"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Teacher & Student breakdowns ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Teacher breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-500" /> Teacher Breakdown
              </h2>
              <p className="text-xs text-gray-400 mb-4">{data.teachers.total} total teachers</p>
              <div className="space-y-0.5">
                {(Object.entries(TEACHER_COLORS) as [keyof TeacherCounts, string][]).map(([key, color]) => (
                  <DonutSegment
                    key={key}
                    label={key}
                    value={data.teachers[key] as number}
                    total={data.teachers.total}
                    color={color}
                  />
                ))}
              </div>
            </div>

            {/* Student breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Student Breakdown
              </h2>
              <p className="text-xs text-gray-400 mb-4">{data.students.total} total students</p>
              <div className="space-y-0.5">
                {(Object.entries(STUDENT_COLORS) as [keyof StudentCounts, string][]).map(([key, color]) => (
                  <DonutSegment
                    key={key}
                    label={key}
                    value={data.students[key] as number}
                    total={data.students.total}
                    color={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
