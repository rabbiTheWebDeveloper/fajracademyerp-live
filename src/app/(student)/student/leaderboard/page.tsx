"use client";

import { useState, useEffect, useRef } from "react";
import {
  Trophy,
  Medal,
  Star,
  Users,
  CheckSquare,
  Search,
  RefreshCw,
  Zap,
  BarChart2,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface LeaderboardEntry {
  _id: string;
  rank: number;
  fullName: string;
  avatar: string | null;
  gender: string;
  studentId: string;
  studentNumber: string;
  course: string;
  status: string;
  totalAttendance: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  totalSessions: number;
  completedSessions: number;
  sessionPresent: number;
  sessionAbsent: number;
  sessionRate: number;
  score: number;
}

/* ── Trophy Badge ───────────────────────────────────────── */
function TrophyBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="relative inline-flex items-center justify-center w-10 h-10">
        <Trophy className="w-8 h-8" style={{ color: "#FFD700" }} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white text-[8px] font-black text-yellow-900 flex items-center justify-center">
          1
        </span>
      </span>
    );
  if (rank === 2)
    return (
      <span className="relative inline-flex items-center justify-center w-10 h-10">
        <Medal className="w-7 h-7" style={{ color: "#C0C0C0" }} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-400 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center">
          2
        </span>
      </span>
    );
  if (rank === 3)
    return (
      <span className="relative inline-flex items-center justify-center w-10 h-10">
        <Medal className="w-7 h-7" style={{ color: "#CD7F32" }} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center">
          3
        </span>
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-500 font-bold text-sm">
      #{rank}
    </span>
  );
}

/* ── Student Avatar ─────────────────────────────────────── */
function StudentAvatar({
  entry,
  size = "md",
}: {
  entry: LeaderboardEntry;
  size?: "sm" | "md" | "lg";
}) {
  const sizeCls =
    size === "lg"
      ? "w-20 h-20 text-2xl"
      : size === "sm"
      ? "w-9 h-9 text-xs"
      : "w-12 h-12 text-base";

  const initials = entry.fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const gradients = [
    "from-violet-500 to-purple-700",
    "from-blue-500 to-indigo-700",
    "from-emerald-500 to-teal-700",
    "from-rose-500 to-pink-700",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-sky-700",
  ];
  const g = gradients[entry.fullName.charCodeAt(0) % gradients.length];

  if (entry.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={entry.avatar}
        alt={entry.fullName}
        className={sizeCls + " rounded-full object-cover border-2 border-white shadow"}
      />
    );
  }
  return (
    <div
      className={
        sizeCls +
        " rounded-full bg-gradient-to-br " +
        g +
        " text-white flex items-center justify-center font-bold shadow border-2 border-white"
      }
    >
      {initials}
    </div>
  );
}

/* ── Score Ring ─────────────────────────────────────────── */
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 85
      ? "#22c55e"
      : score >= 70
      ? "#f59e0b"
      : score >= 50
      ? "#3b82f6"
      : "#ef4444";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <span className="absolute text-xs font-extrabold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

