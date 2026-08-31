'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  Settings,
  Bell,
  LogOut,
  Banknote,
  Menu,
  X,
  Loader2,
  BarChart2,
  Trophy,
  ChevronRight,
  Ticket,
  Crown,
  ClipboardCheck,
  Sparkles,
  BookMarked,
  Video,
  Radio,
  GraduationCap,
} from "lucide-react";

import NoticeModal from "./components/NoticeModal";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { TeacherProvider, useTeacher } from "./TeacherContext";
import { FajrLogo } from "@/components/FajrLogo";
import { clearTeacherCache } from "./apiFetch";

const sidebarNavigation = [
  { name: "Dashboard",          href: "/teacher",                       icon: BarChart2 },
  // { name: "Google Meet Classes", href: "/teacher/online-classes-google-meet", icon: Video },
  { name: "LiveKit Classes",    href: "/teacher/online-classes-liveKit",icon: Radio },
  // { name: "Online Classes",     href: "/teacher/online-classes",        icon: Video },
  { name: "My Classes",         href: "/teacher/class",                 icon: Calendar },

  { name: "Monthly Report",     href: "/teacher/class/monthly",         icon: BarChart2 },
  { name: "My Students",        href: "/teacher/student",               icon: Users },
  { name: "Learning Materials", href: "/teacher/learning-materials",    icon: BookMarked },
  { name: "Salary",             href: "/teacher/salary",                icon: Banknote },
  { name: "Schedule",           href: "/teacher/schedule",              icon: Calendar },
  { name: "Tickets",            href: "/teacher/tickets",               icon: Ticket },
  { name: "CEO Direct Line",    href: "/teacher/ceo-request",           icon: Crown },
  { name: "Leaderboard",        href: "/teacher/leaderboard",           icon: Trophy },
  { name: "Announcements",      href: "/teacher/announcements",         icon: Bell },
  { name: "Settings",           href: "/teacher/settings",              icon: Settings },
];

const bottomNavItems = [
  { name: "Dashboard", href: "/teacher",          icon: BarChart2,     label: "Home" },
  { name: "Classes",   href: "/teacher/class",    icon: Calendar,      label: "Classes" },
  { name: "Schedule",  href: "/teacher/schedule", icon: ClipboardCheck, label: "Schedule" },
  { name: "Salary",    href: "/teacher/salary",   icon: Banknote,      label: "Salary" },
];

