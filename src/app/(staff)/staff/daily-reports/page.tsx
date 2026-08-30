"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, Plus, CheckCircle2, Clock,
  User, X, Eye, RefreshCw, AlertCircle,
} from "lucide-react";

const statusMap: Record<string, { label: string; pill: string; icon: any }> = {
  submitted:      { label: "Submitted",     pill: "bg-sky-100 text-sky-700",      icon: Clock        },
  reviewed:       { label: "Reviewed",      pill: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  "needs-revision":{ label: "Needs Revision", pill: "bg-amber-100 text-amber-700", icon: Clock        },
};

export default function DailyReportsPage() {
  const [reports, setReports]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [viewing, setViewing]       = useState<any | null>(null);
  const [staffId, setStaffId]       = useState<string | null>(null);
  const [form, setForm] = useState({
    summary: "", tasks: "", challenges: "", nextDayPlan: "", mood: "good",
  });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d?.success) setStaffId(d.user?._id || null);
    });
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/staff/daily-reports?limit=30");
      const data = await res.json();
      if (data.success) setReports(data.reports || []);
      else setError(data.message);
    } catch {
      setError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) { setError("Could not identify your account."); return; }
    setSubmitting(true);
    setError("");
    try {
      const tasksCompleted = form.tasks
        .split("\n")
        .filter(Boolean)
        .map(t => ({ title: t.trim(), category: "other", hoursSpent: 0 }));

      const res  = await fetch("/api/staff/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff:        staffId,
          date:         new Date().toISOString(),
          summary:      form.summary,
          tasksCompleted,
          challenges:   form.challenges,
          nextDayPlan:  form.nextDayPlan,
          mood:         form.mood,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ summary: "", tasks: "", challenges: "", nextDayPlan: "", mood: "good" });
        fetchReports();
      } else {
        setError(data.message || "Failed to submit report.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string) => {
    try {
      await fetch(`/api/staff/daily-reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      setReports(prev => prev.map(r => r._id === id ? { ...r, status: "reviewed" } : r));
    } catch { /* silent */ }
  };

  const total    = reports.length;
  const reviewed = reports.filter(r => r.status === "reviewed").length;
  const pending  = total - reviewed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Daily Working Reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">Submit and review daily work reports</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchReports} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Submit Today&apos;s Report
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Reports",  value: total,    color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Reviewed",       value: reviewed, color: "text-emerald-600",bg: "bg-emerald-50"},
          { label: "Pending Review", value: pending,  color: "text-amber-600",  bg: "bg-amber-50"  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 ${bg} text-center`}>
            <p className={`text-3xl font-bold ${color}`}>{loading ? "—" : value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
          No daily reports yet. Submit your first report!
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const s = statusMap[r.status] || statusMap.submitted;
            const Icon = s.icon;
            return (
              <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                        {r.staff?.avatar
                          ? <img src={r.staff.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          : <User className="w-5 h-5 text-violet-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{r.staff?.fullName || "—"}</p>
                        <p className="text-xs text-slate-400 capitalize">
                          {r.staff?.designation} ·{" "}
                          {new Date(r.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                        <Icon className="w-3 h-3" />{s.label}
                      </span>
                      <button onClick={() => setViewing(r)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {r.status === "submitted" && (
                        <button onClick={() => handleReview(r._id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{r.summary}</p>
                  {r.tasksCompleted?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.tasksCompleted.slice(0, 3).map((t: any, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                          {t.title}
                        </span>
                      ))}
                      {r.tasksCompleted.length > 3 && (
                        <span className="px-2.5 py-1 bg-violet-100 rounded-full text-xs text-violet-600 font-medium">
                          +{r.tasksCompleted.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900">Submit Daily Report</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Work Summary *</label>
                <textarea required rows={3} value={form.summary}
                  onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                  placeholder="Brief summary of what you accomplished today..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Tasks Completed * <span className="text-slate-400 font-normal">(one per line)</span>
                </label>
                <textarea required rows={5} value={form.tasks}
                  onChange={e => setForm(p => ({ ...p, tasks: e.target.value }))}
                  placeholder={"Task 1\nTask 2\nTask 3"}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 resize-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Challenges / Blockers</label>
                <textarea rows={2} value={form.challenges}
                  onChange={e => setForm(p => ({ ...p, challenges: e.target.value }))}
                  placeholder="Any obstacles or issues faced..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Next Day Plan *</label>
                <textarea required rows={2} value={form.nextDayPlan}
                  onChange={e => setForm(p => ({ ...p, nextDayPlan: e.target.value }))}
                  placeholder="What do you plan to do tomorrow..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">How are you feeling?</label>
                <div className="flex gap-2 flex-wrap">
                  {[["😃","excellent"],["😊","good"],["😐","neutral"],["😴","tired"],["😓","stressed"]].map(([emoji, val]) => (
                    <button key={val} type="button" onClick={() => setForm(p => ({ ...p, mood: val }))}
                      className={`px-3 py-2 rounded-xl text-sm transition-all border
                        ${form.mood === val ? "bg-violet-100 border-violet-300 text-violet-700 font-semibold" : "border-slate-200 hover:bg-slate-50"}`}>
                      {emoji} {val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-sm disabled:opacity-60">
                  {submitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View report modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{viewing.staff?.fullName}&apos;s Report</h3>
              <button onClick={() => setViewing(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400">
                {new Date(viewing.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
                {" · "}{viewing.mood && `Mood: ${viewing.mood}`}
              </p>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm text-slate-700">{viewing.summary}</p>
              </div>
              {viewing.tasksCompleted?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tasks Completed</p>
                  <ul className="space-y-1">
                    {viewing.tasksCompleted.map((t: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {viewing.challenges && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Challenges</p>
                  <p className="text-sm text-slate-700">{viewing.challenges}</p>
                </div>
              )}
              {viewing.nextDayPlan && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Next Day Plan</p>
                  <p className="text-sm text-slate-700">{viewing.nextDayPlan}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
