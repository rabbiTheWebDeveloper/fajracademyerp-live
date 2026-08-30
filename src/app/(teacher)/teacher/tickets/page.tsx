"use client";

import { useState, useEffect } from "react";
import {
  Ticket,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  MessageSquare,
  ChevronRight,
  Plus,
  Send,
  RefreshCw,
  InboxIcon,
  Tag,
  CircleCheck,
  CircleAlert,
  Circle,
  Hourglass,
  CalendarDays,
  Sparkles,
  Pencil,
  Info,
} from "lucide-react";

interface TicketMessage {
  senderName?: string;
  senderModel?: string;
  content: string;
  sentAt: string;
}

interface TicketItem {
  _id: string;
  ticketId: string;
  title: string;
  description: string;
  category: string;
  status: "open" | "in-progress" | "resolved" | "closed" | "on-hold";
  raisedByName?: string;
  raisedByEmail?: string;
  assignedToName?: string;
  assignedTo?: { fullName?: string; email?: string };
  createdAt: string;
  updatedAt?: string;
  messages?: TicketMessage[];
}

const CATEGORIES = [
  "Salary Issue",
  "Student Issue",
  "Payment Issue",
  "Schedule Issue",
  "HR Issue",
  "IT Support",
  "Class Issue",
  "Software / System Issue",
  "Academic Support",
  "Teacher Issue",
  "General Complaint & Feedback",
  "Other",
];

const STATUS_TABS = [
  { key: "all",         label: "All Tickets" },
  { key: "open",        label: "Open" },
  { key: "in-progress", label: "In Progress" },
  { key: "resolved",    label: "Resolved" },
  { key: "closed",      label: "Closed" },
];

function StatusBadge({ status }: { status: string }) {
  const st = (status || "open").toLowerCase();
  if (st === "resolved" || st === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CircleCheck className="w-3 h-3" /> Resolved
      </span>
    );
  }
  if (st === "in-progress" || st === "in progress") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Hourglass className="w-3 h-3" /> In Progress
      </span>
    );
  }
  if (st === "closed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
        <CircleAlert className="w-3 h-3" /> Closed
      </span>
    );
  }
  if (st === "on-hold") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
        <Clock className="w-3 h-3" /> On Hold
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
      <Circle className="w-3 h-3" /> Open
    </span>
  );
}

