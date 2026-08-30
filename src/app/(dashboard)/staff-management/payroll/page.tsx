"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Banknote, RefreshCw, AlertCircle, CheckCircle2,
  Clock, ChevronDown, Eye, X, Search, TrendingUp, DollarSign,
  FileText, FileSpreadsheet, Download, Plus, Edit, Trash2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const fmt = (n: number) => `\u09F3${(n || 0).toLocaleString()}`;
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(amount);

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }
  return opts;
}

const statusStyle: Record<string, { pill: string; icon: any }> = {
  paid:       { pill: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  pending:    { pill: "bg-amber-100 text-amber-700",     icon: Clock        },
  processing: { pill: "bg-sky-100 text-sky-700",         icon: Clock        },
  "on-hold":  { pill: "bg-red-100 text-red-600",         icon: Clock        },
};

export default function AdminPayrollPage() {
  const monthOpts = getMonthOptions();
  const [payrolls, setPayrolls]   = useState<any[]>([]);
  const [totals, setTotals]       = useState<any>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [month, setMonth]         = useState(monthOpts[0].value);
  const [statusFilter, setStatus] = useState("");
  const [search, setSearch]       = useState("");
  const [viewSlip, setViewSlip]   = useState<any | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // CRUD States
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    staff: "", month: monthOpts[0].value, basicSalary: "", 
    performanceBonus: "0", totalDeductions: "0", status: "pending"
  });

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff?limit=1000");
      const data = await res.json();
      if (data.success) setStaffList(data.staff || []);
    } catch {}
  }, []);

  const fetchPayroll = useCallback(async () => {
    setLoading(true); setError(""); setSuccessMsg("");
    try {
      const params = new URLSearchParams({ month, limit: "500" });
      if (statusFilter) params.set("status", statusFilter);
      const res  = await fetch(`/api/staff/payroll?${params}`);
      const data = await res.json();
      if (data.success) {
        setPayrolls(data.payrolls || []);
        setTotals(data.totals || {});
      } else setError(data.message);
    } catch { setError("Failed to load payroll."); }
    finally { setLoading(false); }
  }, [month, statusFilter]);

  useEffect(() => { 
    fetchPayroll(); 
    fetchStaff();
  }, [fetchPayroll, fetchStaff]);

  const handleMarkPaid = async (id: string) => {
    setMarkingPaid(id);
    try {
      const res  = await fetch(`/api/staff/payroll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paymentMethod: "bank-transfer" }),
      });
      const data = await res.json();
      if (data.success) {
        setPayrolls(prev => prev.map(p => p._id === id ? { ...p, status: "paid" } : p));
        setSuccessMsg("Marked as paid.");
      } else {
        setError(data.message);
      }
    } catch { setError("Failed to mark as paid."); }
    finally { setMarkingPaid(null); }
  };

  const handleCreateClick = () => {
    setForm({ staff: staffList[0]?._id || "", month: month, basicSalary: "", performanceBonus: "0", totalDeductions: "0", status: "pending" });
    setModalType("create");
    setSelectedPayroll(null);
    setShowModal(true);
  };

  const handleStaffChange = (staffId: string) => {
    const s = staffList.find(x => x._id === staffId);
    setForm({ ...form, staff: staffId, basicSalary: s?.basicSalary?.toString() || "" });
  };

  const handleEditClick = (p: any) => {
    setForm({
      staff: p.staff?._id || p.staff,
      month: p.month || month,
      basicSalary: p.basicSalary?.toString() || "",
      performanceBonus: p.performanceBonus?.toString() || "0",
      totalDeductions: p.totalDeductions?.toString() || "0",
      status: p.status || "pending"
    });
    setModalType("edit");
    setSelectedPayroll(p);
    setShowModal(true);
  };

  const handleDeleteClick = (p: any) => {
    setSelectedPayroll(p);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(""); setSuccessMsg("");
    try {
      const isEdit = modalType === "edit";
      const url = isEdit ? `/api/staff/payroll/${selectedPayroll._id}` : "/api/staff/payroll";
      const method = isEdit ? "PUT" : "POST";
  
      const payload = {
        ...form,
        basicSalary: Number(form.basicSalary),
        performanceBonus: Number(form.performanceBonus),
        totalDeductions: Number(form.totalDeductions),
      };
  
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isEdit ? "Payroll updated successfully!" : "Payroll created successfully!");
        setShowModal(false);
        fetchPayroll();
      } else {
        alert(data.message || "Failed to save payroll.");
      }
    } catch {
      alert("Network error.");
    } finally { setSubmitting(false); }
  };
  
  const confirmDelete = async () => {
    if (!selectedPayroll) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/payroll/${selectedPayroll._id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setShowDeleteModal(false);
        setSelectedPayroll(null);
        setSuccessMsg("Payroll deleted successfully!");
        fetchPayroll();
      } else alert(data.message);
    } catch { alert("Network error."); }
    finally { setSubmitting(false); }
  };

  const filtered = payrolls.filter(p =>
    !search ||
    p.staff?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    p.staff?.department?.toLowerCase().includes(search.toLowerCase())
  );

  const paidCount    = payrolls.filter(p => p.status === "paid").length;
  const pendingCount = payrolls.filter(p => p.status === "pending").length;

  const formatMonthLabel = (m: string) => {
    if (!m || m === "all") return "All Months";
    try {
      const [year, month] = m.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return m;
    }
  };

  const exportPDF = async () => {
    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const formattedMonth = formatMonthLabel(month);

    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = "/fajr-logo.png";
      await new Promise((resolve) => {
        if (!logoImg) return resolve(false);
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
        setTimeout(resolve, 1500);
      });
    } catch { logoImg = null; }

    const primaryNavy: [number, number, number] = [10, 25, 49];
    const accentBlue: [number, number, number] = [37, 99, 235];
    const textDark: [number, number, number] = [30, 41, 59];

    const drawHeader = () => {
      doc.setFillColor(...primaryNavy);
      doc.rect(0, 0, pageWidth, 4, "F");

      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        try { doc.addImage(logoImg, "PNG", 14, 8, 42, 14); } 
        catch { doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...primaryNavy); doc.text("FAJR ACADEMY", 14, 17); }
      } else {
        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...primaryNavy); doc.text("FAJR ACADEMY", 14, 17);
      }

      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text("Staff Payroll Details Report", 14, 25);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...primaryNavy); doc.text("STAFF PAYROLL REPORT", pageWidth - 14, 14, { align: "right" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...accentBlue); doc.text(`Month: ${formattedMonth}`, pageWidth - 14, 20, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - 14, 25, { align: "right" });
      doc.setDrawColor(...primaryNavy); doc.setLineWidth(0.6); doc.line(14, 28, pageWidth - 14, 28);
    };

    const tableColumn = ["Sl", "Staff ID", "Name", "Department", "Bank Name", "Branch", "Account No.", "Status", "Net Salary"];
    const tableRows = filtered.map((p, idx) => [
        idx + 1, p.staff?.staffId || "—", p.staff?.fullName || "—", p.staff?.department?.replace(/-/g," ") || "—",
        p.staff?.paymentInfo?.bankName || "—", p.staff?.paymentInfo?.branchName || "—",
        p.staff?.paymentInfo?.accountNumber || "—", (p.status || "pending").toUpperCase(), formatCurrency(p.netSalary)
    ]);

    const grandTotal = filtered.reduce((sum, p) => sum + (p.netSalary || 0), 0);

    const footerRow = [
      { content: "TOTAL", colSpan: 2, styles: { halign: 'center' as const } },
      { content: `Total Staff: ${filtered.length}`, colSpan: 6, styles: { halign: 'center' as const } },
      { content: formatCurrency(grandTotal), styles: { halign: 'right' as const } }
    ];

    autoTable(doc, {
      head: [tableColumn], body: tableRows, foot: [footerRow],
      startY: 32, margin: { top: 32, bottom: 42, left: 14, right: 14 }, theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, halign: 'center', valign: 'middle', textColor: textDark },
      headStyles: { fillColor: primaryNavy, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      footStyles: { fillColor: [241, 245, 249], textColor: primaryNavy, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        2: { halign: 'left', fontStyle: 'bold' }, 3: { halign: 'left' }, 4: { halign: 'left' },
        5: { halign: 'left' }, 6: { halign: 'center', fontStyle: 'bold' }, 7: { halign: 'center', fontStyle: 'bold' }, 8: { halign: 'right', fontStyle: 'bold' }
      },
      didDrawPage: (data) => {
        drawHeader();
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        doc.setFillColor(248, 250, 252); doc.rect(14, pageHeight - 14, pageWidth - 28, 9, "F");
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.rect(14, pageHeight - 14, pageWidth - 28, 9, "S");
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...primaryNavy); doc.text(`Fajr Academy | Month: ${formattedMonth}`, 18, pageHeight - 8);
        doc.setFont("helvetica", "bold"); doc.setTextColor(...accentBlue); doc.text(`Total Payout Amount: ${formatCurrency(grandTotal)}`, pageWidth / 2, pageHeight - 8, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139); doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - 18, pageHeight - 8, { align: "right" });
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 140;
    let sigY = finalY + 16;
    if (sigY + 32 > pageHeight - 15) { doc.addPage(); sigY = 38; }

    const ceoX = pageWidth - 90;
    doc.setDrawColor(...primaryNavy); doc.setLineWidth(0.8); doc.line(ceoX, sigY + 12, ceoX + 65, sigY + 12);
    doc.setFont("times", "italic"); doc.setFontSize(14); doc.setTextColor(10, 25, 49); doc.text("Fajr Academy CEO", ceoX + 8, sigY + 9);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...primaryNavy); doc.text("Chief Executive Officer (CEO)", ceoX + 32.5, sigY + 17, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text("Fajr Academy", ceoX + 32.5, sigY + 22, { align: "center" });

    const sealX = ceoX - 35;
    doc.setDrawColor(...accentBlue); doc.setLineWidth(0.6); doc.circle(sealX + 12, sigY + 13, 10); doc.circle(sealX + 12, sigY + 13, 8);
    doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...accentBlue); doc.text("APPROVED", sealX + 12, sigY + 11.5, { align: "center" }); doc.text("CEO SIGN", sealX + 12, sigY + 15, { align: "center" });

    const accX = 20;
    doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.5); doc.line(accX, sigY + 12, accX + 55, sigY + 12);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...primaryNavy); doc.text("Accounts Officer", accX + 27.5, sigY + 17, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text("Prepared & Verified", accX + 27.5, sigY + 22, { align: "center" });

    doc.save(`Staff_Payroll_Report_${month}.pdf`);
  };

  const exportExcel = (isCSV = false) => {
    const exportData = filtered.map((p, idx) => ({
      "Sl No": idx + 1, "Staff ID": p.staff?.staffId || "—", "Name": p.staff?.fullName || "—",
      "Department": p.staff?.department?.replace(/-/g," ") || "—", "Bank Name": p.staff?.paymentInfo?.bankName || "—",
      "Branch Name": p.staff?.paymentInfo?.branchName || "—", "Routing No": p.staff?.paymentInfo?.routingNumber ? `'${p.staff.paymentInfo.routingNumber}` : "—",
      "Account No": p.staff?.paymentInfo?.accountNumber ? `'${p.staff.paymentInfo.accountNumber}` : "—", "Status": (p.status || "pending").toUpperCase(), "Net Salary": p.netSalary
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll Data");
    if (isCSV) XLSX.writeFile(workbook, `Staff_Payroll_Report_${month}.csv`, { bookType: 'csv' });
    else XLSX.writeFile(workbook, `Staff_Payroll_Report_${month}.xlsx`, { bookType: 'xlsx' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage monthly salary disbursements for all staff</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchPayroll} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="pl-4 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none">
              {monthOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={handleCreateClick} className="px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Payroll
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
          <button onClick={() => setSuccessMsg("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Aggregate cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Net Payroll",  value: fmt(totals.totalNet  || 0), gradient: "bg-gradient-to-br from-blue-500 to-blue-600",     icon: Banknote     },
          { label: "Total Bonus",        value: fmt(totals.totalBonus|| 0), gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",   icon: TrendingUp   },
          { label: "Total Deductions",   value: fmt(totals.totalDeductions||0), gradient: "bg-gradient-to-br from-red-500 to-rose-600", icon: DollarSign   },
          { label: `Paid / Pending`,     value: `${paidCount} / ${pendingCount}`, gradient: "bg-gradient-to-br from-violet-500 to-purple-600", icon: CheckCircle2 },
        ].map(({ label, value, gradient, icon: Icon }) => (
          <div key={label} className={`rounded-2xl p-5 ${gradient} text-white shadow-sm`}>
            <div className="bg-white/20 w-9 h-9 rounded-xl flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl font-bold">{loading ? "—" : value}</p>
            <p className="text-xs text-white/75 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters and Exports */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:min-w-[250px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name or department..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
          </div>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px]">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>
        
        {/* Export Buttons */}
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
            <button 
              onClick={exportPDF} 
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={() => exportExcel(false)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button 
              onClick={() => exportExcel(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">
            Payroll — {monthOpts.find(o=>o.value===month)?.label}
            <span className="ml-2 text-gray-400 font-normal">({filtered.length})</span>
          </h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No payroll records for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="px-5 py-3 text-left font-semibold">Staff</th>
                  <th className="px-5 py-3 text-left font-semibold">Dept</th>
                  <th className="px-5 py-3 text-right font-semibold">Basic</th>
                  <th className="px-5 py-3 text-right font-semibold">Bonus</th>
                  <th className="px-5 py-3 text-right font-semibold">Deductions</th>
                  <th className="px-5 py-3 text-right font-semibold">Net</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const s = statusStyle[p.status] || statusStyle.pending;
                  const Icon = s.icon;
                  const isLoading = markingPaid === p._id;
                  return (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{p.staff?.fullName || "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 capitalize">{p.staff?.department?.replace(/-/g," ")}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-700">{fmt(p.basicSalary)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-emerald-600">+{fmt(p.performanceBonus)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-red-500">-{fmt(p.totalDeductions)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-sm font-bold text-gray-900">{fmt(p.netSalary)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                          <Icon className="w-3 h-3" />{p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewSlip(p)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="View Slip">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleEditClick(p)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors" title="Edit">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteClick(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {p.status === "pending" && (
                            <button onClick={() => handleMarkPaid(p._id)} disabled={isLoading}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-60 ml-2">
                              {isLoading ? "..." : "Mark Paid"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-100 font-bold text-sm">
                  <td className="px-5 py-3 text-gray-700" colSpan={2}>Totals ({filtered.length} staff)</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-700">{fmt(filtered.reduce((a,p)=>a+p.basicSalary,0))}</td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-600">+{fmt(filtered.reduce((a,p)=>a+(p.performanceBonus||0),0))}</td>
                  <td className="px-5 py-3 text-right font-mono text-red-500">-{fmt(filtered.reduce((a,p)=>a+(p.totalDeductions||0),0))}</td>
                  <td className="px-5 py-3 text-right font-mono text-blue-700">{fmt(filtered.reduce((a,p)=>a+p.netSalary,0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Pay slip modal */}
      {viewSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Pay Slip — {monthOpts.find(o=>o.value===month)?.label}</h3>
              <button onClick={() => setViewSlip(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="font-bold text-gray-900">{viewSlip.staff?.fullName || "—"}</p>
                <p className="text-xs text-gray-500 capitalize">{viewSlip.staff?.designation}</p>
                <p className="text-xs text-blue-600 mt-1">{viewSlip.staff?.department?.replace(/-/g," ")}</p>
              </div>
              {[
                ["Basic Salary",        fmt(viewSlip.basicSalary),                "text-gray-700"   ],
                ["HRA",                 fmt(viewSlip.houseRentAllowance || 0),    "text-gray-700"   ],
                ["Medical Allowance",   fmt(viewSlip.medicalAllowance   || 0),    "text-gray-700"   ],
                ["Transport Allowance", fmt(viewSlip.transportAllowance || 0),    "text-gray-700"   ],
                ["Performance Bonus",   `+${fmt(viewSlip.performanceBonus||0)}`,  "text-emerald-600"],
                ["Absent Deduction",    `-${fmt(viewSlip.absentDeduction||0)}`,   "text-red-500"    ],
                ["Tax Deduction",       `-${fmt(viewSlip.taxDeduction   ||0)}`,   "text-red-500"    ],
                ["Total Deductions",    `-${fmt(viewSlip.totalDeductions||0)}`,   "text-red-500"    ],
              ].map(([label, value, cls]) => (
                <div key={label} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-semibold ${cls}`}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center font-bold bg-gradient-to-r from-blue-600 to-indigo-600 -mx-5 px-5 py-3 rounded-b-2xl text-white mt-2">
                <span>Net Salary</span>
                <span>{fmt(viewSlip.netSalary)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900">{modalType === "create" ? "Add Staff Payroll" : "Edit Payroll"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                <select required disabled={modalType === "edit"} value={form.staff} onChange={e => handleStaffChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50">
                  <option value="">Select Staff...</option>
                  {staffList.map(s => <option key={s._id} value={s._id}>{s.fullName} ({s.staffId})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select required value={form.month} onChange={e => setForm({...form, month: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50">
                    {monthOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select required value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-400">
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="paid">Paid</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
                <input type="number" required min="0" value={form.basicSalary} onChange={e => setForm({...form, basicSalary: e.target.value})}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus</label>
                  <input type="number" min="0" value={form.performanceBonus} onChange={e => setForm({...form, performanceBonus: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deductions</label>
                  <input type="number" min="0" value={form.totalDeductions} onChange={e => setForm({...form, totalDeductions: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 flex items-center">
                  {submitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Save Payroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Payroll Record?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete the payroll record for <span className="font-semibold">{selectedPayroll.staff?.fullName}</span> for {formatMonthLabel(selectedPayroll.month)}? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-70 flex justify-center items-center">
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
