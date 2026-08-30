"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Crown,
  CalendarClock,
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle2,
  Loader2,
  Search,
  RefreshCw,
  X,
  Send,
  MessageSquare,
  InboxIcon,
  Users,
  TrendingUp,
  ChevronRight,
  User,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";

interface CeoRequest {
  _id: string;
  requestId: string;
  type: "meeting_request" | "problem_report";
  subject: string;
  message: string;
  teacherId?: { _id: string; avatar?: string } | null;
  teacherName: string;
  teacherEmail: string;
  teacherPhone: string;
  teacherDesignation: string;
  status: "pending" | "seen" | "in-review" | "responded" | "closed";
  adminResponse?: string;
  respondedBy?: string;
  respondedAt?: string;
  seenAt?: string;
  createdAt: string;
}

interface Stats {
  pending: number;
  seen: number;
  "in-review": number;
  responded: number;
  closed: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    pending:     { label: "Pending",   cls: "bg-amber-100 text-amber-700 border-amber-200",      icon: Clock },
    seen:        { label: "Seen",      cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: Eye },
    "in-review": { label: "In Review", cls: "bg-indigo-100 text-indigo-700 border-indigo-200",   icon: Loader2 },
    responded:   { label: "Responded", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    closed:      { label: "Closed",    cls: "bg-gray-100 text-gray-500 border-gray-200",          icon: X },
  };
  const s = map[status] || map.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${s.cls}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "meeting_request") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
        <CalendarClock className="w-3 h-3" /> Meeting
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> Problem
    </span>
  );
}

const FILTER_TABS = [
  { key: "all",             label: "All" },
  { key: "pending",         label: "Pending" },
  { key: "seen",            label: "Seen" },
  { key: "in-review",      label: "In Review" },
  { key: "responded",       label: "Responded" },
  { key: "closed",          label: "Closed" },
];

const STATUS_OPTIONS = ["pending", "seen", "in-review", "responded", "closed"];

