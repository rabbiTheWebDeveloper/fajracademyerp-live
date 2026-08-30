"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Loader2,
  Plus,
  RefreshCw,
  BarChart2,
  Users,
  ListOrdered,
  Timer,
  CheckCheck,
  Clock,
  Play,
} from "lucide-react";

import {
  Tab,
  ViewMode,
  Toast,
  ClassSession,
  Student,
  Course,
  TodayScheduleItem,
  TodaySessionStatus,
  normalizeTime,
  Avatar,
  ClassCard,
  DeleteModal,
  EndClassModal,
  ToastContainer,
  KpiStrip,
  ClassKpiStats,
  StudentsView,
  NewClassModal,
  getBdCurrentMonth,
  getBdDayKey,
  getBdTodayIso,
  getBdTodayFormatted,
  getBdClientTime,
  isBdToday,
} from "./_component";

// ─── Constants ─────────────────────────────────────────────────────────────────
let toastCounter = 0;
const LIMIT = 10;
const DAYS  = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const initMonth = () => getBdCurrentMonth();

// ─── ClassForm shape ───────────────────────────────────────────────────────────
interface ClassForm {
  studentId: string;
  courseId:  string;
  dayOfWeek: string;
  startTime: string;
  duration:  string;
  notes:     string;
  meetLink:  string;
  topic:     string;
}

const BLANK_FORM: ClassForm = {
  studentId: "", courseId: "", dayOfWeek: "monday",
  startTime: "10:00", duration: "45", notes: "", meetLink: "", topic: "",
};

// ─── Per-tab state ─────────────────────────────────────────────────────────────
interface TabState {
  items:      ClassSession[];
  total:      number;
  totalPages: number;
  page:       number;
  loading:    boolean;
  fetched:    boolean;
}
const INIT_TAB: TabState = {
  items: [], total: 0, totalPages: 1, page: 1, loading: false, fetched: false,
};

// ─── Data state (server data) ──────────────────────────────────────────────────
interface DataState {
  students:       Student[];
  courses:        Course[];
  studentsLoading: boolean;
  kpiStats:       ClassKpiStats | null;
  statsLoading:   boolean;
  tabs:           Record<Tab, TabState>;
  todayClasses:   ClassSession[];  // today's classes for the status panel
  todayLoading:   boolean;
}

// ─── UI state (interaction) ────────────────────────────────────────────────────
interface UiState {
  tab:               Tab;
  scheduledFilter:   "today" | "all";
  viewMode:          ViewMode;
  search:            string;
  filterMonth:       string;
  showForm:          boolean;
  form:              ClassForm;
  submitting:        boolean;
  msg:               { text: string; type: string };
  studentHasSchedule: boolean;
  toasts:            Toast[];
  acting:            string | null;
  deleteTarget:      ClassSession | null;
  deleting:          boolean;
  endTarget:         ClassSession | null;
}

