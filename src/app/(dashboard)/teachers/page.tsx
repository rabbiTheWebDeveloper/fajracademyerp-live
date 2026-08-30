"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  GraduationCap, Search, Plus, X, Loader2, Star,
  ChevronLeft, ChevronRight, Edit2, Trash2, Eye, AlertCircle,
  KeyRound, Save, CheckCircle, CheckCircle2, XCircle, Clock, UserCircle, FileText, MapPin, Banknote,
  Download, FileSpreadsheet, ChevronDown, Users, Phone, CreditCard, Sparkles, Lock, ShieldCheck
} from "lucide-react";
import { OfficialIDCard, OfficialIDCardBack, downloadIDCardElement } from "@/components/TeacherOfficialIDCard";
import Link from "next/link";
import { usePermissions } from "@/context/PermissionContext";
import { ReadOnlyNotice } from "@/components/PermissionGuard";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  "on-leave": "bg-amber-100 text-amber-700",
  terminated: "bg-red-100 text-red-700",
};

/* ─────────────── Export Utilities ─────────────── */

const EXPORT_COLS = [
  "teacherId", "fullName", "email", "phone", "designation", "version",
  "gender", "status", "salary", "salaryType", "bloodGroup",
  "rating", "presentAddress", "permanentAddress", "bio", "createdAt", "updatedAt"
];

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

