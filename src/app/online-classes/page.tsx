"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  Calendar,
  Clock,
  Users,
  Search,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  StopCircle,
  Trash2,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowRight,
  BookOpen,
  UserCheck,
  Award,
  X,
  Radio,
  ExternalLink,
} from "lucide-react";

type Tab = "all" | "scheduled" | "in-progress" | "completed";

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  scheduled: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
    dot: "bg-indigo-500",
    label: "Scheduled",
  },
  "in-progress": {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500 animate-pulse",
    label: "Live Now",
  },
  completed: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    dot: "bg-gray-400",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
    label: "Cancelled",
  },
};

export default function OnlineClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form state for creating a class
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    topic: "",
    teacherId: "",
    studentId: "",
    courseId: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledStartTime: "10:00",
    scheduledEndTime: "10:45",
    duration: 45,
    notes: "",
  });

  // Fetch current user and online classes
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch current user
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData?.success) {
        if (meData.user.role === "teacher") {
          router.replace("/teacher/online-classes");
          return;
        }
        if (meData.user.role === "student") {
          router.replace("/student/online-classes");
          return;
        }
        setCurrentUser(meData.user);
      }

      // Fetch online classes
      const url = new URL("/api/online-classes", window.location.origin);
      if (activeTab !== "all") url.searchParams.set("status", activeTab);
      if (selectedDate) url.searchParams.set("date", selectedDate);
      if (searchQuery) url.searchParams.set("search", searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data?.success) {
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.error("Failed to load online classes:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDate, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load teachers, students, courses for modal
  useEffect(() => {
    if (isCreateModalOpen) {
      fetch("/api/teachers?limit=100")
        .then((r) => r.json())
        .then((d) => {
          if (d?.teachers || d?.data) setTeachers(d.teachers || d.data || []);
        })
        .catch(() => {});

      fetch("/api/students?limit=100")
        .then((r) => r.json())
        .then((d) => {
          if (d?.students || d?.data) setStudents(d.students || d.data || []);
        })
        .catch(() => {});

      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => {
          if (d?.courses || d?.data) setCourses(d.courses || d.data || []);
        })
        .catch(() => {});
    }
  }, [isCreateModalOpen]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Please enter a class title or subject");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/online-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setFormData({
          title: "",
          subject: "",
          topic: "",
          teacherId: currentUser?.role === "teacher" ? currentUser._id : "",
          studentId: "",
          courseId: "",
          scheduledDate: new Date().toISOString().split("T")[0],
          scheduledStartTime: "10:00",
          scheduledEndTime: "10:45",
          duration: 45,
          notes: "",
        });
        fetchData();
      } else {
        alert(data.message || "Failed to create online class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleCancelClass = async (classId: string) => {
    if (!confirm("Are you sure you want to cancel this online class?")) return;
    try {
      const res = await fetch(`/api/online-classes/${classId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.message || "Failed to cancel class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = classes.length;
    const scheduled = classes.filter((c) => c.status === "scheduled").length;
    const live = classes.filter((c) => c.status === "in-progress").length;
    const completed = classes.filter((c) => c.status === "completed").length;
    return { total, scheduled, live, completed };
  }, [classes]);

  const isTeacherOrAdmin =
    currentUser && ["admin", "super-admin", "staff", "teacher"].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Zoom Video SDK Powered
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Fajr Academy Online Classes
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl">
              High-definition interactive live video classrooms with real-time chat, screen sharing, and automated attendance logging.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchData()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium transition-all backdrop-blur-md"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Schedule Class
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <p className="text-xs text-slate-400 font-medium">Total Classes</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 backdrop-blur-md">
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Now
            </p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{stats.live}</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 backdrop-blur-md">
            <p className="text-xs text-indigo-300 font-medium">Scheduled</p>
            <p className="text-2xl font-bold text-indigo-200 mt-1">{stats.scheduled}</p>
          </div>
          <div className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-4 backdrop-blur-md">
            <p className="text-xs text-slate-300 font-medium">Completed</p>
            <p className="text-2xl font-bold text-slate-200 mt-1">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(["all", "scheduled", "in-progress", "completed"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab === "in-progress" ? "Live Now" : tab}
            </button>
          ))}
        </div>

        {/* Search & Date */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subject, topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Class Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading online classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
            <Video className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Online Classes Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {activeTab !== "all"
              ? `There are currently no classes marked as "${activeTab}".`
              : "No online classes scheduled yet. Click 'Schedule Class' to start."}
          </p>
          {isTeacherOrAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Schedule First Class
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const statusStyle = STATUS_CONFIG[cls.status] || STATUS_CONFIG.scheduled;
            const isLive = cls.status === "in-progress";

            return (
              <div
                key={cls._id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                      {statusStyle.label}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {cls.title || cls.subject}
                    </h3>
                    {cls.topic && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        Topic: {cls.topic}
                      </p>
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Teacher and Student Pills */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Teacher:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        {cls.teacher?.fullName || "Assigned Teacher"}
                      </span>
                    </div>

                    {cls.student && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Student:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                          {cls.student?.fullName || "Assigned Student"}
                        </span>
                      </div>
                    )}

                    {cls.course && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Course:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {cls.course?.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Schedule Details */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
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

                {/* Card Actions */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Link
                    href={`/online-classes/${cls._id}`}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    View Details
                  </Link>

                  <div className="flex items-center gap-2">
                    {isTeacherOrAdmin && cls.status === "scheduled" && (
                      <button
                        onClick={() => handleCancelClass(cls._id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Cancel Class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {cls.status !== "completed" && cls.status !== "cancelled" ? (
                      <Link
                        href={`/online-classes/${cls._id}/room`}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                          isLive
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
                        }`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        {isLive ? "Join Room" : "Start / Join"}
                      </Link>
                    ) : (
                      <Link
                        href={`/online-classes/${cls._id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Attendance
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Online Class Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Schedule Online Class</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Zoom Video SDK</p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                  placeholder="e.g. Surah Al-Mulk Verse 1-10"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {currentUser?.role !== "teacher" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Teacher <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.fullName} ({t.teacherId || "Teacher"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Student
                </label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Open to all / Select student --</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.fullName} ({s.studentId || "Student"})
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
                  onClick={() => setIsCreateModalOpen(false)}
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
