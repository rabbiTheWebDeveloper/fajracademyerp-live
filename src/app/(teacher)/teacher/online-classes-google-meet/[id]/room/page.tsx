"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  ExternalLink,
  Copy,
  Check,
  PlayCircle,
  StopCircle,
  ArrowLeft,
  Loader2,
  Clock,
  UserCheck,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Users,
  AlertCircle,
  Maximize2,
  RefreshCw,
} from "lucide-react";

export default function TeacherGoogleMeetRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [micChecked, setMicChecked] = useState(true);
  const [cameraChecked, setCameraChecked] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const popupRef = useRef<Window | null>(null);

  // Fetch Class Details
  const fetchClassDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/online-classes/${id}`);
      const data = await res.json();
      if (data.success && data.class) {
        setClassData(data.class);
        if (data.class.status === "in-progress" && data.class.startedAt) {
          setIsSessionActive(true);
          const diffSec = Math.floor((Date.now() - new Date(data.class.startedAt).getTime()) / 1000);
          setElapsedSeconds(Math.max(0, diffSec));
        }
      }
    } catch (err) {
      console.error("Failed to load class details in Google Meet room:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassDetails();
  }, [fetchClassDetails]);

  // Session Duration Timer
  useEffect(() => {
    if (!isSessionActive) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Attendance leave beacon on unmount
  useEffect(() => {
    const handleUnload = () => {
      try {
        navigator.sendBeacon(`/api/online-classes/${id}/leave`);
      } catch (_) {}
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [id]);

  const copyLink = () => {
    const link = classData?.meetLink || `https://meet.google.com`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const launchGoogleMeetPopup = async () => {
    let meetUrl = classData?.meetLink;
    if (!meetUrl) {
      meetUrl = "https://meet.google.com/new";
    }

    const width = 1180;
    const height = 750;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    const popupFeatures = `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`;

    const popupWin = window.open(meetUrl, `FAJR_GoogleMeet_${id}`, popupFeatures);
    if (popupWin) {
      popupRef.current = popupWin;
      popupWin.focus();
    }

    // Call join endpoint to mark class in-progress & start attendance
    try {
      await fetch(`/api/online-classes/${id}/join`, { method: "POST" });
      setIsSessionActive(true);
      fetchClassDetails();
    } catch (e) {
      console.error("Error joining online class:", e);
    }
  };

  const bringPopupToFront = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
    } else {
      launchGoogleMeetPopup();
    }
  };

  const handleEndSession = async () => {
    if (!confirm("Are you sure you want to end this Google Meet class session and save attendance?")) return;
    setActionLoading(true);
    try {
      if (popupRef.current && !popupRef.current.closed) {
        try {
          popupRef.current.close();
        } catch (_) {}
      }

      const res = await fetch(`/api/online-classes/${id}/end`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsSessionActive(false);
        router.push(`/teacher/online-classes-google-meet/${id}`);
      } else {
        alert(data.message || "Failed to end session");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Connecting to Google Meet Classroom</h2>
          <p className="text-xs text-slate-400">Loading class session and room parameters...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold">Class Session Not Found</h2>
        <Link
          href="/teacher/online-classes-google-meet"
          className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
        >
          Back to Google Meet Classes
        </Link>
      </div>
    );
  }

  const isCompleted = classData.status === "completed";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Top Header Navigation ── */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/teacher/online-classes-google-meet/${id}`}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Class Details"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isSessionActive ? "bg-emerald-400" : "bg-teal-400"
                } opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSessionActive ? "bg-emerald-500" : "bg-teal-500"
                }`}></span>
              </span>
              <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-400">
                Google Meet Classroom Hub
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-white line-clamp-1">
              {classData.title}
            </h1>
          </div>
        </div>

        {/* Live Timer and Session Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-emerald-400">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <button
            onClick={copyLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied Link!" : "Copy Link"}
          </button>

          {!isCompleted && (
            <button
              onClick={handleEndSession}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
              End Session
            </button>
          )}
        </div>
      </header>

      {/* ── Main Host Dashboard Body ── */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Launcher Card & Device Readiness */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Launcher Stage Card */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isSessionActive ? "Session In Progress" : "Ready to Launch"}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Launch Google Meet Classroom
                </h2>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  Click below to open Google Meet in a dedicated standalone application window while keeping this host hub open to manage session time and student attendance.
                </p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-500/10">
                <Video className="w-7 h-7" />
              </div>
            </div>

            {/* Meet Link Preview Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 truncate max-w-full">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Google Meet URL</p>
                <p className="font-mono text-xs font-semibold text-emerald-400 truncate">
                  {classData.meetLink || "https://meet.google.com"}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={copyLink}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>

                <a
                  href={classData.meetLink || "https://meet.google.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  New Tab
                </a>
              </div>
            </div>

            {/* Device Readiness Checklist */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pre-Class Device Readiness
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMicChecked(!micChecked)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    micChecked
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : "bg-slate-800/40 border-slate-700/60 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {micChecked ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-slate-500" />}
                    <span className="text-xs font-bold">Microphone Active</span>
                  </div>
                  <Check className={`w-4 h-4 ${micChecked ? "text-emerald-400" : "text-slate-600"}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setCameraChecked(!cameraChecked)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    cameraChecked
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : "bg-slate-800/40 border-slate-700/60 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {cameraChecked ? <Camera className="w-4 h-4 text-emerald-400" /> : <CameraOff className="w-4 h-4 text-slate-500" />}
                    <span className="text-xs font-bold">Camera Active</span>
                  </div>
                  <Check className={`w-4 h-4 ${cameraChecked ? "text-emerald-400" : "text-slate-600"}`} />
                </button>
              </div>
            </div>

            {/* Launch Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={launchGoogleMeetPopup}
                className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:brightness-110 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Video className="w-5 h-5 text-emerald-200" />
                {isSessionActive ? "Re-Open Live Classroom" : "Launch Google Meet (Standalone App Mode)"}
                <Maximize2 className="w-4 h-4 ml-1 opacity-80" />
              </button>

              {isSessionActive && (
                <button
                  type="button"
                  onClick={bringPopupToFront}
                  className="w-full sm:w-auto py-4 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  Bring to Front
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Student Details & Class Summary */}
        <div className="space-y-6">
          {/* Assigned Student Card */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Student Information
            </h3>

            {classData.student ? (
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base flex-shrink-0 border border-emerald-500/30">
                  {classData.student.avatar ? (
                    <img src={classData.student.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    classData.student.fullName?.charAt(0) || "S"
                  )}
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-bold text-white truncate">{classData.student.fullName}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">ID: {classData.student.studentId || "Student"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{classData.student.email || classData.student.phone}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Unassigned or open to group students.</p>
            )}
          </div>

          {/* Session Overview Card */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-3.5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-400" />
              Session Details
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              {classData.course?.title && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Course:</span>
                  <span className="font-semibold text-white truncate max-w-[180px]">{classData.course.title}</span>
                </div>
              )}
              {classData.subject && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-semibold text-white">{classData.subject}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scheduled:</span>
                <span className="font-semibold text-white">
                  {classData.scheduledStartTime} {classData.scheduledEndTime ? `- ${classData.scheduledEndTime}` : `(${classData.duration}m)`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Platform:</span>
                <span className="font-bold text-emerald-400">Google Meet</span>
              </div>
            </div>

            {classData.notes && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Notes</p>
                <p className="text-xs text-slate-400 leading-relaxed">{classData.notes}</p>
              </div>
            )}
          </div>

          {/* Security & Attendance Specs */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800/80 p-5 space-y-2.5 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              Automated Attendance Telemetry
            </div>
            <p className="leading-relaxed text-[11px]">
              When you launch this Google Meet classroom, your host attendance is automatically marked and session duration is tracked until you click End Session.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
