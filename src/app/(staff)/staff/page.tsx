"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck, FileText, DollarSign,
  ClipboardList, Activity, Settings, ArrowRight,
  CheckCircle2, Clock, RefreshCw,
  Banknote, Building2, BadgeCheck, Phone, Mail,
  UserCircle2, TrendingUp, ShieldCheck, CalendarDays, AlertTriangle,
} from "lucide-react";

const TODAY      = new Date();
const dayName    = TODAY.toLocaleDateString("en-US", { weekday: "long" });
const dateFull   = TODAY.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const todayStr   = TODAY.toISOString().split("T")[0];
const monthStr   = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}`;

const quickLinks = [
  { label: "Mark Attendance",     href: "/staff/attendance",       icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Apply for Leave",     href: "/staff/leave",            icon: FileText,      color: "text-amber-600",   bg: "bg-amber-50"   },
  { label: "View Payslip",        href: "/staff/payroll",          icon: DollarSign,    color: "text-sky-600",     bg: "bg-sky-50"     },
  { label: "Submit Daily Report", href: "/staff/daily-reports",    icon: ClipboardList, color: "text-violet-600",  bg: "bg-violet-50"  },
  { label: "Log Activity",        href: "/staff/activity-tracker", icon: Activity,      color: "text-rose-600",    bg: "bg-rose-50"    },
  { label: "Settings",            href: "/staff/settings",         icon: Settings,      color: "text-slate-600",   bg: "bg-slate-100"  },
];

function getInitials(name: string) {
  if (!name) return "SF";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

const ATTENDANCE_STYLE: Record<string, string> = {
  present:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  absent:     "bg-red-100 text-red-700 border-red-200",
  late:       "bg-amber-100 text-amber-700 border-amber-200",
  "on-leave": "bg-blue-100 text-blue-700 border-blue-200",
  "half-day": "bg-purple-100 text-purple-700 border-purple-200",
};

export default function StaffOverviewPage() {
  const [user, setUser]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [todayAtt, setTodayAtt]       = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [myLeaves, setMyLeaves]       = useState<any[]>([]);
  const [myReports, setMyReports]     = useState<any[]>([]);
  const [myPayroll, setMyPayroll]     = useState<any>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const meRes  = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meData.success) return;
        const me = meData.user;
        setUser(me);

        const staffMongoId = me._id;

        const [attRes, leaveRes, reportsRes, payrollRes] = await Promise.all([
          fetch(`/api/staff/attendance?staffId=${staffMongoId}&date=${todayStr}&limit=1`),
          fetch(`/api/staff/leave?staffId=${staffMongoId}&limit=5`),
          fetch(`/api/staff/daily-reports?staffId=${staffMongoId}&limit=4`),
          fetch(`/api/staff/payroll?staffId=${staffMongoId}&month=${monthStr}&limit=1`),
        ]);

        const [attData, leaveData, reportsData, payrollData] = await Promise.all([
          attRes.json(), leaveRes.json(), reportsRes.json(), payrollRes.json(),
        ]);

        setTodayAtt(attData.records?.[0] || null);
        setLeaveBalance(me.leaveBalance || null);
        setMyLeaves(leaveData.leaves || []);
        setMyReports(reportsData.reports || []);
        setMyPayroll(payrollData.payrolls?.[0] || null);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-white/70 font-medium">{dayName}, {dateFull}</p>
            <h2 className="text-2xl font-bold mt-1">
              {loading ? "Welcome back!" : `Good day, ${user?.fullName?.split(" ")[0] || "Staff"}! 👋`}
            </h2>
            <p className="text-sm text-white/70 mt-1">
              {user?.designation
                ? `${user.designation} · ${(user?.department || "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}`
                : "Here's your workplace overview for today."}
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link href="/staff/attendance" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold backdrop-blur-sm transition-all">
                Mark Attendance →
              </Link>
              <Link href="/staff/daily-reports" className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold transition-all">
                Submit Report →
              </Link>
            </div>
          </div>
          {!loading && user && (
            <div className="hidden sm:flex flex-col items-center gap-2">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.fullName} className="w-16 h-16 rounded-full object-cover border-4 border-white/40 shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 border-4 border-white/40 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                  {getInitials(user.fullName)}
                </div>
              )}
              <span className="text-xs text-white/70 font-mono">{user.staffId || ""}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today</p>
          </div>
          {loading ? (
            <div className="h-8 bg-slate-100 rounded animate-pulse" />
          ) : todayAtt ? (
            <span className={`self-start px-3 py-1.5 rounded-full text-xs font-bold border capitalize ${ATTENDANCE_STYLE[todayAtt.status] ?? "bg-gray-100 text-gray-600"}`}>
              {todayAtt.status}
            </span>
          ) : (
            <span className="self-start px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-500 border-slate-200">Not marked</span>
          )}
          <p className="text-xs text-slate-400 mt-2">
            {todayAtt?.checkInTime ? `Check-in: ${todayAtt.checkInTime}` : "No check-in yet"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sick Leave</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin text-slate-300" /> : leaveBalance?.sickLeave ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">days remaining</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Casual Leave</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin text-slate-300" /> : leaveBalance?.casualLeave ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">days remaining</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">This Month</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
            ) : myPayroll ? (
              `৳${(myPayroll.netSalary ?? myPayroll.basicSalary ?? 0).toLocaleString()}`
            ) : (
              `৳${(user?.basicSalary ?? 0).toLocaleString()}`
            )}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {myPayroll ? (
              <span className={`capitalize font-medium ${myPayroll.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                {myPayroll.status}
              </span>
            ) : "Basic salary"}
          </p>
        </div>
      </div>

      {/* Profile + Quick Links + Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserCircle2 className="w-4 h-4 text-violet-500" /> My Profile
          </h3>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : (
            <>
              <InfoRow icon={BadgeCheck}  label="Staff ID"    value={user?.staffId || "—"} />
              <InfoRow icon={Building2}   label="Department"  value={(user?.department || "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} />
              <InfoRow icon={ShieldCheck} label="Designation" value={user?.designation || "—"} />
              <InfoRow icon={Mail}        label="Email"       value={user?.email || "—"} />
              <InfoRow icon={Phone}       label="Phone"       value={user?.phone || "—"} />
              <InfoRow icon={TrendingUp}  label="Status"      value={(user?.status || "active").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} />
            </>
          )}
          <Link href="/staff/settings" className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Edit Profile <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map(({ label, href, icon: Icon, color, bg }) => (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl ${bg} hover:scale-[1.03] transition-all text-center`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className={`text-xs font-semibold ${color}`}>{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-violet-500" /> My Reports
            </h3>
            <Link href="/staff/daily-reports" className="text-xs text-violet-600 font-semibold hover:text-violet-700 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : myReports.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">No reports submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {myReports.map((r: any) => (
                <div key={r._id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-violet-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.title || "Daily Report"}</p>
                    <p className="text-xs text-slate-400">
                      {r.date ? new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </p>
                  </div>
                  {r.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${
                      r.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      r.status === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                    }`}>{r.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Leave Applications */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">My Leave Applications</h3>
          </div>
          <Link href="/staff/leave" className="text-xs text-violet-600 font-semibold hover:text-violet-700 flex items-center gap-1">
            Apply / View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin text-slate-300" /></div>
        ) : myLeaves.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">No leave applications yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-50">
                  <th className="px-5 py-3 text-left font-semibold">Type</th>
                  <th className="px-5 py-3 text-left font-semibold">From</th>
                  <th className="px-5 py-3 text-left font-semibold">To</th>
                  <th className="px-5 py-3 text-left font-semibold">Days</th>
                  <th className="px-5 py-3 text-left font-semibold">Reason</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {myLeaves.map((l: any) => (
                  <tr key={l._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800 capitalize">{(l.leaveType || "").replace(/-/g, " ") || "—"}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {l.fromDate ? new Date(l.fromDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {l.toDate ? new Date(l.toDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{l.totalDays}d</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 max-w-[160px] truncate">{l.reason || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${
                        l.status === "approved" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        l.status === "rejected" ? "bg-red-100 text-red-600 border-red-200" :
                        "bg-amber-100 text-amber-700 border-amber-200"
                      }`}>
                        {l.status === "pending" ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {l.status}
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
  );
}
