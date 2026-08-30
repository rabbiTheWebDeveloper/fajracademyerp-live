"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Users, Search, Plus, X, Loader2,
  ChevronLeft, ChevronRight, AlertCircle, Edit2, Trash2, Eye,
  KeyRound, Save, CheckCircle, Calendar, ChevronDown,
  Upload, Download, FileText, FileSpreadsheet, CheckCircle2,
  CloudUpload, TriangleAlert, DollarSign, Check as CheckIcon,
  GraduationCap, User, Mail, Phone, Sparkles, RotateCcw, Filter,
  CalendarDays, UserCheck
} from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/context/PermissionContext";
import { ReadOnlyNotice } from "@/components/PermissionGuard";
import { PhoneInput, isValidPhoneNumber, getCountryFromPhoneNumber, CountryFlag } from "@/components/ui/phone-input";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";

function StudentPhoneWithFlag({
  phone,
  type = "phone",
}: {
  phone?: string;
  type?: "phone" | "whatsapp";
}) {
  if (!phone) return null;
  const country = getCountryFromPhoneNumber(phone, "BD");

  if (type === "whatsapp") {
    return (
      <p
        className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1.5"
        title={`WhatsApp (${country}): ${phone}`}
      >
        <CountryFlag country={country} className="w-4 h-2.5 rounded-[1.5px] object-cover" />
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <span className="font-bold text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded border border-emerald-200 uppercase tracking-wider">WA</span>
          <span className="font-mono text-[11px]">{phone}</span>
        </span>
      </p>
    );
  }

  return (
    <p
      className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-1.5"
      title={`Phone (${country}): ${phone}`}
    >
      <CountryFlag country={country} className="w-4 h-2.5 rounded-[1.5px] object-cover" />
      <span className="font-mono text-gray-700 text-[11px]">{phone}</span>
    </p>
  );
}

const COUNTRY_CODES = [
  { code: "BD", dial: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India" },
  { code: "PK", dial: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
];

const STATUS_COLORS: any = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  completed: "bg-blue-100 text-blue-700",
  "at-risk": "bg-red-100 text-red-700",
  suspended: "bg-orange-100 text-orange-700",
};

/* ─────────────── Utility: CSV & Excel helpers ─────────────── */

// Parse a CSV string into an array of objects using the first row as headers
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values: string[] = [];
    let inQuotes = false, current = "";
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(current); current = ""; }
      else { current += ch; }
    }
    values.push(current);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || "").trim(); });
    rows.push(row);
  }
  return rows;
}

// Generate CSV string from array of objects
function toCSV(rows: Record<string, any>[], columns: string[]): string {
  const escape = (v: any) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

// Format Date Time like: 26.07.2026 :02:18PM
function formatCustomDateTime(dateStr?: string | Date) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");

  return `${day}.${month}.${year} :${formattedHours}:${minutes}${ampm}`;
}

// Helper to filter CRM and Sales users strictly to After Sales & New Sales
function isCrmOrSalesUser(user: any) {
  if (!user || !user.role) return false;
  const role = (user.role || "").toLowerCase().trim().replace(/[-_ ]/g, "");
  // Exclude super-admin, admin, teacher, student, finance, etc.
  const excludedRoles = ["superadmin", "admin", "teacher", "student", "instructor", "faculty", "finance", "accountant"];
  if (excludedRoles.includes(role)) return false;

  const validRoles = [
    "newsales", "aftersales", "sales", "crm", "customerexecutive",
    "cam", "bd"
  ];
  return validRoles.includes(role) || role.includes("sales") || role.includes("crm");
}