export default function CeoRequestsAdminPage() {
  const [requests, setRequests] = useState<CeoRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, seen: 0, "in-review": 0, responded: 0, closed: 0 });
  const [typeStats, setTypeStats] = useState({ meeting_request: 0, problem_report: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState<CeoRequest | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (activeFilter !== "all") params.set("status", activeFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/ceo-requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        setStats(data.stats || {});
        setTypeStats(data.typeStats || {});
        setTotal(data.total || 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [activeFilter, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const openRequest = async (req: CeoRequest) => {
    setSelectedReq(req);
    setResponseText(req.adminResponse || "");
    setNewStatus(req.status);
    setSuccessMsg("");

    // Auto-mark as seen
    if (req.status === "pending") {
      await fetch("/api/admin/ceo-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: req._id, status: "seen" }),
      });
      setRequests(prev => prev.map(r => r._id === req._id ? { ...r, status: "seen" } : r));
      setSelectedReq(prev => prev ? { ...prev, status: "seen" } : prev);
    }
  };

  const handleSave = async () => {
    if (!selectedReq) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ceo-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReq._id,
          status: newStatus || selectedReq.status,
          adminResponse: responseText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Response saved successfully!");
        setSelectedReq(data.request);
        setRequests(prev => prev.map(r => r._id === data.request._id ? data.request : r));
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/ceo-requests?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setRequests(prev => prev.filter(r => r._id !== id));
        setSelectedReq(null);
        fetchRequests();
      } else {
        alert(data.message || "Failed to delete request");
      }
    } catch {
      alert("Error deleting request");
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const pendingCount = stats.pending || 0;
  const totalAll = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CEO Requests</h1>
            <p className="text-sm text-gray-500 mt-0.5">Teacher meeting requests &amp; problem reports</p>
          </div>
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold border border-red-200 animate-pulse">
              {pendingCount} new
            </span>
          )}
        </div>
        <button
          onClick={fetchRequests}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total",        val: totalAll,              icon: Crown,       cls: "from-indigo-500 to-blue-600",   bg: "bg-indigo-50" },
          { label: "Pending",      val: stats.pending || 0,    icon: Clock,       cls: "from-amber-500 to-orange-500",  bg: "bg-amber-50" },
          { label: "Meeting Req.", val: typeStats.meeting_request || 0, icon: CalendarClock, cls: "from-blue-500 to-cyan-600", bg: "bg-blue-50" },
          { label: "Problems",     val: typeStats.problem_report || 0, icon: AlertTriangle, cls: "from-rose-500 to-red-600",   bg: "bg-rose-50" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <Icon className="w-4.5 h-4.5 text-gray-600" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT: Request List ── */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search requests..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-50 overflow-x-auto">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeFilter === tab.key
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                {tab.key === "pending" && stats.pending > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[9px] rounded-full px-1">{stats.pending}</span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <InboxIcon className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-400">No requests found</p>
              </div>
            ) : (
              requests.map(req => (
                <button
                  key={req._id}
                  onClick={() => openRequest(req)}
                  className={`w-full text-left p-4 hover:bg-indigo-50/50 transition-colors group ${
                    selectedReq?._id === req._id ? "bg-indigo-50 border-l-4 border-indigo-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <TypeBadge type={req.type} />
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{req.subject}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {req.teacherId && typeof req.teacherId === "object" && req.teacherId.avatar ? (
                          <img
                            src={req.teacherId.avatar}
                            alt={req.teacherName}
                            className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-xs text-gray-500 truncate">{req.teacherName}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{fmt(req.createdAt)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 mt-1 flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-50 text-center">
            <span className="text-xs text-gray-400">{total} total request{total !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* ── RIGHT: Detail Panel ── */}
        <div className="lg:col-span-3">
          {!selectedReq ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm h-full min-h-[400px] flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-indigo-300" />
              </div>
              <p className="text-base font-semibold text-gray-500">Select a request to view details</p>
              <p className="text-sm text-gray-400 max-w-xs">Click any request from the list on the left to view the full message and respond</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Detail Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-indigo-200 bg-white/20 px-2 py-0.5 rounded">
                        {selectedReq.requestId}
                      </span>
                      <TypeBadge type={selectedReq.type} />
                      <StatusBadge status={selectedReq.status} />
                    </div>
                    <h2 className="text-base font-bold text-white leading-snug">{selectedReq.subject}</h2>
                    <p className="text-xs text-indigo-200 mt-1">{fmt(selectedReq.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <button
                      onClick={() => handleDeleteRequest(selectedReq._id)}
                      disabled={deleting}
                      className="text-white/60 hover:text-red-200 p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0 transition-colors"
                      title="Delete Request"
                    >
                      {deleting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Trash2 className="w-4.5 h-4.5" />}
                    </button>
                    <button
                      onClick={() => setSelectedReq(null)}
                      className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Teacher Info */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-4">
                  {selectedReq.teacherId && typeof selectedReq.teacherId === "object" && selectedReq.teacherId.avatar ? (
                    <img
                      src={selectedReq.teacherId.avatar}
                      alt={selectedReq.teacherName}
                      className="w-11 h-11 rounded-full object-cover border border-gray-200 flex-shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-500">
                      <User className="w-5.5 h-5.5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Teacher Information
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{selectedReq.teacherName}</span>
                      </div>
                      {selectedReq.teacherDesignation && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{selectedReq.teacherDesignation}</span>
                        </div>
                      )}
                      {selectedReq.teacherEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <a href={`mailto:${selectedReq.teacherEmail}`} className="text-sm text-indigo-600 hover:underline truncate">
                            {selectedReq.teacherEmail}
                          </a>
                        </div>
                      )}
                      {selectedReq.teacherPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{selectedReq.teacherPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </p>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedReq.message}</p>
                  </div>
                </div>

                {/* Previous Response */}
                {selectedReq.adminResponse && (
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" /> Previous Response
                      {selectedReq.respondedBy && <span className="font-normal">— {selectedReq.respondedBy}</span>}
                    </p>
                    <p className="text-sm text-emerald-800 whitespace-pre-wrap">{selectedReq.adminResponse}</p>
                    {selectedReq.respondedAt && (
                      <p className="text-[11px] text-emerald-500 mt-2">{fmt(selectedReq.respondedAt)}</p>
                    )}
                  </div>
                )}

                {/* Update Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                      Update Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Response Textarea */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Write Response
                  </label>
                  <textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    rows={4}
                    placeholder="Type your response to the teacher here..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                </div>

                {/* Success */}
                {successMsg && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {successMsg}
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Save Response &amp; Update Status</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
