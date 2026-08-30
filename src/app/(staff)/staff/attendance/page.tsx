"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck, CheckCircle2, XCircle, Clock,
  ChevronLeft, ChevronRight, User, RefreshCw, AlertCircle,
} from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const today = new Date();

const statusMap: Record<string, { label: string; pill: string; dot: string }> = {
  present:  { label: "Present",   pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  absent:   { label: "Absent",    pill: "bg-red-100 text-red-600",         dot: "bg-red-400"     },
  late:     { label: "Late",      pill: "bg-amber-100 text-amber-700",     dot: "bg-amber-400"   },
  "half-day":{ label: "Half Day", pill: "bg-orange-100 text-orange-700",   dot: "bg-orange-400"  },
  "on-leave":{ label: "On Leave", pill: "bg-sky-100 text-sky-700",         dot: "bg-sky-400"     },
  holiday:  { label: "Holiday",   pill: "bg-violet-100 text-violet-700",   dot: "bg-violet-400"  },
};

export default function AttendancePage() {
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear]   = useState(today.getFullYear());
  const [records, setRecords] = useState<any[]>([]);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markedIn, setMarkedIn] = useState(false);
  const [marking, setMarking]   = useState(false);
  const [error, setError] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);

  // Load logged-in staff ID
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d?.success) setStaffId(d.user?.staffId || d.user?._id || null);
    });
  }, []);

  const fetchMonthData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      const [monthRes, todayRes] = await Promise.all([
        fetch(`/api/staff/attendance?month=${monthStr}&limit=100`),
        fetch(`/api/staff/attendance?date=${today.toISOString().split("T")[0]}&limit=50`),
      ]);
      const [monthData, todayData] = await Promise.all([monthRes.json(), todayRes.json()]);
      if (monthData.success)  setRecords(monthData.records  || []);
      if (todayData.success)  setTodayRecords(todayData.records || []);
    } catch {
      setError("Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchMonthData(); }, [fetchMonthData]);

  // Check if current user already marked today
  useEffect(() => {
    if (!staffId || !todayRecords.length) return;
    const mine = todayRecords.find(r => (r.staff?._id || r.staff) === staffId);
    if (mine && mine.status === "present") setMarkedIn(true);
  }, [todayRecords, staffId]);

  const handleMarkAttendance = async () => {
    if (!staffId) { setError("Could not identify your staff account."); return; }
    setMarking(true);
    setError("");
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const res = await fetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff: staffId,
          date: now.toISOString(),
          status: "present",
          checkInTime: timeStr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMarkedIn(true);
        fetchMonthData();
      } else {
        setError(data.message || "Failed to mark attendance.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setMarking(false);
    }
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build date→status map for calendar
  const dateStatusMap: Record<string, string> = {};
  records.forEach(r => {
    const d = new Date(r.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      dateStatusMap[d.getDate()] = r.status;
    }
  });

  const summary = Object.values(dateStatusMap).reduce(
    (acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track daily attendance for all staff members</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchMonthData} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleMarkAttendance}
            disabled={markedIn || marking || !staffId}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all
              ${markedIn
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"}`}
          >
            {marking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
            {markedIn ? "Checked In ✓" : marking ? "Marking..." : "Mark My Attendance"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Present",  value: summary["present"]  || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Late",     value: summary["late"]     || 0, icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50"   },
          { label: "Absent",   value: summary["absent"]   || 0, icon: XCircle,      color: "text-red-600",     bg: "bg-red-50"     },
          { label: "On Leave", value: summary["on-leave"] || 0, icon: CalendarCheck,color: "text-sky-600",     bg: "bg-sky-50"     },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 ${bg} flex items-center gap-3`}>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</p>
              <p className="text-xs font-medium text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-sm font-bold text-slate-900">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const status = dateStatusMap[day];
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dot = status ? statusMap[status]?.dot : null;
              return (
                <div key={day} className={`text-center py-1.5 rounded-lg transition-colors
                  ${isToday ? "bg-violet-600 text-white font-bold" : "hover:bg-slate-100"}`}>
                  <span className={`text-xs ${isToday ? "text-white" : "text-slate-700"}`}>{day}</span>
                  {dot && !isToday && <span className={`w-1.5 h-1.5 rounded-full mx-auto mt-0.5 block ${dot}`} />}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {[["bg-emerald-400","Present"],["bg-amber-400","Late"],["bg-red-400","Absent"],["bg-sky-400","Leave"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${c}`} />
                <span className="text-xs text-slate-500">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's staff list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Today — {today.toLocaleDateString("en-US",{month:"short",day:"numeric"})}
            </h3>
            <span className="text-xs text-slate-400">{todayRecords.length} records</span>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          ) : todayRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No attendance records for today yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-50">
                    <th className="px-5 py-3 text-left font-semibold">Staff</th>
                    <th className="px-5 py-3 text-left font-semibold">Dept</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-left font-semibold">Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {todayRecords.map((r) => {
                    const s = statusMap[r.status] || statusMap.absent;
                    return (
                      <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            {r.staff?.avatar ? (
                              <img src={r.staff.avatar} alt={r.staff.fullName} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-violet-400" />
                              </div>
                            )}
                            <span className="font-semibold text-slate-800">{r.staff?.fullName || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500 capitalize">{r.staff?.department?.replace(/-/g," ")}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs font-mono text-slate-500">{r.checkInTime || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
