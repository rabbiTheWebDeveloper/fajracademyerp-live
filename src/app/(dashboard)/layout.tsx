"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart2,
  CalendarDays,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  MessageSquare,
  DollarSign,
  Banknote,
  Briefcase,
  Bell,
  Settings,
  Bot,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Shield,
  Star,
  FileSpreadsheet,
  UserCog,
  CalendarCheck,
  FileText,
  Activity,
  Server,
  ScrollText,
  Users2,
  Crown,
  Mail,
  Link2,
} from "lucide-react";
import { ThemeProvider } from "@/context/ThemeContext";
import { PermissionProvider } from "@/context/PermissionContext";
import { hasModuleAction } from "@/lib/permissions";
import { ThemeToggle } from "@/components/ThemeToggle";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { FajrLogo } from "@/components/FajrLogo";

// Flat nav items — each page has its own granular permission
const sidebarNavigation = [
  { name: "Dashboard",            href: "/",                       icon: BarChart2,      permission: "dashboard" },
  { name: "Course Management",    href: "/courses",                icon: BookOpen,       permission: "course-management" },
  { name: "Classes Overview",     href: "/classes",                icon: CalendarDays,   permission: "classrooms" },
  { name: "Monthly Salary Report",href: "/salary-reports/monthly", icon: Banknote,       permission: "salary-report" },
  { name: "Support Tickets",      href: "/support",               icon: MessageSquare,  permission: "support-tickets" },
  { name: "CEO Requests",         href: "/ceo-requests",          icon: Crown,          permission: "ceo-requests" },
  { name: "Finance & Billing",    href: "/finance",               icon: DollarSign,     permission: "finance-billing" },
  { name: "Role & Permission",    href: "/roles",                 icon: Shield,         permission: "roles-permissions" },
  { name: "Global Notices",       href: "/notices",               icon: Bell,           permission: "notice-board" },
  { name: "Email Management",     href: "/emails",                icon: Mail,           permission: "email-management" },
  { name: "Settings",             href: "/settings",              icon: Settings,       permission: "settings" },
];

// Grouped / collapsible nav sections — every child page has its own permission
const sidebarGroups = [
  {
    group: "Student CRM",
    icon: Users,
    permission: "student-crm",
    basePath: "/students",
    children: [
      { name: "Student List", href: "/students", icon: Users, permission: "student-crm" },
      { name: "Student Feedback", href: "/feedback", icon: Star, permission: "student-feedback" },
      { name: "Affiliation Links", href: "/affiliation", icon: Link2, permission: "affiliation-links" },
    ],
  },
  {
    group: "Teacher Management",
    icon: GraduationCap,
    permission: "teacher-management",
    basePath: "/teachers",
    children: [
      { name: "Teacher List", href: "/teachers", icon: Users, permission: "teacher-management" },
      { name: "Teacher Schedule", href: "/teachers/schedule", icon: CalendarDays, permission: "teacher-schedule" },
      { name: "Teacher Category", href: "/teachers/category", icon: Shield, permission: "teacher-category" },
      { name: "Teacher Salaries", href: "/teachers/salary", icon: Banknote, permission: "teacher-salaries" },
      { name: "Teacher Payment Info", href: "/teachers/payment-info", icon: FileSpreadsheet, permission: "teacher-payment-info" },
      { name: "Gems Management", href: "/teachers/gems", icon: Star, permission: "teacher-gems" },
    ],
  },
  {
    group: "Staff Management",
    icon: UserCog,
    permission: "staff-management",
    basePath: "/staff-management",
    children: [
      { name: "Staff List", href: "/staff-management", icon: Users, permission: "staff-management" },
      { name: "Attendance", href: "/staff-management/attendance", icon: CalendarCheck, permission: "staff-attendance" },
      { name: "Leave Requests", href: "/staff-management/leave", icon: FileText, permission: "staff-leave" },
      { name: "Payroll", href: "/staff-management/payroll", icon: Banknote, permission: "staff-payroll" },
      { name: "Daily Reports", href: "/staff-management/daily-reports", icon: ClipboardList, permission: "daily-reports" },
      { name: "Activity Logs", href: "/staff-management/activities", icon: Activity, permission: "activity-logs" },
    ],
  },
  {
    group: "System & Logs",
    icon: Server,
    permission: "system-logs",
    basePath: "/system-health",
    children: [
      { name: "System Health", href: "/system-health", icon: Activity, permission: "system-health" },
      { name: "Audit Logs", href: "/audit-logs", icon: ScrollText, permission: "audit-logs" },
      { name: "Visitor Stats", href: "/visitor-stats", icon: Users2, permission: "visitor-stats" },
    ],
  },
];