function formatRoleLabel(role?: string) {
  if (!role) return "Sales";
  const r = role.toLowerCase().trim().replace(/[-_ ]/g, "");
  if (r === "newsales") return "New Sales";
  if (r === "aftersales") return "After Sales";
  if (r === "sales") return "Sales";
  if (r === "crm") return "CRM";
  if (r === "customerexecutive") return "Customer Executive";
  if (r === "bd") return "Business Development";
  if (r === "cam") return "CAM";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// Trigger browser file download
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Load SheetJS from CDN for Excel support (parse & generate .xlsx)
function loadSheetJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).XLSX) { resolve((window as any).XLSX); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Template columns for import
const IMPORT_COLUMNS = [
  "fullName", "fatherName", "motherName", "age", "phone", "whatsappNumber", "email", "gender", "status",
  "admissionDate", "admissionFee", "course", "monthlyFee",
  "monthlyDue", "classStartingDate", "notes", "password"
];

const EXPORT_COLUMNS = [
  "studentId", "fullName", "fatherName", "motherName", "age", "phone", "whatsappNumber", "email", "gender", "status",
  "admissionDate", "admissionFee", "course", "monthlyFee",
  "monthlyDue", "classStartingDate", "notes", "teacher", "crmInCharge", "createdAt", "updatedAt"
];

async function exportStudentsPDF(rows: Record<string, any>[], filename: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const navyColor: [number, number, number] = [10, 25, 49];

  const img = new Image();
  img.src = "/fajr-logo.png";

  const generateDoc = () => {
    // Fajr Academy Brand Header Logo / Text Fallback
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

    // Calculations
    const totalAdmission = rows.reduce((acc, r) => acc + (Number(r.admissionFee) || 0), 0);
    const totalMonthly = rows.reduce((acc, r) => acc + (Number(r.monthlyFee) || 0), 0);
    const totalDue = rows.reduce((acc, r) => acc + (Number(r.monthlyDue) || 0), 0);

    // Title & Metadata
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 25, 49);
    doc.text("STUDENT DIRECTORY & FEES REPORT", 283, 14, { align: "right" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Total: ${rows.length} Students   |   Generated: ${formatCustomDateTime(new Date())}`,
      283,
      20,
      { align: "right" }
    );

    // Decorative Navy Separator Line
    doc.setDrawColor(10, 25, 49);
    doc.setLineWidth(0.8);
    doc.line(14, 27, 283, 27);

    // Summary pills
    const active = rows.filter(r => (r.status || "").toLowerCase() === "active").length;
    const inactive = rows.filter(r => (r.status || "").toLowerCase() === "inactive").length;
    const completed = rows.filter(r => (r.status || "").toLowerCase() === "completed").length;

    const pills = [
      { label: "Active", count: active, color: [209, 250, 229] as const, text: [6, 95, 70] as const, width: 30 },
      { label: "Inactive", count: inactive, color: [243, 244, 246] as const, text: [75, 85, 99] as const, width: 30 },
      { label: "Completed", count: completed, color: [219, 234, 254] as const, text: [29, 78, 216] as const, width: 34 },
      { label: "Admission Sum", count: `Tk ${totalAdmission.toLocaleString()}`, color: [236, 253, 245] as const, text: [4, 120, 87] as const, width: 56 },
      { label: "Monthly Fees Sum", count: `Tk ${totalMonthly.toLocaleString()}`, color: [238, 242, 255] as const, text: [67, 56, 202] as const, width: 60 },
      { label: "Total Due", count: `Tk ${totalDue.toLocaleString()}`, color: [254, 242, 242] as const, text: [185, 28, 28] as const, width: 44 },
    ];

    let pillX = 14;
    pills.forEach((p) => {
      const w = p.width || 34;
      doc.setFillColor(p.color[0], p.color[1], p.color[2]);
      doc.roundedRect(pillX, 31, w, 7, 1.5, 1.5, "F");
      doc.setTextColor(p.text[0], p.text[1], p.text[2]);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${p.label}: ${p.count}`, pillX + (w / 2), 35.8, { align: "center" });
      pillX += w + 2.5;
    });

    // Table
    autoTable(doc, {
      startY: 42,
      theme: 'grid',
      head: [[
        "#", "Student ID", "Full Name", "Phone", "Course",
        "Teacher", "Admission Fee", "Monthly Fee", "Status", "Created Date & Time"
      ]],
      body: rows.map((r, i) => [
        i + 1,
        r.studentId || "—",
        r.fullName || "—",
        r.phone || "—",
        r.course || "—",
        r.teacher || "—",
        Number(r.admissionFee || 0) > 0 ? Number(r.admissionFee).toLocaleString() : "0",
        Number(r.monthlyFee || 0) > 0 ? Number(r.monthlyFee).toLocaleString() : "0",
        r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : "—",
        formatCustomDateTime(r.createdAt),
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [10, 25, 49],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 24 },
        2: { cellWidth: 32 },
        3: { cellWidth: 26 },
        4: { cellWidth: 28 },
        5: { cellWidth: 28 },
        6: { halign: "right", cellWidth: 24 },
        7: { halign: "right", cellWidth: 24 },
        8: { halign: "center", cellWidth: 20 },
        9: { halign: "center", cellWidth: 38 },
      },
      didDrawCell: (data: any) => {
        // Color the Status cell based on value
        if (data.section === "body" && data.column.index === 8) {
          const val = String(data.cell.text[0] || "").toLowerCase();
          const colors: Record<string, [number, number, number]> = {
            active: [209, 250, 229],
            inactive: [243, 244, 246],
            completed: [219, 234, 254],
            "at-risk": [254, 226, 226],
            suspended: [254, 237, 213],
          };
          const bgCol = colors[val];
          if (bgCol) {
            doc.setFillColor(bgCol[0], bgCol[1], bgCol[2]);
            doc.rect(data.cell.x + 1, data.cell.y + 1.2, data.cell.width - 2, data.cell.height - 2.4, "F");
            const textColors: Record<string, [number, number, number]> = {
              active: [6, 95, 70],
              inactive: [75, 85, 99],
              completed: [29, 78, 216],
              "at-risk": [185, 28, 28],
              suspended: [194, 65, 12],
            };
            const txtCol = textColors[val] || [0, 0, 0];
            doc.setTextColor(txtCol[0], txtCol[1], txtCol[2]);
            doc.setFontSize(7);
            doc.text(data.cell.text[0], data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: "center" });
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer Page Numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${p} of ${pageCount} — Fajr Academy ERP`, 148.5, 202, { align: "center" });
    }

    doc.save(`${filename}.pdf`);
  };

  if (img.complete) {
    generateDoc();
  } else {
    img.onload = generateDoc;
    img.onerror = generateDoc;
  }
}

/* ─────────────── Import Students Modal ─────────────── */
function ImportStudentsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (f: File) => {
    setParseError("");
    setFile(f);
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      const text = await f.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) { setParseError("No data rows found in CSV."); return; }
      setRows(parsed);
      setStep("preview");
    } else if (ext === "xlsx" || ext === "xls") {
      try {
        const XLSX = await loadSheetJS();
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (parsed.length === 0) { setParseError("No data rows found in Excel file."); return; }
        setRows(parsed);
        setStep("preview");
      } catch {
        setParseError("Failed to parse Excel file. Make sure the file is valid.");
      }
    } else {
      setParseError("Unsupported file type. Please upload a .csv, .xlsx, or .xls file.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: rows }),
      });
      const data = await res.json();
      setResult(data);
      setStep("result");
      if (data.created > 0) onSuccess();
    } catch {
      setResult({ success: false, message: "Network error. Please try again." });
      setStep("result");
    } finally { setLoading(false); }
  };

  const downloadTemplate = async (format: "csv" | "xlsx") => {
    const sampleRows = [
      {
        fullName: "Ahmed Hassan", phone: "+880 1712 345 678", email: "ahmed@example.com",
        gender: "male", status: "active", admissionDate: "2025-01-15", admissionFee: "5000",
        course: "Web Development", monthlyFee: "2000", monthlyDue: "0",
        classStartingDate: "2025-02-01", notes: "Excellent student", password: "123456"
      },
      {
        fullName: "Fatima Begum", phone: "+880 1987 654 321", email: "fatima@example.com",
        gender: "female", status: "active", admissionDate: "2025-02-10", admissionFee: "5000",
        course: "Digital Marketing", monthlyFee: "1500", monthlyDue: "500",
        classStartingDate: "2025-03-01", notes: "", password: "123456"
      }
    ];
    if (format === "csv") {
      const csv = toCSV(sampleRows, IMPORT_COLUMNS);
      downloadBlob(new Blob([csv], { type: "text/csv" }), "students_import_template.csv");
    } else {
      const XLSX = await loadSheetJS();
      const ws = XLSX.utils.json_to_sheet(sampleRows, { header: IMPORT_COLUMNS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "students_import_template.xlsx");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Import Students</h3>
              <p className="text-xs text-gray-500">Upload CSV or Excel file to bulk-create students</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 pt-4">
          {(["upload", "preview", "result"] as const).map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                step === s ? "bg-blue-100 text-blue-700" :
                (["preview", "result"].indexOf(s) < ["upload", "preview", "result"].indexOf(step))
                  ? "bg-emerald-100 text-emerald-700" : "text-gray-400"
              }`}>
                <span>{idx + 1}</span>
                <span className="capitalize">{s}</span>
              </div>
              {idx < 2 && <div className="w-8 h-px bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>

        <div className="p-6 flex-1">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-5">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragging ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/30"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                <CloudUpload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">Drop your file here, or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Supports CSV, XLSX, XLS — max 5,000 rows</p>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}

              {/* Template download */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" /> Download Import Template
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Download a pre-formatted template with sample data. Fill it in and upload it above.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => downloadTemplate("csv")}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 transition-colors">
                    <FileText className="w-3.5 h-3.5 text-green-600" /> CSV Template
                  </button>
                  <button onClick={() => downloadTemplate("xlsx")}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 transition-colors">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel Template
                  </button>
                </div>
              </div>

              {/* Column guide */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">Required &amp; Optional Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {IMPORT_COLUMNS.map((col) => (
                    <span key={col} className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono ${
                      col === "fullName" ? "bg-blue-100 text-blue-700" : "bg-white border border-gray-200 text-gray-600"
                    }`}>
                      {col === "fullName" && <span className="text-red-500 mr-0.5">*</span>}{col}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-blue-600 mt-2">* <strong>fullName</strong> is required. All other fields are optional.</p>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-800">{file?.name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{rows.length} rows</span>
                </div>
                <button onClick={() => { setStep("upload"); setRows([]); setFile(null); }}
                  className="text-xs text-blue-600 hover:underline">
                  Change file
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-gray-500 font-medium">#</th>
                        {IMPORT_COLUMNS.slice(0, 8).map((col) => (
                          <th key={col} className="px-3 py-2 text-gray-700 font-semibold whitespace-nowrap">{col}</th>
                        ))}
                        <th className="px-3 py-2 text-gray-500">…</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                          {IMPORT_COLUMNS.slice(0, 8).map((col) => (
                            <td key={col} className={`px-3 py-2 whitespace-nowrap ${
                              col === "fullName" && !row[col] ? "text-red-500 font-medium" : "text-gray-700"
                            }`}>{row[col] || <span className="text-gray-300">—</span>}</td>
                          ))}
                          <td className="px-3 py-2 text-gray-400">…</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 20 && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                    Showing first 20 of {rows.length} rows
                  </div>
                )}
              </div>

              {rows.filter(r => !r.fullName?.trim()).length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
                  <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {rows.filter(r => !r.fullName?.trim()).length} row(s) are missing <strong>fullName</strong> and will be skipped.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === "result" && result && (
            <div className="space-y-4">
              {result.created > 0 ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800">Import Complete!</p>
                    <p className="text-sm text-emerald-600 mt-0.5">
                      {result.created} student{result.created !== 1 ? "s" : ""} created successfully
                      {result.failed > 0 ? `, ${result.failed} failed` : "."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                  <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800">Import Failed</p>
                    <p className="text-sm text-red-600 mt-0.5">{result.message || "All rows failed to import."}</p>
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <TriangleAlert className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">{result.errors.length} Error{result.errors.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {result.errors.map((err: any, idx: number) => (
                      <div key={idx} className="px-4 py-2.5 flex items-start gap-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono flex-shrink-0">Row {err.row}</span>
                        <span className="text-xs text-gray-700">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            {step === "result" ? "Close" : "Cancel"}
          </button>
          <div className="flex items-center gap-2">
            {step === "preview" && (
              <>
                <button onClick={() => { setStep("upload"); setRows([]); setFile(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
                  Back
                </button>
                <button onClick={handleImport} disabled={loading || rows.length === 0}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {loading ? "Importing..." : `Import ${rows.length} Students`}
                </button>
              </>
            )}
            {step === "result" && result?.created > 0 && (
              <button onClick={onClose} className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Searchable Teacher Select Component ─────────────── */
function TeacherSearchSelect({
  teachers,
  value,
  onChange,
  disabled,
}: {
  teachers: any[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Sort teachers A to Z by full name
  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) =>
      (a.fullName || "").localeCompare(b.fullName || "", undefined, { sensitivity: "base" })
    );
  }, [teachers]);

  // 2. Filter teachers based on search query (name, teacherId, specialization, phone)
  const filteredTeachers = useMemo(() => {
    if (!query.trim()) return sortedTeachers;
    const q = query.toLowerCase().trim();
    return sortedTeachers.filter(
      (t) =>
        t.fullName?.toLowerCase().includes(q) ||
        t.teacherId?.toLowerCase().includes(q) ||
        t.specialization?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q)
    );
  }, [sortedTeachers, query]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t._id === value || t.teacherId === value),
    [teachers, value]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left disabled:bg-gray-50 disabled:cursor-not-allowed min-h-[40px]"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedTeacher ? (
            <>
              {selectedTeacher.avatar ? (
                <img
                  src={selectedTeacher.avatar}
                  alt={selectedTeacher.fullName}
                  className="w-5 h-5 rounded-full object-cover border border-gray-200 flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                  {selectedTeacher.fullName?.charAt(0)?.toUpperCase() || "T"}
                </div>
              )}
              <span className="font-medium text-gray-900 truncate text-sm">
                {selectedTeacher.fullName}
              </span>
              {selectedTeacher.teacherId && (
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex-shrink-0">
                  {selectedTeacher.teacherId}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400 text-sm">Select a Teacher...</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${
            open ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-64">
          {/* Search box */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/90 sticky top-0 z-10">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search teacher by name or ID (A-Z)..."
                className="w-full text-xs outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Teacher List */}
          <div className="overflow-y-auto p-1 space-y-0.5 divide-y divide-gray-50">
            {/* Clear / Unassign Option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                !value
                  ? "bg-blue-50/70 text-blue-700 font-semibold"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span>— Unassigned (No Teacher) —</span>
              {!value && <CheckIcon className="w-3.5 h-3.5 text-blue-600" />}
            </button>

            {filteredTeachers.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No teachers found matching &quot;{query}&quot;
              </div>
            ) : (
              filteredTeachers.map((teacher) => {
                const isSelected = teacher._id === value || teacher.teacherId === value;
                return (
                  <button
                    key={teacher._id}
                    type="button"
                    onClick={() => {
                      onChange(teacher._id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-900 font-medium"
                        : "hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {teacher.avatar ? (
                        <img
                          src={teacher.avatar}
                          alt={teacher.fullName}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          {teacher.fullName?.charAt(0)?.toUpperCase() || "T"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate text-gray-900">{teacher.fullName}</span>
                          {teacher.teacherId && (
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200">
                              {teacher.teacherId}
                            </span>
                          )}
                        </div>
                        {teacher.specialization && (
                          <span className="text-[10px] text-gray-400 block truncate">
                            {teacher.specialization}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Edit Student Modal ─────────────── */
function EditStudentModal({ student, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    fullName: student?.fullName || "",
    fatherName: student?.fatherName || "",
    motherName: student?.motherName || "",
    age: student?.age || "",
    whatsappNumber: student?.whatsappNumber || "",
    email: student?.email || "",
    gender: student?.gender || "male",
    status: student?.status || "active",
    phone: student?.phone || "",
    crmRefId: student?.crmRefId || "",
    admissionDate: student?.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : "",
    admissionFee: student?.admissionFee || 0,
    course: student?.course?._id || student?.course || "",
    monthlyFee: student?.monthlyFee || 0,
    monthlyDue: student?.monthlyDue || 0,
    teacherId: student?.teacherId?._id || student?.teacherId || "",
    classStartingDate: student?.classStartingDate ? new Date(student.classStartingDate).toISOString().split('T')[0] : "",
    notes: student?.notes || ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  const [admins, setAdmins] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(false);

  // Sort courses alphabetically A to Z
  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })
    );
  }, [courses]);

  // Sort and filter CRM / Sales staff alphabetically A to Z (New Sales, After Sales, CRM, Admin)
  const sortedCrmUsers = useMemo(() => {
    return [...admins]
      .filter(isCrmOrSalesUser)
      .sort((a, b) =>
        (a.fullName || "").localeCompare(b.fullName || "", undefined, { sensitivity: "base" })
      );
  }, [admins]);

  useEffect(() => {
    if (student) {
      setFetchingData(true);
      Promise.all([
        fetch("/api/users?limit=100").then(r => r.json()),
        fetch("/api/teachers?limit=100").then(r => r.json()),
        fetch("/api/courses?limit=100").then(r => r.json())
      ]).then(([usersData, teachersData, coursesData]) => {
        if (usersData.success) setAdmins(usersData.users || []);
        if (teachersData.success) setTeachers(teachersData.teachers || []);
        if (coursesData.success) setCourses(coursesData.courses || []);
      }).catch(console.error).finally(() => setFetchingData(false));

      setForm({
        fullName: student.fullName || "",
        fatherName: student.fatherName || "",
        motherName: student.motherName || "",
        age: student.age || "",
        whatsappNumber: student.whatsappNumber || "",
        email: student.email || "",
        gender: student.gender || "male",
        status: student.status || "active",
        phone: student.phone || "",
        crmRefId: student.crmRefId || "",
        admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : "",
        admissionFee: student.admissionFee || 0,
        course: student.course?._id || student.course || "",
        monthlyFee: student.monthlyFee || 0,
        monthlyDue: student.monthlyDue || 0,
        teacherId: student.teacherId?._id || student.teacherId || "",
        classStartingDate: student.classStartingDate ? new Date(student.classStartingDate).toISOString().split('T')[0] : "",
        notes: student.notes || ""
      });
      setError("");
      setSuccess("");
      setPhoneError("");
      setWhatsappError("");
    }
  }, [student]);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setPhoneError("");
    setWhatsappError("");

    // Validate phone number if present
    if (form.phone && form.phone.trim() && !isValidPhoneNumber(form.phone.trim())) {
      setPhoneError("Please enter a valid international phone number.");
      setError("Please enter a valid phone number.");
      return;
    }

    // Validate WhatsApp number if present
    if (form.whatsappNumber && form.whatsappNumber.trim() && !isValidPhoneNumber(form.whatsappNumber.trim())) {
      setWhatsappError("Please enter a valid international WhatsApp number.");
      setError("Please enter a valid WhatsApp number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/students/${student._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to update student.");
        setLoading(false);
        return;
      }
      setSuccess("Student updated successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-sm">
              {form.fullName ? form.fullName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Edit Student</h3>
                {student.studentId && (
                  <span className="px-2 py-0.5 text-xs font-semibold font-mono rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    {student.studentId}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs sm:max-w-md">
                {student.email || student.fullName || "Update student record and details"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex-shrink-0">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* 1. Personal Details */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
                <User className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Personal Information</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Enter student full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Father&apos;s Name</label>
                  <input
                    type="text"
                    value={form.fatherName}
                    onChange={e => setForm(p => ({ ...p, fatherName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Enter father's name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mother&apos;s Name</label>
                  <input
                    type="text"
                    value={form.motherName}
                    onChange={e => setForm(p => ({ ...p, motherName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Enter mother's name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Age</label>
                  <input
                    type="number"
                    min={1}
                    value={form.age}
                    onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="e.g. 18"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Enrollment Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="at-risk">At Risk</option>
                    <option value="completed">Completed</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Contact Information */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
                <Phone className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Contact Information</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <PhoneInput
                    light
                    defaultCountry="BD"
                    placeholder="01700 000000"
                    value={form.phone}
                    onChange={(val) => {
                      setForm(p => ({ ...p, phone: val || "" }));
                      if (phoneError) setPhoneError("");
                    }}
                    hasError={!!phoneError}
                  />
                  {phoneError && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {phoneError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    WhatsApp Number
                  </label>
                  <PhoneInput
                    light
                    defaultCountry="BD"
                    placeholder="01700 000000"
                    value={form.whatsappNumber}
                    onChange={(val) => {
                      setForm(p => ({ ...p, whatsappNumber: val || "" }));
                      if (whatsappError) setWhatsappError("");
                    }}
                    hasError={!!whatsappError}
                  />
                  {whatsappError && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {whatsappError}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="student@example.com"
                  />
                </div>
              </div>
            </div>

            {/* 3. Academic & Assignment */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Academic &amp; Teacher Assignment</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Assigned Course</label>
                  <select
                    value={form.course}
                    onChange={e => setForm(p => ({ ...p, course: e.target.value }))}
                    disabled={fetchingData}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all disabled:bg-gray-50"
                  >
                    <option value="">Select a Course</option>
                    {sortedCourses.map(course => (
                      <option key={course._id} value={course._id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Assigned Teacher <span className="text-gray-400 font-normal text-[11px]">(Searchable A-Z)</span>
                  </label>
                  <TeacherSearchSelect
                    teachers={teachers}
                    value={form.teacherId}
                    onChange={(id) => setForm(p => ({ ...p, teacherId: id }))}
                    disabled={fetchingData}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admission Date</label>
                  <input
                    type="date"
                    value={form.admissionDate}
                    onChange={e => setForm(p => ({ ...p, admissionDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Class Starting Date</label>
                  <input
                    type="date"
                    value={form.classStartingDate}
                    onChange={e => setForm(p => ({ ...p, classStartingDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">CRM In Charge (After Sales / New Sales / CRM)</label>
                  <select
                    value={form.crmRefId}
                    onChange={e => setForm(p => ({ ...p, crmRefId: e.target.value }))}
                    disabled={fetchingData}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all disabled:bg-gray-50"
                  >
                    <option value="">Select CRM In Charge</option>
                    {sortedCrmUsers.map(admin => (
                      <option key={admin._id} value={admin._id}>
                        {admin.fullName} ({formatRoleLabel(admin.role)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Financial Structure */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Fees &amp; Billing ($)</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admission Fee ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      value={form.admissionFee}
                      onChange={e => setForm(p => ({ ...p, admissionFee: Number(e.target.value) }))}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Monthly Fee ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      value={form.monthlyFee}
                      onChange={e => setForm(p => ({ ...p, monthlyFee: Number(e.target.value) }))}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Monthly Due ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      value={form.monthlyDue}
                      onChange={e => setForm(p => ({ ...p, monthlyDue: Number(e.target.value) }))}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes &amp; Internal Remarks</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
                rows={2}
                placeholder="Enter any relevant comments, requirements, or schedule preferences..."
              />
            </div>

          </div>

          {/* Sticky Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── View Student Modal ─────────────── */
function ViewStudentModal({ student, onClose }: any) {
  if (!student) return null;

  const fields: [string, any][] = [
    ["Student Name", student.fullName || "—"],
    ["Father's Name", student.fatherName || "—"],
    ["Mother's Name", student.motherName || "—"],
    ["Age", student.age ? String(student.age) : "—"],
    ["Phone Number", student.phone ? <StudentPhoneWithFlag phone={student.phone} /> : "—"],
    ["WhatsApp Number", student.whatsappNumber ? <StudentPhoneWithFlag phone={student.whatsappNumber} type="whatsapp" /> : "—"],
    ["Student Number", student.studentNumber || "—"],
    ["STU- ID", student.studentId || "—"],
    ["Admission Date", student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "—"],
    ["Admission Fee", student.admissionFee !== undefined ? `৳${Number(student.admissionFee).toLocaleString()}` : "—"],
    ["Course", student.course?.title || student.course || "—"],
    ["Monthly Fee", student.monthlyFee !== undefined ? `৳${Number(student.monthlyFee).toLocaleString()}` : "—"],
    ["Monthly Due", student.monthlyDue !== undefined ? `৳${Number(student.monthlyDue).toLocaleString()}` : "—"],
    ["Class Starting Date", student.classStartingDate ? new Date(student.classStartingDate).toLocaleDateString() : "—"],
    ["Note", student.notes || "—"],
    ["Created Date", formatCustomDateTime(student.createdAt)],
    ["Updated Date", formatCustomDateTime(student.updatedAt)],
    ["Email", student.email || "—"],
    ["Gender", student.gender || "—"],
    ["Status", student.status || "—"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Student Details</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {student.avatar ? (
              <img
                src={student.avatar}
                alt={student.fullName}
                className="w-14 h-14 rounded-full object-cover border border-gray-200 flex-shrink-0"
              />
            ) : student.gender?.toLowerCase() === "female" ? (
              <img
                src="/default-female.png"
                alt={student.fullName}
                className="w-14 h-14 rounded-full object-cover border border-gray-200 flex-shrink-0 bg-gray-50 p-0.5"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                {(student.fullName || student.studentNumber || student.studentId)?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="text-lg font-bold text-gray-900">{student.fullName || student.studentNumber || student.studentId}</h4>
              <p className="text-sm text-gray-500">{student.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <div className="text-sm font-medium text-gray-900">{value}</div>
              </div>
            ))}
            <div className="col-span-2 border-t border-gray-100 pt-3 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Teacher</p>
                {student.teacherInfo ? (
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 w-fit">
                    {student.teacherInfo.avatar ? (
                      <img src={student.teacherInfo.avatar} alt={student.teacherInfo.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200">
                        {student.teacherInfo.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-900 leading-tight">{student.teacherInfo.name}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Faculty Member</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-900">—</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">CRM In Charge</p>
                {student.crmInfo ? (
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 w-fit">
                    {student.crmInfo.avatar ? (
                      <img src={student.crmInfo.avatar} alt={student.crmInfo.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200">
                        {student.crmInfo.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-900 leading-tight">{student.crmInfo.name}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Admin Staff</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-900">—</p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Password Change Modal ─────────────── */
function PasswordModal({ student, onClose }: any) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!student) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/students/${student._id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); setLoading(false); return; }
      setSuccess("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => onClose(), 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
            <p className="text-xs text-gray-500 mt-0.5">{student.fullName || student.studentNumber || student.studentId} · {student.email}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min 6 characters" minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Re-enter password" minLength={6} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading || !!success} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {loading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── Schedule Student Modal ─────────────── */
function ScheduleStudentModal({ student, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    teacherId: student.teacherId || "",
    courseId: "",
    weekly_days: 2,
    weekly_days_list: [] as string[],
    startTime: "",
    endTime: ""
  });
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  useEffect(() => {
    if (student) {
      setFetching(true);
      Promise.all([
        fetch("/api/teachers?limit=100").then(r => r.json()),
        fetch("/api/courses?limit=100").then(r => r.json()),
        fetch(`/api/schedules?studentId=${student._id}`).then(r => r.json())
      ]).then(([teachersData, coursesData, scheduleData]) => {
        const teachersList = teachersData.success ? teachersData.teachers || [] : [];
        const coursesList = coursesData.success ? coursesData.courses || [] : [];
        setTeachers(teachersList);
        setCourses(coursesList);
        
        let initialCourseId = "";
        let initialTeacherId = student.teacherId || "";
        let initialDays = 2;
        let initialList: string[] = [];
        let initialStart = "";
        let initialEnd = "";

        if (scheduleData.success && scheduleData.schedule) {
          initialTeacherId = scheduleData.schedule.teacher?._id || scheduleData.schedule.teacher || initialTeacherId;
          initialCourseId = scheduleData.schedule.course?._id || scheduleData.schedule.course || "";
          initialDays = scheduleData.schedule.weekly_days || 2;
          initialList = scheduleData.schedule.weekly_days_list || [];
          initialStart = scheduleData.schedule.startTime || "";
          initialEnd = scheduleData.schedule.endTime || "";
        }

        if (!initialCourseId && student.course) {
          const matched = coursesList.find((c: any) => c.title === student.course || c._id === student.course);
          if (matched) initialCourseId = matched._id;
        }

        setForm({
          teacherId: initialTeacherId,
          courseId: initialCourseId,
          weekly_days: initialDays,
          weekly_days_list: initialList,
          startTime: initialStart,
          endTime: initialEnd
        });
      }).catch(console.error).finally(() => setFetching(false));
    }
  }, [student]);

  const toggleDay = (day: string) => {
    setForm(prev => {
      const list = prev.weekly_days_list.includes(day)
        ? prev.weekly_days_list.filter(d => d !== day)
        : [...prev.weekly_days_list, day];
      return { ...prev, weekly_days_list: list };
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.teacherId || !form.courseId) {
      setError("Teacher and Course are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          ...form
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); setLoading(false); return; }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Manage Schedule</h3>
            <p className="text-xs text-gray-500 mt-0.5">{student.fullName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        {fetching ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                <select required value={form.teacherId} onChange={e => setForm({...form, teacherId: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                <select required value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Days (e.g. 2)</label>
                <input type="number" min={1} max={7} value={form.weekly_days} onChange={e => setForm({...form, weekly_days: Number(e.target.value)})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Time (45 mins)</label>
                <input type="time" value={form.startTime} onChange={e => {
                  const val = e.target.value;
                  if (!val) {
                    setForm({...form, startTime: "", endTime: ""});
                  } else {
                    const [h, m] = val.split(":").map(Number);
                    const d = new Date();
                    d.setHours(h, m + 45, 0, 0);
                    const end = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    setForm({...form, startTime: val, endTime: end});
                  }
                }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {form.endTime && <p className="text-[10px] text-gray-500 mt-1 ml-1">Ends at {form.endTime}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Days</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border capitalize transition-colors ${
                      form.weekly_days_list.includes(day)
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-6">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Student Payment History Modal ─────────────── */
function PaymentHistoryModal({ student, onClose }: any) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch(`/api/payments?studentId=${student._id}&limit=100`);
        const data = await res.json();
        if (data.success) {
          setPayments(data.payments || []);
        }
      } catch (err) {
        console.error("Error fetching payment history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [student._id]);

  const getTimelineMonths = () => {
    const admission = student.admissionDate ? new Date(student.admissionDate) : new Date(student.createdAt);
    const now = new Date();
    const months: string[] = [];
    
    let current = new Date(admission.getFullYear(), admission.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    
    while (current <= end) {
      months.push(current.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
      current.setMonth(current.getMonth() + 1);
    }
    
    if (months.length === 0) {
      for (let i = -5; i <= 0; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
      }
    }
    return months.reverse(); // Newest first
  };

  const timelineMonths = getTimelineMonths();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
            <p className="text-xs text-gray-500 mt-0.5">{student.fullName} · {student.studentId}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Teacher Info */}
          <div className="flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100/60 rounded-xl mb-6">
            {student.teacherInfo ? (
              <>
                {student.teacherInfo.avatar ? (
                  <img src={student.teacherInfo.avatar} alt={student.teacherInfo.name} className="w-10 h-10 rounded-full object-cover border border-blue-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold border border-blue-200">
                    {student.teacherInfo.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">Assigned Teacher</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{student.teacherInfo.name}</p>
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500 italic p-1">No assigned teacher found for this student.</div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Loading payment records...</p>
            </div>
          ) : (
            <Timeline className="w-full pl-2">
              {timelineMonths.map((monthName, idx) => {
                const payment = payments.find((p) => p.month === monthName);
                const isPaid = payment?.status === "completed";
                const isPending = payment?.status === "pending";
                const amount = payment ? payment.amount : (student.monthlyFee || 0);

                let title = `Unpaid — ৳${amount}`;
                let description = `Monthly tuition fee for ${monthName} is unpaid.`;
                let badgeColor = "bg-red-50 text-red-700 border-red-100";
                let indicatorColor = "border-red-300 text-red-500 bg-red-50";

                if (isPaid) {
                  title = `Paid — ৳${amount}`;
                  description = `Paid via ${payment.paymentMethod?.replace("-", " ") || "other"} on ${new Date(payment.createdAt).toLocaleDateString()}. ${payment.mrNumber ? `MR: ${payment.mrNumber}` : ""}`;
                  badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  indicatorColor = "border-emerald-500 bg-emerald-500 text-white";
                } else if (isPending) {
                  title = `Pending Approval — ৳${amount}`;
                  description = `Payment recorded on ${new Date(payment.createdAt).toLocaleDateString()} is pending admin approval.`;
                  badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                  indicatorColor = "border-amber-500 bg-amber-500 text-white";
                }

                return (
                  <TimelineItem key={monthName} step={idx + 1} isCompleted={isPaid || isPending}>
                    <TimelineHeader className="flex flex-row items-center sm:items-center">
                      <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-[25px] top-6" />
                      <TimelineDate className="text-xs text-gray-500 sm:w-28 pl-8 sm:pl-0 sm:mr-3 whitespace-nowrap">
                        {monthName}
                      </TimelineDate>
                      <TimelineTitle className="pl-0 flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeColor}`}>
                          {title}
                        </span>
                      </TimelineTitle>
                      <TimelineIndicator className={`group-data-[orientation=vertical]/timeline:-left-[25px] flex size-5 items-center justify-center rounded-full border-2 text-[10px] ${indicatorColor}`}>
                        {isPaid ? (
                          <CheckIcon className="size-3" />
                        ) : isPending ? (
                          <span className="animate-pulse">⏳</span>
                        ) : (
                          <span>❌</span>
                        )}
                      </TimelineIndicator>
                    </TimelineHeader>
                    <TimelineContent className="pl-8 sm:pl-32 text-xs text-gray-500 mt-1.5">
                      {description}
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Main Students Page ─────────────── */
/* ─────────────── Main Students Page Component ─────────────── */
function StudentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();

  const currentMonth = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, []);

  // Initialize filter state from URL search params (or fallbacks)
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") || "");
  const [status, setStatus] = useState(() => searchParams.get("status") || "");
  const [filterMonth, setFilterMonth] = useState(() => searchParams.get("month") || currentMonth);
  const [paymentStatus, setPaymentStatus] = useState(() => searchParams.get("paymentStatus") || "");
  const [teacherFilter, setTeacherFilter] = useState(() => searchParams.get("teacherFilter") || "");
  const [crmFilter, setCrmFilter] = useState(() => searchParams.get("crmFilter") || "");
  const [fromDate, setFromDate] = useState(() => searchParams.get("fromDate") || "");
  const [toDate, setToDate] = useState(() => searchParams.get("toDate") || "");
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);

  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [adminList, setAdminList] = useState<any[]>([]);
  const [teacherList, setTeacherList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [deleting, setDeleting] = useState<any>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [passwordStudent, setPasswordStudent] = useState<any>(null);
  const [scheduleStudent, setScheduleStudent] = useState<any>(null);
  const [paymentHistoryStudent, setPaymentHistoryStudent] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const LIMIT = 10;

  // Month options (6 months back, 6 months forward)
  const monthOptions = useMemo(() => {
    const list: string[] = [];
    const startOption = new Date();
    startOption.setMonth(startOption.getMonth() - 6);
    for (let i = 0; i < 14; i++) {
      list.push(startOption.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
      startOption.setMonth(startOption.getMonth() + 1);
    }
    return list;
  }, []);

  // Fetch admin and teacher lists and currentUser info
  useEffect(() => {
    Promise.all([
      fetch("/api/users?limit=100").then(r => r.json()).catch(() => ({ success: false })),
      fetch("/api/teachers?limit=100").then(r => r.json()).catch(() => ({ success: false })),
      fetch("/api/auth/me").then(r => r.json()).catch(() => ({ success: false }))
    ]).then(([usersData, teachersData, authData]) => {
      if (usersData?.success) setAdminList(usersData.users || []);
      if (teachersData?.success) setTeacherList(teachersData.teachers || []);
      if (authData?.user) setCurrentUser(authData.user);
    }).catch(console.error);
  }, []);

  // Check if current user is super-admin or admin with full permissions
  const isSuperAdmin = currentUser?.role === "super-admin" || currentUser?.role === "admin" || currentUser?.permissions?.includes("*");

  // Strictly filter to CRM and Sales users (After Sales, New Sales, Sales, CRM, Admin, Super Admin)
  const sortedCrmUsers = useMemo(() => {
    return [...adminList]
      .filter(isCrmOrSalesUser)
      .sort((a, b) =>
        (a.fullName || "").localeCompare(b.fullName || "", undefined, { sensitivity: "base" })
      );
  }, [adminList]);

  const sortedTeachers = useMemo(() => {
    return [...teacherList].sort((a, b) =>
      (a.fullName || "").localeCompare(b.fullName || "", undefined, { sensitivity: "base" })
    );
  }, [teacherList]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Synchronize URL search params whenever any filter or pagination state changes
  const isInitialSync = useRef(true);
  useEffect(() => {
    if (isInitialSync.current) {
      isInitialSync.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);
    if (filterMonth && filterMonth !== currentMonth) params.set("month", filterMonth);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (teacherFilter) params.set("teacherFilter", teacherFilter);
    if (crmFilter) params.set("crmFilter", crmFilter);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (page > 1) params.set("page", String(page));

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(null, "", newUrl);
  }, [debouncedSearch, status, filterMonth, paymentStatus, teacherFilter, crmFilter, fromDate, toDate, page, pathname, currentMonth]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch student list from API
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        search: debouncedSearch,
        status,
        month: filterMonth,
        paymentStatus,
        teacherFilter,
        crmFilter,
        fromDate,
        toDate
      });
      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setFetchError(data.message || "Failed to load students list.");
      }
    } catch (err: any) {
      console.error(err);
      setFetchError("Network error fetching students. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, filterMonth, paymentStatus, teacherFilter, crmFilter, fromDate, toDate]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to delete student.");
        return;
      }
      // Optimistically remove from state for instant feedback
      setStudents(prev => prev.filter(s => s._id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      fetchStudents();
    } catch (err) {
      console.error("Delete student error:", err);
      alert("Network error while deleting student. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${id}`);
      const data = await res.json();
      if (data.success) setViewStudent(data.student);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setShowExportMenu(false);
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        status,
        month: filterMonth,
        paymentStatus,
        teacherFilter,
        crmFilter,
        fromDate,
        toDate
      });
      const res = await fetch(`/api/students/export?${params}`);
      const data = await res.json();
      if (!data.success) { alert("Export failed: " + data.message); return; }
      const rawRows: Record<string, any>[] = data.students || [];
      if (rawRows.length === 0) { alert("No students to export."); return; }

      const filename = `students_export_${new Date().toISOString().split("T")[0]}`;
      const rows = rawRows.map((r: any) => ({
        ...r,
        createdAt: formatCustomDateTime(r.createdAt),
        updatedAt: formatCustomDateTime(r.updatedAt),
      }));

      if (format === "csv") {
        const csv = toCSV(rows, EXPORT_COLUMNS);
        downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
      } else if (format === "xlsx") {
        const XLSX = await loadSheetJS();
        const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        await exportStudentsPDF(rawRows, filename);
      }
    } catch (err) {
      console.error(err);
      alert("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  // Quick date filters
  const applyDatePreset = (preset: "today" | "thisMonth" | "last30Days") => {
    const now = new Date();
    if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "thisMonth") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      setFromDate(first);
      setToDate(last);
    } else if (preset === "last30Days") {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setFilterMonth(currentMonth);
    setPaymentStatus("");
    setTeacherFilter("");
    setCrmFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
    window.history.replaceState(null, "", pathname);
  };

  const hasActiveFilters = Boolean(
    search || status || (filterMonth && filterMonth !== currentMonth) || paymentStatus || teacherFilter || crmFilter || fromDate || toDate || page > 1
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" />
            Student Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage enrollments, track progress, and monitor monthly fees.
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {total.toLocaleString()} total student{total !== 1 ? "s" : ""}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors shadow-sm"
            >
              {exportLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4 text-gray-600" />}
              Export
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1.5 overflow-hidden">
                <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Export Format</p>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium">CSV File</p>
                    <p className="text-[11px] text-gray-400">Comma-separated values</p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport("xlsx")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-medium">Excel File</p>
                    <p className="text-[11px] text-gray-400">Microsoft Excel (.xlsx)</p>
                  </div>
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="font-medium">PDF Report</p>
                    <p className="text-[11px] text-gray-400">Formatted report with sums & dates</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Add Student */}
          {can("student-crm", "create") && (
            <Link
              href="/students/add"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Student
            </Link>
          )}
        </div>
      </div>

      <ReadOnlyNotice module="student-crm" featureName="Student CRM" />

      {/* Error Alert */}
      {fetchError && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => fetchStudents()}
            className="px-3.5 py-1.5 bg-red-600 text-white font-medium text-xs rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Table & Filter Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-200 flex flex-col gap-3.5 bg-gray-50/70">
          
          {/* Row 1: Search & Date Range Filters */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, ID, phone, email, teacher, or CRM..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range & Date Presets */}
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> From:
                </span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => { setFromDate(e.target.value); setPage(1); }}
                  className="text-xs bg-transparent outline-none text-gray-800 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" /> To:
                </span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => { setToDate(e.target.value); setPage(1); }}
                  className="text-xs bg-transparent outline-none text-gray-800 cursor-pointer"
                />
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyDatePreset("today")}
                  className="px-2 py-1.5 text-[11px] font-medium bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset("thisMonth")}
                  className="px-2 py-1.5 text-[11px] font-medium bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset("last30Days")}
                  className="px-2 py-1.5 text-[11px] font-medium bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-colors"
                >
                  30 Days
                </button>
              </div>

              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
                  className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1"
                  title="Clear Date Filter"
                >
                  <X className="w-3.5 h-3.5" /> Clear Dates
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Status, Month, Payment, Teacher, CRM Dropdowns & Reset Button */}
          <div className="flex flex-wrap items-center gap-2.5 w-full">
            {/* Status Filter */}
            <div className="relative flex-1 sm:flex-initial min-w-[130px]">
              <select
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="at-risk">At Risk</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Target Month Filter */}
            <div className="relative flex-1 sm:flex-initial min-w-[170px]">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">Month:</span>
              <select
                value={filterMonth}
                onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
                className="pl-14 pr-7 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none"
              >
                {monthOptions.map(m => (
                  <option key={m} value={m}>{m} {m === currentMonth ? "(Current)" : ""}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Payment Status Filter */}
            <div className="relative flex-1 sm:flex-initial min-w-[160px]">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">Payment:</span>
              <select
                value={paymentStatus}
                onChange={e => { setPaymentStatus(e.target.value); setPage(1); }}
                className="pl-16 pr-7 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none"
              >
                <option value="">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending Approval</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Teacher Filter */}
            <div className="relative flex-1 sm:flex-initial min-w-[180px]">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">Teacher:</span>
              <select
                value={teacherFilter}
                onChange={e => { setTeacherFilter(e.target.value); setPage(1); }}
                className="pl-16 pr-7 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none truncate max-w-[200px]"
              >
                <option value="">All Teachers</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
                {sortedTeachers.length > 0 && (
                  <optgroup label="Select Specific Teacher">
                    {sortedTeachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.fullName} {t.teacherId ? `(${t.teacherId})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* CRM In Charge Filter (Filtered strictly to After Sales, New Sales, Sales, CRM & Admin) */}
            <div className="relative flex-1 sm:flex-initial min-w-[180px]">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">CRM:</span>
              <select
                value={crmFilter}
                onChange={e => { setCrmFilter(e.target.value); setPage(1); }}
                className="pl-12 pr-7 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none truncate max-w-[200px]"
              >
                <option value="">All CRM Staff</option>
                <option value="assigned">Assigned CRM</option>
                <option value="unassigned">Unassigned CRM</option>
                {sortedCrmUsers.length > 0 && (
                  <optgroup label="After Sales & New Sales">
                    {sortedCrmUsers.map((adm) => (
                      <option key={adm._id} value={adm._id}>
                        {adm.fullName} ({formatRoleLabel(adm.role)})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm ml-auto"
                title="Reset all filters to default"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3.5 text-center whitespace-nowrap w-12">Sl</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[220px]">Student Info</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[200px]">Course & Fees</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">Assigned Staff</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[150px]">{filterMonth} Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[170px]">Schedule & Note</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-semibold text-gray-700 text-base">No students found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search criteria.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s._id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Sl */}
                    <td className="px-4 py-4 text-center text-gray-400 font-medium text-xs whitespace-nowrap">
                      {((page - 1) * LIMIT) + idx + 1}
                    </td>

                    {/* Student Info */}
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        {s.avatar ? (
                          <img
                            src={s.avatar}
                            alt={s.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0 mt-0.5"
                          />
                        ) : s.gender?.toLowerCase() === "female" ? (
                          <img
                            src="/default-female.png"
                            alt={s.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0 bg-gray-50 p-0.5 mt-0.5"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {(s.fullName || s.phone || s.studentId)?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{s.fullName || "—"}</span>
                            {s.studentId && (
                              <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {s.studentId}
                              </span>
                            )}
                            {s.status && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold capitalize ${
                                STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"
                              }`}>
                                {s.status}
                              </span>
                            )}
                          </div>
                          {s.phone && (
                            <StudentPhoneWithFlag phone={s.phone} />
                          )}
                          {s.whatsappNumber && s.whatsappNumber !== s.phone && (
                            <div className="mt-0.5">
                              <StudentPhoneWithFlag phone={s.whatsappNumber} type="whatsapp" />
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1 font-mono">
                            <p><span className="text-gray-500 font-medium">Created:</span> {formatCustomDateTime(s.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Course & Fees */}
                    <td className="px-4 py-4 text-xs space-y-1">
                      <p className="font-semibold text-gray-900">{s.course?.title || s.course || "—"}</p>
                      <p className="text-gray-500">
                        <span className="font-medium text-gray-700">Admission:</span> ৳{s.admissionFee !== undefined ? Number(s.admissionFee).toLocaleString() : "0"}{" "}
                        {s.admissionDate && <span className="text-gray-400">({new Date(s.admissionDate).toLocaleDateString()})</span>}
                      </p>
                      <p className="text-gray-500">
                        <span className="font-medium text-gray-700">Monthly Fee:</span> ৳{s.monthlyFee !== undefined ? Number(s.monthlyFee).toLocaleString() : "0"}
                      </p>
                      {s.monthlyDue > 0 && (
                        <p className="text-red-600 font-semibold">
                          Due: ৳{Number(s.monthlyDue).toLocaleString()}
                        </p>
                      )}
                    </td>

                    {/* Assigned Staff */}
                    <td className="px-4 py-4 text-xs space-y-2">
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Teacher</span>
                        {s.teacherInfo ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.teacherInfo.avatar ? (
                              <img src={s.teacherInfo.avatar} alt={s.teacherInfo.name} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[9px] font-bold border border-blue-200">
                                {s.teacherInfo.name?.charAt(0)?.toUpperCase() || "T"}
                              </div>
                            )}
                            <span className="font-medium text-gray-800 truncate">{s.teacherInfo.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">CRM In Charge</span>
                        {s.crmInfo ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.crmInfo.avatar ? (
                              <img src={s.crmInfo.avatar} alt={s.crmInfo.name} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[9px] font-bold border border-indigo-200">
                                {s.crmInfo.name?.charAt(0)?.toUpperCase() || "C"}
                              </div>
                            )}
                            <span className="font-medium text-gray-800 truncate">{s.crmInfo.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>

                    {/* Month Payment Status */}
                    <td className="px-4 py-4 text-center">
                      {s.paymentInfo ? (
                        s.paymentInfo.status === "completed" ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Paid
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1 font-mono">
                              ৳{s.paymentInfo.amount} {s.paymentInfo.paymentMethod ? `(${s.paymentInfo.paymentMethod.replace("-", " ")})` : ""}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> Pending
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1 font-mono">৳{s.paymentInfo.amount}</span>
                          </div>
                        )
                      ) : (
                        <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-red-200 flex items-center justify-center gap-1 inline-flex mx-auto">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Unpaid
                        </span>
                      )}
                    </td>

                    {/* Schedule & Notes */}
                    <td className="px-4 py-4 text-xs space-y-1.5 max-w-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-medium block">Starting Date</span>
                        <span className="text-gray-700 font-medium">{s.classStartingDate ? new Date(s.classStartingDate).toLocaleDateString() : "—"}</span>
                      </div>
                      {s.notes && (
                        <div>
                          <span className="text-[10px] text-gray-400 font-medium block">Notes</span>
                          <p className="text-gray-500 truncate max-w-[150px]" title={s.notes}>{s.notes}</p>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        {can("student-crm", "update") && (
                          <button
                            onClick={() => setScheduleStudent(s)}
                            title="Update Schedule / Teacher"
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleView(s._id)}
                          title="View Details"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {can("student-crm", "update") && (
                          <button
                            onClick={() => setEditStudent(s)}
                            title="Edit Student"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {can("student-crm", "update") && (
                          <button
                            onClick={() => setPasswordStudent(s)}
                            title="Change Password"
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setPaymentHistoryStudent(s)}
                          title="Payment History"
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        {can("student-crm", "delete") && (
                          <button
                            onClick={() => handleDelete(s._id, s.fullName || s.studentId)}
                            disabled={deleting === s._id}
                            title="Delete Student"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                          >
                            {deleting === s._id ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500 bg-gray-50/50">
          <div>
            Showing <span className="font-medium text-gray-900">{total > 0 ? ((page - 1) * LIMIT) + 1 : 0}</span> to <span className="font-medium text-gray-900">{Math.min(page * LIMIT, total)}</span> of <span className="font-medium text-gray-900">{total.toLocaleString()}</span> students
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 flex items-center gap-1 text-xs font-medium text-gray-700 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 flex items-center gap-1 text-xs font-medium text-gray-700 transition-colors shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {editStudent && (
        <EditStudentModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSuccess={() => { setEditStudent(null); fetchStudents(); }}
        />
      )}
      {viewStudent && (
        <ViewStudentModal
          student={viewStudent}
          onClose={() => setViewStudent(null)}
        />
      )}
      {passwordStudent && (
        <PasswordModal
          student={passwordStudent}
          onClose={() => setPasswordStudent(null)}
        />
      )}
      {scheduleStudent && (
        <ScheduleStudentModal
          student={scheduleStudent}
          onClose={() => setScheduleStudent(null)}
          onSuccess={() => { setScheduleStudent(null); fetchStudents(); }}
        />
      )}
      {paymentHistoryStudent && (
        <PaymentHistoryModal
          student={paymentHistoryStudent}
          onClose={() => setPaymentHistoryStudent(null)}
        />
      )}
      {showImport && (
        <ImportStudentsModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { fetchStudents(); }}
        />
      )}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading Student CRM...</p>
        </div>
      }
    >
      <StudentsContent />
    </Suspense>
  );
}
