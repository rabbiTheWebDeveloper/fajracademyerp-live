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
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Trash2,
  Link2,
  RefreshCw,
} from "lucide-react";

export default function TeacherGoogleMeetClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [classData, setClassData] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleDeleteClass = async () => {
    if (!confirm("Are you sure you want to delete this Google Meet online class?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/online-classes/${id}?permanent=true`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/teacher/online-classes-google-meet");
      } else {
        alert(data.message || "Failed to delete class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  const copyMeetLink = () => {
    const link = classData?.meetLink || `${window.location.origin}/teacher/online-classes-google-meet/${id}/room`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const launchGoogleMeet = async () => {
    let link = classData?.meetLink;
    if (!link) {
      link = `https://meet.google.com/new`;
    }

    const width = 1180;
    const height = 750;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    const popupFeatures = `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`;
    window.open(link, `FAJR_GoogleMeet_${id}`, popupFeatures);

    try {
      await fetch(`/api/online-classes/${id}/join`, { method: "POST" });
      fetchDetails();
    } catch (e) {
      console.error("Error joining online class:", e);
    }
  };

  const handleEndClass = async () => {
    if (!confirm("Are you sure you want to end this Google Meet class session?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/online-classes/${id}/end`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchDetails();
      } else {
        alert(data.message || "Failed to end class");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs text-slate-400">Loading Google Meet class details...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Google Meet Class Not Found</h2>
        <Link
          href="/teacher/online-classes-google-meet"
          className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
        >
          Back to Google Meet Classes
        </Link>
      </div>
    );
  }

  const isLive = classData.status === "in-progress";
  const isCompleted = classData.status === "completed";

  return (
    <div className="space-y-6 pb-8">
      {/* Top Breadcrumbs & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/teacher/online-classes-google-meet"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Google Meet Online Classes
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDetails}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh details"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            onClick={copyMeetLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied Link!" : "Copy Meet Link"}
          </button>

          <button
            onClick={handleDeleteClass}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {deleting ? "Deleting..." : "Delete Class"}
          </button>
        </div>
      </div>

      {/* Main Details Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-800/30">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              Google Meet Video Classroom
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">{classData.title}</h1>
            {classData.topic && (
              <p className="text-sm text-slate-300">Topic: {classData.topic}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {new Date(classData.scheduledDate).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                {classData.scheduledStartTime} {classData.scheduledEndTime ? `- ${classData.scheduledEndTime}` : `(${classData.duration}m)`}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg capitalize">
                Status:{" "}
                <strong className={`ml-1 font-bold ${
                  isLive ? "text-emerald-400 animate-pulse" : isCompleted ? "text-slate-400" : "text-white"
                }`}>
                  {isLive ? "Live Now" : classData.status}
                </strong>
              </span>
            </div>
          </div>

          {/* Banner Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {!isCompleted && (
              <button
                onClick={launchGoogleMeet}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  isLive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 shadow-emerald-500/30 animate-pulse"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 shadow-emerald-600/30"
                }`}
              >
                <PlayCircle className="w-5 h-5" />
                {isLive ? "Enter Live Google Meet" : "Launch Google Meet"}
              </button>
            )}

            {isLive && (
              <button
                onClick={handleEndClass}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                End Class
              </button>
            )}

            <Link
              href={`/teacher/online-classes-google-meet/${id}/room`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Classroom Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Profiles, Meet Link & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Teacher, Student & Meet Specs */}
        <div className="space-y-6">
          {/* Google Meet Link Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Google Meet Link</span>
              <Video className="w-3.5 h-3.5 text-emerald-600" />
            </h3>

            {classData.meetLink ? (
              <div className="space-y-2">
                <a
                  href={classData.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-300 font-mono text-xs font-bold truncate hover:underline"
                >
                  {classData.meetLink}
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyMeetLink}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied to Clipboard!" : "Copy Meet Link"}
                  </button>

                  <button
                    onClick={launchGoogleMeet}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs">
                No meeting link configured yet. Click "Launch Google Meet" to open a live session.
              </div>
            )}
          </div>

          {/* Teacher Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Teacher</h3>
            {classData.teacher ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
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
                <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
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
              <p className="text-xs text-slate-500">Open to all students / Unassigned</p>
            )}
          </div>

          {/* Google Meet Security Info */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Google Meet Class Specs
            </h3>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <p>• High definition video & screen sharing</p>
              <p>• In-app standalone popup window mode</p>
              <p>• Live session duration & attendance logging</p>
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Records Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Live Attendance Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Participant join events, durations, and attendance tracking
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
                When participants join the Google Meet session or open the classroom hub, their attendance records will appear here.
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
