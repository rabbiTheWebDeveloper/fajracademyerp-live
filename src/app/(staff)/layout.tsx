"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarCheck, FileText, DollarSign,
  ClipboardList, Activity, Settings, LogOut, Menu, X,
  ChevronRight, Bell, Users,
} from "lucide-react";
import { FajrLogo } from "@/components/FajrLogo";

const NAV = [
  { label: "Overview",          href: "/staff",                   icon: LayoutDashboard },
  { label: "Attendance",        href: "/staff/attendance",         icon: CalendarCheck },
  { label: "Leave Application", href: "/staff/leave",              icon: FileText },
  { label: "Salary & Payroll",  href: "/staff/payroll",            icon: DollarSign },
  { label: "Daily Reports",     href: "/staff/daily-reports",      icon: ClipboardList },
  { label: "Activity Tracker",  href: "/staff/activity-tracker",   icon: Activity },
  { label: "Settings",          href: "/staff/settings",           icon: Settings },
];

function getInitials(name: string) {
  if (!name) return "SF";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d?.success) setUser(d.user); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const isActive = (href: string) =>
    href === "/staff" ? pathname === "/staff" : pathname.startsWith(href);

  const activeItem = NAV.find((n) => isActive(n.href));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-slate-200 shadow-sm
          transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <FajrLogo size="sm" href="/staff" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Staff
            </span>
          </div>
          <button className="lg:hidden p-1 text-slate-400 hover:text-slate-600" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white">
                  {getInitials(user.fullName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-xs text-violet-600 capitalize font-medium">{user.role?.replace(/-/g, " ")}</p>
              </div>
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${active ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors
                  ${active ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                <span className="truncate">{label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 hidden sm:block">{activeItem?.label ?? "Staff Portal"}</h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.fullName ?? "Staff Member"}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role?.replace(/-/g, " ") ?? "staff"}</p>
              </div>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-8 h-8 rounded-full object-cover border-2 border-slate-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  {getInitials(user?.fullName ?? "")}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
