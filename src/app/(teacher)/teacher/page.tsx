"use client";

import { useState, useEffect } from "react";
import {
  Users, BookOpen, Clock, AlertCircle, CheckSquare, ChevronRight,
  FileText, Loader2, TrendingUp, TrendingDown, Calendar, Zap,
  PlayCircle, ShieldCheck, CheckCircle2, Circle,
  Trophy, Bell, Banknote, Settings, Video, User, Coffee, ArrowRight, CalendarDays, Info, Ticket,
  Sparkles, Flame, X,
} from "lucide-react";
import Link from "next/link";
import { useTeacher } from "./TeacherContext";
import { apiFetch } from "./apiFetch";
import LiveClassCountdown from "@/components/LiveClassCountdown";

// ── Completion helper (same fields as settings page) ───────────────────────
const PROFILE_FIELDS: { key: string; label: string; href: string }[] = [
  { key: "avatar",                      label: "Profile photo",          href: "/teacher/settings" },
  { key: "fullName",                    label: "Full name",              href: "/teacher/settings" },
  { key: "phone",                       label: "Phone number",           href: "/teacher/settings" },
  { key: "emergencyContactNumber",      label: "Emergency contact",      href: "/teacher/settings" },
  { key: "gender",                      label: "Gender",                 href: "/teacher/settings" },
  { key: "bloodGroup",                 label: "Blood group",            href: "/teacher/settings" },
  { key: "presentAddress",             label: "Present address",        href: "/teacher/settings" },
  { key: "permanentAddress",           label: "Permanent address",      href: "/teacher/settings" },
  { key: "nidOrBirthCertificatePicture", label: "NID / Birth certificate", href: "/teacher/settings" },
  { key: "bio",                         label: "Biography",              href: "/teacher/settings" },
  { key: "joinDate",                    label: "Join date",              href: "/teacher/settings" },
];
const PAYMENT_FIELDS: { key: string; label: string }[] = [
  { key: "accountName",   label: "Payment account name" },
  { key: "accountNumber", label: "Payment account number" },
  { key: "bankName",      label: "Bank / Provider name" },
];
function calcProfileCompletion(p: any) {
  const checks = [
    ...PROFILE_FIELDS.map(f => ({ label: f.label, href: f.href, done: !!p?.[f.key] })),
    { label: "At least 1 qualification", href: "/teacher/settings", done: (p?.qualifications?.length ?? 0) > 0 },
    ...PAYMENT_FIELDS.map(f => ({ label: f.label, href: "/teacher/salary", done: !!p?.paymentInfo?.[f.key] })),
  ];
  const done = checks.filter(c => c.done).length;
  return { pct: Math.round((done / checks.length) * 100), checks, done, total: checks.length };
}