function escapeCSV(v: any): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function toCSV(rows: Record<string, any>[], cols: string[]): string {
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escapeCSV(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

async function exportPDF(rows: Record<string, any>[], filename: string) {
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

    // Title & Metadata
    const totalSalary = rows.reduce((acc, r) => acc + (Number(r.salary) || 0), 0);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 25, 49);
    doc.text("TEACHER DIRECTORY REPORT", 283, 14, { align: "right" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Total: ${rows.length} Teachers   |   Generated: ${formatCustomDateTime(new Date())}`, 283, 20, { align: "right" });

    // Decorative Navy Separator Line
    doc.setDrawColor(10, 25, 49);
    doc.setLineWidth(0.8);
    doc.line(14, 27, 283, 27);

    // Summary pills
    const active = rows.filter(r => r.status === "active").length;
    const inactive = rows.filter(r => r.status === "inactive").length;
    const onLeave = rows.filter(r => r.status === "on-leave").length;
    const terminated = rows.filter(r => r.status === "terminated").length;

    const pills = [
      { label: "Active", count: active, color: [209, 250, 229] as [number,number,number], text: [6, 95, 70] as [number,number,number] },
      { label: "Inactive", count: inactive, color: [243, 244, 246] as [number,number,number], text: [75, 85, 99] as [number,number,number] },
      { label: "On Leave", count: onLeave, color: [254, 243, 199] as [number,number,number], text: [146, 64, 14] as [number,number,number] },
      { label: "Terminated", count: terminated, color: [254, 226, 226] as [number,number,number], text: [185, 28, 28] as [number,number,number] },
      { label: "Total Salary", count: `Tk ${totalSalary.toLocaleString()}`, color: [238, 242, 255] as [number,number,number], text: [67, 56, 202] as [number,number,number], width: 50 },
    ];
    let pillX = 14;
    pills.forEach((p) => {
      const w = p.width || 36;
      doc.setFillColor(p.color[0], p.color[1], p.color[2]);
      doc.roundedRect(pillX, 31, w, 7, 1.5, 1.5, "F");
      doc.setTextColor(p.text[0], p.text[1], p.text[2]);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${p.label}: ${p.count}`, pillX + (w / 2), 35.8, { align: "center" });
      pillX += w + 3;
    });

    // Table
    autoTable(doc, {
      startY: 42,
      theme: 'grid',
      head: [[
        "#", "Teacher ID", "Full Name", "Email", "Phone",
        "Designation", "Gender", "Salary", "Status", "Rating"
      ]],
      body: rows.map((r, i) => [
        i + 1,
        r.teacherId || "",
        r.fullName || "",
        r.email || "",
        r.phone || "—",
        r.designation || "—",
        r.gender ? r.gender.charAt(0).toUpperCase() + r.gender.slice(1) : "—",
        r.salary > 0
          ? (r.salaryType === "per-student-percentage" ? `${r.salary}%` : `${Number(r.salary).toLocaleString()}`)
          : "—",
        r.status || "",
        r.rating ? Number(r.rating).toFixed(1) : "N/A",
      ]),
      foot: [[
        "", "TOTAL", "", "", "", "", "",
        `${Number(totalSalary).toLocaleString()}`,
        "", ""
      ]],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: navyColor,
        fontStyle: "bold",
        halign: "center",
      },
      styles: { fontSize: 8, cellPadding: 2.5, halign: "center", valign: "middle" },
      headStyles: { 
        fillColor: navyColor, 
        textColor: [255, 255, 255], 
        fontStyle: "bold", 
        halign: "center" 
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { halign: "left", fontStyle: "bold", textColor: [10, 25, 49] },
        2: { halign: "left", fontStyle: "bold" },
        3: { halign: "left" },
        4: { halign: "left" },
        5: { halign: "left" },
        6: { halign: "center" },
        7: { halign: "right" },
        8: { halign: "center" },
        9: { halign: "center" },
      },
      didDrawCell: (data: any) => {
        // Color the Status cell based on value
        if (data.section === "body" && data.column.index === 8) {
          const val = String(data.cell.text[0] || "").toLowerCase();
          const colors: Record<string, [number, number, number]> = {
            active: [209, 250, 229],
            inactive: [243, 244, 246],
            "on-leave": [254, 243, 199],
            terminated: [254, 226, 226],
          };
          const bgCol = colors[val];
          if (bgCol) {
            doc.setFillColor(bgCol[0], bgCol[1], bgCol[2]);
            doc.rect(data.cell.x + 1, data.cell.y + 1.5, data.cell.width - 2, data.cell.height - 3, "F");
            const textColors: Record<string, [number, number, number]> = {
              active: [6, 95, 70],
              inactive: [75, 85, 99],
              "on-leave": [146, 64, 14],
              terminated: [185, 28, 28],
            };
            const txtCol = textColors[val] || [0, 0, 0];
            doc.setTextColor(txtCol[0], txtCol[1], txtCol[2]);
            doc.setFontSize(7.5);
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

interface Qualification {
  degree: string;
  institute: string;
  passingYear: string | number;
}

/* ─────────────── Edit Teacher Modal ─────────────── */
function EditTeacherModal({ teacherId, onClose, onSuccess, currentUser }: { teacherId: string | null; onClose: () => void; onSuccess: () => void; currentUser?: any }) {
  const [teacher, setTeacher] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    fullName: "", designation: "", category: "", email: "", phone: "",
    emergencyContactNumber: "", gender: "male",
    salary: 0, salaryType: "monthly",
    bloodGroup: "A+", presentAddress: "", permanentAddress: "",
    status: "active", idCardStatus: "pending", bio: "", version: [] as string[], rating: 0,
  });

  useEffect(() => {
    fetch("/api/teachers/category")
      .then(r => r.json())
      .then(data => { if (data.success) setCategories(data.categories || []); });
  }, []);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingNID, setUploadingNID] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [nidUrl, setNidUrl] = useState("");

  useEffect(() => {
    if (!teacherId) return;
    setFetching(true); setError(""); setSuccess("");
    fetch(`/api/teachers/${teacherId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) { setError(data.message || "Failed to load teacher"); setFetching(false); return; }
        const t = data.teacher;
        setTeacher(t);
        setForm({
          fullName: t.fullName || "",
          designation: t.designation || "",
          category: t.category?._id || t.category || "",
          email: t.email || "",
          phone: t.phone || "",
          emergencyContactNumber: t.emergencyContactNumber || "",
          gender: t.gender || "male",
          salary: t.salary || 0,
          salaryType: t.salaryType || "monthly",
          bloodGroup: t.bloodGroup || "A+",
          presentAddress: t.presentAddress || "",
          permanentAddress: t.permanentAddress || "",
          status: t.status || "active",
          idCardStatus: t.idCardStatus || "pending",
          bio: t.bio || "",
          version: t.version || [],
          rating: t.rating || 0,
        });
        setAvatarUrl(t.avatar || "");
        setNidUrl(t.nidOrBirthCertificatePicture || "");
        setQualifications(
          t.qualifications && t.qualifications.length > 0
            ? t.qualifications.map((q: any) => ({ degree: q.degree || "", institute: q.institute || "", passingYear: q.passingYear || "" }))
            : [{ degree: "", institute: "", passingYear: "" }]
        );
      })
      .catch(() => setError("Network error. Please try again."))
      .finally(() => setFetching(false));
  }, [teacherId]);

  if (!teacherId) return null;

  const handleQualChange = (index: number, field: keyof Qualification, value: string) => {
    const u = [...qualifications]; u[index] = { ...u[index], [field]: value }; setQualifications(u);
  };
  const addQual = () => setQualifications([...qualifications, { degree: "", institute: "", passingYear: "" }]);
  const removeQual = (index: number) => setQualifications(qualifications.filter((_, i) => i !== index));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "avatar" | "nid") => {
    const file = e.target.files?.[0]; if (!file) return;
    if (field === "avatar") setUploadingAvatar(true); else setUploadingNID(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) { if (field === "avatar") setAvatarUrl(data.secure_url); else setNidUrl(data.secure_url); }
      else setError(data.message || "Upload failed");
    } catch { setError("Upload failed."); }
    finally { if (field === "avatar") setUploadingAvatar(false); else setUploadingNID(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const fq = qualifications
        .filter((q) => q.degree.trim() || q.institute.trim() || q.passingYear)
        .map((q) => ({ degree: q.degree.trim(), institute: q.institute.trim(), passingYear: q.passingYear ? Number(q.passingYear) : undefined }));
      const payload: any = { ...form, salary: Number(form.salary), qualifications: fq };
      if (avatarUrl) payload.avatar = avatarUrl;
      if (nidUrl) payload.nidOrBirthCertificatePicture = nidUrl;
      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Update failed"); setLoading(false); return; }
      setSuccess("Teacher updated successfully!");
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const inp = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
  const ta = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Teacher</h3>
            <p className="text-xs text-gray-500 mt-0.5">{teacher?.teacherId} &middot; {teacher?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
        {success && <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm"><CheckCircle className="w-4 h-4" /> {success}</div>}
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-sm text-gray-500">Loading teacher data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh]">
            {/* Personal Details */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4"><UserCircle className="w-4 h-4 text-blue-600" /><h4 className="text-sm font-semibold text-gray-700">Personal Details</h4></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label><input type="text" required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label><input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+8801712345678" className={inp} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Emergency Contact <span className="text-red-500">*</span></label><input type="tel" required value={form.emergencyContactNumber} onChange={e => setForm(p => ({ ...p, emergencyContactNumber: e.target.value }))} placeholder="+8801812345678" className={inp} /></div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                  <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className={inp}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Blood Group <span className="text-red-500">*</span></label>
                  <select value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))} className={inp}>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Avatar Image</label>
                  <div className="flex items-center gap-4">
                    {avatarUrl && (form.gender !== "female" || currentUser?.permissions?.includes("*") || currentUser?.role === "super-admin") && <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" />}
                    <input type="file" accept="image/*" onChange={e => handleUpload(e, "avatar")} className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                    {uploadingAvatar && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>}
                  </div>
                </div>
              </div>
            </div>
            {/* Address */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4"><MapPin className="w-4 h-4 text-red-500" /><h4 className="text-sm font-semibold text-gray-700">Address Details</h4></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Present Address <span className="text-red-500">*</span></label><textarea required value={form.presentAddress} onChange={e => setForm(p => ({ ...p, presentAddress: e.target.value }))} rows={2} className={ta} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Permanent Address <span className="text-red-500">*</span></label><textarea required value={form.permanentAddress} onChange={e => setForm(p => ({ ...p, permanentAddress: e.target.value }))} rows={2} className={ta} /></div>
              </div>
            </div>
            {/* Professional */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-emerald-600" /><h4 className="text-sm font-semibold text-gray-700">Professional Details</h4></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Designation / Teacher Category <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={form.category}
                    onChange={e => {
                      const catId = e.target.value;
                      const catName = categories.find(c => c._id === catId)?.name || "";
                      setForm(p => ({ ...p, category: catId, designation: catName }));
                    }}
                    className={inp}
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inp}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ID Card Status</label>
                  <select value={form.idCardStatus} onChange={e => setForm(p => ({ ...p, idCardStatus: e.target.value }))} className={inp}>
                    <option value="pending">⏳ Pending Approval</option>
                    <option value="approved">✅ Approved (Unlocked)</option>
                    <option value="rejected">❌ Rejected (Locked)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Salary Type</label>
                  <select value={form.salaryType} onChange={e => setForm(p => ({ ...p, salaryType: e.target.value }))} className={inp}>
                    <option value="monthly">Monthly</option>
                    <option value="per-student-percentage">Per Student Percentage</option>
                    <option value="per-student-amount">Per Student Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{form.salaryType === "per-student-percentage" ? "Percentage (%)" : "Salary Amount"}</label>
                  <input type="number" min={0} value={form.salary} onChange={e => setForm(p => ({ ...p, salary: Number(e.target.value) }))} placeholder={form.salaryType === "per-student-percentage" ? "e.g. 50" : "0"} className={inp} />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Version <span className="text-red-500">*</span></label>
                  <div className="flex gap-2 flex-wrap">
                    {["Bangla", "English", "Arabic"].map(ver => (
                      <label key={ver} className="flex items-center gap-1 text-[10px] text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={form.version.includes(ver)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm(p => ({
                              ...p,
                              version: checked ? [...p.version, ver] : p.version.filter(v => v !== ver)
                            }));
                          }}
                          className="w-3 h-3 text-emerald-600 rounded border-gray-300"
                        />
                        {ver}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Admin Rating (Out of 5)</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button type="button" key={star} onClick={() => setForm(p => ({ ...p, rating: star }))}
                        className={`p-0.5 transition-colors ${form.rating >= star ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}>
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Bio</label><textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2} className={ta} /></div>
              </div>
            </div>
            {/* Qualifications */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-indigo-600" /><h4 className="text-sm font-semibold text-gray-700">Qualifications</h4></div>
                <button type="button" onClick={addQual} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
              </div>
              <div className="space-y-3">
                {qualifications.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">No qualifications. Click Add Row.</p>
                ) : qualifications.map((q, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="col-span-4"><label className="block text-xs text-gray-500 mb-1">Degree</label><input type="text" value={q.degree} onChange={e => handleQualChange(index, "degree", e.target.value)} placeholder="e.g. Hafiz-e-Quran" className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none" /></div>
                    <div className="col-span-5"><label className="block text-xs text-gray-500 mb-1">Institute</label><input type="text" value={q.institute} onChange={e => handleQualChange(index, "institute", e.target.value)} placeholder="e.g. Al-Azhar University" className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none" /></div>
                    <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Year</label><input type="number" value={q.passingYear} onChange={e => handleQualChange(index, "passingYear", e.target.value)} placeholder="2020" className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none" /></div>
                    <div className="col-span-1 text-right"><button type="button" onClick={() => removeQual(index)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </div>
                ))}
              </div>
            </div>
            {/* NID */}
            <div className="p-6 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">NID / Birth Certificate Document</h4>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={e => handleUpload(e, "nid")} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer" />
                  {uploadingNID && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</p>}
                  <p className="text-xs text-gray-400 mt-1">Upload only if replacing existing document.</p>
                </div>
                {nidUrl && (form.gender !== "female" || currentUser?.permissions?.includes("*") || currentUser?.role === "super-admin") && (
                  <div className="w-40 h-24 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 relative group shadow-sm">
                    <img src={nidUrl} alt="NID" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <a href={nidUrl} target="_blank" rel="noopener noreferrer" className="text-white text-xs font-semibold underline">View</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-3 p-6">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={loading || uploadingAvatar || uploadingNID} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Teacher ID Card Modal (Admin View & Approval) ─────────────── */
function TeacherIDCardModal({
  teacher,
  onClose,
  onStatusChange,
}: {
  teacher: any;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [downloading, setDownloading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(teacher?.idCardStatus || "pending");
  const [statusMsg, setStatusMsg] = useState("");

  if (!teacher) return null;

  const handleUpdateStatus = async (newStatus: "approved" | "pending" | "rejected") => {
    setUpdatingStatus(true);
    setStatusMsg("");
    try {
      const res = await fetch(`/api/teachers/${teacher._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCardStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentStatus(newStatus);
        teacher.idCardStatus = newStatus;
        setStatusMsg(`ID Card marked as ${newStatus.toUpperCase()} successfully!`);
        onStatusChange();
      } else {
        alert(data.message || "Failed to update ID card status.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Could not update ID card status.");
    } finally {
      setUpdatingStatus(false);
      setTimeout(() => setStatusMsg(""), 3500);
    }
  };

  const handleDownload = async (side: "front" | "back") => {
    const elId = side === "front" ? `admin-id-card-${teacher._id}` : `admin-id-card-back-${teacher._id}`;
    setDownloading(true);
    try {
      await downloadIDCardElement(elId, teacher.teacherId || "Teacher", side);
    } catch (err) {
      console.error(err);
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl p-6 sm:p-8 text-white relative flex flex-col my-6 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Digital Identity Card
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                currentStatus === "approved"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                  : currentStatus === "rejected"
                  ? "bg-red-500/20 text-red-300 border-red-400/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-400/40"
              }`}>
                {currentStatus === "approved" ? "● Approved" : currentStatus === "rejected" ? "✕ Rejected" : "⏳ Pending Approval"}
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">{teacher.fullName}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Teacher ID: {teacher.teacherId || "Not assigned"} · Designation: {teacher.designation}</p>
          </div>

          {/* Quick Approval Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleUpdateStatus("approved")}
              disabled={updatingStatus || currentStatus === "approved"}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve ID Card
            </button>
            <button
              onClick={() => handleUpdateStatus("pending")}
              disabled={updatingStatus || currentStatus === "pending"}
              className="px-3 py-2 bg-amber-600/80 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
            >
              Set Pending
            </button>
            <button
              onClick={() => handleUpdateStatus("rejected")}
              disabled={updatingStatus || currentStatus === "rejected"}
              className="px-3 py-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
            >
              Reject
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="my-4 p-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-xl text-xs font-bold text-center">
            {statusMsg}
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6">
          {/* Controls & Details */}
          <div className="space-y-5">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-200">ID Card Data Verification</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Full Name</p>
                  <p className="font-semibold text-white truncate">{teacher.fullName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Designation</p>
                  <p className="font-semibold text-white truncate">{teacher.designation}</p>
                </div>
                <div>
                  <p className="text-slate-400">Teacher ID</p>
                  <p className="font-semibold text-white font-mono">{teacher.teacherId || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Blood Group</p>
                  <p className="font-semibold text-white">{teacher.bloodGroup || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Emergency Phone</p>
                  <p className="font-semibold text-white font-mono">{teacher.emergencyContactNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Card Status in Teacher Portal</p>
                  <p className={`font-bold ${currentStatus === "approved" ? "text-emerald-400" : currentStatus === "rejected" ? "text-red-400" : "text-amber-400"}`}>
                    {currentStatus === "approved" ? "Unlocked (Visible & Downloadable)" : "Locked (Hidden from Teacher)"}
                  </p>
                </div>
              </div>
            </div>

            {/* Side Switcher & Download buttons */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Preview & Export</p>
              <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15 w-fit">
                <button
                  type="button"
                  onClick={() => setCardSide("front")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    cardSide === "front" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Front Side
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide("back")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    cardSide === "back" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Back Side
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={() => handleDownload("front")}
                  disabled={downloading}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-60"
                >
                  {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download Front (PNG)
                </button>
                <button
                  onClick={() => handleDownload("back")}
                  disabled={downloading}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" /> Download Back (PNG)
                </button>
              </div>
            </div>
          </div>

          {/* ID Card Display Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-3xl border border-slate-800 shadow-inner">
            <div className="transform scale-[0.82] origin-center shadow-2xl rounded-3xl overflow-hidden transition-all hover:scale-[0.85]">
              {cardSide === "front" ? (
                <OfficialIDCard profile={teacher} cardId={`admin-id-card-${teacher._id}`} />
              ) : (
                <OfficialIDCardBack cardId={`admin-id-card-back-${teacher._id}`} />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Viewing {cardSide === "front" ? "Front Side" : "Back Side"} · Official Digital Card
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── View Teacher Modal ─────────────── */
function ViewTeacherModal({ teacherId, onClose, currentUser, onOpenIDCard }: { teacherId: string | null; onClose: () => void; currentUser?: any; onOpenIDCard?: (teacher: any) => void }) {
  const [teacher, setTeacher] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!teacherId) return;
    setFetching(true); setError("");
    fetch(`/api/teachers/${teacherId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setTeacher(data.teacher); else setError(data.message || "Failed to load"); })
      .catch(() => setError("Network error"))
      .finally(() => setFetching(false));
  }, [teacherId]);

  if (!teacherId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Teacher Details</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        {fetching ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : error ? (
          <div className="p-6 flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>
        ) : teacher && (
          <div className="overflow-y-auto max-h-[75vh]">
            {/* Profile Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {teacher.avatar && (teacher.gender !== "female" || currentUser?.permissions?.includes("*") || currentUser?.role === "super-admin")
                  ? <img src={teacher.avatar} alt={teacher.fullName} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />
                  : <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">{teacher.fullName?.charAt(0)?.toUpperCase()}</div>
                }
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{teacher.fullName}</h4>
                  <p className="text-sm text-gray-500">{teacher.designation}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{teacher.email}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_COLORS[teacher.status] || "bg-gray-100 text-gray-600"}`}>{teacher.status}</span>
                </div>
              </div>
            </div>

            {/* Digital ID Card Status & Quick Access Banner */}
            <div className="p-4 mx-6 my-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Digital Teacher ID Card</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    teacher.idCardStatus === "approved"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : teacher.idCardStatus === "rejected"
                      ? "bg-red-500/20 text-red-300 border-red-400/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-400/30"
                  }`}>
                    {teacher.idCardStatus === "approved" ? "● Approved" : teacher.idCardStatus === "rejected" ? "✕ Rejected" : "⏳ Pending Approval"}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {teacher.idCardStatus === "approved"
                    ? "ID Card is verified and visible in the teacher's portal settings."
                    : "ID Card is currently locked from the teacher's view until approved."}
                </p>
              </div>

              {onOpenIDCard && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenIDCard(teacher); }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" /> View & Approve ID Card
                </button>
              )}
            </div>

            {/* Personal Info */}
            <div className="p-6 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Personal Information</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {([
                  ["Teacher ID", teacher.teacherId],
                  ["Phone", teacher.phone || "—"],
                  ["Emergency Contact", teacher.emergencyContactNumber || "—"],
                  ["Gender", teacher.gender ? teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1) : "—"],
                  ["Blood Group", teacher.bloodGroup || "—"],
                  ["Joined", teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString() : new Date(teacher.createdAt).toLocaleDateString()],
                  ["Rating", teacher.rating ? `${teacher.rating.toFixed(1)} / 5` : "N/A"],
                  ["Salary", teacher.salary > 0 ? `${teacher.salaryType === "per-student-percentage" ? `${teacher.salary}%` : `${teacher.salary.toLocaleString()}`} / ${teacher.salaryType?.replace(/-/g, " ")}` : "—"],
                  ["Created Date", formatCustomDateTime(teacher.createdAt)],
                  ["Updated Date", formatCustomDateTime(teacher.updatedAt)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}><p className="text-xs text-gray-400 mb-0.5">{label}</p><p className="text-sm font-medium text-gray-900">{value}</p></div>
                ))}
              </div>
            </div>
            {/* Address */}
            <div className="p-6 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Address</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-400 mb-0.5">Present Address</p><p className="text-sm font-medium text-gray-900">{teacher.presentAddress || "—"}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">Permanent Address</p><p className="text-sm font-medium text-gray-900">{teacher.permanentAddress || "—"}</p></div>
              </div>
            </div>
            {/* Payment Information */}
            <div className="p-6 border-b border-gray-100 bg-emerald-50/20">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Banknote className="w-4 h-4" /> Payment Information
              </p>
              {teacher.paymentInfo ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Method</p>
                    <p className="text-sm font-semibold text-gray-900">{teacher.paymentInfo.method || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Account Name</p>
                    <p className="text-sm font-semibold text-gray-900">{teacher.paymentInfo.accountName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Account Number</p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">{teacher.paymentInfo.accountNumber || "—"}</p>
                  </div>
                  {teacher.paymentInfo.bankName && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Bank Name</p>
                      <p className="text-sm font-semibold text-gray-900">{teacher.paymentInfo.bankName}</p>
                    </div>
                  )}
                  {teacher.paymentInfo.routingNumber && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400 mb-0.5">Routing / Branch Details</p>
                      <p className="text-sm font-semibold text-gray-900">{teacher.paymentInfo.routingNumber}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No payment details submitted yet.</p>
              )}
            </div>
            {/* Bio */}
            {teacher.bio && (
              <div className="p-6 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bio</p>
                <p className="text-sm text-gray-700 leading-relaxed">{teacher.bio}</p>
              </div>
            )}
            {/* Qualifications */}
            {teacher.qualifications && teacher.qualifications.length > 0 && (
              <div className="p-6 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Qualifications</p>
                <div className="space-y-2">
                  {teacher.qualifications.map((q: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <GraduationCap className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{q.degree}</p>
                        <p className="text-xs text-gray-500">{q.institute}{q.passingYear ? ` · ${q.passingYear}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Courses */}
            {teacher.courses && teacher.courses.length > 0 && (
              <div className="p-6 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Courses ({teacher.courses.length})</p>
                <div className="space-y-2">
                  {teacher.courses.map((c: any) => (
                    <div key={c._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-gray-800">{c.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* NID */}
            {teacher.nidOrBirthCertificatePicture && (teacher.gender !== "female" || currentUser?.permissions?.includes("*") || currentUser?.role === "super-admin") && (
              <div className="p-6 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Verification Document</p>
                <a href={teacher.nidOrBirthCertificatePicture} target="_blank" rel="noopener noreferrer">
                  <img src={teacher.nidOrBirthCertificatePicture} alt="NID/BC" className="h-28 rounded-xl object-cover border border-gray-200 hover:opacity-90 transition-opacity" />
                </a>
              </div>
            )}
          </div>
        )}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Password Change Modal ─────────────── */
function PasswordModal({ teacher, onClose }: any) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  if (!teacher) return null;
  const handleSubmit = async (e: any) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers/${teacher._id}/password`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); setLoading(false); return; }
      setSuccess("Password changed successfully!"); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => onClose(), 1500);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div><h3 className="text-lg font-bold text-gray-900">Change Password</h3><p className="text-xs text-gray-500 mt-0.5">{teacher.fullName} &middot; {teacher.email}</p></div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        {success && <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm"><CheckCircle className="w-4 h-4" /> {success}</div>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password <span className="text-red-500">*</span></label><input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min 6 characters" minLength={6} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label><input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Re-enter password" minLength={6} /></div>
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

/* ─────────────── Payment Info Modal ─────────────── */
function PaymentInfoModal({ teacher, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    method: "Bank Transfer", accountName: "", accountNumber: "", bankName: "", routingNumber: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (teacher && teacher.paymentInfo) {
      setForm({
        method: teacher.paymentInfo.method || "Bank Transfer",
        accountName: teacher.paymentInfo.accountName || "",
        accountNumber: teacher.paymentInfo.accountNumber || "",
        bankName: teacher.paymentInfo.bankName || "",
        routingNumber: teacher.paymentInfo.routingNumber || ""
      });
    } else {
      setForm({ method: "Bank Transfer", accountName: "", accountNumber: "", bankName: "", routingNumber: "" });
    }
  }, [teacher]);

  if (!teacher) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      // Just send the fields that need updating
      const payload = { paymentInfo: form };
      const res = await fetch(`/api/teachers/${teacher._id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Failed to update"); setLoading(false); return; }
      setSuccess("Payment info saved successfully!");
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const inp = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div><h3 className="text-lg font-bold text-gray-900">Payment Information</h3><p className="text-xs text-gray-500 mt-0.5">{teacher.fullName}</p></div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        {success && <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm"><CheckCircle className="w-4 h-4" /> {success}</div>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))} className={inp}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money (bKash/Nagad)</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label><input type="text" value={form.accountName} onChange={e => setForm(p => ({ ...p, accountName: e.target.value }))} className={inp} placeholder="Account Holder Name" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label><input type="text" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} className={inp} placeholder="Account or Phone Number" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank / Provider Name</label><input type="text" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} className={inp} placeholder="e.g. Dutch Bangla Bank" /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Routing Number / Branch</label><input type="text" value={form.routingNumber} onChange={e => setForm(p => ({ ...p, routingNumber: e.target.value }))} className={inp} placeholder="Optional routing or branch info" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading || !!success} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? "Saving..." : "Save Payment Info"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── Teacher Students List Modal ─────────────── */
function TeacherStudentsListModal({ teacher, onClose }: { teacher: any; onClose: () => void }) {
  if (!teacher) return null;

  const students = teacher.studentsList || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Students List</h3>
            <p className="text-xs text-gray-500 mt-0.5">Teacher: {teacher.fullName} ({teacher.teacherId}) &middot; {students.length} students</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No students assigned to this teacher yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-gray-50/30">
              {students.map((student: any, idx: number) => (
                <div key={idx} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{student.fullName}</h4>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {student.studentId || "No ID"}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{student.phone || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Main Teachers Page ─────────────── */
export default function TeachersPage() {
  const { can } = usePermissions();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState("");
  const [category, setCategory] = useState("");
  const [idCardStatus, setIdCardStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<any>(null);
  const [editTeacherId, setEditTeacherId] = useState<string | null>(null);
  const [viewTeacherId, setViewTeacherId] = useState<string | null>(null);
  const [idCardTeacher, setIdCardTeacher] = useState<any>(null);
  const [passwordTeacher, setPasswordTeacher] = useState<any>(null);
  const [paymentTeacher, setPaymentTeacher] = useState<any>(null);
  const [studentListTeacher, setStudentListTeacher] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data && data.success) setCurrentUser(data.user);
    }).catch(() => {});
  }, []);

  const [categories, setCategories] = useState<any[]>([]);
  useEffect(() => { fetch("/api/teachers/category").then(r => r.json()).then(data => { if (data.success) setCategories(data.categories || []); }); }, []);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const LIMIT = 10;

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node))
        setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch ALL teachers matching filters for export (no pagination)
  const fetchAllForExport = async (): Promise<Record<string, any>[]> => {
    const params = new URLSearchParams({ page: "1", limit: "100000", search, status, version, category, idCardStatus });
    const res = await fetch(`/api/teachers?${params}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to fetch");
    return (data.teachers || []).map((t: any) => ({
      teacherId: t.teacherId || "",
      fullName: t.fullName || "",
      email: t.email || "",
      phone: t.phone || "",
      designation: t.designation || "",
      version: t.version?.join(", ") || "",
      gender: t.gender || "",
      status: t.status || "",
      idCardStatus: t.idCardStatus || "pending",
      salary: t.salary ?? "",
      salaryType: t.salaryType || "",
      bloodGroup: t.bloodGroup || "",
      rating: t.rating ?? "",
      presentAddress: t.presentAddress || "",
      permanentAddress: t.permanentAddress || "",
      bio: t.bio || "",
      createdAt: formatCustomDateTime(t.createdAt),
      updatedAt: formatCustomDateTime(t.updatedAt),
    }));
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setShowExportMenu(false);
    setExportLoading(true);
    try {
      const rows = await fetchAllForExport();
      if (rows.length === 0) { alert("No teachers to export."); return; }
      const filename = `teachers_export_${new Date().toISOString().split("T")[0]}`;

      if (format === "csv") {
        const csv = toCSV(rows, EXPORT_COLS);
        downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
      } else if (format === "xlsx") {
        const XLSX = await loadSheetJS();
        const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLS });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Teachers");
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        await exportPDF(rows, filename);
      }
    } catch (err) {
      console.error(err);
      alert("Export failed. Please try again.");
    } finally { setExportLoading(false); }
  };

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), search, status, version, category, idCardStatus });
      const res = await fetch(`/api/teachers?${params}`);
      const data = await res.json();
      if (data.success) { setTeachers(data.teachers); setTotal(data.total); setTotalPages(data.totalPages); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page, search, status, version, category, idCardStatus]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try { await fetch(`/api/teachers/${id}`, { method: "DELETE" }); fetchTeachers(); }
    catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Teacher Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage teaching staff, salaries, ID card approvals, and course assignments.<span className="ml-2 font-medium text-gray-700">{total.toLocaleString()} total</span></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors shadow-sm"
            >
              {exportLoading
                ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                : <Download className="w-4 h-4 text-gray-600" />}
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
                    <p className="text-[11px] text-gray-400">Formatted printable report</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Add Teacher */}
          {can("teacher-management", "create") && (
            <Link href="/teachers/add" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Add Teacher
            </Link>
          )}
        </div>
      </div>

      <ReadOnlyNotice module="teacher-management" featureName="Teacher Management" />

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 bg-gray-50/50 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search by name, ID, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          
          <select value={version} onChange={e => { setVersion(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-32">
            <option value="">All Versions</option>
            <option value="Bangla">Bangla</option>
            <option value="English">English</option>
            <option value="Arabic">Arabic</option>
          </select>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-40">
            <option value="">All Designations</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-36">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on-leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
          <select value={idCardStatus} onChange={e => { setIdCardStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-40 bg-indigo-50/40 text-indigo-950 font-medium">
            <option value="">All ID Cards</option>
            <option value="approved">Approved Cards</option>
            <option value="pending">Pending Approval</option>
            <option value="rejected">Rejected Cards</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-center whitespace-nowrap">Sl</th>
                <th className="px-6 py-4">Teacher</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Version</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Salary</th>
                <th className="px-6 py-4">Students</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">ID Card</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(10)].map((_, j) => (<td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>))}</tr>
              )) : teachers.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-gray-500">
                  <GraduationCap className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No teachers found</p>
                </td></tr>
              ) : teachers.map((t, idx) => (
                <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 text-center text-gray-400 font-medium text-xs whitespace-nowrap">
                    {((page - 1) * LIMIT) + idx + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {t.avatar && (t.gender !== "female" || currentUser?.permissions?.includes("*") || currentUser?.role === "super-admin")
                        ? <img src={t.avatar} alt={t.fullName} className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                        : <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold flex-shrink-0">{t.fullName?.charAt(0)?.toUpperCase()}</div>
                      }
                      <div>
                        <p className="font-medium text-gray-900">{t.fullName}</p>
                        <p className="text-xs text-gray-400">{t.email}</p>
                        <div className="text-[10px] text-gray-400 mt-1 font-mono space-y-0.5">
                          <p><span className="text-gray-500 font-semibold">Created:</span> {formatCustomDateTime(t.createdAt)}</p>
                          <p><span className="text-gray-500 font-semibold">ID:</span> {t.teacherId}</p>
                        </div>
                      </div>
                    </div>
                  </td>
              
                  <td className="px-6 py-4">
                    <p className="text-gray-900 font-medium">{t.designation || "—"}</p>
                    {t.category && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 mt-1 border border-blue-100">
                        {t.category.name || t.category}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {t.version?.length ? (
                      <div className="flex gap-1 flex-wrap">
                        {t.version.map((v: string) => (
                          <span key={v} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium border border-gray-200">
                            {v}
                          </span>
                        ))}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span>{t.rating ? t.rating.toFixed(1) : "N/A"}</span></div>
                  </td>
                  <td className="px-6 py-4">
                    {t.salary > 0 ? `${t.salaryType === "per-student-percentage" ? `${t.salary}%` : `${t.salary.toLocaleString()}`} / ${t.salaryType?.replace(/-/g, " ")}` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setStudentListTeacher(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                      title="View student list"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{t.studentCount || 0}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600"}`}>{t.status}</span>
                  </td>

                  {/* ID Card Status Badge */}
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setIdCardTeacher(t)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105 shadow-sm ${
                        t.idCardStatus === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : t.idCardStatus === "rejected"
                          ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      }`}
                      title="Click to view & approve ID Card"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="capitalize">{t.idCardStatus || "pending"}</span>
                    </button>
                  </td>
                 
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setIdCardTeacher(t)} title="Digital ID Card & Approval" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><CreditCard className="w-4 h-4" /></button>
                      <button onClick={() => setViewTeacherId(t._id)} title="View Details" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Eye className="w-4 h-4" /></button>
                      {can("teacher-management", "update") && (
                        <button onClick={() => setEditTeacherId(t._id)} title="Edit Teacher" className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                      )}
                      {can("teacher-management", "update") && (
                        <button onClick={() => setPaymentTeacher(t)} title="Payment Info" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Banknote className="w-4 h-4" /></button>
                      )}
                      {can("teacher-management", "update") && (
                        <button onClick={() => setPasswordTeacher(t)} title="Change Password" className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"><KeyRound className="w-4 h-4" /></button>
                      )}
                      {can("teacher-management", "delete") && (
                        <button
                          onClick={() => handleDelete(t._id, t.fullName)}
                          disabled={deleting === t._id}
                          title="Delete Teacher"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                        >
                          {deleting === t._id ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <div>Showing <span className="font-medium text-gray-900">{total === 0 ? 0 : ((page - 1) * LIMIT) + 1}</span> to <span className="font-medium text-gray-900">{Math.min(page * LIMIT, total)}</span> of <span className="font-medium text-gray-900">{total}</span></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Previous</button>
            <span className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium">{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <EditTeacherModal teacherId={editTeacherId} onClose={() => setEditTeacherId(null)} onSuccess={fetchTeachers} currentUser={currentUser} />
      <ViewTeacherModal teacherId={viewTeacherId} onClose={() => setViewTeacherId(null)} currentUser={currentUser} onOpenIDCard={(t) => setIdCardTeacher(t)} />
      <TeacherIDCardModal teacher={idCardTeacher} onClose={() => setIdCardTeacher(null)} onStatusChange={fetchTeachers} />
      <PasswordModal teacher={passwordTeacher} onClose={() => setPasswordTeacher(null)} />
      <PaymentInfoModal teacher={paymentTeacher} onClose={() => setPaymentTeacher(null)} onSuccess={fetchTeachers} />
      <TeacherStudentsListModal teacher={studentListTeacher} onClose={() => setStudentListTeacher(null)} />
    </div>
  );
}
