"use client";

import { useState, useEffect } from "react";
import {
  BookOpen, Clock, PlayCircle, TrendingUp, Award, ArrowRight, Zap,
  Calendar, Video, ShieldCheck, Sparkles, ExternalLink, X, CheckCircle2,
  Mic, Camera, Monitor, Radio, UserCheck, Maximize2, Minimize2, PhoneOff, RefreshCw,
  Timer, RotateCw
} from "lucide-react";

const N = { 950:"#060d20",900:"#0d1b3e",800:"#142258",700:"#1a2d70",600:"#1e3a8a",500:"#2563eb",400:"#60a5fa",300:"#93c5fd",200:"#bfdbfe",100:"#dbeafe",50:"#eff6ff" };

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);
  const [popupMeetingSession, setPopupMeetingSession] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micChecked, setMicChecked] = useState(true);
  const [cameraChecked, setCameraChecked] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timer counter for active popup classroom session
  useEffect(() => {
    let interval: any = null;
    if (popupMeetingSession) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [popupMeetingSession]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const openStandaloneClassroom = (session: any) => {
    if (!session?.meetLink) return;
    const width = 1180;
    const height = 750;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));

    const popupFeatures = `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`;

    const popupWin = window.open(session.meetLink, `FAJR_Classroom_${session._id || "Live"}`, popupFeatures);
    if (popupWin) {
      popupWin.focus();
    }

    setPopupMeetingSession({
      ...session,
      startedAt: Date.now(),
      popupWindow: popupWin,
    });
    setSelectedMeeting(null);
  };

  const bringPopupToFront = () => {
    if (popupMeetingSession?.popupWindow && !popupMeetingSession.popupWindow.closed) {
      popupMeetingSession.popupWindow.focus();
    } else if (popupMeetingSession?.meetLink) {
      openStandaloneClassroom(popupMeetingSession);
    }
  };

  const leaveActiveSession = () => {
    if (popupMeetingSession?.popupWindow && !popupMeetingSession.popupWindow.closed) {
      try {
        popupMeetingSession.popupWindow.close();
      } catch {}
    }
    setPopupMeetingSession(null);
    setElapsedSeconds(0);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (history.length > 0) {
      const groups = groupHistoryByMonth(history);
      const months = Object.keys(groups);
      const currentMonthYear = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
      if (months.includes(currentMonthYear)) {
        setSelectedMonth(currentMonthYear);
      } else {
        setSelectedMonth(months[0] || "");
      }
    }
  }, [history]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/student-portal/classes")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP error ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (d && d.success) {
          setClasses(d.classes || []);
          setHistory(d.history || []);
          setActiveSessions(d.activeSessions || []);
        } else {
          setClasses([]);
          setHistory([]);
          setActiveSessions([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load student classes:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const groupHistoryByMonth = (sessions: any[]) => {
    const groups: { [key: string]: any[] } = {};
    sessions.forEach(s => {
      const date = new Date(s.endedAt || s.createdAt);
      const monthYear = date.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(s);
    });
    return groups;
  };

  const groupedHistory = groupHistoryByMonth(history);

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden p-6" style={{ background:`linear-gradient(135deg,${N[950]},${N[800]})`, boxShadow:`0 16px 50px rgba(13,27,62,0.3)` }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full" style={{ background:"radial-gradient(circle,rgba(37,99,235,0.25) 0%,transparent 70%)" }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:"rgba(37,99,235,0.3)", border:"1px solid rgba(96,165,250,0.2)" }}>
            <BookOpen className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">My Classes</h2>
            <p className="text-sm" style={{ color:"rgba(147,197,253,0.7)" }}>Courses you are enrolled in & completed session history</p>
          </div>
        </div>
      </div>

      {/* ── ACTIVE LIVE CLASSROOM COMPANION BANNER (when standalone popup is running) ── */}
      {popupMeetingSession && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#0B1A45] via-[#132B66] to-[#0B1A45] text-white shadow-xl shadow-[#0B1A45]/20 border border-[#DFB76C]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-md">
              <Video className="w-6 h-6 text-[#DFB76C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LIVE CLASS IN PROGRESS
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold text-[#DFB76C] bg-white/10 px-2 py-0.5 rounded-md">
                  <Timer className="w-3.5 h-3.5" />
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1 leading-tight">
                {popupMeetingSession.course?.title || popupMeetingSession.courseTitle || "Live Classroom"}
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Instructor: {popupMeetingSession.teacher?.fullName || "FAJR Academy Teacher"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={bringPopupToFront}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#DFB76C] hover:bg-[#cba458] text-[#0B1A45] font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" /> Focus Classroom Window
            </button>
            <button
              onClick={leaveActiveSession}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" /> End Class
            </button>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      {!loading && (
        <div className="flex bg-gray-100/80 p-1 rounded-2xl w-full sm:w-[360px]" style={{ border: "1px solid rgba(13,27,62,0.06)" }}>
          <button
            onClick={() => setActiveTab("active")}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer text-center"
            style={activeTab === "active" ? {
              background: "white",
              color: N[900],
              boxShadow: "0 4px 12px rgba(13,27,62,0.08)"
            } : {
              color: "rgba(13,27,62,0.45)"
            }}
          >
            Active Courses ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer text-center"
            style={activeTab === "history" ? {
              background: "white",
              color: N[900],
              boxShadow: "0 4px 12px rgba(13,27,62,0.08)"
            } : {
              color: "rgba(13,27,62,0.45)"
            }}
          >
            Class History ({history.length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_,i) => (
            <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background:"rgba(13,27,62,0.07)" }} />
          ))}
        </div>
      ) : activeTab === "active" ? (
        /* ACTIVE COURSES TAB */
        <div className="space-y-6">
          {/* Active Class Sessions (Google Meet Links) */}
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400">Upcoming & Live Sessions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSessions.map((session) => (
                  <div key={session._id} className="relative p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 shadow-sm flex flex-col justify-between gap-3 overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          session.status === "in-progress" ? "bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse" : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                        }`}>
                          {session.status === "in-progress" ? "Live Now" : "Scheduled"}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-gray-900 leading-tight">{session.course?.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-2 capitalize font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {session.dayOfWeek} · {session.startTime} – {session.endTime}
                      </p>
                      {session.teacher?.fullName && (
                        <p className="text-[11px] text-gray-400 mt-1 font-medium">Instructor: {session.teacher.fullName}</p>
                      )}
                    </div>
                    {session.meetLink ? (
                      <button
                        onClick={() => setSelectedMeeting(session)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#0B1A45] hover:bg-[#132B66] text-white text-xs font-bold rounded-xl shadow-md shadow-[#0B1A45]/20 transition-all active:scale-95 text-center mt-1 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5 text-[#DFB76C]" />
                        Enter Live Classroom
                      </button>
                    ) : (
                      <div className="py-2 px-3 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold text-center mt-1">
                        Meeting link will appear when teacher goes live
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrolled Courses */}
          <div>
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-3">Enrolled Courses</h3>
            {classes.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center rounded-3xl text-center" style={{ background:"rgba(255,255,255,0.8)", border:`1px solid ${N[200]}`, backdropFilter:"blur(12px)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:N[50], border:`1px solid ${N[200]}` }}>
                  <BookOpen className="w-8 h-8" style={{ color:N[300] }} />
                </div>
                <p className="font-bold text-lg" style={{ color:N[900] }}>No Classes Yet</p>
                <p className="text-sm mt-1" style={{ color:"rgba(13,27,62,0.45)" }}>You are not enrolled in any classes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((course, idx) => {
                  const prog = course.progress || 0;
                  const createdDate = new Date(course.createdAt || Date.now());
                  const updatedDate = new Date(course.updatedAt || course.createdAt || Date.now());
                  const fmtCreated = mounted
                    ? `${createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${createdDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                    : "";
                  const fmtUpdated = mounted
                    ? `${updatedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${updatedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                    : "";

                  // Find if there is an active/scheduled session for this course
                  const courseSession = activeSessions.find(s => 
                    (s.course?._id && course._id && s.course._id.toString() === course._id.toString()) ||
                    (s.course?.title && course.title && s.course.title.toLowerCase() === course.title.toLowerCase())
                  );
                  const hasMeetLink = courseSession?.meetLink;

                  return (
                    <div key={course._id || course.title || idx} className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl" style={{ background:"rgba(255,255,255,0.9)", border:"1px solid rgba(13,27,62,0.08)", backdropFilter:"blur(12px)", boxShadow:"0 4px 20px rgba(13,27,62,0.06)" }}>
                      {/* Top color bar */}
                      <div className="h-1.5 w-full" style={{ background:`linear-gradient(90deg,#0B1A45,#DFB76C)` }} />

                      <div className="p-5 flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full" style={{ background:N[50], color:N[600], border:`1px solid ${N[200]}` }}>
                            {course.category || "Course"}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-1 rounded-full`}
                            style={course.enrollmentStatus==="active" ? { background:"rgba(34,197,94,0.1)", color:"#16a34a", border:"1px solid rgba(34,197,94,0.2)" } : { background:"rgba(13,27,62,0.07)", color:"rgba(13,27,62,0.5)" }}>
                            {course.enrollmentStatus}
                          </span>
                        </div>

                        <h3 className="font-bold text-base mb-1 leading-tight" style={{ color:N[900] }}>{course.title}</h3>
                        <div className="flex items-center gap-1.5 mb-3">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:N[100] }}>
                            <span className="text-[9px] font-bold" style={{ color:N[700] }}>{course.instructor?.fullName?.charAt(0) || "T"}</span>
                          </div>
                          <p className="text-xs" style={{ color:"rgba(13,27,62,0.5)" }}>{course.instructor?.fullName || "TBA"}</p>
                        </div>

                        {course.schedule && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color:N[400] }} />
                            <span className="text-xs" style={{ color:"rgba(13,27,62,0.5)" }}>{course.schedule}</span>
                          </div>
                        )}

                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium" style={{ color:"rgba(13,27,62,0.5)" }}>Progress</span>
                            <span className="font-bold" style={{ color:N[700] }}>{prog}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background:"rgba(13,27,62,0.08)" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width:`${prog}%`, background:`linear-gradient(90deg,#0B1A45,#DFB76C)` }} />
                          </div>
                        </div>

                        {/* Created & Updated timestamps */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed border-gray-100">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Created At</p>
                            <p className="text-[10px] font-semibold mt-0.5 leading-tight text-gray-600">{fmtCreated || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Last Updated</p>
                            <p className="text-[10px] font-semibold mt-0.5 leading-tight text-gray-600">{fmtUpdated || "—"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-0 flex gap-2">
                        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer" style={{ background:N[50], color:N[700], border:`1px solid ${N[200]}` }}>
                          <BookOpen className="w-3.5 h-3.5" /> Materials
                        </button>
                        {hasMeetLink ? (
                          <button
                            onClick={() => setSelectedMeeting({ ...courseSession, course: { title: course.title }, teacher: course.instructor })}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 text-center cursor-pointer shadow-md shadow-[#0B1A45]/20"
                            style={{ background: "#0B1A45" }}
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-[#DFB76C]" /> Join Classroom
                          </button>
                        ) : (
                          <button disabled className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed transition-all">
                            <PlayCircle className="w-3.5 h-3.5 text-gray-300" /> Awaiting Session
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CLASS HISTORY TAB */
        history.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center rounded-3xl text-center" style={{ background:"rgba(255,255,255,0.8)", border:`1px solid ${N[200]}`, backdropFilter:"blur(12px)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:N[50], border:`1px solid ${N[200]}` }}>
              <Clock className="w-8 h-8" style={{ color:N[300] }} />
            </div>
            <p className="font-bold text-lg" style={{ color:N[900] }}>No Class History</p>
            <p className="text-sm mt-1" style={{ color:"rgba(13,27,62,0.45)" }}>You have not completed any class sessions yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Monthly filter selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white border" style={{ borderColor: N[100], boxShadow: "0 2px 10px rgba(13,27,62,0.03)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                  <Calendar className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Conducted Sessions</span>
                  <span className="text-[10px] text-gray-400">Filter by completed month</span>
                </div>
              </div>
              <div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-[180px] px-3.5 py-2.5 text-xs font-extrabold rounded-xl bg-gray-50 outline-none border transition-all cursor-pointer"
                  style={{ borderColor: N[200], color: N[900] }}
                >
                  {Object.keys(groupedHistory).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Month Group */}
            {selectedMonth && groupedHistory[selectedMonth] && (
              <div className="space-y-4">
                {/* Month header */}
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-base tracking-tight" style={{ color: N[900] }}>
                    {selectedMonth}
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: N[50], color: N[600], border: `1px solid ${N[200]}` }}>
                    {groupedHistory[selectedMonth].length} class{groupedHistory[selectedMonth].length > 1 ? "es" : ""} completed
                  </span>
                  <div className="flex-1 h-px bg-gray-200/80" />
                </div>

                {/* Sessions grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedHistory[selectedMonth].map((session) => {
                    const date = new Date(session.endedAt || session.createdAt);
                    const formattedDate = mounted
                      ? date.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })
                      : "";
                    const formattedTime = mounted
                      ? date.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "";

                    const createdDate = new Date(session.createdAt);
                    const updatedDate = new Date(session.updatedAt || session.createdAt);

                    const formattedCreated = mounted
                      ? `${createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${createdDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                      : "";
                    const formattedUpdated = mounted
                      ? `${updatedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${updatedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                      : "";

                    const isPresent = session.studentAttendance === "present";
                    const isAbsent = session.studentAttendance === "absent";

                    return (
                      <div key={session._id} className="p-5 rounded-2xl flex flex-col justify-between" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(13,27,62,0.08)", backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(13,27,62,0.04)" }}>
                        <div>
                          {/* Card top */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h4 className="font-extrabold text-base leading-snug" style={{ color: N[900] }}>
                                {session.course?.title || "Class Session"}
                              </h4>
                              <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(13,27,62,0.4)" }}>
                                Conducted by {session.teacher?.fullName || "Instructor"}
                              </p>
                            </div>

                            {/* Attendance badge */}
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
                              style={isPresent ? {
                                background: "rgba(34,197,94,0.1)",
                                color: "#16a34a",
                                border: "1px solid rgba(34,197,94,0.2)"
                              } : isAbsent ? {
                                background: "rgba(239,68,68,0.1)",
                                color: "#dc2626",
                                border: "1px solid rgba(239,68,68,0.2)"
                              } : {
                                background: "rgba(107,114,128,0.08)",
                                color: "#4b5563",
                                border: "1px solid rgba(107,114,128,0.15)"
                              }}
                            >
                              {session.studentAttendance === "present" ? "Present" : session.studentAttendance === "absent" ? "Absent" : "Not Marked"}
                            </span>
                          </div>

                          {/* Details row */}
                          <div className="grid grid-cols-2 gap-3 py-3 border-y border-dashed border-gray-100">
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Date & Time</p>
                              <p className="text-xs font-bold leading-normal mt-0.5" style={{ color: N[700] }}>
                                {formattedDate} • {formattedTime}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Conducted Duration</p>
                              <p className="text-xs font-bold leading-normal mt-0.5" style={{ color: N[700] }}>
                                {session.actualDuration || session.duration || 45} mins
                              </p>
                            </div>
                          </div>

                          {/* Created and Updated timestamps */}
                          <div className="grid grid-cols-2 gap-3 pt-3">
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Created At</p>
                              <p className="text-xs font-semibold leading-normal mt-0.5 text-gray-600">
                                {formattedCreated}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Updated At</p>
                              <p className="text-xs font-semibold leading-normal mt-0.5 text-gray-600">
                                {formattedUpdated}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Notes if any */}
                        {session.notes && (
                          <div className="mt-3.5 pt-3.5 border-t border-gray-100/50">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Teacher Notes</p>
                            <p className="text-xs italic leading-relaxed" style={{ color: "rgba(13,27,62,0.6)" }}>
                              &ldquo;{session.notes}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ═══════════ IN-APP LIVE CLASSROOM HUB & SECURE MEETING ORGANIZER ═══════════ */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
            {/* Header with Brand Gradient */}
            <div className="p-6 bg-gradient-to-r from-[#0B1A45] via-[#132B66] to-[#0B1A45] text-white relative flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-md">
                    <Video className="w-6 h-6 text-[#DFB76C]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#DFB76C] text-[#0B1A45]">
                        Live Classroom Hub
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Session Ready
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white mt-1 leading-tight">
                      {selectedMeeting.course?.title || selectedMeeting.courseTitle || "Live Class Session"}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-gray-800">
              {/* Teacher and Class Timing Card */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0B1A45] text-white flex items-center justify-center font-bold text-sm">
                    {selectedMeeting.teacher?.fullName?.charAt(0) || "T"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">Assigned Instructor</p>
                    <p className="text-sm font-extrabold text-gray-900 leading-tight">
                      {selectedMeeting.teacher?.fullName || "FAJR Certified Teacher"}
                    </p>
                  </div>
                </div>
                {selectedMeeting.dayOfWeek && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Class Schedule</p>
                    <p className="text-xs font-extrabold text-[#0B1A45]">
                      {selectedMeeting.dayOfWeek} · {selectedMeeting.startTime} - {selectedMeeting.endTime}
                    </p>
                  </div>
                )}
              </div>

              {/* Student Link Security & Privacy Shield */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-indigo-950">In-App Secure Access Active</p>
                  <p className="text-[11px] text-indigo-700/80 mt-0.5 leading-relaxed">
                    This meeting link is securely bound to your student profile. Direct links are kept private to protect classroom safety and student privacy.
                  </p>
                </div>
              </div>

              {/* Pre-Class Readiness Checklist */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Pre-Class Device Readiness
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMicChecked(!micChecked)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      micChecked
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mic className={`w-4 h-4 ${micChecked ? "text-emerald-600" : "text-gray-400"}`} />
                      <span className="text-xs font-bold">Microphone</span>
                    </div>
                    <CheckCircle2 className={`w-4 h-4 ${micChecked ? "text-emerald-600" : "text-gray-300"}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCameraChecked(!cameraChecked)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      cameraChecked
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Camera className={`w-4 h-4 ${cameraChecked ? "text-emerald-600" : "text-gray-400"}`} />
                      <span className="text-xs font-bold">Camera</span>
                    </div>
                    <CheckCircle2 className={`w-4 h-4 ${cameraChecked ? "text-emerald-600" : "text-gray-300"}`} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {selectedMeeting.meetLink ? (
                  <button
                    type="button"
                    onClick={() => openStandaloneClassroom(selectedMeeting)}
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#0B1A45] via-[#162C65] to-[#0B1A45] hover:brightness-110 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#0B1A45]/30 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Video className="w-5 h-5 text-[#DFB76C]" />
                    Join Live Classroom (Standalone App Mode)
                    <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
                  </button>
                ) : (
                  <div className="w-full py-3.5 px-4 rounded-2xl bg-gray-100 text-gray-400 font-bold text-sm text-center">
                    Session link not yet provided by teacher
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedMeeting(null)}
                  className="w-full py-2 px-4 rounded-xl text-gray-500 hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
