"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Radio,
  Calendar,
  Clock,
  Users,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  BookOpen,
  UserCheck,
  UserX,
  FileSpreadsheet,
} from "lucide-react";

export default function StudentLiveKitClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [classData, setClassData] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [classRes, attRes] = await Promise.all([
          fetch(`/api/online-classes/${id}`),
          fetch(`/api/online-classes/${id}/attendance`),
        ]);

        const classJson = await classRes.json();
        const attJson = await attRes.json();

        if (classJson.success) {
          setClassData(classJson.class);
        }
        if (attJson.success) {
          setAttendance(attJson.attendance || []);
        }
      } catch (err) {
        console.error("Failed to load class details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-400 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Loading LiveKit class details...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">LiveKit Class Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The requested online class does not exist or has been removed.</p>
        <Link
          href="/student/online-classes-liveKit"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to LiveKit Classes
        </Link>
      </div>
    );
  }

  const isLive = classData.status === "in-progress";
  const isCompleted = classData.status === "completed";

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar & Back ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/student/online-classes-liveKit"
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
              <span className="text-xs text-slate-400 font-mono">LiveKit WebRTC</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {classData.title}
            </h1>
          </div>
        </div>

        {/* Join button */}
        {!isCompleted && (
          <Link
            href={`/online-classes/${id}/room`}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-xl transition-all hover:scale-105 active:scale-95 ${
              isLive
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30 animate-pulse"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
            }`}
          >
            <PlayCircle className="w-5 h-5" />
            {isLive ? "Join Live Room Now" : "Enter Classroom"}
          </Link>
        )}
      </div>

      {/* ── Main Details Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Information Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Class Overview</h3>
                  <p className="text-xs text-slate-400">LiveKit session details and curriculum</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Subject</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">
                  {classData.subject || "General"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Topic</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">
                  {classData.topic || "N/A"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Scheduled Date</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {new Date(classData.scheduledDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Scheduled Timing</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  {classData.scheduledStartTime} {classData.scheduledEndTime ? `- ${classData.scheduledEndTime}` : `(${classData.duration || 45} min)`}
                </p>
              </div>
            </div>

            {classData.notes && (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-200">Teacher's Instructions / Notes:</span>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{classData.notes}</p>
              </div>
            )}
          </div>

          {/* ── Attendance Log Card ── */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">My Attendance Record</h3>
                  <p className="text-xs text-slate-400">LiveKit automatic WebRTC presence logging</p>
                </div>
              </div>
            </div>

            {attendance.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No attendance recorded yet. Attendance updates automatically when you join the room.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 rounded-l-xl">Status</th>
                      <th className="p-3">Join Time</th>
                      <th className="p-3">Leave Time</th>
                      <th className="p-3 rounded-r-xl">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendance.map((att) => (
                      <tr key={att._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            att.status === "present"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : att.status === "late"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {att.status === "present" ? <UserCheck className="w-3 h-3 text-emerald-500" /> : <UserX className="w-3 h-3 text-amber-500" />}
                            <span className="capitalize">{att.status}</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {att.joinedAt ? new Date(att.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {att.leftAt ? new Date(att.leftAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : (att.joinedAt ? "Still in class" : "-")}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {att.durationMinutes ? `${att.durationMinutes} mins` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Teacher & Course Sidebar */}
        <div className="space-y-6">
          {/* Teacher Profile */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Assigned Teacher</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/30">
                {classData.teacher?.fullName ? classData.teacher.fullName[0] : "T"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                  {classData.teacher?.fullName || "Teacher"}
                </p>
                <p className="text-xs text-slate-400">{classData.teacher?.designation || "Instructor"}</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">{classData.teacher?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/60 dark:to-slate-800/30 rounded-3xl p-6 border border-blue-100 dark:border-slate-700/60 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>LiveKit Classroom Tips</span>
            </div>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 list-disc list-inside leading-relaxed">
              <li>Ensure your camera and microphone permissions are enabled in your browser.</li>
              <li>Use headphones for the best noise cancellation and audio experience.</li>
              <li>Attendance is logged automatically when joining the session.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
