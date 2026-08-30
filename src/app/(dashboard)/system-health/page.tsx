"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Server,
  Database,
  Clock,
  Cpu,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Wifi,
  WifiOff,
  Loader2,
  TrendingUp,
  Zap,
  BarChart2,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
} from "lucide-react";
import {
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
interface MemoryInfo { heapUsed: string; heapTotal: string; rss: string; external: string }
interface RecentError {
  _id: string; action: string; resource: string; description: string;
  severity: "info" | "warning" | "critical"; status: string;
  actor: { name: string; role: string }; createdAt: string;
}
interface InMemoryStats {
  total: number; success: number; redirect: number; clientErr: number; serverErr: number;
  byMethod: Record<string, number>; sessionStartedAt: number; lastResetAt: number;
}
interface DbRequestStats {
  total: number; todayTotal: number; successCount: number;
  failureCount: number; warningCount: number;
  byMethod: Record<string, number>;
  byHour: { hour: number; label: string; count: number }[];
}
interface HealthData {
  dbStatus: "connected" | "disconnected" | "connecting" | "error";
  dbLatencyMs: number | null; uptime: number; memory: MemoryInfo;
  nodeVersion: string; platform: string; arch: string; env: string;
  requests: { inMemory: InMemoryStats; db: DbRequestStats };
  recentErrors: RecentError[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatUptime(secs: number) {
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600),
        m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime(), mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now"; if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60); return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
function fmtNum(n: number) { return n.toLocaleString(); }

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}><Icon className="w-5 h-5 text-white" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RequestStatRow({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="w-24 text-xs text-gray-500 font-medium shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold text-gray-800 w-16 text-right tabular-nums">{fmtNum(value)}</span>
      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

function DbStatusBadge({ status }: { status: HealthData["dbStatus"] }) {
  const map = {
    connected:    { label: "Connected",    color: "bg-emerald-100 text-emerald-700", icon: Wifi    },
    disconnected: { label: "Disconnected", color: "bg-red-100 text-red-700",         icon: WifiOff },
    connecting:   { label: "Connecting…",  color: "bg-amber-100 text-amber-700",     icon: Loader2 },
    error:        { label: "Error",        color: "bg-red-100 text-red-700",         icon: XCircle },
  };
  const cfg = map[status] ?? map.disconnected; const StatusIcon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${cfg.color}`}>
      <StatusIcon className={`w-3.5 h-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function SeverityBadge({ sev }: { sev: string }) {
  const map: Record<string, string> = { info: "bg-blue-100 text-blue-700", warning: "bg-amber-100 text-amber-700", critical: "bg-red-100 text-red-700" };
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[sev] ?? "bg-gray-100 text-gray-600"}`}>{sev}</span>;
}

function MemoryBar({ label, used, total }: { label: string; used: string; total: string }) {
  const pct = Math.min(100, Math.round((parseFloat(used) / parseFloat(total)) * 100));
  const barColor = pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium text-gray-600">
        <span>{label}</span><span>{used} MB / {total} MB ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SystemHealthPage() {
  const [data, setData]           = useState<HealthData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing]   = useState(false);
  const [resetting, setResetting]     = useState(false);

  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system-health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed");
      setData(json.data); setLastRefresh(new Date());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const resetCounter = async () => {
    setResetting(true);
    await fetch("/api/admin/system-health", { method: "POST" });
    await fetchHealth(true);
    setResetting(false);
  };

  useEffect(() => {
    fetchHealth();
    const iv = setInterval(() => fetchHealth(true), 30000);
    return () => clearInterval(iv);
  }, [fetchHealth]);

  const req = data?.requests;
  const db  = req?.db;
  const mem = req?.inMemory;

  // Success rate from DB stats
  const successRate = db && db.total > 0 ? Math.round((db.successCount / db.total) * 100) : 0;
  const errorRate   = db && db.total > 0 ? Math.round(((db.failureCount) / db.total) * 100) : 0;

  // Peak hour
  const peakHour = db?.byHour?.reduce((a, b) => b.count > a.count ? b : a, { hour: 0, label: "00:00", count: 0 });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
              <Server className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            Live diagnostics &amp; request monitoring · auto-refreshes every 30 s ·{" "}
            <span className="font-medium">Last: {lastRefresh.toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetCounter} disabled={resetting || loading}
            title="Reset in-memory session counter"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} /> Reset Counter
          </button>
          <button
            onClick={() => fetchHealth(true)} disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse bg-gray-100 rounded-2xl" />)}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-5">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div><p className="font-semibold text-red-700">Failed to load health data</p><p className="text-sm text-red-500 mt-0.5">{error}</p></div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Top metric cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard icon={Database} label="Database"
              value={data.dbStatus.charAt(0).toUpperCase() + data.dbStatus.slice(1)}
              sub={data.dbLatencyMs !== null ? `Latency: ${data.dbLatencyMs} ms` : undefined}
              color={data.dbStatus === "connected" ? "bg-emerald-500" : "bg-red-500"} />
            <MetricCard icon={Clock} label="Server Uptime"
              value={formatUptime(data.uptime)} sub="Since last restart" color="bg-blue-500" />
            <MetricCard icon={Cpu} label="Heap Memory"
              value={`${data.memory.heapUsed} MB`}
              sub={`of ${data.memory.heapTotal} MB heap`} color="bg-violet-500" />
            <MetricCard icon={Activity} label="Environment"
              value={data.env.toUpperCase()}
              sub={`${data.nodeVersion} · ${data.platform}/${data.arch}`} color="bg-amber-500" />
          </div>

          {/* ── Request Stat Hero cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Total Requests",   value: fmtNum(db?.total ?? 0),        icon: BarChart2,        gradient: "from-indigo-500 to-violet-600" },
              { label: "Today's Requests", value: fmtNum(db?.todayTotal ?? 0),   icon: Zap,              gradient: "from-blue-500 to-cyan-500"     },
              { label: "Success",          value: fmtNum(db?.successCount ?? 0), icon: CheckCircle2,     gradient: "from-emerald-500 to-teal-500"  },
              { label: "Failures",         value: fmtNum(db?.failureCount ?? 0), icon: XCircle,          gradient: "from-red-500 to-rose-600"      },
              { label: "Success Rate",     value: `${successRate}%`,             icon: TrendingUp,       gradient: "from-green-500 to-emerald-600" },
              { label: "Error Rate",       value: `${errorRate}%`,               icon: AlertTriangle,    gradient: "from-amber-500 to-orange-500"  },
            ].map(({ label, value, icon: Icon, gradient }) => (
              <div key={label} className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} shadow-sm border border-white/20`}>
                <div className="bg-white/25 p-2 rounded-xl w-fit mb-3">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                <p className="text-xs text-white/75 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Requests last 24h bar chart ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" /> Requests — Last 24 Hours
              </h2>
              {peakHour && peakHour.count > 0 && (
                <span className="text-xs font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                  Peak: {peakHour.label} ({fmtNum(peakHour.count)} req)
                </span>
              )}
            </div>
            {(db?.byHour?.length ?? 0) === 0 ? (
              <div className="h-44 flex items-center justify-center text-gray-300 text-sm">No data recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={db!.byHour} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                    interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: any) => [v, "Requests"]}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: 13 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {db!.byHour.map((entry, i) => (
                      <Cell key={i} fill={entry.hour === peakHour?.hour && entry.count > 0 ? "#7c3aed" : "#c4b5fd"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── 3-column: DB status | Request breakdown | Method breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* DB Status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-violet-500" /> Database
              </h2>
              <div className="space-y-3">
                {[
                  { label: "Status",   value: <DbStatusBadge status={data.dbStatus} /> },
                  { label: "Latency",  value: data.dbLatencyMs !== null ? `${data.dbLatencyMs} ms` : "—" },
                  { label: "Node.js",  value: data.nodeVersion },
                  { label: "Platform", value: `${data.platform} / ${data.arch}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Request status breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-violet-500" /> Request Status (DB)
              </h2>
              <div className="space-y-1">
                <RequestStatRow label="✅ Success"  value={db?.successCount ?? 0} total={db?.total ?? 1} color="#10b981" />
                <RequestStatRow label="❌ Failure"  value={db?.failureCount ?? 0} total={db?.total ?? 1} color="#ef4444" />
                <RequestStatRow label="⚠️ Warning"  value={db?.warningCount ?? 0} total={db?.total ?? 1} color="#f59e0b" />
              </div>
              <p className="mt-3 text-xs text-gray-400 text-right">
                {fmtNum(db?.total ?? 0)} total recorded actions
              </p>
            </div>

            {/* Method breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-500" /> By HTTP Method (DB)
              </h2>
              <div className="space-y-1">
                {db && Object.entries(db.byMethod).map(([method, count]) => {
                  const colors: Record<string, string> = {
                    GET: "#3b82f6", POST: "#10b981", PATCH: "#8b5cf6",
                    PUT: "#f59e0b", DELETE: "#ef4444",
                  };
                  return (
                    <RequestStatRow
                      key={method} label={method}
                      value={count} total={db.total || 1}
                      color={colors[method] ?? "#6b7280"}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── In-memory session counter ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> In-Memory Session Counter
                <span className="ml-1 text-xs font-normal text-gray-400">(resets on server restart)</span>
              </h2>
              <span className="text-xs text-gray-400">
                Session started: {mem ? new Date(mem.sessionStartedAt).toLocaleTimeString() : "—"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {mem && [
                { label: "Total",       value: fmtNum(mem.total),      color: "bg-indigo-100 text-indigo-700" },
                { label: "2xx Success", value: fmtNum(mem.success),    color: "bg-emerald-100 text-emerald-700" },
                { label: "3xx Redirect",value: fmtNum(mem.redirect),   color: "bg-blue-100 text-blue-700" },
                { label: "4xx Client",  value: fmtNum(mem.clientErr),  color: "bg-amber-100 text-amber-700" },
                { label: "5xx Server",  value: fmtNum(mem.serverErr),  color: "bg-red-100 text-red-700" },
                { label: "Last Reset",  value: new Date(mem.lastResetAt).toLocaleTimeString(), color: "bg-gray-100 text-gray-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-xl px-4 py-3 ${color}`}>
                  <p className="text-xl font-bold tabular-nums">{value}</p>
                  <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
                </div>
              ))}
            </div>
            {/* In-memory method breakdown */}
            {mem && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(mem.byMethod).map(([m, c]) => (
                  <div key={m} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase">{m}</p>
                    <p className="text-lg font-bold text-gray-800 tabular-nums">{fmtNum(c)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Memory ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-500" /> Memory Usage
            </h2>
            <div className="space-y-4">
              <MemoryBar label="Heap Used" used={data.memory.heapUsed} total={data.memory.heapTotal} />
              <MemoryBar label="RSS"       used={data.memory.rss}      total={data.memory.heapTotal} />
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>External: {data.memory.external} MB</span>
                <span>RSS: {data.memory.rss} MB</span>
              </div>
            </div>
          </div>

          {/* ── Recent warnings & errors ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Recent Warnings &amp; Critical Logs
                {data.recentErrors.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    {data.recentErrors.length}
                  </span>
                )}
              </h2>
            </div>
            {data.recentErrors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                <p className="font-semibold text-gray-700">All clear — no warnings or errors</p>
                <p className="text-sm text-gray-400 mt-1">The system is running smoothly.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recentErrors.map((log) => (
                  <div key={log._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${log.severity === "critical" ? "bg-red-500" : "bg-amber-400"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{log.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {log.action} · {log.resource} ·{" "}
                            <span className="font-medium text-gray-500">{log.actor?.name}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <SeverityBadge sev={log.severity} />
                        <span className="text-xs text-gray-400">{timeAgo(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