function getInitials(name) {
  if (!name) return "FA";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [avatarError, setAvatarError] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  // Auto-expand group if a child is active
  useEffect(() => {
    sidebarGroups.forEach(g => {
      if (g.children.some(c => pathname.startsWith(c.href))) {
        setExpandedGroups(prev => prev.includes(g.group) ? prev : [...prev, g.group]);
      }
    });
  }, [pathname]);

  useEffect(() => {
    const checkAuth = () => {
      fetch("/api/auth/me")
        .then((r) => {
          if (r.status === 401) {
            window.location.href = "/login";
            return;
          }
          return r.json();
        })
        .then((data) => {
          if (data && data.success) setUser(data.user);
        })
        .catch(() => { });
    };

    checkAuth();
    // ✅ OPTIMIZED: was 30s — caused massive function invocations on Vercel.
    // 5 minutes is still fast enough to catch expired sessions.
    const interval = setInterval(checkAuth, 5 * 60 * 1000);

    // ── Track this admin/staff visit (fire-and-forget) ────────────────────
    fetch("/api/track-visit", { method: "POST" }).catch(() => { });

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        window.location.href = "/login";
      }
      return response;
    };

    return () => {
      clearInterval(interval);
      window.fetch = originalFetch;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Segment-safe isActive: /teachers does NOT match /teachers-portal, and
  // /teachers/payment-info is matched BEFORE /teachers (sorted by specificity)
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  // Flat nav match
  const activeNavRoute = sidebarNavigation.find((item) => isActive(item.href));

  // Group child match — sort LONGEST href first so sub-routes win over parent routes.
  // e.g. "/teachers/payment-info" matches before "/teachers" when on that page.
  const activeGroupChild = !activeNavRoute
    ? [...sidebarGroups.flatMap(g => g.children)]
      .sort((a, b) => b.href.length - a.href.length)
      .find(c => isActive(c.href))
    : undefined;
  const activeGroup = activeGroupChild
    ? sidebarGroups.find(g => g.children.some(c => isActive(c.href)))
    : undefined;
  // Combined for page title
  const activeRoute = activeNavRoute || activeGroupChild;

  const hasPermission = () => {
    if (!user) return false;
    // Students and teachers have their own dedicated portals
    if (user.role === "student" || user.role === "teacher") return false;
    if (user.permissions?.includes("*") || user.role === "super-admin") return true;
    if (!activeRoute) return true; // Allow pages not in sidebar
    // Flat nav item — check its own permission
    if (activeNavRoute) return hasModuleAction(user.permissions, activeNavRoute.permission, "read");
    // Group child — check child's own permission if specified, otherwise group permission
    if (activeGroupChild && (activeGroupChild as any).permission) {
      return hasModuleAction(user.permissions, (activeGroupChild as any).permission, "read");
    }
    if (activeGroup) return hasModuleAction(user.permissions, activeGroup.permission, "read");
    return true;
  };

  useEffect(() => {
    if (user) {
      // Role-based portal redirection
      if (user.role === "student") {
        window.location.replace("/student");
        return;
      }
      if (user.role === "teacher") {
        window.location.replace("/teacher");
        return;
      }
      if (user.role === "staff" && pathname === "/") {
        const hasDash =
          user.permissions?.includes("*") ||
          user.role === "super-admin" ||
          hasModuleAction(user.permissions, "dashboard", "read");
        if (!hasDash) {
          window.location.replace("/staff");
          return;
        }
      }

      if (pathname === "/") {
        const isSuper = user.permissions?.includes("*") || user.role === "super-admin";
        const hasDash = hasModuleAction(user.permissions, "dashboard", "read");
        if (!isSuper && !hasDash) {
          const firstAllowedFlat = sidebarNavigation.find(item =>
            item.href !== "/" && hasModuleAction(user.permissions, item.permission, "read")
          );
          const firstAllowedChild = sidebarGroups.flatMap(g => g.children).find(c =>
            hasModuleAction(user.permissions, c.permission, "read")
          );
          const target = firstAllowedFlat?.href || firstAllowedChild?.href;
          if (target) {
            router.replace(target);
          }
        }
      }
    }
  }, [user, pathname, router]);

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#04070f]">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#060b18] border-r border-gray-200 dark:border-white/[0.06] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0B1A45] flex items-center justify-center shadow-lg">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#0B1A45] dark:text-white tracking-tight">
              FAJR <span className="font-normal opacity-80">Academy</span>
            </span>
          </div>
          <button
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600 rounded-md"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

          {/* User Card at TOP */}
          {user && (
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-amber-900/10 dark:to-yellow-900/5">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/40 dark:border-amber-500/40 shadow-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center text-sm font-bold shadow-lg border-2 border-amber-400/30">
                      {getInitials(user.fullName)}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-[#060b18] rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{user.fullName}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 capitalize font-medium">{user.role?.replace("-", " ")}</p>
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
            {/* ── Dashboard (Flat nav item) ── */}
            {sidebarNavigation.filter(item => {
              if (item.href !== "/") return false;
              if (!user) return false;
              if (user.permissions?.includes("*") || user.role === "super-admin") return true;
              return hasModuleAction(user.permissions, item.permission, "read");
            }).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${active
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/30 shadow-sm"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-slate-200"
                    }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300"
                    }`} />
                  <span className="truncate flex-1">{item.name}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-1 text-amber-400 dark:text-amber-500" />}
                </Link>
              );
            })}

            {/* ── Grouped / collapsible sections ── */}
            {sidebarGroups.filter(g => {
              if (!user) return false;
              if (user.permissions?.includes("*") || user.role === "super-admin") return true;
              const hasGroupPerm = hasModuleAction(user.permissions, g.permission, "read");
              const hasAnyChildPerm = g.children.some((child: any) =>
                child.permission && hasModuleAction(user.permissions, child.permission, "read")
              );
              return hasGroupPerm || hasAnyChildPerm;
            }).map((group) => {
              const GroupIcon = group.icon;
              const isExpanded = expandedGroups.includes(group.group);
              const isGroupActive = group.children.some(c => isActive(c.href));
              return (
                <div key={group.group}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${isGroupActive
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/30"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-slate-200"
                      }`}
                  >
                    <GroupIcon className={`w-5 h-5 flex-shrink-0 ${isGroupActive ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300"
                      }`} />
                    <span className="truncate flex-1 text-left">{group.group}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                      }`} />
                  </button>

                  {/* Children */}
                  {isExpanded && (
                    <div className="ml-4 mt-0.5 border-l-2 border-amber-100 dark:border-amber-800/30 pl-3 space-y-0.5">
                      {group.children.filter((child: any) => {
                        if (!user) return false;
                        if (user.permissions?.includes("*") || user.role === "super-admin") return true;
                        if (child.permission) return hasModuleAction(user.permissions, child.permission, "read");
                        return true;
                      }).map((child) => {
                        const ChildIcon = child.icon;
                        const active = isActive(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all group ${active
                                ? "bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300"
                                : "text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-800 dark:hover:text-slate-200"
                              }`}
                          >
                            <ChildIcon className={`w-4 h-4 flex-shrink-0 ${active ? "text-amber-500 dark:text-amber-400" : "text-gray-400 dark:text-slate-600 group-hover:text-gray-600 dark:group-hover:text-slate-300"
                              }`} />
                            <span className="truncate flex-1">{child.name}</span>
                            {active && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Other Flat nav items ── */}
            {sidebarNavigation.filter(item => {
              if (item.href === "/") return false;
              if (!user) return false;
              if (user.permissions?.includes("*") || user.role === "super-admin") return true;
              return hasModuleAction(user.permissions, item.permission, "read");
            }).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${active
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                    }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400"
                    }`} />
                  <span className="truncate flex-1">{item.name}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-1 text-blue-400 dark:text-blue-500" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top Header */}
          <header className="relative z-30 h-16 flex-shrink-0 bg-white dark:bg-[#060b18] border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate hidden sm:block">
                {activeRoute?.name || "Operations Manager Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />

              <Link
                href="/notifications"
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
              </Link>

              <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-slate-800">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                    {user?.fullName || "Loading..."}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role?.replace("-", " ") || "Admin"}
                  </p>
                </div>
                <div className="relative">
                  {user?.avatar && !avatarError ? (
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 dark:border-slate-800 shadow-sm"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                      {getInitials(user?.fullName)}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 dark:bg-[#04070f]">
            <div className="w-full max-w-[1650px] mx-auto space-y-5">
              {!user ? (
                <div className="flex justify-center p-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : !hasPermission() ? (
                pathname === "/" ? (
                  <div className="flex justify-center items-center p-12 mt-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    <p className="ml-3 text-gray-500 font-medium">Redirecting to your dashboard...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Shield className="w-16 h-16 text-gray-300 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                      You do not have permission to view this page. Please contact your administrator if you believe this is a mistake.
                    </p>
                    <Link href="/" className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Go to Dashboard
                    </Link>
                  </div>
                )
              ) : (
                <PermissionProvider user={user}>
                  {children}
                </PermissionProvider>
              )}
            </div>
          </main>
        </div>
        <PWAInstallBanner />
      </div>
    </ThemeProvider>
  );
}
