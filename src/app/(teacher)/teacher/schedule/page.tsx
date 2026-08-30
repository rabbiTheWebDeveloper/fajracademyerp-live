"use client";

import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  CheckCircle2,
  Video,
  User,
  Sparkles,
  Coffee,
  CalendarDays,
  ListFilter,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

interface Student {
  _id?: string;
  fullName?: string;
  email?: string;
  studentId?: string;
}

interface Course {
  _id?: string;
  title?: string;
}

interface DayTime {
  day: string;
  startTime: string;
  endTime: string;
  duration?: number;
}

interface ScheduleItem {
  _id: string;
  dayOfWeek?: string;
  weekly_days_list?: string[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  day_times?: DayTime[];
  type?: "live" | "recorded" | "hybrid";
  course?: Course;
  student?: Student;
  isActive?: boolean;
}

interface TimeSlot {
  isFree: boolean;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  item?: ScheduleItem;
  status?: "ongoing" | "upcoming" | "completed" | "free";
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/** Converts time strings like "09:00", "9:30 AM", "14:15", "2:30 PM" to minutes from midnight */
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes("PM");
  const isAM = str.includes("AM");
  
  const clean = str.replace(/(AM|PM)/g, "").trim();
  const parts = clean.split(":");
  let hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** Formats minutes from midnight into 12-hour AM/PM string */
function minutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
}

/** Pretty print raw time string */
function formatTime(timeStr?: string): string {
  if (!timeStr) return "TBD";
  const mins = parseTimeToMinutes(timeStr);
  return minutesToDisplay(mins);
}

export default function TeacherSchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("today"); // "today" | "weekly" | "monday" | ...
  const [now, setNow] = useState<Date>(new Date());

