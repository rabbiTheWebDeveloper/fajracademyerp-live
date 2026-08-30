import React, { useState } from "react";
import {
  X,
  Timer,
  ClipboardCheck,
  CheckCircle2,
  UserCheck,
  UserX,
  Loader2,
  StopCircle,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { ClassSession } from "./types";

interface EndClassModalProps {
  cls: ClassSession | null;
  acting: boolean;
  onClose: () => void;
  onConfirm: (attendance: "present" | "absent") => void;
}

export function EndClassModal({
  cls,
  acting,
  onClose,
  onConfirm,
}: EndClassModalProps) {
  const [attendance, setAttendance] = useState<"present" | "absent">("present");
  if (!cls) return null;

  const elapsedMins = cls.startedAt
    ? Math.round((Date.now() - new Date(cls.startedAt).getTime()) / 60000)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col scale-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              End Class
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Avatar
              name={cls.student?.fullName}
              src={cls.student?.avatar}
              size="md"
            />
            <div>
              <p className="font-bold text-white text-sm truncate">
                {cls.student?.fullName}
              </p>
              <p className="text-xs text-indigo-200 truncate">{cls.course?.title}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Timer className="w-4 h-4 text-indigo-200 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-indigo-100">
              Session ran for{" "}
              <strong className="text-white">{elapsedMins} min</strong>
            </span>
          </div>
        </div>

        {/* Attendance picker */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-indigo-500" />
            Mark Student Attendance
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAttendance("present")}
              className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                attendance === "present"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40"
              }`}
            >
              {attendance === "present" && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                  attendance === "present" ? "bg-emerald-100" : "bg-gray-100"
                }`}
              >
                <UserCheck
                  className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    attendance === "present" ? "text-emerald-600" : "text-gray-400"
                  }`}
                />
              </div>
              <span
                className={`text-xs sm:text-sm font-bold ${
                  attendance === "present" ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                Present
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 text-center">
                Student attended
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAttendance("absent")}
              className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                attendance === "absent"
                  ? "border-red-500 bg-red-50 shadow-sm"
                  : "border-gray-200 hover:border-red-300 hover:bg-red-50/40"
              }`}
            >
              {attendance === "absent" && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                  attendance === "absent" ? "bg-red-100" : "bg-gray-100"
                }`}
              >
                <UserX
                  className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    attendance === "absent" ? "text-red-600" : "text-gray-400"
                  }`}
                />
              </div>
              <span
                className={`text-xs sm:text-sm font-bold ${
                  attendance === "absent" ? "text-red-700" : "text-gray-500"
                }`}
              >
                Absent
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 text-center">
                Didn&apos;t attend
              </span>
            </button>
          </div>

          <div className="flex gap-2.5 pt-1.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(attendance)}
              disabled={acting}
              className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer ${
                attendance === "present"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {acting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4" />
              )}
              End & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
