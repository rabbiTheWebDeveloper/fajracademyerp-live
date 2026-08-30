"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Calendar, Clock, CheckCircle2, XCircle, MinusCircle,
  Search, RefreshCw, ChevronLeft, ChevronRight,
  FileText, Printer, Filter, TrendingUp, Award,
  BookOpen, Users, AlertCircle, ArrowLeft,
  CheckSquare, BarChart2, Activity, LayoutGrid, List, X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Session {
  _id: string;
  classId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  duration: number;
  actualDuration: number | null;
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "paused";
  studentAttendance: "present" | "absent" | "not-marked";
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  notes: string;
  student: { _id: string; fullName: string; studentId: string; avatar: string; phone: string } | null;
  course: { _id: string; title: string; level: string } | null;
}

interface Summary {
  total: number;
  present: number;
  absent: number;
  notMarked: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  totalMins: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt12(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function monthLabel(m: string) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function fmtDate(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient, loading }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string; loading?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 ${gradient} shadow-sm border border-white/20 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200`}>
      <div className="flex items-start justify-between">
        <div className="bg-white/25 p-2 rounded-xl"><Icon className="w-4 h-4 text-white" /></div>
        <TrendingUp className="w-3.5 h-3.5 text-white/40" />
      </div>
      <div className="mt-3">
        {loading
          ? <div className="h-6 w-16 bg-white/30 rounded-lg animate-pulse mb-1" />
          : <p className="text-xl font-bold text-white">{value}</p>}
        <p className="text-white/80 text-xs font-medium mt-0.5">{label}</p>
        {sub && <p className="text-white/60 text-[10px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Attendance Badge ─────────────────────────────────────────────────────────
function AttBadge({ status }: { status: string }) {
  switch (status) {
    case "present":    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Present
      </span>
    );
    case "absent":     return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" /> Absent
      </span>
    );
    default: return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
        <MinusCircle className="w-3 h-3" /> Not Marked
      </span>
    );
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    "scheduled":   "bg-blue-100 text-blue-700 border border-blue-200",
    "in-progress": "bg-amber-100 text-amber-700 border border-amber-200",
    "completed":   "bg-emerald-100 text-emerald-700 border border-emerald-200",
    "cancelled":   "bg-red-100 text-red-700 border border-red-200",
  };
  const labels: Record<string, string> = {
    "scheduled": "Scheduled", "in-progress": "In Progress",
    "completed": "Completed", "cancelled": "Cancelled",
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${cfg[status] || "bg-gray-100 text-gray-500 border border-gray-200"}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Level Badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: string }) {
  const cls = level === "beginner" ? "bg-blue-50 text-blue-600"
    : level === "intermediate" ? "bg-purple-50 text-purple-600"
    : level === "advanced" ? "bg-rose-50 text-rose-600"
    : "bg-gray-50 text-gray-500";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize font-medium ${cls}`}>{level}</span>;
}

