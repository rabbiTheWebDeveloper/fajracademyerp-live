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
  Copy,
  Check,
  Link2,
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

export default function TeacherGoogleMeetClassesPage() {
  const { profile } = useTeacher();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"today" | "all" | "scheduled" | "in-progress" | "completed">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [meetLinkMode, setMeetLinkMode] = useState<"auto" | "custom">("auto");
  const [customMeetLink, setCustomMeetLink] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    topic: "",
    studentId: "",
    courseId: "",
    scheduledDate: getBdTodayIso(),
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
      console.error("Failed to load teacher Google Meet online classes:", err);
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
      const res1 = await fetch("/api/teacher-portal/students?all=true");
      const data1 = await res1.json();
      let studentList = data1?.students || data1?.allStudents || [];

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

    if (meetLinkMode === "custom" && customMeetLink.trim()) {
      const trimmed = customMeetLink.trim();
      if (!trimmed.includes("meet.google.com") && !trimmed.startsWith("http")) {
        alert("Please enter a valid Google Meet link (e.g. https://meet.google.com/xxx-yyyy-zzz)");
        return;
      }
    }

    setCreating(true);
    try {
      const res = await fetch("/api/online-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          teacherId: profile?._id,
          platform: "google-meet",
          meetLink: meetLinkMode === "custom" ? customMeetLink.trim() : "",
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
          scheduledDate: getBdTodayIso(),
          scheduledStartTime: "10:00",
          scheduledEndTime: "10:45",
          duration: 45,
          notes: "",
        });
        setMeetLinkMode("auto");
        setCustomMeetLink("");
        fetchOnlineClasses();
      } else {
        alert(data.message || "Failed to create Google Meet class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCancel = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this Google Meet online class? This will cancel and remove the session.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/online-classes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchOnlineClasses();
      } else {
        alert(data.message || "Failed to delete class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setDeletingId(null);
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
    setMeetLinkMode("auto");
    setCustomMeetLink("");
    setIsCreateOpen(true);
  };

  const copyMeetLink = (cls: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = cls.meetLink || `${window.location.origin}/teacher/online-classes-google-meet/${cls._id}/room`;
    navigator.clipboard.writeText(link);
    setCopiedId(cls._id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openGoogleMeet = async (cls: any) => {
    let link = cls.meetLink;
    if (!link) {
      link = `${window.location.origin}/teacher/online-classes-google-meet/${cls._id}/room`;
    }
    const width = 1180;
    const height = 750;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    const popupFeatures = `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`;
    window.open(link, `FAJR_GoogleMeet_${cls._id}`, popupFeatures);

    try {
      await fetch(`/api/online-classes/${cls._id}/join`, { method: "POST" });
      fetchOnlineClasses();
    } catch (_) {}
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

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

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  return (
    <div className="space-y-6 pb-6">
      {/* Top Banner Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-800/30">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-48 h-48 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Google Meet Video Classroom
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Google Meet Online Classes
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Host interactive Google Meet video classes, share your screen, manage student participants, and automatically track attendance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOnlineClasses}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterTab === "today"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
            }`}
          >
            Today ({todayDayKey})
            {todayCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterTab === "today"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  filterTab === tab
                    ? "bg-emerald-600 text-white shadow-sm"
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
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Today's student schedule status panel */}
      {todayStudentsSchedule.length > 0 && (
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
              {todayStudentsSchedule.length} Student{todayStudentsSchedule.length > 1 ? "s" : ""} Scheduled for Today ({todayDayKey})
            </h4>
          </div>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mb-3">
            Overview of students scheduled for today and their Google Meet class session status:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {todayStudentsSchedule.map(({ student: st, todayClass, status }) => (
              <div
                key={st._id}
                className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-emerald-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {(st.fullName || "S").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{st.fullName}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                      {st.schedule?.startTime || "—"} ({st.schedule?.duration || 45}m)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {status === "completed" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Completed
                    </span>
                  )}

                  {status === "in-progress" && todayClass && (
                    <button
                      onClick={() => openGoogleMeet(todayClass)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs animate-pulse cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Live Now
                    </button>
                  )}

                  {status === "scheduled" && todayClass && (
                    <button
                      onClick={() => openGoogleMeet(todayClass)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Start
                    </button>
                  )}

                  {status === "uncreated" && (
                    <button
                      onClick={() => handleQuickCreateForStudent(st)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      + Create
                    </button>
                  )}

                  {todayClass && (
                    <button
                      onClick={(e) => handleCancel(todayClass._id, e)}
                      disabled={deletingId === todayClass._id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Class"
                    >
                      {deletingId === todayClass._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classes Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-xs font-medium">Loading your Google Meet online classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400">
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
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Schedule Online Class
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedClasses.map((cls) => {
              const isLive = cls.status === "in-progress";
              const isCompleted = cls.status === "completed";
              const isToday = isBdToday(cls.scheduledDate);

              return (
                <div
                  key={cls._id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                    isLive
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : isToday
                      ? "border-emerald-200 dark:border-emerald-900/60 ring-1 ring-emerald-500/10"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="p-5">
                    {/* Header: Status and Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isLive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 animate-pulse"
                              : isCompleted
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              : "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLive
                                ? "bg-emerald-500 animate-ping"
                                : isCompleted
                                ? "bg-slate-400"
                                : "bg-teal-500"
                            }`}
                          />
                          {cls.status}
                        </span>

                        {isToday && !isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                            Today
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        <Video className="w-3 h-3 text-emerald-600" />
                        Google Meet
                      </span>
                    </div>

                    {/* Class Details */}
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                        {cls.title}
                      </h4>
                      {cls.topic ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {cls.topic}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No topic specified</p>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                          {(cls.student?.fullName || "S").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {cls.student?.fullName || "Open Class"}
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ID: {cls.student?.studentId || "—"}
                      </span>
                    </div>

                    {/* Meet Link Strip */}
                    {cls.meetLink && (
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300">
                          <Link2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate text-[11px] font-mono">{cls.meetLink.replace("https://", "")}</span>
                        </div>
                        <button
                          onClick={(e) => copyMeetLink(cls, e)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex-shrink-0 cursor-pointer"
                          title="Copy Meet Link"
                        >
                          {copiedId === cls._id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Date & Time */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
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

                  {/* Actions */}
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teacher/online-classes-google-meet/${cls._id}`}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                      >
                        Attendance Logs
                      </Link>

                      <button
                        onClick={(e) => handleCancel(cls._id, e)}
                        disabled={deletingId === cls._id}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        title="Delete Online Class"
                      >
                        {deletingId === cls._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {!isCompleted ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openGoogleMeet(cls)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                            isLive
                              ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 shadow-emerald-500/20 animate-pulse"
                              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 shadow-emerald-600/20"
                          }`}
                        >
                          <PlayCircle className="w-4 h-4" />
                          {isLive ? "Enter Live Room" : "Start Class"}
                        </button>

                        <Link
                          href={`/teacher/online-classes-google-meet/${cls._id}/room`}
                          className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-200 transition-colors"
                          title="Open Class Host Hub"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  Showing{" "}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {totalItems === 0 ? 0 : startIndex + 1}
                  </strong>
                  {" "}-{" "}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {endIndex}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {totalItems}
                  </strong>{" "}
                  classes
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                  >
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {getPageNumbers().map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          onClick={() => handlePageChange(p as number)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            currentPage === p
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Online Class Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Schedule Google Meet Class
                  </h3>
                  <p className="text-xs text-slate-400">
                    Create an online Google Meet video session for your students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Class Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quran Recitation & Tajweed Session"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tajweed, Arabic Grammar"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Topic / Lesson
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Surah Al-Mulk Verses 1-10"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Student Picker with search */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Student
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student by name, ID or phone..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>

                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">-- All Students / Unassigned --</option>
                    {filteredStudents.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.fullName} {s.studentId ? `(${s.studentId})` : ""} {s.phone ? `· ${s.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Associated Course
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Optional: Select Course --</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledStartTime}
                    onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledEndTime}
                    onChange={(e) => setFormData({ ...formData, scheduledEndTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Google Meet Link Configuration */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-emerald-600" />
                  Google Meet Link
                </span>

                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="meetLinkMode"
                      value="auto"
                      checked={meetLinkMode === "auto"}
                      onChange={() => setMeetLinkMode("auto")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Auto-generate Google Meet link
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="meetLinkMode"
                      value="custom"
                      checked={meetLinkMode === "custom"}
                      onChange={() => setMeetLinkMode("custom")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Custom Meet link
                    </span>
                  </label>
                </div>

                {meetLinkMode === "custom" ? (
                  <div className="space-y-1">
                    <input
                      type="url"
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      value={customMeetLink}
                      onChange={(e) => setCustomMeetLink(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400">
                      Paste a Google Meet link you created in your Google Calendar or at meet.google.com/new.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    A real Google Meet link will be generated automatically when this class is scheduled.
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Class Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or lesson instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? "Creating..." : "Create Online Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