// ─── PaginationBar ─────────────────────────────────────────────────────────────
interface PaginationBarProps {
  page:       number;
  totalPages: number;
  total:      number;
  label:      string;
  disabled?:  boolean;
  onPrev:     () => void;
  onNext:     () => void;
}
function PaginationBar({ page, totalPages, total, label, disabled, onPrev, onNext }: PaginationBarProps) {
  if (totalPages <= 1) return null;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to   = Math.min(page * LIMIT, total);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-3 px-1">
      <span className="text-xs text-gray-500 font-medium">
        Showing{" "}
        <strong className="text-gray-800">{from}</strong> to{" "}
        <strong className="text-gray-800">{to}</strong> of{" "}
        <strong className="text-gray-800">{total}</strong> {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page === 1 || disabled}
          onClick={onPrev}
          className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 disabled:opacity-40 hover:bg-gray-50 transition-all cursor-pointer"
        >
          Previous
        </button>
        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200/60">
          {page} / {totalPages}
        </span>
        <button
          disabled={page === totalPages || disabled}
          onClick={onNext}
          className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 disabled:opacity-40 hover:bg-gray-50 transition-all cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function TeacherClassPage() {

  // ── State: server data ──────────────────────────────────────────────────────
  const [data, setData] = useState<DataState>({
    students:        [],
    courses:         [],
    studentsLoading: true,
    kpiStats:        null,
    statsLoading:    true,
    tabs: {
      scheduled:    { ...INIT_TAB },
      "in-progress":{ ...INIT_TAB },
      completed:    { ...INIT_TAB },
    },
    todayClasses: [],
    todayLoading: true,
  });

  const patchData = useCallback((patch: Partial<DataState>) =>
    setData((p) => ({ ...p, ...patch })), []);

  const patchTab = useCallback((key: Tab, patch: Partial<TabState>) =>
    setData((p) => ({
      ...p,
      tabs: { ...p.tabs, [key]: { ...p.tabs[key], ...patch } },
    })), []);

  const resetAllTabs = useCallback(() =>
    setData((p) => ({
      ...p,
      tabs: {
        scheduled:    { ...INIT_TAB },
        "in-progress":{ ...INIT_TAB },
        completed:    { ...INIT_TAB },
      },
    })), []);

  // ── State: UI interaction ───────────────────────────────────────────────────
  const [ui, setUi] = useState<UiState>({
    tab:               "scheduled",
    scheduledFilter:   "today",
    viewMode:          "classes",
    search:            "",
    filterMonth:       initMonth(),
    showForm:          false,
    form:              BLANK_FORM,
    submitting:        false,
    msg:               { text: "", type: "" },
    studentHasSchedule: false,
    toasts:            [],
    acting:            null,
    deleteTarget:      null,
    deleting:          false,
    endTarget:         null,
  });

  const patchUi = useCallback((patch: Partial<UiState>) =>
    setUi((p) => ({ ...p, ...patch })), []);

  // Destructure for clean usage
  const { students, courses, kpiStats, statsLoading, tabs, todayClasses, todayLoading, studentsLoading } = data;
  const {
    tab, scheduledFilter, viewMode, search, filterMonth,
    showForm, form, submitting, msg, studentHasSchedule,
    toasts, acting, deleteTarget, deleting, endTarget,
  } = ui;

  // ── Stable derived values in Bangladesh Time (Asia/Dhaka) ───────────────────
  const todayDayKey    = useMemo(() => getBdDayKey(), []);
  const todayIso       = useMemo(() => getBdTodayIso(), []);
  const todayFormatted = useMemo(() => getBdTodayFormatted(), []);

  // ── Toast helpers ───────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast["type"], gems?: number) => {
    const id = String(++toastCounter);
    setUi((p) => ({ ...p, toasts: [...p.toasts, { id, message, type, gems }] }));
    setTimeout(() => setUi((p) => ({ ...p, toasts: p.toasts.filter((t) => t.id !== id) })), 5000);
  }, []);

  const removeToast = useCallback((id: string) =>
    setUi((p) => ({ ...p, toasts: p.toasts.filter((t) => t.id !== id) })), []);

  // ── API: fetch KPI stats ────────────────────────────────────────────────────
  const fetchKpiStats = useCallback(async (month: string) => {
    patchData({ statsLoading: true });
    try {
      const url = month
        ? `/api/teacher-portal/class/stats?month=${month}`
        : "/api/teacher-portal/class/stats";
      const res  = await fetch(url);
      const json = await res.json();
      if (json.success && json.stats) patchData({ kpiStats: json.stats });
    } catch { /* silent */ }
    finally { patchData({ statsLoading: false }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API: fetch students + courses (once on mount) ────────────────────────────
  const fetchStudents = useCallback(async () => {
    patchData({ studentsLoading: true });
    try {
      const [sr, csr] = await Promise.all([
        fetch("/api/teacher-portal/students?all=true"),
        fetch("/api/teacher-portal/courses"),
      ]);
      const [sd, csd] = await Promise.all([sr.json(), csr.json()]);
      patchData({
        students: sd.success  ? (sd.allStudents || sd.students || []) : [],
        courses:  csd.success ? (csd.courses    || [])                : [],
        studentsLoading: false,
      });
    } catch { patchData({ studentsLoading: false }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API: fetch today's classes (for the today panel) ────────────────────────
  // Uses ?date=YYYY-MM-DD filter so only today's sessions are returned
  const fetchTodayClasses = useCallback(async () => {
    patchData({ todayLoading: true });
    try {
      const res  = await fetch(`/api/teacher-portal/class?all=true&date=${todayIso}`);
      const json = await res.json();
      if (json.success) {
        patchData({ todayClasses: json.classes || [], todayLoading: false });
      } else {
        patchData({ todayLoading: false });
      }
    } catch { patchData({ todayLoading: false }); }
  }, [todayIso]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API: fetch a specific tab's paginated data ───────────────────────────────
  const fetchTab = useCallback(async (
    tabKey:      Tab,
    page:        number,
    month:       string,
    schedFilter: "today" | "all",
    dayKey:      string,
  ) => {
    patchTab(tabKey, { loading: true });
    try {
      const p = new URLSearchParams({ status: tabKey });
      if (month) p.set("month", month);

      if (tabKey === "scheduled" && schedFilter === "today") {
        // Today's scheduled: small set — use dayOfWeek filter + all=true (no pagination)
        p.set("dayOfWeek", dayKey);
        p.set("all", "true");
      } else {
        p.set("page",  String(page));
        p.set("limit", String(LIMIT));
      }

      const res  = await fetch(`/api/teacher-portal/class?${p.toString()}`);
      const json = await res.json();
      if (json.success) {
        patchTab(tabKey, {
          items:      json.classes || [],
          total:      json.pagination?.total     ?? (json.classes?.length ?? 0),
          totalPages: json.pagination?.totalPages ?? 1,
          page,
          loading: false,
          fetched: true,
        });
      } else {
        patchTab(tabKey, { loading: false, fetched: true });
      }
    } catch {
      patchTab(tabKey, { loading: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const m = initMonth();
    fetchStudents();
    fetchKpiStats(m);
    fetchTodayClasses();
    fetchTab("scheduled", 1, m, "today", todayDayKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab change: lazy-load tab data if not yet fetched ──────────────────────
  useEffect(() => {
    if (!tabs[tab].fetched && !tabs[tab].loading) {
      fetchTab(tab, 1, filterMonth, scheduledFilter, todayDayKey);
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── scheduledFilter change: reset scheduled tab + refetch ─────────────────
  useEffect(() => {
    patchTab("scheduled", { ...INIT_TAB });
    fetchTab("scheduled", 1, filterMonth, scheduledFilter, todayDayKey);
  }, [scheduledFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── filterMonth change: reset all tabs + refetch current + stats + today ───
  useEffect(() => {
    resetAllTabs();
    fetchKpiStats(filterMonth);
    fetchTodayClasses();
    fetchTab(tab, 1, filterMonth, scheduledFilter, todayDayKey);
  }, [filterMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Page navigation (within tab) ──────────────────────────────────────────
  const goToPage = useCallback((tabKey: Tab, newPage: number) => {
    fetchTab(tabKey, newPage, filterMonth, scheduledFilter, todayDayKey);
  }, [filterMonth, scheduledFilter, todayDayKey, fetchTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh after mutation (start/end/delete/create) ────────────────────────
  const refreshAfterMutation = useCallback((targetTab: Tab, page: number) => {
    fetchTab(targetTab, page, filterMonth, scheduledFilter, todayDayKey);
    fetchKpiStats(filterMonth);
    fetchTodayClasses();
  }, [filterMonth, scheduledFilter, todayDayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!form.studentId)     missing.push("Student");
    if (!form.courseId)      missing.push("Course");
    if (!form.dayOfWeek)     missing.push("Day");
    if (!form.startTime)     missing.push("Start Time");
    if (!form.topic?.trim()) missing.push("Topic");
    if (form.startTime && !/^\d{2}:\d{2}$/.test(form.startTime)) missing.push("Start Time (must be HH:MM)");

    if (missing.length > 0) {
      patchUi({ msg: { text: `Please fill in: ${missing.join(", ")}.`, type: "error" } });
      setTimeout(() => patchUi({ msg: { text: "", type: "" } }), 6000);
      return;
    }

    patchUi({ submitting: true, msg: { text: "", type: "" } });
    try {
      const res  = await fetch("/api/teacher-portal/class", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        patchUi({
          msg:      { text: "Class scheduled successfully!", type: "success" },
          tab:      "scheduled",
          viewMode: "classes",
          form:     { ...form, studentId: "", courseId: "", duration: "45", notes: "", meetLink: "", topic: "" },
        });
        // Reset scheduled tab so it refetches with the new class
        patchTab("scheduled", { ...INIT_TAB });
        setTimeout(() => {
          fetchTab("scheduled", 1, filterMonth, scheduledFilter, todayDayKey);
          fetchKpiStats(filterMonth);
          fetchTodayClasses();
          patchUi({ showForm: false });
        }, 1200);
      } else {
        patchUi({ msg: { text: json.message, type: "error" } });
      }
    } catch {
      patchUi({ msg: { text: "Network error", type: "error" } });
    } finally {
      patchUi({ submitting: false });
      setTimeout(() => patchUi({ msg: { text: "", type: "" } }), 5000);
    }
  }, [form, filterMonth, scheduledFilter, todayDayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions (start / end / pause / resume / reset) ──────────────────────────
  const handleAction = useCallback(async (
    classId: string,
    action:  "start" | "end" | "pause" | "resume" | "reset",
    attendance?: string
  ) => {
    patchUi({ acting: classId });
    try {
      const clientTime = getBdClientTime();
      const res  = await fetch("/api/teacher-portal/class", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ classId, action, attendance, clientTime }),
      });
      const json = await res.json();
      if (json.success) {
        if (action === "start") {
          patchUi({ tab: "in-progress" });
          patchTab("scheduled",    { ...INIT_TAB });
          patchTab("in-progress",  { ...INIT_TAB });
          addToast("Class started! Good luck! 🎯", "success");
        } else if (action === "end") {
          patchUi({ tab: "completed", endTarget: null });
          patchTab("in-progress", { ...INIT_TAB });
          patchTab("completed",   { ...INIT_TAB });
          addToast("Class ended & saved! ✅", "success");
        } else if (action === "reset") {
          patchUi({ tab: "scheduled" });
          patchTab("in-progress", { ...INIT_TAB });
          patchTab("scheduled",   { ...INIT_TAB });
          addToast("Class rescheduled.", "info");
        } else {
          // pause / resume: update item in place
          patchTab(tab, { items: tabs[tab].items.map((c) => c._id === classId ? json.class : c) });
        }
        fetchKpiStats(filterMonth);
        fetchTodayClasses();
        // Lazy: affected tabs reset above; they'll auto-fetch on next visibility
      } else {
        addToast(json.message, "error");
      }
    } catch {
      addToast("Network error", "error");
    } finally {
      patchUi({ acting: null });
    }
  }, [tab, tabs, filterMonth, addToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmEnd = useCallback(
    (attendance: "present" | "absent") => {
      if (!endTarget) return;
      handleAction(endTarget._id, "end", attendance);
    },
    [endTarget, handleAction]
  );

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    patchUi({ deleting: true });
    try {
      const res  = await fetch(`/api/teacher-portal/class?id=${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        patchUi({ deleteTarget: null });
        // Reset current tab → refetch
        patchTab(tab, { ...INIT_TAB });
        refreshAfterMutation(tab, 1);
      } else {
        addToast(json.message || "Delete failed", "error");
      }
    } catch {
      addToast("Network error", "error");
    } finally {
      patchUi({ deleting: false });
    }
  }, [deleteTarget, tab, addToast]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── TABS config (counts from KPI stats for accuracy) ─────────────────────
  const TABS = useMemo(() => [
    { key: "scheduled"   as Tab, label: "Scheduled",   icon: ListOrdered, color: "text-indigo-600", count: kpiStats?.scheduled     ?? tabs.scheduled.total },
    { key: "in-progress" as Tab, label: "In Progress",  icon: Timer,       color: "text-amber-500",  count: kpiStats?.inProgress    ?? tabs["in-progress"].total },
    { key: "completed"   as Tab, label: "Completed",    icon: CheckCheck,  color: "text-emerald-600", count: kpiStats?.completed    ?? tabs.completed.total },
  ], [kpiStats, tabs.scheduled.total, tabs["in-progress"].total, tabs.completed.total]);

  // ── Today's schedule panel (cross-refs students + todayClasses) ────────────
  const todayStudentsSchedule = useMemo((): TodayScheduleItem[] =>
    students
      .filter((s) => {
        const rawDay = s.schedule?.dayOfWeek || s.schedule?.weekly_days_list?.[0] || "";
        return (
          String(rawDay).toLowerCase().trim() === todayDayKey ||
          (Array.isArray(s.schedule?.weekly_days_list) &&
            s.schedule!.weekly_days_list!.map((d: string) => d.toLowerCase().trim()).includes(todayDayKey))
        );
      })
      .map((s): TodayScheduleItem => {
        const todayClass = todayClasses.find((c) => {
          const cSid = (c.student as Student | null)?._id?.toString()
            ?? (c as ClassSession & { student?: string }).student?.toString() ?? "";
          return cSid === s._id;
        });
        return { student: s, todayClass, status: (todayClass?.status as TodaySessionStatus) ?? "uncreated" };
      }),
  [students, todayClasses, todayDayKey]);

  // ── Filtered students for StudentsView ───────────────────────────────────
  const filteredStudents = useMemo(
    () => students.filter((s) =>
      !search ||
      s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").includes(search)
    ),
    [students, search]
  );

  // ── Auto-fill form from student schedule ─────────────────────────────────
  const handleStudentChange = useCallback((studentId: string) => {
    patchUi({ form: { ...form, studentId } });
    if (!studentId) { patchUi({ studentHasSchedule: false }); return; }

    const student = students.find((s) => s._id === studentId);
    if (!student)  { patchUi({ studentHasSchedule: false }); return; }

    const updates: Partial<ClassForm> = {};
    const courseId =
      typeof student.course === "object" && student.course !== null
        ? (student.course as Course)._id
        : typeof student.course === "string"
          ? student.course
          : student.schedule?.course?.toString();
    if (courseId) updates.courseId = courseId;

    const rawDay   = student.schedule?.dayOfWeek || student.schedule?.weekly_days_list?.[0] || null;
    const rawStart = student.schedule?.startTime || null;
    const dur      = student.schedule?.duration  || student.schedule?.classDuration || null;
    const day      = rawDay ? String(rawDay).toLowerCase().trim() : null;
    const startTime = normalizeTime(rawStart);

    if (day)       updates.dayOfWeek = day;
    if (startTime) updates.startTime = startTime;
    if (dur)       updates.duration  = String(dur);

    patchUi({ studentHasSchedule: !!(day && startTime), form: { ...form, studentId, ...updates } });
  }, [students, form]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickCreateForStudent = useCallback((student: Student) => {
    handleStudentChange(student._id);
    patchUi({ showForm: true });
  }, [handleStudentChange]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Current tab data ─────────────────────────────────────────────────────
  const currentTabState = tabs[tab];

  // ─────────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────────
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
            Manage your daily classes, schedule sessions, and track attendance.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap justify-end">
          <Link
            href="/teacher/class/monthly"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 shadow-sm transition-colors cursor-pointer"
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">Monthly Report</span>
          </Link>
          <button
            onClick={() => {
              fetchStudents();
              fetchKpiStats(filterMonth);
              fetchTodayClasses();
              patchTab(tab, { ...INIT_TAB });
              fetchTab(tab, 1, filterMonth, scheduledFilter, todayDayKey);
            }}
            title="Refresh"
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => patchUi({ form: { ...BLANK_FORM, dayOfWeek: todayDayKey }, studentHasSchedule: false, showForm: true })}
            className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] right-4 sm:relative sm:bottom-auto sm:right-auto z-50 sm:z-auto flex items-center justify-center gap-2 w-14 h-14 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-full sm:rounded-xl shadow-lg sm:shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-6 h-6 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">New Class</span>
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <KpiStrip stats={kpiStats} loading={statsLoading} />

      {/* ── View Toggle ── */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5 overflow-x-auto">
        {(
          [
            { key: "classes"  as ViewMode, label: "Classes",  icon: Calendar },
            { key: "students" as ViewMode, label: "Students", icon: Users    },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => patchUi({ viewMode: key })}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              viewMode === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {key === "students" && students.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                viewMode === "students" ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-600"
              }`}>
                {students.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ CLASS LIST VIEW ══════════════ */}
      {viewMode === "classes" && (
        <>
          {/* Tab bar + Month Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-2">
            <div className="flex bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm w-full sm:w-auto overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => patchUi({ tab: t.key })}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    tab === t.key
                      ? "bg-gray-900 text-white shadow"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <t.icon className={`w-3.5 h-3.5 ${tab === t.key ? "text-white" : t.color}`} />
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                      tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-gray-500">Month:</label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => patchUi({ filterMonth: e.target.value })}
                className="flex-1 sm:flex-none px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
              {filterMonth && (
                <button
                  onClick={() => patchUi({ filterMonth: "" })}
                  className="text-xs font-bold text-red-500 hover:underline px-2 py-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Scheduled → today/all sub-filter */}
          {tab === "scheduled" && (
            <div className="flex items-center gap-2 mb-2">
              {(["today", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => patchUi({ scheduledFilter: f })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scheduledFilter === f
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f === "today" ? `Today (${todayDayKey})` : `All Scheduled (${kpiStats?.scheduled ?? tabs.scheduled.total})`}
                </button>
              ))}
            </div>
          )}

          {/* Today's student schedule status panel */}
          {tab === "scheduled" && scheduledFilter === "today" && todayStudentsSchedule.length > 0 && (
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  {todayStudentsSchedule.length} Student{todayStudentsSchedule.length > 1 ? "s" : ""} Scheduled for Today ({todayDayKey})
                </h4>
              </div>
              <p className="text-xs text-indigo-700/80 mb-3">
                Overview of students scheduled for today and their class session status:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {todayStudentsSchedule.map(({ student: st, todayClass, status }) => (
                  <div
                    key={st._id}
                    className="bg-white rounded-xl p-2.5 border border-indigo-100 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={st.fullName} src={st.avatar} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{st.fullName}</p>
                        <p className="text-[10px] text-indigo-600 font-mono">
                          {st.schedule?.startTime || "—"} ({st.schedule?.duration || 45}m)
                        </p>
                      </div>
                    </div>

                    {status === "completed" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold shadow-2xs flex-shrink-0">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Completed
                      </span>
                    )}
                    {(status === "in-progress" || status === "paused") && (
                      <button
                        onClick={() => patchUi({ tab: "in-progress" })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs flex-shrink-0 cursor-pointer animate-pulse"
                      >
                        <Timer className="w-3.5 h-3.5" /> In Progress
                      </button>
                    )}
                    {status === "scheduled" && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {todayClass ? (
                          <button
                            disabled={acting === todayClass._id}
                            onClick={() => handleAction(todayClass._id, "start")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex-shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-current" /> Start
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" /> Scheduled
                          </span>
                        )}
                      </div>
                    )}
                    {status === "uncreated" && (
                      <button
                        onClick={() => handleQuickCreateForStudent(st)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex-shrink-0 cursor-pointer active:scale-95"
                      >
                        + Create
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live hint */}
          {tab === "in-progress" && currentTabState.total > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 flex-shrink-0 animate-pulse" />
              Live class in progress! Click <strong>End Class</strong> when the session is over.
            </div>
          )}

          {/* Loading */}
          {currentTabState.loading ? (
            <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm text-gray-400 font-medium">Loading {tab} classes…</p>
              </div>
            </div>

          ) : currentTabState.items.length === 0 ? (
            /* Empty state */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                {tab === "scheduled"   && <ListOrdered className="w-7 h-7 text-gray-300" />}
                {tab === "in-progress" && <Timer       className="w-7 h-7 text-amber-300" />}
                {tab === "completed"   && <CheckCheck  className="w-7 h-7 text-emerald-300" />}
              </div>
              <p className="font-bold text-gray-700 text-base">
                {tab === "scheduled"
                  ? scheduledFilter === "today"
                    ? `No classes scheduled for today (${todayFormatted})`
                    : "No scheduled classes found"
                  : tab === "in-progress"
                    ? "No class currently in progress"
                    : "No completed classes yet"}
              </p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                {tab === "scheduled"
                  ? "Click \"Create Class\" to schedule a session, or switch to All Scheduled to view your upcoming classes."
                  : tab === "in-progress"
                    ? "Start a scheduled class from the Scheduled tab."
                    : "Ended classes will appear here with attendance history."}
              </p>
              {tab === "scheduled" && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                  {scheduledFilter === "today" && (kpiStats?.scheduled ?? 0) > 0 && (
                    <button
                      onClick={() => patchUi({ scheduledFilter: "all" })}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <ListOrdered className="w-4 h-4" /> View All Scheduled ({kpiStats?.scheduled})
                    </button>
                  )}
                  <button
                    onClick={() => patchUi({ form: { ...BLANK_FORM, dayOfWeek: todayDayKey }, studentHasSchedule: false, showForm: true })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Create Class
                  </button>
                </div>
              )}
            </div>

          ) : (
            /* Class list + pagination */
            <div className="space-y-3">
              {currentTabState.items.map((cls) => (
                <ClassCard
                  key={cls._id}
                  cls={cls}
                  acting={acting}
                  onAction={(id, action) => handleAction(id, action)}
                  onEndRequest={(c) => patchUi({ endTarget: c })}
                  onDelete={(c) => patchUi({ deleteTarget: c })}
                />
              ))}

              <PaginationBar
                page={currentTabState.page}
                totalPages={currentTabState.totalPages}
                total={currentTabState.total}
                label={`${tab} classes`}
                disabled={currentTabState.loading}
                onPrev={() => goToPage(tab, currentTabState.page - 1)}
                onNext={() => goToPage(tab, currentTabState.page + 1)}
              />
            </div>
          )}
        </>
      )}

      {/* ══════════════ STUDENT LIST VIEW ══════════════ */}
      {viewMode === "students" && (
        <StudentsView
          students={students}
          filteredStudents={filteredStudents}
          search={search}
          onSearchChange={(v) => patchUi({ search: v })}
          loading={studentsLoading}
        />
      )}

      {/* ══════════════ MODALS ══════════════ */}
      <NewClassModal
        show={showForm}
        onClose={() => patchUi({ showForm: false })}
        form={form}
        setForm={(f) => patchUi({ form: typeof f === "function" ? f(form) : f })}
        students={students}
        courses={courses}
        studentHasSchedule={studentHasSchedule}
        onStudentChange={handleStudentChange}
        onSubmit={handleCreate}
        submitting={submitting}
        msg={msg}
      />

      <DeleteModal
        cls={deleteTarget}
        deleting={deleting}
        onClose={() => patchUi({ deleteTarget: null })}
        onConfirm={handleDelete}
      />

      <EndClassModal
        cls={endTarget}
        acting={!!acting}
        onClose={() => patchUi({ endTarget: null })}
        onConfirm={handleConfirmEnd}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}