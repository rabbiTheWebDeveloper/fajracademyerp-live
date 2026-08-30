import React from "react";
import { UserCheck, UserX, ClipboardCheck } from "lucide-react";

export function AttendanceBadge({ status }: { status?: string }) {
  if (status === "present") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <UserCheck className="w-3 h-3" /> Present
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
        <UserX className="w-3 h-3" /> Absent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
      <ClipboardCheck className="w-3 h-3" /> Not Marked
    </span>
  );
}