  // Realtime clock ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch schedule data
  useEffect(() => {
    fetch("/api/teacher-portal/schedule")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.schedules)) {
          setSchedules(d.schedules);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load teacher schedule:", err);
        setLoading(false);
      });
  }, []);

  // Current Day info
  const currentDayIndex = (now.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
  const todayKey = DAY_KEYS[currentDayIndex];
  const todayName = DAYS_OF_WEEK[currentDayIndex];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper to filter schedule items for a given day with day-specific times
  const getSchedulesForDay = (dayKey: string) => {
    return schedules
      .filter((s) => {
        const singleDayMatch = s.dayOfWeek && s.dayOfWeek.toLowerCase() === dayKey;
        const listDayMatch =
          Array.isArray(s.weekly_days_list) &&
          s.weekly_days_list.some((d) => d.toLowerCase() === dayKey);
        const dayTimesMatch =
          Array.isArray(s.day_times) &&
          s.day_times.some((dt) => dt.day?.toLowerCase() === dayKey);
        return singleDayMatch || listDayMatch || dayTimesMatch;
      })
      .map((s) => {
        const dt = Array.isArray(s.day_times)
          ? s.day_times.find((d) => d.day?.toLowerCase() === dayKey)
          : null;

        const effectiveStartTime = dt?.startTime || s.startTime || "";
        const effectiveDuration = Number(dt?.duration) || Number(s.duration) || 45;
        const effectiveEndTime =
          dt?.endTime ||
          s.endTime ||
          (effectiveStartTime ? minutesToDisplay(parseTimeToMinutes(effectiveStartTime) + effectiveDuration) : "");

        return {
          ...s,
          startTime: effectiveStartTime,
          endTime: effectiveEndTime,
          duration: effectiveDuration,
        };
      });
  };

  // Today's schedule items
  const todayItems = useMemo(() => getSchedulesForDay(todayKey), [schedules, todayKey]);


  // Process timeline slots (including free slots) for a specific day
  const buildTimelineForDay = (dayKey: string): TimeSlot[] => {
    const dayClasses = getSchedulesForDay(dayKey);
    
    // Sort classes chronologically
    const sorted = [...dayClasses].sort((a, b) => {
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });

    if (sorted.length === 0) {
      return [];
    }

    const slots: TimeSlot[] = [];
    const isToday = dayKey === todayKey;

    // Working hours boundaries: 8:00 AM (480) to 8:00 PM (1200)
    let lastEndMinutes = 480; // 8:00 AM

    sorted.forEach((item) => {
      const startMins = parseTimeToMinutes(item.startTime);
      const endMins = parseTimeToMinutes(item.endTime) || startMins + 60;

      // Check for free gap before this class
      if (startMins > lastEndMinutes + 15) {
        slots.push({
          isFree: true,
          startTime: minutesToDisplay(lastEndMinutes),
          endTime: minutesToDisplay(startMins),
          startMinutes: lastEndMinutes,
          endMinutes: startMins,
          status: "free",
        });
      }

      // Determine class status
      let status: "ongoing" | "upcoming" | "completed" = "upcoming";
      if (isToday) {
        if (currentMinutes >= startMins && currentMinutes < endMins) {
          status = "ongoing";
        } else if (currentMinutes >= endMins) {
          status = "completed";
        } else {
          status = "upcoming";
        }
      }

      slots.push({
        isFree: false,
        startTime: item.startTime ? formatTime(item.startTime) : minutesToDisplay(startMins),
        endTime: item.endTime ? formatTime(item.endTime) : minutesToDisplay(endMins),
        startMinutes: startMins,
        endMinutes: endMins,
        item,
        status,
      });

      lastEndMinutes = Math.max(lastEndMinutes, endMins);
    });

    // Check for free slot after last class until 8:00 PM (1200)
    if (lastEndMinutes < 1200 - 30) {
      slots.push({
        isFree: true,
        startTime: minutesToDisplay(lastEndMinutes),
        endTime: minutesToDisplay(1200),
        startMinutes: lastEndMinutes,
        endMinutes: 1200,
        status: "free",
      });
    }

    return slots;
  };

  // Check current status right now (Ongoing Class vs Free)
  const currentOngoingSlot = useMemo(() => {
    return todayItems.find((s) => {
      const start = parseTimeToMinutes(s.startTime);
      const end = parseTimeToMinutes(s.endTime) || start + 60;
      return currentMinutes >= start && currentMinutes < end;
    });
  }, [todayItems, currentMinutes]);

  // Next upcoming class today
  const nextUpcomingSlot = useMemo(() => {
    return todayItems
      .filter((s) => parseTimeToMinutes(s.startTime) > currentMinutes)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))[0];
  }, [todayItems, currentMinutes]);

  const activeDayKey = activeTab === "today" ? todayKey : activeTab === "weekly" ? todayKey : activeTab;
  const activeTimelineSlots = useMemo(() => buildTimelineForDay(activeDayKey), [schedules, activeDayKey, currentMinutes]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-semibold backdrop-blur-md mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
            <span>Teacher Portal Routine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Class Schedule & Routine
          </h1>
          <p className="text-sm text-slate-300">
            {todayName}, {now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <div className="pt-2">
            <Link
              href="/teacher/student"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/15 shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-300" />
              Manage Student Routines & Times
            </Link>
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div className="relative z-10 shrink-0">
          {currentOngoingSlot ? (
            <div className="bg-rose-500/20 border border-rose-500/40 backdrop-blur-md p-4 rounded-2xl flex items-center gap-3.5 shadow-lg">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.0 w-3.0 bg-rose-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                  IN CLASS RIGHT NOW (ক্লাস চলছে)
                </p>
                <p className="text-sm font-bold text-white line-clamp-1">
                  {currentOngoingSlot.course?.title || "Live Session"}
                </p>
                <p className="text-xs text-rose-200 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatTime(currentOngoingSlot.startTime)} - {formatTime(currentOngoingSlot.endTime)}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md p-4 rounded-2xl flex items-center gap-3.5 shadow-lg">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  FREE RIGHT NOW (এখন খালি আছেন)
                </p>
                {nextUpcomingSlot ? (
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Next Class: <span className="font-semibold">{nextUpcomingSlot.course?.title || "Class"}</span> at {formatTime(nextUpcomingSlot.startTime)}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-200 mt-0.5">No more classes scheduled for today.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Overview Statistics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Today's Classes</p>
            <p className="text-xl font-extrabold text-gray-900">{todayItems.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Free Slots Today</p>
            <p className="text-xl font-extrabold text-gray-900">
              {buildTimelineForDay(todayKey).filter((s) => s.isFree).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Weekly Total</p>
            <p className="text-xl font-extrabold text-gray-900">{schedules.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Current Status</p>
            <p className={`text-sm font-extrabold ${currentOngoingSlot ? "text-rose-600" : "text-emerald-600"}`}>
              {currentOngoingSlot ? "In Class" : "Available"}
            </p>
          </div>
        </div>
      </div>

      {/* ── View Filter Navigation Tabs ── */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === "today"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Today's Schedule ({todayName})
          </button>

          <button
            onClick={() => setActiveTab("weekly")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === "weekly"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Full Weekly Routine
          </button>
        </div>

        {/* Day selection pill tabs */}
        <div className="hidden lg:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {DAY_KEYS.map((dayKey, idx) => {
            const isToday = dayKey === todayKey;
            const isSelected = activeTab === dayKey;
            return (
              <button
                key={dayKey}
                onClick={() => setActiveTab(dayKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  isSelected
                    ? "bg-white text-indigo-700 shadow-sm"
                    : isToday
                    ? "text-indigo-600 font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {DAYS_OF_WEEK[idx].slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content Area ── */}
      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : activeTab === "weekly" ? (
        /* ══════════════════════════════════════
           FULL WEEKLY ROUTINE GRID
        ══════════════════════════════════════ */
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              7-Day Class Timetable
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              Highlighting Today ({todayName})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            {DAY_KEYS.map((dayKey, idx) => {
              const dayName = DAYS_OF_WEEK[idx];
              const isToday = dayKey === todayKey;
              const daySchedules = getSchedulesForDay(dayKey);

              return (
                <div
                  key={dayKey}
                  className={`min-h-[300px] flex flex-col ${
                    isToday ? "bg-indigo-50/30" : "bg-white"
                  }`}
                >
                  <div
                    className={`p-3 text-center border-b ${
                      isToday
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-gray-100/70 text-gray-700 font-semibold"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wider">{dayName}</p>
                    {isToday && (
                      <span className="inline-block mt-0.5 text-[9px] bg-white/20 px-2 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 space-y-2 flex-1 overflow-y-auto">
                    {daySchedules.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-10">
                        <Coffee className="w-6 h-6 text-gray-300 mb-1" />
                        <p className="text-[11px] text-gray-400 font-medium">Free Day</p>
                      </div>
                    ) : (
                      daySchedules.map((s, i) => (
                        <div
                          key={s._id || i}
                          className="p-3 rounded-xl border bg-white border-indigo-100 shadow-sm hover:border-indigo-300 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-bold text-xs text-gray-900 line-clamp-2 leading-tight">
                              {s.course?.title || "Class"}
                            </h4>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
                              {s.type || "Live"}
                            </span>
                          </div>

                          {s.student && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                              <User className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate font-medium">{s.student.fullName}</span>
                            </div>
                          )}

                          <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                            <span className="flex items-center gap-1 text-indigo-600 font-bold">
                              <Clock className="w-3 h-3" />
                              {formatTime(s.startTime)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span>{formatTime(s.endTime)}</span>
                              {s.duration && (
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-semibold">
                                  {s.duration}m
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════
           TODAY'S / SINGLE DAY DETAILED TIMELINE
        ══════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-5 h-5 text-indigo-600" />
              Detailed Timeline & Free Slots — <span className="text-indigo-600 capitalize">{activeDayKey === todayKey ? `Today (${todayName})` : activeDayKey}</span>
            </h3>
            <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
              {activeTimelineSlots.filter((s) => !s.isFree).length} Classes, {activeTimelineSlots.filter((s) => s.isFree).length} Free Slots
            </span>
          </div>

          {activeTimelineSlots.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center justify-center">
              <Coffee className="w-12 h-12 text-gray-300 mb-3" />
              <h4 className="text-lg font-bold text-gray-800">No Classes Scheduled</h4>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                You are completely free on this day! No scheduled class slots found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTimelineSlots.map((slot, index) => {
                if (slot.isFree) {
                  return (
                    /* ── FREE SLOT CARD ── */
                    <div
                      key={`free-${index}`}
                      className="bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/30 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <Coffee className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100/80">
                              Free Slot (খালি সময়)
                            </span>
                            <span className="text-xs font-semibold text-emerald-600">
                              Available Time
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mt-1">
                            No class scheduled between {slot.startTime} and {slot.endTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-white px-3 py-2 rounded-xl border border-emerald-100 shrink-0">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </div>
                    </div>
                  );
                }

                // ── CLASS TIME SLOT CARD ──
                const item = slot.item!;
                const isOngoing = slot.status === "ongoing";
                const isCompleted = slot.status === "completed";

                return (
                  <div
                    key={item._id || index}
                    className={`rounded-2xl border p-5 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden ${
                      isOngoing
                        ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20"
                        : isCompleted
                        ? "bg-gray-50/70 border-gray-200 opacity-80"
                        : "bg-white border-gray-200 hover:border-indigo-200"
                    }`}
                  >
                    {isOngoing && (
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                    )}

                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          isOngoing
                            ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                            : isCompleted
                            ? "bg-gray-200 text-gray-500"
                            : "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                        }`}
                      >
                        <Video className="w-6 h-6" />
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isOngoing && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-rose-500 text-white px-2.5 py-0.5 rounded-full animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              Live Now
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                          {!isOngoing && !isCompleted && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              Scheduled
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                            {item.type || "Live"} Class
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-gray-900 leading-snug">
                          {item.course?.title || "Assigned Class Session"}
                        </h4>

                        {item.student && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 pt-0.5">
                            <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-gray-800">{item.student.fullName}</span>
                            {item.student.email && (
                              <span className="text-gray-400">({item.student.email})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action / Time Info */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900 bg-gray-100/80 px-3.5 py-2 rounded-xl">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span>
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {item.duration && (
                          <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-gray-200 ml-1">
                            {item.duration} mins
                          </span>
                        )}
                      </div>

                      {item.type === "live" && isOngoing && (
                        <button className="w-full sm:w-auto px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2">
                          <Video className="w-4 h-4" />
                          Join Live Class Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
