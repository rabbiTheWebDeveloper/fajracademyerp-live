"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollText,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  User,
  Clock,
  Trash2,
  ShieldAlert,
  CalendarClock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditLog {
  _id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string;
  status: "success" | "failure" | "warning";
  severity: "info" | "warning" | "critical";
  actor: { name: string; role: string; email: string; ip: string };
  method: string;
  endpoint: string;
  statusCode: number;
  changes: { before: any; after: any };
  createdAt: string;
}
interface Summary {
  total: number;
  success: number;
  failure: number;
  warning: number;
  critical: number;
}
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
interface Retention {
  days: number;
  cutoffDate: string;
  totalLogs: number;
  expiredLogs: number;
  activeLogs: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function SeverityBadge({ val }: { val: string }) {
  const map: Record<string, string> = {
    info:     "bg-blue-100 text-blue-700",
    warning:  "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[val] ?? "bg-gray-100 text-gray-600"}`}>
      {val === "critical" && <AlertTriangle className="w-3 h-3" />}
      {val === "info"     && <Info className="w-3 h-3" />}
      {val}
    </span>
  );
}

function StatusBadge({ val }: { val: string }) {
  const map: Record<string, { cls: string; Icon: any }> = {
    success: { cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
    failure: { cls: "bg-red-100 text-red-700",         Icon: XCircle      },
    warning: { cls: "bg-amber-100 text-amber-700",     Icon: AlertTriangle},
  };
  const { cls, Icon } = map[val] ?? { cls: "bg-gray-100 text-gray-600", Icon: Info };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>
      <Icon className="w-3 h-3" />
      {val}
    </span>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ── Export to CSV helper ──────────────────────────────────────────────────────
function exportCSV(logs: AuditLog[]) {
  const headers = ["Date","Actor","Role","Action","Resource","Description","Status","Severity","Method","Endpoint","IP"];
  const rows = logs.map((l) => [
    formatDate(l.createdAt),
    l.actor?.name,
    l.actor?.role,
    l.action,
    l.resource,
    `"${(l.description || "").replace(/"/g, '""')}"`,
    l.status,
    l.severity,
    l.method,
    l.endpoint,
    l.actor?.ip,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Retention
  const [retention, setRetention]   = useState<Retention | null>(null);
  const [purging, setPurging]       = useState(false);
  const [purgeMsg, setPurgeMsg]     = useState<string | null>(null);

  const fetchRetention = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/audit-logs/retention");
      const json = await res.json();
      if (json.success) setRetention(json.retention);
    } catch { /* silent */ }
  }, []);

  const handlePurge = async () => {
    const days = retention?.days ?? 30;
    if (!confirm(`Delete all audit logs older than ${days} days? This cannot be undone.`)) return;
    setPurging(true); setPurgeMsg(null);
    try {
      const res = await fetch("/api/admin/audit-logs/retention", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to purge");
      setPurgeMsg(json.message || "Done.");
      await Promise.all([fetchLogs(1), fetchRetention()]);
    } catch (e: any) {
      setPurgeMsg("Purge failed: " + e.message);
    } finally { setPurging(false); }
  };

  const handlePurgeAll = async () => {
    if (!confirm("ARE YOU SURE? This will PERMANENTLY DELETE ALL audit logs in the system!")) return;
    if (!confirm("Final Confirmation: Delete ALL audit logs? This action cannot be undone!")) return;
    setPurging(true); setPurgeMsg(null);
    try {
      const res = await fetch("/api/admin/audit-logs/retention", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purgeAll: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to purge all");
      setPurgeMsg(json.message || "All logs purged.");
      await Promise.all([fetchLogs(1), fetchRetention()]);
    } catch (e: any) {
      setPurgeMsg("Purge failed: " + e.message);
    } finally { setPurging(false); }
  };

  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [action, setAction]   = useState("");
  const [resource, setResource] = useState("");
  const [status, setStatus]   = useState("");
  const [severity, setSeverity] = useState("");
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");
  const debounceRef = useRef<any>(null);

  const fetchLogs = useCallback(async (pg = page) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(pg),
      limit: "25",
      ...(action   && { action   }),
      ...(resource && { resource }),
      ...(status   && { status   }),
      ...(severity && { severity }),
      ...(search   && { actor: search }),
      ...(from     && { from     }),
      ...(to       && { to       }),
    });
    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setLogs(json.logs);
      setSummary(json.summary);
      setPagination(json.pagination);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, action, resource, status, severity, search, from, to]);

  // Single effect: re-fetch whenever any filter OR page changes (debounced 400ms for text inputs)
  useEffect(() => { fetchLogs(); fetchRetention(); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLogs(page);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [page, action, resource, status, severity, search, from, to]);

  const resetFilters = () => {
    setSearch(""); setAction(""); setResource("");
    setStatus(""); setSeverity(""); setFrom(""); setTo("");
    setPage(1);
  };


  const hasFilters = search || action || resource || status || severity || from || to;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            Complete activity trail of all admin &amp; staff actions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLogs(page)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => exportCSV(logs)}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          <SummaryCard label="Total"    value={summary.total}    color="bg-indigo-500"  icon={ScrollText}  />
          <SummaryCard label="Success"  value={summary.success}  color="bg-emerald-500" icon={CheckCircle2} />
          <SummaryCard label="Failure"  value={summary.failure}  color="bg-red-500"     icon={XCircle}      />
          <SummaryCard label="Warning"  value={summary.warning}  color="bg-amber-500"   icon={AlertTriangle}/>
          <SummaryCard label="Critical" value={summary.critical} color="bg-rose-600"    icon={AlertTriangle}/>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Reset all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text" placeholder="Search actor…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <input type="text" placeholder="Action (e.g. CREATE)" value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <input type="text" placeholder="Resource" value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="warning">Warning</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            <option value="">All Severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <div className="flex gap-1 xl:col-span-1">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-5">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Loading overlay */}
        {loading && (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {!loading && logs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16">
            <ScrollText className="w-12 h-12 text-gray-200 mb-3" />
            <p className="font-semibold text-gray-500">No audit logs found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters.</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Date","Actor","Action","Resource","Description","Status","Severity",""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    const isExpanded = expandedId === log._id;
                    const hasChanges = log.changes?.before || log.changes?.after;
                    return (
                      <React.Fragment key={log._id}>
                        <tr
                          className={`hover:bg-gray-50 transition-colors ${log.severity === "critical" ? "bg-red-50/30" : ""}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(log.createdAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-xs">{log.actor?.name || "System"}</p>
                                <p className="text-gray-400 text-xs capitalize">{log.actor?.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono font-semibold">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-medium">{log.resource}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{log.description}</td>
                          <td className="px-4 py-3 whitespace-nowrap"><StatusBadge val={log.status} /></td>
                          <td className="px-4 py-3 whitespace-nowrap"><SeverityBadge val={log.severity} /></td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {hasChanges && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : log._id)}
                                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 text-xs font-medium"
                              >
                                Diff {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Expanded diff row */}
                        {isExpanded && hasChanges && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Before</p>
                                  <pre className="text-xs bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto max-h-48 text-gray-700">
                                    {JSON.stringify(log.changes.before, null, 2) || "null"}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">After</p>
                                  <pre className="text-xs bg-emerald-50 border border-emerald-100 rounded-lg p-3 overflow-auto max-h-48 text-gray-700">
                                    {JSON.stringify(log.changes.after, null, 2) || "null"}
                                  </pre>
                                </div>
                              </div>
                              {log.endpoint && (
                                <p className="mt-2 text-xs text-gray-400">
                                  <span className="font-mono text-gray-500">{log.method} {log.endpoint}</span>
                                  {" "}· IP: {log.actor?.ip} · HTTP {log.statusCode}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                  {" "}–{" "}
                  <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
                  {" "}of{" "}
                  <span className="font-medium">{pagination.total.toLocaleString()}</span> entries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pg = Math.max(1, Math.min(page - 2, pagination.totalPages - 4)) + i;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          pg === page
                            ? "bg-indigo-600 text-white"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Retention Status Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-indigo-500" />
            Log Retention Policy
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {purgeMsg && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                {purgeMsg}
              </span>
            )}
            <button
              onClick={handlePurge}
              disabled={purging}
              title="Delete logs older than retention period"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-white text-xs sm:text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Trash2 className={`w-4 h-4 ${purging ? "animate-pulse" : ""}`} />
              {purging ? "Purging…" : "Purge Expired"}
            </button>
            <button
              onClick={handlePurgeAll}
              disabled={purging}
              title="Delete all audit logs in database"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Trash2 className={`w-4 h-4 ${purging ? "animate-pulse" : ""}`} />
              {purging ? "Purging…" : "Purge All Logs"}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            {[
              { label: "Retention Window",      value: retention ? `${retention.days} days`                   : "—", icon: CalendarClock, color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
              { label: "Total Logs",            value: retention ? retention.totalLogs.toLocaleString()        : "—", icon: ScrollText,     color: "bg-gray-50 text-gray-700 border-gray-100"         },
              { label: "Active Logs (kept)",    value: retention ? retention.activeLogs.toLocaleString()       : "—", icon: CheckCircle2,   color: "bg-emerald-50 text-emerald-700 border-emerald-100"  },
              { label: "Expired (pending TTL)", value: retention ? retention.expiredLogs.toLocaleString()      : "—", icon: Trash2,         color: (retention?.expiredLogs ?? 0) > 0 ? "bg-red-50 text-red-700 border-red-100" : "bg-gray-50 text-gray-400 border-gray-100" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color} flex-1 min-w-[160px]`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs font-medium opacity-70">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <ShieldAlert className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-semibold">How auto-deletion works</p>
              <p>
                A <strong>MongoDB TTL Index</strong> on <code className="bg-blue-100 px-1 rounded">createdAt</code> automatically
                deletes logs older than <strong>{retention?.days ?? 30} days</strong>{" "}
                (cutoff: <strong>{retention ? new Date(retention.cutoffDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</strong>).
                MongoDB's background thread runs every ~60 seconds — no cron job needed.
              </p>
              <p>
                To change the window, set <code className="bg-blue-100 px-1 rounded">AUDIT_LOG_RETENTION_DAYS</code> in{" "}
                <code className="bg-blue-100 px-1 rounded">.env</code> and restart. Use <strong>Purge Now</strong> to delete expired logs immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
