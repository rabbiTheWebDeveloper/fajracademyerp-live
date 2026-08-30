"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  Calendar,
  Clock,
  Users,
  BookOpen,
  PlayCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

const NAVY = {
  950: "#060d20",
  900: "#0d1b3e",
  800: "#142258",
  700: "#1a2d70",
  600: "#1e3a8a",
  500: "#2563eb",
  400: "#60a5fa",
  300: "#93c5fd",
  200: "#bfdbfe",
  100: "#dbeafe",
  50: "#eff6ff",
};

export default function StudentOnlineClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "scheduled" | "in-progress" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOnlineClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/online-classes");
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.error("Failed to load student online classes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineClasses();
  }, [fetchOnlineClasses]);

  const filteredClasses = classes.filter((cls) => {
    if (filterTab !== "all" && cls.status !== filterTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = cls.title?.toLowerCase().includes(q);
      const topicMatch = cls.topic?.toLowerCase().includes(q);
      const teacherMatch = cls.teacher?.fullName?.toLowerCase().includes(q);
      return titleMatch || topicMatch || teacherMatch;
    }
    return true;
  });

  const liveClasses = classes.filter((c) => c.status === "in-progress");

  return (
    <div className="space-y-6 pb-6">
      {/* Top Banner Header */}
      <div
        className="relative rounded-3xl overflow-hidden p-6 sm:p-8"
        style={{
          background: `linear-gradient(135deg, ${NAVY[950]}, ${NAVY[800]})`,
          boxShadow: `0 16px 50px rgba(13,27,62,0.35)`,
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-32 w-48 h-48 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Zoom Video SDK Classroom
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              My Live Online Classes
            </h1>
            <p className="text-sm text-blue-100/80 max-w-xl">
              Join interactive live classes with your teachers, participate in real-time chat, and view your automated attendance records.
            </p>
          </div>

          <button
            onClick={fetchOnlineClasses}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Now Alert Banner if any class is active */}
      {liveClasses.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 flex-shrink-0 animate-pulse">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Live Class is Happening Right Now!
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {liveClasses[0].title} with {liveClasses[0].teacher?.fullName || "Teacher"}
              </p>
            </div>
          </div>

          <Link
            href={`/online-classes/${liveClasses[0]._id}/room`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <PlayCircle className="w-4 h-4" />
            Join Room Now
          </Link>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Filter Tabs */}
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

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search class or teacher..."
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
              : "No online classes have been scheduled for you yet. Your teacher will schedule sessions here."}
          </p>
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
                  {/* Card Header */}
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

                  {/* Card Info */}
                  <div className="p-5 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Teacher:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        {cls.teacher?.fullName || "Assigned Teacher"}
                      </span>
                    </div>

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

                {/* Card Actions */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Link
                    href={`/student/online-classes/${cls._id}`}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    Details & Logs
                  </Link>

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
                      {isLive ? "Join Live Room" : "Enter Room"}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Finished
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
