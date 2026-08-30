"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Video,
  Calendar,
  Clock,
  Users,
  Plus,
  PlayCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  BookOpen,
  Trash2,
  X,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useTeacher } from "../TeacherContext";

const BD_TIMEZONE = "Asia/Dhaka";

function getBdDayKey(): string {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, weekday: "long" }).format(new Date());
  return weekday.toLowerCase().trim();
}

function getBdTodayIso(): string {
  const d = new Date();
  const year  = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, year: "numeric" }).format(d);
  const month = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, month: "2-digit" }).format(d);
  const day   = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, day: "2-digit" }).format(d);
  return `${year}-${month}-${day}`;
}

function isBdToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const dateStr  = d.toLocaleDateString("en-US", { timeZone: BD_TIMEZONE });
  const todayStr = new Date().toLocaleDateString("en-US", { timeZone: BD_TIMEZONE });
  return dateStr === todayStr;
}

export default function TeacherOnlineClassesPage() {
  const { profile } = useTeacher();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"today" | "all" | "scheduled" | "in-progress" | "completed">("today");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    topic: "",
    studentId: "",
    courseId: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledStartTime: "10:00",
    scheduledEndTime: "10:45",
    duration: 45,
    notes: "",
  });

  const fetchOnlineClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/online-classes");
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.error("Failed to load teacher online classes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineClasses();
  }, [fetchOnlineClasses]);

  // Load students & courses on mount
  const [studentSearch, setStudentSearch] = useState("");

  const loadStudentsAndCourses = useCallback(async () => {
    try {
      // 1. First fetch teacher-assigned students
      const res1 = await fetch("/api/teacher-portal/students?all=true");
      const data1 = await res1.json();
      let studentList = data1?.students || data1?.allStudents || [];

      // 2. If list is empty or teacher needs all students, fallback to /api/students
      if (studentList.length === 0) {
        const res2 = await fetch("/api/students?limit=300");
        const data2 = await res2.json();
        if (data2?.students && data2.students.length > 0) {
          studentList = data2.students;
        }
      }
      setStudents(studentList);
    } catch (err) {
      console.error("Failed to load students in teacher modal:", err);
      try {
        const res = await fetch("/api/students?limit=300");
        const data = await res.json();
        if (data?.students) setStudents(data.students);
      } catch (_) {}
    }

    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      if (data?.courses) setCourses(data.courses);
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  }, []);

  useEffect(() => {
    loadStudentsAndCourses();
  }, [loadStudentsAndCourses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/online-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          teacherId: profile?._id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setFormData({
          title: "",
          subject: "",
          topic: "",
          studentId: "",
          courseId: "",
          scheduledDate: new Date().toISOString().split("T")[0],
          scheduledStartTime: "10:00",
          scheduledEndTime: "10:45",
          duration: 45,
          notes: "",
        });
        fetchOnlineClasses();
      } else {
        alert(data.message || "Failed to create class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this online class?")) return;
    try {
      const res = await fetch(`/api/online-classes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchOnlineClasses();
      } else {
        alert(data.message || "Failed to cancel class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  };

  const todayDayKey = useMemo(() => getBdDayKey(), []);
  const todayIso = useMemo(() => getBdTodayIso(), []);

  const todayCount = useMemo(() => {
    return classes.filter((c) => isBdToday(c.scheduledDate)).length;
  }, [classes]);

  const scheduledCount = useMemo(() => {
    return classes.filter((c) => c.status === "scheduled").length;
  }, [classes]);

  const inProgressCount = useMemo(() => {
    return classes.filter((c) => c.status === "in-progress").length;
  }, [classes]);

  const completedCount = useMemo(() => {
    return classes.filter((c) => c.status === "completed").length;
  }, [classes]);

  // Today's student schedule panel (cross-references students with today's day & online classes)
  const todayStudentsSchedule = useMemo(() => {
    return students
      .filter((s) => {
        const rawDay = s.schedule?.dayOfWeek || s.schedule?.weekly_days_list?.[0] || "";
        return (
          String(rawDay).toLowerCase().trim() === todayDayKey ||
          (Array.isArray(s.schedule?.weekly_days_list) &&
            s.schedule.weekly_days_list.map((d: string) => d.toLowerCase().trim()).includes(todayDayKey))
        );
      })
      .map((s) => {
        const todayClass = classes.find((c) => {
          const cSid = c.student?._id?.toString() || c.student?.toString() || "";
          return cSid === s._id && isBdToday(c.scheduledDate);
        });

        let status: "completed" | "in-progress" | "scheduled" | "uncreated" = "uncreated";
        if (todayClass) {
          if (todayClass.status === "completed") status = "completed";
          else if (todayClass.status === "in-progress") status = "in-progress";
          else if (todayClass.status === "scheduled") status = "scheduled";
        }

        return { student: s, todayClass, status };
      });
  }, [students, classes, todayDayKey]);

  const handleQuickCreateForStudent = (st: any) => {
    const courseId =
      typeof st.course === "object" && st.course !== null
        ? st.course._id
        : typeof st.course === "string"
        ? st.course
        : st.schedule?.course || "";

    const startTime = st.schedule?.startTime || "10:00";
    const duration = Number(st.schedule?.duration || st.schedule?.classDuration || 45);

    const [hh, mm] = startTime.split(":").map(Number);
    let endH = isNaN(hh) ? 10 : hh;
    let endM = (isNaN(mm) ? 0 : mm) + duration;
    while (endM >= 60) {
      endM -= 60;
      endH = (endH + 1) % 24;
    }
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    setFormData({
      title: `${st.fullName} - Online Class`,
      subject: st.course?.title || "Quran & Islamic Studies",
      topic: "",
      studentId: st._id,
      courseId: courseId || "",
      scheduledDate: todayIso,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      duration: duration,
      notes: "",
    });
    setIsCreateOpen(true);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // Reset to page 1 whenever filter, search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery, pageSize]);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (filterTab === "today") {
        if (!isBdToday(cls.scheduledDate)) return false;
      } else if (filterTab !== "all" && cls.status !== filterTab) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = cls.title?.toLowerCase().includes(q);
        const topicMatch = cls.topic?.toLowerCase().includes(q);
        const studentMatch = cls.student?.fullName?.toLowerCase().includes(q);
        return titleMatch || topicMatch || studentMatch;
      }
      return true;
    });
  }, [classes, filterTab, searchQuery]);

  const totalItems = filteredClasses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is valid when totalPages decreases
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedClasses = useMemo(() => {
    return filteredClasses.slice(startIndex, endIndex);
  }, [filteredClasses, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(targetPage);
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Top Banner Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              LiveKit Video SDK Classroom
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My LiveKit Online Classes
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Host interactive live video classes, share your screen, manage participants, and automatically track student attendance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOnlineClasses}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Schedule Online Class
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterTab("today")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === "today"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
            }`}
          >
            Today ({todayDayKey})
            {todayCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterTab === "today"
                  ? "bg-white/20 text-white"
                  : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
              }`}>
                {todayCount}
              </span>
            )}
          </button>

          {(["all", "scheduled", "in-progress", "completed"] as const).map((tab) => {
            const count =
              tab === "all"
                ? classes.length
                : tab === "scheduled"
                ? scheduledCount
                : tab === "in-progress"
                ? inProgressCount
                : completedCount;

            const label =
              tab === "in-progress"
                ? "Live Now"
                : tab === "all"
                ? `All Scheduled (${scheduledCount})`
                : tab;

            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {label}
                {tab !== "all" && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    filterTab === tab
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search class or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Today's student schedule status panel */}
      {todayStudentsSchedule.length > 0 && (
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
              {todayStudentsSchedule.length} Student{todayStudentsSchedule.length > 1 ? "s" : ""} Scheduled for Today ({todayDayKey})
            </h4>
          </div>
          <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mb-3">
            Overview of students scheduled for today and their class session status:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {todayStudentsSchedule.map(({ student: st, todayClass, status }) => (
              <div
                key={st._id}
                className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-indigo-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {(st.fullName || "S").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{st.fullName}</p>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                      {st.schedule?.startTime || "—"} ({st.schedule?.duration || 45}m)
                    </p>
                  </div>
                </div>

                {status === "completed" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-[11px] font-bold flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Completed
                  </span>
                )}

                {status === "in-progress" && todayClass && (
                  <Link
                    href={`/online-classes/${todayClass._id}/room`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex-shrink-0 animate-pulse"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Live Now
                  </Link>
                )}

                {status === "scheduled" && todayClass && (
                  <Link
                    href={`/online-classes/${todayClass._id}/room`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex-shrink-0"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Start
                  </Link>
                )}

                {status === "uncreated" && (
                  <button
                    onClick={() => handleQuickCreateForStudent(st)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex-shrink-0 active:scale-95 cursor-pointer"
                  >
                    + Create
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classes Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Loading your online classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600 dark:text-blue-400">
            <Video className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Online Classes Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {filterTab === "today"
              ? `You do not have any online classes scheduled for today (${todayDayKey}).`
              : filterTab !== "all"
              ? `You do not have any classes in "${filterTab}" status.`
              : "No online classes scheduled yet. Click 'Schedule Online Class' to create a session."}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Schedule First Class
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedClasses.map((cls) => {
            const isLive = cls.status === "in-progress";
            const isCompleted = cls.status === "completed";

            return (
              <div
                key={cls._id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Header */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isLive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : isCompleted
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isLive ? "bg-emerald-500 animate-ping" : isCompleted ? "bg-slate-400" : "bg-blue-500"
                          }`}
                        />
                        {isLive ? "Live Now" : isCompleted ? "Completed" : "Scheduled"}
                      </span>

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {cls.title}
                      </h3>
                      {cls.topic && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          Topic: {cls.topic}
                        </p>
                      )}
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3 text-xs">
                    {cls.student && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Student:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          {cls.student?.fullName}
                        </span>
                      </div>
                    )}

                    {cls.course && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Course:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {cls.course?.title}
                        </span>
                      </div>
                    )}

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(cls.scheduledDate).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {cls.scheduledStartTime} {cls.scheduledEndTime ? `- ${cls.scheduledEndTime}` : `(${cls.duration} min)`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/teacher/online-classes-liveKit/${cls._id}`}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      Attendance Logs
                    </Link>

                    {cls.status === "scheduled" && (
                      <button
                        onClick={() => handleCancel(cls._id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Cancel Class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {!isCompleted ? (
                    <Link
                      href={`/online-classes/${cls._id}/room`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                        isLive
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 shadow-emerald-500/20 animate-pulse"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 shadow-blue-500/20"
                      }`}
                    >
                      <PlayCircle className="w-4 h-4" />
                      {isLive ? "Enter Live Room" : "Start Class"}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ended
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing <strong className="font-semibold text-slate-900 dark:text-white">{startIndex + 1}</strong> to{" "}
                  <strong className="font-semibold text-slate-900 dark:text-white">{endIndex}</strong> of{" "}
                  <strong className="font-semibold text-slate-900 dark:text-white">{totalItems}</strong> classes
                </span>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                    <option value={18}>18</option>
                    <option value={24}>24</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    title="First Page"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Previous Page"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((p, idx) =>
                      p === "..." ? (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-bold select-none">
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          className={`min-w-[34px] h-[34px] px-2 rounded-xl text-xs font-bold transition-all ${
                            currentPage === p
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20"
                              : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Next Page"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last Page"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Online Class Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Schedule Online Class</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">LiveKit WebRTC Classroom</p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Class Subject / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quran Tajweed Mastery"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Topic / Lesson Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Surah Al-Baqarah Verses 1-15"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Student (Optional)
                  </label>
                  {students.length > 0 && (
                    <span className="text-[10px] text-slate-400">{students.length} students loaded</span>
                  )}
                </div>
                {students.length > 5 && (
                  <div className="mb-2 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter student by name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Open Session / Select Student --</option>
                  {students
                    .filter((s) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.toLowerCase();
                      return (
                        s.fullName?.toLowerCase().includes(q) ||
                        s.studentId?.toLowerCase().includes(q) ||
                        s.email?.toLowerCase().includes(q)
                      );
                    })
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.fullName} ({s.studentId || "Student"}) {s.course?.title ? `— ${s.course.title}` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Course (Optional)
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- None / Select Course --</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledStartTime}
                    onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 disabled:opacity-60 transition-all"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? "Scheduling..." : "Schedule Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
