"use client";

import { useState, useEffect } from "react";
import {
  Bell, Calendar, ChevronLeft, ChevronRight, Loader2,
  Sparkles, Pin, BookOpen, Quote, ArrowLeft, MessagesSquare,
  CheckCircle2,
} from "lucide-react";

interface Notice {
  _id: string;
  title: string;
  content: string[];
  bottomQuote?: string;
  signOff?: string;
  createdAt: string;
  isActive: boolean;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

const CARD_THEMES = [
  { bg: "bg-indigo-50", border: "border-indigo-200", icon: "bg-indigo-500", dot: "bg-indigo-400", text: "text-indigo-700", activeBg: "bg-indigo-100" },
  { bg: "bg-rose-50",   border: "border-rose-200",   icon: "bg-rose-500",   dot: "bg-rose-400",   text: "text-rose-700",   activeBg: "bg-rose-100"   },
  { bg: "bg-amber-50",  border: "border-amber-200",  icon: "bg-amber-500",  dot: "bg-amber-400",  text: "text-amber-700",  activeBg: "bg-amber-100"  },
  { bg: "bg-emerald-50",border: "border-emerald-200",icon: "bg-emerald-500",dot: "bg-emerald-400",text: "text-emerald-700",activeBg: "bg-emerald-100"},
  { bg: "bg-violet-50", border: "border-violet-200", icon: "bg-violet-500", dot: "bg-violet-400", text: "text-violet-700", activeBg: "bg-violet-100" },
];

export default function AnnouncementsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchNotices = async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher-portal/notices?page=${currentPage}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices);
        setTotalPages(data.pagination.totalPages || 1);
        if (data.notices.length > 0 && !selectedNotice) {
          setSelectedNotice(data.notices[0]);
          setSelectedIndex(0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const theme = CARD_THEMES[selectedIndex % CARD_THEMES.length];

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden">

        {/* ══════════════════════════
            LEFT — Notice List
        ══════════════════════════ */}
        <div className={`w-full lg:w-[340px] shrink-0 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${isMobileDetailView ? "hidden lg:flex" : "flex"}`}>
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-violet-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">Notice Board</h2>
                <p className="text-indigo-200 text-xs">{notices.length} announcement{notices.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                <p className="text-gray-400 text-xs">Loading notices...</p>
              </div>
            ) : notices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <MessagesSquare className="w-10 h-10 text-gray-300" />
                <p className="text-gray-400 text-sm">No notices yet.</p>
              </div>
            ) : (
              notices.map((notice, i) => {
                const t = CARD_THEMES[i % CARD_THEMES.length];
                const isSelected = selectedNotice?._id === notice._id;
                return (
                  <button
                    key={notice._id}
                    onClick={() => {
                      setSelectedNotice(notice);
                      setSelectedIndex(i);
                      setIsMobileDetailView(true);
                    }}
                    className={`w-full text-left rounded-xl p-3.5 border transition-all duration-200 group ${
                      isSelected
                        ? `${t.activeBg} ${t.border} shadow-sm`
                        : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl ${t.icon} shrink-0 flex items-center justify-center mt-0.5 shadow-sm`}>
                        <Pin className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-semibold text-sm line-clamp-2 leading-snug mb-1.5 ${isSelected ? t.text : "text-gray-800"}`}>
                          {notice.title}
                        </h3>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mb-2">
                          {notice.content[0]}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {timeAgo(notice.createdAt)}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className={`w-3.5 h-3.5 ${t.text}`} />
                          )}
                          {!notice.isActive && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">
                              Archived
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════
            RIGHT — Detail View
        ══════════════════════════ */}
        <div className={`flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-col ${isMobileDetailView ? "flex" : "hidden lg:flex"}`}>
          {selectedNotice ? (
            <>
              {/* ── Detail Header ── */}
              <div className={`relative px-6 sm:px-10 pt-8 pb-10 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 border-b border-gray-100`}>
                {/* Subtle circles */}
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-indigo-100/50 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-violet-100/50 blur-xl pointer-events-none" />

                {/* Mobile back */}
                <button onClick={() => setIsMobileDetailView(false)}
                  className="lg:hidden mb-4 inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to List
                </button>

                {/* Badges */}
                <div className="relative flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-indigo-100 border border-indigo-200 text-indigo-600 text-[11px] font-semibold px-3 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" /> Official Announcement
                  </span>
                  {!selectedNotice.isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-500 rounded-full">
                      Archived
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="relative text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-4 max-w-2xl">
                  {selectedNotice.title}
                </h1>

                {/* Date */}
                <p className="relative text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                  {formatFull(selectedNotice.createdAt)}
                </p>
              </div>

              {/* ── Detail Body ── */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8">

                {/* Content */}
                <div className="space-y-5 max-w-2xl">
                  {selectedNotice.content.map((paragraph, i) => (
                    <div key={i} className="flex gap-4">
                      <div className={`shrink-0 w-1 rounded-full mt-2 self-stretch min-h-[1rem] ${theme.icon}`} style={{opacity: 0.25}} />
                      <p className="text-gray-700 text-sm sm:text-[15px] leading-relaxed flex-1">
                        {paragraph}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Quote & Sign Off */}
                {(selectedNotice.bottomQuote || selectedNotice.signOff) && (
                  <div className="mt-10 max-w-2xl space-y-5">
                    {selectedNotice.bottomQuote && (
                      <div className="relative bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-6">
                        <Quote className="absolute top-4 left-4 w-6 h-6 text-indigo-200" />
                        <p className="pl-8 text-indigo-800 font-semibold text-[15px] leading-relaxed italic">
                          {selectedNotice.bottomQuote}
                        </p>
                      </div>
                    )}
                    {selectedNotice.signOff && (
                      <div className="flex items-center gap-4 px-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                          F
                        </div>
                        <div>
                          {selectedNotice.signOff.split(',').map((part, idx) => (
                            <span key={idx} className={
                              idx === 0
                                ? "block text-gray-400 text-xs"
                                : "block text-indigo-600 font-bold text-sm"
                            }>
                              {part.trim()}{idx === 0 && selectedNotice.signOff!.includes(',') ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-indigo-100">
                <BookOpen className="w-10 h-10 text-indigo-300" />
              </div>
              <h3 className="text-gray-800 font-bold text-lg mb-2">No Notice Selected</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Pick a notice from the list to read its full content here.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
