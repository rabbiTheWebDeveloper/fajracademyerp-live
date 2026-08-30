"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Calendar, Clock, Loader2, Plus, Users, BookOpen,
  AlertCircle, CheckCircle2, Trash2, Search,
  PlayCircle, StopCircle, PauseCircle, ChevronDown, Timer,
  CheckCheck, ListOrdered, RefreshCw, X,
  GraduationCap, Phone, Mail, User, BarChart2,
  UserCheck, UserX, ClipboardCheck, PieChart, TrendingUp, Video,
  Sparkles, Zap, AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "scheduled" | "in-progress" | "completed";
type ViewMode = "classes" | "students" | "attendance";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

const STATUS_CONFIG = {
  scheduled:    { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-400" },
  "in-progress":{ bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700",  dot: "bg-amber-500" },
  completed:    { bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-700",dot: "bg-emerald-500" },
  paused:       { bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-700",   dot: "bg-blue-500" },
};

const LEVEL_COLORS: Record<string,string> = {
  beginner:     "bg-blue-100 text-blue-700 border-blue-200",
  intermediate: "bg-purple-100 text-purple-700 border-purple-200",
  advanced:     "bg-rose-100 text-rose-700 border-rose-200",
};

const STUDENT_STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive:  "bg-gray-100 text-gray-600 border-gray-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  "at-risk": "bg-amber-100 text-amber-700 border-amber-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return String(n).padStart(2, "0"); }

/** Convert any common time string to HH:MM (24h). Returns null if unparseable. */
function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // Already HH:MM
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":").map(Number);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  // Handle "10:00 AM" / "10:00 PM" / "10:00am" / "10:00pm"
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toLowerCase();
    if (period === "am" && h === 12) h = 0;
    if (period === "pm" && h !== 12) h += 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return null;
}
function formatDT(isoString: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  let hr = d.getHours();
  const ampm = hr >= 12 ? "Pm" : "Am";
  hr = hr % 12;
  if (hr === 0) hr = 12;
  const min = pad(d.getMinutes());
  return `${day}.${month}.${year}:${pad(hr)}.${min}${ampm}`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, src, size = "md" }: { name?: string; src?: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm";
  if (src)
    return <img src={src} alt={name} className={`${sz} rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold border-2 border-white shadow-sm flex-shrink-0`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Live Timer Ring ──────────────────────────────────────────────────────────
function LiveTimer({ startedAt, duration = 45 }: { startedAt: string; duration?: number }) {
  const [elapsed, setElapsed] = useState(0);
  const TARGET = duration * 60;
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const remaining = Math.max(TARGET - elapsed, 0);
  const pct = Math.min((elapsed / TARGET) * 100, 100);
  const over = elapsed > TARGET;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#e5e7eb" strokeWidth="5" />
          <circle cx="28" cy="28" r="24" fill="none"
            stroke={over ? "#ef4444" : "#6366f1"} strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
            strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[10px] font-black tabular-nums ${over ? "text-red-600" : "text-indigo-700"}`}>
            {over
              ? `+${fmt(Math.floor((elapsed - TARGET) / 60))}:${fmt((elapsed - TARGET) % 60)}`
              : `${fmt(Math.floor(remaining / 60))}:${fmt(remaining % 60)}`}
          </span>
        </div>
      </div>
      <span className={`text-[10px] font-semibold ${over ? "text-red-500 animate-pulse" : "text-gray-400"}`}>
        {over ? "Time up!" : "left"}
      </span>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ cls, deleting, onClose, onConfirm }: any) {
  if (!cls) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col scale-in duration-200">
        <div className="p-6 text-center overflow-y-auto flex-1">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1 text-lg">Delete Class?</h3>
          <p className="text-sm text-gray-600 mb-0.5 font-medium">{cls.student?.fullName} · {cls.course?.title}</p>
          <p className="text-xs text-gray-400 capitalize">{cls.dayOfWeek} · {cls.startTime} – {cls.endTime}</p>
        </div>
        <div className="flex border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <div className="w-px bg-gray-100" />
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance badge helper ──────────────────────────────────────────────────
function AttendanceBadge({ status }: { status?: string }) {
  if (status === "present") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
      <UserCheck className="w-3 h-3" /> Present
    </span>
  );
  if (status === "absent") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
      <UserX className="w-3 h-3" /> Absent
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
      <ClipboardCheck className="w-3 h-3" /> Not Marked
    </span>
  );
}

// ─── End Class Modal (with attendance) ───────────────────────────────────────
function EndClassModal({ cls, acting, onClose, onConfirm }: {
  cls: any; acting: boolean;
  onClose: () => void;
  onConfirm: (attendance: "present" | "absent") => void;
}) {
  const [attendance, setAttendance] = useState<"present" | "absent">("present");
  if (!cls) return null;

  // Elapsed time display
  const elapsedMins = cls.startedAt
    ? Math.round((Date.now() - new Date(cls.startedAt).getTime()) / 60000)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col scale-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">End Class</span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Avatar name={cls.student?.fullName} src={cls.student?.avatar} size="md" />
            <div>
              <p className="font-bold text-white text-sm truncate">{cls.student?.fullName}</p>
              <p className="text-xs text-indigo-200 truncate">{cls.course?.title}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Timer className="w-4 h-4 text-indigo-200 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-indigo-100">
              Session ran for <strong className="text-white">{elapsedMins} min</strong>
            </span>
          </div>
        </div>

        {/* Attendance picker */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-indigo-500" />
            Mark Student Attendance
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAttendance("present")}
              className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all ${
                attendance === "present"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40"
              }`}
            >
              {attendance === "present" && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                attendance === "present" ? "bg-emerald-100" : "bg-gray-100"
              }`}>
                <UserCheck className={`w-5 h-5 sm:w-6 sm:h-6 ${attendance === "present" ? "text-emerald-600" : "text-gray-400"}`} />
              </div>
              <span className={`text-xs sm:text-sm font-bold ${
                attendance === "present" ? "text-emerald-700" : "text-gray-500"
              }`}>Present</span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 text-center">Student attended</span>
            </button>

            <button
              onClick={() => setAttendance("absent")}
              className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all ${
                attendance === "absent"
                  ? "border-red-500 bg-red-50 shadow-sm"
                  : "border-gray-200 hover:border-red-300 hover:bg-red-50/40"
              }`}
            >
              {attendance === "absent" && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                attendance === "absent" ? "bg-red-100" : "bg-gray-100"
              }`}>
                <UserX className={`w-5 h-5 sm:w-6 sm:h-6 ${attendance === "absent" ? "text-red-600" : "text-gray-400"}`} />
              </div>
              <span className={`text-xs sm:text-sm font-bold ${
                attendance === "absent" ? "text-red-700" : "text-gray-500"
              }`}>Absent</span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 text-center">Didn't attend</span>
            </button>
          </div>

          <div className="flex gap-2.5 pt-1.5">
            <button onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(attendance)}
              disabled={acting}
              className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 ${
                attendance === "present"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
              End & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Class Card ───────────────────────────────────────────────────────────────
function ClassCard({ cls, acting, onAction, onEndRequest, onDelete }: any) {
  const cfg = STATUS_CONFIG[cls.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.scheduled;
  return (
    <div className={`group relative rounded-2xl border-2 p-3 sm:p-4 transition-all hover:shadow-md ${cfg.bg} ${cfg.border}`}>
      {/* Status indicator line */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${cfg.dot}`} />

      {/* Mobile-optimized layout: stacked layout on mobile, horizontal on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
        
        {/* Student & Course section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 flex-1 min-w-0">
          {/* Student Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={cls.student?.fullName} src={cls.student?.avatar} />
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{cls.student?.fullName || "—"}</p>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">{cls.student?.studentId || "No ID"}</p>
            </div>
          </div>

          {/* Course Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
              <BookOpen className={`w-3.5 h-3.5 ${cfg.text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{cls.course?.title || "—"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {cls.course?.level && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${LEVEL_COLORS[cls.course.level] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {cls.course.level}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 capitalize font-medium">{cls.dayOfWeek?.slice(0, 3)}</span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-1 flex flex-col gap-0.5">
                {cls.createdAt && <div>Created: {formatDT(cls.createdAt)}</div>}
                {cls.updatedAt && cls.updatedAt !== cls.createdAt && <div>Updated: {formatDT(cls.updatedAt)}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Time / Timer & Actions Section */}
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-gray-100/50 sm:border-0 pt-3 sm:pt-0">
          
          {/* Time/Timer */}
          <div className="flex-shrink-0">
            {(cls.status === "in-progress" || cls.status === "paused") && cls.startedAt ? (
              <LiveTimer startedAt={cls.startedAt} duration={cls.duration ?? 45} />
            ) : cls.status === "completed" ? (
              <div className="flex flex-col items-start sm:items-center gap-0.5">
                <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-800">{cls.startTime}</span>
                  <span className="text-gray-300 text-xs">→</span>
                  <span className="text-xs font-bold text-gray-800">{cls.endTime}</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold sm:self-center">✓ {cls.actualDuration ?? cls.duration ?? 45} min</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-gray-800">{cls.startTime}</span>
                <span className="text-gray-300 text-xs">→</span>
                <span className="text-xs font-bold text-gray-800">{cls.endTime}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {cls.meetLink && (cls.status === "scheduled" || cls.status === "in-progress") && (
              <a
                href={cls.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors active:scale-95"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Join Meet</span>
              </a>
            )}
            {cls.status === "scheduled" && (
              <button onClick={() => onAction(cls._id, "start")} disabled={acting === cls._id}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95">
                {acting === cls._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                Start
              </button>
            )}
            {cls.status === "in-progress" && (
              <>
                <button onClick={() => onAction(cls._id, "reset")} disabled={acting === cls._id}
                  className="flex items-center gap-1 px-2.5 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95">
                  {acting === cls._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Reschedule</span>
                </button>
                <button onClick={() => onAction(cls._id, "pause")} disabled={acting === cls._id}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95">
                  {acting === cls._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PauseCircle className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Pause</span>
                </button>
                <button onClick={() => onEndRequest(cls)} disabled={acting === cls._id}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors animate-pulse disabled:opacity-60 disabled:animate-none active:scale-95">
                  {acting === cls._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                  End
                </button>
              </>
            )}
            {cls.status === "paused" && (
              <>
                <button onClick={() => onAction(cls._id, "reset")} disabled={acting === cls._id}
                  className="flex items-center gap-1 px-2.5 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95">
                  {acting === cls._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Reschedule</span>
                </button>
                <button onClick={() => onAction(cls._id, "resume")} disabled={acting === cls._id}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95">
                  {acting === cls._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  Resume
                </button>
                <button onClick={() => onEndRequest(cls)} disabled={acting === cls._id}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors animate-pulse disabled:opacity-60 disabled:animate-none active:scale-95">
                  {acting === cls._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                  End
                </button>
              </>
            )}
            {cls.status === "completed" && (
              <div className="flex flex-col items-end gap-1">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </span>
                <AttendanceBadge status={cls.studentAttendance} />
              </div>
            )}
            
            {/* Delete — visible on mobile (no hover required), hover-only on desktop */}
            {cls.status !== "completed" && (
              <button onClick={() => onDelete(cls)}
                className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 sm:border-transparent sm:hover:border-red-100 transition-all sm:opacity-0 group-hover:opacity-100 active:scale-95">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {cls.topic && (
        <div className="mt-3 ml-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/50 border border-indigo-100/50 px-2.5 py-1 rounded-lg w-fit">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Topic: {cls.topic}</span>
        </div>
      )}

      {cls.notes && (
        <p className="mt-3 ml-2 text-xs text-gray-500 bg-white/60 px-3 py-1.5 rounded-lg border border-white/80 italic">
          {cls.notes}
        </p>
      )}
    </div>
  );
}

// ------------------- MAIN PAGE -----------------------------------------------
// ─── Toast Notification System ───────────────────────────────────────────────
type Toast = { id: string; message: string; type: "success" | "warning" | "error" | "info"; gems?: number };
let toastCounter = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-in slide-in-from-right-4 fade-in duration-300 ${
            t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
            t.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" :
            t.type === "error"   ? "bg-red-50 border-red-200 text-red-800" :
                                   "bg-indigo-50 border-indigo-200 text-indigo-800"
          }`}
        >
          <span className="flex-shrink-0 mt-0.5">
            {t.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
             t.type === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
             t.type === "error"   ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                                    <Zap className="w-4 h-4 text-indigo-500" />}
          </span>
          <div className="flex-1">
            <p>{t.message}</p>
            {t.gems !== undefined && (
              <p className={`text-xs font-bold mt-0.5 ${ t.gems < 0 ? "text-red-600" : "text-emerald-600" }`}>
                {t.gems > 0 ? `+${t.gems}` : t.gems} 💎 gems
              </p>
            )}
          </div>
          <button onClick={() => onRemove(t.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function TeacherClassPage() {
  const [classes,  setClasses]  = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses,  setCourses]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [tab,      setTab]      = useState<Tab>("scheduled");
  const [viewMode, setViewMode] = useState<ViewMode>("classes");
  const [search,   setSearch]   = useState("");

  const [form, setForm] = useState({
    studentId: "", courseId: "", dayOfWeek: "monday", startTime: "10:00", duration: "45", notes: "", meetLink: "", topic: "",
  });
  const [submitting,     setSubmitting]     = useState(false);
  const [msg,            setMsg]            = useState({ text: "", type: "" });
  const [showForm,       setShowForm]       = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [toasts,         setToasts]         = useState<Toast[]>([]);

  const [deleteTarget,      setDeleteTarget]      = useState<any>(null);
  const [deleting,          setDeleting]          = useState(false);
  const [acting,            setActing]            = useState<string | null>(null);
  const [endTarget,         setEndTarget]         = useState<any>(null);  // class to end (triggers modal)
  const [attTab,            setAttTab]            = useState<"classes" | "students">("classes");
  const [studentHasSchedule, setStudentHasSchedule] = useState(false); // true → lock Day/Time/Duration

  const [currentPage, setCurrentPage] = useState(1);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    return `${y}-${m}`;
  });
  const ITEMS_PER_PAGE = 10;

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast["type"], gems?: number) => {
    const id = String(++toastCounter);
    setToasts(p => [...p, { id, message, type, gems }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);

  // Reset page when tab or month changes
  useEffect(() => { setCurrentPage(1); }, [tab, filterMonth]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, sr, csr] = await Promise.all([
        fetch("/api/teacher-portal/class"),
        fetch("/api/teacher-portal/students"),
        fetch("/api/teacher-portal/courses"),
      ]);
      const [cd, sd, csd] = await Promise.all([cr.json(), sr.json(), csr.json()]);
      if (cd.success)  setClasses(cd.classes  || []);
      if (sd.success)  setStudents(sd.students || []);
      if (csd.success) setCourses(csd.courses  || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Client-side guard: ensure all required fields are present & valid ──
    const missing: string[] = [];
    if (!form.studentId)       missing.push("Student");
    if (!form.courseId)        missing.push("Course");
    if (!form.dayOfWeek)       missing.push("Day");
    if (!form.startTime)       missing.push("Start Time");
    if (!form.topic?.trim())   missing.push("Topic");
    // Validate HH:MM format (auto-fill might have produced a bad value)
    if (form.startTime && !/^\d{2}:\d{2}$/.test(form.startTime)) missing.push("Start Time (must be HH:MM)");

    if (missing.length > 0) {
      setMsg({ text: `Please fill in: ${missing.join(", ")}.`, type: "error" });
      setTimeout(() => setMsg({ text: "", type: "" }), 6000);
      return;
    }

    setSubmitting(true); setMsg({ text: "", type: "" });
    try {
      const res  = await fetch("/api/teacher-portal/class", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: "Class scheduled successfully!", type: "success" });
        setClasses(p => [data.class, ...p]);
        setForm(p => ({ ...p, studentId: "", courseId: "", duration: "45", notes: "", meetLink: "", topic: "" }));
        setTab("scheduled");
        setViewMode("classes");
        setTimeout(() => setShowForm(false), 1500);
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch { setMsg({ text: "Network error", type: "error" }); }
    finally {
      setSubmitting(false);
      setTimeout(() => setMsg({ text: "", type: "" }), 5000);
    }
  }, [form]);

  // ── Start / End ────────────────────────────────────────────────────────────
  const handleAction = useCallback(async (classId: string, action: "start" | "end" | "pause" | "resume" | "reset", attendance?: string) => {
    setActing(classId);
    try {
      const now = new Date();
      const clientTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const res  = await fetch("/api/teacher-portal/class", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, action, attendance, clientTime }),
      });
      const data = await res.json();
      if (data.success) {
        setClasses(p => p.map(c => c._id === classId ? data.class : c));
        if (action === "start") {
          setTab("in-progress");
          // Show early-start penalty toast if applicable
          if (data.earlyStartPenalty?.applied) {
            addToast(
              `You started ${data.earlyStartPenalty.earlyByMinutes} min early! Penalty applied.`,
              "warning",
              -10
            );
          } else {
            addToast("Class started! Good luck! 🎯", "success");
          }
        }
        if (action === "end")   { setTab("completed"); setEndTarget(null); addToast("Class ended & saved! ✅", "success"); }
        if (action === "reset") { setTab("scheduled"); addToast("Class rescheduled.", "info"); }
      } else {
        addToast(data.message, "error");
      }
    } catch { addToast("Network error", "error"); }
    finally { setActing(null); }
  }, [addToast]);

  // ── Auto Generate ──────────────────────────────────────────────────────────
  const handleAutoGenerate = useCallback(async () => {
    setAutoGenerating(true);
    try {
      const res  = await fetch("/api/teacher-portal/class/auto-generate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (data.classes?.length > 0) {
          setClasses(p => [
            ...data.classes.filter((nc: any) => !p.some((c: any) => c._id === nc._id)),
            ...p,
          ]);
          setTab("scheduled");
          setViewMode("classes");
          addToast(`✨ ${data.generated} class(es) generated for today!`, "success");
        } else {
          addToast(data.message || "All today's classes already exist.", "info");
        }
      } else {
        addToast(data.message || "Failed to auto-generate classes.", "error");
      }
    } catch { addToast("Network error", "error"); }
    finally { setAutoGenerating(false); }
  }, [addToast]);

  // ── Overdue penalty check (every 60s) ─────────────────────────────────────
  // ✅ OPTIMIZED: Only poll when there is an active in-progress or paused class.
  // Previously this fired every 60s unconditionally for every open tab,
  // causing the majority of excess Vercel function invocations.
  const hasActiveClass = classes.some(
    (c) => c.status === "in-progress" || c.status === "paused"
  );

  useEffect(() => {
    if (!hasActiveClass) return; // ← skip entirely when nothing is running

    const checkOverdue = async () => {
      try {
        const res  = await fetch("/api/teacher-portal/class/check-overdue", { method: "POST" });
        const data = await res.json();
        if (data.success && data.penalized?.length > 0) {
          data.penalized.forEach((p: any) => {
            addToast(
              `⚠️ Class overdue by ${p.overdueMinutes} min! You didn't end on time.`,
              "warning",
              -20
            );
          });
        }
      } catch { /* silent — non-critical */ }
    };

    // Run once after 30s, then every 60s
    const timeout = setTimeout(checkOverdue, 30000);
    const interval = setInterval(checkOverdue, 60000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [addToast, hasActiveClass]); // re-subscribe when active-class state changes

  // ── Confirm end with attendance ────────────────────────────────────────────
  const handleConfirmEnd = useCallback((attendance: "present" | "absent") => {
    if (!endTarget) return;
    handleAction(endTarget._id, "end", attendance);
  }, [endTarget, handleAction]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/teacher-portal/class?id=${deleteTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setClasses(p => p.filter(c => c._id !== deleteTarget._id));
        setDeleteTarget(null);
      } else { alert(data.message); }
    } catch { alert("Network error"); }
    finally { setDeleting(false); }
  }, [deleteTarget]);

  // ── Derived Values ─────────────────────────────────────────────────────────
  const monthFilteredClasses = useMemo(() => classes.filter(c => {
    if (!filterMonth) return true;
    if (!c.createdAt) return false;
    const date = new Date(c.createdAt);
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${y}-${m}` === filterMonth;
  }), [classes, filterMonth]);

  const scheduled  = useMemo(() => monthFilteredClasses.filter(c => c.status === "scheduled"), [monthFilteredClasses]);
  const inProgress = useMemo(() => monthFilteredClasses.filter(c => c.status === "in-progress" || c.status === "paused"), [monthFilteredClasses]);
  const completed  = useMemo(() => monthFilteredClasses.filter(c => c.status === "completed"), [monthFilteredClasses]);
  const counts     = useMemo(() => ({ scheduled: scheduled.length, "in-progress": inProgress.length, completed: completed.length }), [scheduled.length, inProgress.length, completed.length]);
  
  const TABS = useMemo(() => [
    { key: "scheduled"   as Tab, label: "Scheduled",   icon: ListOrdered, color: "text-indigo-600",  count: counts.scheduled },
    { key: "in-progress" as Tab, label: "In Progress", icon: Timer,       color: "text-amber-500",   count: counts["in-progress"] },
    { key: "completed"   as Tab, label: "Completed",   icon: CheckCheck,  color: "text-emerald-600", count: counts.completed },
  ], [counts]);

  const currentTabList = useMemo(
    () => tab === "scheduled" ? scheduled : tab === "in-progress" ? inProgress : completed,
    [tab, scheduled, inProgress, completed]
  );
  const totalPages  = useMemo(() => Math.ceil(currentTabList.length / ITEMS_PER_PAGE), [currentTabList.length]);
  const currentList = useMemo(
    () => currentTabList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [currentTabList, currentPage]
  );

  const { totalDone, totalMins, totalPresent, totalAbsent, attendancePct } = useMemo(() => {
    const done    = completed.length;
    const mins    = completed.reduce((acc, c) => acc + (c.actualDuration ?? c.duration ?? 45), 0);
    const present = completed.filter(c => c.studentAttendance === "present").length;
    const absent  = completed.filter(c => c.studentAttendance === "absent").length;
    return { totalDone: done, totalMins: mins, totalPresent: present, totalAbsent: absent,
      attendancePct: done > 0 ? Math.round((present / done) * 100) : 0 };
  }, [completed]);

  const studentAttendanceList = useMemo(() => {
    const map = completed.reduce((acc: Record<string, any>, cls) => {
      const sid = cls.student?._id?.toString();
      if (!sid) return acc;
      if (!acc[sid]) acc[sid] = { student: cls.student, total: 0, present: 0, absent: 0, notMarked: 0, sessions: [] };
      acc[sid].total++; acc[sid].sessions.push(cls);
      if (cls.studentAttendance === "present")      acc[sid].present++;
      else if (cls.studentAttendance === "absent")  acc[sid].absent++;
      else                                          acc[sid].notMarked++;
      return acc;
    }, {});
    return Object.values(map).sort((a: any, b: any) => b.total - a.total);
  }, [completed]);

  const filteredStudents = useMemo(() =>
    students.filter(s =>
      !search ||
      s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
    ), [students, search]
  );

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ── Auto-fill from student schedule ─────────────────────────────────────────
  // If the student has a schedule: auto-fill Day / Start Time / Duration and LOCK those fields.
  // If not: fields remain editable so the teacher can set them manually.
  const handleStudentChange = useCallback((studentId: string) => {
    setForm(p => ({ ...p, studentId }));
    if (!studentId) {
      setStudentHasSchedule(false);
      return;
    }
    const student = students.find((s: any) => s._id === studentId);
    if (!student) { setStudentHasSchedule(false); return; }

    const updates: Record<string, string> = {};

    // Course
    const courseId = student.course?._id?.toString() || student.course?.toString() || student.schedule?.course?.toString();
    if (courseId) updates.courseId = courseId;

    // Schedule fields — normalize to the formats the API expects:
    //   dayOfWeek  → lowercase ("monday", not "Monday")
    //   startTime  → HH:MM 24h  ("10:00", not "10:00 AM")
    const rawDay       = student.schedule?.dayOfWeek || student.schedule?.weekly_days_list?.[0] || null;
    const rawStartTime = student.schedule?.startTime  || null;
    const duration     = student.schedule?.duration   || student.schedule?.classDuration || null;

    const day       = rawDay ? String(rawDay).toLowerCase().trim() : null;
    const startTime = normalizeTime(rawStartTime);

    const hasSchedule = !!(day && startTime);
    setStudentHasSchedule(hasSchedule);

    if (day)       updates.dayOfWeek  = day;
    if (startTime) updates.startTime  = startTime;
    if (duration)  updates.duration   = String(duration);

    if (Object.keys(updates).length > 0) setForm(p => ({ ...p, ...updates }));
  }, [students]);



  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 sm:pb-0">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Class Sessions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your class sessions and track student progress.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap justify-end">
          <Link
            href="/teacher/class/monthly"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 shadow-sm transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">Monthly Report</span>
          </Link>
          <button onClick={fetchData}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Auto Generate Button */}
          <button
            onClick={handleAutoGenerate}
            disabled={autoGenerating}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:scale-100"
          >
            {autoGenerating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Sparkles className="w-4 h-4" />}
            <span className="hidden sm:inline">{autoGenerating ? "Generating…" : "Auto Generate"}</span>
          </button>

          {/* New Class FAB on mobile, regular button on desktop */}
          <button onClick={() => setShowForm(true)}
            className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] right-4 sm:relative sm:bottom-auto sm:right-auto z-50 sm:z-auto flex items-center justify-center gap-2 w-14 h-14 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-full sm:rounded-xl shadow-lg sm:shadow-sm transition-transform hover:scale-105 active:scale-95">
            <Plus className="w-6 h-6 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">New Class</span>
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Classes",  value: classes.length,    icon: Calendar,    bg: "bg-indigo-50",  text: "text-indigo-600" },
            { label: "In Progress",   value: inProgress.length,  icon: Timer,       bg: "bg-amber-50",   text: "text-amber-600" },
            { label: "Completed",     value: totalDone,          icon: CheckCheck,  bg: "bg-emerald-50", text: "text-emerald-600" },
            { label: "Teaching Hours",value: `${Math.round(totalMins / 60 * 10) / 10}h`, icon: BarChart2, bg: "bg-purple-50", text: "text-purple-600" },
            { label: "Present",       value: totalPresent,       icon: UserCheck,   bg: "bg-emerald-50", text: "text-emerald-600" },
            { label: "Absent",        value: totalAbsent,        icon: UserX,       bg: "bg-red-50",     text: "text-red-600" },
          ].map(({ label, value, icon: Icon, bg, text }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${text}`} />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View Toggle (inline on all screen sizes) ── */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5 overflow-x-auto">
        {([
          { key: "classes"    as ViewMode, label: "Classes",    icon: Calendar },
          { key: "students"   as ViewMode, label: "Students",   icon: Users },
          { key: "attendance" as ViewMode, label: "Attendance",  icon: ClipboardCheck },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setViewMode(key)}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              viewMode === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {key === "students" && students.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                viewMode === "students" ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-600"
              }`}>{students.length}</span>
            )}
            {key === "attendance" && completed.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                viewMode === "attendance" ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-600"
              }`}>{completed.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* -------------- CLASS LIST VIEW -------------- */}
      {viewMode === "classes" && (
        <>
          {/* Tab bar and Month Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-2">
            <div className="flex bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm w-full sm:w-auto overflow-x-auto">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    tab === t.key ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}>
                  <t.icon className={`w-3.5 h-3.5 ${tab === t.key ? "text-white" : t.color}`} />
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                      tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-gray-500">Month:</label>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
              {filterMonth && (
                <button onClick={() => setFilterMonth("")} className="text-xs font-bold text-red-500 hover:underline px-2 py-1">Clear</button>
              )}
            </div>
          </div>

          {/* Live hint */}
          {tab === "in-progress" && inProgress.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
              <Timer className="w-4 h-4 flex-shrink-0 animate-pulse" />
              Live class in progress! Click <strong>End Class</strong> when the session is over.
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm text-gray-400 font-medium">Loading classes…</p>
              </div>
            </div>
          ) : currentList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-14 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                {tab === "scheduled"   && <ListOrdered className="w-7 h-7 text-gray-300" />}
                {tab === "in-progress" && <Timer className="w-7 h-7 text-amber-300" />}
                {tab === "completed"   && <CheckCheck className="w-7 h-7 text-emerald-300" />}
              </div>
              <p className="font-bold text-gray-700 text-base">
                {tab === "scheduled"   && "No scheduled classes"}
                {tab === "in-progress" && "No class in progress"}
                {tab === "completed"   && "No completed classes yet"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {tab === "scheduled"   && "Create a class using the \"New Class\" button."}
                {tab === "in-progress" && "Start a scheduled class to see it here."}
                {tab === "completed"   && "Ended classes will appear here."}
              </p>
              {tab === "scheduled" && (
                <button onClick={() => setShowForm(true)}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> Schedule a Class
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentList.map(cls => (
                <ClassCard
                  key={cls._id} cls={cls} acting={acting}
                  onAction={(id: string, action: any) => handleAction(id, action)}
                  onEndRequest={(cls: any) => setEndTarget(cls)}
                  onDelete={setDeleteTarget}
                />
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-100 mt-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-800 disabled:opacity-50 hover:bg-gray-50 shadow-sm transition-all">
                    Previous
                  </button>
                  <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-800 disabled:opacity-50 hover:bg-gray-50 shadow-sm transition-all">
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* -------------- STUDENT LIST VIEW -------------- */}
      {viewMode === "students" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              My Students
              {!loading && <span className="text-gray-400 font-normal">({filteredStudents.length} of {students.length})</span>}
            </p>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, ID, email or phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-colors"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm text-gray-400">Loading students…</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                <Users className="w-8 h-8 text-gray-200" />
              </div>
              <div>
                <p className="font-bold text-gray-700">No students found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {search ? "No students match your search." : "You have no students assigned yet."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-3 font-semibold w-10">#</th>
                      <th className="px-5 py-3 font-semibold">Student</th>
                      <th className="px-5 py-3 font-semibold">ID</th>
                      <th className="px-5 py-3 font-semibold">Contact</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Courses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {filteredStudents.map((s, i) => (
                      <tr key={s._id} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="px-5 py-3.5 text-gray-400 font-medium text-sm">{i + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={s.fullName} src={s.avatar} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{s.fullName}</p>
                              <p className="text-[11px] text-gray-400 capitalize">{s.gender || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                            {s.studentId || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            {s.email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Mail className="w-3 h-3 text-gray-300" />
                                <span className="truncate max-w-[160px]">{s.email}</span>
                              </div>
                            )}
                            {(s.phone || s.studentNumber) && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Phone className="w-3 h-3 text-gray-300" />
                                <span>{s.phone || s.studentNumber}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            STUDENT_STATUS_COLORS[s.studentStatus] || "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>
                            {s.studentStatus || "active"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {s.courses?.length > 0 ? (
                              s.courses.slice(0, 2).map((c: any, idx: number) => (
                                <span key={idx} className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                                  {c.title}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">No courses</span>
                            )}
                            {s.courses?.length > 2 && (
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                +{s.courses.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredStudents.map((s) => (
                  <div key={s._id} className="p-4 flex items-start gap-3">
                    <Avatar name={s.fullName} src={s.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900 truncate">{s.fullName}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${
                          STUDENT_STATUS_COLORS[s.studentStatus] || "bg-gray-100 text-gray-600 border-gray-200"
                        }`}>{s.studentStatus || "active"}</span>
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 mt-0.5">{s.studentId}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                        {s.email && (
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>
                        )}
                        {(s.phone || s.studentNumber) && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone || s.studentNumber}</span>
                        )}
                      </div>
                      {s.courses?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.courses.map((c: any, idx: number) => (
                            <span key={idx} className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                              {c.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* -------------- ATTENDANCE VIEW -------------- */}
      {viewMode === "attendance" && (
        <div className="space-y-4">
          {/* Attendance summary KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Sessions",   value: totalDone,       icon: CheckCheck, bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-100" },
                { label: "Present",          value: totalPresent,    icon: UserCheck,  bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
                { label: "Absent",           value: totalAbsent,     icon: UserX,      bg: "bg-red-50",     text: "text-red-600",     border: "border-red-100" },
                { label: "Attendance Rate",  value: `${attendancePct}%`, icon: TrendingUp, bg: attendancePct >= 75 ? "bg-emerald-50" : attendancePct >= 50 ? "bg-amber-50" : "bg-red-50", text: attendancePct >= 75 ? "text-emerald-600" : attendancePct >= 50 ? "text-amber-600" : "text-red-600", border: "border-gray-100" },
              ].map(({ label, value, icon: Icon, bg, text, border }) => (
                <div key={label} className={`bg-white rounded-2xl border ${border} shadow-sm p-4 flex items-center gap-3`}>
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${text}`} />
                  </div>
                  <div>
                    <p className={`text-xl font-black ${text}`}>{value}</p>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Sub-tab toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-1">
              {([
                { key: "classes",  label: "Class-wise",   icon: ClipboardCheck },
                { key: "students", label: "Student-wise", icon: Users },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setAttTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    attTab === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Class-wise attendance list ── */}
            {attTab === "classes" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-indigo-500" />
                    All Completed Sessions
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200"><UserCheck className="w-3 h-3" /> {totalPresent}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200"><UserX className="w-3 h-3" /> {totalAbsent}</span>
                  </div>
                </div>

                {completed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                      <ClipboardCheck className="w-7 h-7 text-gray-200" />
                    </div>
                    <p className="font-bold text-gray-600">No completed sessions yet</p>
                    <p className="text-sm text-gray-400">Attendance will appear here once classes are ended.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                            <th className="px-5 py-3 font-semibold w-10">#</th>
                            <th className="px-5 py-3 font-semibold">Student</th>
                            <th className="px-5 py-3 font-semibold">Course</th>
                            <th className="px-5 py-3 font-semibold">Day / Time</th>
                            <th className="px-5 py-3 font-semibold">Duration</th>
                            <th className="px-5 py-3 font-semibold">Attendance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                          {completed.map((cls, i) => (
                            <tr key={cls._id} className="hover:bg-indigo-50/20 transition-colors">
                              <td className="px-5 py-3.5 text-gray-400 font-medium text-xs">{i + 1}</td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={cls.student?.fullName} src={cls.student?.avatar} size="sm" />
                                  <div>
                                    <p className="font-semibold text-gray-900 text-sm">{cls.student?.fullName || "—"}</p>
                                    <p className="text-[10px] font-mono text-gray-400">{cls.student?.studentId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="text-sm font-medium text-gray-800">{cls.course?.title || "—"}</p>
                                {cls.course?.level && (
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${LEVEL_COLORS[cls.course.level] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                    {cls.course.level}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="text-xs font-semibold text-gray-700 capitalize">{cls.dayOfWeek}</p>
                                <p className="text-[11px] text-gray-400">{cls.startTime} – {cls.endTime}</p>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                                  {cls.actualDuration ?? cls.duration ?? 45} min
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <AttendanceBadge status={cls.studentAttendance} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {completed.map((cls, i) => (
                        <div key={cls._id} className="p-4 flex items-start gap-3">
                          <Avatar name={cls.student?.fullName} src={cls.student?.avatar} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-gray-900 text-sm truncate">{cls.student?.fullName}</p>
                              <AttendanceBadge status={cls.studentAttendance} />
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{cls.course?.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{cls.dayOfWeek} · {cls.startTime}–{cls.endTime} · {cls.actualDuration ?? cls.duration ?? 45} min</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Student-wise attendance summary ── */}
            {attTab === "students" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Student Attendance Summary
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Based on all completed sessions</p>
                </div>

                {studentAttendanceList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                      <Users className="w-7 h-7 text-gray-200" />
                    </div>
                    <p className="font-bold text-gray-600">No student attendance data yet</p>
                    <p className="text-sm text-gray-400">End a class session to record attendance.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                            <th className="px-5 py-3 font-semibold w-10">#</th>
                            <th className="px-5 py-3 font-semibold">Student</th>
                            <th className="px-5 py-3 font-semibold text-center">Total</th>
                            <th className="px-5 py-3 font-semibold text-center">Present</th>
                            <th className="px-5 py-3 font-semibold text-center">Absent</th>
                            <th className="px-5 py-3 font-semibold text-center">Not Marked</th>
                            <th className="px-5 py-3 font-semibold">Attendance %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                          {(studentAttendanceList as any[]).map((row, i) => {
                            const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
                            const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
                            const pctColor = pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
                            return (
                              <tr key={row.student?._id} className="hover:bg-indigo-50/20 transition-colors">
                                <td className="px-5 py-3.5 text-gray-400 font-medium text-xs">{i + 1}</td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <Avatar name={row.student?.fullName} src={row.student?.avatar} size="sm" />
                                    <div>
                                      <p className="font-semibold text-gray-900">{row.student?.fullName || "—"}</p>
                                      <p className="text-[10px] font-mono text-gray-400">{row.student?.studentId}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  <span className="text-sm font-bold text-gray-700">{row.total}</span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <UserCheck className="w-3 h-3" /> {row.present}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                    <UserX className="w-3 h-3" /> {row.absent}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  <span className="text-xs font-semibold text-gray-400">{row.notMarked}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className={`text-xs font-black w-8 text-right ${pctColor}`}>{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {(studentAttendanceList as any[]).map((row) => {
                        const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
                        const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
                        const pctColor = pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
                        return (
                          <div key={row.student?._id} className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar name={row.student?.fullName} src={row.student?.avatar} size="md" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{row.student?.fullName}</p>
                                <p className="text-[10px] font-mono text-gray-400">{row.student?.studentId}</p>
                              </div>
                              <span className={`text-base font-black ${pctColor}`}>{pct}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                              <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-gray-500">Total: <strong className="text-gray-800">{row.total}</strong></span>
                              <span className="flex items-center gap-0.5 text-emerald-700 font-semibold"><UserCheck className="w-3 h-3" /> {row.present}</span>
                              <span className="flex items-center gap-0.5 text-red-700 font-semibold"><UserX className="w-3 h-3" /> {row.absent}</span>
                              {row.notMarked > 0 && <span className="text-gray-400">{row.notMarked} not marked</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
            )}
          </div>
        )}
      </div>
    )}

      {/* -------------- NEW CLASS MODAL -------------- */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col scale-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Schedule New Class
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Student */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5" /> Student *
                </label>
                <div className="relative">
                  <select required value={form.studentId}
                    onChange={e => handleStudentChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white">
                    <option value="">— Choose Student —</option>
                    {students.map((s: any) => (
                      <option key={s._id} value={s._id}>
                        {s.fullName} · {s.studentId}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {students.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" /> No students assigned to you yet.
                  </p>
                )}
              </div>

              {/* Course */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5" /> Course *
                </label>
                <div className="relative">
                  <select required value={form.courseId} onChange={e => set("courseId", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white">
                    <option value="">— Choose Course —</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.title} ({c.courseId})</option>
                    ))}
                    {courses.length === 0 && <option disabled value="">No courses available</option>}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Auto-fill hint — shown only when schedule was detected */}
              {studentHasSchedule && (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-xs font-semibold text-indigo-700">
                    Day, time &amp; duration auto-filled from student&apos;s schedule. You can still edit them.
                  </p>
                </div>
              )}

              {/* Day + Time row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Day */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" /> Day *
                    {studentHasSchedule && (
                      <span className="ml-auto text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 normal-case tracking-normal">Auto</span>
                    )}
                  </label>
                  <div className="relative">
                    <select required value={form.dayOfWeek} onChange={e => set("dayOfWeek", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white capitalize">
                      {DAYS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Start Time */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" /> Start Time *
                    {studentHasSchedule && (
                      <span className="ml-auto text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 normal-case tracking-normal">Auto</span>
                    )}
                  </label>
                  <input type="time" required value={form.startTime} onChange={e => set("startTime", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  <Timer className="w-3.5 h-3.5" /> Duration (minutes) *
                  {studentHasSchedule && (
                    <span className="ml-auto text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 normal-case tracking-normal">Auto</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="number"
                    required
                    min={15}
                    max={180}
                    step={5}
                    value={form.duration}
                    onChange={e => {
                      const val = Math.max(15, Math.min(180, Number(e.target.value) || 15));
                      set("duration", String(val));
                    }}
                    onBlur={e => {
                      const val = Math.max(15, Math.min(180, Number(e.target.value) || 15));
                      set("duration", String(val));
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="45"
                  />
                  <div className="relative">
                    <select
                      value={form.duration}
                      onChange={e => set("duration", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                    >
                      {[15,20,25,30,40,45,50,60,75,90,120,150,180].map(d => (
                        <option key={d} value={String(d)}>{d} min</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Between 15 and 180 minutes. Double-booking is prevented automatically.</p>
              </div>

              {/* Class Topic — required, placed before optional fields */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" /> Class Topic *
                </label>
                <input
                  type="text"
                  required
                  value={form.topic}
                  onChange={e => set("topic", e.target.value)}
                  placeholder="E.g., Surah Al-Fatiha, Tajweed basics…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">Required. Each session must have a unique topic.</p>
              </div>

              {/* Meeting Link (optional) */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  <Video className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> Meeting Link
                  <span className="ml-1 text-[10px] font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.meetLink}
                  onChange={e => set("meetLink", e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">Paste your Google Meet, Zoom, or any video call link here.</p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider block">Notes</label>
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                  placeholder="Optional notes for this session…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
              </div>

              {/* Feedback */}
              {msg.text && (
                <div className={`p-3 rounded-xl text-sm flex items-start gap-2 border ${
                  msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <span className="break-all">{msg.text}</span>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-1 flex-shrink-0">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Scheduling…" : "Schedule Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteModal cls={deleteTarget} deleting={deleting} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      <EndClassModal
        cls={endTarget}
        acting={!!acting}
        onClose={() => setEndTarget(null)}
        onConfirm={handleConfirmEnd}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}