"use client";

import { useState, useEffect, useRef } from "react";
import {
  Trophy,
  Medal,
  Star,
  Users,
  Search,
  RefreshCw,
  Zap,
  BarChart2,
  ChevronUp,
  ChevronDown,
  Loader2,
  UserCheck,
  HelpCircle,
} from "lucide-react";



interface TeacherEntry {
  _id: string;
  rank: number;
  fullName: string;
  avatar: string | null;
  gender: string;
  teacherId: string;
  designation: string;
  status: string;
  rating: number;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  studentCount: number;
  presentStudents: number;
  score: number;
  totalGems: number;
  monthlyGems: number;
  tierName: string;
  tierEmoji: string;
  tierLabel: string;
  isMe: boolean;
}

// ── Trophy Badge ─────────────────────────────────────────────────────────────
function TrophyBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="relative inline-flex items-center justify-center w-10 h-10">
        <Trophy className="w-8 h-8" style={{ color: "#FFD700" }} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white text-[8px] font-black text-yellow-900 flex items-center justify-center">1</span>
      </span>
    );
  if (rank === 2)
    return (
      <span className="relative inline-flex items-center justify-center w-10 h-10">
        <Medal className="w-7 h-7" style={{ color: "#C0C0C0" }} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-400 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center">2</span>
      </span>
    );
  if (rank === 3)
    return (
      <span className="relative inline-flex items-center justify-center w-10 h-10">
        <Medal className="w-7 h-7" style={{ color: "#CD7F32" }} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center">3</span>
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-500 font-bold text-sm">
      #{rank}
    </span>
  );
}

// ── Generic Avatar ────────────────────────────────────────────────────────────
function PersonAvatar({
  name,
  avatar,
  size = "md",
}: {
  name: string;
  avatar: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeCls =
    size === "lg"
      ? "w-14 h-14 sm:w-20 sm:h-20 text-lg sm:text-2xl"
      : size === "sm"
        ? "w-8 h-8 sm:w-9 sm:h-9 text-[10px] sm:text-xs"
        : "w-10 h-10 sm:w-12 sm:h-12 text-xs sm:text-base";
  const initials = name
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
    "from-indigo-500 to-blue-700",
    "from-fuchsia-500 to-purple-700",
  ];


  const g = gradients[name.charCodeAt(0) % gradients.length];
  // if (avatar) {
  //   // eslint-disable-next-line @next/next/no-img-element
  //   return (
  //     <img
  //       src={avatar}
  //       alt={name}
  //       className={sizeCls + " rounded-full object-cover border-2 border-white shadow"}
  //     />
  //   );
  // }
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

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 85 ? "#22c55e" : score >= 70 ? "#f59e0b" : score >= 50 ? "#3b82f6" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <span className="absolute text-xs font-extrabold" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={"w-3 h-3 " + (i <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200")}
        />
      ))}
      <span className="text-[10px] text-gray-500 ml-1">{rating > 0 ? rating.toFixed(1) : "—"}</span>
    </div>
  );
}

