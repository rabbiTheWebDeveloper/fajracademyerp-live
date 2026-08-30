import React from "react";
import {
  Calendar,
  Timer,
  CheckCheck,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react";

export interface ClassKpiStats {
  totalClasses: number;
  inProgress: number;
  completed: number;
  scheduled?: number;
  totalMins: number;
  teachingHours?: string;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate?: number;
}

export interface KpiStripProps {
  stats: ClassKpiStats | null;
  loading: boolean;
}

const ITEMS = [
  { key: "totalClasses",  label: "Total Classes",    icon: Calendar,   bg: "bg-indigo-50",  text: "text-indigo-600"  },
  { key: "inProgress",    label: "In Progress",       icon: Timer,      bg: "bg-amber-50",   text: "text-amber-600"   },
  { key: "completed",     label: "Completed",         icon: CheckCheck, bg: "bg-emerald-50", text: "text-emerald-600" },
  { key: "teachingHours", label: "Teaching Hours",    icon: Clock,      bg: "bg-purple-50",  text: "text-purple-600"  },
  { key: "totalPresent",  label: "Present",           icon: UserCheck,  bg: "bg-teal-50",    text: "text-teal-600"    },
  { key: "totalAbsent",   label: "Absent",            icon: UserX,      bg: "bg-red-50",     text: "text-red-600"     },
] as const;

type ItemKey = typeof ITEMS[number]["key"];

function getValue(stats: ClassKpiStats | null, key: ItemKey): string | number {
  if (!stats) return "—";
  if (key === "teachingHours") {
    return stats.teachingHours ?? `${Math.round((stats.totalMins / 60) * 10) / 10}h`;
  }
  return stats[key as keyof ClassKpiStats] as number ?? 0;
}

export function KpiStrip({ stats, loading }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {ITEMS.map(({ key, label, icon: Icon, bg, text }) => (
        <div
          key={key}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 transition-shadow hover:shadow-md"
        >
          <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${text}`} />
          </div>
          <div className="min-w-0">
            {loading ? (
              <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-md my-0.5" />
            ) : (
              <p className="text-xl font-black text-gray-900 truncate">
                {getValue(stats, key)}
              </p>
            )}
            <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
