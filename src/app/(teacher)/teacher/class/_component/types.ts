// ─── Types ────────────────────────────────────────────────────────────────────
export type Tab = "scheduled" | "in-progress" | "completed";
export type ViewMode = "classes" | "students";

export type Toast = {
  id: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  gems?: number;
};

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Student {
  _id: string;
  fullName: string;
  studentId: string;
  avatar?: string;
  gender?: string;
  email?: string;
  phone?: string;
  studentNumber?: string;
  studentStatus?: string;
  courses?: Course[];
  course?: Course | string | null;
  schedule?: {
    dayOfWeek?: string;
    weekly_days_list?: string[];
    startTime?: string;
    endTime?: string;
    duration?: number | string;
    classDuration?: number | string;
    course?: string | null;
  } | null;
}

export interface Course {
  _id: string;
  title: string;
  courseId?: string;
  level?: string;
}

export interface ClassSession {
  _id: string;
  classId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  duration: number;
  actualDuration: number | null;
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "paused";
  studentAttendance?: "present" | "absent" | "not-marked";
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  meetLink?: string;
  topic?: string;
  student?: Student | null;
  course?: Course | null;
}

export type TodaySessionStatus =
  | "completed"
  | "in-progress"
  | "paused"
  | "scheduled"
  | "cancelled"
  | "uncreated";

export interface TodayScheduleItem {
  student: Student;
  todayClass: ClassSession | undefined;
  status: TodaySessionStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const STATUS_CONFIG = {
  scheduled:     { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-400" },
  "in-progress": { bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700",  dot: "bg-amber-500" },
  completed:     { bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-700",dot: "bg-emerald-500" },
  paused:        { bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-700",   dot: "bg-blue-500" },
};

export const LEVEL_COLORS: Record<string, string> = {
  beginner:     "bg-blue-100 text-blue-700 border-blue-200",
  intermediate: "bg-purple-100 text-purple-700 border-purple-200",
  advanced:     "bg-rose-100 text-rose-700 border-rose-200",
};

export const STUDENT_STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive:  "bg-gray-100 text-gray-600 border-gray-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  "at-risk": "bg-amber-100 text-amber-700 border-amber-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmt(n: number) {
  return String(n).padStart(2, "0");
}

/** Convert any common time string to HH:MM (24h). Returns null if unparseable. */
export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":").map(Number);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toLowerCase();
    if (period === "am" && h === 12) h = 0;
    if (period === "pm" && h !== 12) h += 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return null;
}

// ─── Bangladesh Time (Asia/Dhaka / UTC+6) Helpers ─────────────────────────────
export const BD_TIMEZONE = "Asia/Dhaka";

export function formatDT(isoString: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BD_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const day   = map.day || "00";
  const month = map.month || "00";
  const year  = map.year || "0000";
  const hour  = String(map.hour || "00").padStart(2, "0");
  const min   = map.minute || "00";
  const ampm  = (map.dayPeriod || "").toUpperCase();

  return `${day}.${month}.${year} : ${hour}:${min}${ampm}`;
}

/** Get current year-month (YYYY-MM) in Bangladesh Time */
export function getBdCurrentMonth(): string {
  const d = new Date();
  const year  = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, year: "numeric" }).format(d);
  const month = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, month: "2-digit" }).format(d);
  return `${year}-${month}`;
}

/** Get current weekday name lowercase (e.g. "tuesday") in Bangladesh Time */
export function getBdDayKey(): string {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, weekday: "long" }).format(new Date());
  return weekday.toLowerCase().trim();
}

/** Get current date in ISO YYYY-MM-DD format in Bangladesh Time */
export function getBdTodayIso(): string {
  const d = new Date();
  const year  = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, year: "numeric" }).format(d);
  const month = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, month: "2-digit" }).format(d);
  const day   = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, day: "2-digit" }).format(d);
  return `${year}-${month}-${day}`;
}

/** Get formatted today date string in Bangladesh Time */
export function getBdTodayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: BD_TIMEZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Get current 24-hour time HH:MM in Bangladesh Time */
export function getBdClientTime(): string {
  const d = new Date();
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, hour: "2-digit", hour12: false }).format(d);
  const min  = new Intl.DateTimeFormat("en-US", { timeZone: BD_TIMEZONE, minute: "2-digit" }).format(d);
  return `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
}

/** Check if a date string falls on today in Bangladesh Time */
export function isBdToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const dateStr  = d.toLocaleDateString("en-US", { timeZone: BD_TIMEZONE });
  const todayStr = new Date().toLocaleDateString("en-US", { timeZone: BD_TIMEZONE });
  return dateStr === todayStr;
}

