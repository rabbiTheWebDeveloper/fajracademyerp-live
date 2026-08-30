"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Radio,
  Calendar,
  Clock,
  Users,
  PlayCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Video,
  MonitorPlay,
  MessageSquare,
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

export default function StudentLiveKitClassesPage() {
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
      console.error("Failed to load student livekit classes:", err);
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
      const subjectMatch = cls.subject?.toLowerCase().includes(q);
      const teacherMatch = cls.teacher?.fullName?.toLowerCase().includes(q);
      return titleMatch || topicMatch || subjectMatch || teacherMatch;
    }
    return true;
  });

  const liveClasses = classes.filter((c) => c.status === "in-progress");
  const scheduledClasses = classes.filter((c) => c.status === "scheduled");

  return (
    <div className="space-y-6 pb-8">
      {/* ── Top Hero Banner ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-6 sm:p-8 text-white shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${NAVY[950]} 0%, ${NAVY[800]} 55%, #1e3a8a 100%)`,
          boxShadow: `0 16px 50px rgba(13,27,62,0.35)`,
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-32 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              LiveKit WebRTC Classroom
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              LiveKit Online Classes
            </h1>
            <p className="text-sm text-blue-100/80 max-w-xl">
              Join ultra-low latency live interactive video classrooms with your teachers. Experience crystal clear audio, interactive screen sharing, in-class chat, and instant attendance logging.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOnlineClasses}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* LiveKit Feature Highlights */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-blue-100/90">
            <Radio className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Real-Time HD Audio/Video</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-100/90">
            <MonitorPlay className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Screen & Whiteboard Share</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-100/90">
            <MessageSquare className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Live Participant Chat</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-100/90">
            <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>Automated Attendance</span>
          </div>
        </div>
      </div>

      {/* ── Live Now Alert Banner (if any live session) ── */}
      {liveClasses.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 flex-shrink-0 animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Live Class is Happening Right Now!
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                {liveClasses[0].title} {liveClasses[0].topic ? `— ${liveClasses[0].topic}` : ""} (Teacher: {liveClasses[0].teacher?.fullName || "Assigned Teacher"})
              </p>
            </div>
          </div>

          <Link
            href={`/online-classes/${liveClasses[0]._id}/room`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
          >
            <PlayCircle className="w-4 h-4" />
            Join Live Class Now
          </Link>
        </div>
      )}

      {/* ── Filter Tabs & Search Bar ── */}
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
              {tab === "in-progress" ? `Live Now (${liveClasses.length})` : tab === "scheduled" ? `Scheduled (${scheduledClasses.length})` : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search class, topic, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── Classes Grid ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Loading your LiveKit online classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
            <Radio className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No LiveKit Classes Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            {filterTab !== "all"
              ? `You currently do not have any classes in "${filterTab}" status.`
              : "No online classes have been assigned to you yet. Your teacher will schedule sessions here."}
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
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

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2 truncate group-hover:text-blue-600 transition-colors">
                        {cls.title}
                      </h3>
                      {cls.topic && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Topic: {cls.topic}
                        </p>
                      )}
                    </div>

                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isLive
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                    }`}>
                      <Radio className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-5 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Teacher:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        {cls.teacher?.fullName || "Assigned Teacher"}
                      </span>
                    </div>

                    {cls.course && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Course:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                          {cls.course?.title}
                        </span>
                      </div>
                    )}

                    {cls.subject && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Subject:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {cls.subject}
                        </span>
                      </div>
                    )}

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-medium">
                          {new Date(cls.scheduledDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-medium">
                          {cls.scheduledStartTime} {cls.scheduledEndTime ? `- ${cls.scheduledEndTime}` : `(${cls.duration || 45} mins)`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Link
                    href={`/student/online-classes-liveKit/${cls._id}`}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Details & Records
                  </Link>

                  {!isCompleted ? (
                    <Link
                      href={`/online-classes/${cls._id}/room`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                        isLive
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25 animate-pulse"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
                      }`}
                    >
                      <PlayCircle className="w-4 h-4" />
                      {isLive ? "Join Live Room" : "Enter Room"}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Class Ended
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