// ─── Pagination Controls ──────────────────────────────────────────────────────
function Pagination({ pagination, onPage }: { pagination: Pagination; onPage: (n: number) => void }) {
  const { page, totalPages, total, limit } = pagination;
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  // Build visible page numbers
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/40">
      <p className="text-xs text-gray-500">
        Showing <strong className="text-gray-700">{start}–{end}</strong> of <strong className="text-gray-700">{total}</strong> sessions
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
                page === p
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ sessions, month }: { sessions: Session[]; month: string }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Build day → sessions map using useMemo (pure client-side, zero extra API calls)
  const { year, mo, daysInMonth, firstDow, byDay } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    const fdow = new Date(y, m - 1, 1).getDay(); // 0=Sun
    const map: Record<number, Session[]> = {};
    sessions.forEach(s => {
      const d = new Date(s.createdAt);
      if (d.getFullYear() === y && d.getMonth() + 1 === m) {
        const day = d.getDate();
        (map[day] = map[day] || []).push(s);
      }
    });
    return { year: y, mo: m, daysInMonth: dim, firstDow: fdow, byDay: map };
  }, [sessions, month]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === mo;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  // Status → dot color
  const dotColor = (s: Session) => {
    if (s.status === "completed") return s.studentAttendance === "present" ? "bg-emerald-400" : s.studentAttendance === "absent" ? "bg-red-400" : "bg-amber-300";
    if (s.status === "in-progress" || s.status === "paused") return "bg-blue-400";
    if (s.status === "scheduled") return "bg-indigo-300";
    return "bg-gray-300";
  };

  const selectedSessions = selectedDay ? (byDay[selectedDay] || []) : [];

  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Calendar header row */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {dayNames.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }).map((_, i) => {
          const day = i - firstDow + 1;
          const isValid = day >= 1 && day <= daysInMonth;
          const daySessions = byDay[day] || [];
          const isToday = day === todayDate;
          const isSelected = day === selectedDay;
          const hasClass = daySessions.length > 0;

          return (
            <div
              key={i}
              onClick={() => isValid && setSelectedDay(isSelected ? null : day)}
              className={`min-h-[72px] sm:min-h-[88px] p-1.5 border-b border-r border-gray-50 transition-colors ${
                !isValid ? "bg-gray-50/50" :
                isSelected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400" :
                hasClass ? "hover:bg-indigo-50/40 cursor-pointer" :
                "hover:bg-gray-50 cursor-default"
              }`}
            >
              {isValid && (
                <>
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full mb-1 text-xs font-bold mx-auto ${
                    isToday ? "bg-indigo-600 text-white" :
                    isSelected ? "bg-indigo-200 text-indigo-800" :
                    "text-gray-600"
                  }`}>{day}</div>

                  {/* Status dots — max 4 visible */}
                  {daySessions.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {daySessions.slice(0, 4).map(s => (
                        <span key={s._id} className={`w-2 h-2 rounded-full ${dotColor(s)}`} />
                      ))}
                      {daySessions.length > 4 && (
                        <span className="text-[9px] text-indigo-600 font-bold">+{daySessions.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Class count badge */}
                  {daySessions.length > 0 && (
                    <p className="text-center text-[9px] text-indigo-500 font-semibold mt-0.5">
                      {daySessions.length} class{daySessions.length > 1 ? "es" : ""}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/40">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Legend:</span>
        {[
          { color: "bg-emerald-400", label: "Present" },
          { color: "bg-red-400",     label: "Absent" },
          { color: "bg-amber-300",   label: "Not Marked" },
          { color: "bg-blue-400",    label: "In Progress" },
          { color: "bg-indigo-300",  label: "Scheduled" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />{label}
          </span>
        ))}
      </div>

      {/* Day detail slide-up panel */}
      {selectedDay && (
        <div className="border-t border-indigo-100 bg-indigo-50/30">
          <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-100">
            <p className="text-sm font-bold text-gray-800">
              {new Date(year, mo - 1, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              <span className="ml-2 text-xs font-semibold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
                {selectedSessions.length} session{selectedSessions.length !== 1 ? "s" : ""}
              </span>
            </p>
            <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-indigo-100/60 max-h-72 overflow-y-auto">
            {selectedSessions.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-gray-400">No classes on this day.</p>
            ) : selectedSessions.map(s => (
              <div key={s._id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/60 transition-colors">
                {/* Avatar */}
                {s.student?.avatar ? (
                  <img src={s.student.avatar} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 border-white shadow-sm">
                    {getInitials(s.student?.fullName || "?")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.student?.fullName || "—"}</p>
                  <p className="text-xs text-gray-500 truncate">{s.course?.title || "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[11px] text-gray-500 font-medium">{fmt12(s.startTime)}</span>
                  <div className="flex gap-1">
                    <StatusBadge status={s.status} />
                    {s.status === "completed" && <AttBadge status={s.studentAttendance} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MonthlyClassPage() {
  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [summary,    setSummary]    = useState<Summary>({ total: 0, present: 0, absent: 0, notMarked: 0, completed: 0, scheduled: 0, cancelled: 0, totalMins: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [exporting,  setExporting]  = useState(false);

  const [month,    setMonth]    = useState(() => new Date().toISOString().slice(0, 7));
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [attFilter, setAttFilter] = useState("");
  const [page,     setPage]     = useState(1);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [filtersOpen, setFiltersOpen] = useState(false);
  // For calendar we need ALL sessions for the month (no pagination filter)
  const [allSessions, setAllSessions] = useState<Session[]>([]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (pg = 1) => {
    setLoading(true);
    setError("");
    try {
      // Fetch list (paginated) and all-sessions (for calendar) in parallel
      const [listParams, calParams] = [
        new URLSearchParams({
          month, page: String(pg), limit: "15",
          ...(status    && { status    }),
          ...(attFilter && { attendance: attFilter }),
          ...(search    && { search    }),
        }),
        new URLSearchParams({ month, page: "1", limit: "500" }),
      ];
      const [res, calRes] = await Promise.all([
        fetch(`/api/teacher-portal/class-monthly?${listParams}`),
        fetch(`/api/teacher-portal/class-monthly?${calParams}`),
      ]);
      const [data, calData] = await Promise.all([res.json(), calRes.json()]);
      if (!data.success) throw new Error(data.message);
      setSessions(data.sessions || []);
      setSummary(data.summary  || {});
      setPagination(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      if (calData.success) setAllSessions(calData.sessions || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [month, status, attFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchData(1); }, 350);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handlePage = (n: number) => { setPage(n); fetchData(n); };

  // ── Fetch ALL for PDF (no pagination) ────────────────────────────────────
  const fetchAllForPDF = async (): Promise<Session[]> => {
    const params = new URLSearchParams({
      month, limit: "500", page: "1",
      ...(status    && { status    }),
      ...(attFilter && { attendance: attFilter }),
      ...(search    && { search    }),
    });
    const res  = await fetch(`/api/teacher-portal/class-monthly?${params}`);
    const data = await res.json();
    return data.success ? data.sessions : [];
  };

  // ── PDF Export ────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true);
    try {
      const allSessions = await fetchAllForPDF();
      const label       = monthLabel(month);
      const doc         = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 297, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("Class & Attendance Monthly Report", 14, 10);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Month: ${label}   |   Generated: ${new Date().toLocaleString()}`, 14, 17);

      // Summary boxes
      const sumData: [string, string][] = [
        ["Total Sessions",  String(summary.total)],
        ["Present",         String(summary.present)],
        ["Absent",          String(summary.absent)],
        ["Not Marked",      String(summary.notMarked)],
        ["Completed",       String(summary.completed)],
        ["Total Hours",     `${Math.floor(summary.totalMins / 60)}h ${summary.totalMins % 60}m`],
      ];
      sumData.forEach(([lbl, val], i) => {
        const x = 14 + i * 47;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, 25, 44, 16, 2, 2, "F");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(lbl, x + 3, 30);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(val, x + 3, 37);
        doc.setFont("helvetica", "normal");
      });

      // Attendance bar
      const presentRate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
      const absentRate  = summary.total > 0 ? Math.round((summary.absent  / summary.total) * 100) : 0;
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Attendance Rate: ${presentRate}% Present  |  ${absentRate}% Absent`, 14, 47);

      // Detail table
      autoTable(doc, {
        startY: 51,
        head: [["#", "Date", "Day", "Student", "Course", "Level", "Time", "Duration", "Status", "Attendance", "Notes"]],
        body: allSessions.map((s, i) => [
          i + 1,
          fmtDate(s.createdAt),
          (s.dayOfWeek || "").charAt(0).toUpperCase() + (s.dayOfWeek || "").slice(1),
          s.student?.fullName || "—",
          s.course?.title     || "—",
          s.course?.level     || "—",
          `${fmt12(s.startTime)} – ${fmt12(s.endTime)}`,
          `${s.actualDuration ?? s.duration ?? 45} min`,
          (s.status || "").charAt(0).toUpperCase() + (s.status || "").slice(1).replace("-", " "),
          (s.studentAttendance || "not-marked").replace("-", " ").replace(/^\w/, (c) => c.toUpperCase()),
          s.notes || "",
        ]),
        styles:     { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0:  { cellWidth: 8,  halign: "center" },
          1:  { cellWidth: 24 },
          2:  { cellWidth: 20 },
          3:  { cellWidth: 40 },
          4:  { cellWidth: 38 },
          5:  { cellWidth: 22 },
          6:  { cellWidth: 30 },
          7:  { cellWidth: 18, halign: "center" },
          8:  { cellWidth: 22 },
          9:  { cellWidth: 22 },
          10: { cellWidth: 30 },
        },
        willDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 9) {
            const val = String(data.cell.raw || "").toLowerCase();
            if (val.includes("present")) {
              data.cell.styles.fillColor = [209, 250, 229];
              data.cell.styles.textColor = [6, 95, 70];
            } else if (val.includes("absent")) {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [153, 27, 27];
            }
          }
          if (data.section === "body" && data.column.index === 8) {
            const val = String(data.cell.raw || "").toLowerCase();
            if (val.includes("completed")) {
              data.cell.styles.fillColor = [209, 250, 229];
              data.cell.styles.textColor = [6, 95, 70];
            } else if (val.includes("cancelled")) {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [153, 27, 27];
            }
          }
        },
        theme: "striped",
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Monthly Class Report  ·  Page ${i} of ${pageCount}`,
          14, doc.internal.pageSize.height - 6
        );
        doc.text(
          `Generated: ${new Date().toLocaleString()}`,
          297 - 14, doc.internal.pageSize.height - 6,
          { align: "right" }
        );
      }

      doc.save(`class-report-${month}.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
    } finally {
      setExporting(false);
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const presentRate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
  const absentRate  = summary.total > 0 ? Math.round((summary.absent  / summary.total) * 100) : 0;
  const hours       = Math.floor(summary.totalMins / 60);
  const mins        = summary.totalMins % 60;

  return (
    <div className="space-y-4 sm:space-y-5 pb-6 sm:pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/class"
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              Monthly Report
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {month ? monthLabel(month) : "Select a month"}
            </p>
          </div>
        </div>
        {/* Action buttons row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchData(page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "calendar" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Calendar</span>
            </button>
            <button onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              <List className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">List</span>
            </button>
          </div>
          <button
            id="class-monthly-pdf"
            onClick={exportPDF}
            disabled={exporting || sessions.length === 0}
            className="ml-auto inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md hover:opacity-90 transition-all disabled:opacity-50 active:scale-95"
          >
            {exporting
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Printer className="w-3.5 h-3.5" />}
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <StatCard label="Total" value={summary.total} icon={BookOpen} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" loading={loading} />
        <StatCard label="Present" value={summary.present} sub={`${presentRate}%`} icon={CheckCircle2} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" loading={loading} />
        <StatCard label="Absent" value={summary.absent} sub={`${absentRate}%`} icon={XCircle} gradient="bg-gradient-to-br from-red-500 to-rose-600" loading={loading} />
        <StatCard label="Not Marked" value={summary.notMarked} icon={MinusCircle} gradient="bg-gradient-to-br from-gray-500 to-slate-600" loading={loading} />
        <StatCard label="Completed" value={summary.completed} icon={CheckSquare} gradient="bg-gradient-to-br from-violet-500 to-purple-600" loading={loading} />
        <StatCard label="Total Time" value={`${hours}h ${mins}m`} sub="teaching" icon={Clock} gradient="bg-gradient-to-br from-amber-500 to-orange-500" loading={loading} />
      </div>

      {/* ── Attendance Progress ── */}
      {!loading && summary.total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2.5">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500" />
              Attendance Overview
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Present {presentRate}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Absent {absentRate}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Not marked</span>
            </div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
            {summary.present > 0 && (
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                style={{ width: `${presentRate}%` }} />
            )}
            {summary.absent > 0 && (
              <div className="h-full bg-gradient-to-r from-red-400 to-rose-500 transition-all duration-700"
                style={{ width: `${absentRate}%` }} />
            )}
            {summary.notMarked > 0 && (
              <div className="h-full bg-gray-200 flex-1" />
            )}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filter toggle header (mobile) */}
        <button
          className="sm:hidden w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setFiltersOpen(prev => !prev)}
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            Filters
            {(search || status || attFilter) && (
              <span className="w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${filtersOpen ? "rotate-90" : ""}`} />
        </button>
        <div className={`p-3 sm:p-4 flex-wrap gap-2.5 sm:gap-3 ${
          filtersOpen ? "flex" : "hidden sm:flex"
        }`}>
          {/* Month */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="cls-month"
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white w-full sm:w-auto"
            />
          </div>
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="cls-search"
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          {/* Status */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              id="cls-status"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="pl-8 pr-7 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white appearance-none cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {/* Attendance */}
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              id="cls-attendance"
              value={attFilter}
              onChange={(e) => { setAttFilter(e.target.value); setPage(1); }}
              className="pl-8 pr-7 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white appearance-none cursor-pointer"
            >
              <option value="">All Attendance</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="not-marked">Not Marked</option>
            </select>
          </div>
          {/* Clear */}
          {(search || status || attFilter) && (
            <button
              onClick={() => { setSearch(""); setStatus(""); setAttFilter(""); setPage(1); }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-xl hover:border-red-200 transition-colors flex items-center gap-1 active:scale-95"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Calendar View ── */}
      {viewMode === "calendar" && (
        <CalendarView sessions={allSessions} month={month} />
      )}

      {/* ── Table / List View ── */}
      {viewMode === "list" && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <span className="text-sm font-medium text-gray-700">
            {loading ? "Loading…" : `${pagination.total} session${pagination.total !== 1 ? "s" : ""} · ${monthLabel(month)}`}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>

        <div className="w-full">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium text-sm">No sessions found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different month or clear filters.</p>
              </div>
            ) : (
              sessions.map((s, i) => (
                <div key={s._id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {s.student?.avatar ? (
                        <img src={s.student.avatar} alt={s.student.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                          {getInitials(s.student?.fullName || "?")}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{s.student?.fullName || "—"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.course?.title || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-800">{fmtDate(s.createdAt)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{s.dayOfWeek}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs mb-3 bg-gray-50 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {fmt12(s.startTime)} – {fmt12(s.endTime)}
                    </div>
                    <span className="font-bold text-gray-700">
                      {s.actualDuration ?? s.duration ?? 45} min
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <StatusBadge status={s.status} />
                    <AttBadge status={s.studentAttendance} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-white">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4 hidden md:table-cell">Time</th>
                  <th className="py-3 px-4 hidden lg:table-cell text-center">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4 hidden xl:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="py-4 px-4">
                          <div className="h-4 bg-gray-100 rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No sessions found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try a different month or clear your filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  sessions.map((s, i) => (
                    <tr key={s._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold text-gray-400">
                          {(pagination.page - 1) * pagination.limit + i + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{fmtDate(s.createdAt)}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{s.dayOfWeek}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {s.student?.avatar ? (
                            <img src={s.student.avatar} alt={s.student.fullName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 border-white shadow-sm">
                              {getInitials(s.student?.fullName || "?")}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
                              {s.student?.fullName || "—"}
                            </p>
                            <p className="text-[10px] font-mono text-gray-400">
                              {s.student?.studentId || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                          {s.course?.title || "—"}
                        </p>
                        {s.course?.level && <LevelBadge level={s.course.level} />}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 font-medium bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {fmt12(s.startTime)} – {fmt12(s.endTime)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center hidden lg:table-cell">
                        <span className="text-xs font-semibold text-gray-600 bg-indigo-50 px-2 py-1 rounded-lg">
                          {s.actualDuration ?? s.duration ?? 45} min
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-3 px-4">
                        <AttBadge status={s.studentAttendance} />
                      </td>
                      <td className="py-3 px-4 hidden xl:table-cell">
                        {s.notes ? (
                          <span className="text-xs text-gray-500 italic truncate max-w-[120px] block" title={s.notes}>
                            {s.notes}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <Pagination pagination={pagination} onPage={handlePage} />
      </div>
      )}
    </div>
  );
}