// ── Inner shell — uses context, no extra fetches ───────────────────────────────
function TeacherShell({ children }: { children: React.ReactNode }) {
  const { profile, profileLoading } = useTeacher();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [avatarError,  setAvatarError]  = useState(false);
  const [loggingOut,   setLoggingOut]   = useState(false);
  const [totalGems,    setTotalGems]    = useState<number | null>(null);
  const [tierEmoji,    setTierEmoji]    = useState("🌱");
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Load gems once on mount
  useEffect(() => {
    fetch("/api/teacher-portal/gems")
      .then(r => r.json())
      .then(d => {
        if (d?.success) {
          setTotalGems(d.totalGems ?? 0);
          setTierEmoji(d.tier?.emoji ?? "🌱");
        }
      })
      .catch(() => {});
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "T";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const currentPageName =
    sidebarNavigation.find((item) => item.href === pathname)?.name ?? "Teacher Portal";

  // Fire-and-forget visit tracking (no await — doesn't block render)
  useEffect(() => {
    fetch("/api/track-visit", { method: "POST" }).catch(() => {});
  }, []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    clearTeacherCache();           // wipe sessionStorage cache on logout
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    window.location.replace("/login");
  }, [loggingOut]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <NoticeModal />

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 lg:hidden ${
          sidebarOpen
            ? "bg-gray-900/60 backdrop-blur-sm pointer-events-auto"
            : "bg-transparent pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-indigo-950 text-white flex flex-col
          transform transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0 lg:w-64
          ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
      >
        {/* Brand Header with Logo Color Theme & Teacher Portal Badge */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08] flex-shrink-0 bg-[#071326]/95 backdrop-blur-md">
          <Link href="/teacher" className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B1A45] to-[#162C65] border border-[#DFB76C]/40 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-[#DFB76C]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black tracking-tight text-white group-hover:text-[#DFB76C] transition-colors leading-tight">
                FAJR <span className="text-[#DFB76C]">ACADEMY</span>
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#DFB76C]/15 text-[#DFB76C] border border-[#DFB76C]/30">
                  Teacher Portal
                </span>
              </div>
            </div>
          </Link>
          <button
            className="lg:hidden p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-4 border-b border-indigo-800/60 flex-shrink-0 bg-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {profile?.avatar && !avatarError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar as string}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-sm border-2 border-indigo-500">
                  {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : getInitials(profile?.fullName as string)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-indigo-950 rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {profileLoading ? "Loading..." : (profile?.fullName as string) || "Instructor"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] bg-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono tracking-wide border border-indigo-700/50">
                  {profileLoading ? "..." : (profile?.teacherId as string) || "ID NOT SET"}
                </span>
              </div>
              {/* Gems badge — compact pill: 💎 26 */}
              <div className="mt-1.5">
                <span className="inline-flex items-center gap-1 bg-white/10 border border-white/15 px-2 py-0.5 rounded-full">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none">
                    <path d="M12 2L2 9l10 13L22 9z" fill="#4ade80" stroke="#16a34a" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M2 9h20M8 2l-3 7 7 13M16 2l3 7-7 13" stroke="#16a34a" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round"/>
                  </svg>
                  <span className="text-[11px] font-bold text-white leading-none">
                    {totalGems === null ? "..." : totalGems.toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-indigo-800">
          {sidebarNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-indigo-700/80 text-white shadow-sm"
                    : "text-indigo-200 hover:bg-indigo-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? "bg-indigo-600 shadow-sm" : "bg-transparent group-hover:bg-indigo-800"
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-indigo-400 group-hover:text-indigo-200"}`} />
                  </div>
                  {item.name}
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-300" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-indigo-800/60 flex-shrink-0">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-300 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150 disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top Header ── */}
        <header className="relative z-30 h-14 sm:h-16 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-5 lg:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden flex items-center">
              <FajrLogo size="xs" href="/teacher" />
            </div>
            <div className="hidden lg:flex flex-col">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[180px] sm:max-w-none">
                {currentPageName}
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">FAJR Academy Teacher Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>

            {/* Avatar + name */}
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-gray-200 dark:border-slate-800">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  {profileLoading ? "Loading..." : (profile?.fullName as string) || "Instructor"}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
                  {profileLoading ? "" : (profile?.role as string) || "Instructor"}
                </p>
              </div>
              {profile?.avatar && !avatarError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar as string}
                  alt="Avatar"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-gray-200 dark:border-slate-800 shadow-sm"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold border-2 border-indigo-100 dark:border-slate-800 text-xs shadow-sm">
                  {profileLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : getInitials(profile?.fullName as string)}
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors text-sm font-medium active:scale-95 disabled:opacity-60"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Scrollable Content ── */}
        <main className="flex-1 overflow-y-auto p-3 pb-24 sm:p-5 sm:pb-8 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* ── Bottom Navigation (Mobile) ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch justify-around h-16">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/teacher" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative transition-all duration-150 active:scale-95"
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-600 rounded-b-full" />
                )}
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 ${isActive ? "bg-indigo-50 scale-110" : "scale-100"}`}>
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                </div>
                <span className={`text-[10px] font-semibold transition-colors leading-none ${isActive ? "text-indigo-600" : "text-gray-400"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all duration-150 active:scale-95"
          >
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center">
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar as string} alt="" className="w-7 h-7 rounded-xl object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {profileLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : getInitials(profile?.fullName as string)}
                </div>
              )}
            </div>
            <span className="text-[10px] font-semibold text-gray-400 leading-none">More</span>
          </button>
        </div>
      </nav>
      <PWAInstallBanner />
    </div>
  );
}

// ── Root layout — wraps shell with context provider ────────────────────────────
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TeacherProvider>
        <TeacherShell>{children}</TeacherShell>
      </TeacherProvider>
    </ThemeProvider>
  );
}
