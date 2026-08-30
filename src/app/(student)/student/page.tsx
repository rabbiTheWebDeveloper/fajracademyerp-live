"use client";

import { useState, useEffect } from "react";
import {
  BookOpen, CheckSquare, MessageSquare, TrendingUp, Loader2,
  Clock, AlertCircle, Calendar, CreditCard, Award, ArrowRight,
  Sparkles, GraduationCap, Zap, Star, Play, Video, Radio,
} from "lucide-react";
import Link from "next/link";

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
  50:  "#eff6ff",
};

export default function StudentDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/student-portal/dashboard").then(r => r.json()),
      fetch("/api/student-portal/profile").then(r => r.json()),
    ]).then(([dashData, profileData]) => {
      if (dashData.success) setStats(dashData.stats);
      if (profileData.success) setStudent(profileData.student);
      setLoading(false);
    });
  }, []);

  const getGreeting = () => {
    const h = time.getHours();
    if (h < 12) return { text: "Good Morning", emoji: "🌅" };
    if (h < 17) return { text: "Good Afternoon", emoji: "☀️" };
    return { text: "Good Evening", emoji: "🌙" };
  };

  const greeting = getGreeting();
  const dayName = time.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = time.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const quickLinks = [
    { label: "LiveKit Classes", href: "/student/online-classes-liveKit", icon: Radio, color: "#2563eb", bg: "#eff6ff" },
    { label: "Online Classes", href: "/student/online-classes", icon: Video, color: "#0284c7", bg: "#f0f9ff" },
    { label: "My Classes", href: "/student/classes", icon: BookOpen, color: "#059669", bg: "#ecfdf5" },
    { label: "Schedule", href: "/student/schedule", icon: Calendar, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Payments", href: "/student/payments", icon: CreditCard, color: "#d97706", bg: "#fffbeb" },
  ];

  const statCards = [
    {
      label: "Enrolled Courses",
      value: stats?.enrolledCourses ?? 0,
      icon: BookOpen,
      color: NAVY[500],
      bg: NAVY[50],
      border: NAVY[200],
      href: "/student/classes",
      sub: "Currently active",
    },
    {
      label: "Progress",
      value: `${stats?.avgProgress ?? 0}%`,
      icon: TrendingUp,
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      href: "/student/classes",
      sub: "Average completion",
    },
    {
      label: "Assignments",
      value: stats?.pendingAssignments ?? 0,
      icon: CheckSquare,
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      href: "/student/assignments",
      sub: "Pending to do",
    },
    {
      label: "Messages",
      value: stats?.unreadMessages ?? 0,
      icon: MessageSquare,
      color: "#7c3aed",
      bg: "#f5f3ff",
      border: "#ddd6fe",
      href: "/student/messages",
      sub: "Unread",
    },
  ];

  return (
    <div className="space-y-6 pb-4">

      {/* ── Hero greeting banner ── */}
      <div className="relative rounded-3xl overflow-hidden" style={{
        background: `linear-gradient(135deg, ${NAVY[950]} 0%, ${NAVY[800]} 50%, #1e3a8a 100%)`,
        boxShadow: `0 20px 60px rgba(13,27,62,0.35)`,
        minHeight: "168px",
      }}>
        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)" }} />
        <div className="absolute top-6 right-6 w-24 h-24 rounded-full border" style={{ border: "1px solid rgba(96,165,250,0.1)" }} />
        <div className="absolute top-10 right-10 w-12 h-12 rounded-full border" style={{ border: "1px solid rgba(96,165,250,0.15)" }} />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{greeting.emoji}</span>
              <span className="text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: "rgba(147,197,253,0.7)" }}>{greeting.text}</span>
            </div>
            {loading ? (
              <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.1)" }} />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                {student?.fullName?.split(" ")[0] || "Student"} 👋
              </h2>
            )}
            <p className="text-sm mt-2" style={{ color: "rgba(147,197,253,0.7)" }}>
              {dayName}, {dateStr}
            </p>
            {student?.course && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(37,99,235,0.25)", border: "1px solid rgba(96,165,250,0.2)" }}>
                <GraduationCap className="w-3.5 h-3.5" style={{ color: "#93c5fd" }} />
                <span className="text-xs font-medium" style={{ color: "#93c5fd" }}>{student.course}</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <div className="relative">
              {student?.avatar ? (
                <img src={student.avatar} alt="Avatar" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover" style={{ border: "2px solid rgba(96,165,250,0.4)", boxShadow: "0 8px 25px rgba(37,99,235,0.4)" }} />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.4), rgba(29,78,216,0.3))", border: "2px solid rgba(96,165,250,0.3)", color: "white" }}>
                  {student?.fullName?.charAt(0) || "S"}
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 2px 8px rgba(34,197,94,0.5)" }}>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment notice ── */}
      {!loading && stats?.notice && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{
          background: "linear-gradient(135deg, #fff1f2, #ffe4e6)",
          border: "1px solid #fecdd3",
          boxShadow: "0 4px 20px rgba(239,68,68,0.1)",
        }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-red-800 text-sm">Payment Notice</h3>
            <p className="text-sm text-red-600 mt-0.5">{stats.notice.message}</p>
          </div>
          <Link href="/student/payments" className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 12px rgba(239,68,68,0.35)" }}>
            Pay Now
          </Link>
        </div>
      )}

      {/* ── Quick nav grid ── */}
      <div>
        <h3 className="text-xs font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(13,27,62,0.4)" }}>Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.href} href={q.href} className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 active:scale-95" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(13,27,62,0.07)", backdropFilter: "blur(10px)", boxShadow: "0 2px 15px rgba(13,27,62,0.05)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: q.bg }}>
                  <Icon className="w-5 h-5" style={{ color: q.color }} />
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: "rgba(13,27,62,0.65)" }}>{q.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div>
        <h3 className="text-xs font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(13,27,62,0.4)" }}>Your Overview</h3>
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} href={card.href} className="relative p-5 rounded-2xl transition-all duration-200 active:scale-95 group overflow-hidden" style={{
                background: "rgba(255,255,255,0.9)",
                border: `1px solid rgba(13,27,62,0.08)`,
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(13,27,62,0.06)",
              }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: `radial-gradient(circle, ${card.bg} 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: card.color }} />
                </div>
                <div className="relative z-10">
                  {loading ? (
                    <div className="h-8 w-16 rounded-lg animate-pulse mb-1" style={{ background: "rgba(13,27,62,0.08)" }} />
                  ) : (
                    <p className="text-3xl font-black leading-none mb-1" style={{ color: NAVY[900] }}>{card.value}</p>
                  )}
                  <p className="text-xs font-semibold" style={{ color: "rgba(13,27,62,0.6)" }}>{card.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(13,27,62,0.35)" }}>{card.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Schedule card ── */}
      {!loading && (
        <div>
          <h3 className="text-xs font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(13,27,62,0.4)" }}>Assigned Class</h3>
          {stats?.schedule ? (
            <div className="relative rounded-2xl overflow-hidden p-5" style={{
              background: `linear-gradient(135deg, ${NAVY[900]} 0%, ${NAVY[700]} 100%)`,
              boxShadow: `0 12px 40px rgba(13,27,62,0.3)`,
            }}>
              {/* Decorative */}
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)" }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full" style={{ background: "radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)" }} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(37,99,235,0.3)" }}>
                        <Play className="w-3 h-3 text-blue-300" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "rgba(147,197,253,0.6)" }}>Active Class</span>
                    </div>
                    <p className="text-xl font-bold text-white leading-tight">{stats.schedule.course?.title || "Assigned Class"}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <BookOpen className="w-5 h-5 text-blue-300" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Clock className="w-3.5 h-3.5 text-blue-300" />
                    <span className="text-xs font-medium text-blue-100">
                      {stats.schedule.startTime || "TBD"} – {stats.schedule.endTime || "TBD"}
                    </span>
                  </div>
                  {stats.schedule.weekly_days_list?.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Calendar className="w-3.5 h-3.5 text-blue-300" />
                      <span className="text-xs font-medium text-blue-100">
                        {stats.schedule.weekly_days_list.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")}
                      </span>
                    </div>
                  )}
                  {stats.schedule.teacher?.fullName && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Star className="w-3.5 h-3.5 text-yellow-300" />
                      <span className="text-xs font-medium text-blue-100">{stats.schedule.teacher.fullName}</span>
                    </div>
                  )}
                </div>

                <Link href="/student/schedule" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95" style={{
                  background: "rgba(255,255,255,0.95)",
                  color: NAVY[800],
                  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                }}>
                  <Calendar className="w-4 h-4" />
                  View Schedule
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(13,27,62,0.07)", backdropFilter: "blur(10px)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: NAVY[50], border: `1px solid ${NAVY[200]}` }}>
                <BookOpen className="w-7 h-7" style={{ color: NAVY[300] }} />
              </div>
              <p className="font-bold text-sm" style={{ color: NAVY[900] }}>No Schedule Assigned</p>
              <p className="text-xs mt-1" style={{ color: "rgba(13,27,62,0.45)" }}>You haven't been assigned a class schedule yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(13,27,62,0.06)" }} />
          ))}
        </div>
      )}

    </div>
  );
}
