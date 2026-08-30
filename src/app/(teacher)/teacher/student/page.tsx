"use client";

import { useState, useEffect } from "react";
import {
  Users, Search, Loader2, User, BookOpen, AlertCircle,
  Plus, X, CheckCircle2, Copy, CalendarDays, UserPlus, RefreshCw, Trash2,
  Clock, Pencil, UserMinus, History, ClipboardList, Sparkles, Zap, ArrowRight,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive:  "bg-gray-50 text-gray-600 border-gray-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  "at-risk": "bg-amber-50 text-amber-700 border-amber-200",
};

/* ─── Success credential card after creation ─── */
function CredentialCard({ student, plainPassword, onClose }: { student: any; plainPassword: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    const text = `Student: ${student.fullName}\nStudent ID: ${student.studentId}\nEmail: ${student.email || "—"}\nPassword: ${plainPassword}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Green top banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold">Student Added Successfully!</h3>
          <p className="text-sm text-white/80 mt-1">Share these credentials with the student</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Student ID */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Student ID (Auto-generated)</p>
            <p className="text-lg font-bold font-mono text-indigo-700">{student.studentId}</p>
          </div>
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={copyAll}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors text-sm font-semibold"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DURATION_OPTIONS = [
  { label: "15 mins", value: 15 },
  { label: "30 mins", value: 30 },
  { label: "45 mins (Standard)", value: 45 },
  { label: "60 mins (1 hr)", value: 60 },
  { label: "90 mins (1.5 hrs)", value: 90 },
  { label: "120 mins (2 hrs)", value: 120 },
];

function calcEndTimeStr(startStr: string, durMins: number = 45): string {
  if (!startStr) return "";
  const [h, m] = startStr.split(":").map(Number);
  if (isNaN(h)) return "";
  const total = (h || 0) * 60 + (m || 0) + Number(durMins || 45);
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function formatTime12(time24?: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
}

/* ─── Add / Edit Student Modal ─── */
function AddStudentModal({
  teacherInfo,
  editingStudent,
  onClose,
  onSuccess,
}: {
  teacherInfo: any;
  editingStudent?: any;
  onClose: () => void;
  onSuccess: (student: any, plainPassword: string) => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    course: "",
    gender: "",
    classStartingDate: "",
    // Schedule
    weeklyDaysCount: "",
    weeklyDays:    [] as string[],
    startTime:     "",
    endTime:       "",
    duration:      45 as number,
    dayTimes:      [] as { day: string; startTime: string; endTime: string; duration: number }[],
    classType:     "live" as string,
    effectiveFrom: "",
  });

  // Populate form if editing
  useEffect(() => {
    if (editingStudent) {
      const sch = editingStudent.schedule;
      const initialDays: string[] = sch?.weekly_days_list || [];
      const initialDuration = Number(sch?.duration) || 45;
      const initialStart = sch?.startTime || "";
      const initialEnd = sch?.endTime || calcEndTimeStr(initialStart, initialDuration);

      const existingDayTimes: { day: string; startTime: string; endTime: string; duration: number }[] = sch?.day_times || [];
      const populatedDayTimes = initialDays.map((d: string) => {
        const found = existingDayTimes.find((dt: any) => dt.day?.toLowerCase() === d.toLowerCase());
        const dStart = found?.startTime || initialStart;
        const dDur = Number(found?.duration) || initialDuration;
        const dEnd = found?.endTime || calcEndTimeStr(dStart, dDur);
        return {
          day: d.toLowerCase(),
          startTime: dStart,
          endTime: dEnd,
          duration: dDur,
        };
      });

      setForm({
        fullName: editingStudent.fullName || "",
        phone: editingStudent.phone || "",
        course: editingStudent.course || "",
        gender: editingStudent.gender || "",
        classStartingDate: editingStudent.classStartingDate ? new Date(editingStudent.classStartingDate).toISOString().split('T')[0] : "",
        weeklyDaysCount: sch?.weekly_days?.toString() || (initialDays.length > 0 ? initialDays.length.toString() : ""),
        weeklyDays: initialDays,
        startTime: initialStart,
        endTime: initialEnd,
        duration: initialDuration,
        dayTimes: populatedDayTimes,
        classType: sch?.type || "live",
        effectiveFrom: sch?.effectiveFrom ? new Date(sch?.effectiveFrom).toISOString().split('T')[0] : "",
      });
    }
  }, [editingStudent]);

  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  const setField = (f: string, v: any) => {
    setForm(p => ({ ...p, [f]: v }));
  };

  const handleDefaultStartTimeChange = (newStart: string) => {
    const newEnd = calcEndTimeStr(newStart, form.duration);
    setForm(p => {
      const updatedDayTimes = p.dayTimes.map(dt => ({
        ...dt,
        startTime: dt.startTime || newStart,
        endTime: dt.endTime || calcEndTimeStr(dt.startTime || newStart, dt.duration || p.duration),
      }));
      return {
        ...p,
        startTime: newStart,
        endTime: newEnd,
        dayTimes: updatedDayTimes,
      };
    });
  };

  const handleDefaultDurationChange = (newDur: number) => {
    const newEnd = calcEndTimeStr(form.startTime, newDur);
    setForm(p => {
      const updatedDayTimes = p.dayTimes.map(dt => ({
        ...dt,
        duration: newDur,
        endTime: calcEndTimeStr(dt.startTime || p.startTime, newDur),
      }));
      return {
        ...p,
        duration: newDur,
        endTime: newEnd,
        dayTimes: updatedDayTimes,
      };
    });
  };

  const toggleDay = (day: string) => {
    setForm(p => {
      const isSelected = p.weeklyDays.includes(day);
      const newDays = isSelected
        ? p.weeklyDays.filter(d => d !== day)
        : [...p.weeklyDays, day];

      let newDayTimes = isSelected
        ? p.dayTimes.filter(dt => dt.day !== day)
        : [
            ...p.dayTimes,
            {
              day,
              startTime: p.startTime || "",
              duration: p.duration || 45,
              endTime: p.endTime || calcEndTimeStr(p.startTime || "", p.duration || 45),
            },
          ];

      return {
        ...p,
        weeklyDays: newDays,
        weeklyDaysCount: newDays.length > 0 ? newDays.length.toString() : "",
        dayTimes: newDayTimes,
      };
    });
  };

  const handleDayTimeChange = (day: string, field: "startTime" | "duration", val: any) => {
    setForm(p => {
      const updatedDayTimes = p.dayTimes.map(dt => {
        if (dt.day.toLowerCase() !== day.toLowerCase()) return dt;
        const newStart = field === "startTime" ? val : dt.startTime;
        const newDur = field === "duration" ? Number(val) : (dt.duration || p.duration || 45);
        const newEnd = calcEndTimeStr(newStart, newDur);
        return {
          ...dt,
          [field]: field === "duration" ? Number(val) : val,
          endTime: newEnd,
        };
      });
      return { ...p, dayTimes: updatedDayTimes };
    });
  };

  const applyDefaultToAllDays = () => {
    if (!form.startTime) return;
    const end = calcEndTimeStr(form.startTime, form.duration);
    setForm(p => ({
      ...p,
      dayTimes: p.weeklyDays.map(d => ({
        day: d,
        startTime: p.startTime,
        duration: p.duration,
        endTime: end,
      })),
    }));
  };

  const copyDayTimeToAll = (sourceDay: string) => {
    const source = form.dayTimes.find(dt => dt.day.toLowerCase() === sourceDay.toLowerCase());
    if (!source) return;
    setForm(p => ({
      ...p,
      dayTimes: p.weeklyDays.map(d => ({
        day: d,
        startTime: source.startTime,
        duration: source.duration,
        endTime: source.endTime,
      })),
    }));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError("");  
    setSaving(true);
    const isEdit = !!editingStudent;
    const url = isEdit ? `/api/teacher-portal/students/${editingStudent._id}` : "/api/teacher-portal/students";
    const method = isEdit ? "PUT" : "POST";

    try {
      const payload = {
        ...form,
        duration: Number(form.duration) || 45,
        dayTimes: form.dayTimes,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { setApiError(data.message || `Failed to ${isEdit ? 'update' : 'add'} student.`); return; }
      onSuccess(data.student, isEdit ? "" : data.plainPassword);
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" /> {editingStudent ? "Edit Student Details" : "Add New Student"}
            </h3>
            {editingStudent && (
              <p className="text-xs text-gray-400 mt-0.5">
                Assigned to Teacher ID:{" "}
                <span className="font-mono font-bold text-indigo-600">
                  {teacherInfo?.teacherId || "Loading..."}
                </span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {editingStudent ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {apiError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {apiError}
            </div>
          )}
          {/* ── Schedule Section ── */}
          <div className="pt-2 mt-2 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Class Schedule <span className="text-xs font-normal text-gray-400">(optional)</span>
              </h4>
              {form.weeklyDays.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {form.weeklyDays.length} {form.weeklyDays.length === 1 ? "day" : "days"} selected
                </span>
              )}
            </div>
            
            {/* Top Row: Weekly Days Count, Default Start Time & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Weekly Days</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={form.weeklyDaysCount}
                  onChange={e => setField("weeklyDaysCount", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none bg-white transition-all"
                  placeholder="e.g. 3"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Start Time</label>
                <div className="relative">
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => handleDefaultStartTimeChange(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none bg-white transition-all font-mono"
                  />
                  <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Class Duration</label>
                <select
                  value={form.duration}
                  onChange={e => handleDefaultDurationChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none bg-white transition-all"
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Default Time Summary Banner */}
            {form.startTime && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Default Session:</span>
                  <span className="font-bold text-gray-900">{formatTime12(form.startTime)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-bold text-gray-900">{formatTime12(form.endTime || calcEndTimeStr(form.startTime, form.duration))}</span>
                  <span className="text-slate-500">({form.duration} mins)</span>
                </div>
                {form.weeklyDays.length > 1 && (
                  <button
                    type="button"
                    onClick={applyDefaultToAllDays}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    title="Apply this time & duration to all selected days"
                  >
                    <Zap className="w-3 h-3" /> Apply to All
                  </button>
                )}
              </div>
            )}

            {/* Select Days Pills */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Class Days</label>
              <div className="flex flex-wrap gap-1.5">
                {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(day => {
                  const isSelected = form.weeklyDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span>{day}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Day-wise Time & Duration Customization ── */}
            {form.weeklyDays.length > 0 && (
              <div className="pt-2 border-t border-dashed border-gray-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Day-wise Class Time & Duration
                  </p>
                  <span className="text-[10px] text-gray-400 font-medium">
                    Adjust specific times per day if needed
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {form.weeklyDays.map((day) => {
                    const dayTime = form.dayTimes.find(dt => dt.day.toLowerCase() === day.toLowerCase()) || {
                      day,
                      startTime: form.startTime || "",
                      duration: form.duration || 45,
                      endTime: form.endTime || calcEndTimeStr(form.startTime, form.duration),
                    };

                    return (
                      <div
                        key={day}
                        className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-indigo-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        {/* Day Name */}
                        <div className="flex items-center justify-between sm:justify-start gap-2 sm:w-28 shrink-0">
                          <span className="font-bold text-gray-900 capitalize text-xs">
                            {day}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold sm:hidden">
                            {day.slice(0, 3)}
                          </span>
                        </div>

                        {/* Start Time Picker */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative flex-1">
                            <input
                              type="time"
                              value={dayTime.startTime}
                              onChange={e => handleDayTimeChange(day, "startTime", e.target.value)}
                              className="w-full pl-2.5 pr-7 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none bg-white font-mono"
                            />
                            <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          </div>

                          {/* Duration dropdown */}
                          <select
                            value={dayTime.duration || form.duration || 45}
                            onChange={e => handleDayTimeChange(day, "duration", Number(e.target.value))}
                            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none bg-white"
                          >
                            {DURATION_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.value}m
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Calculated End Time & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                          <div className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-100 flex items-center gap-1 font-mono">
                            <span>{dayTime.startTime ? formatTime12(dayTime.startTime) : "--:--"}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-bold">{dayTime.startTime ? formatTime12(dayTime.endTime || calcEndTimeStr(dayTime.startTime, dayTime.duration || 45)) : "--:--"}</span>
                          </div>

                          {form.weeklyDays.length > 1 && (
                            <button
                              type="button"
                              onClick={() => copyDayTimeToAll(day)}
                              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Copy this day's time to all selected days"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
      

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {editingStudent ? "Saving..." : "Adding..."}</>
              ) : (
                <>{editingStudent ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />} {editingStudent ? "Save Changes" : "Add Student"}</>
              )}
            </button>
          </div>
        </form>
        ) : (
          // ── "Add New Student" → Student ID Lookup & Assign Flow ─────────────
          <StudentIdLookupPanel teacherInfo={teacherInfo} onClose={onClose} onAssigned={(s) => onSuccess(s, "")} />
        )}
      </div>
    </div>
  );
}

/* ─── Student ID Lookup & Assign Panel ─── */
function StudentIdLookupPanel({
  teacherInfo,
  onClose,
  onAssigned,
}: {
  teacherInfo: any;
  onClose: () => void;
  onAssigned: (student: any) => void;
}) {
  const [inputId,   setInputId]   = useState("");
  const [looking,   setLooking]   = useState(false);
  const [result,    setResult]    = useState<any>(null);
  const [lookErr,   setLookErr]   = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignErr, setAssignErr] = useState("");
  const [assignOk,  setAssignOk]  = useState(false);

  const handleLookup = async () => {
    const id = inputId.trim().toUpperCase();
    if (!id) { setLookErr("Please enter a Student ID."); return; }
    setLooking(true); setLookErr(""); setResult(null); setAssignErr(""); setAssignOk(false);
    try {
      const res  = await fetch("/api/teacher-portal/students/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: id }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
      else setLookErr(data.message || "Student not found.");
    } catch {
      setLookErr("Network error. Please try again.");
    } finally {
      setLooking(false);
    }
  };

  const handleAssign = async () => {
    if (!result?.student?.studentId) return;
    setAssigning(true); setAssignErr("");
    try {
      const res  = await fetch("/api/teacher-portal/students/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: result.student.studentId }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignOk(true);
        setTimeout(() => { onAssigned(data.student); onClose(); }, 1200);
      } else {
        setAssignErr(data.message || "Failed to assign student.");
      }
    } catch {
      setAssignErr("Network error. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const stu = result?.student;
  const sch = result?.schedule;

  return (
    <div className="p-6 space-y-5">
      {/* Instruction banner */}
      <div className="flex items-start gap-3 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Search className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-900">Search by Student ID</p>
          <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
            Enter the student&apos;s ID (e.g.{" "}
            <span className="font-mono font-bold">STUM08202600001</span>) to look them up.
            The system will verify their admission status before assigning.
          </p>
        </div>
      </div>

      {/* Input + Search */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Student ID *</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputId}
            onChange={e => { setInputId(e.target.value.toUpperCase()); setLookErr(""); setResult(null); }}
            onKeyDown={e => e.key === "Enter" && handleLookup()}
            placeholder="e.g. STUM08202600001"
            className="flex-1 px-3 py-2.5 font-mono text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none tracking-wider"
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={looking || !inputId.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {looking ? "Searching…" : "Search"}
          </button>
        </div>
        {lookErr && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {lookErr}
          </div>
        )}
      </div>

      {/* ── Result Panel ── */}
      {stu && (
        <div className="space-y-4">

          {/* Admission Status */}
          {result.isAdmitted ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Student is Admitted &amp; Active ✓</p>
                <p className="text-xs text-emerald-700">This student can be assigned to your class.</p>
              </div>
            </div>
          ) : result.isSuspended ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">Student Suspended</p>
                <p className="text-xs text-red-700">Contact admin to resolve.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">Not Yet Approved / Inactive</p>
                <p className="text-xs text-amber-700">
                  Status: <span className="font-bold capitalize">{stu.status}</span>. Must be approved &amp; active first.
                </p>
              </div>
            </div>
          )}

          {result.isAlreadyAssigned && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-indigo-700">This student is already assigned to you.</p>
            </div>
          )}

          {/* Student Info Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-black text-white flex-shrink-0">
                {stu.fullName?.charAt(0) || "S"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-base truncate">{stu.fullName}</p>
                <p className="text-indigo-200 text-xs font-mono">{stu.studentId}</p>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                stu.status === "active"    ? "bg-emerald-100 text-emerald-700" :
                stu.status === "suspended" ? "bg-red-100 text-red-700" :
                                             "bg-amber-100 text-amber-700"
              }`}>{stu.status}</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Gender</p>
                  <p className="font-semibold text-gray-800 capitalize">{stu.gender || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Phone</p>
                  <p className="font-semibold text-gray-800">{stu.phone || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Course</p>
                  <p className="font-semibold text-indigo-700 truncate">{stu.course?.title || "Not assigned"}</p>
                </div>
                {stu.admissionDate && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Admission Date</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(stu.admissionDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
              {/* Schedule */}
              {sch ? (
                <div className="pt-3 border-t border-dashed border-gray-200">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Class Schedule
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(sch.day_times && sch.day_times.length > 0
                      ? sch.day_times
                      : (sch.weekly_days_list || []).map((d: string) => ({ day: d, startTime: sch.startTime, duration: sch.duration }))
                    ).map((dt: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span className="capitalize font-bold">{dt.day?.slice(0, 3)}:</span>
                        <span className="font-mono">{formatTime12(dt.startTime)}</span>
                      </span>
                    ))}
                    {sch.duration && (
                      <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{sch.duration} min</span>
                    )}
                    {sch.type && (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">{sch.type}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 italic flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> No schedule set yet — you can set one after assignment.
                  </p>
                </div>
              )}
            </div>
          </div>

          {assignErr && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {assignErr}
            </div>
          )}
          {assignOk && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Student assigned successfully! Refreshing…
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
            {!result.isAlreadyAssigned && result.isAdmitted && !assignOk && (
              <button type="button" onClick={handleAssign} disabled={assigning}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-sm">
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {assigning ? "Assigning…" : "Assign to Me"}
              </button>
            )}
          </div>
        </div>
      )}

      {!stu && !looking && (
        <button onClick={onClose}
          className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancel</button>
      )}
    </div>
  );
}

/* ─── Confirm Unassign Dialog ─── */
function ConfirmUnassignDialog({
  student,
  onCancel,
  onConfirm,
  loading,
}: {
  student: { _id: string; fullName: string; studentId: string };
  onCancel: () => void;
  onConfirm: (note: string) => void;
  loading: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <UserMinus className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-bold">Unassign Student?</h3>
          <p className="text-xs text-white/80 mt-0.5">This action will be logged to history</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <p className="text-sm font-bold text-gray-900">{student.fullName}</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{student.studentId}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason (optional)</label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Course completed, transferred..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(note)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
              {loading ? "Unassigning..." : "Yes, Unassign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Student History Tab ─── */
function StudentHistoryTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fmt = (d?: string | Date) =>
    d ? new Date(d).toLocaleDateString("en-US", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—";

  useEffect(() => {
    fetch("/api/teacher-portal/student-history")
      .then(r => r.json())
      .then(d => { if (d.success) setHistory(d.history || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = history.filter(ev =>
    ev.student.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    ev.student.studentId?.toLowerCase().includes(search.toLowerCase()) ||
    ev.student.phone?.includes(search)
  );

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <span className="text-sm text-gray-400 font-medium flex-shrink-0">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-indigo-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No history yet</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            When you unassign students, they will appear here with timestamps.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev: any, i: number) => (
            <div key={i} className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${
              ev.isActive ? "border-indigo-200" : "border-gray-200"
            }`}>
              <div className="flex items-stretch">
                <div className={`w-1.5 flex-shrink-0 ${ev.isActive ? "bg-indigo-500" : "bg-orange-400"}`} />
                <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border-2 border-white shadow-sm flex-shrink-0 ${
                      ev.isActive ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {ev.student.fullName?.charAt(0) || "S"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{ev.student.fullName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-mono text-gray-500">{ev.student.studentId}</span>
                        {ev.student.course?.title && (
                          <span className="text-xs text-indigo-600 font-medium truncate">{ev.student.course.title}</span>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                          ev.isActive
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                        }`}>
                          {ev.isActive ? "Still Assigned" : "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 space-y-1 text-xs sm:text-right">
                    <div className="flex items-center gap-1.5 sm:justify-end">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-gray-600"><span className="font-semibold">Assigned:</span> {fmt(ev.assignedAt)}</span>
                    </div>
                    {ev.unassignedAt && (
                      <div className="flex items-center gap-1.5 sm:justify-end">
                        <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                        <span className="text-gray-600"><span className="font-semibold">Unassigned:</span> {fmt(ev.unassignedAt)}</span>
                      </div>
                    )}
                    {ev.note && (
                      <p className="text-gray-400 italic text-[11px] mt-1">&ldquo;{ev.note}&rdquo;</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Unassign Statement Card (WhatsApp) ─── */
function UnassignStatementCard({
  data,
  onClose,
}: {
  data: {
    student: { fullName: string; studentId: string; phone?: string; course?: string };
    note: string;
    teacherName: string;
    date: string;
  };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // Strip + for wa.me URL, keep digits only
  const waPhone = (data.student.phone || "").replace(/\D/g, "");

  const message = `Assalamu Alaikum ${data.student.fullName},

We would like to inform you that your enrollment under *${data.teacherName}* at *Fajr Academy* has been concluded as of *${data.date}*.

📋 *Student Details:*
• Student ID: ${data.student.studentId}
${data.student.course ? `• Course: ${data.student.course}\n` : ""}• Status: Unassigned
${data.note ? `• Reason: ${data.note}\n` : ""}
Please contact the academy for further enrollment details or if you have any questions.

JazakAllahu Khairan 🌙
*Fajr Academy Team*`;

  const waUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Green top banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-bold">Student Unassigned</h3>
          <p className="text-xs text-white/80 mt-0.5">Send the official statement via WhatsApp</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Statement Preview */}
          <div className="bg-[#ECF5EB] border border-[#c5e0c0] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              {/* WhatsApp icon */}
              <svg viewBox="0 0 32 32" className="w-5 h-5 text-[#25D366]" fill="currentColor">
                <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.697 4.61 1.898 6.5L4 29l7.65-1.862A12.94 12.94 0 0016 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.916 0-3.72-.516-5.27-1.416l-.376-.22-4.544 1.106 1.15-4.416-.236-.37A9.94 9.94 0 016 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.32-7.498c-.29-.145-1.717-.847-1.984-.943-.265-.096-.457-.145-.65.145-.19.29-.748.943-.917 1.138-.17.193-.337.217-.627.072-.29-.145-1.222-.45-2.328-1.437-.86-.768-1.44-1.716-1.61-2.006-.168-.29-.018-.447.127-.591.13-.13.29-.338.435-.507.145-.17.193-.29.29-.483.097-.194.048-.362-.024-.507-.072-.145-.65-1.567-.89-2.147-.235-.564-.473-.487-.65-.496l-.554-.01c-.19 0-.5.072-.763.362-.265.29-1.01.988-1.01 2.41 0 1.42 1.034 2.793 1.178 2.986.145.194 2.034 3.107 4.928 4.356.688.297 1.225.474 1.643.607.69.22 1.318.189 1.815.115.554-.083 1.717-.702 1.958-1.38.24-.676.24-1.256.168-1.38-.072-.12-.265-.19-.555-.336z"/>
              </svg>
              <span className="text-xs font-bold text-[#128C7E]">WhatsApp Message Preview</span>
            </div>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-52 overflow-y-auto">
              {message}
            </pre>
          </div>

          {/* Student phone info */}
          {data.student.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-[#25D366] flex-shrink-0" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.697 4.61 1.898 6.5L4 29l7.65-1.862A12.94 12.94 0 0016 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.916 0-3.72-.516-5.27-1.416l-.376-.22-4.544 1.106 1.15-4.416-.236-.37A9.94 9.94 0 016 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.32-7.498c-.29-.145-1.717-.847-1.984-.943-.265-.096-.457-.145-.65.145-.19.29-.748.943-.917 1.138-.17.193-.337.217-.627.072-.29-.145-1.222-.45-2.328-1.437-.86-.768-1.44-1.716-1.61-2.006-.168-.29-.018-.447.127-.591.13-.13.29-.338.435-.507.145-.17.193-.29.29-.483.097-.194.048-.362-.024-.507-.072-.145-.65-1.567-.89-2.147-.235-.564-.473-.487-.65-.496l-.554-.01c-.19 0-.5.072-.763.362-.265.29-1.01.988-1.01 2.41 0 1.42 1.034 2.793 1.178 2.986.145.194 2.034 3.107 4.928 4.356.688.297 1.225.474 1.643.607.69.22 1.318.189 1.815.115.554-.083 1.717-.702 1.958-1.38.24-.676.24-1.256.168-1.38-.072-.12-.265-.19-.555-.336z"/>
              </svg>
              <span>Sending to: <span className="font-semibold text-gray-700">{data.student.phone}</span></span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Text"}
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: "#25D366" }}
            >
              <svg viewBox="0 0 32 32" className="w-4 h-4" fill="currentColor">
                <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.697 4.61 1.898 6.5L4 29l7.65-1.862A12.94 12.94 0 0016 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.916 0-3.72-.516-5.27-1.416l-.376-.22-4.544 1.106 1.15-4.416-.236-.37A9.94 9.94 0 016 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.32-7.498c-.29-.145-1.717-.847-1.984-.943-.265-.096-.457-.145-.65.145-.19.29-.748.943-.917 1.138-.17.193-.337.217-.627.072-.29-.145-1.222-.45-2.328-1.437-.86-.768-1.44-1.716-1.61-2.006-.168-.29-.018-.447.127-.591.13-.13.29-.338.435-.507.145-.17.193-.29.29-.483.097-.194.048-.362-.024-.507-.072-.145-.65-1.567-.89-2.147-.235-.564-.473-.487-.65-.496l-.554-.01c-.19 0-.5.072-.763.362-.265.29-1.01.988-1.01 2.41 0 1.42 1.034 2.793 1.178 2.986.145.194 2.034 3.107 4.928 4.356.688.297 1.225.474 1.643.607.69.22 1.318.189 1.815.115.554-.083 1.717-.702 1.958-1.38.24-.676.24-1.256.168-1.38-.072-.12-.265-.19-.555-.336z"/>
              </svg>
              Send on WhatsApp
            </a>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Pagination Bar Component ─── */
function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  loading,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  loading?: boolean;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
}) {
  if (total === 0) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>
          Showing <strong className="font-semibold text-gray-900">{start}–{end}</strong> of{" "}
          <strong className="font-semibold text-gray-900">{total}</strong> students
        </span>
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <span className="text-xs text-gray-500 font-medium">Per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-gray-700 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || loading}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                disabled={loading}
                className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                  page === p
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || loading}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function TeacherStudentsPage() {
  const [students, setStudents]   = useState<any[]>([]);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [error, setError]         = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [newStudent, setNewStudent] = useState<{ student: any; pw: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"students" | "history">("students");
  const [confirmUnassign, setConfirmUnassign] = useState<{
    _id: string; fullName: string; studentId: string; phone?: string; course?: string;
  } | null>(null);
  const [unassigning, setUnassigning] = useState(false);
  const [unassignStatement, setUnassignStatement] = useState<{
    student: { fullName: string; studentId: string; phone?: string; course?: string };
    note: string;
    teacherName: string;
    date: string;
  } | null>(null);

  // Pagination states
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchStudents = async (p = page, l = limit, s = search) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/teacher-portal/students?page=${p}&limit=${l}&search=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.message || "Failed to load students.");
      }
    } catch {
      setError("Network error while loading students.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch teacher profile on mount
  useEffect(() => {
    fetch("/api/teacher-portal/profile")
      .then(res => res.json())
      .then(data => { if (data.success) setTeacherInfo(data.teacher); })
      .catch(console.error);
  }, []);

  // Debounced search & pagination fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(page, limit, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, limit, search]);

  const reload = () => {
    fetchStudents(page, limit, search);
  };

  const handleUnassign = async (note: string) => {
    if (!confirmUnassign) return;
    setUnassigning(true);
    try {
      const res  = await fetch(`/api/teacher-portal/students/${confirmUnassign._id}/unassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStudents(page, limit, search);
        // Show WhatsApp statement card
        setUnassignStatement({
          student: {
            fullName:  confirmUnassign.fullName,
            studentId: confirmUnassign.studentId,
            phone:     confirmUnassign.phone,
            course:    confirmUnassign.course,
          },
          note,
          teacherName: teacherInfo?.fullName || "Your Teacher",
          date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
        });
        setConfirmUnassign(null);
      } else {
        setError(data.message || "Failed to unassign student.");
        setConfirmUnassign(null);
      }
    } catch {
      setError("Network error while unassigning.");
      setConfirmUnassign(null);
    } finally {
      setUnassigning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/teacher-portal/students/${confirmDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchStudents(page, limit, search);
        setConfirmDelete(null);
      } else {
        setError(data.message || "Failed to delete student.");
        setConfirmDelete(null);
      }
    } catch {
      setError("Network error while deleting.");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> My Students
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? "Loading..." : `${pagination.total} student${pagination.total !== 1 ? "s" : ""} assigned to you`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["students", "history"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              activeTab === tab
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "students" ? <Users className="w-4 h-4" /> : <History className="w-4 h-4" />}
            {tab === "students" ? "My Students" : "Unassign History"}
          </button>
        ))}
      </div>

      {/* Students Tab Content */}
      {activeTab === "students" && (
        <>
          {/* Search */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, ID, email, or phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">
                {search
                  ? `${pagination.total} result${pagination.total !== 1 ? "s" : ""} found`
                  : `Showing ${students.length} of ${pagination.total} student${pagination.total !== 1 ? "s" : ""}`}
              </span>
              <button
                onClick={reload}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Student Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : students.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {students.map((student) => (
                  <div key={student._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group flex flex-col">
                    {/* Card Header */}
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-indigo-50/30 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold border-2 border-white shadow-sm flex-shrink-0">
                        {student.fullName?.charAt(0) || "S"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{student.fullName}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-mono bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded shadow-sm">
                            {student.studentId || "No ID"}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[student.status] || STATUS_STYLE.active}`}>
                            {student.status || "active"}
                          </span>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingStudent(student);
                            setShowAdd(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="Edit student"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmUnassign({
                            _id:       student._id,
                            fullName:  student.fullName,
                            studentId: student.studentId,
                            phone:     student.phone,
                            course:    student.course?.title || student.course,
                          })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                          title="Unassign student"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 space-y-3">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16z"/></svg>
                        <span>{student.phone || "No phone number"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 capitalize">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{student.gender || "Not specified"}</span>
                      </div>
                      {(student.course?.title || student.course) && (
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <BookOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span className="font-medium text-indigo-700 truncate">
                            {student.course?.title || student.course}
                          </span>
                        </div>
                      )}
                      {student.classStartingDate && (
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>
                            Started: {new Date(student.classStartingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      )}
                      
                      {/* Premium Schedule Badges */}
                      {student.schedule && student.schedule.weekly_days_list?.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-dashed border-gray-100 flex flex-wrap items-center gap-1.5">
                          {student.schedule.day_times && student.schedule.day_times.length > 0 ? (
                            student.schedule.day_times.map((dt: any, idx: number) => (
                              <div
                                key={dt.day || idx}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shadow-xs"
                              >
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span className="capitalize font-bold">{dt.day?.slice(0, 3)}:</span>
                                <span className="font-mono">{formatTime12(dt.startTime)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100/70 px-2.5 py-1 rounded-full shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span className="capitalize">
                                {student.schedule.weekly_days_list.map((d: string) => d.slice(0, 3)).join(", ")}
                                {student.schedule.startTime ? ` @ ${formatTime12(student.schedule.startTime)}` : ""}
                              </span>
                            </div>
                          )}
                          {student.schedule.type && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md">
                              {student.schedule.type}
                            </div>
                          )}
                          {student.schedule.duration && (
                            <div className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {student.schedule.duration}m
                            </div>
                          )}
                        </div>
                      )}

                      {/* Session Routine Tracker */}
                      <div className="pt-2.5 mt-2.5 border-t border-gray-100 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>This Month's Sessions</span>
                          {student.schedule?.weekly_days_list && (
                            <span className="text-indigo-600 normal-case font-semibold text-[11px]">
                              ({student.schedule.weekly_days_list.length}/wk)
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="p-1 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
                            <p className="text-xs font-extrabold text-slate-700 mt-0.5">
                              {student.classStats?.total ?? 0}
                            </p>
                          </div>
                          
                          <div className="p-1 rounded-xl bg-emerald-50/75 border border-emerald-100/50">
                            <p className="text-[9px] text-emerald-600 font-bold uppercase">Done</p>
                            <p className="text-xs font-extrabold text-emerald-700 mt-0.5">
                              {student.classStats?.done ?? 0}
                            </p>
                          </div>

                          <div className="p-1 rounded-xl bg-amber-50/75 border border-amber-100/50">
                            <p className="text-[9px] text-amber-600 font-bold uppercase">Left</p>
                            <p className="text-xs font-extrabold text-amber-700 mt-0.5">
                              {student.classStats?.remaining ?? 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              <PaginationBar
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                loading={loading}
                onPageChange={(p) => setPage(p)}
                onLimitChange={(l) => { setLimit(l); setPage(1); }}
              />
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-indigo-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {search ? "No students match your search" : "No students yet"}
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                {search ? "Try a different keyword." : "Click 'Add Student' to register your first student."}
              </p>
              {!search && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add First Student
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && <StudentHistoryTab />}

      {/* Add/Edit Modal */}
      {showAdd && (
        <AddStudentModal
          teacherInfo={teacherInfo}
          editingStudent={editingStudent}
          onClose={() => {
            setShowAdd(false);
            setEditingStudent(null);
          }}
          onSuccess={(student, pw) => {
            setShowAdd(false);
            setEditingStudent(null);
            if (pw) {
              setNewStudent({ student, pw });
            }
            reload();
          }}
        />
      )}

      {/* Credential Card (shown after creation) */}
      {newStudent && (
        <CredentialCard
          student={newStudent.student}
          plainPassword={newStudent.pw}
          onClose={() => setNewStudent(null)}
        />
      )}

      {/* Confirm Unassign Dialog */}
      {confirmUnassign && (
        <ConfirmUnassignDialog
          student={confirmUnassign}
          loading={unassigning}
          onCancel={() => setConfirmUnassign(null)}
          onConfirm={handleUnassign}
        />
      )}

      {/* Unassign WhatsApp Statement Card */}
      {unassignStatement && (
        <UnassignStatementCard
          data={unassignStatement}
          onClose={() => setUnassignStatement(null)}
        />
      )}

    </div>
  );
}