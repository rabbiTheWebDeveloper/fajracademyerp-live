"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import LiveClassCountdown from "@/components/LiveClassCountdown";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  AlertCircle,
  Play,
  CheckSquare,
  MinusCircle,
  BarChart2,
  TrendingUp,
  Award,
  SlidersHorizontal,
  Filter,
  ChevronLeft,
  ChevronRight,
  Video,
  Sparkles,
  CalendarDays,
  Hourglass,
  Layers,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ClassSession {
  _id: string;
  classId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "paused";
  studentAttendance: "present" | "absent" | "not-marked";
  startedAt: string | null;
  endedAt: string | null;
  actualDuration: number | null;
  notes: string;
  topic?: string;
  meetLink?: string;
  createdAt?: string;
  course: { _id: string; title: string; courseId: string; level: string; thumbnail?: string };
  student: { _id: string; fullName: string; studentId: string; avatar?: string; phone?: string };
}

interface TeacherRow {
  _id: string;
  teacherId: string;
  fullName: string;
  designation: string;
  avatar: string;
  status: string;
  phone?: string;

  // Monthly stats
  monthlyTotal: number;
  monthlyCompleted: number;
  monthlyRemaining: number;
  monthlyScheduled: number;
  monthlyInProgress: number;
  monthlyCancelled: number;
  monthlyPresent: number;
  monthlyAbsent: number;
  monthlyNotMarked: number;

  // Today stats
  todayTotal: number;
  todayCompleted: number;
  todayRemaining: number;
  todayScheduled: number;
  todayInProgress: number;
  todayCancelled: number;
  todayPresent: number;
  todayAbsent: number;
  todayNotMarked: number;

  // All-time stats
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  completedCount: number;
  scheduledCount: number;
  inProgressCount: number;

  sessions: ClassSession[];
  todayClasses: ClassSession[];
}

interface Summary {
  monthlyTotalClasses: number;
  monthlyCompleted: number;
  monthlyRemaining: number;
  monthlyScheduled: number;
  monthlyInProgress: number;
  monthlyCancelled: number;
  monthlyPresent: number;
  monthlyAbsent: number;
  activeTeachersMonth: number;

  todayTotalClasses: number;
  todayCompleted: number;
  todayRemaining: number;
  todayScheduled: number;
  todayInProgress: number;
  todayCancelled: number;
  todayPresent: number;
  todayAbsent: number;
  activeTeachersToday: number;

