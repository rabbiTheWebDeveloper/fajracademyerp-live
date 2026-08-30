"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Search, Filter, Clock, AlertCircle, X, Maximize2, Loader2,
  CheckCircle2, RefreshCw, Send, Tag, AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TicketMessage {
  sender?: string;
  senderModel?: string;
  senderName?: string;
  content: string;
  sentAt?: string;
}

interface SupportTicketItem {
  id: string;
  ticketId: string;
  subject: string;
  student: string;
  category: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed" | "On Hold" | string;
  priority: string;
  createdAt: string;
  notes: string;
  messages: TicketMessage[];
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/support?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      } else {
        setError(data.message || "Failed to load support tickets.");
      }
    } catch {
      setError("Network error. Unable to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTickets();
        if (selectedTicket && selectedTicket.id === id) {
          const statusMap: Record<string, string> = {
            "open": "Open",
            "in-progress": "In Progress",
            "resolved": "Resolved",
            "closed": "Closed",
            "on-hold": "On Hold",
          };
          const formattedStatus = statusMap[status.toLowerCase()] || status;
          setSelectedTicket((prev) => prev ? { ...prev, status: formattedStatus } : null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedTicket) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicket.id, content: replyContent }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyContent("");
        fetchTickets();

        const newMsg = data.ticket.messages?.[data.ticket.messages.length - 1];
        if (newMsg) {
          setSelectedTicket((prev) =>
            prev
              ? {
                  ...prev,
                  status: "In Progress",
                  messages: [...(prev.messages || []), newMsg],
                }
              : null
          );
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const safeFormatDistance = (dateStr?: string) => {
    if (!dateStr) return "recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "recently";
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  const totalOpen = tickets.filter((t) => t.status === "Open" || t.status === "open").length;
  const pendingOver24h = tickets.filter((t) => {
    if (t.status === "Resolved" || t.status === "Closed") return false;
    const time = new Date(t.createdAt).getTime();
    return !isNaN(time) && Date.now() - time > 1000 * 60 * 60 * 24;
  }).length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved" || t.status === "resolved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-blue-600" />
            Support Tickets
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage student inquiries, technical issues, and billing requests.</p>
        </div>
        <button
          onClick={() => fetchTickets()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : "text-gray-500"}`} />
          Refresh List
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Open</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? "-" : totalOpen}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending &gt; 24h</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{loading ? "-" : pendingOver24h}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolved Tickets</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{loading ? "-" : resolvedCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchTickets()}
            className="text-xs font-bold underline hover:no-underline ml-4 text-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters and Table Container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject, ticket ID, student name..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="on-hold">On Hold</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            >
              <option value="all">All Categories</option>
              <option value="academic">Academic</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="administrative">Administrative</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/75 text-gray-700 font-semibold border-b border-gray-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Ticket ID</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Raised By</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Opened</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-xs text-gray-400">Loading support tickets...</p>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-600">No support tickets found</p>
                    <p className="text-xs text-gray-400 mt-1">There are no tickets matching your current search or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const time = new Date(t.createdAt).getTime();
                  const isOver24 = !isNaN(time) && Date.now() - time > 1000 * 60 * 60 * 24;
                  const isUrgent = isOver24 && t.status !== "Resolved" && t.status !== "Closed";

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-gray-50/75 transition-colors ${
                        isUrgent ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-mono text-xs font-bold text-gray-700">
                        <span className="bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                          {t.ticketId}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                        {isUrgent && (
                          <span title="Pending > 24 hours">
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          </span>
                        )}
                        <span className="truncate max-w-xs">{t.subject}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium">{t.student}</td>
                      <td className="px-6 py-4 capitalize">
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {t.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            t.status === "Open"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : t.status === "In Progress"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : t.status === "Resolved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : t.status === "Closed"
                              ? "bg-gray-100 text-gray-700 border border-gray-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {safeFormatDistance(t.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details & Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start p-6 border-b border-gray-100 flex-shrink-0 bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    {selectedTicket.ticketId}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    Status: <strong className="text-gray-800">{selectedTicket.status}</strong>
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{selectedTicket.subject}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setReplyContent("");
                }}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-gray-100 flex-shrink-0">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Raised By</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedTicket.student}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Category</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5 capitalize">{selectedTicket.category}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Priority</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5 capitalize">{selectedTicket.priority}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Opened</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{safeFormatDistance(selectedTicket.createdAt)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" /> Message Thread
                </h4>
                <div className="space-y-3 max-h-[260px] overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-200">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg, idx) => {
                      const isUser = msg.senderModel === "User";
                      return (
                        <div key={idx} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                          <div
                            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                              isUser ? "bg-blue-600 text-white" : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {msg.senderName?.charAt(0) || "U"}
                          </div>
                          <div className="flex flex-col max-w-[75%]">
                            <span className={`text-[10px] text-gray-400 mb-0.5 ${isUser ? "text-right" : ""}`}>
                              {msg.senderName || "Unknown"} ({msg.senderModel || "User"})
                            </span>
                            <div
                              className={`p-3 rounded-2xl text-sm ${
                                isUser ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm"
                              }`}
                            >
                              {msg.content}
                            </div>
                            <span className={`text-[9px] text-gray-400 mt-1 ${isUser ? "text-right" : ""}`}>
                              {msg.sentAt
                                ? new Date(msg.sentAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-4">No message thread history for this ticket.</p>
                  )}
                </div>
              </div>

              {selectedTicket.status !== "Resolved" && selectedTicket.status !== "Closed" && (
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Write a Response</label>
                  <div className="flex gap-2">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      placeholder="Type your response/feedback to the user..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 resize-none"
                    />
                    <button
                      onClick={handleReply}
                      disabled={actionLoading || !replyContent.trim()}
                      className="px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-colors flex items-center gap-1.5"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Update Status:</span>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    updateStatus(selectedTicket.id, newStatus);
                  }}
                  disabled={actionLoading}
                  className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-700"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              {selectedTicket.status !== "Resolved" && (
                <button
                  onClick={() => updateStatus(selectedTicket.id, "resolved")}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Quick Resolve</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
