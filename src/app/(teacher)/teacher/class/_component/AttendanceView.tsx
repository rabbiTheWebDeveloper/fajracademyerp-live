import React, { useState } from "react";
import {
  ClipboardCheck,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  CheckCheck,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { AttendanceBadge } from "./AttendanceBadge";
import { ClassSession, LEVEL_COLORS } from "./types";

interface AttendanceViewProps {
  completed: ClassSession[];
  totalDone: number;
  totalPresent: number;
  totalAbsent: number;
  attendancePct: number;
  studentAttendanceList: any[];
}

export function AttendanceView({
  completed,
  totalDone,
  totalPresent,
  totalAbsent,
  attendancePct,
  studentAttendanceList,
}: AttendanceViewProps) {
  const [attTab, setAttTab] = useState<"classes" | "students">("classes");

  return (
    <div className="space-y-4">
      {/* Attendance summary KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Sessions",
            value: totalDone,
            icon: CheckCheck,
            bg: "bg-indigo-50",
            text: "text-indigo-600",
            border: "border-indigo-100",
          },
          {
            label: "Present",
            value: totalPresent,
            icon: UserCheck,
            bg: "bg-emerald-50",
            text: "text-emerald-600",
            border: "border-emerald-100",
          },
          {
            label: "Absent",
            value: totalAbsent,
            icon: UserX,
            bg: "bg-red-50",
            text: "text-red-600",
            border: "border-red-100",
          },
          {
            label: "Attendance Rate",
            value: `${attendancePct}%`,
            icon: TrendingUp,
            bg:
              attendancePct >= 75
                ? "bg-emerald-50"
                : attendancePct >= 50
                ? "bg-amber-50"
                : "bg-red-50",
            text:
              attendancePct >= 75
                ? "text-emerald-600"
                : attendancePct >= 50
                ? "text-amber-600"
                : "text-red-600",
            border: "border-gray-100",
          },
        ].map(({ label, value, icon: Icon, bg, text, border }) => (
          <div
            key={label}
            className={`bg-white rounded-2xl border ${border} shadow-sm p-4 flex items-center gap-3`}
          >
            <div
              className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}
            >
              <Icon className={`w-5 h-5 ${text}`} />
            </div>
            <div>
              <p className={`text-xl font-black ${text}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sub-tab toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-1">
        {(
          [
            { key: "classes", label: "Class-wise", icon: ClipboardCheck },
            { key: "students", label: "Student-wise", icon: Users },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setAttTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              attTab === key
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Class-wise attendance list ── */}
      {attTab === "classes" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-indigo-500" />
              All Completed Sessions
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200">
                <UserCheck className="w-3 h-3" /> {totalPresent}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">
                <UserX className="w-3 h-3" /> {totalAbsent}
              </span>
            </div>
          </div>

          {completed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                <ClipboardCheck className="w-7 h-7 text-gray-200" />
              </div>
              <p className="font-bold text-gray-600">No completed sessions yet</p>
              <p className="text-sm text-gray-400">
                Attendance will appear here once classes are ended.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-3 font-semibold w-10">#</th>
                      <th className="px-5 py-3 font-semibold">Student</th>
                      <th className="px-5 py-3 font-semibold">Course</th>
                      <th className="px-5 py-3 font-semibold">Day / Time</th>
                      <th className="px-5 py-3 font-semibold">Duration</th>
                      <th className="px-5 py-3 font-semibold">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {completed.map((cls, i) => (
                      <tr
                        key={cls._id}
                        className="hover:bg-indigo-50/20 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-gray-400 font-medium text-xs">
                          {i + 1}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              name={cls.student?.fullName}
                              src={cls.student?.avatar}
                              size="sm"
                            />
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {cls.student?.fullName || "—"}
                              </p>
                              <p className="text-[10px] font-mono text-gray-400">
                                {cls.student?.studentId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-gray-800">
                            {cls.course?.title || "—"}
                          </p>
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
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-semibold text-gray-700 capitalize">
                            {cls.dayOfWeek}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {cls.startTime} – {cls.endTime}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                            {cls.actualDuration ?? cls.duration ?? 45} min
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <AttendanceBadge status={cls.studentAttendance} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {completed.map((cls) => (
                  <div key={cls._id} className="p-4 flex items-start gap-3">
                    <Avatar
                      name={cls.student?.fullName}
                      src={cls.student?.avatar}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {cls.student?.fullName}
                        </p>
                        <AttendanceBadge status={cls.studentAttendance} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cls.course?.title}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                        {cls.dayOfWeek} · {cls.startTime}–{cls.endTime} ·{" "}
                        {cls.actualDuration ?? cls.duration ?? 45} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Student-wise attendance summary ── */}
      {attTab === "students" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Student Attendance Summary
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Based on all completed sessions
            </p>
          </div>

          {studentAttendanceList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                <Users className="w-7 h-7 text-gray-200" />
              </div>
              <p className="font-bold text-gray-600">
                No student attendance data yet
              </p>
              <p className="text-sm text-gray-400">
                End a class session to record attendance.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-3 font-semibold w-10">#</th>
                      <th className="px-5 py-3 font-semibold">Student</th>
                      <th className="px-5 py-3 font-semibold text-center">
                        Total
                      </th>
                      <th className="px-5 py-3 font-semibold text-center">
                        Present
                      </th>
                      <th className="px-5 py-3 font-semibold text-center">
                        Absent
                      </th>
                      <th className="px-5 py-3 font-semibold text-center">
                        Not Marked
                      </th>
                      <th className="px-5 py-3 font-semibold">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {studentAttendanceList.map((row, i) => {
                      const pct =
                        row.total > 0
                          ? Math.round((row.present / row.total) * 100)
                          : 0;
                      const barColor =
                        pct >= 75
                          ? "bg-emerald-500"
                          : pct >= 50
                          ? "bg-amber-500"
                          : "bg-red-500";
                      const pctColor =
                        pct >= 75
                          ? "text-emerald-600"
                          : pct >= 50
                          ? "text-amber-600"
                          : "text-red-600";
                      return (
                        <tr
                          key={row.student?._id}
                          className="hover:bg-indigo-50/20 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-gray-400 font-medium text-xs">
                            {i + 1}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                name={row.student?.fullName}
                                src={row.student?.avatar}
                                size="sm"
                              />
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {row.student?.fullName || "—"}
                                </p>
                                <p className="text-[10px] font-mono text-gray-400">
                                  {row.student?.studentId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="text-sm font-bold text-gray-700">
                              {row.total}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <UserCheck className="w-3 h-3" /> {row.present}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <UserX className="w-3 h-3" /> {row.absent}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="text-xs font-semibold text-gray-400">
                              {row.notMarked}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${barColor} rounded-full transition-all duration-700`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-black w-8 text-right ${pctColor}`}
                              >
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {studentAttendanceList.map((row) => {
                  const pct =
                    row.total > 0
                      ? Math.round((row.present / row.total) * 100)
                      : 0;
                  const barColor =
                    pct >= 75
                      ? "bg-emerald-500"
                      : pct >= 50
                      ? "bg-amber-500"
                      : "bg-red-500";
                  const pctColor =
                    pct >= 75
                      ? "text-emerald-600"
                      : pct >= 50
                      ? "text-amber-600"
                      : "text-red-600";
                  return (
                    <div key={row.student?._id} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar
                          name={row.student?.fullName}
                          src={row.student?.avatar}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">
                            {row.student?.fullName}
                          </p>
                          <p className="text-[10px] font-mono text-gray-400">
                            {row.student?.studentId}
                          </p>
                        </div>
                        <span className={`text-base font-black ${pctColor}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">
                          Total:{" "}
                          <strong className="text-gray-800">{row.total}</strong>
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-700 font-semibold">
                          <UserCheck className="w-3 h-3" /> {row.present}
                        </span>
                        <span className="flex items-center gap-0.5 text-red-700 font-semibold">
                          <UserX className="w-3 h-3" /> {row.absent}
                        </span>
                        {row.notMarked > 0 && (
                          <span className="text-gray-400">
                            {row.notMarked} not marked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
