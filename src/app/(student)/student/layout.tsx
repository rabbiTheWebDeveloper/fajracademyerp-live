"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Settings,
  Bell,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  FileText,
  CreditCard,
  Award,
  MoreHorizontal,
  ChevronRight,
  Video,
  Radio,
} from "lucide-react";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { FajrLogo } from "@/components/FajrLogo";

/* ─── All navigation items ─── */
const allNavItems = [
  { name: "Dashboard", href: "/student", icon: LayoutDashboard, emoji: "🏠" },
  { name: "LiveKit Classes", href: "/student/online-classes-liveKit", icon: Radio, emoji: "📡" },
  // { name: "Online Classes", href: "/student/online-classes", icon: Video, emoji: "🎥" },
  { name: "My Classes", href: "/student/classes", icon: BookOpen, emoji: "📚" },
  { name: "Demo Classes", href: "/student/demo-classes", icon: BookOpen, emoji: "📚" },
  { name: "Schedule", href: "/student/schedule", icon: Calendar, emoji: "🗓️" },
  { name: "Payments", href: "/student/payments", icon: CreditCard, emoji: "💳" },
  { name: "Certificate", href: "/student/certificate", icon: Award, emoji: "🏆" },
  { name: "Feedback", href: "/student/feedback", icon: FileText, emoji: "💬" },
  { name: "Settings", href: "/student/settings", icon: Settings, emoji: "⚙️" },
];

const bottomTabs = allNavItems.slice(0, 4);
const moreItems = allNavItems.slice(4);

