"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  Calendar,
  Search,
  RefreshCw,
  BookOpen,
  CheckSquare,
  Hourglass,
  Clock,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Sparkles,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportData {
  serial: number;
  teacherIdStr: string;
  teacherName: string;
  teacherId: string;
  avatar: string;
  phoneNumber: string;
  status: string;
  totalDays: number;
  activeDays: number;
  missingDays: number;
  totalClasses: number;
  completedClasses: number;
  remainingClasses: number;
  missingClasses: number;
  scheduledClasses: number;
  inProgressClasses: number;
  cancelledClasses: number;
  dayWiseClass: number;
  averageClass: number;
  classPercentage: number;
  studentAttendance: number;
  studentAbsent: number;
  attendancePercentage: number;
  activelyPercentage: number;
}

interface SummaryData {
  totalClasses: number;
  completedClasses: number;
  remainingClasses: number;
  scheduledClasses: number;
  inProgressClasses: number;
  cancelledClasses: number;
  studentAttendance: number;
  studentAbsent: number;
  totalTeachers: number;
  activeTeachers: number;
}

type SortField =
  | "name-asc"
  | "name-desc"
  | "total-desc"
  | "total-asc"
  | "completed-desc"
  | "remaining-desc"
  | "attendance-desc"
  | "active-days-desc";

