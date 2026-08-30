"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, RefreshCw, AlertCircle, CheckCircle2,
  Clock, Search, X, Eye, ChevronLeft, ChevronRight, User,
} from "lucide-react";

const statusStyle: Record<string, { pill: string; icon: any; label: string }> = {
  submitted:       { pill: "bg-sky-100 text-sky-700",       icon: Clock,        label: "Submitted"      },
  reviewed:        { pill: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Reviewed"      },
  "needs-revision":{ pill: "bg-amber-100 text-amber-700",   icon: Clock,        label: "Needs Revision" },
};

const moodEmoji: Record<string, string> = {
  excellent: "😃", good: "😊", neutral: "😐", tired: "😴", stressed: "😓",
};

export default function AdminDailyReportsPage() {
  const [reports, setReports]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewing, setViewing]   = useState<any | null>(null);
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);
  const LIMIT = 20;

  const fetchReports = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) params.set("status", statusFilter);
      const res  = await fetch(`/api/staff/daily-reports?${params}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else setError(data.message);
    } catch { setError("Failed to load reports."); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const handleReview = async (id: string) => {
    setReviewLoading(id);
    try {
      const res  = await fetch(`/api/staff/daily-reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      const data = await res.json();
      if (data.success) {
        setReports(prev => prev.map(r => r._id === id ? { ...r, status: "reviewed" } : r));
        if (viewing?._id === id) setViewing((v: any) => ({ ...v, status: "reviewed" }));
      }
    } catch { /* silent */ }
    finally { setReviewLoading(null); }
  };

  const submittedCount = reports.filter(r => r.status === "submitted").length;
  const reviewedCount  = reports.filter(r => r.status === "reviewed").length;

  const filtered = reports.filter(r =>
    !search ||
    r.staff?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    r.staff?.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Work Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review daily reports submitted by all staff members</p>
        </div>
        <button onClick={fetchReports} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Summary + tab filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100 px-4">
          {[
            { key: "",           label: "All",             count: total          },
            { key: "submitted",  label: "Pending Review",  count: submittedCount },
            { key: "reviewed",   label: "Reviewed",        count: reviewedCount  },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setStatus(key)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                statusFilter === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
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
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-sm text-gray-400">
          No daily reports found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const s = statusStyle[r.status] || statusStyle.submitted;
            const Icon = s.icon;
            const isLoading = reviewLoading === r._id;
            return (
              <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-violet-600">
                        {r.staff?.avatar
                          ? <img src={r.staff.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          : r.staff?.fullName?.split(" ").map((w: string) => w[0]).join("").slice(0,2)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{r.staff?.fullName || "—"}</p>
                        <p className="text-xs text-gray-400 capitalize">
                          {r.staff?.designation} ·{" "}
                          {new Date(r.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                          {r.mood && ` · ${moodEmoji[r.mood] || ""} ${r.mood}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                        <Icon className="w-3 h-3" />{s.label}
                      </span>
                      <button onClick={() => setViewing(r)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {r.status === "submitted" && (
                        <button onClick={() => handleReview(r._id)} disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-60">
                          {isLoading ? "..." : "✓ Mark Reviewed"}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">{r.summary}</p>
                  {r.tasksCompleted?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.tasksCompleted.slice(0,4).map((t: any, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">{t.title}</span>
                      ))}
                      {r.tasksCompleted.length > 4 && (
                        <span className="px-2.5 py-1 bg-violet-100 rounded-full text-xs text-violet-600 font-medium">+{r.tasksCompleted.length-4} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <span className="text-xs text-gray-400">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{viewing.staff?.fullName}&apos;s Report</h3>
              <button onClick={() => setViewing(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{viewing.staff?.fullName}</p>
                  <p className="text-xs text-gray-500">{viewing.staff?.designation} · {viewing.staff?.department?.replace(/-/g," ")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-400">{new Date(viewing.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
                  {viewing.mood && <p className="text-lg mt-1">{moodEmoji[viewing.mood]} <span className="text-xs capitalize text-gray-400">{viewing.mood}</span></p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{viewing.summary}</p>
              </div>
              {viewing.tasksCompleted?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tasks Completed ({viewing.tasksCompleted.length})</p>
                  <ul className="space-y-1">
                    {viewing.tasksCompleted.map((t: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />{t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {viewing.challenges && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Challenges / Blockers</p>
                  <p className="text-sm text-gray-700">{viewing.challenges}</p>
                </div>
              )}
              {viewing.nextDayPlan && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Next Day Plan</p>
                  <p className="text-sm text-gray-700">{viewing.nextDayPlan}</p>
                </div>
              )}
              {viewing.status === "submitted" && (
                <button onClick={() => handleReview(viewing._id)} disabled={reviewLoading === viewing._id}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 mt-2">
                  {reviewLoading === viewing._id ? "Marking..." : "✓ Mark as Reviewed"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
