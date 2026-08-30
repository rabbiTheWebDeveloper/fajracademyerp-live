import React from "react";
import {
  BookOpen,
  Clock,
  Video,
  PlayCircle,
  StopCircle,
  PauseCircle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { LiveTimer } from "./LiveTimer";
import { AttendanceBadge } from "./AttendanceBadge";
import {
  ClassSession,
  STATUS_CONFIG,
  LEVEL_COLORS,
  formatDT,
} from "./types";

interface ClassCardProps {
  cls: ClassSession;
  acting: string | null;
  onAction: (
    id: string,
    action: "start" | "end" | "pause" | "resume" | "reset"
  ) => void;
  onEndRequest: (cls: ClassSession) => void;
  onDelete: (cls: ClassSession) => void;
}

export function ClassCard({
  cls,
  acting,
  onAction,
  onEndRequest,
  onDelete,
}: ClassCardProps) {
  const cfg =
    STATUS_CONFIG[cls.status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG.scheduled;

  return (
    <div
      className={`group relative rounded-2xl border-2 p-3 sm:p-4 transition-all hover:shadow-md ${cfg.bg} ${cfg.border}`}
    >
      {/* Status indicator line */}
      <div
        className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${cfg.dot}`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
        {/* Student & Course section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 flex-1 min-w-0">
          {/* Student Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={cls.student?.fullName} src={cls.student?.avatar} />
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {cls.student?.fullName || "—"}
              </p>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                {cls.student?.studentId || "No ID"}
              </p>
            </div>
          </div>

          {/* Course Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${cfg.text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {cls.course?.title || "—"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {cls.course?.level && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                      LEVEL_COLORS[cls.course.level] ||
                      "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {cls.course.level}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 capitalize font-medium">
                  {cls.dayOfWeek?.slice(0, 3)}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-1 flex flex-col gap-0.5">
                {cls.createdAt && <div>Created: {formatDT(cls.createdAt)}</div>}
                {cls.updatedAt && cls.updatedAt !== cls.createdAt && (
                  <div>Updated: {formatDT(cls.updatedAt)}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Time / Timer & Actions Section */}
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-gray-100/50 sm:border-0 pt-3 sm:pt-0">
          {/* Time/Timer */}
          <div className="flex-shrink-0">
            {(cls.status === "in-progress" || cls.status === "paused") &&
            cls.startedAt ? (
              <LiveTimer
                startedAt={cls.startedAt}
                duration={cls.duration ?? 45}
              />
            ) : cls.status === "completed" ? (
              <div className="flex flex-col items-start sm:items-center gap-0.5">
                <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-800">
                    {cls.startTime}
                  </span>
                  <span className="text-gray-300 text-xs">→</span>
                  <span className="text-xs font-bold text-gray-800">
                    {cls.endTime}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold sm:self-center">
                  ✓ {cls.actualDuration ?? cls.duration ?? 45} min
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-gray-800">
                  {cls.startTime}
                </span>
                <span className="text-gray-300 text-xs">→</span>
                <span className="text-xs font-bold text-gray-800">
                  {cls.endTime}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {cls.meetLink &&
              (cls.status === "scheduled" || cls.status === "in-progress") && (
                <a
                  href={cls.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors active:scale-95 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Join Meet</span>
                </a>
              )}
            {cls.status === "scheduled" && (
              <button
                onClick={() => onAction(cls._id, "start")}
                disabled={acting === cls._id}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95 cursor-pointer"
              >
                {acting === cls._id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlayCircle className="w-3.5 h-3.5" />
                )}
                Start
              </button>
            )}
            {cls.status === "in-progress" && (
              <>
                <button
                  onClick={() => onAction(cls._id, "reset")}
                  disabled={acting === cls._id}
                  className="flex items-center gap-1 px-2.5 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95 cursor-pointer"
                >
                  {acting === cls._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Reschedule</span>
                </button>
                <button
                  onClick={() => onAction(cls._id, "pause")}
                  disabled={acting === cls._id}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95 cursor-pointer"
                >
                  {acting === cls._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PauseCircle className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Pause</span>
                </button>
                <button
                  onClick={() => onEndRequest(cls)}
                  disabled={acting === cls._id}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors animate-pulse disabled:opacity-60 disabled:animate-none active:scale-95 cursor-pointer"
                >
                  {acting === cls._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <StopCircle className="w-3.5 h-3.5" />
                  )}
                  End
                </button>
              </>
            )}
            {cls.status === "paused" && (
              <>
                <button
                  onClick={() => onAction(cls._id, "reset")}
                  disabled={acting === cls._id}
                  className="flex items-center gap-1 px-2.5 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95 cursor-pointer"
                >
                  {acting === cls._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Reschedule</span>
                </button>
                <button
                  onClick={() => onAction(cls._id, "resume")}
                  disabled={acting === cls._id}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95 cursor-pointer"
                >
                  {acting === cls._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlayCircle className="w-3.5 h-3.5" />
                  )}
                  Resume
                </button>
                <button
                  onClick={() => onEndRequest(cls)}
                  disabled={acting === cls._id}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors animate-pulse disabled:opacity-60 disabled:animate-none active:scale-95 cursor-pointer"
                >
                  {acting === cls._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <StopCircle className="w-3.5 h-3.5" />
                  )}
                  End
                </button>
              </>
            )}
            {cls.status === "completed" && (
              <div className="flex flex-col items-end gap-1">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </span>
                <AttendanceBadge status={cls.studentAttendance} />
              </div>
            )}

            {cls.status !== "completed" && (
              <button
                onClick={() => onDelete(cls)}
                className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 sm:border-transparent sm:hover:border-red-100 transition-all sm:opacity-0 group-hover:opacity-100 active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {cls.topic && (
        <div className="mt-3 ml-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/50 border border-indigo-100/50 px-2.5 py-1 rounded-lg w-fit">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Topic: {cls.topic}</span>
        </div>
      )}

      {cls.notes && (
        <p className="mt-3 ml-2 text-xs text-gray-500 bg-white/60 px-3 py-1.5 rounded-lg border border-white/80 italic">
          {cls.notes}
        </p>
      )}
    </div>
  );
}
