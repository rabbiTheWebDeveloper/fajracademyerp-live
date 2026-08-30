"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, RefreshCw, AlertCircle, CheckCircle2,
  XCircle, Clock, Search, ChevronLeft, ChevronRight, X,
} from "lucide-react";

const leaveTypes: Record<string, string> = {
  "sick-leave":       "Sick Leave",
  "casual-leave":     "Casual Leave",
  "annual-leave":     "Annual Leave",
  "emergency-leave":  "Emergency Leave",
  "maternity-leave":  "Maternity Leave",
  "paternity-leave":  "Paternity Leave",
  "earned-leave":     "Earned Leave",
  "unpaid-leave":     "Unpaid Leave",
};

const statusStyle: Record<string, { pill: string; icon: any; label: string }> = {
  pending:   { pill: "bg-amber-100 text-amber-700",     icon: Clock,        label: "Pending"   },
  approved:  { pill: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Approved"  },
  rejected:  { pill: "bg-red-100 text-red-600",         icon: XCircle,      label: "Rejected"  },
  cancelled: { pill: "bg-slate-100 text-slate-500",     icon: XCircle,      label: "Cancelled" },
};

export default function AdminLeavePage() {
  const [leaves, setLeaves]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [statusFilter, setStatus] = useState("pending");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewLeave, setViewLeave] = useState<any | null>(null);
  const LIMIT = 20;

  const fetchLeaves = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        ...(statusFilter && { status: statusFilter }),
      });
      const res  = await fetch(`/api/staff/leave?${params}`);
      const data = await res.json();
      if (data.success) {
        setLeaves(data.leaves || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else setError(data.message);
    } catch { setError("Failed to load leave requests."); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const handleAction = async (id: string, status: "approved" | "rejected", remark = "") => {
    setActionLoading(id);
    try {
      const res  = await fetch(`/api/staff/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, actionRemark: remark }),
      });
      const data = await res.json();
      if (data.success) {
        setLeaves(prev => prev.map(l => l._id === id ? { ...l, status } : l));
        setViewLeave(null);
      } else setError(data.message);
    } catch { setError("Action failed."); }
    finally { setActionLoading(null); }
  };

  const counts = {
    pending:  leaves.filter(l => l.status === "pending").length,
    approved: leaves.filter(l => l.status === "approved").length,
    rejected: leaves.filter(l => l.status === "rejected").length,
  };

  const filtered = leaves.filter(l =>
    !search ||
    l.staff?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    l.staff?.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and action all staff leave applications</p>
        </div>
        <button onClick={fetchLeaves} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Status tab filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100 px-4">
          {[
            { key: "",         label: "All",      count: total  },
            { key: "pending",  label: "Pending",  count: counts.pending  },
            { key: "approved", label: "Approved", count: counts.approved },
            { key: "rejected", label: "Rejected", count: counts.rejected },
          ].map(({ key, label, count }) => (
            <button key={key}
              onClick={() => setStatus(key)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                statusFilter === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {label} <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                statusFilter === key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
              }`}>{count}</span>
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by staff name or department..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No leave applications found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="px-5 py-3 text-left font-semibold">Staff</th>
                  <th className="px-5 py-3 text-left font-semibold">Leave Type</th>
                  <th className="px-5 py-3 text-left font-semibold">Period</th>
                  <th className="px-5 py-3 text-left font-semibold">Days</th>
                  <th className="px-5 py-3 text-left font-semibold">Reason</th>
                  <th className="px-5 py-3 text-left font-semibold">Applied</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(l => {
                  const s = statusStyle[l.status] || statusStyle.pending;
                  const Icon = s.icon;
                  const isLoading = actionLoading === l._id;
                  return (
                    <tr key={l._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-semibold text-gray-800">{l.staff?.fullName || "—"}</p>
                          <p className="text-xs text-gray-400 capitalize">{l.staff?.department?.replace(/-/g," ")}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs font-medium">{leaveTypes[l.leaveType] || l.leaveType}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {new Date(l.fromDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                        {l.fromDate !== l.toDate && ` → ${new Date(l.toDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{l.totalDays}d</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-[150px] truncate text-xs">{l.reason}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {new Date(l.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                          <Icon className="w-3 h-3" />{s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewLeave(l)}
                            className="text-xs text-blue-600 hover:underline font-medium">View</button>
                          {l.status === "pending" && (
                            <>
                              <button onClick={() => handleAction(l._id, "approved")} disabled={isLoading}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-60">
                                {isLoading ? "..." : "Approve"}
                              </button>
                              <button onClick={() => handleAction(l._id, "rejected")} disabled={isLoading}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-60">
                                {isLoading ? "..." : "Reject"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* View leave detail modal */}
      {viewLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Leave Request Detail</h3>
              <button onClick={() => setViewLeave(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-bold text-gray-900">{viewLeave.staff?.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{viewLeave.staff?.designation} · {viewLeave.staff?.department?.replace(/-/g," ")}</p>
              </div>
              {[
                ["Leave Type", leaveTypes[viewLeave.leaveType] || viewLeave.leaveType],
                ["From",       new Date(viewLeave.fromDate).toLocaleDateString("en-US",{weekday:"short",month:"long",day:"numeric"})],
                ["To",         new Date(viewLeave.toDate).toLocaleDateString("en-US",{weekday:"short",month:"long",day:"numeric"})],
                ["Total Days", `${viewLeave.totalDays} working day(s)`],
                ["Applied On", new Date(viewLeave.createdAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-400 font-medium">{label}</span>
                  <span className="text-gray-800 font-semibold">{value}</span>
                </div>
              ))}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1">Reason</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{viewLeave.reason}</p>
              </div>
              {viewLeave.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleAction(viewLeave._id, "approved")} disabled={!!actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60">
                    ✓ Approve Leave
                  </button>
                  <button onClick={() => handleAction(viewLeave._id, "rejected")} disabled={!!actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-red-100 text-red-700 text-sm font-bold hover:bg-red-200 disabled:opacity-60">
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
