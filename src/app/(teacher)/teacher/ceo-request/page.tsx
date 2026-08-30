"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Crown,
  AlertTriangle,
  CalendarClock,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  InboxIcon,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface CeoRequest {
  _id: string;
  requestId: string;
  type: "meeting_request" | "problem_report";
  subject: string;
  message: string;
  status: "pending" | "seen" | "in-review" | "responded" | "closed";
  adminResponse?: string;
  respondedBy?: string;
  respondedAt?: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    pending:      { label: "Pending",    cls: "bg-amber-50 text-amber-600 border-amber-200",     dot: "bg-amber-400" },
    seen:         { label: "Seen",       cls: "bg-sky-50 text-sky-600 border-sky-200",            dot: "bg-sky-400" },
    "in-review":  { label: "In Review",  cls: "bg-violet-50 text-violet-600 border-violet-200",   dot: "bg-violet-400" },
    responded:    { label: "Responded",  cls: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-400" },
    closed:       { label: "Closed",     cls: "bg-gray-50 text-gray-400 border-gray-200",          dot: "bg-gray-300" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function TypeChip({ type }: { type: string }) {
  if (type === "meeting_request") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-600">
        <CalendarClock className="w-3 h-3" /> Meeting
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 text-rose-600">
      <AlertTriangle className="w-3 h-3" /> Problem
    </span>
  );
}

export default function CeoRequestPage() {
  const [selectedType, setSelectedType] = useState<"meeting_request" | "problem_report" | "">("");
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]   = useState("");

  const [requests, setRequests]   = useState<CeoRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(true);
  const [monthlyProblemCount, setMonthlyProblemCount] = useState(0);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/teacher-portal/ceo-requests?limit=20");
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        setMonthlyProblemCount(data.monthlyProblemCount || 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) { setErrorMsg("Please select a request type."); return; }
    if (selectedType === "problem_report" && monthlyProblemCount >= 3) {
      setErrorMsg("You have reached the monthly limit of 3 problem reports.");
      return;
    }
    if (!subject.trim()) { setErrorMsg("Subject is required."); return; }
    if (!message.trim()) { setErrorMsg("Message is required."); return; }

    setSubmitting(true); setErrorMsg(""); setSuccessMsg("");
    try {
      const res  = await fetch("/api/teacher-portal/ceo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, subject, message }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Your request has been submitted. The CEO has been notified via Telegram.");
        setSelectedType(""); setSubject(""); setMessage("");
        setShowForm(false);
        fetchRequests();
      } else {
        setErrorMsg(data.message || "Failed to submit request.");
      }
    } catch { setErrorMsg("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">CEO Direct Line</h1>
              <p className="text-xs text-gray-400 mt-0.5">Submit a meeting request or problem report</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRequests}
              className="p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 text-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm border ${
                showForm
                  ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  : "bg-violet-600 border-violet-600 text-white hover:bg-violet-700"
              }`}
            >
              {showForm ? <X className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              {showForm ? "Close" : "New Request"}
            </button>
          </div>
        </div>

        {/* ── Success Banner ── */}
        {successMsg && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Request Submitted Successfully!</p>
              <p className="text-xs mt-0.5 text-emerald-100">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-200 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Form Card ── */}
        {showForm && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Card top accent */}
            <div className="h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />

            <div className="p-6 space-y-6">
              {/* Section label */}
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-gray-800">New Request</span>
                <span className="text-xs text-gray-400">· Notifies CEO via Telegram instantly</span>
              </div>

              {/* Monthly Limit Alert Banner */}
              {monthlyProblemCount >= 3 && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Monthly Limit Reached</p>
                    <p className="text-xs mt-0.5 leading-relaxed">
                      You have submitted <b>{monthlyProblemCount}</b> problem reports this month. The monthly limit is <b>3</b>. Meeting requests are unaffected.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Type Selector ── */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">
                  Request Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  {/* Meeting Request card */}
                  <button
                    type="button"
                    onClick={() => setSelectedType("meeting_request")}
                    className={`relative group text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                      selectedType === "meeting_request"
                        ? "border-blue-500 bg-blue-600 shadow-lg shadow-blue-200"
                        : "border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                      selectedType === "meeting_request" ? "bg-white/20" : "bg-blue-100"
                    }`}>
                      <CalendarClock className={`w-5 h-5 ${selectedType === "meeting_request" ? "text-white" : "text-blue-600"}`} />
                    </div>
                    <p className={`text-sm font-bold ${selectedType === "meeting_request" ? "text-white" : "text-gray-800"}`}>
                      Request CEO Meeting
                    </p>
                    <p className={`text-xs mt-1.5 leading-relaxed ${selectedType === "meeting_request" ? "text-blue-100" : "text-gray-500"}`}>
                      Schedule a direct meeting with the CEO to discuss your concerns or ideas.
                    </p>
                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        selectedType === "meeting_request" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                      }`}>
                        Cost: 10 💎
                      </span>
                    </div>
                    {selectedType === "meeting_request" && (
                      <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>

                  {/* Problem Report card */}
                  <button
                    type="button"
                    disabled={monthlyProblemCount >= 3}
                    onClick={() => setSelectedType("problem_report")}
                    className={`relative group text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                      monthlyProblemCount >= 3
                        ? "border-gray-100 bg-gray-50/50 opacity-60 cursor-not-allowed"
                        : selectedType === "problem_report"
                        ? "border-rose-500 bg-rose-600 shadow-lg shadow-rose-200"
                        : "border-gray-100 bg-gray-50 hover:border-rose-200 hover:bg-rose-50/50"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                      monthlyProblemCount >= 3 ? "bg-gray-200" : selectedType === "problem_report" ? "bg-white/20" : "bg-rose-100"
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${monthlyProblemCount >= 3 ? "text-gray-400" : selectedType === "problem_report" ? "text-white" : "text-rose-600"}`} />
                    </div>
                    <p className={`text-sm font-bold ${monthlyProblemCount >= 3 ? "text-gray-400" : selectedType === "problem_report" ? "text-white" : "text-gray-800"}`}>
                      Report a Problem {monthlyProblemCount >= 3 && <span className="text-[10px] text-rose-600 font-semibold ml-1">(3/3 submitted)</span>}
                    </p>
                    <p className={`text-xs mt-1.5 leading-relaxed ${monthlyProblemCount >= 3 ? "text-gray-400" : selectedType === "problem_report" ? "text-rose-100" : "text-gray-500"}`}>
                      {monthlyProblemCount >= 3
                        ? "You have reached your limit of 3 problem reports for this month. Try again next month."
                        : "Report any issue, complaint, or problem you are facing directly to the CEO."}
                    </p>
                    {selectedType === "problem_report" && monthlyProblemCount < 3 && (
                      <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* ── Subject ── */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={150}
                  placeholder="Brief summary of your request..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 transition-all bg-gray-50 focus:bg-white"
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-gray-300">{subject.length}/150</span>
                </div>
              </div>

              {/* ── Message ── */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={1000}
                  rows={5}
                  placeholder="Describe your request or problem in detail. Include any relevant information that will help the CEO understand your situation..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 transition-all resize-none bg-gray-50 focus:bg-white leading-relaxed"
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-gray-300">{message.length}/1000</span>
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                  <button onClick={() => setErrorMsg("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-violet-200/70 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                    <ArrowRight className="w-4 h-4 ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Submitted Requests List ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-700">My Requests</span>
            </div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              {requests.length}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14 gap-2 text-gray-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <InboxIcon className="w-7 h-7 text-gray-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400">No requests yet</p>
                <p className="text-xs text-gray-300 mt-1">Use the form above to send your first request</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {requests.map((req) => (
                <div key={req._id} className="group">
                  <button
                    onClick={() => setExpandedId(expandedId === req._id ? null : req._id)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                            {req.requestId}
                          </span>
                          <TypeChip type={req.type} />
                          <StatusBadge status={req.status} />
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">{req.subject}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{fmt(req.createdAt)}</p>
                      </div>
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        expandedId === req._id ? "bg-violet-100" : "bg-gray-50 group-hover:bg-gray-100"
                      }`}>
                        {expandedId === req._id
                          ? <ChevronUp className="w-3.5 h-3.5 text-violet-500" />
                          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  {expandedId === req._id && (
                    <div className="px-5 pb-5 space-y-3">
                      {/* Original Message */}
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Your Message</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{req.message}</p>
                      </div>

                      {/* Admin Response */}
                      {req.adminResponse && (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Crown className="w-3.5 h-3.5 text-emerald-600" />
                            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">
                              CEO Response
                              {req.respondedBy && <span className="font-normal text-emerald-500 ml-1 normal-case">— {req.respondedBy}</span>}
                            </p>
                          </div>
                          <p className="text-sm text-emerald-800 whitespace-pre-wrap leading-relaxed">{req.adminResponse}</p>
                          {req.respondedAt && (
                            <p className="text-[10px] text-emerald-400 mt-2">{fmt(req.respondedAt)}</p>
                          )}
                        </div>
                      )}

                      {req.status === "pending" && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          Your request has been sent to the CEO and is awaiting review.
                        </div>
                      )}
                      {req.status === "seen" && (
                        <div className="flex items-center gap-2 text-xs text-sky-600 bg-sky-50 rounded-xl px-3 py-2.5 border border-sky-100">
                          <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                          The CEO has seen your request and will respond soon.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
