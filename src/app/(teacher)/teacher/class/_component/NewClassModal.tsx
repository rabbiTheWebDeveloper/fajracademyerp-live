import React from "react";
import {
  Plus,
  X,
  Users,
  BookOpen,
  Calendar,
  Clock,
  Timer,
  Sparkles,
  Video,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Student, Course, DAYS } from "./types";

interface NewClassModalProps {
  show: boolean;
  onClose: () => void;
  form: {
    studentId: string;
    courseId: string;
    dayOfWeek: string;
    startTime: string;
    duration: string;
    notes: string;
    meetLink: string;
    topic: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  students: Student[];
  courses: Course[];
  studentHasSchedule: boolean;
  onStudentChange: (studentId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  msg: { text: string; type: string };
}

export function NewClassModal({
  show,
  onClose,
  form,
  setForm,
  students,
  courses,
  studentHasSchedule,
  onStudentChange,
  onSubmit,
  submitting,
  msg,
}: NewClassModalProps) {
  if (!show) return null;

  const set = (k: string, v: string) =>
    setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col scale-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Schedule New Class
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Student */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" /> Student *
            </label>
            <div className="relative">
              <select
                required
                value={form.studentId}
                onChange={(e) => onStudentChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white cursor-pointer"
              >
                <option value="">— Choose Student —</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.fullName} · {s.studentId}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {students.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" /> No students
                assigned to you yet.
              </p>
            )}
          </div>

          {/* Course */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" /> Course *
            </label>
            <div className="relative">
              <select
                required
                value={form.courseId}
                onChange={(e) => set("courseId", e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white cursor-pointer"
              >
                <option value="">— Choose Course —</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title} {c.courseId ? `(${c.courseId})` : ""}
                  </option>
                ))}
                {courses.length === 0 && (
                  <option disabled value="">
                    No courses available
                  </option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Auto-fill hint */}
          {studentHasSchedule && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs font-semibold text-indigo-700">
                Day, time &amp; duration auto-filled from student&apos;s
                schedule. You can still edit them.
              </p>
            </div>
          )}

          {/* Day + Time row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Day */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" /> Day *
                {studentHasSchedule && (
                  <span className="ml-auto text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 normal-case tracking-normal">
                    Auto
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  required
                  value={form.dayOfWeek}
                  onChange={(e) => set("dayOfWeek", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white capitalize cursor-pointer"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d} className="capitalize">
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" /> Start Time *
                {studentHasSchedule && (
                  <span className="ml-auto text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 normal-case tracking-normal">
                    Auto
                  </span>
                )}
              </label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              <Timer className="w-3.5 h-3.5" /> Duration (minutes) *
              {studentHasSchedule && (
                <span className="ml-auto text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 normal-case tracking-normal">
                  Auto
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="number"
                required
                min={15}
                max={180}
                step={5}
                value={form.duration}
                onChange={(e) => {
                  const val = Math.max(
                    15,
                    Math.min(180, Number(e.target.value) || 15)
                  );
                  set("duration", String(val));
                }}
                onBlur={(e) => {
                  const val = Math.max(
                    15,
                    Math.min(180, Number(e.target.value) || 15)
                  );
                  set("duration", String(val));
                }}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="45"
              />
              <div className="relative">
                <select
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white cursor-pointer"
                >
                  {[15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180].map(
                    (d) => (
                      <option key={d} value={String(d)}>
                        {d} min
                      </option>
                    )
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Between 15 and 180 minutes. Double-booking is prevented
              automatically.
            </p>
          </div>

          {/* Class Topic */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />{" "}
              Class Topic *
            </label>
            <input
              type="text"
              required
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="E.g., Surah Al-Fatiha, Tajweed basics…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Required. Each session must have a unique topic.
            </p>
          </div>

          {/* Meeting Link (optional) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              <Video className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{" "}
              Meeting Link
              <span className="ml-1 text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                (optional)
              </span>
            </label>
            <input
              type="url"
              value={form.meetLink}
              onChange={(e) => set("meetLink", e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Paste your Google Meet, Zoom, or any video call link here.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider block">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Optional notes for this session…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Feedback */}
          {msg.text && (
            <div
              className={`p-3 rounded-xl text-sm flex items-start gap-2 border ${
                msg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {msg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span className="break-all">{msg.text}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-1 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {submitting ? "Scheduling…" : "Schedule Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
