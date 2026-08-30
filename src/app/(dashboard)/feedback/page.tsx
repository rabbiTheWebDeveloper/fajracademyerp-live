"use client";

import { useState, useEffect } from "react";
import { Star, Award, BookOpen, User, MessageSquare, Loader2, TrendingUp } from "lucide-react";

export default function FeedbackLeaderboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feedback")
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400" />
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-amber-400 fill-amber-400"
                : "text-gray-300 dark:text-slate-600"
            }`}
          />
        ))}
      </div>
    );
  };

  const getRankBadge = (index: number) => {
    if (index === 0)
      return (
        <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 text-xs font-bold px-2 py-1 rounded-full shadow-sm border border-yellow-200 dark:border-yellow-700/50">
          1st 🏆
        </span>
      );
    if (index === 1)
      return (
        <span className="bg-gray-100 dark:bg-slate-700/60 text-gray-700 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full shadow-sm border border-gray-200 dark:border-slate-600/50">
          2nd 🥈
        </span>
      );
    if (index === 2)
      return (
        <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-xs font-bold px-2 py-1 rounded-full shadow-sm border border-orange-200 dark:border-orange-700/50">
          3rd 🥉
        </span>
      );
    return (
      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded-full border border-blue-100 dark:border-blue-800/40">
        #{index + 1}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Feedback &amp; Leaderboard
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Course and teacher performance based on student ratings.
        </p>
      </div>

      {/* Leaderboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teacher Leaderboard */}
        <div className="bg-white dark:bg-[#080d1a] border border-gray-200 dark:border-white/[0.07] rounded-2xl shadow-sm dark:shadow-black/40 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/30 dark:to-transparent flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-slate-100">Top Teachers</h3>
          </div>
          <div className="p-5 flex-1">
            {data?.teacherLeaderboard?.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-500 text-center py-8">
                No teacher feedback yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data?.teacherLeaderboard?.slice(0, 5).map((teacher: any, idx: number) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-xl border border-gray-100 dark:border-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                          {teacher.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-500">
                          {teacher.reviewCount} reviews
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getRankBadge(idx)}
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">
                          {teacher.avgRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Course Leaderboard */}
        <div className="bg-white dark:bg-[#080d1a] border border-gray-200 dark:border-white/[0.07] rounded-2xl shadow-sm dark:shadow-black/40 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/30 dark:to-transparent flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-slate-100">Top Courses</h3>
          </div>
          <div className="p-5 flex-1">
            {data?.courseLeaderboard?.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-500 text-center py-8">
                No course feedback yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data?.courseLeaderboard?.slice(0, 5).map((course: any, idx: number) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-xl border border-gray-100 dark:border-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-center font-bold shadow-sm">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm line-clamp-1">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-500">
                          {course.reviewCount} reviews
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getRankBadge(idx)}
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">
                          {course.avgRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Feedback List */}
      <div className="bg-white dark:bg-[#080d1a] border border-gray-200 dark:border-white/[0.07] rounded-2xl shadow-sm dark:shadow-black/40 overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100">Recent Student Feedback</h3>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                {data?.feedbacks?.length ?? 0} entries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Live</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#05080f] text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold border-b border-gray-200 dark:border-white/[0.06]">Student</th>
                <th className="p-4 font-semibold border-b border-gray-200 dark:border-white/[0.06]">Course / Teacher</th>
                <th className="p-4 font-semibold border-b border-gray-200 dark:border-white/[0.06]">Rating</th>
                <th className="p-4 font-semibold border-b border-gray-200 dark:border-white/[0.06]">Comments</th>
                <th className="p-4 font-semibold border-b border-gray-200 dark:border-white/[0.06] text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05] text-sm">
              {data?.feedbacks?.map((f: any) => (
                <tr
                  key={f._id}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  {/* Student */}
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700/60 rounded-full flex items-center justify-center text-gray-700 dark:text-slate-200 font-bold text-sm flex-shrink-0">
                        {f.student?.fullName?.charAt(0) || "U"}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {f.student?.fullName || "Unknown"}
                      </span>
                    </div>
                  </td>

                  {/* Course / Teacher */}
                  <td className="p-4">
                    <div className="text-gray-900 dark:text-slate-100 font-medium text-sm">
                      {f.course?.title}
                    </div>
                    <div className="text-gray-500 dark:text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" />
                      {f.teacher?.fullName}
                    </div>
                  </td>

                  {/* Rating */}
                  <td className="p-4">{renderStars(f.rating)}</td>

                  {/* Comments */}
                  <td className="p-4">
                    <p className="text-gray-600 dark:text-slate-400 line-clamp-2 max-w-xs">
                      {f.comments || (
                        <span className="text-gray-400 dark:text-slate-600 italic">No comment provided</span>
                      )}
                    </p>
                  </td>

                  {/* Date */}
                  <td className="p-4 text-right text-gray-500 dark:text-slate-500 text-xs whitespace-nowrap">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {data?.feedbacks?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500 dark:text-slate-500">
                    <MessageSquare className="w-8 h-8 text-gray-300 dark:text-slate-700 mx-auto mb-2" />
                    No feedback available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
