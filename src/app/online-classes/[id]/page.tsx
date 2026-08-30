"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  Calendar,
  Clock,
  Users,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  StopCircle,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Download,
  Share2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function OnlineClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [classData, setClassData] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [classRes, attRes] = await Promise.all([
          fetch(`/api/online-classes/${id}`),
          fetch(`/api/online-classes/${id}/attendance`),
        ]);

        const classJson = await classRes.json();
        const attJson = await attRes.json();

        // Redirect teachers and students to their respective portal routes with sidebar
        if (classJson?.currentUser?.role === "teacher") {
          router.replace(`/teacher/online-classes/${id}`);
          return;
        }
        if (classJson?.currentUser?.role === "student") {
          router.replace(`/student/online-classes/${id}`);
          return;
        }

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
  }, [id, router]);

  const copyRoomLink = () => {
    const url = `${window.location.origin}/online-classes/${id}/room`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Online Class Not Found</h2>
        <Link
          href="/online-classes"
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
        >
          Back to Online Classes
        </Link>
      </div>
    );
  }

  const isLive = classData.status === "in-progress";

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/online-classes"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Online Classes
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copied Link!" : "Copy Classroom Link"}
          </button>
        </div>
      </div>

      {/* Main Details Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Zoom Video SDK Classroom
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">{classData.title}</h1>
            {classData.topic && (
              <p className="text-sm text-slate-300">Topic: {classData.topic}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {new Date(classData.scheduledDate).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {classData.scheduledStartTime} {classData.scheduledEndTime ? `- ${classData.scheduledEndTime}` : `(${classData.duration}m)`}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg capitalize">
                Status: <strong className="text-white ml-1">{classData.status}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {classData.status !== "completed" && classData.status !== "cancelled" && (
              <Link
                href={`/online-classes/${id}/room`}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all hover:scale-105 ${
                  isLive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 shadow-emerald-500/30 animate-pulse"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 shadow-blue-500/30"
                }`}
              >
                <PlayCircle className="w-5 h-5" />
                {isLive ? "Join Live Classroom" : "Launch Classroom"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Profiles & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Teacher & Student Cards */}
        <div className="space-y-6">
          {/* Teacher Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Teacher</h3>
            {classData.teacher ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {classData.teacher.avatar ? (
                    <img src={classData.teacher.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    classData.teacher.fullName?.charAt(0) || "T"
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{classData.teacher.fullName}</h4>
                  <p className="text-xs text-slate-500">{classData.teacher.designation || "Instructor"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{classData.teacher.email || classData.teacher.phone}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No teacher assigned</p>
            )}
          </div>

          {/* Student Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Student</h3>
            {classData.student ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {classData.student.avatar ? (
                    <img src={classData.student.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    classData.student.fullName?.charAt(0) || "S"
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{classData.student.fullName}</h4>
                  <p className="text-xs text-slate-500">ID: {classData.student.studentId || "Student"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{classData.student.email || classData.student.phone}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Open to all students or unassigned</p>
            )}
          </div>

          {/* Room Security Info */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Secure Room Specs
            </h3>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <p>• End-to-end encrypted WebRTC stream</p>
              <p>• Role-based token access (Host vs Attendee)</p>
              <p>• Automated join/leave telemetry tracking</p>
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Records Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Live Attendance Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically recorded participant join and leave times
              </p>
            </div>

            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold">
              {attendance.length} Record{attendance.length === 1 ? "" : "s"}
            </span>
          </div>

          {attendance.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Attendance Recorded Yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                When participants join the Zoom classroom room, their attendance and duration will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Participant</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Join Time</th>
                    <th className="pb-3">Leave Time</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendance.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {rec.userName}
                      </td>
                      <td className="py-3 capitalize text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                          {rec.userType}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        {rec.joinTime ? new Date(rec.joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        {rec.leaveTime ? new Date(rec.leaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                          <span className="text-emerald-500 font-medium">In Room</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400 font-medium">
                        {rec.durationMinutes ? `${rec.durationMinutes} mins` : "--"}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === "present"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : rec.status === "late"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {rec.status === "present" ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