// Brand navy palette
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

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [hasNotif, setHasNotif] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/student"
      ? pathname === "/student"
      : pathname.startsWith(href) && href !== "/student";

  const currentItem = allNavItems.find(
    (item) =>
      item.href === pathname ||
      (pathname !== "/student" && pathname.startsWith(item.href) && item.href !== "/student")
  );
  const currentPage = currentItem?.name || "Dashboard";

  const isMoreActive = moreItems.some((item) => isActive(item.href));

  const getInitials = (name: string) => {
    if (!name) return "ST";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      } else {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/student-portal/profile");
        if (res.status === 401) { window.location.href = "/login"; return; }
        const data = await res.json();
        if (data.success) setStudent(data.student);
      } catch (e) { console.error(e); }
    };
    fetchProfile();

    // ── Track this student's visit (fire-and-forget) ──────────────────────
    fetch("/api/track-visit", { method: "POST" }).catch(() => {});

    const interval = setInterval(fetchProfile, 30000);
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      if (response.status === 401) window.location.href = "/login";
      return response;
    };
    return () => { clearInterval(interval); window.fetch = originalFetch; };
  }, []);


  useEffect(() => {
    setMoreOpen(false);
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <ThemeProvider>
      <div className="flex h-[100dvh] overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-slate-950 dark:to-slate-900">

      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(6,13,32,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ═══════════ DESKTOP SIDEBAR ═══════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: `linear-gradient(180deg, ${NAVY[950]} 0%, ${NAVY[900]} 40%, #0f2356 100%)`,
          boxShadow: "4px 0 40px rgba(13,27,62,0.4)",
        }}
      >
        {/* Brand Header with Logo Color Theme & Student Portal Badge */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08] flex-shrink-0 bg-[#071326]/95 backdrop-blur-md">
          <Link href="/student" className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B1A45] to-[#162C65] border border-[#DFB76C]/40 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
              <BookOpen className="w-4 h-4 text-[#DFB76C]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black tracking-tight text-white group-hover:text-[#DFB76C] transition-colors leading-tight">
                FAJR <span className="text-[#DFB76C]">ACADEMY</span>
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#DFB76C]/15 text-[#DFB76C] border border-[#DFB76C]/30">
                  Student Portal
                </span>
              </div>
            </div>
          </Link>
          <button className="lg:hidden p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student profile card */}
        {student && (
          <div className="mx-4 my-4 p-4 rounded-2xl flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(29,78,216,0.1))", border: "1px solid rgba(96,165,250,0.15)" }}>
            <div className="flex items-center gap-3">
              {student.avatar && !avatarError ? (
                <img
                  src={student.avatar}
                  alt="Profile"
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  style={{ border: "2px solid rgba(96,165,250,0.5)", boxShadow: "0 4px 15px rgba(37,99,235,0.3)" }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", boxShadow: "0 4px 15px rgba(37,99,235,0.4)", fontSize: "16px" }}>
                  {getInitials(student.fullName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-sm truncate leading-tight">{student.fullName}</p>
                <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "rgba(147,197,253,0.8)" }}>{student.studentId}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-green-400">Active Student</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          <p className="text-[10px] font-semibold tracking-[0.15em] px-3 mb-3" style={{ color: "rgba(147,197,253,0.4)" }}>NAVIGATION</p>
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative"
                style={active ? {
                  background: "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(29,78,216,0.2))",
                  border: "1px solid rgba(96,165,250,0.25)",
                  color: "white",
                } : {
                  color: "rgba(147,197,253,0.7)",
                  border: "1px solid transparent",
                }}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: "#60a5fa" }} />}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200" style={active ? { background: "rgba(37,99,235,0.4)" } : { background: "rgba(255,255,255,0.05)" }}>
                  <Icon className="w-4 h-4" style={{ color: active ? "#93c5fd" : "rgba(147,197,253,0.6)" }} />
                </div>
                <span className="flex-1">{item.name}</span>
                {active && <ChevronRight className="w-4 h-4 opacity-60" style={{ color: "#93c5fd" }} />}
              </Link>
            );
          })}
        </nav>

        {/* Logout at bottom */}
        <div className="p-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <Link href="/login" onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors w-full" style={{ color: "rgba(248,113,113,0.8)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            Log Out
          </Link>
        </div>
      </aside>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── Top Header ── */}
        <header className="relative z-30 flex-shrink-0 flex items-center justify-between px-3.5 sm:px-6 bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 backdrop-blur-md shadow-xs h-14 sm:h-16">
          <div className="flex items-center gap-2.5">
            <button
              className="flex lg:hidden w-9 h-9 items-center justify-center rounded-xl transition-colors border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer active:scale-95"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-gray-900 dark:text-white leading-tight truncate max-w-[150px] sm:max-w-none">
                {currentPage}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">Student Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            {/* Notification bell */}
            <button
              className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer active:scale-95"
              onClick={() => setHasNotif(false)}
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              {hasNotif && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-xs" />}
            </button>

            {/* Avatar + name */}
            <div className="flex items-center gap-2 pl-2 sm:pl-2.5 sm:ml-1 border-l border-gray-200 dark:border-slate-800">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-white truncate max-w-[120px]">{student?.fullName || "Student"}</p>
                <p className="text-[11px] font-mono text-indigo-500 dark:text-indigo-400">{student?.studentId}</p>
              </div>
              {student?.avatar && !avatarError ? (
                <img
                  src={student.avatar}
                  alt="Profile"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border-2 border-indigo-200 dark:border-slate-800 shadow-xs"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm bg-gradient-to-br from-[#0B1A45] to-[#162C65] text-[#DFB76C] border border-[#DFB76C]/30 shadow-xs">
                  {getInitials(student?.fullName || "")}
                </div>
              )}
            </div>

            <Link href="/login" onClick={handleLogout} className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl transition-colors border border-red-200/50 dark:border-slate-800 bg-red-50/20 dark:bg-slate-800/40 text-red-500 dark:text-red-400 ml-1 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer" title="Log Out">
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto pb-[calc(90px+env(safe-area-inset-bottom,16px))] sm:pb-8">
          <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* ═══════════ MOBILE MORE BOTTOM SHEET ═══════════ */}
      {moreOpen && (
        <>
          {/* Dimmed backdrop */}
          <div
            className="fixed inset-0 z-40 transition-opacity duration-300 sm:hidden bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          {/* Slide up sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] overflow-hidden animate-slide-up sm:hidden bg-white dark:bg-[#071326] border-t border-gray-200 dark:border-white/10 shadow-2xl pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
            {/* Grabber handle */}
            <div className="flex justify-center pt-3.5 pb-1.5">
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            <div className="px-5 pt-2">
              <p className="text-[10px] font-bold tracking-[0.25em] px-2 mb-3.5 text-gray-400 dark:text-gray-500">MORE OPTIONS</p>
              <div className="space-y-1.5">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                        active
                          ? "bg-[#0B1A45]/10 dark:bg-white/10 text-[#0B1A45] dark:text-white font-bold border border-[#0B1A45]/20 dark:border-white/20"
                          : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        active ? "bg-[#0B1A45] text-[#DFB76C]" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm">{item.name}</span>
                      <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                    </Link>
                  );
                })}
                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-white/10">
                  <Link href="/login" onClick={handleLogout} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/40">
                      <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-sm font-semibold">Log Out</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ MOBILE BOTTOM TAB BAR ═══════════ */}
      <nav className="fixed bottom-[calc(10px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 sm:hidden rounded-2xl bg-white/95 dark:bg-[#071326]/95 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-xl shadow-black/10">
        <div className="flex items-stretch justify-around h-[64px] px-1">
          {bottomTabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200 active:scale-95"
              >
                <div
                  className={`w-11 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    active ? "bg-[#0B1A45] text-[#DFB76C] shadow-sm" : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span
                  className={`text-[10px] font-extrabold tracking-tight transition-colors duration-300 ${
                    active ? "text-[#0B1A45] dark:text-[#DFB76C]" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {item.name.replace("My ", "")}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <div
              className={`w-11 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${
                isMoreActive || moreOpen ? "bg-[#0B1A45] text-[#DFB76C] shadow-sm" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <MoreHorizontal className="w-4.5 h-4.5" />
            </div>
            <span
              className={`text-[10px] font-extrabold tracking-tight transition-colors duration-300 ${
                isMoreActive || moreOpen ? "text-[#0B1A45] dark:text-[#DFB76C]" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(37,99,235,0.2); border-radius: 4px; }
      `}</style>
      <PWAInstallBanner />
    </div>
  </ThemeProvider>
);
}