export default function TeacherActivityReport() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("name-asc");
  const [rawReportData, setRawReportData] = useState<ReportData[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalClasses: 0,
    completedClasses: 0,
    remainingClasses: 0,
    scheduledClasses: 0,
    inProgressClasses: 0,
    cancelledClasses: 0,
    studentAttendance: 0,
    studentAbsent: 0,
    totalTeachers: 0,
    activeTeachers: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        search: search.trim(),
      });
      const res = await fetch(`/api/reports/teacher-activity?${params}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setRawReportData(json.data || []);
      if (json.summary) setSummary(json.summary);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, search]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchReportData();
    }, 300);
    return () => clearTimeout(debounce);
  }, [selectedMonth, search, fetchReportData]);

  // Client-side sorting logic
  const reportData = useMemo(() => {
    const data = [...rawReportData];
    switch (sortBy) {
      case "name-asc":
        data.sort((a, b) => (a.teacherName || "").localeCompare(b.teacherName || ""));
        break;
      case "name-desc":
        data.sort((a, b) => (b.teacherName || "").localeCompare(a.teacherName || ""));
        break;
      case "total-desc":
        data.sort((a, b) => b.totalClasses - a.totalClasses || b.completedClasses - a.completedClasses);
        break;
      case "total-asc":
        data.sort((a, b) => a.totalClasses - b.totalClasses);
        break;
      case "completed-desc":
        data.sort((a, b) => b.completedClasses - a.completedClasses || b.totalClasses - a.totalClasses);
        break;
      case "remaining-desc":
        data.sort((a, b) => b.remainingClasses - a.remainingClasses);
        break;
      case "attendance-desc":
        data.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
        break;
      case "active-days-desc":
        data.sort((a, b) => b.activeDays - a.activeDays);
        break;
      default:
        data.sort((a, b) => b.totalClasses - a.totalClasses);
    }
    // Re-assign serial numbering
    return data.map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rawReportData, sortBy]);

  // Overall calculations
  const totalDays = reportData.length > 0 ? reportData[0].totalDays : new Date().getDate();
  const totalClassesSum = summary.totalClasses || reportData.reduce((acc, r) => acc + (r.totalClasses || 0), 0);
  const completedSum = summary.completedClasses || reportData.reduce((acc, r) => acc + (r.completedClasses || 0), 0);
  const remainingSum = summary.remainingClasses || reportData.reduce((acc, r) => acc + (r.remainingClasses || 0), 0);
  const scheduledSum = summary.scheduledClasses || reportData.reduce((acc, r) => acc + (r.scheduledClasses || 0), 0);
  const inProgressSum = summary.inProgressClasses || reportData.reduce((acc, r) => acc + (r.inProgressClasses || 0), 0);
  const activeDaysSum = reportData.reduce((acc, r) => acc + (r.activeDays || 0), 0);
  const presentSum = summary.studentAttendance || reportData.reduce((acc, r) => acc + (r.studentAttendance || 0), 0);
  const absentSum = summary.studentAbsent || reportData.reduce((acc, r) => acc + (r.studentAbsent || 0), 0);

  const overallCompletionRate = totalClassesSum > 0 ? Math.round((completedSum / totalClassesSum) * 100) : 0;
  const totalAttendance = presentSum + absentSum;
  const overallAttendanceRate = totalAttendance > 0 ? Math.round((presentSum / totalAttendance) * 100) : 0;

  // Toggle header sort
  const handleToggleNameSort = () => {
    setSortBy((prev) => (prev === "name-asc" ? "name-desc" : "name-asc"));
  };

  const handleToggleTotalSort = () => {
    setSortBy((prev) => (prev === "total-desc" ? "total-asc" : "total-desc"));
  };

  // ─── PDF Export ─────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF("landscape");
    const img = new Image();
    img.src = "/fajr-logo.png";

    const generateDoc = () => {
      const navyColor: [number, number, number] = [10, 25, 49];

      try {
        if (img.complete && img.naturalWidth !== 0) {
          doc.addImage(img, "PNG", 14, 8, 48, 16);
        } else {
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(10, 25, 49);
          doc.text("FAJR ACADEMY", 14, 18);
        }
      } catch (e) {
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(10, 25, 49);
        doc.text("FAJR ACADEMY", 14, 18);
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 25, 49);
      doc.text("MONTHLY TEACHER ACTIVITY REPORT", 283, 14, { align: "right" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Month: ${selectedMonth}   |   Generated: ${new Date().toLocaleDateString()}`, 283, 20, { align: "right" });

      doc.setDrawColor(10, 25, 49);
      doc.setLineWidth(0.8);
      doc.line(14, 26, 283, 26);

      const tableColumn = [
        "Sl",
        "Teacher Name",
        "Teacher ID",
        "Phone",
        "Days (Act/Tot)",
        "Total Cls",
        "Complete",
        "Remain",
        "Sched",
        "Live",
        "Avg Cls",
        "Comp %",
        "Present",
        "Absent",
        "Att. %",
      ];

      const tableRows = reportData.map((row) => [
        row.serial,
        row.teacherName,
        row.teacherId,
        row.phoneNumber,
        `${row.activeDays} / ${row.totalDays}`,
        row.totalClasses,
        row.completedClasses,
        row.remainingClasses,
        row.scheduledClasses,
        row.inProgressClasses,
        row.averageClass,
        `${row.classPercentage}%`,
        row.studentAttendance,
        row.studentAbsent,
        `${row.attendancePercentage}%`,
      ]);

      const footerRow = [
        "Total",
        "",
        "",
        "",
        `${activeDaysSum} active`,
        totalClassesSum,
        completedSum,
        remainingSum,
        scheduledSum,
        inProgressSum,
        totalDays > 0 ? (totalClassesSum / totalDays).toFixed(2) : "",
        `${overallCompletionRate}%`,
        presentSum,
        absentSum,
        `${overallAttendanceRate}%`,
      ];

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        foot: [footerRow],
        startY: 30,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2, halign: "center", valign: "middle" },
        columnStyles: {
          1: { halign: "left", fontStyle: "bold" },
          2: { halign: "left" },
          3: { halign: "left" },
        },
        headStyles: {
          fillColor: navyColor,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: navyColor,
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      doc.save(`Teacher_Activity_Report_${selectedMonth}.pdf`);
    };

    if (img.complete) {
      generateDoc();
    } else {
      img.onload = generateDoc;
      img.onerror = generateDoc;
    }
  };

  // ─── Excel / CSV Export ─────────────────────────────────────────────────────
  const exportExcel = (isCSV = false) => {
    const exportData = reportData.map((row) => ({
      Serial: row.serial,
      "Teacher Name": row.teacherName,
      "Teacher ID": row.teacherId,
      "Phone Number": row.phoneNumber,
      "Total Days": row.totalDays,
      "Active Days": row.activeDays,
      "Missing Days": row.missingDays,
      "Total Classes": row.totalClasses,
      "Completed Classes": row.completedClasses,
      "Remaining Classes": row.remainingClasses,
      "Scheduled Classes": row.scheduledClasses,
      "In Progress Classes": row.inProgressClasses,
      "Average Class": row.averageClass,
      "Completion %": `${row.classPercentage}%`,
      "Student Present": row.studentAttendance,
      "Student Absent": row.studentAbsent,
      "Attendance %": `${row.attendancePercentage}%`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    if (isCSV) {
      XLSX.writeFile(workbook, `Teacher_Activity_Report_${selectedMonth}.csv`, { bookType: "csv" });
    } else {
      XLSX.writeFile(workbook, `Teacher_Activity_Report_${selectedMonth}.xlsx`, { bookType: "xlsx" });
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/classes" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 text-xs font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Classes
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Teacher Monthly Activity Report
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Full-width monthly overview of total workload, completed classes, pending classes, and attendance.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Month Selector */}
          <div className="relative">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer shadow-sm"
            />
          </div>

          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportPDF}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors border border-rose-200 dark:border-rose-900 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> PDF
            </button>
            <button
              onClick={() => exportExcel(false)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-colors border border-emerald-200 dark:border-emerald-900 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Excel
            </button>
            <button
              onClick={() => exportExcel(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors border border-blue-200 dark:border-blue-900 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Top 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Total Classes */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Class</span>
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-extrabold mt-1.5 tracking-tight">{totalClassesSum}</p>
          <p className="text-[10px] text-white/80 mt-0.5">{reportData.length} Teachers</p>
        </div>

        {/* Completed Classes */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
            <CheckSquare className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-extrabold mt-1.5 tracking-tight">{completedSum}</p>
          <p className="text-[10px] text-white/80 mt-0.5">{overallCompletionRate}% Done</p>
        </div>

        {/* Remaining Classes */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-700 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Remaining</span>
            <Hourglass className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-extrabold mt-1.5 tracking-tight">{remainingSum}</p>
          <p className="text-[10px] text-white/80 mt-0.5">Pending Classes</p>
        </div>

        {/* Scheduled */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Scheduled</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-extrabold mt-1.5 tracking-tight">{scheduledSum}</p>
          <p className="text-[10px] text-white/80 mt-0.5">{inProgressSum} Live active</p>
        </div>

        {/* Student Attendance */}
        <div className="bg-gradient-to-br from-teal-500 to-cyan-700 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-extrabold mt-1.5 tracking-tight">{overallAttendanceRate}%</p>
          <p className="text-[10px] text-white/80 mt-0.5">
            {presentSum} Pres · {absentSum} Abs
          </p>
        </div>

        {/* Active Teachers */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-800 rounded-2xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Staff</span>
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-extrabold mt-1.5 tracking-tight">{summary.activeTeachers || 0}</p>
          <p className="text-[10px] text-white/80 mt-0.5">of {reportData.length} Teachers</p>
        </div>
      </div>

      {/* Filter / Search / Sort Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teacher by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800 dark:text-gray-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="name-asc">🔤 Teacher Name (A → Z)</option>
              <option value="name-desc">🔤 Teacher Name (Z → A)</option>
              <option value="total-desc">📊 Highest Total Classes</option>
              <option value="total-asc">📊 Lowest Total Classes</option>
              <option value="completed-desc">✅ Most Completed Classes</option>
              <option value="remaining-desc">⏳ Most Remaining Classes</option>
              <option value="attendance-desc">👥 Highest Attendance %</option>
              <option value="active-days-desc">📅 Most Active Days</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium px-2">
            <span>{reportData.length} Teachers</span>
          </div>
        </div>
      </div>

      {/* Main Report Data Table - Full Width Screen View with Clickable Column Headers */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold select-none">
                <th className="py-2.5 px-2 text-center w-8">#</th>

                {/* Clickable Teacher Header (A to Z sort) */}
                <th
                  onClick={handleToggleNameSort}
                  className="py-2.5 px-3 min-w-[160px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Click to sort A to Z / Z to A"
                >
                  <div className="flex items-center gap-1">
                    <span>Teacher & ID</span>
                    {sortBy === "name-asc" ? (
                      <ArrowUpAZ className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    ) : sortBy === "name-desc" ? (
                      <ArrowDownAZ className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                <th className="py-2.5 px-2 text-center">Days (Act/Tot)</th>

                {/* Clickable Total Class Header */}
                <th
                  onClick={handleToggleTotalSort}
                  className="py-2.5 px-2 text-center text-blue-700 dark:text-blue-400 cursor-pointer hover:underline"
                  title="Click to sort by total classes"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Total</span>
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>

                <th
                  onClick={() => setSortBy("completed-desc")}
                  className="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-400 cursor-pointer hover:underline"
                  title="Sort by completed"
                >
                  Complete
                </th>

                <th
                  onClick={() => setSortBy("remaining-desc")}
                  className="py-2.5 px-2 text-center text-rose-700 dark:text-rose-400 cursor-pointer hover:underline"
                  title="Sort by remaining"
                >
                  Remaining
                </th>

                <th className="py-2.5 px-2 text-center text-indigo-700 dark:text-indigo-400">Sched</th>
                <th className="py-2.5 px-2 text-center text-amber-700 dark:text-amber-400">Live</th>
                <th className="py-2.5 px-2 text-center">Avg/Day</th>
                <th className="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-400">Comp %</th>
                <th className="py-2.5 px-2 text-center text-teal-700 dark:text-teal-400">Present</th>
                <th className="py-2.5 px-2 text-center text-rose-700 dark:text-rose-400">Absent</th>

                <th
                  onClick={() => setSortBy("attendance-desc")}
                  className="py-2.5 px-2 text-center text-teal-700 dark:text-teal-400 cursor-pointer hover:underline"
                  title="Sort by attendance rate"
                >
                  Att. %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-20 text-center">
                    <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 font-semibold text-xs">Loading report data...</p>
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-gray-400 font-medium">
                    No teacher activity found for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr key={row.teacherIdStr || row.teacherId} className="hover:bg-blue-50/25 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Rank / Serial */}
                    <td className="py-2 px-2 text-center font-bold text-gray-400 text-[11px]">{row.serial}</td>

                    {/* Teacher & Contact */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        {row.avatar ? (
                          <img
                            src={row.avatar}
                            alt={row.teacherName}
                            className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-slate-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm flex-shrink-0">
                            {row.teacherName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">{row.teacherName}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate leading-none mt-0.5">
                            {row.teacherId} {row.phoneNumber && `· ${row.phoneNumber}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Days (Active / Total) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded text-[11px]">
                        {row.activeDays}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-[11px]"> / {row.totalDays}</span>
                    </td>

                    {/* Total Classes */}
                    <td className="py-2 px-2 text-center">
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg text-xs inline-block min-w-[2rem]">
                        {row.totalClasses}
                      </span>
                    </td>

                    {/* Completed Classes */}
                    <td className="py-2 px-2 text-center">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md text-xs inline-block min-w-[1.8rem]">
                        {row.completedClasses}
                      </span>
                    </td>

                    {/* Remaining Classes */}
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded-md text-xs inline-block min-w-[1.8rem] ${
                          row.remainingClasses > 0
                            ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 font-extrabold"
                            : "text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800"
                        }`}
                      >
                        {row.remainingClasses}
                      </span>
                    </td>

                    {/* Scheduled */}
                    <td className="py-2 px-2 text-center font-semibold text-indigo-600 dark:text-indigo-400 text-xs">
                      {row.scheduledClasses}
                    </td>

                    {/* In-Progress / Live */}
                    <td className="py-2 px-2 text-center">
                      {row.inProgressClasses > 0 ? (
                        <span className="font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-xs animate-pulse">
                          {row.inProgressClasses}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">0</span>
                      )}
                    </td>

                    {/* Avg Class */}
                    <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300 font-medium text-xs">
                      {row.averageClass}
                    </td>

                    {/* Completion % */}
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`font-bold text-xs px-1.5 py-0.5 rounded ${
                          row.classPercentage >= 80
                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                            : row.classPercentage >= 50
                            ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                            : "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800"
                        }`}
                      >
                        {row.classPercentage}%
                      </span>
                    </td>

                    {/* Present */}
                    <td className="py-2 px-2 text-center font-bold text-teal-600 dark:text-teal-400 text-xs">
                      {row.studentAttendance}
                    </td>

                    {/* Absent */}
                    <td className="py-2 px-2 text-center font-bold text-rose-600 dark:text-rose-400 text-xs">
                      {row.studentAbsent}
                    </td>

                    {/* Attendance % */}
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`font-bold text-xs px-1.5 py-0.5 rounded ${
                          row.attendancePercentage >= 80
                            ? "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40"
                            : row.attendancePercentage >= 50
                            ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                            : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                        }`}
                      >
                        {row.attendancePercentage}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer Summary */}
            {reportData.length > 0 && !loading && (
              <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-gray-800 dark:text-gray-200">
                <tr>
                  <td colSpan={2} className="py-2.5 px-3 text-right">
                    Total / Summary:
                  </td>
                  <td className="py-2.5 px-2 text-center text-blue-700 dark:text-blue-400">{activeDaysSum} act</td>
                  <td className="py-2.5 px-2 text-center text-indigo-700 dark:text-indigo-400">{totalClassesSum}</td>
                  <td className="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-400">{completedSum}</td>
                  <td className="py-2.5 px-2 text-center text-rose-700 dark:text-rose-400">{remainingSum}</td>
                  <td className="py-2.5 px-2 text-center text-indigo-600 dark:text-indigo-400">{scheduledSum}</td>
                  <td className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400">{inProgressSum}</td>
                  <td className="py-2.5 px-2 text-center">
                    {totalDays > 0 ? (totalClassesSum / totalDays).toFixed(2) : "0.00"}
                  </td>
                  <td className="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-400">{overallCompletionRate}%</td>
                  <td className="py-2.5 px-2 text-center text-teal-700 dark:text-teal-400">{presentSum}</td>
                  <td className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400">{absentSum}</td>
                  <td className="py-2.5 px-2 text-center text-teal-700 dark:text-teal-400">{overallAttendanceRate}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
