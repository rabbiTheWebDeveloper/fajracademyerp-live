"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CalendarDays,
  Clock,
  Users,
  Search,
  Plus,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  User,
  Coffee,
  Calendar,
  ArrowUpDown,
  X,
  Video,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Activity,
  Phone,
  Mail,
  Copy,
  Check,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Timer,
  Zap,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface StudentRef {
  _id: string;
  fullName: string;
  studentId?: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

interface CourseRef {
  _id: string;
  title: string;
  courseId?: string;
  level?: string;
}

interface CategoryRef {
  _id: string;
  name: string;
  slug?: string;
}

interface ScheduleItem {
  _id: string;
  source?: "schedule" | "session";
  dayOfWeek: string;
  daysList?: string[];
  startTime: string;
  endTime: string;
  startMins?: number;
  endMins?: number;
  type?: "live" | "recorded" | "hybrid";
  status?: string;
  student?: StudentRef | null;
  course?: CourseRef | null;
  isActive?: boolean;
}

interface FreeGap {
  startMins: number;
  endMins: number;
  startTime: string;
  endTime: string;
  durationMins: number;
}

interface TeacherScheduleData {
  _id: string;
  teacherId: string;
  fullName: string;
  designation: string;
  avatar?: string;
  status: string;
  email?: string;
  phone?: string;
  gender?: string;
  category?: CategoryRef | null;
  schedules: ScheduleItem[];
  displayedSchedules: ScheduleItem[];
  dayBreakdown?: Record<string, ScheduleItem[]>;
  totalScheduledClasses: number;
  totalStudentCount: number;
  totalBusyMins: number;
  totalBusyHours: number;
  totalFreeMins: number;
  totalFreeHours: number;
  freeGaps: FreeGap[];
  workloadLevel: "light" | "moderate" | "heavy";
}

interface SummaryData {
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalBusyHours: number;
  avgClassesPerTeacher: string | number;
  busyTeachersCount: number;
  availableTeachersCount: number;
}

interface PaginationData {
  page: number;
  limit: number;
  totalTeachers: number;
  totalPages: number;
}

interface LookupsData {
  teachers: { _id: string; fullName: string; teacherId: string; avatar?: string; designation?: string }[];
  students: { _id: string; fullName: string; studentId?: string; avatar?: string; email?: string }[];
  courses: { _id: string; title: string; courseId?: string }[];
  categories: { _id: string; name: string }[];
}

const DAYS_LIST = [
  { key: "all", label: "All Days" },
  { key: "sunday", label: "Sunday" },
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
];

const TIME_PRESETS = [
  { id: "all", label: "All Times", icon: Clock, startMins: 0, endMins: 1440, desc: "00:00 – 23:59" },
  { id: "morning", label: "Morning", icon: Sunrise, startMins: 360, endMins: 720, desc: "06:00 AM – 12:00 PM" },
  { id: "afternoon", label: "Afternoon", icon: Sun, startMins: 720, endMins: 1020, desc: "12:00 PM – 05:00 PM" },
  { id: "evening", label: "Evening", icon: Sunset, startMins: 1020, endMins: 1260, desc: "05:00 PM – 09:00 PM" },
  { id: "night", label: "Night", icon: Moon, startMins: 1260, endMins: 1440, desc: "09:00 PM – 12:00 AM" },
  { id: "custom", label: "Custom Slot", icon: Timer, startMins: 480, endMins: 600, desc: "Specify Exact Hours" },
];

const POPULAR_HOURLY_SLOTS = [
  { label: "08:00 AM – 09:00 AM", start: "08:00", end: "09:00", startMins: 480, endMins: 540 },
  { label: "09:00 AM – 10:00 AM", start: "09:00", end: "10:00", startMins: 540, endMins: 600 },
  { label: "10:00 AM – 11:00 AM", start: "10:00", end: "11:00", startMins: 600, endMins: 660 },
  { label: "11:00 AM – 12:00 PM", start: "11:00", end: "12:00", startMins: 660, endMins: 720 },
  { label: "02:00 PM – 03:00 PM", start: "14:00", end: "15:00", startMins: 840, endMins: 900 },
  { label: "03:00 PM – 04:00 PM", start: "15:00", end: "16:00", startMins: 900, endMins: 960 },
  { label: "04:00 PM – 05:00 PM", start: "16:00", end: "17:00", startMins: 960, endMins: 1020 },
  { label: "05:00 PM – 06:00 PM", start: "17:00", end: "18:00", startMins: 1020, endMins: 1080 },
  { label: "06:00 PM – 07:00 PM", start: "18:00", end: "19:00", startMins: 1080, endMins: 1140 },
  { label: "07:00 PM – 08:00 PM", start: "19:00", end: "20:00", startMins: 1140, endMins: 1200 },
  { label: "08:00 PM – 09:00 PM", start: "20:00", end: "21:00", startMins: 1200, endMins: 1260 },
  { label: "09:00 PM – 10:00 PM", start: "21:00", end: "22:00", startMins: 1260, endMins: 1320 },
];

function getInitials(name: string) {
  if (!name) return "TR";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── O(1) cached time parsers — module-level Maps persist across renders ─────
const _parseCache = new Map<string, number>();
function parseTimeToMins(timeStr: string): number {
  if (!timeStr) return 0;
  const cached = _parseCache.get(timeStr);
  if (cached !== undefined) return cached;
  const str = String(timeStr).trim().toUpperCase();
  const isPM = str.includes("PM");
  const isAM = str.includes("AM");
  const clean = str.replace(/(AM|PM)/g, "").trim();
  const parts = clean.split(":");
  let h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  const result = h * 60 + m;
  _parseCache.set(timeStr, result);
  return result;
}

const _fmtCache = new Map<string, string>();
function fmt12(time: string) {
  if (!time) return "TBD";
  const cached = _fmtCache.get(time);
  if (cached) return cached;
  const str = time.trim().toUpperCase();
  if (str.includes("AM") || str.includes("PM")) { _fmtCache.set(time, str); return str; }
  const parts = str.split(":");
  let h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  const result = `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  _fmtCache.set(time, result);
  return result;
}

// ── Hoisted config maps — created once, never recreated ─────────────────────
const WL_CONFIG: Record<string, { bg: string; dot: string; label: string; Icon: any }> = {
  heavy: { bg: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Heavy Load", Icon: null },
  moderate: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Moderate", Icon: null },
  light: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Available", Icon: null },
};
const TYPE_CONFIG: Record<string, { bg: string; label: string }> = {
  recorded: { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Recorded" },
  hybrid: { bg: "bg-cyan-50 text-cyan-700 border-cyan-200", label: "Hybrid" },
  live: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Live Online" },
};

export default function AdminTeacherSchedulePage() {
  const [teachers, setTeachers] = useState<TeacherScheduleData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 10, totalTeachers: 0, totalPages: 1 });
  const [lookups, setLookups] = useState<LookupsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("name"); // Default A-Z
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Record<string, boolean>>({});
  const [teacherDayTabs, setTeacherDayTabs] = useState<Record<string, string>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // ── Time-Wise Slot Filter States ──────────────────────────────────────────
  const [timePreset, setTimePreset] = useState<string>("all");
  const [customStartTime, setCustomStartTime] = useState<string>("09:00");
  const [customEndTime, setCustomEndTime] = useState<string>("10:00");
  const [slotAvailabilityMode, setSlotAvailabilityMode] = useState<"all" | "free_only" | "busy_only">("all");
  const [showAdvancedTimeSlots, setShowAdvancedTimeSlots] = useState(false);

  // Add Modal Form States
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formStudentId, setFormStudentId] = useState("");
  const [formCourseId, setFormCourseId] = useState("");
  const [formDayOfWeek, setFormDayOfWeek] = useState("monday");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formType, setFormType] = useState<"live" | "recorded" | "hybrid">("live");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const handleCopy = useCallback((text?: string, label = "Item") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast(`${label} copied to clipboard!`, "success");
    setTimeout(() => setCopiedText(null), 2000);
  }, [showToast]);

  useEffect(() => { setPage(1); }, [selectedDay, sortOption, selectedCategory, limit]);

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPage(1), 350);
  }, []);

  // ── lookupsLoaded ref avoids including mutable `lookups` in the dep array ──
  const lookupsLoadedRef = useRef(false);
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // Only request lookups on first load or explicit refresh — never on paginate
      const needLookups = !lookupsLoadedRef.current || isRefresh;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        day: selectedDay,
        sort: sortOption,
        search: searchQuery,
        category: selectedCategory,
        includeLookups: needLookups ? "true" : "false",
      });
      const res = await fetch(`/api/admin/teachers/schedule?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setTeachers(data.teachers || []);
        setSummary(data.summary || null);
        if (data.pagination) setPagination(data.pagination);
        if (data.lookups) { setLookups(data.lookups); lookupsLoadedRef.current = true; }
        if (data.teachers?.length > 0) setExpandedTeacherIds({});
      } else {
        showToast(data.message || "Failed to fetch schedules", "error");
      }
    } catch {
      showToast("Network error fetching schedules", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // NOTE: `lookups` intentionally excluded — use lookupsLoadedRef instead
  }, [page, limit, selectedDay, sortOption, searchQuery, selectedCategory, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Calculate Active Time Slot Range (mins from midnight) ───────────────────
  const activeTimeRange = useMemo(() => {
    if (timePreset === "all") return { startMins: 0, endMins: 1440, label: "All Day" };
    if (timePreset === "custom") {
      const s = parseTimeToMins(customStartTime);
      let e = parseTimeToMins(customEndTime);
      if (e <= s) e = s + 60;
      return { startMins: s, endMins: e, label: `${fmt12(customStartTime)} – ${fmt12(customEndTime)}` };
    }
    const preset = TIME_PRESETS.find((p) => p.id === timePreset);
    return {
      startMins: preset?.startMins ?? 0,
      endMins: preset?.endMins ?? 1440,
      label: preset?.desc ?? "All Day",
    };
  }, [timePreset, customStartTime, customEndTime]);

  // ── Filtered Teachers based on Time Slot & Availability Mode ────────────────
  // O(N·K) where N=page teachers (≤20), K=slots per teacher (≤10) → ~200 ops max
  const filteredTeachers = useMemo(() => {
    if (timePreset === "all" && slotAvailabilityMode === "all") return teachers;

    const { startMins: rangeStart, endMins: rangeEnd } = activeTimeRange;

    return teachers.filter((teacher) => {
      // freeGaps already have startMins/endMins — no string parsing needed
      const hasFreeSlot = slotAvailabilityMode !== "busy_only" && teacher.freeGaps.some(
        (gap) => Math.min(gap.endMins, rangeEnd) - Math.max(gap.startMins, rangeStart) >= 15
      );
      if (slotAvailabilityMode === "free_only") return hasFreeSlot;

      // displayedSchedules have startMins/endMins pre-populated from the API
      const hasActiveSchedule = teacher.displayedSchedules.some((sc) => {
        // Use pre-computed mins first (O(1)), fall back to cached parse (O(1) after first call)
        const scStart = sc.startMins !== undefined ? sc.startMins : parseTimeToMins(sc.startTime);
        const scEnd = sc.endMins !== undefined ? sc.endMins : parseTimeToMins(sc.endTime);
        return Math.min(scEnd, rangeEnd) - Math.max(scStart, rangeStart) > 0;
      });
      if (slotAvailabilityMode === "busy_only") return hasActiveSchedule;

      return hasFreeSlot || hasActiveSchedule;
    });
  }, [teachers, activeTimeRange, timePreset, slotAvailabilityMode]);

  const toggleTeacherExpand = useCallback((id: string) =>
    setExpandedTeacherIds((prev) => ({ ...prev, [id]: !prev[id] })), []);
  const expandAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    // Use functional update so filteredTeachers ref doesn't need to be in dep array
    setExpandedTeacherIds((prev) => {
      filteredTeachers.forEach((t) => (all[t._id] = true));
      return all;
    });
  }, [filteredTeachers]);
  const collapseAll = useCallback(() => setExpandedTeacherIds({}), []);

  const handleDaySelect = (dayKey: string) => {
    setSelectedDay(dayKey);
    setTeacherDayTabs({});
    setPage(1);
  };



  const handleSelectQuickSlot = (slot: typeof POPULAR_HOURLY_SLOTS[0]) => {
    setTimePreset("custom");
    setCustomStartTime(slot.start);
    setCustomEndTime(slot.end);
    showToast(`Filtered by slot: ${slot.label}`, "success");
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacherId || !formCourseId) { showToast("Please select Teacher and Course.", "error"); return; }
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/admin/teachers/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: formTeacherId, studentId: formStudentId || null, courseId: formCourseId, dayOfWeek: formDayOfWeek, startTime: formStartTime, endTime: formEndTime, type: formType }),
      });
      const data = await res.json();
      if (data.success) { showToast("Schedule created successfully!"); setIsAddModalOpen(false); fetchData(true); }
      else showToast(data.message || "Could not create schedule", "error");
    } catch { showToast("Error creating schedule", "error"); }
    finally { setFormSubmitting(false); }
  };

  // O(N) linear max scan — avoids O(N log N) sort+clone
  const topBusyTeacher = useMemo(() => {
    if (!teachers.length) return null;
    let best = teachers[0];
    for (let i = 1; i < teachers.length; i++) {
      if (teachers[i].totalScheduledClasses > best.totalScheduledClasses) best = teachers[i];
    }
    return best;
  }, [teachers]);

  const mostAvailableTeacher = useMemo(() => {
    if (!teachers.length) return null;
    let best = teachers[0];
    for (let i = 1; i < teachers.length; i++) {
      if (teachers[i].totalFreeMins > best.totalFreeMins) best = teachers[i];
    }
    return best;
  }, [teachers]);

  // Inline O(1) lookup using hoisted module-level maps (no per-render recreation)
  const wlConfig = useCallback((level: string) => ({
    ...(WL_CONFIG[level] ?? WL_CONFIG.light),
    Icon: level === "heavy" ? Flame : level === "moderate" ? Activity : CheckCircle2,
  }), []);

  const typeConfig = useCallback((type?: string) =>
    TYPE_CONFIG[type ?? "live"] ?? TYPE_CONFIG.live, []);

  // Stable today values — computed once per mount, never changes within a session
  const todayKey = useMemo(() => {
    const daysKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return daysKeys[new Date().getDay()];
  }, []);

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 ${toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          {toast.text}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-900">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Schedule & Free Time Slot Filter
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Teacher Schedule & Slot Planner
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Filter teachers by specific time slots, morning/evening shifts, and locate available free windows.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>

        </div>
      </div>

      {/* Top 5 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Total Teachers */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Teachers</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xl font-extrabold mt-1">{pagination.totalTeachers ?? teachers.length}</p>
          <p className="text-[10px] text-white/80 mt-0.5">{summary?.availableTeachersCount ?? 0} light workload</p>
        </div>

        {/* 2. Total Students */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-800 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Students</span>
            <GraduationCap className="w-4 h-4" />
          </div>
          <p className="text-xl font-extrabold mt-1">{summary?.totalStudents ?? lookups?.students.length ?? 0}</p>
          <p className="text-[10px] text-white/80 mt-0.5">Enrolled with staff</p>
        </div>

        {/* 3. Scheduled Classes */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-700 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Scheduled Classes</span>
            <CalendarDays className="w-4 h-4" />
          </div>
          <p className="text-xl font-extrabold mt-1">{summary?.totalClasses ?? 0}</p>
          <p className="text-[10px] text-white/80 mt-0.5">Avg {summary?.avgClassesPerTeacher ?? 0} / teacher</p>
        </div>

        {/* 4. Busiest Teacher */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-700 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Top Scheduled</span>
            <Flame className="w-4 h-4" />
          </div>
          <p className="text-sm font-extrabold mt-1 truncate">{topBusyTeacher?.fullName ?? "—"}</p>
          <p className="text-[10px] text-white/80 mt-0.5 truncate">
            {topBusyTeacher ? `${topBusyTeacher.totalScheduledClasses} cls · ${topBusyTeacher.totalBusyHours}h busy` : "No data"}
          </p>
        </div>

        {/* 5. Most Available */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-3.5 text-white shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Most Free Hours</span>
            <Coffee className="w-4 h-4" />
          </div>
          <p className="text-sm font-extrabold mt-1 truncate">{mostAvailableTeacher?.fullName ?? "—"}</p>
          <p className="text-[10px] text-white/80 mt-0.5 truncate">
            {mostAvailableTeacher ? `${mostAvailableTeacher.totalFreeHours}h free · ${mostAvailableTeacher.freeGaps.length} slots` : "No data"}
          </p>
        </div>
      </div>

      {/* ── TIME-WISE SLOT FILTER BAR (HIGHLIGHTED) ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-sm p-4 sm:p-5 space-y-3.5">
        {/* Header & Shift Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Time-Wise Slot Filter
              </span>
              <p className="text-[11px] text-gray-400">Filter teachers by morning, afternoon, evening shifts, or custom slot</p>
            </div>
          </div>

          {/* Availability Mode Selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSlotAvailabilityMode("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${slotAvailabilityMode === "all"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              All Teachers
            </button>
            <button
              onClick={() => setSlotAvailabilityMode("free_only")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${slotAvailabilityMode === "free_only"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-700 hover:bg-emerald-50"
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Only Free Slots
            </button>
            <button
              onClick={() => setSlotAvailabilityMode("busy_only")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${slotAvailabilityMode === "busy_only"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-700 hover:bg-blue-50"
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              Only Booked Classes
            </button>
          </div>
        </div>

        {/* Time Shift Presets Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {TIME_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = timePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setTimePreset(preset.id)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${active
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                    : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{preset.label}</span>
                <span className={`text-[10px] font-normal px-1 rounded ${active ? "bg-white/20 text-white" : "text-gray-400"}`}>
                  {preset.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Slot Selector (When "custom" is selected or user opens detailed slots) */}
        {timePreset === "custom" && (
          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900 flex flex-wrap items-center gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Start Time:</span>
              <input
                type="time"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-blue-200 text-xs font-bold text-gray-800 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300">End Time:</span>
              <input
                type="time"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-blue-200 text-xs font-bold text-gray-800 bg-white"
              />
            </div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Active window: <strong>{fmt12(customStartTime)} – {fmt12(customEndTime)}</strong>
            </span>
          </div>
        )}

        {/* Popular 1-Click Hourly Time Slot Pills */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Quick 1-Hour Time Slots
            </span>
            <button
              type="button"
              onClick={() => setShowAdvancedTimeSlots(!showAdvancedTimeSlots)}
              className="text-[11px] font-bold text-blue-600 hover:underline"
            >
              {showAdvancedTimeSlots ? "Hide Slot List" : "Show All Hourly Slots"}
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(showAdvancedTimeSlots ? POPULAR_HOURLY_SLOTS : POPULAR_HOURLY_SLOTS.slice(0, 6)).map((slot) => {
              const isSelected =
                timePreset === "custom" && customStartTime === slot.start && customEndTime === slot.end;
              return (
                <button
                  key={slot.label}
                  onClick={() => handleSelectQuickSlot(slot)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Result Status Bar */}
        {(timePreset !== "all" || slotAvailabilityMode !== "all") && (
          <div className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
            <span>
              🎯 Showing <strong>{filteredTeachers.length}</strong> teachers matching slot:{" "}
              <strong>{activeTimeRange.label}</strong>
              {slotAvailabilityMode === "free_only" && " (Only Free Gaps)"}
              {slotAvailabilityMode === "busy_only" && " (Only Active Classes)"}
            </span>
            <button
              onClick={() => {
                setTimePreset("all");
                setSlotAvailabilityMode("all");
              }}
              className="font-bold text-rose-600 hover:underline text-[11px]"
            >
              Reset Slot Filter
            </button>
          </div>
        )}
      </div>

      {/* ── Filter & Day Selector Panel ────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 space-y-3.5">
        {/* Day Tabs */}
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Select Day
              </label>

              {/* Jump to Today Button */}
              <button
                type="button"
                onClick={() => handleDaySelect(todayKey)}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 border shadow-sm ${selectedDay === todayKey
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200"
                  }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Jump to Today ({todayKey.charAt(0).toUpperCase() + todayKey.slice(1)})
              </button>
            </div>

            <span className="text-xs text-gray-400 font-medium">
              Day: <strong className="text-gray-700 dark:text-gray-200 capitalize font-bold">{selectedDay === "all" ? "All Week Days" : selectedDay}</strong>
            </span>
          </div>

          <div
            role="tablist"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {DAYS_LIST.map((day) => {
              const active = selectedDay === day.key;
              const isToday = day.key === todayKey;

              return (
                <button
                  key={day.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleDaySelect(day.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm ${active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : isToday
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                        : "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
                    }`}
                >
                  <span>{day.label}</span>
                  {isToday && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${active ? "bg-white/20 text-white" : "bg-emerald-600 text-white"
                        }`}
                    >
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Sort, Category Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search teacher by name, ID, phone..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <ArrowUpDown className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full pl-10 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="name">🔤 Teacher Name (A → Z)</option>
              <option value="name_desc">🔤 Teacher Name (Z → A)</option>
              <option value="highest_schedule">🔥 Highest Scheduled Classes</option>
              <option value="lowest_schedule">🌱 Lowest Scheduled Classes</option>
              <option value="free_time">⏰ Most Free Hours</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {lookups?.categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="flex-1 py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ChevronDown className="w-3.5 h-3.5" /> Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex-1 py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ChevronUp className="w-3.5 h-3.5" /> Collapse
            </button>
          </div>
        </div>
      </div>

      {/* ── Teacher List ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Loading Teacher Schedules & Slot Availability...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No Matching Teachers Found</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              No teachers found for slot <strong>{activeTimeRange.label}</strong> with current filters. Try resetting the time preset or day.
            </p>
          </div>
          <button
            onClick={() => {
              setTimePreset("all");
              setSlotAvailabilityMode("all");
              setSelectedDay("all");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
          >
            Clear All Slot Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTeachers.map((teacher, index) => {
            const isExpanded = !!expandedTeacherIds[teacher._id];
            const itemRank = (page - 1) * limit + index + 1;
            const wl = wlConfig(teacher.workloadLevel);
            const WlIcon = wl.Icon;

            // Check if teacher has matching slots
            const hasMatchingFreeGap =
              timePreset !== "all" &&
              teacher.freeGaps.some((gap) => {
                const overlap =
                  Math.min(gap.endMins, activeTimeRange.endMins) -
                  Math.max(gap.startMins, activeTimeRange.startMins);
                return overlap >= 15;
              });

            return (
              <div
                key={teacher._id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden hover:border-blue-100 hover:shadow-md transition-all duration-200"
              >
                {/* Card Header */}
                <div
                  onClick={() => toggleTeacherExpand(teacher._id)}
                  role="button"
                  aria-expanded={isExpanded}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleTeacherExpand(teacher._id)}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors select-none"
                >
                  {/* Left: Avatar + Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 font-extrabold text-xs flex items-center justify-center">
                      #{itemRank}
                    </div>

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {teacher.avatar ? (
                        <img
                          src={teacher.avatar}
                          alt={teacher.fullName}
                          className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm">
                          {getInitials(teacher.fullName)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${teacher.status === "active" ? "bg-emerald-400" : "bg-gray-300"
                          }`}
                      />
                    </div>

                    {/* Name + IDs */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                          {teacher.fullName}
                        </h2>
                        {teacher.teacherId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(teacher.teacherId, "Teacher ID");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md transition-colors"
                            title="Copy Teacher ID"
                          >
                            <span>{teacher.teacherId}</span>
                            {copiedText === teacher.teacherId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                        )}
                        {teacher.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                            {teacher.category.name}
                          </span>
                        )}
                        {hasMatchingFreeGap && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Slot Match
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap font-medium">
                        <span>{teacher.designation || "Faculty Teacher"}</span>
                        {teacher.phone && (
                          <div className="inline-flex items-center rounded-md border border-emerald-200/60 bg-emerald-50 text-emerald-700 text-[11px] font-semibold overflow-hidden">
                            <a
                              href={`tel:${teacher.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 hover:bg-emerald-100 transition-colors"
                              title="Call teacher"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{teacher.phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(teacher.phone, "Phone number");
                              }}
                              className="px-1.5 py-0.5 hover:bg-emerald-200/60 border-l border-emerald-200/60 text-emerald-700 transition-colors"
                              title="Copy phone number"
                            >
                              {copiedText === teacher.phone ? (
                                <Check className="w-3 h-3 text-emerald-700" />
                              ) : (
                                <Copy className="w-3 h-3 text-emerald-600" />
                              )}
                            </button>
                          </div>
                        )}
                        {teacher.email && (
                          <a
                            href={`mailto:${teacher.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hidden md:inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{teacher.email}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Workload Status */}
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${wl.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${wl.dot}`} />
                      <WlIcon className="w-3.5 h-3.5" />
                      {wl.label}
                    </span>

                    {/* Stats Chips */}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {teacher.totalStudentCount} Students
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {selectedDay === "all"
                        ? `${teacher.totalScheduledClasses} Classes Total`
                        : `${teacher.displayedSchedules.length} ${teacher.displayedSchedules.length === 1 ? "Class" : "Classes"}`}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {teacher.totalFreeHours}h Free
                    </span>

                    {/* Expand Toggle */}
                    <button
                      type="button"
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors ml-1 flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (() => {
                  const currentTeacherDay = teacherDayTabs[teacher._id] || (selectedDay !== "all" ? selectedDay : todayKey);
                  const activeScheduleList =
                    currentTeacherDay === "all"
                      ? (teacher.schedules?.length > 0 ? teacher.schedules : teacher.displayedSchedules)
                      : (teacher.dayBreakdown?.[currentTeacherDay] || teacher.displayedSchedules.filter((s) => s.dayOfWeek === currentTeacherDay || s.daysList?.includes(currentTeacherDay)));

                  // Compute timeline items for the current active day (if all is selected, use today)
                  const timelineDayKey = currentTeacherDay === "all" ? todayKey : currentTeacherDay;
                  const timelineSchedules = teacher.dayBreakdown?.[timelineDayKey] || teacher.displayedSchedules.filter((s) => s.dayOfWeek === timelineDayKey || s.daysList?.includes(timelineDayKey));

                  return (
                    <div className="border-t border-gray-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-4 sm:p-5 space-y-4">
                      {/* Teacher Internal Day Tabs Filter */}
                      <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0" style={{ scrollbarWidth: "none" }}>
                          {DAYS_LIST.map((day) => {
                            const isSelected = currentTeacherDay === day.key;
                            const dayCount =
                              day.key === "all"
                                ? teacher.totalScheduledClasses
                                : (teacher.dayBreakdown?.[day.key]?.length || 0);

                            return (
                              <button
                                key={day.key}
                                type="button"
                                onClick={() =>
                                  setTeacherDayTabs((prev) => ({ ...prev, [teacher._id]: day.key }))
                                }
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${isSelected
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                                  }`}
                              >
                                <span>{day.label}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isSelected
                                      ? "bg-white/25 text-white"
                                      : dayCount > 0
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                        : "bg-gray-200 dark:bg-slate-700 text-gray-500"
                                    }`}
                                >
                                  {dayCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>


                      </div>

                      {/* Visual Daily Schedule Timeline (08:00 AM – 10:00 PM) */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Timeline &nbsp;
                            <span className="font-semibold text-blue-600 capitalize">({timelineDayKey})</span>
                            <span className="font-semibold text-gray-400 font-mono text-[11px]">(08:00 AM – 10:00 PM)</span>
                          </span>
                          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block" /> Booked Class ({timelineSchedules.length})
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-emerald-200 dark:bg-emerald-800 inline-block" /> Free Window
                            </span>
                          </div>
                        </div>

                        {/* Bar */}
                        <div className="relative h-6 w-full rounded-xl overflow-hidden bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                          {timelineSchedules.map((sc, i) => {
                            const startM = sc.startMins || parseTimeToMins(sc.startTime) || 480;
                            const endM = sc.endMins || parseTimeToMins(sc.endTime) || 540;
                            const span = 1320 - 480;
                            const leftPct = Math.max(0, Math.min(100, ((startM - 480) / span) * 100));
                            const widthPct = Math.max(1.5, Math.min(100 - leftPct, ((endM - startM) / span) * 100));
                            return (
                              <div
                                key={sc._id || i}
                                title={`${fmt12(sc.startTime)} – ${fmt12(sc.endTime)} · ${sc.course?.title || "Class"}`}
                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                className="absolute top-0 bottom-0 bg-blue-600 hover:bg-blue-700 transition-colors rounded-sm cursor-pointer border-x border-blue-700/60"
                              />
                            );
                          })}
                          {timelineSchedules.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-400">
                              No scheduled classes on {timelineDayKey}
                            </div>
                          )}
                        </div>

                        {/* Time axis */}
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono font-semibold mt-1.5 px-0.5">
                          <span>08:00 AM</span>
                          <span>11:00 AM</span>
                          <span>02:00 PM</span>
                          <span>05:00 PM</span>
                          <span>08:00 PM</span>
                          <span>10:00 PM</span>
                        </div>
                      </div>

                      {/* Free Time Slots Section */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-sm">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-3">
                          <Coffee className="w-3.5 h-3.5 text-emerald-600" />
                          Available Free Time Windows ({teacher.freeGaps.length} Slots)
                        </span>
                        {teacher.freeGaps.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            Fully booked for this day filter. No free slot gaps remaining.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {teacher.freeGaps.map((gap, idx) => {
                              const isSlotMatch =
                                timePreset !== "all" &&
                                Math.min(gap.endMins, activeTimeRange.endMins) -
                                Math.max(gap.startMins, activeTimeRange.startMins) >=
                                15;

                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${isSlotMatch
                                      ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-900 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/20"
                                      : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                                    }`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                  {gap.startTime} – {gap.endTime}
                                  <span className="text-emerald-700 bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                    {(gap.durationMins / 60).toFixed(1)}h free
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Scheduled Classes Grid for Selected Day */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                            Class Schedule ({activeScheduleList.length})
                            <span className="text-blue-600 font-semibold ml-1">
                              · {currentTeacherDay === "all" ? "All Weekly Classes" : currentTeacherDay.toUpperCase()}
                            </span>
                          </h3>
                        </div>

                        {activeScheduleList.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900">
                            <p className="text-xs font-semibold text-gray-400">
                              No classes scheduled on {currentTeacherDay === "all" ? "this week" : currentTeacherDay}.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {activeScheduleList
                              .slice()
                              .sort((a, b) => (a.startMins || 0) - (b.startMins || 0))
                              .map((item, idx) => {
                                const tc = typeConfig(item.type);
                                const itemDays = item.daysList && item.daysList.length > 0 ? item.daysList : [item.dayOfWeek];

                                return (
                                  <div
                                    key={item._id || idx}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-3.5 hover:border-blue-200 shadow-sm space-y-2.5 transition-all"
                                  >
                                    {/* Time & Day */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {fmt12(item.startTime)} – {fmt12(item.endTime)}
                                      </span>
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {itemDays.map((d) => (
                                          <span
                                            key={d}
                                            className="text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md"
                                          >
                                            {d.slice(0, 3)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Course */}
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">
                                      {item.course?.title || "Standard Course"}
                                    </h4>

                                    {/* Student & Session Type */}
                                    <div className="space-y-1.5 pt-1 border-t border-gray-50 dark:border-slate-800/60">
                                      <div className="flex items-center justify-between gap-1.5 text-xs">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                          <span className="truncate font-semibold text-gray-700 dark:text-gray-300">
                                            {item.student?.fullName || "Unassigned / Group"}
                                          </span>
                                        </div>
                                        {item.student?.phone && (
                                          <a
                                            href={`tel:${item.student.phone}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold hover:underline"
                                          >
                                            <Phone className="w-2.5 h-2.5 text-emerald-600" />
                                            {item.student.phone}
                                          </a>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tc.bg}`}>
                                          <Video className="w-2.5 h-2.5" />
                                          {tc.label}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Pagination Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>
                Showing <strong className="text-gray-800 dark:text-gray-200">{filteredTeachers.length > 0 ? (page - 1) * limit + 1 : 0}</strong>
                {" – "}
                <strong className="text-gray-800 dark:text-gray-200">{Math.min(page * limit, pagination.totalTeachers)}</strong>
                {" of "}
                <strong className="text-gray-800 dark:text-gray-200">{pagination.totalTeachers}</strong> teachers
              </span>
              <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-slate-700 pl-3">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold px-2 py-1 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-800 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 text-xs font-bold text-gray-700 dark:text-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <div className="px-3.5 py-1.5 text-xs font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900">
                {page} / {pagination.totalPages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 text-xs font-bold text-gray-700 dark:text-gray-200 disabled:opacity-40 transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
