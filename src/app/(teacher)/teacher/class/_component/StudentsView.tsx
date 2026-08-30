import React from "react";
import { Users, Search, Loader2, Mail, Phone } from "lucide-react";
import { Avatar } from "./Avatar";
import { Student, STUDENT_STATUS_COLORS } from "./types";

interface StudentsViewProps {
  students: Student[];
  filteredStudents: Student[];
  search: string;
  onSearchChange: (val: string) => void;
  loading: boolean;
}

export function StudentsView({
  students,
  filteredStudents,
  search,
  onSearchChange,
  loading,
}: StudentsViewProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          My Students
          {!loading && (
            <span className="text-gray-400 font-normal">
              ({filteredStudents.length} of {students.length})
            </span>
          )}
        </p>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, ID, email or phone…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400">Loading students…</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
            <Users className="w-8 h-8 text-gray-200" />
          </div>
          <div>
            <p className="font-bold text-gray-700">No students found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search
                ? "No students match your search."
                : "You have no students assigned yet."}
            </p>
          </div>
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
                  <th className="px-5 py-3 font-semibold">ID</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Courses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredStudents.map((s, i) => (
                  <tr
                    key={s._id}
                    className="hover:bg-indigo-50/20 transition-colors group"
                  >
                    <td className="px-5 py-3.5 text-gray-400 font-medium text-sm">
                      {i + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.fullName} src={s.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {s.fullName}
                          </p>
                          <p className="text-[11px] text-gray-400 capitalize">
                            {s.gender || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                        {s.studentId || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3 h-3 text-gray-300" />
                            <span className="truncate max-w-[160px]">
                              {s.email}
                            </span>
                          </div>
                        )}
                        {(s.phone || s.studentNumber) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3 h-3 text-gray-300" />
                            <span>{s.phone || s.studentNumber}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          STUDENT_STATUS_COLORS[s.studentStatus || "active"] ||
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {s.studentStatus || "active"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {s.courses && s.courses.length > 0 ? (
                          s.courses.slice(0, 2).map((c: any, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full"
                            >
                              {c.title}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No courses
                          </span>
                        )}
                        {s.courses && s.courses.length > 2 && (
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            +{s.courses.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredStudents.map((s) => (
              <div key={s._id} className="p-4 flex items-start gap-3">
                <Avatar name={s.fullName} src={s.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-gray-900 truncate">
                      {s.fullName}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        STUDENT_STATUS_COLORS[s.studentStatus || "active"] ||
                        "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {s.studentStatus || "active"}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                    {s.studentId}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                    {s.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {s.email}
                      </span>
                    )}
                    {(s.phone || s.studentNumber) && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {s.phone || s.studentNumber}
                      </span>
                    )}
                  </div>
                  {s.courses && s.courses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.courses.map((c: any, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full"
                        >
                          {c.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
