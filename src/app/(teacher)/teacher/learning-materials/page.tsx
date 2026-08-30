"use client";

import { ExternalLink, BookMarked, FileText, Play, Star, Clock, Users, ArrowRight } from "lucide-react";

const DRIVE_LINK =
  "https://drive.google.com/drive/folders/15fPg2qct0QVO6LP4bE_SsTb6RzWMy3CJ?usp=sharing";

const HIGHLIGHTS = [
  { icon: FileText, label: "Course PDFs",     color: "text-rose-500",    bg: "bg-rose-50    dark:bg-rose-950/40" },
  { icon: Play,     label: "Video Lessons",   color: "text-violet-500",  bg: "bg-violet-50  dark:bg-violet-950/40" },
  { icon: Star,     label: "Study Guides",    color: "text-amber-500",   bg: "bg-amber-50   dark:bg-amber-950/40" },
  { icon: Users,    label: "Shared Resources",color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
];

export default function LearningMaterialsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Learning Materials
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Access all course resources, PDFs, and study materials shared by Fajr Academy.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 self-start sm:self-auto">
          <BookMarked className="w-3.5 h-3.5" />
          Fajr Academy Resources
        </span>
      </div>

      {/* ── Highlights ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {HIGHLIGHTS.map(({ icon: Icon, label, color, bg }) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 ${bg} transition-all`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">

        {/* Decorative top strip */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <div className="px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">

          {/* Icon */}
          <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookMarked className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Fajr Academy — Learning Hub
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg">
              All your course materials, lecture notes, reference PDFs, and supplementary resources
              are stored in our shared Google Drive folder. Click the button below to access them.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Updated regularly by Fajr Academy management</span>
            </div>
          </div>

          {/* CTA — desktop */}
          <a
            href={DRIVE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex flex-shrink-0 items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/25 transition-all duration-200 hover:shadow-lg active:scale-95 group"
          >
            Open Materials
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-slate-800 mx-6 sm:mx-10" />

        {/* Bottom row */}
        <div className="px-6 py-4 sm:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono break-all">
            {DRIVE_LINK}
          </p>

          {/* CTA — mobile */}
          <a
            href={DRIVE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/25 transition-all duration-200 active:scale-95"
          >
            Open Materials
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Desktop right link */}
          <a
            href={DRIVE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex-shrink-0"
          >
            Open in Google Drive <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ── Tips Card ── */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-5 py-4 flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">💡</span>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Tips for accessing materials</p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-700 dark:text-amber-400 list-disc list-inside leading-relaxed">
            <li>Make sure you are signed into your Fajr Academy Google account before opening.</li>
            <li>Use the Google Drive app on mobile for the best offline access experience.</li>
            <li>Contact your supervisor if you do not have permission to view a file.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
