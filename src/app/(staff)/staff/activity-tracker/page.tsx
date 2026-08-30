"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Plus, CheckCircle2, Trash2,
  Circle, PlayCircle, X, RefreshCw, AlertCircle,
  Clock,
} from "lucide-react";

type Priority   = "high" | "medium" | "low";
type TaskStatus = "todo" | "in-progress" | "done";

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

const priorityStyle: Record<Priority, string> = {
  high:   "bg-red-100 text-red-600",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-slate-100 text-slate-500",
};

export default function ActivityTrackerPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [staffId, setStaffId]       = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", category: "other", priority: "medium" as Priority, note: "",
  });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d?.success) setStaffId(d.user?._id || null);
    });
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/staff/activities?date=${today}&limit=100`);
      const data = await res.json();
      if (data.success) setActivities(data.activities || []);
      else setError(data.message);
    } catch {
      setError("Failed to load activities.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) { setError("Could not identify your account."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res  = await fetch("/api/staff/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff: staffId, date: today, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ title: "", category: "other", priority: "medium", note: "" });
        fetchActivities();
      } else {
        setError(data.message || "Failed to add activity.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: TaskStatus) => {
    try {
      const res  = await fetch(`/api/staff/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setActivities(prev => prev.map(a => a._id === id ? { ...a, ...data.activity } : a));
      }
    } catch { /* silent */ }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/staff/activities/${id}`, { method: "DELETE" });
      setActivities(prev => prev.filter(a => a._id !== id));
    } catch { /* silent */ }
  };

  const totalDone = activities.filter(a => a.status === "done").length;
  const inProgress = activities.filter(a => a.status === "in-progress").length;
  const todo       = activities.filter(a => a.status === "todo").length;

  const columns: { key: TaskStatus; label: string; borderColor: string; headerBg: string }[] = [
    { key: "todo",         label: "📋 To Do",      borderColor: "border-slate-200",  headerBg: "bg-slate-50"    },
    { key: "in-progress",  label: "⚡ In Progress", borderColor: "border-blue-200",   headerBg: "bg-blue-50"     },
    { key: "done",         label: "✅ Done",        borderColor: "border-emerald-200", headerBg: "bg-emerald-50"  },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Daily Activity Tracker</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Track your tasks for {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchActivities} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <Plus className="w-4 h-4" /> Add Activity
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Completed",   value: totalDone,  icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "In Progress", value: inProgress, icon: PlayCircle,   color: "text-blue-600",    bg: "bg-blue-50"    },
          { label: "Pending",     value: todo,       icon: Circle,       color: "text-slate-500",   bg: "bg-slate-100"  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 ${bg} flex items-center gap-3`}>
            <Icon className={`w-6 h-6 ${color} flex-shrink-0`} />
            <div>
              <p className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</p>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Today&apos;s Progress</span>
          <span className="text-sm font-bold text-emerald-600">
            {activities.length > 0 ? Math.round((totalDone / activities.length) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
            style={{ width: `${activities.length > 0 ? (totalDone / activities.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">{totalDone} of {activities.length} tasks completed</p>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(({ key, label, borderColor, headerBg }) => {
            const colItems = activities.filter(a => a.status === key);
            return (
              <div key={key} className={`bg-white rounded-2xl border ${borderColor} shadow-sm`}>
                <div className={`${headerBg} px-4 py-3 rounded-t-2xl flex items-center justify-between border-b ${borderColor}`}>
                  <h3 className="text-sm font-bold text-slate-700">{label}</h3>
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                    {colItems.length}
                  </span>
                </div>
                <div className="p-3 space-y-2 min-h-[200px]">
                  {colItems.map((a) => {
                    const p = priorityStyle[a.priority as Priority];
                    const catLabel = CATEGORIES.find(c => c.value === a.category)?.label || a.category;
                    return (
                      <div key={a._id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-slate-200 transition-all group">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{a.title}</p>
                          <button onClick={() => deleteItem(a._id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{catLabel}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p}`}>{a.priority}</span>
                        </div>
                        {(a.startTime || a.endTime) && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {a.startTime}{a.endTime && ` → ${a.endTime}`}
                            {a.durationMinutes > 0 && <span className="ml-1 font-medium text-slate-600">({a.durationMinutes}m)</span>}
                          </div>
                        )}
                        <div className="flex gap-1.5 mt-2.5">
                          {key === "todo" && (
                            <button onClick={() => updateStatus(a._id, "in-progress")}
                              className="flex-1 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                              Start
                            </button>
                          )}
                          {key === "in-progress" && (
                            <button onClick={() => updateStatus(a._id, "done")}
                              className="flex-1 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                              Complete
                            </button>
                          )}
                          {key === "done" && (
                            <button onClick={() => updateStatus(a._id, "todo")}
                              className="flex-1 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                              Undo
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {colItems.length === 0 && (
                    <div className="text-center py-8 text-slate-300 text-xs">No tasks here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Add New Activity</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Activity Title *</label>
                <input required type="text" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Call 5 new leads"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Category *</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-slate-50">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Priority *</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-slate-50">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Note</label>
                <textarea rows={2} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-slate-50 resize-none" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-sm disabled:opacity-60">
                  {submitting ? "Adding..." : "Add Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