// ── Podium Card ────────────────────────────────────────────────────────────────
function PodiumCard<T extends { fullName: string; avatar: string | null; score: number; teacherId?: string; studentId?: string; studentNumber?: string; isMe?: boolean }>({
  entry, rank,
}: {
  entry: T;
  rank: 1 | 2 | 3;
}) {
  const cfgMap: Record<1 | 2 | 3, {
    order: string; standH: string; cardBg: string; border: string;
    badgeCls: string; emoji: string; standGrad: string; ringCls: string;
  }> = {
    1: {
      order: "order-1", standH: "h-20 sm:h-36",
      cardBg: "from-yellow-50 via-amber-50 to-orange-50", border: "border-yellow-300",
      badgeCls: "bg-yellow-400 text-yellow-900", emoji: "🥇",
      standGrad: "from-yellow-400 to-amber-500", ringCls: "ring-2 sm:ring-4 ring-yellow-400 ring-offset-1 sm:ring-offset-2",
    },
    2: {
      order: "order-2", standH: "h-14 sm:h-24",
      cardBg: "from-slate-50 via-gray-50 to-slate-100", border: "border-slate-300",
      badgeCls: "bg-slate-400 text-white", emoji: "🥈",
      standGrad: "from-slate-400 to-slate-500", ringCls: "ring-2 sm:ring-4 ring-slate-400 ring-offset-1 sm:ring-offset-2",
    },
    3: {
      order: "order-3", standH: "h-10 sm:h-20",
      cardBg: "from-amber-50 via-orange-50 to-yellow-50", border: "border-amber-600",
      badgeCls: "bg-amber-600 text-white", emoji: "🥉",
      standGrad: "from-amber-600 to-orange-700", ringCls: "ring-2 sm:ring-4 ring-amber-600 ring-offset-1 sm:ring-offset-2",
    },
  };
  const c = cfgMap[rank];
  const idLabel = (entry as any).teacherId || (entry as any).studentId || (entry as any).studentNumber || "";
  const isMe = (entry as any).isMe === true;

  return (
    <div className={c.order + " flex flex-col items-center gap-1.5 sm:gap-3 w-[29vw] xs:w-[28vw] sm:w-36 md:w-44 flex-shrink-0"}>
      <div
        className={
          "relative bg-gradient-to-b " + c.cardBg + " border-2 " + c.border +
          " rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-xl w-full text-center" +
          (isMe ? " ring-2 ring-indigo-500 ring-offset-1 sm:ring-offset-2" : "")
        }
      >
        {isMe && (
          <span className="absolute top-1 left-1 text-[8px] sm:text-[9px] font-black bg-indigo-600 text-white px-1 sm:px-1.5 py-0.5 rounded-full">YOU</span>
        )}
        <div className="text-xl sm:text-3xl mb-1.5 sm:mb-2">{c.emoji}</div>
        <div className="flex justify-center mb-1.5 sm:mb-2">
          <div className={c.ringCls + " rounded-full"}>
            <PersonAvatar name={entry.fullName} avatar={entry.avatar} size={rank === 1 ? "lg" : "md"} />
          </div>
        </div>
        <p className="font-extrabold text-gray-900 text-[10px] sm:text-sm leading-tight line-clamp-2 mb-0.5 sm:mb-1">{entry.fullName}</p>
        <p className="text-[8px] sm:text-[10px] text-gray-500 mb-1 sm:mb-2 truncate">{idLabel}</p>
        <div className="flex justify-center scale-75 sm:scale-100 origin-center my-0.5 sm:my-0">
          <ScoreRing score={entry.score} size={40} />
        </div>
        <span
          className={"absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full " + c.badgeCls +
            " font-black text-xs sm:text-sm flex items-center justify-center shadow border border-2 border-white"}
        >
          {rank}
        </span>
      </div>
      <div
        className={c.standH + " w-full bg-gradient-to-b " + c.standGrad +
          " rounded-t-xl shadow-lg flex items-center justify-center"}
      >
        <span className="text-white font-black text-lg sm:text-2xl opacity-30">{rank}</span>
      </div>
    </div>
  );
}