/* ── Podium Card ────────────────────────────────────────── */
function PodiumCard({
  entry,
  rank,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
}) {
  type CfgKey = 1 | 2 | 3;
  const cfgMap: Record<
    CfgKey,
    {
      order: string;
      standH: string;
      cardBg: string;
      border: string;
      badgeCls: string;
      emoji: string;
      standGrad: string;
      ringCls: string;
    }
  > = {
    1: {
      order: "order-2",
      standH: "h-36",
      cardBg: "from-yellow-50 via-amber-50 to-orange-50",
      border: "border-yellow-300",
      badgeCls: "bg-yellow-400 text-yellow-900",
      emoji: "🥇",
      standGrad: "from-yellow-400 to-amber-500",
      ringCls: "ring-4 ring-yellow-400 ring-offset-2",
    },
    2: {
      order: "order-1",
      standH: "h-24",
      cardBg: "from-slate-50 via-gray-50 to-slate-100",
      border: "border-slate-300",
      badgeCls: "bg-slate-400 text-white",
      emoji: "🥈",
      standGrad: "from-slate-400 to-slate-500",
      ringCls: "ring-4 ring-slate-400 ring-offset-2",
    },
    3: {
      order: "order-3",
      standH: "h-20",
      cardBg: "from-amber-50 via-orange-50 to-yellow-50",
      border: "border-amber-600",
      badgeCls: "bg-amber-600 text-white",
      emoji: "🥉",
      standGrad: "from-amber-600 to-orange-700",
      ringCls: "ring-4 ring-amber-600 ring-offset-2",
    },
  };

  const c = cfgMap[rank];

  return (
    <div className={c.order + " flex flex-col items-center gap-3"}>
      {/* Card */}
      <div
        className={
          "relative bg-gradient-to-b " +
          c.cardBg +
          " border-2 " +
          c.border +
          " rounded-2xl p-4 shadow-xl w-40 sm:w-44 text-center"
        }
      >
        <div className="text-3xl mb-2">{c.emoji}</div>

        <div className="flex justify-center mb-2">
          <div className={c.ringCls + " rounded-full"}>
            <StudentAvatar entry={entry} size={rank === 1 ? "lg" : "md"} />
          </div>
        </div>

        <p className="font-extrabold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">
          {entry.fullName}
        </p>
        <p className="text-[10px] text-gray-500 mb-2">
          {entry.studentId || entry.studentNumber}
        </p>

        <div className="flex justify-center">
          <ScoreRing score={entry.score} size={52} />
        </div>

        <span
          className={
            "absolute -top-3 -right-3 w-8 h-8 rounded-full " +
            c.badgeCls +
            " font-black text-sm flex items-center justify-center shadow border-2 border-white"
          }
        >
          {rank}
        </span>
      </div>

      {/* Podium stand */}
      <div
        className={
          c.standH +
          " w-32 sm:w-36 bg-gradient-to-b " +
          c.standGrad +
          " rounded-t-xl shadow-lg flex items-center justify-center"
        }
      >
        <span className="text-white font-black text-2xl opacity-30">{rank}</span>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "attendance" | "sessions">("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [totalStudents, setTotalStudents] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const hasFetched = useRef(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/teacher-portal/leaderboard");
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setTotalStudents(data.totalStudents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = leaderboard
    .filter(
      (e) =>
        e.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (e.studentId || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.course || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortBy === "score") return (b.score - a.score) * dir;
      if (sortBy === "attendance") return (b.attendanceRate - a.attendanceRate) * dir;
      return (b.sessionRate - a.sessionRate) * dir;
    });

  const top3 = leaderboard.slice(0, 3);

  const toggleSort = (col: "score" | "attendance" | "sessions") => {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const avgScore =
    leaderboard.length > 0
      ? Math.round(leaderboard.reduce((s, e) => s + e.score, 0) / leaderboard.length)
      : 0;
  const avgAtt =
    leaderboard.length > 0
      ? Math.round(
          leaderboard.reduce((s, e) => s + e.attendanceRate, 0) / leaderboard.length
        )
      : 0;
  const topScore = leaderboard[0]?.score || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-xl animate-pulse">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow" />
        </div>
        <p className="text-gray-500 font-medium">Loading leaderboard...</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Students",
      value: String(totalStudents),
      icon: Users,
      color: "from-indigo-500 to-violet-600",
      bg: "bg-indigo-50",
      text: "text-indigo-600",
    },
    {
      label: "Avg. Score",
      value: avgScore + "/100",
      icon: Star,
      color: "from-yellow-400 to-amber-500",
      bg: "bg-yellow-50",
      text: "text-yellow-600",
    },
    {
      label: "Avg. Attendance",
      value: avgAtt + "%",
      icon: CheckSquare,
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      label: "Top Score",
      value: String(topScore),
      icon: Trophy,
      color: "from-rose-500 to-pink-600",
      bg: "bg-rose-50",
      text: "text-rose-600",
    },
  ];

  return (
    <>
      <style>{`
        .rank-1-row { background: linear-gradient(90deg,#fffbeb,#fef3c7,#fffbeb); }
        .rank-2-row { background: linear-gradient(90deg,#f8fafc,#f1f5f9,#f8fafc); }
        .rank-3-row { background: linear-gradient(90deg,#fff7ed,#ffedd5,#fff7ed); }
      `}</style>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Student Leaderboard
              </h2>
            </div>
            <p className="text-sm text-gray-500 pl-14">
              Ranked by attendance rate, session presence &amp; performance score
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={refreshing ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3 overflow-hidden relative"
            >
              <div
                className={"absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r " + s.color}
              />
              <div className={"p-2.5 " + s.bg + " rounded-xl"}>
                <s.icon className={"w-5 h-5 " + s.text} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {leaderboard.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-700">No students yet</h3>
              <p className="text-sm text-gray-400 mt-1">
                Students will appear here once attendance is recorded.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length >= 1 && (
              <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-950 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-4 left-10 w-32 h-32 rounded-full bg-white/5" />
                  <div className="absolute bottom-6 right-8 w-48 h-48 rounded-full bg-white/5" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/[0.03]" />
                </div>
                <div className="relative z-10">
                  <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-2 text-yellow-400 font-black text-xl tracking-wide">
                      <span className="text-2xl">🏆</span>
                      TOP PERFORMERS
                      <span className="text-2xl">🏆</span>
                    </span>
                    <p className="text-indigo-300 text-sm mt-1">
                      Best students by performance score
                    </p>
                  </div>
                  <div className="flex items-end justify-center gap-2 sm:gap-4">
                    {top3[1] && <PodiumCard entry={top3[1]} rank={2} />}
                    {top3[0] && <PodiumCard entry={top3[0]} rank={1} />}
                    {top3[2] && <PodiumCard entry={top3[2]} rank={3} />}
                  </div>
                </div>
              </div>
            )}

            {/* Search + Sort */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, student ID, or course..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Sort:</span>
                {(["score", "attendance", "sessions"] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => toggleSort(col)}
                    className={
                      "flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all " +
                      (sortBy === col
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                    }
                  >
                    {col === "score"
                      ? "Score"
                      : col === "attendance"
                      ? "Attendance"
                      : "Sessions"}
                    {sortBy === col &&
                      (sortDir === "desc" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      ))}
                  </button>
                ))}
              </div>
            </div>

            {/* Rankings table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-500" />
                  Full Rankings
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                  {filtered.length} students
                </span>
              </div>

              {/* Desktop header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-4">Student</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Attendance</div>
                <div className="col-span-2 text-center">Sessions</div>
                <div className="col-span-1 text-center">Status</div>
              </div>

              <div className="divide-y divide-gray-50">
                {filtered.map((entry, idx) => {
                  const rowCls =
                    entry.rank === 1
                      ? "rank-1-row"
                      : entry.rank === 2
                      ? "rank-2-row"
                      : entry.rank === 3
                      ? "rank-3-row"
                      : idx % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50/40";

                  const statusCls =
                    entry.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : entry.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : entry.status === "at-risk"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-gray-100 text-gray-500";

                  const attBarColor =
                    entry.attendanceRate >= 85
                      ? "#22c55e"
                      : entry.attendanceRate >= 70
                      ? "#f59e0b"
                      : "#ef4444";

                  return (
                    <div
                      key={entry._id}
                      className={rowCls + " hover:bg-indigo-50/50 transition-colors"}
                    >
                      {/* Mobile row */}
                      <div className="sm:hidden flex items-center gap-3 p-4">
                        <TrophyBadge rank={entry.rank} />
                        <StudentAvatar entry={entry} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {entry.fullName}
                          </p>
                          <p className="text-[10px] text-gray-500">{entry.studentId}</p>
                        </div>
                        <div className="text-right">
                          <ScoreRing score={entry.score} size={44} />
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {entry.attendanceRate}% att
                          </p>
                        </div>
                      </div>

                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-12 gap-2 items-center px-5 py-3.5">
                        <div className="col-span-1 flex justify-center">
                          <TrophyBadge rank={entry.rank} />
                        </div>

                        <div className="col-span-4 flex items-center gap-3">
                          <StudentAvatar entry={entry} size="sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">
                              {entry.fullName}
                              {entry.rank === 1 && " 🥇"}
                              {entry.rank === 2 && " 🥈"}
                              {entry.rank === 3 && " 🥉"}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              <span className="font-mono">
                                {entry.studentId || entry.studentNumber}
                              </span>
                              {entry.course && (
                                <span> &middot; {entry.course}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="col-span-2 flex flex-col items-center gap-1">
                          <ScoreRing score={entry.score} size={48} />
                          <span className="text-[10px] text-gray-400">performance</span>
                        </div>

                        <div className="col-span-2 flex flex-col items-center gap-1">
                          <span className="text-lg font-extrabold text-gray-900">
                            {entry.attendanceRate}%
                          </span>
                          <div className="w-full max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: entry.attendanceRate + "%",
                                background: attBarColor,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {entry.presentCount}/{entry.totalAttendance} present
                          </span>
                        </div>

                        <div className="col-span-2 flex flex-col items-center gap-1">
                          <span className="text-lg font-extrabold text-gray-900">
                            {entry.sessionRate}%
                          </span>
                          <div className="w-full max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                              style={{ width: entry.sessionRate + "%" }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {entry.sessionPresent}/{entry.totalSessions} sessions
                          </span>
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <span
                            className={
                              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " +
                              statusCls
                            }
                          >
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filtered.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No students match your search.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Score legend */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" />
                How Scores Are Calculated
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <p className="font-bold text-indigo-700 mb-1">60% &#8212; Attendance Rate</p>
                  <p>Based on present / total attendance records from your classes.</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                  <p className="font-bold text-purple-700 mb-1">40% &#8212; Session Presence</p>
                  <p>Session attendance marked when ending each class session.</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="font-bold text-emerald-700 mb-1">Bonus Points</p>
                  <p>
                    +5 active status &middot; +5 for &ge;90% attendance &middot; +2 for
                    &ge;80%
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
