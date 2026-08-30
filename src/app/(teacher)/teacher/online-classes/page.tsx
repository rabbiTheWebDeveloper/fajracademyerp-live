"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useTeacher } from "../TeacherContext";

export default function TeacherOnlineClassesPage() {
  const { profile } = useTeacher();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "scheduled" | "in-progress" | "completed">("all");
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

  // Load students & courses for create modal
  useEffect(() => {
    if (isCreateOpen) {
      fetch("/api/teacher-portal/students")
        .then((r) => r.json())
        .then((d) => {
          if (d?.students) setStudents(d.students);
        })
        .catch(() => {});

      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => {
          if (d?.courses) setCourses(d.courses);
        })
        .catch(() => {});
    }
  }, [isCreateOpen]);

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

  const filteredClasses = classes.filter((cls) => {
    if (filterTab !== "all" && cls.status !== filterTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = cls.title?.toLowerCase().includes(q);
      const topicMatch = cls.topic?.toLowerCase().includes(q);
      const studentMatch = cls.student?.fullName?.toLowerCase().includes(q);
      return titleMatch || topicMatch || studentMatch;
    }
    return true;
  });

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
              Zoom Video SDK Classroom
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Online Classes
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
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(["all", "scheduled", "in-progress", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${
                filterTab === tab
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {tab === "in-progress" ? "Live Now" : tab}
            </button>
          ))}
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
            {filterTab !== "all"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
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
                      href={`/teacher/online-classes/${cls._id}`}
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Zoom Video SDK Web Classroom</p>
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Student (Optional)
                </label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Open Session / Select Student --</option>
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
