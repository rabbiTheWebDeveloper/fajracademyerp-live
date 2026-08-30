"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Banknote, GraduationCap, CheckCircle2, Clock,
  Search, RefreshCw, FileSpreadsheet, FileText,
  Printer, Filter, TrendingUp, Award, AlertCircle,
  ChevronDown, ChevronUp, X, Users, Calendar,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SalaryRecord {
  _id: string;
  teacher: {
    _id: string;
    fullName: string;
    teacherId: string;
    designation: string;
    email: string;
    phone: string;
    avatar: string;
    salary: number;
    salaryType: string;
    status: string;
  };
  month: string;
  salaryType: string;
  baseValue: number;
  totalStudents: number;
  totalStudentFees: number;
  calculatedAmount: number;
  status: "pending" | "paid";
  paidAt: string | null;
  invoiceId: string | null;
  notes: string;
  students: { _id: string; fullName: string; studentId: string; course: { title: string } | null }[];
}

interface Summary {
  totalTeachers: number;
  totalPaid: number;
  totalPending: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  totalStudents: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtTk(n: number) {
  return `\u09F3 ${n.toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;
}
function getInitials(name: string) {
  if (!name) return "T";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function monthLabel(m: string) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient, loading }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string; loading?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient} shadow-sm border border-white/20 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200`}>
      <div className="flex items-start justify-between">
        <div className="bg-white/25 p-2.5 rounded-xl"><Icon className="w-5 h-5 text-white" /></div>
        <TrendingUp className="w-4 h-4 text-white/50" />
      </div>
      <div className="mt-3">
        {loading
          ? <div className="h-7 w-20 bg-white/30 rounded-lg animate-pulse mb-1" />
          : <p className="text-2xl font-bold text-white">{value}</p>
        }
        <p className="text-white/80 text-sm font-medium mt-0.5">{label}</p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── SalaryRow ────────────────────────────────────────────────────────────────
function SalaryRow({ record, rank, expanded, onToggle }: {
  record: SalaryRecord; rank: number; expanded: boolean; onToggle: () => void;
}) {
  const isPaid = record.status === "paid";
  return (
    <>
      <tr
        className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer ${expanded ? "bg-blue-50/30" : ""}`}
        onClick={onToggle}
      >
        <td className="py-3.5 px-4">
          <span className={`text-xs font-bold ${rank <= 3 ? "text-amber-500" : "text-gray-400"}`}>#{rank}</span>
        </td>
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            {record.teacher?.avatar ? (
              <img src={record.teacher.avatar} alt={record.teacher.fullName}
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm border-2 border-white flex-shrink-0">
                {getInitials(record.teacher?.fullName || "")}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{record.teacher?.fullName || "—"}</p>
              <p className="text-xs text-gray-400 font-mono">{record.teacher?.teacherId || "—"}</p>
            </div>
          </div>
        </td>
        <td className="py-3.5 px-4 hidden sm:table-cell">
          <p className="text-xs text-gray-500 truncate max-w-[130px]">{record.teacher?.designation || "—"}</p>
        </td>
        <td className="py-3.5 px-4 hidden md:table-cell">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
            ${record.salaryType === "monthly" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>
            {record.salaryType === "monthly" ? "Monthly" : "Per-Student %"}
          </span>
        </td>
        <td className="py-3.5 px-4 text-center hidden lg:table-cell">
          <span className="text-sm font-medium text-gray-700">{record.totalStudents}</span>
        </td>
        <td className="py-3.5 px-4 text-right">
          <p className="text-base font-bold text-gray-900">{fmtTk(record.calculatedAmount)}</p>
          <p className="text-xs text-gray-400">Base: {fmtTk(record.baseValue)}</p>
        </td>
        <td className="py-3.5 px-4">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
            ${isPaid
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
            {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isPaid ? "Paid" : "Pending"}
          </span>
        </td>
        <td className="py-3.5 px-4 hidden xl:table-cell">
          <p className="text-xs font-mono text-gray-500">{record.invoiceId || "—"}</p>
        </td>
        <td className="py-3.5 px-4">
          <button className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr>
          <td colSpan={9} className="bg-gradient-to-r from-blue-50/40 to-indigo-50/20 border-b border-blue-100/50 px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { l: "Base Value",        v: fmtTk(record.baseValue) },
                { l: "Calculated Salary", v: fmtTk(record.calculatedAmount) },
                { l: "Total Students",    v: String(record.totalStudents) },
                { l: "Student Fees",      v: fmtTk(record.totalStudentFees || 0) },
              ].map((item) => (
                <div key={item.l} className="bg-white rounded-xl p-3 border border-blue-100 text-center shadow-sm">
                  <p className="text-lg font-bold text-gray-900">{item.v}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.l}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Contact</p>
                <p className="font-medium text-gray-700">{record.teacher?.email || "—"}</p>
                <p className="text-gray-500 text-xs">{record.teacher?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Payment Status</p>
                <p className={`font-semibold capitalize ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>{record.status}</p>
                {record.paidAt && (
                  <p className="text-xs text-gray-500">
                    Paid: {new Date(record.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Notes</p>
                <p className="text-gray-600 text-xs italic">{record.notes || "No notes"}</p>
              </div>
            </div>

            {/* Student list */}
            {record.students && record.students.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Assigned Students ({record.students.length})
                </p>
                <div className="overflow-x-auto rounded-xl border border-blue-100">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-50">
                      <tr className="text-gray-500 uppercase tracking-wider">
                        <th className="py-2 px-3 text-left font-semibold">#</th>
                        <th className="py-2 px-3 text-left font-semibold">Name</th>
                        <th className="py-2 px-3 text-left font-semibold">Student ID</th>
                        <th className="py-2 px-3 text-left font-semibold">Course</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-50">
                      {record.students.map((stu, i) => (
                        <tr key={stu._id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-1.5 px-3 text-gray-400">{i + 1}</td>
                          <td className="py-1.5 px-3 font-medium text-gray-700">{stu.fullName}</td>
                          <td className="py-1.5 px-3 font-mono text-gray-500">{stu.studentId}</td>
                          <td className="py-1.5 px-3 text-gray-500">{stu.course?.title || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MonthlySalaryReportPage() {
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [summary, setSummary]   = useState<Summary>({
    totalTeachers: 0, totalPaid: 0, totalPending: 0,
    totalAmount: 0, paidAmount: 0, pendingAmount: 0, totalStudents: 0,
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [exporting, setExporting]       = useState<"pdf" | "excel" | "csv" | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const fetchData = useCallback(async () => {
    if (!month) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        month,
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      });
      const res  = await fetch(`/api/admin/monthly-salary-report?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSalaries(data.salaries || []);
      setSummary(data.summary || {});
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [month, statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 350);
    return () => clearTimeout(t);
  }, [fetchData]);

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting("pdf");
    try {
      const doc   = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const label = monthLabel(month);

      // Blue header band
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 297, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("FAJR Academy \u2014 Monthly Salary Report", 14, 10);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Month: ${label}   |   Generated: ${new Date().toLocaleString()}`, 14, 17);

      // Summary boxes
      const sumY = 26;
      const cols: [string, string][] = [
        ["Total Teachers",    String(summary.totalTeachers)],
        ["Total Amount",      `${summary.totalAmount.toLocaleString()} BDT`],
        ["Paid",              `${summary.totalPaid} (${summary.paidAmount.toLocaleString()} BDT)`],
        ["Pending",           `${summary.totalPending} (${summary.pendingAmount.toLocaleString()} BDT)`],
        ["Total Students",    String(summary.totalStudents)],
      ];
      cols.forEach(([lbl, val], i) => {
        const x = 14 + i * 56;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, sumY, 53, 16, 2, 2, "F");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(lbl, x + 4, sumY + 5);
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text(val, x + 4, sumY + 12);
        doc.setFont("helvetica", "normal");
      });

      // Detail table
      autoTable(doc, {
        startY: 47,
        head: [["#", "Teacher", "ID", "Designation", "Type", "Students", "Base (BDT)", "Amount (BDT)", "Status", "Invoice"]],
        body: salaries.map((r, i) => [
          i + 1,
          r.teacher?.fullName   || "\u2014",
          r.teacher?.teacherId  || "\u2014",
          r.teacher?.designation || "\u2014",
          r.salaryType === "monthly" ? "Monthly" : "Per-Student %",
          r.totalStudents,
          r.baseValue.toLocaleString(),
          r.calculatedAmount.toLocaleString(),
          r.status.toUpperCase(),
          r.invoiceId || "\u2014",
        ]),
        styles:     { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 42 },
          2: { cellWidth: 28 },
          3: { cellWidth: 32 },
          4: { cellWidth: 24 },
          5: { cellWidth: 16, halign: "center" },
          6: { cellWidth: 22, halign: "right" },
          7: { cellWidth: 25, halign: "right", fontStyle: "bold" },
          8: { cellWidth: 18, halign: "center" },
          9: { cellWidth: 30 },
        },
        theme: "striped",
        willDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 8) {
            const status = salaries[data.row.index]?.status;
            if (status === "paid") {
              data.cell.styles.fillColor = [209, 250, 229];
              data.cell.styles.textColor = [6, 95, 70];
            } else {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [120, 53, 15];
            }
          }
        },
      });

      // Page footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `FAJR Academy Confidential  \u00B7  Page ${i} of ${pageCount}`,
          14, doc.internal.pageSize.height - 6
        );
        doc.text(
          `Generated: ${new Date().toLocaleString()}`,
          297 - 14, doc.internal.pageSize.height - 6,
          { align: "right" }
        );
      }

      doc.save(`fajr-salary-report-${month}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    setExporting("csv");
    try {
      const header = [
        "#", "Teacher Name", "Teacher ID", "Designation", "Email", "Phone",
        "Month", "Salary Type", "Base Value", "Total Students", "Student Fees",
        "Calculated Amount", "Status", "Paid At", "Invoice ID", "Notes",
      ];
      const rows = salaries.map((r, i) => [
        i + 1,
        r.teacher?.fullName    || "",
        r.teacher?.teacherId   || "",
        r.teacher?.designation || "",
        r.teacher?.email       || "",
        r.teacher?.phone       || "",
        r.month,
        r.salaryType,
        r.baseValue,
        r.totalStudents,
        r.totalStudentFees || 0,
        r.calculatedAmount,
        r.status,
        r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "",
        r.invoiceId || "",
        (r.notes || "").replace(/"/g, "'"),
      ]);
      const bom     = "\uFEFF";
      const content = [header, ...rows]
        .map((row) => row.map((c) => `"${c}"`).join(","))
        .join("\n");
      const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `fajr-salary-report-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  // ── Excel Export ─────────────────────────────────────────────────────────────
  const exportExcel = () => {
    setExporting("excel");
    try {
      const label = monthLabel(month);
      const header = [
        "#", "Teacher Name", "Teacher ID", "Designation", "Email", "Phone",
        "Month", "Salary Type", "Base Value (BDT)", "Total Students",
        "Student Fees (BDT)", "Calculated Amount (BDT)", "Status",
        "Paid At", "Invoice ID", "Notes",
      ];
      const rows = salaries.map((r, i) => [
        i + 1,
        r.teacher?.fullName    || "",
        r.teacher?.teacherId   || "",
        r.teacher?.designation || "",
        r.teacher?.email       || "",
        r.teacher?.phone       || "",
        r.month,
        r.salaryType === "monthly" ? "Monthly" : "Per-Student %",
        r.baseValue,
        r.totalStudents,
        r.totalStudentFees || 0,
        r.calculatedAmount,
        r.status,
        r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "",
        r.invoiceId || "",
        r.notes || "",
      ]);

      const htmlTable = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;font-size:10pt}
  .ttl{font-size:15pt;font-weight:bold;color:#1e3a8a}
  .sub{font-size:9pt;color:#6b7280}
  .sum td{background:#dbeafe;font-weight:bold;padding:5px 10px;border:1px solid #bfdbfe}
  th{background:#2563eb;color:#fff;font-weight:bold;padding:6px 10px;border:1px solid #1d4ed8}
  td{padding:5px 10px;border:1px solid #e5e7eb}
  .paid{background:#d1fae5;color:#065f46;font-weight:bold}
  .pend{background:#fef3c7;color:#92400e;font-weight:bold}
  tr:nth-child(even) td{background:#f8fafc}
</style>
</head>
<body>
<p class="ttl">FAJR Academy &mdash; Monthly Salary Report</p>
<p class="sub">Month: ${label} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
<br/>
<table>
<tr class="sum">
  <td>Total Teachers</td><td>${summary.totalTeachers}</td>
  <td>Total Amount (BDT)</td><td>${summary.totalAmount.toLocaleString()}</td>
  <td>Paid</td><td>${summary.totalPaid} &mdash; ${summary.paidAmount.toLocaleString()} BDT</td>
  <td>Pending</td><td>${summary.totalPending} &mdash; ${summary.pendingAmount.toLocaleString()} BDT</td>
  <td>Students</td><td>${summary.totalStudents}</td>
</tr>
</table>
<br/>
<table>
<thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>
${rows.map((row) =>
  `<tr>${row.map((c, ci) => {
    if (ci === 12) {
      const cls = c === "paid" ? "paid" : "pend";
      return `<td class="${cls}">${c}</td>`;
    }
    return `<td>${c}</td>`;
  }).join("")}</tr>`
).join("\n")}
</tbody>
</table>
</body>
</html>`;

      const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `fajr-salary-report-${month}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const paidRate = summary.totalTeachers > 0
    ? Math.round((summary.totalPaid / summary.totalTeachers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            Monthly Salary Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {month ? monthLabel(month) : "Select a month"} &mdash; Export as PDF, Excel or CSV
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium shadow-sm disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Teachers"
          value={summary.totalTeachers}
          sub={month ? monthLabel(month) : "—"}
          icon={GraduationCap}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          loading={loading}
        />
        <StatCard
          label="Total Salary"
          value={`${summary.totalAmount.toLocaleString()} BDT`}
          sub="Gross payroll"
          icon={Banknote}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          loading={loading}
        />
        <StatCard
          label="Paid"
          value={`${summary.totalPaid} · ${summary.paidAmount.toLocaleString()} BDT`}
          sub={`${paidRate}% settled`}
          icon={CheckCircle2}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          loading={loading}
        />
        <StatCard
          label="Pending"
          value={`${summary.totalPending} · ${summary.pendingAmount.toLocaleString()} BDT`}
          sub="Awaiting payment"
          icon={Clock}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          loading={loading}
        />
      </div>

      {/* ── Payment Progress Bar ── */}
      {!loading && summary.totalTeachers > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              Payment Completion &mdash; {monthLabel(month)}
            </h3>
            <span className={`text-sm font-bold ${paidRate >= 80 ? "text-emerald-600" : paidRate >= 50 ? "text-amber-600" : "text-red-500"}`}>
              {paidRate}% Paid
            </span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
            {summary.totalPaid > 0 && (
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700 rounded-full"
                style={{ width: `${paidRate}%` }}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Paid: {summary.totalPaid}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Pending: {summary.totalPending}
            </span>
          </div>
        </div>
      )}

      {/* ── Filters & Export ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="salary-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white transition-all"
              />
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="salary-search"
                type="text"
                placeholder="Search teacher name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                id="salary-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white appearance-none cursor-pointer transition-all"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {(search || statusFilter) && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(""); }}
                className="px-3 py-2 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-xl hover:border-red-200 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400 mr-1 hidden sm:block">Export:</span>
            <button
              id="salary-export-csv"
              onClick={exportCSV}
              disabled={!!exporting || salaries.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {exporting === "csv"
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <FileText className="w-4 h-4 text-gray-500" />}
              CSV
            </button>
            <button
              id="salary-export-excel"
              onClick={exportExcel}
              disabled={!!exporting || salaries.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              {exporting === "excel"
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <FileSpreadsheet className="w-4 h-4" />}
              Excel
            </button>
            <button
              id="salary-export-pdf"
              onClick={exportPDF}
              disabled={!!exporting || salaries.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {exporting === "pdf"
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Printer className="w-4 h-4" />}
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <span className="text-sm text-gray-600 font-medium">
            {loading
              ? "Loading..."
              : `${salaries.length} teacher${salaries.length !== 1 ? "s" : ""} \u00B7 ${monthLabel(month)}`}
          </span>
          <span className="text-xs text-gray-400 font-medium">Sorted by highest salary</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-white">
                <th className="py-3 px-4 font-semibold">#</th>
                <th className="py-3 px-4 font-semibold">Teacher</th>
                <th className="py-3 px-4 font-semibold hidden sm:table-cell">Designation</th>
                <th className="py-3 px-4 font-semibold hidden md:table-cell">Type</th>
                <th className="py-3 px-4 font-semibold text-center hidden lg:table-cell">Students</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold hidden xl:table-cell">Invoice</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="py-4 px-4">
                        <div className="h-4 bg-gray-100 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : salaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Banknote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No salary records found</p>
                    <p className="text-sm text-gray-400 mt-1">Select a month or add salary records first.</p>
                  </td>
                </tr>
              ) : (
                salaries.map((record, i) => (
                  <SalaryRow
                    key={record._id}
                    record={record}
                    rank={i + 1}
                    expanded={expandedId === record._id}
                    onToggle={() => setExpandedId(expandedId === record._id ? null : record._id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer totals */}
        {!loading && salaries.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50/30 flex flex-wrap gap-4 items-center text-sm">
            <span className="font-semibold text-gray-700">Totals:</span>
            <span className="text-gray-600">
              <strong className="text-gray-800">{summary.totalTeachers}</strong> teachers
            </span>
            <span className="text-emerald-600">
              &#10003; Paid: <strong>{summary.paidAmount.toLocaleString()} BDT</strong>
            </span>
            <span className="text-amber-600">
              &#9203; Pending: <strong>{summary.pendingAmount.toLocaleString()} BDT</strong>
            </span>
            <span className="ml-auto font-bold text-gray-900 text-base">
              Grand Total: {summary.totalAmount.toLocaleString()} BDT
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