  totalTeachers: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  if (!name) return "T";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fmt12(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function statusConfig(status: string) {
  switch (status) {
    case "scheduled":
      return { label: "Scheduled", bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: Clock };
    case "in-progress":
      return { label: "In Progress", bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500 animate-ping", icon: Play };
    case "completed":
      return { label: "Completed", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: CheckSquare };
    case "cancelled":
      return { label: "Cancelled", bg: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", icon: XCircle };
    case "paused":
      return { label: "Paused", bg: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", icon: MinusCircle };
    default:
      return { label: status, bg: "bg-gray-50 text-gray-700 border-gray-200", dot: "bg-gray-400", icon: AlertCircle };
  }
}

function attendanceBadge(att: string) {
  switch (att) {
    case "present":
      return { label: "Present", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2 };
    case "absent":
      return { label: "Absent", cls: "bg-rose-50 text-rose-700 border border-rose-200", icon: XCircle };
    case "not-marked":
    default:
      return { label: "Not Marked", cls: "bg-gray-50 text-gray-500 border border-gray-200", icon: MinusCircle };
  }
}

function levelBadge(level: string) {
  switch (level?.toLowerCase()) {
    case "beginner":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "intermediate":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "advanced":
      return "bg-purple-50 text-purple-700 border border-purple-200";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
}

// ─── StatCard Component ────────────────────────────────────────────────────────
function StatCard({
  title,
  mainValue,
  subLabel,
  badgeText,
  icon: Icon,
  gradient,
  loading,
}: {
  title: string;
  mainValue: number | string;
  subLabel?: string;
  badgeText?: string;
  icon: React.ElementType;
  gradient: string;
  loading?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient} shadow-sm border border-white/10 text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between">
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-inner">
          <Icon className="w-5 h-5 text-white" />
        </div>
        {badgeText && (
          <span className="text-[11px] font-semibold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-white/90 border border-white/20">
            {badgeText}
          </span>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-20 bg-white/20 rounded-lg animate-pulse mb-1.5" />
        ) : (
          <p className="text-3xl font-extrabold tracking-tight">{mainValue}</p>
        )}
        <p className="text-sm font-semibold text-white/90 mt-1">{title}</p>
        {subLabel && <p className="text-xs text-white/70 mt-0.5">{subLabel}</p>}
      </div>
    </div>
  );
}

// ─── ClassRow Component ────────────────────────────────────────────────────────
function ClassRow({ cls, rank }: { cls: ClassSession; rank: number }) {
  const sc = statusConfig(cls.status);
  const StatusIcon = sc.icon;
  const att = attendanceBadge(cls.studentAttendance);
  const AttIcon = att.icon;

  return (
    <tr className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
      <td className="py-3 px-4">
        <span className="text-xs font-bold text-gray-400">#{rank}</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          {cls.student?.avatar ? (
            <img
              src={cls.student.avatar}
              alt={cls.student?.fullName}
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {getInitials(cls.student?.fullName || "?")}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{cls.student?.fullName || "—"}</p>
            <p className="text-xs text-gray-400">{cls.student?.studentId || "—"}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {cls.course?.thumbnail ? (
            <img
              src={cls.course.thumbnail}
              alt={cls.course.title}
              className="w-7 h-7 rounded-lg object-cover border border-gray-100"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{cls.course?.title || "—"}</p>
            {cls.course?.level && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded capitalize font-medium ${levelBadge(cls.course.level)}`}>
                {cls.course.level}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 font-medium">
            {fmt12(cls.startTime)} – {fmt12(cls.endTime)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 ml-5">
          {cls.actualDuration ? `${cls.actualDuration} min (actual)` : `${cls.duration} min (scheduled)`}
        </p>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.bg}`}>
          <StatusIcon className="w-3 h-3" />
          {sc.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${att.cls}`}>
          <AttIcon className="w-3 h-3" />
          {att.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="max-w-[180px]">
          {cls.topic && <p className="text-xs font-medium text-gray-800 truncate">{cls.topic}</p>}
          {cls.notes ? (
            <p className="text-xs text-gray-500 italic truncate" title={cls.notes}>
              {cls.notes}
            </p>
          ) : (
            !cls.topic && <span className="text-xs text-gray-300">—</span>
          )}
          {cls.meetLink && (
            <a
              href={cls.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
            >
              <Video className="w-3 h-3" /> Join Class
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── ExpandableTeacherCard Component ──────────────────────────────────────────
function ExpandableTeacherCard({
  teacher,
  rank,
  forceExpand,
  viewMode,
}: {
  teacher: TeacherRow;
  rank: number;
  forceExpand: boolean;
  viewMode: "day" | "month";
}) {
  const [localExpand, setLocalExpand] = useState(false);
  const expanded = forceExpand || localExpand;

  // Monthly stats
  const monthlyTotal = teacher.monthlyTotal || 0;
  const monthlyCompleted = teacher.monthlyCompleted || 0;
  const monthlyRemaining = teacher.monthlyRemaining !== undefined ? teacher.monthlyRemaining : Math.max(0, monthlyTotal - monthlyCompleted);
  const monthlyScheduled = teacher.monthlyScheduled || 0;
  const monthlyInProgress = teacher.monthlyInProgress || 0;
  const monthlyPresent = teacher.monthlyPresent || 0;
  const monthlyAbsent = teacher.monthlyAbsent || 0;

  const monthlyCompletedRate = monthlyTotal > 0 ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0;
  const monthlyAttTotal = monthlyPresent + monthlyAbsent;
  const monthlyAttRate = monthlyAttTotal > 0 ? Math.round((monthlyPresent / monthlyAttTotal) * 100) : 0;

  // Today stats
  const todayTotal = teacher.todayTotal || 0;
  const todayCompleted = teacher.todayCompleted || 0;
  const todayRemaining = teacher.todayRemaining !== undefined ? teacher.todayRemaining : Math.max(0, todayTotal - todayCompleted);
  const todayScheduled = teacher.todayScheduled || 0;
  const todayInProgress = teacher.todayInProgress || 0;
  const todayPresent = teacher.todayPresent || 0;
  const todayAbsent = teacher.todayAbsent || 0;

  const displaySessions = teacher.sessions || teacher.todayClasses || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Teacher Card Header */}
      <div
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
        onClick={() => setLocalExpand((p) => !p)}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Rank Badge */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm ${
              rank === 1
                ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                : rank === 2
                ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                : rank === 3
                ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white"
                : "bg-gray-100 text-gray-600 font-semibold"
            }`}
          >
            {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
          </div>

          {/* Teacher Avatar */}
          <div className="flex-shrink-0">
            {teacher.avatar ? (
              <img
                src={teacher.avatar}
                alt={teacher.fullName}
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm border-2 border-white">
                {getInitials(teacher.fullName)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-bold text-gray-900 truncate">{teacher.fullName}</p>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                  teacher.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : teacher.status === "on-leave"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {teacher.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {teacher.designation || "Teacher"} · <span className="font-mono text-gray-600">{teacher.teacherId}</span>
              {teacher.phone && ` · ${teacher.phone}`}
            </p>
          </div>
        </div>

        {/* Stats Metrics Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Monthly Total Classes */}
          <div className="px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50/70 text-center min-w-[70px]">
            <p className="text-base font-extrabold text-blue-700 leading-none">{monthlyTotal}</p>
            <p className="text-[10px] font-semibold uppercase text-blue-600/80 mt-0.5">Month Total</p>
          </div>

          {/* Monthly Completed Classes */}
          <div className="px-3 py-1.5 rounded-xl border border-emerald-100 bg-emerald-50/70 text-center min-w-[70px]">
            <p className="text-base font-extrabold text-emerald-700 leading-none">
              {viewMode === "month" ? monthlyCompleted : todayCompleted}
            </p>
            <p className="text-[10px] font-semibold uppercase text-emerald-600/80 mt-0.5">Completed</p>
          </div>

          {/* Monthly Remaining Classes */}
          <div className="px-3 py-1.5 rounded-xl border border-rose-100 bg-rose-50/70 text-center min-w-[70px]">
            <p className="text-base font-extrabold text-rose-700 leading-none">
              {viewMode === "month" ? monthlyRemaining : todayRemaining}
            </p>
            <p className="text-[10px] font-semibold uppercase text-rose-600/80 mt-0.5">Remaining</p>
          </div>

          {/* Scheduled */}
          <div className="px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50/70 text-center min-w-[65px]">
            <p className="text-base font-extrabold text-indigo-700 leading-none">
              {viewMode === "month" ? monthlyScheduled : todayScheduled}
            </p>
            <p className="text-[10px] font-semibold uppercase text-indigo-600/80 mt-0.5">Scheduled</p>
          </div>

          {/* In Progress */}
          <div className="px-3 py-1.5 rounded-xl border border-amber-100 bg-amber-50/70 text-center min-w-[65px]">
            <p className="text-base font-extrabold text-amber-700 leading-none flex items-center justify-center gap-1">
              {(viewMode === "month" ? monthlyInProgress : todayInProgress) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
              {viewMode === "month" ? monthlyInProgress : todayInProgress}
            </p>
            <p className="text-[10px] font-semibold uppercase text-amber-600/80 mt-0.5">In Progress</p>
          </div>

          {/* Attendance Present */}
          <div className="px-3 py-1.5 rounded-xl border border-teal-100 bg-teal-50/70 text-center min-w-[60px]">
            <p className="text-base font-extrabold text-teal-700 leading-none">
              {viewMode === "month" ? monthlyPresent : todayPresent}
            </p>
            <p className="text-[10px] font-semibold uppercase text-teal-600/80 mt-0.5">Present</p>
          </div>

          {/* Completion Rate bar */}
          <div className="hidden lg:flex flex-col items-end gap-1 min-w-[90px] pl-2 border-l border-gray-100">
            <p className="text-xs text-gray-500 font-medium">
              Done:{" "}
              <span className={`font-bold ${monthlyCompletedRate >= 80 ? "text-emerald-600" : monthlyCompletedRate >= 50 ? "text-amber-600" : "text-gray-600"}`}>
                {monthlyCompletedRate}%
              </span>
            </p>
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  monthlyCompletedRate >= 80
                    ? "bg-emerald-500"
                    : monthlyCompletedRate >= 50
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${monthlyCompletedRate}%` }}
              />
            </div>
          </div>

          {/* Expand toggle */}
          <button
            className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition-colors ml-1"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Class Sessions & Deep Stats */}
      {expanded && (
        <div className="border-t border-gray-100 bg-slate-50/30">
          {/* Teacher Summary Sub-Bar */}
          <div className="px-5 py-3 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-gray-700 font-semibold">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                Month Total: <strong>{monthlyTotal}</strong> classes
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <CheckSquare className="w-3.5 h-3.5" />
                Completed: <strong>{monthlyCompleted}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                <Hourglass className="w-3.5 h-3.5" />
                Remaining: <strong>{monthlyRemaining}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-indigo-600">
                <Clock className="w-3.5 h-3.5" />
                Scheduled: <strong>{monthlyScheduled}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <Play className="w-3.5 h-3.5" />
                In Progress: <strong>{monthlyInProgress}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Present: <strong>{monthlyPresent}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <XCircle className="w-3.5 h-3.5" />
                Absent: <strong>{monthlyAbsent}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-500">Attendance Rate:</span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                {monthlyAttRate}%
              </span>
            </div>
          </div>

          {/* Session List Table */}
          {displaySessions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Calendar className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold text-gray-600">No class sessions found for this period</p>
              <p className="text-xs text-gray-400">
                All-time classes conducted: <span className="font-bold text-gray-700">{teacher.totalClasses}</span>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-white">
                    <th className="py-3 px-4 font-semibold">#</th>
                    <th className="py-3 px-4 font-semibold">Student</th>
                    <th className="py-3 px-4 font-semibold">Course</th>
                    <th className="py-3 px-4 font-semibold">Time & Duration</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Attendance</th>
                    <th className="py-3 px-4 font-semibold">Topic / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {displaySessions.map((cls, i) => (
                    <ClassRow key={cls._id || i} cls={cls} rank={i + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Comprehensive All-time Stats Footer */}
          <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-blue-50/40 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                All-Time Career Stats:
              </span>
              <span>
                Total: <strong className="text-gray-900">{teacher.totalClasses}</strong>
              </span>
              <span className="text-emerald-600">
                Completed: <strong>{teacher.completedCount}</strong>
              </span>
              <span className="text-indigo-600">
                Scheduled: <strong>{teacher.scheduledCount}</strong>
              </span>
              <span className="text-amber-600">
                In-Progress: <strong>{teacher.inProgressCount}</strong>
              </span>
              <span className="text-emerald-700">
                Present: <strong>{teacher.presentCount}</strong>
              </span>
              <span className="text-rose-600">
                Absent: <strong>{teacher.absentCount}</strong>
              </span>
            </div>

            <div className="text-gray-400 font-mono text-[11px]">
              ID: {teacher.teacherId}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Classes Overview Page ────────────────────────────────────────────────
export default function ClassesOverviewPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    monthlyTotalClasses: 0,
    monthlyCompleted: 0,
    monthlyRemaining: 0,
    monthlyScheduled: 0,
    monthlyInProgress: 0,
    monthlyCancelled: 0,
    monthlyPresent: 0,
    monthlyAbsent: 0,
    activeTeachersMonth: 0,
    todayTotalClasses: 0,
    todayCompleted: 0,
    todayRemaining: 0,
    todayScheduled: 0,
    todayInProgress: 0,
    todayCancelled: 0,
    todayPresent: 0,
    todayAbsent: 0,
    activeTeachersToday: 0,
    totalTeachers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"day" | "month">("month");

  // Date & Month states
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dayName, setDayName] = useState("");

  const [expandAll, setExpandAll] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const fetchData = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          viewMode,
          status: statusFilter,
          date,
          month,
          search: search.trim(),
          page: String(targetPage),
          limit: String(LIMIT),
        });

        const res = await fetch(`/api/admin/classes?${params}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to fetch class data");

        setTeachers(data.teachers || []);
        setSummary(data.summary || {});
        setDayName(data.dayName || "");
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } catch (e: any) {
        setError(e.message || "Failed to load class overview data");
      } finally {
        setLoading(false);
      }
    },
    [viewMode, statusFilter, date, month, search]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      fetchData(1);
    }, 350);
    return () => clearTimeout(debounce);
  }, [viewMode, statusFilter, date, month, search, fetchData]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(newPage);
  };

  const handleRefresh = () => {
    fetchData(page);
  };

  // Calculations for UI rates
  const displayedTotalClasses = viewMode === "month" ? summary.monthlyTotalClasses : summary.todayTotalClasses;
  const displayedCompleted = viewMode === "month" ? summary.monthlyCompleted : summary.todayCompleted;
  const displayedRemaining = viewMode === "month" ? summary.monthlyRemaining : summary.todayRemaining;
  const displayedScheduled = viewMode === "month" ? summary.monthlyScheduled : summary.todayScheduled;
  const displayedInProgress = viewMode === "month" ? summary.monthlyInProgress : summary.todayInProgress;
  const displayedPresent = viewMode === "month" ? summary.monthlyPresent : summary.todayPresent;
  const displayedAbsent = viewMode === "month" ? summary.monthlyAbsent : summary.todayAbsent;

  const completionRate = displayedTotalClasses > 0 ? Math.round((displayedCompleted / displayedTotalClasses) * 100) : 0;
  const attendanceTotal = displayedPresent + displayedAbsent;
  const attendanceRate = attendanceTotal > 0 ? Math.round((displayedPresent / attendanceTotal) * 100) : 0;

  const todaysAllSchedules = useMemo(() => {
    const list: any[] = [];
    teachers.forEach((t) => {
      const sessions = t.sessions || t.todayClasses || [];
      sessions.forEach((s) => {
        list.push({
          ...s,
          teacher: { fullName: t.fullName, _id: t._id },
        });
      });
    });
    return list;
  }, [teachers]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Classes Dashboard
            </span>
            {dayName && (
              <span className="text-xs font-semibold text-gray-500 capitalize bg-gray-100 px-2.5 py-1 rounded-full">
                {dayName}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            Academy Classes Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time monthly & daily tracking of total, completed, remaining, scheduled, and in-progress classes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle Pill */}
          <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "month"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📅 Monthly Overview
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "day"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📆 Daily View
            </button>
          </div>

          <Link
            href="/classes/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <CalendarDays className="w-4 h-4" />
            Monthly Activity Reports
          </Link>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-xs sm:text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Live Class Countdown Widget */}
      {todaysAllSchedules.length > 0 && (
        <LiveClassCountdown
          schedules={todaysAllSchedules}
          role="admin"
          classPageHref="/classes"
        />
      )}

      {/* Top 6 KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Monthly / Period Total Classes */}
        <StatCard
          title={viewMode === "month" ? "Monthly Total" : "Today Total"}
          mainValue={displayedTotalClasses}
          subLabel={viewMode === "month" ? `Month: ${month}` : `Date: ${date}`}
          badgeText="All Classes"
          icon={BookOpen}
          gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
          loading={loading}
        />

        {/* 2. Monthly Completed Classes */}
        <StatCard
          title={viewMode === "month" ? "Monthly Complete" : "Today Complete"}
          mainValue={displayedCompleted}
          subLabel={`${completionRate}% Completed`}
          badgeText="Done"
          icon={CheckSquare}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
          loading={loading}
        />

        {/* 3. Monthly Remaining Classes */}
        <StatCard
          title={viewMode === "month" ? "Monthly Remaining" : "Today Remaining"}
          mainValue={displayedRemaining}
          subLabel={`${displayedTotalClasses > 0 ? Math.round((displayedRemaining / displayedTotalClasses) * 100) : 0}% Pending`}
          badgeText="Remaining"
          icon={Hourglass}
          gradient="bg-gradient-to-br from-rose-500 to-pink-700"
          loading={loading}
        />

        {/* 4. Scheduled Classes */}
        <StatCard
          title="Scheduled Class"
          mainValue={displayedScheduled}
          subLabel={viewMode === "month" ? `Today: ${summary.todayScheduled}` : `Month: ${summary.monthlyScheduled}`}
          badgeText="Upcoming"
          icon={Clock}
          gradient="bg-gradient-to-br from-indigo-500 to-purple-700"
          loading={loading}
        />

        {/* 5. In-Progress Classes */}
        <StatCard
          title="In-Progress Class"
          mainValue={displayedInProgress}
          subLabel={displayedInProgress > 0 ? "Live running" : "0 active"}
          badgeText={displayedInProgress > 0 ? "● LIVE" : "Idle"}
          icon={Play}
          gradient="bg-gradient-to-br from-amber-500 to-orange-700"
          loading={loading}
        />

        {/* 6. Student Present Attendance */}
        <StatCard
          title="Student Present"
          mainValue={displayedPresent}
          subLabel={`${attendanceRate}% Attendance Rate`}
          badgeText={`${displayedAbsent} Absent`}
          icon={CheckCircle2}
          gradient="bg-gradient-to-br from-teal-500 to-cyan-700"
          loading={loading}
        />
      </div>

      {/* Secondary Metrics Row: Attendance & Progress Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Class Completion Progress Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Monthly Completion Overview
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {completionRate}% Complete
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed ({displayedCompleted})
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Remaining ({displayedRemaining})
            </span>
          </div>

          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            {displayedCompleted > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${displayedTotalClasses > 0 ? (displayedCompleted / displayedTotalClasses) * 100 : 0}%` }}
              />
            )}
            {displayedRemaining > 0 && (
              <div
                className="h-full bg-rose-400 transition-all duration-500"
                style={{ width: `${displayedTotalClasses > 0 ? (displayedRemaining / displayedTotalClasses) * 100 : 0}%` }}
              />
            )}
          </div>
        </div>

        {/* Attendance Breakdown Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Student Attendance
            </h3>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {attendanceRate}% Present
            </span>
          </div>

          <div className="flex items-center justify-between text-sm pt-1">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Present: <strong>{displayedPresent}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Absent: <strong>{displayedAbsent}</strong>
            </span>
            <span className="text-xs text-gray-400">Total: {attendanceTotal}</span>
          </div>

          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            {displayedPresent > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${attendanceTotal > 0 ? (displayedPresent / attendanceTotal) * 100 : 0}%` }}
              />
            )}
            {displayedAbsent > 0 && (
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${attendanceTotal > 0 ? (displayedAbsent / attendanceTotal) * 100 : 0}%` }}
              />
            )}
          </div>
        </div>

        {/* Teachers Activity Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              Teacher Participation
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              {summary.totalTeachers} Total Teachers
            </span>
          </div>

          <div className="flex items-center justify-between text-sm pt-1">
            <span className="text-gray-600">
              Active in Month: <strong className="text-purple-700">{summary.activeTeachersMonth}</strong>
            </span>
            <span className="text-gray-600">
              Active Today: <strong className="text-blue-700">{summary.activeTeachersToday}</strong>
            </span>
          </div>

          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
              style={{
                width: `${summary.totalTeachers > 0 ? (summary.activeTeachersMonth / summary.totalTeachers) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Teacher Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="class-search"
              type="text"
              placeholder="Search teacher name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Month Selector */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="class-month"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                if (viewMode !== "month") setViewMode("month");
              }}
              className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white font-medium text-gray-700"
              title="Select Month"
            />
          </div>

          {/* Date Selector */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="class-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (viewMode !== "day") setViewMode("day");
              }}
              className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white font-medium text-gray-700"
              title="Select Specific Date"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              id="class-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white appearance-none cursor-pointer font-medium text-gray-700"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">🕒 Scheduled</option>
              <option value="in-progress">⚡ In Progress</option>
              <option value="completed">✅ Completed</option>
              <option value="cancelled">❌ Cancelled</option>
            </select>
          </div>

          {/* Expand/Collapse All */}
          <button
            id="class-expand-all"
            onClick={() => setExpandAll((p) => !p)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {expandAll ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 bg-gray-200 rounded-xl" />
                  <div className="w-11 h-11 bg-gray-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-44" />
                    <div className="h-3 bg-gray-100 rounded w-32" />
                  </div>
                </div>
                <div className="hidden sm:flex gap-2">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="w-16 h-10 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && teachers.length === 0 && !error && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <GraduationCap className="w-12 h-12 opacity-30" />
          <p className="text-base font-bold text-gray-700">No teachers found</p>
          <p className="text-sm text-gray-400">Try adjusting your search, status filter, or date range.</p>
        </div>
      )}

      {/* Teachers List */}
      {!loading && teachers.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-800">{total === 0 ? 0 : (page - 1) * LIMIT + 1}</span> to{" "}
              <span className="font-bold text-gray-800">{Math.min(page * LIMIT, total)}</span> of{" "}
              <span className="font-bold text-gray-800">{total}</span> teacher{total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <Award className="w-4 h-4 text-amber-500" />
              Ranked by {viewMode === "month" ? "Monthly Total Classes" : "Daily Classes"}
            </div>
          </div>

          <div className="space-y-3">
            {teachers.map((teacher, i) => (
              <ExpandableTeacherCard
                key={teacher._id}
                teacher={teacher}
                rank={(page - 1) * LIMIT + i + 1}
                forceExpand={expandAll}
                viewMode={viewMode}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500 mt-4">
              <div>
                Page <span className="font-bold text-gray-900">{page}</span> of{" "}
                <span className="font-bold text-gray-900">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3.5 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 font-semibold text-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm">
                  {page}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3.5 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 font-semibold text-gray-700 transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
