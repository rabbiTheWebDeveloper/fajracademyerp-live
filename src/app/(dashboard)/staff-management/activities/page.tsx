"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, RefreshCw, AlertCircle, Search, X,
  Clock, CheckCircle2, Circle, PlayCircle,
  ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";

const CATEGORIES = [
  { value: "sales-call", label: "Sales Call" },
  { value: "email",      label: "Email"      },
  { value: "meeting",    label: "Meeting"    },
  { value: "research",   label: "Research"   },
  { value: "admin",      label: "Admin"      },
  { value: "marketing",  label: "Marketing"  },
  { value: "support",    label: "Support"    },
  { value: "training",   label: "Training"   },
  { value: "bd",         label: "BD"         },
  { value: "other",      label: "Other"      },
];

const priorityStyle: Record<string, string> = {
  high:   "bg-red-100 text-red-600",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-slate-100 text-slate-500",
};

const statusStyle: Record<string, { pill: string; icon: any; label: string }> = {
  todo:        { pill: "bg-slate-100 text-slate-500",    icon: Circle,      label: "To Do"       },
  "in-progress":{ pill: "bg-blue-100 text-blue-600",    icon: PlayCircle,  label: "In Progress" },
  done:        { pill: "bg-emerald-100 text-emerald-700",icon: CheckCircle2,label: "Done"        },
  blocked:     { pill: "bg-red-100 text-red-600",        icon: AlertCircle, label: "Blocked"     },
};

export default function AdminActivitiesPage() {
  const today = new Date().toISOString().split("T")[0];
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [date, setDate]             = useState(today);
  const [statusFilter, setStatus]   = useState("");
  const [categoryFilter, setCategory] = useState("");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const LIMIT = 30;

  const fetchActivities = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ date, page: String(page), limit: String(LIMIT) });
      if (statusFilter)   params.set("status",   statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const res  = await fetch(`/api/staff/activities?${params}`);
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else setError(data.message);
    } catch { setError("Failed to load activities."); }
    finally { setLoading(false); }
  }, [date, page, statusFilter, categoryFilter]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);
  useEffect(() => { setPage(1); }, [date, statusFilter, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/staff/activities/${id}`, { method: "DELETE" });
      setActivities(prev => prev.filter(a => a._id !== id));
      setTotal(t => t - 1);
    } catch { setError("Delete failed."); }
    finally { setDeletingId(null); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res  = await fetch(`/api/staff/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) setActivities(prev => prev.map(a => a._id === id ? { ...a, ...data.activity } : a));
    } catch { /* silent */ }
  };

  // Summary counts for today
  const statusSummary = Object.keys(statusStyle).reduce((acc, k) => {
    acc[k] = activities.filter(a => a.status === k).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = activities.filter(a =>
    !search ||
    a.staff?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.staff?.department?.toLowerCase().includes(search.toLowerCase())
  );

  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label || v;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track daily tasks and activities for all staff members</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchActivities} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Status summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(statusStyle).map(([key, { pill, icon: Icon, label }]) => (
          <button key={key}
            onClick={() => setStatus(statusFilter === key ? "" : key)}
            className={`rounded-2xl p-4 border-2 transition-all flex items-center gap-3 ${
              statusFilter === key ? "border-blue-400 shadow-sm" : "border-transparent"
            } bg-white shadow-sm hover:shadow-md`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${pill}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xl font-bold text-gray-900">{loading ? "—" : statusSummary[key] || 0}</p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by staff name, task title, or department..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
        </div>
        <select value={categoryFilter} onChange={e => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[150px]">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">
            Activities — {new Date(date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
            <span className="ml-2 text-gray-400 font-normal">({filtered.length})</span>
          </h3>
          <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No activities logged for this date.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="px-5 py-3 text-left font-semibold">Staff</th>
                  <th className="px-5 py-3 text-left font-semibold">Activity</th>
                  <th className="px-5 py-3 text-left font-semibold">Category</th>
                  <th className="px-5 py-3 text-left font-semibold">Priority</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Time</th>
                  <th className="px-5 py-3 text-left font-semibold">Duration</th>
                  <th className="px-5 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => {
                  const s = statusStyle[a.status] || statusStyle.todo;
                  const SIcon = s.icon;
                  const p = priorityStyle[a.priority] || priorityStyle.low;
                  const isDeleting = deletingId === a._id;
                  return (
                    <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-semibold text-gray-800 text-xs">{a.staff?.fullName || "—"}</p>
                          <p className="text-xs text-gray-400 capitalize">{a.staff?.department?.replace(/-/g," ")}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 max-w-[200px]">
                        <p className="font-medium text-gray-700 text-xs truncate">{a.title}</p>
                        {a.note && <p className="text-xs text-gray-400 truncate">{a.note}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">{catLabel(a.category)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p} capitalize`}>{a.priority}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                          <SIcon className="w-3 h-3" />{s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-400">
                        {a.startTime || "—"}{a.endTime && ` → ${a.endTime}`}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 font-medium">
                        {a.durationMinutes > 0 ? `${a.durationMinutes}m` : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {/* Quick status change */}
                          {a.status === "todo" && (
                            <button onClick={() => handleStatusChange(a._id, "in-progress")}
                              className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap">Start</button>
                          )}
                          {a.status === "in-progress" && (
                            <button onClick={() => handleStatusChange(a._id, "done")}
                              className="text-xs text-emerald-600 hover:underline font-medium whitespace-nowrap">Complete</button>
                          )}
                          <button onClick={() => handleDelete(a._id)} disabled={isDeleting}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40">
                            {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
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
    </div>
  );
}