// ── My Rank Banner ─────────────────────────────────────────────────────────────
function MyRankBanner({ myEntry, myRank, totalTeachers }: {
  myEntry: TeacherEntry | null;
  myRank: number | null;
  totalTeachers: number;
}) {
  if (!myEntry) return null;
  const pct = totalTeachers > 1 ? Math.round(((totalTeachers - myRank!) / (totalTeachers - 1)) * 100) : 100;
  const medalEmoji = myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "📊";

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-4 w-40 h-40 rounded-full bg-white/5" />
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="relative">
            <PersonAvatar name={myEntry.fullName} avatar={myEntry.avatar} size="md" />
            <span className="absolute -bottom-1 -right-1 text-lg leading-none">{medalEmoji}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wide mb-0.5">Your Ranking</p>
          <p className="font-extrabold text-white text-lg truncate">{myEntry.fullName}</p>
          <p className="text-indigo-300 text-xs">{myEntry.designation}</p>
        </div>
        <div className="flex-shrink-0 text-center">
          <div className="text-4xl font-black text-yellow-400">#{myRank}</div>
          <div className="text-[10px] text-indigo-300 mt-0.5">of {totalTeachers}</div>
        </div>
        <div className="flex-shrink-0 text-center hidden sm:block">
          <ScoreRing score={myEntry.score} size={60} />
          <p className="text-[10px] text-indigo-300 mt-1">Score</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="relative z-10 mt-4">
        <div className="flex justify-between text-[10px] text-indigo-300 mb-1">
          <span>Percentile position</span>
          <span>Top {100 - pct}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-700"
            style={{ width: pct + "%" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-indigo-400 mt-1">
          <span>Classes: {myEntry.completionRate}%</span>
          <span>Students: {myEntry.studentCount}</span>
        </div>
      </div>
    </div>
  );
}

// ── Bangla Leaderboard Info Component ─────────────────────────────────────────
function LeaderboardBanglaGuide({ activeTab }: { activeTab: "teachers" | "students" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-indigo-800/50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-yellow-400 flex-shrink-0 shadow-inner">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2 flex-wrap">
              লিডারবোর্ড পয়েন্ট ও র‍্যাংক কিভাবে হিসাব করা হয়?
              <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-400/30 font-normal">
                গাইড ও নির্দেশিকা
              </span>
            </h3>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              সহজে আপনার পয়েন্ট অর্জন এবং র‍্যাংকিং বন্টনের হিসাব নিচে দেখুন।
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-md active:scale-95"
        >
          {isOpen ? "বন্ধ করুন" : "হিসাব দেখুন"}
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-indigo-800/60 space-y-4 text-xs">
          {activeTab === "teachers" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-yellow-300 font-bold border-b border-indigo-800/40 pb-2">
                <span className="flex items-center gap-1.5 text-sm">👨‍🏫 শিক্ষক লিডারবোর্ড পয়েন্ট নিয়ম (মোট ১০০ পয়েন্ট)</span>
                <span className="text-[11px] font-normal text-indigo-300">চলতি মাসের পারফরম্যান্স</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-900/40 border border-indigo-700/50 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-300">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/30 flex items-center justify-center text-xs font-black text-purple-200">60%</span>
                    ক্লাস সম্পন্ন করা (৬০%)
                  </div>
                  <p className="text-indigo-200 leading-relaxed text-[11px]">
                    নির্ধারিত ক্লাসের কত শতাংশ সম্পন্ন (Completed) করেছেন।
                  </p>
                  <p className="text-[10px] text-yellow-300 font-bold pt-1 border-t border-indigo-800/40">
                    💡 ৯০%+ সম্পন্ন করলে অতিরিক্ত <strong>+৫ পয়েন্ট বোনাস</strong>!
                  </p>
                </div>

                <div className="bg-indigo-900/40 border border-indigo-700/50 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/30 flex items-center justify-center text-xs font-black text-amber-200">25%</span>
                    সক্রিয় শিক্ষার্থী (২৫%)
                  </div>
                  <p className="text-indigo-200 leading-relaxed text-[11px]">
                    ক্লাসের মোট ইউনিক ছাত্র/ছাত্রীর সংখ্যা। প্রতি শিক্ষার্থী = ৩ পয়েন্ট (সর্বোচ্চ ২৫)।
                  </p>
                </div>

                <div className="bg-indigo-900/40 border border-indigo-700/50 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/30 flex items-center justify-center text-xs font-black text-emerald-200">15%</span>
                    শিক্ষার্থী রেটিং (১৫%)
                  </div>
                  <p className="text-indigo-200 leading-relaxed text-[11px]">
                    শিক্ষার্থীদের প্রদত্ত ফিডব্যাক রেটিং (Rating × ৩, ৫ স্টার রেটিং = ১৫ পয়েন্ট)।
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-emerald-300 font-bold border-b border-indigo-800/40 pb-2">
                <span className="flex items-center gap-1.5 text-sm">🎓 শিক্ষার্থী লিডারবোর্ড পয়েন্ট নিয়ম (মোট ১০০ পয়েন্ট)</span>
                <span className="text-[11px] font-normal text-indigo-300">চলতি মাসের উপস্থিতি</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-900/40 border border-indigo-700/50 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-300">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/30 flex items-center justify-center text-xs font-black text-blue-200">60%</span>
                    সার্বিক উপস্থিতি (৬০%)
                  </div>
                  <p className="text-indigo-200 leading-relaxed text-[11px]">
                    মাসিক উপস্থিতির মোট হারের উপর ভিত্তি করে পয়েন্ট নির্ধারণ হয়।
                  </p>
                </div>

                <div className="bg-indigo-900/40 border border-indigo-700/50 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-300">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/30 flex items-center justify-center text-xs font-black text-purple-200">40%</span>
                    লাইভ ক্লাস সেশন (৪০%)
                  </div>
                  <p className="text-indigo-200 leading-relaxed text-[11px]">
                    লাইভ ক্লাস শেষে শিক্ষকের মার্ক করা উপস্থিতির শতাংশ।
                  </p>
                </div>

                <div className="bg-indigo-900/40 border border-indigo-700/50 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-yellow-300">
                    <span className="w-6 h-6 rounded-lg bg-yellow-500/30 flex items-center justify-center text-xs font-black text-yellow-200">🎁</span>
                    অতিরিক্ত বোনাস পয়েন্ট
                  </div>
                  <ul className="text-indigo-200 leading-relaxed text-[11px] space-y-1">
                    <li>• এক্টিভ স্ট্যাটাসে: <strong>+৫ পয়েন্ট</strong></li>
                    <li>• উপস্থিতি ৯০%+: <strong>+৫ বোনাস</strong></li>
                    <li>• উপস্থিতি ৮০%+: <strong>+২ বোনাস</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Color Indicators */}
          <div className="bg-indigo-950/80 p-3 rounded-xl border border-indigo-800/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-indigo-300">স্কোর নির্দেশক কালার:</span>
            <div className="flex items-center gap-3 flex-wrap font-bold">
              <span className="text-emerald-400">🟢 ৮৫ - ১০০ (অসামান্য)</span>
              <span className="text-amber-400">🟠 ৭০ - ৮৪ (ভালো)</span>
              <span className="text-blue-400">🔵 ৫০ - ৬৯ (মাঝারি)</span>
              <span className="text-rose-400">🔴 ৫০ এর নিচে (উন্নতি প্রয়োজন)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"teachers" | "students">("teachers");
  // Teacher leaderboard state
  const [teacherBoard, setTeacherBoard] = useState<TeacherEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myEntry, setMyEntry] = useState<TeacherEntry | null>(null);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [teacherSortBy, setTeacherSortBy] = useState<"score" | "sessions">("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [refreshing, setRefreshing] = useState(false);
  const hasFetched = useRef(false);

  const fetchTeachers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setTeacherLoading(true);
    try {
      const res = await fetch("/api/teacher-portal/teacher-leaderboard");
      const data = await res.json();
      if (data.success) {
        setTeacherBoard(data.teacherLeaderboard || []);
        setMyRank(data.myRank);
        setMyEntry(data.myEntry);
        setTotalTeachers(data.totalTeachers || 0);
      }
    } catch (e) { console.error(e); }
    finally { setTeacherLoading(false); setRefreshing(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTeachers(true)]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchTeachers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teacher tab sort/filter
  const filteredTeachers = teacherBoard
    .filter((e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (e.teacherId || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.designation || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dir = sortDir === "desc" ? 1 : -1;
      if (teacherSortBy === "score") return (b.score - a.score) * dir;
      return (b.completionRate - a.completionRate) * dir;
    });

  const toggleTeacherSort = (col: "score" | "sessions") => {
    if (teacherSortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setTeacherSortBy(col); setSortDir("desc"); }
  };

  const teacherTop3 = teacherBoard.slice(0, 3);
  const isLoading = activeTab === "teachers" ? teacherLoading : studentLoading;

  // Summary numbers
  const tAvgScore = teacherBoard.length > 0 ? Math.round(teacherBoard.reduce((s, e) => s + e.score, 0) / teacherBoard.length) : 0;
  if (isLoading) {
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

  return (
    <>
      <style>{`
        .rank-1-row { background: linear-gradient(90deg,#fffbeb,#fef3c7,#fffbeb); }
        .rank-2-row { background: linear-gradient(90deg,#f8fafc,#f1f5f9,#f8fafc); }
        .rank-3-row { background: linear-gradient(90deg,#fff7ed,#ffedd5,#fff7ed); }
        .me-row     { background: linear-gradient(90deg,#eef2ff,#e0e7ff,#eef2ff) !important; border-left: 3px solid #6366f1; }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Leaderboard</h2>
            </div>
            <p className="text-sm text-gray-500 pl-14">Monthly rankings by performance score &amp; class completion</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={refreshing ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => { setActiveTab("teachers"); setSearch(""); setTeacherSortBy("score"); setSortDir("desc"); }}
            className={
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all " +
              (activeTab === "teachers" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")
            }
          >
            <UserCheck className="w-4 h-4" />
            Teachers
          </button>
        </div>
        {/* ── Bangla Leaderboard Explanation Guide ── */}
        <LeaderboardBanglaGuide activeTab={activeTab} />

        {/* ── TEACHER TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "teachers" && (
          <>
            {/* My Rank Banner */}
            <MyRankBanner myEntry={myEntry} myRank={myRank} totalTeachers={totalTeachers} />

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Total Teachers", value: String(totalTeachers), icon: Users, color: "from-indigo-500 to-violet-600", bg: "bg-indigo-50", text: "text-indigo-600" },
                { label: "Your Rank", value: myRank ? "#" + myRank : "—", icon: Trophy, color: "from-yellow-400 to-amber-500", bg: "bg-yellow-50", text: "text-yellow-600" },
                { label: "Avg. Score", value: tAvgScore + "/100", icon: Star, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3 overflow-hidden relative">
                  <div className={"absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r " + s.color} />
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

            {/* Teacher Podium */}
            {teacherTop3.length >= 1 && (
              <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-950 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-4 left-10 w-32 h-32 rounded-full bg-white/5" />
                  <div className="absolute bottom-6 right-8 w-48 h-48 rounded-full bg-white/5" />
                </div>
                <div className="relative z-10">
                  <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-2 text-yellow-400 font-black text-xl tracking-wide">
                      <span className="text-2xl">🏆</span> TOP TEACHERS <span className="text-2xl">🏆</span>
                    </span>
                    <p className="text-indigo-300 text-sm mt-1">Best performing teachers this month</p>
                  </div>
                  <div className="flex items-end justify-center gap-2 sm:gap-4">
                    {teacherTop3[0] && <PodiumCard entry={teacherTop3[0]} rank={1} />}
                    {teacherTop3[1] && <PodiumCard entry={teacherTop3[1]} rank={2} />}
                    {teacherTop3[2] && <PodiumCard entry={teacherTop3[2]} rank={3} />}
                  </div>
                </div>
              </div>
            )}

            {/* Search + Sort */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" placeholder="Search teacher by name, ID or designation..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Sort:</span>
                {(["score", "sessions"] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => toggleTeacherSort(col)}
                    className={"flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all " +
                      (teacherSortBy === col ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                  >
                    {col === "score" ? "Score" : "Classes"}
                    {teacherSortBy === col && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher Rankings Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-500" /> Top Teachers Rankings
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">{filteredTeachers.length} teachers</span>
              </div>

              {/* Desktop header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-3">Teacher</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Classes</div>
                <div className="col-span-2 text-center">💎 Gems</div>
                <div className="col-span-1 text-center">Students</div>
                <div className="col-span-1 text-center">Rating</div>
              </div>

              <div className="divide-y divide-gray-50">
                {filteredTeachers.map((entry, idx) => {
                  const rowCls = entry.isMe
                    ? "me-row"
                    : entry.rank === 1 ? "rank-1-row"
                      : entry.rank === 2 ? "rank-2-row"
                        : entry.rank === 3 ? "rank-3-row"
                          : idx % 2 === 0 ? "bg-white" : "bg-gray-50/40";

                  return (
                    <div key={entry._id} className={rowCls + " hover:bg-indigo-50/50 transition-colors"}>
                      {/* Mobile */}
                      <div className="sm:hidden flex items-center gap-3 p-4">
                        <TrophyBadge rank={entry.rank} />
                        <PersonAvatar name={entry.fullName} avatar={entry.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate flex items-center gap-1">
                            {entry.fullName}
                            {entry.isMe && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black">YOU</span>}
                          </p>
                          <p className="text-[10px] text-gray-500">{entry.designation}</p>
                        </div>
                        <div className="text-right">
                          <ScoreRing score={entry.score} size={44} />
                          <p className="text-[10px] text-gray-500 mt-0.5">{entry.completionRate}% cls</p>
                        </div>
                      </div>

                      <div className="hidden sm:grid grid-cols-12 gap-2 items-center px-5 py-3.5">
                        <div className="col-span-1 flex justify-center"><TrophyBadge rank={entry.rank} /></div>
                        <div className="col-span-3 flex items-center gap-2.5">
                          <PersonAvatar name={entry.fullName} avatar={entry.avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate flex items-center gap-1.5">
                              {entry.fullName}
                              {entry.rank === 1 && " 🥇"}{entry.rank === 2 && " 🥈"}{entry.rank === 3 && " 🥉"}
                              {entry.isMe && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black">YOU</span>}
                              <span title={entry.tierLabel ?? ""}>{entry.tierEmoji}</span>
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              <span className="font-mono">{entry.teacherId}</span>
                              {entry.designation && <span> · {entry.designation}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2 flex flex-col items-center gap-1">
                          <ScoreRing score={entry.score} size={48} />
                          <span className="text-[10px] text-gray-400">performance</span>
                        </div>
                        <div className="col-span-2 flex flex-col items-center gap-1">
                          <span className="text-lg font-extrabold text-gray-900">{entry.completionRate}%</span>
                          <div className="w-full max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: entry.completionRate + "%" }} />
                          </div>
                          <span className="text-[10px] text-gray-400">{entry.completedSessions}/{entry.totalSessions}</span>
                        </div>
                        <div className="col-span-2 flex flex-col items-center gap-1">
                          <span className="text-lg font-extrabold text-yellow-600">{(entry.monthlyGems ?? 0) >= 0 ? "+" : ""}{entry.monthlyGems ?? 0} 💎</span>
                          <span className="text-[10px] text-gray-400">this month</span>
                        </div>
                        <div className="col-span-1 flex flex-col items-center gap-1">
                          <span className="text-lg font-extrabold text-gray-900">{entry.studentCount}</span>
                          <span className="text-[10px] text-gray-400">students</span>
                        </div>
                        <div className="col-span-1 flex flex-col items-center gap-1">
                          <StarRating rating={entry.rating} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredTeachers.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No teachers match your search.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Teacher Score Legend (Bangla) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" /> শিক্ষক পয়েন্ট হিসাবের নিয়মাবলী (Teacher Score Formula)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                  <p className="font-bold text-purple-700 mb-1">৬০% &#8212; ক্লাস কমপ্লিশন (Completion Rate)</p>
                  <p>বরাদ্দকৃত ক্লাসের মধ্যে সম্পন্নকৃত ক্লাসের শতাংশ। (৯০%+ সম্পন্ন করলে +৫ বোনাস পয়েন্ট)</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="font-bold text-amber-700 mb-1">২৫% &#8212; শিক্ষার্থী সংখ্যা (Student Count)</p>
                  <p>ক্লাসের মোট ইউনিক শিক্ষার্থী সংখ্যা (প্রতি শিক্ষার্থী = ৩ পয়েন্ট, সর্বোচ্চ ২৫ পয়েন্ট)।</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="font-bold text-emerald-700 mb-1">১৫% &#8212; শিক্ষার্থী রেটিং (Student Rating)</p>
                  <p>শিক্ষার্থীদের প্রদত্ত গড় স্টার রেটিং (Rating × ৩, যেমন ৫ স্টার = ১৫ পয়েন্ট)।</p>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}