function formatDate(isoStr: string) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function TeacherTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusCounts, setStatusCounts] = useState({ open: 0, "in-progress": 0, resolved: 0, closed: 0, "on-hold": 0 });

  // Create Form state
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Edit Ticket Modal state
  const [editTicket, setEditTicket] = useState<TicketItem | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Detail Modal
  const [detailTicket, setDetailTicket] = useState<TicketItem | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (statusTab !== "all") params.append("status", statusTab);
      if (search) params.append("search", search);
      const res = await fetch(`/api/teacher-portal/tickets?${params}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
        setTotalPages(data.totalPages || 1);
        setTotalTickets(data.total || 0);
        if (data.statusCounts) setStatusCounts(data.statusCounts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [page, statusTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  // Rule: Check if teacher has any active tickets (open, in-progress, on-hold)
  const openCount     = statusCounts["open"] ?? 0;
  const progressCount = statusCounts["in-progress"] ?? 0;
  const onHoldCount   = statusCounts["on-hold"] ?? 0;
  const resolvedCount = statusCounts["resolved"] ?? 0;
  const closedCount   = statusCounts["closed"] ?? 0;
  const hasActiveTicket = (openCount + progressCount + onHoldCount) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (hasActiveTicket) {
      setFormError("You have an active support ticket in progress. System allows 1 active ticket at a time. Once resolved or closed, you can create another ticket.");
      return;
    }

    if (!category) { setFormError("Please select a category."); return; }
    if (!description.trim()) { setFormError("Please write a description."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher-portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: category.split("(")[0].trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormSuccess(true);
        setCategory("");
        setDescription("");
        setTimeout(() => {
          setShowForm(false);
          setFormSuccess(false);
          setPage(1);
          fetchTickets();
        }, 1400);
      } else {
        setFormError(data.message || "Failed to create ticket.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (t: TicketItem) => {
    setEditTicket(t);
    // Find matching category or fallback
    const matchedCategory = CATEGORIES.find(c => c.toLowerCase().includes(t.category.toLowerCase())) || CATEGORIES[0];
    setEditCategory(matchedCategory);
    setEditDescription(t.description || "");
    setEditError("");
    setEditSuccess(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTicket) return;
    setEditError("");

    if (!editDescription.trim()) {
      setEditError("Description cannot be empty.");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("/api/teacher-portal/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: editTicket._id,
          category: editCategory,
          title: editCategory.split("(")[0].trim(),
          description: editDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditSuccess(true);
        setTimeout(() => {
          setEditTicket(null);
          setEditSuccess(false);
          if (detailTicket && detailTicket._id === editTicket._id) {
            setDetailTicket({ ...detailTicket, description: editDescription.trim(), title: editCategory.split("(")[0].trim() });
          }
          fetchTickets();
        }, 1200);
      } else {
        setEditError(data.message || "Failed to update ticket.");
      }
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6 pb-12">

      {/* ── Page Header (same style as schedule page) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-semibold backdrop-blur-md mb-2">
            <Ticket className="w-3.5 h-3.5 text-indigo-400" />
            <span>Teacher Portal — Help Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Support Tickets
          </h1>
          <p className="text-sm text-slate-300">{today}</p>
        </div>

        {/* CTA Button on header */}
        <div className="relative z-10 shrink-0">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2.5 bg-white text-indigo-900 font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg hover:bg-indigo-50 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create New Ticket
          </button>
        </div>
      </div>

      {/* ── Active Ticket Rule Notice Banner (Shown when teacher has an active ticket) ── */}
      {hasActiveTicket && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-sm text-amber-900">
            <h4 className="font-bold flex items-center gap-2">
              Active Support Ticket In Progress
              <span className="text-[11px] font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                1 Ticket Limit Policy
              </span>
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              You currently have an active support ticket pending resolution. System policy allows <strong>1 active ticket</strong> at a time. Once your current ticket is marked as <strong>Resolved</strong> or <strong>Closed</strong> by support, you can submit a new ticket.
            </p>
          </div>
        </div>
      )}

      {/* ── Stat Cards (same style as schedule page) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl shrink-0">
            <Circle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Open</p>
            <p className="text-xl font-extrabold text-gray-900">{openCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Hourglass className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">In Progress</p>
            <p className="text-xl font-extrabold text-gray-900">{progressCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CircleCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Resolved</p>
            <p className="text-xl font-extrabold text-gray-900">{resolvedCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Total</p>
            <p className="text-xl font-extrabold text-gray-900">{totalTickets}</p>
          </div>
        </div>
      </div>

      {/* ── Create Ticket Form (slides in) ── */}
      {showForm && (
        <div className="bg-white border border-indigo-100 rounded-2xl shadow-lg overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              Create New Support Ticket
            </h2>
            <button
              onClick={() => { setShowForm(false); setFormError(""); setFormSuccess(false); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {hasActiveTicket && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>You currently have an active support ticket. Please wait until it is <strong>Resolved</strong> or <strong>Closed</strong> before creating a new ticket.</span>
              </div>
            )}

            {formError && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                Ticket submitted successfully! Loading your updated list...
              </div>
            )}

            {/* Category Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Complaint Category <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  disabled={hasActiveTicket}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>Please select complaint type</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Describe Your Issue <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                disabled={hasActiveTicket}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write here... Describe your issue in detail so our support team can help you faster."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-y placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(""); }}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || hasActiveTicket}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Send Ticket</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Status Filter Tabs + Search (same as schedule nav tabs) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-1">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none min-w-max">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusTab(tab.key); setPage(1); }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                statusTab === tab.key
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 bg-white rounded-xl pl-9 pr-3 py-2 text-xs w-48 sm:w-56 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-gray-700 placeholder:text-gray-400"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>
          <button
            onClick={() => fetchTickets()}
            className="p-2.5 border border-gray-200 bg-white rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Ticket List ── */}
      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <InboxIcon className="w-8 h-8 text-indigo-400" />
          </div>
          <h4 className="text-lg font-bold text-gray-900">No Tickets Found</h4>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            No support tickets match your current filter. Create a new ticket to get help from our team.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" /> Create New Ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
            >
              {/* Left accent border based on status */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                  ticket.status === "open" ? "bg-sky-400" :
                  ticket.status === "in-progress" ? "bg-amber-400" :
                  ticket.status === "resolved" ? "bg-emerald-400" :
                  "bg-gray-300"
                }`}
              />

              <div
                onClick={() => setDetailTicket(ticket)}
                className="flex items-start gap-4 pl-3 min-w-0 cursor-pointer flex-1"
              >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  ticket.status === "open" ? "bg-sky-50 text-sky-600" :
                  ticket.status === "in-progress" ? "bg-amber-50 text-amber-600" :
                  ticket.status === "resolved" ? "bg-emerald-50 text-emerald-600" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  <Ticket className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                      #{ticket.ticketId || ticket._id.slice(-6)}
                    </span>
                    <StatusBadge status={ticket.status} />
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                      {ticket.category || "general"}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-gray-900 group-hover:text-indigo-700 transition-colors truncate">
                    {ticket.title || ticket.category || "Support Ticket"}
                  </h4>

                  <p className="text-xs text-gray-500 line-clamp-1">
                    {ticket.description}
                  </p>
                </div>
              </div>

              {/* Right Actions: Edit Button + Date + Assigned To + Arrow */}
              <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0 pl-3 sm:pl-0 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                <div className="flex items-center gap-2">
                  {ticket.status === "open" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(ticket); }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                      title="Edit Ticket"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-300" />
                    {formatDate(ticket.createdAt)}
                  </div>
                </div>

                {(ticket.assignedToName || ticket.assignedTo?.fullName) && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                    <Tag className="w-3.5 h-3.5" />
                    {ticket.assignedToName || ticket.assignedTo?.fullName}
                  </div>
                )}

                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setDetailTicket(ticket)}>
                  {ticket.messages && ticket.messages.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <MessageSquare className="w-3 h-3" />
                      {ticket.messages.length} {ticket.messages.length === 1 ? "reply" : "replies"}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-3.5 shadow-sm">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 rounded-xl transition-all"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-500 font-medium">
            Page <span className="font-bold text-gray-900">{page}</span> of {totalPages}
            <span className="hidden sm:inline"> · {totalTickets} total tickets</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 rounded-xl transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Ticket History Table ── */}
      {!loading && tickets.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <Ticket className="w-4 h-4 text-indigo-600" />
              </div>
              Ticket History
            </h3>
            <span className="text-xs text-gray-400 font-medium">{totalTickets} total record{totalTickets !== 1 ? "s" : ""}</span>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 px-5 py-3">Ticket ID</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 px-4 py-3">Title</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 px-4 py-3 hidden md:table-cell">Description</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 px-4 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 px-4 py-3 hidden lg:table-cell">Assigned To</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider text-gray-500 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    onClick={() => setDetailTicket(ticket)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    {/* Ticket ID */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                        #{ticket.ticketId || ticket._id.slice(-6)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={ticket.status} />
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <p className="font-semibold text-gray-900 text-xs truncate group-hover:text-indigo-700 transition-colors">
                        {ticket.title || ticket.category || "Support Ticket"}
                      </p>
                      <p className="text-[10px] text-gray-400 capitalize mt-0.5">{ticket.category}</p>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3.5 hidden md:table-cell max-w-[240px]">
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap hidden sm:table-cell">
                      <p className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-3.5 whitespace-nowrap hidden lg:table-cell">
                      {(ticket.assignedToName || ticket.assignedTo?.fullName) ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(ticket.assignedToName || ticket.assignedTo?.fullName || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">
                            {ticket.assignedToName || ticket.assignedTo?.fullName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      {ticket.status === "open" && (
                        <button
                          onClick={() => openEditModal(ticket)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit Ticket Modal ── */}
      {editTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Edit Support Ticket</h3>
                  <p className="text-xs font-mono text-indigo-600">#{editTicket.ticketId || editTicket._id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditTicket(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  Ticket updated successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Complaint Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTicket(null)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-60"
                >
                  {updating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Ticket Detail Modal ── */}
      {detailTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-100 px-3 py-1 rounded-xl border border-indigo-200">
                  #{detailTicket.ticketId || detailTicket._id}
                </span>
                <StatusBadge status={detailTicket.status} />
              </div>
              <div className="flex items-center gap-2">
                {detailTicket.status === "open" && (
                  <button
                    onClick={() => { const t = detailTicket; setDetailTicket(null); openEditModal(t); }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Ticket
                  </button>
                )}
                <button
                  onClick={() => setDetailTicket(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">{detailTicket.title}</h3>
                <p className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                  <span>Filed: {formatDate(detailTicket.createdAt)}</span>
                  {(detailTicket.assignedToName || detailTicket.assignedTo?.fullName) && (
                    <span className="font-semibold text-indigo-600">
                      Assigned: {detailTicket.assignedToName || detailTicket.assignedTo?.fullName}
                    </span>
                  )}
                </p>
              </div>

              {/* Original Description */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">
                  Your Complaint
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {detailTicket.description}
                </p>
              </div>

              {/* Messages */}
              {detailTicket.messages && detailTicket.messages.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    Replies & Updates ({detailTicket.messages.length})
                  </h4>
                  <div className="space-y-2.5">
                    {detailTicket.messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border text-sm space-y-1.5 ${
                          m.senderModel === "Teacher"
                            ? "bg-indigo-50 border-indigo-100 text-indigo-900"
                            : "bg-gray-50 border-gray-200 text-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold uppercase tracking-wide ${m.senderModel === "Teacher" ? "text-indigo-600" : "text-gray-500"}`}>
                            {m.senderName || (m.senderModel === "Teacher" ? "You" : "Support Team")}
                          </span>
                          <span className="text-gray-400">{formatDate(m.sentAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setDetailTicket(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
