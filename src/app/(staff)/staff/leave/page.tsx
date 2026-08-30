"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, CheckCircle2, XCircle, Clock,
  Calendar, AlertCircle, X, RefreshCw,
} from "lucide-react";

const leaveTypes = [
  { value: "sick-leave",       label: "Sick Leave"        },
  { value: "casual-leave",     label: "Casual Leave"      },
  { value: "annual-leave",     label: "Annual Leave"      },
  { value: "emergency-leave",  label: "Emergency Leave"   },
  { value: "maternity-leave",  label: "Maternity Leave"   },
  { value: "paternity-leave",  label: "Paternity Leave"   },
  { value: "earned-leave",     label: "Earned Leave"      },
  { value: "unpaid-leave",     label: "Unpaid Leave"      },
];

const statusStyle: Record<string, { pill: string; icon: any }> = {
  pending:  { pill: "bg-amber-100 text-amber-700",      icon: Clock        },
  approved: { pill: "bg-emerald-100 text-emerald-700",  icon: CheckCircle2 },
  rejected: { pill: "bg-red-100 text-red-600",          icon: XCircle      },
  cancelled:{ pill: "bg-slate-100 text-slate-500",      icon: XCircle      },
};

export default function LeavePage() {
  const [leaves, setLeaves]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"mine"|"all">("mine");
  const [staffId, setStaffId]     = useState<string | null>(null);
  const [form, setForm]           = useState({ leaveType: "", fromDate: "", toDate: "", reason: "" });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d?.success) setStaffId(d.user?._id || null);
    });
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = activeTab === "mine" && staffId
        ? `/api/staff/leave?staffId=${staffId}&limit=50`
        : `/api/staff/leave?limit=50`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.success) setLeaves(data.leaves || []);
      else setError(data.message);
    } catch {
      setError("Failed to load leave applications.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, staffId]);

  useEffect(() => { if (staffId !== undefined) fetchLeaves(); }, [fetchLeaves, staffId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) { setError("Could not identify your account."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res  = await fetch("/api/staff/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff: staffId, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm({ leaveType: "", fromDate: "", toDate: "", reason: "" });
        fetchLeaves();
      } else {
        setError(data.message || "Failed to submit application.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    try {
      const res  = await fetch(`/api/staff/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setLeaves(prev => prev.map(l => l._id === id ? { ...l, status } : l));
      }
    } catch {
      setError("Action failed. Please try again.");
    }
  };

  const pendingCount  = leaves.filter(l => l.status === "pending").length;
  const approvedCount = leaves.filter(l => l.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leave Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Apply for leave and track approval status</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchLeaves} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Apply for Leave
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
          { label: "Total",    value: leaves.length,  color: "text-slate-700",   bg: "bg-slate-100"  },
          { label: "Pending",  value: pendingCount,   color: "text-amber-600",   bg: "bg-amber-50"   },
          { label: "Approved", value: approvedCount,  color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 ${bg} text-center`}>
            <p className={`text-3xl font-bold ${color}`}>{loading ? "—" : value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-5 pt-5 flex items-center gap-4 border-b border-slate-50 pb-0">
          {[{ key: "mine", label: "My Applications" }, { key: "all", label: "All Staff Requests" }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors
                ${activeTab === key ? "border-amber-500 text-amber-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-slate-300" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-50">
                  {activeTab === "all" && <th className="px-5 py-3 text-left font-semibold">Staff</th>}
                  <th className="px-5 py-3 text-left font-semibold">Type</th>
                  <th className="px-5 py-3 text-left font-semibold">Period</th>
                  <th className="px-5 py-3 text-left font-semibold">Days</th>
                  <th className="px-5 py-3 text-left font-semibold">Reason</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  {activeTab === "all" && <th className="px-5 py-3 text-left font-semibold">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leaves.map((l) => {
                  const s = statusStyle[l.status] || statusStyle.pending;
                  const Icon = s.icon;
                  const typeLabel = leaveTypes.find(t => t.value === l.leaveType)?.label || l.leaveType;
                  return (
                    <tr key={l._id} className="hover:bg-slate-50 transition-colors">
                      {activeTab === "all" && (
                        <td className="px-5 py-3 font-semibold text-slate-800">{l.staff?.fullName || "—"}</td>
                      )}
                      <td className="px-5 py-3 text-slate-700 font-medium">{typeLabel}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {new Date(l.fromDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                        {l.fromDate !== l.toDate && ` → ${new Date(l.toDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{l.totalDays}d</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 max-w-[160px] truncate">{l.reason}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                          <Icon className="w-3 h-3" />
                          {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                        </span>
                      </td>
                      {activeTab === "all" && (
                        <td className="px-5 py-3">
                          {l.status === "pending" && (
                            <div className="flex gap-2">
                              <button onClick={() => handleAction(l._id, "approved")} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">Approve</button>
                              <button onClick={() => handleAction(l._id, "rejected")} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors">Reject</button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {leaves.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">No leave applications found.</div>
            )}
          </div>
        )}
      </div>

      {/* Apply modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Apply for Leave</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Leave Type *</label>
                <select required value={form.leaveType} onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50">
                  <option value="">Select type...</option>
                  {leaveTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">From Date *</label>
                  <input required type="date" value={form.fromDate} onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">To Date *</label>
                  <input required type="date" value={form.toDate} onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reason *</label>
                <textarea required rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Briefly describe your reason..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50 resize-none" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-sm disabled:opacity-60">
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