export default function TeacherDashboard() {
  // Profile comes from context — no extra fetch needed
  const { profile, profileLoading } = useTeacher();

  const [monthFilter, setMonthFilter]   = useState<"current" | "previous">("current");
  const [stats, setStats]               = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [schedules, setSchedules]       = useState<any[]>([]);
  const [gems, setGems]                 = useState<any>(null);
  const [earnModalOpen, setEarnModalOpen] = useState(false);
  const [useModalOpen, setUseModalOpen]   = useState(false);

  // Independent loading states — each section renders as its data arrives
  const [statsLoading, setStatsLoading]         = useState(true);
  const [announcementsLoading, setAnnLoading]   = useState(true);
  const [scheduleLoading, setSchedLoading]      = useState(true);

  // Combined for full-page skeleton (true only until first data arrives)
  const loading = statsLoading && announcementsLoading && scheduleLoading && profileLoading;

  useEffect(() => {
    setStatsLoading(true);
    // Dashboard stats: cache 60s (changes per class session updates)
    // We append the month filter so they cache separately.
    apiFetch(`/api/teacher-portal/dashboard?month=${monthFilter}`, undefined, 60_000)
      .then((d) => { if (d?.success) setStats(d.stats); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [monthFilter]);

  useEffect(() => {
    // Announcements: cache 2 minutes
    apiFetch("/api/teacher-portal/announcements", undefined, 2 * 60_000)
      .then((d) => { if (d?.success) setAnnouncements(d.announcements || []); })
      .catch(() => {})
      .finally(() => setAnnLoading(false));

    // Schedule: cache 5 minutes (rarely changes mid-day)
    apiFetch("/api/teacher-portal/schedule", undefined, 5 * 60_000)
      .then((d) => { if (d?.success) setSchedules(d.schedules || []); })
      .catch(() => {})
      .finally(() => setSchedLoading(false));

    // Gems: cache 2 minutes
    apiFetch("/api/teacher-portal/gems", undefined, 2 * 60_000)
      .then((d) => { if (d?.success) setGems(d); })
      .catch(() => {});
  }, []);

  const fmtTime = (t: string | null) =>
    t ? new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const now = new Date();
  const currentDayIndex = (now.getDay() + 6) % 7;
  const todayKey = DAY_KEYS[currentDayIndex];
  const todayName = DAY_NAMES[currentDayIndex];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const str = timeStr.trim().toUpperCase();
    const isPM = str.includes("PM");
    const isAM = str.includes("AM");
    const clean = str.replace(/(AM|PM)/g, "").trim();
    const parts = clean.split(":");
    let hours = parseInt(parts[0] || "0", 10);
    const minutes = parseInt(parts[1] || "0", 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return "TBD";
    const mins = parseTimeToMinutes(timeStr);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : `${m}`;
    return `${displayH}:${displayM} ${period}`;
  };

  const todaySchedules = schedules
    .filter((s) => {
      const singleDayMatch = s.dayOfWeek && s.dayOfWeek.toLowerCase() === todayKey;
      const listDayMatch =
        Array.isArray(s.weekly_days_list) &&
        s.weekly_days_list.some((d: string) => d.toLowerCase() === todayKey);
      const dayTimesMatch =
        Array.isArray(s.day_times) &&
        s.day_times.some((dt: any) => dt.day?.toLowerCase() === todayKey);
      return singleDayMatch || listDayMatch || dayTimesMatch;
    })
    .map((s) => {
      const dt = Array.isArray(s.day_times)
        ? s.day_times.find((d: any) => d.day?.toLowerCase() === todayKey)
        : null;
      const effectiveStartTime = dt?.startTime || s.startTime || "";
      const effectiveDuration = Number(dt?.duration) || Number(s.duration) || 45;
      const effectiveEndTime =
        dt?.endTime ||
        s.endTime ||
        "";
      return {
        ...s,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        duration: effectiveDuration,
      };
    })
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));


  const ongoingSession = todaySchedules.find((s) => {
    const start = parseTimeToMinutes(s.startTime);
    const end = parseTimeToMinutes(s.endTime) || start + 60;
    return currentMinutes >= start && currentMinutes < end;
  });

  const nextSession = todaySchedules.find((s) => parseTimeToMinutes(s.startTime) > currentMinutes);

  const featuredSession = ongoingSession || nextSession || todaySchedules[0];

  const todayTotal = (stats?.todayTotalClassSchedule > 0 ? stats.todayTotalClassSchedule : 0) || todaySchedules.length || 0;
  
  const completedFromSchedule = todaySchedules.filter((s) => {
    const endMins = parseTimeToMinutes(s.endTime) || (parseTimeToMinutes(s.startTime) + 60);
    return currentMinutes >= endMins;
  }).length;

  const todayDone = stats?.todayClassDone !== undefined && stats?.todayClassDone > 0 
    ? stats.todayClassDone 
    : completedFromSchedule;

  const progressPct = todayTotal > 0 ? Math.min(100, Math.round((todayDone / todayTotal) * 100)) : 0;

  const statCards = [
    {
      title: "Total Students",
      value: stats?.totalStudents ?? 0,
      icon: Users,
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      border: "border-emerald-100",
      link: "/teacher/student",
      subtitle: "Assigned students",
      hoverInfo: "Calculated from distinct students enrolled in your assigned courses or schedule rosters.",
    },
       {
      title: "Monthly Total Classes",
      value: stats?.scheduleMonthlyTotal ?? 0,
      icon: BookOpen,
      gradient: "from-indigo-600 to-blue-700",
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      border: "border-indigo-100",
      link: "/teacher/class",
      subtitle: "This month total",
      hoverInfo: "Theoretical total class sessions expected based on students' active schedules in the selected month.",
    },
    {
      title: "Monthly Class Done",
      value: stats?.statusCompleted ?? 0,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      border: "border-emerald-100",
      link: "/teacher/class",
      subtitle: "Done this month",
      hoverInfo: "Total class sessions successfully completed in the selected month.",
    },
    {
      title: "Monthly Remaining",
      value: Math.max(0, (stats?.scheduleMonthlyTotal ?? 0) - (stats?.statusCompleted ?? 0)),
      icon: Clock,
      gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      border: "border-amber-100",
      link: "/teacher/class",
      subtitle: "Left this month",
      hoverInfo: "Expected remaining class sessions for the selected month (Expected Total - Completed).",
    },
    {
      title: "Scheduled",
      value: stats?.statusScheduled ?? 0,
      icon: Calendar,
      gradient: "from-sky-500 to-cyan-600",
      bg: "bg-sky-50",
      iconColor: "text-sky-600",
      border: "border-sky-100",
      link: "/teacher/class",
      subtitle: "Waiting to start",
      hoverInfo: "Total count of upcoming class sessions with status set to 'scheduled'.",
    },
    {
      title: "In Progress",
      value: stats?.statusInProgress ?? 0,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      border: "border-amber-100",
      link: "/teacher/class",
      subtitle: "Currently running",
      trend: "up",
      hoverInfo: "Number of live class sessions that are currently running/active right now.",
    },
    {
      title: "Today Progress",
      value: `${todayDone}/${todayTotal}`,
      icon: Zap,
      gradient: "from-purple-500 to-fuchsia-600",
      bg: "bg-purple-50",
      iconColor: "text-purple-600",
      border: "border-purple-100",
      link: "/teacher/schedule",
      subtitle: "Done today",
      isProgress: true,
      progressPct,
      hoverInfo: `Formula: (${todayDone} completed / ${todayTotal} total scheduled today) × 100% = ${progressPct}%.`,
    }
 
  ];

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Welcome back, Instructor! 👋
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{today}</p>
        </div>
        
        {/* Actions & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/teacher/online-classes"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Video className="w-3.5 h-3.5" />
            Online Classes
          </Link>

          <div className="flex items-center gap-2">
            <label htmlFor="monthFilter" className="text-sm font-semibold text-gray-700">
              Stats for:
            </label>
            <select
              id="monthFilter"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value as "current" | "previous")}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 shadow-sm transition-colors hover:border-indigo-400 outline-none font-medium cursor-pointer"
            >
              <option value="current">Current Month</option>
              <option value="previous">Previous Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Class Countdown & Alert Widget */}
      <LiveClassCountdown
        schedules={todaySchedules}
        role="teacher"
        classPageHref="/teacher/class"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.link}
            className={`group relative bg-white rounded-2xl border ${card.border} p-3.5 sm:p-5 shadow-sm hover:shadow-xl hover:z-50 z-10 transition-all duration-200 overflow-visible flex flex-col gap-3 sm:gap-4`}
          >
            {/* Top accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} rounded-t-2xl`} />

            {/* Top Row: Icon + Trend/Arrow + Calculation Info Icon */}
            <div className="flex items-start justify-between pt-1">
              <div className={`p-2 sm:p-2.5 ${card.bg} rounded-xl`}>
                <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.iconColor}`} />
              </div>
              
              <div className="flex items-center gap-1.5">
                {card.trend === "up" && (
                  <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> UP
                  </span>
                )}
                {card.trend === "down" && (
                  <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
                    <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> DOWN
                  </span>
                )}

                {/* Calculation Hover Icon */}
                <div className="text-gray-300 group-hover:text-indigo-500 transition-colors p-0.5 rounded-md hover:bg-indigo-50">
                  <Info className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Hover Tooltip Popup displaying exact calculation method */}
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none absolute top-full left-0 right-0 mt-1.5 p-3 bg-slate-900/95 backdrop-blur text-white text-[11px] rounded-xl shadow-2xl z-30 border border-slate-700">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1">
                <Info className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>Calculation Logic</span>
              </div>
              <p className="text-slate-200 text-[11px] leading-tight font-normal">
                {card.hoverInfo}
              </p>
            </div>

            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                {loading
                  ? <span className="inline-block w-8 h-6 sm:w-10 sm:h-7 bg-gray-200 rounded-lg animate-pulse" />
                  : card.value
                }
              </p>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-0.5 leading-tight">{card.title}</p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 hidden sm:block">{card.subtitle}</p>
            </div>

            {/* Progress bar for Today Progress card */}
            {card.isProgress && !loading && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{card.progressPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${card.gradient} rounded-full transition-all duration-700`}
                    style={{ width: `${card.progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* ── Gems Widget ────────────────────────────────────────────────────────── */}
      {(() => {
        const totalGems   = gems?.totalGems   ?? 0;
        const monthlyGems = gems?.monthlyGems ?? 0;
        const streak      = gems?.streak      ?? 0;
        const tier        = gems?.tier        ?? { name: "starter", label: "Starter", emoji: "🌱", progressToNext: 0, next: { label: "Bronze", minGems: 100 } };
        const progressPct = tier.progressToNext ?? 0;

        const TIER_COLORS: Record<string, string> = {
          starter: "from-green-400 to-emerald-600",
          bronze:  "from-amber-500 to-orange-600",
          silver:  "from-slate-400 to-slate-600",
          gold:    "from-yellow-400 to-amber-500",
          diamond: "from-cyan-400 to-blue-600",
          elite:   "from-purple-500 to-fuchsia-600",
        };
        const tierGrad = TIER_COLORS[tier.name] || TIER_COLORS.starter;

        return (
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl overflow-hidden shadow-xl border border-indigo-800/40">
            {/* Background glows */}
            <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-indigo-600/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-purple-600/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                {/* Left: Title + Tier */}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tierGrad} flex items-center justify-center shadow-lg text-2xl flex-shrink-0`}>
                    {tier.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Gems Points</span>
                    </div>
                    <p className="text-2xl font-black text-white mt-0.5">{totalGems.toLocaleString()} <span className="text-yellow-400">💎</span></p>
                    <p className="text-xs text-indigo-300 mt-0.5">{tier.label}</p>
                  </div>
                </div>

                {/* Right: Monthly + Streak */}
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-black text-white">
                      {monthlyGems >= 0 ? "+" : ""}{monthlyGems}
                    </p>
                    <p className="text-[10px] text-indigo-400 font-semibold">This Month</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-black text-orange-400 flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4" />{streak}
                    </p>
                    <p className="text-[10px] text-indigo-400 font-semibold">Day Streak</p>
                  </div>
                  <Link href="/teacher/leaderboard"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Leaderboard
                  </Link>
                </div>
              </div>

              {/* Progress to next tier */}
              {tier.next && (
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-indigo-300 mb-1.5">
                    <span>Progress to {tier.next.emoji ?? ""} {tier.next.label}</span>
                    <span>{progressPct}%  •  {(tier.next.minGems - totalGems).toLocaleString()} gems to go</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${tierGrad} rounded-full transition-all duration-700`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons: How You Earn / How You Use Gems */}
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setEarnModalOpen(true)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:from-fuchsia-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" /> How you earn gem
                </button>
                <button
                  onClick={() => setUseModalOpen(true)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400" /> How you use gems
                </button>
              </div>

              {/* Quick rules */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Schedule class", gems: "+1", color: "text-emerald-400" },
                  { label: "Complete class", gems: "+3", color: "text-emerald-400" },
                  { label: "Student present", gems: "+2", color: "text-emerald-400" },
                  { label: "Cancel / Reset", gems: "-2 / -1", color: "text-rose-400" },
                ].map((r) => (
                  <div key={r.label} className="bg-white/5 rounded-xl px-3 py-2 text-center border border-white/5">
                    <p className={`text-sm font-black ${r.color}`}>{r.gems} 💎</p>
                    <p className="text-[10px] text-indigo-300 mt-0.5">{r.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal: How You Earn Gems */}
            {earnModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-in duration-200">
                  <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                      How You Earn Gems
                    </h3>
                    <button
                      onClick={() => setEarnModalOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {[
                      { num: "1", text: "Complete modules or class sessions on time to collect module completion gems." },
                      { num: "2", text: "Ensure students are present and active to score quiz/attendance gems." },
                      { num: "3", text: "Win catch-up challenges or meet class targets to receive challenge-based gems." },
                      { num: "4", text: "Earn extra gems from special instructor incubator programs or special manual rewards." },
                    ].map((step) => (
                      <div key={step.num} className="flex gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-indigo-500/30 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-black text-indigo-400 text-sm shrink-0 border border-slate-700">
                          {step.num}
                        </div>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed pt-0.5">{step.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={() => setEarnModalOpen(false)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow"
                    >
                      Got it!
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: How You Use Gems */}
            {useModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-in duration-200">
                  <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-400" />
                      How You Use Gems
                    </h3>
                    <button
                      onClick={() => setUseModalOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {[
                      { num: "1", text: "Spend gems to unlock rewards, certification content, and extra training resources." },
                      { num: "2", text: "Use gems for scheduling late submissions or assignment resubmissions." },
                      { num: "3", text: "Revive missed daily teaching streaks or restart special monthly catch-up challenges." },
                      { num: "4", text: "Use gems to request an exclusive meeting with the CEO." },
                      { num: "5", text: "Spend gems to submit priority support tickets or request bank account changes." },
                    ].map((step) => (
                      <div key={step.num} className="flex gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-orange-500/30 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-black text-orange-400 text-sm shrink-0 border border-slate-700">
                          {step.num}
                        </div>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed pt-0.5">{step.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={() => setUseModalOpen(false)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow"
                    >
                      Got it!
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Bottom Row — on mobile: right sidebar first, then left content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        
        {/* Right Side on mobile (order-first), Left on desktop */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6 order-2 lg:order-1">

          {/* Today Class Schedule Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-base sm:text-lg tracking-tight">
                    Today's Class Schedule
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    {todayName}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your scheduled sessions for today ({todaySchedules.length} {todaySchedules.length === 1 ? "class" : "classes"})
                </p>
              </div>
              
              <Link
                href="/teacher/schedule"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors shrink-0 self-start sm:self-auto"
              >
                <Clock className="w-3.5 h-3.5" />
                View Full Routine
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs text-gray-400 ml-2">Loading schedule...</span>
              </div>
            ) : todaySchedules.length === 0 ? (
              <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <Coffee className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-700">No Classes Scheduled Today</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  You don't have any classes scheduled for {todayName}. Enjoy your day or check your full weekly routine!
                </p>
                <Link
                  href="/teacher/schedule"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline mt-3"
                >
                  Check Weekly Routine <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedules.map((item, idx) => {
                  const startMins = parseTimeToMinutes(item.startTime);
                  const endMins = parseTimeToMinutes(item.endTime) || startMins + 60;
                  const isOngoing = currentMinutes >= startMins && currentMinutes < endMins;
                  const isCompleted = currentMinutes >= endMins;
                  const isUpcoming = currentMinutes < startMins;

                  return (
                    <div
                      key={item._id || idx}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isOngoing
                          ? "bg-rose-50/60 border-rose-200 ring-1 ring-rose-300"
                          : isCompleted
                          ? "bg-gray-50/70 border-gray-100 opacity-75"
                          : "bg-white border-gray-200 hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isOngoing
                              ? "bg-rose-600 text-white shadow-sm"
                              : isCompleted
                              ? "bg-gray-200 text-gray-500"
                              : "bg-indigo-600 text-white shadow-sm"
                          }`}
                        >
                          <Video className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isOngoing && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                Live Now
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                Completed
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Upcoming
                              </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                              {item.type || "Live"} Class
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-gray-900 truncate">
                            {item.course?.title || "Assigned Class Session"}
                          </h4>

                          {item.student && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-medium text-gray-700">{item.student.fullName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100/80 px-3 py-1.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                        </div>

                        <Link
                          href="/teacher/class"
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                            isOngoing
                              ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {isOngoing ? "Join Now" : "Details"}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
    

          
        </div>

        {/* Left Side on mobile (order-first), Right on desktop */}
        <div className="space-y-5 sm:space-y-6 order-1 lg:order-2">
          
          {/* Dynamic Next / Ongoing Session Banner */}
          <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-900 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[240px]">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full animate-pulse" />
            <div className="absolute -bottom-10 -left-6 w-48 h-48 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 text-indigo-100 px-3 py-1 rounded-full mb-4">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${ongoingSession ? "bg-rose-400" : "bg-emerald-400"}`} />
                {ongoingSession ? "Live Right Now" : nextSession ? "Live Soon" : "Today's Routine"}
              </span>

              <h3 className="text-xl font-extrabold text-white mb-3 leading-tight">
                {featuredSession?.course?.title || "No Classes Today"}
              </h3>

              {featuredSession ? (
                <div className="space-y-1.5 text-sm text-indigo-200">
                  <p className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-300" />
                    {formatTime(featuredSession.startTime)} – {formatTime(featuredSession.endTime)}
                  </p>
                  {featuredSession.student && (
                    <p className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-indigo-300" />
                      Student: {featuredSession.student.fullName}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-indigo-200">
                  You have no classes scheduled for today ({todayName}).
                </p>
              )}
            </div>

            <div className="relative z-10 mt-5">
              <Link href="/teacher/class" className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-950 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-md w-full justify-center">
                <PlayCircle className="w-4 h-4" />
                Go to Classes
              </Link>
            </div>
          </div>

          {/* Profile Completion Card */}
          {(() => {
            const { pct, checks, done, total } = calcProfileCompletion(profile);
            const color = pct === 100 ? "from-emerald-500 to-emerald-600" : pct >= 70 ? "from-indigo-500 to-violet-600" : pct >= 40 ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-600";
            const barColor = pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-indigo-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
            const textColor = pct === 100 ? "text-emerald-600" : pct >= 70 ? "text-indigo-600" : pct >= 40 ? "text-amber-600" : "text-red-500";
            const incomplete = checks.filter(c => !c.done);
            return (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                    <div className={`p-1.5 bg-gradient-to-br ${color} rounded-lg`}>
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    Profile Completion
                  </h3>
                  <p className="text-xs text-gray-400 pl-9">Complete your profile to get the best experience.</p>
                </div>

                {/* Ring + bar */}
                <div className="flex items-center gap-5">
                  {/* Circular ring */}
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                      <circle cx="40" cy="40" r="33" fill="none" stroke="#f3f4f6" strokeWidth="7" />
                      <circle cx="40" cy="40" r="33" fill="none"
                        stroke={pct === 100 ? "#10b981" : pct >= 70 ? "#6366f1" : pct >= 40 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="7"
                        strokeDasharray={`${2 * Math.PI * 33}`}
                        strokeDashoffset={`${2 * Math.PI * 33 * (1 - pct / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-lg font-black ${textColor}`}>{pct}%</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{done} of {total} fields</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    {pct === 100 ? (
                      <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Profile fully complete!
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-1.5">{incomplete.length} items remaining</p>
                    )}
                  </div>
                </div>

                {/* Incomplete items */}
                {incomplete.length > 0 && (
                  <div className="space-y-1.5">
                    {incomplete.slice(0, 4).map(c => (
                      <Link key={c.label} href={c.href} className="flex items-center gap-2 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors group">
                        <Circle className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        <span className="flex-1 truncate">{c.label}</span>
                        <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-400" />
                      </Link>
                    ))}
                    {incomplete.length > 4 && (
                      <p className="text-[11px] text-gray-400 pl-5">+{incomplete.length - 4} more to complete</p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                  <Link href="/teacher/settings" className="flex-1 py-2 text-center text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
                    Account Settings
                  </Link>
                  <Link href="/teacher/salary" className="flex-1 py-2 text-center text-xs font-semibold text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100">
                    Payment Info
                  </Link>
                </div>
              </div>
            );
          })()}

        </div>

      </div>
    </div>
  );
}
