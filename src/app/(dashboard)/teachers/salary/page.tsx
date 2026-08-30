"use client";
import Link from "next/link";

import { useState, useEffect } from "react";
import { 
  Banknote, Calendar, Loader2, Search, CheckCircle2,
  AlertCircle, Clock, User, Phone, Mail, FileCheck,
  Plus, Trash2, Edit2, Copy, FileText, Check, X,
  TrendingUp, CreditCard, Download, FileSpreadsheet
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function AdminTeacherSalaryPage() {
  const [salaries, setSalaries] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // UI states
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Form states
  const [form, setForm] = useState({
    teacherId: "",
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    salaryType: "monthly",
    baseValue: "",
    totalStudents: "0",
    totalStudentFees: "0",
    bonus: "0",
    deduction: "0",
    calculatedAmount: "",
    status: "pending",
    notes: ""
  });

  useEffect(() => {
    fetchSalaries();
    fetchTeachers();
  }, []);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teacher-salary");
      const data = await res.json();
      if (data.success) {
        setSalaries(data.salaries || []);
      } else {
        setError(data.message || "Failed to load salaries");
      }
    } catch (err) {
      setError("Network error while loading salaries.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    setTeachersLoading(true);
    try {
      const res = await fetch("/api/admin/teacher-salary/teachers");
      const data = await res.json();
      if (data.success) {
        setTeachers(data.teachers || []);
      }
    } catch (err) {
      console.error("Error loading teachers:", err);
    } finally {
      setTeachersLoading(false);
    }
  };

  // Helper to sync calculated amount when baseValue / type changes
  const recalculateAmount = (type: string, base: string, students: string, fees: string, bonus: string, deduction: string) => {
    const baseNum = Number(base) || 0;
    const feesNum = Number(fees) || 0;
    const bonusNum = Number(bonus) || 0;
    const deductionNum = Number(deduction) || 0;
    
    let baseSalary = 0;
    if (type === "monthly") {
      baseSalary = baseNum;
    } else {
      baseSalary = Math.round(feesNum * (baseNum / 100));
    }
    
    return Math.max(0, baseSalary + bonusNum - deductionNum).toString();
  };

  const handleFormChange = (key: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      
      // Auto-recalculate calculations if type/base/fees/bonus/deduction change
      if (["salaryType", "baseValue", "totalStudentFees", "bonus", "deduction"].includes(key)) {
        updated.calculatedAmount = recalculateAmount(
          updated.salaryType,
          updated.baseValue,
          updated.totalStudents,
          updated.totalStudentFees,
          updated.bonus,
          updated.deduction
        );
      }
      return updated;
    });
  };

  const handleOpenCreate = () => {
    setForm({
      teacherId: teachers[0]?._id || "",
      month: new Date().toISOString().slice(0, 7),
      salaryType: "monthly",
      baseValue: "30000",
      totalStudents: "0",
      totalStudentFees: "0",
      bonus: "0",
      deduction: "0",
      calculatedAmount: "30000",
      status: "pending",
      notes: ""
    });
    setModalType("create");
    setSelectedSalary(null);
    setShowModal(true);
  };

  const handleOpenEdit = (salary: any) => {
    setForm({
      teacherId: salary.teacher?._id || "",
      month: salary.month,
      salaryType: salary.salaryType,
      baseValue: salary.baseValue?.toString() || "0",
      totalStudents: salary.totalStudents?.toString() || "0",
      totalStudentFees: salary.totalStudentFees?.toString() || "0",
      bonus: salary.bonus?.toString() || "0",
      deduction: salary.deduction?.toString() || "0",
      calculatedAmount: salary.calculatedAmount?.toString() || "0",
      status: salary.status,
      notes: salary.notes || ""
    });
    setModalType("edit");
    setSelectedSalary(salary);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    
    try {
      const isEdit = modalType === "edit";
      const url = "/api/admin/teacher-salary";
      const method = isEdit ? "PATCH" : "POST";
      
      const payload = isEdit 
        ? { salaryId: selectedSalary._id, ...form }
        : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(isEdit ? "Salary record updated successfully!" : "Salary record created successfully!");
        setShowModal(false);
        fetchSalaries();
      } else {
        setError(data.message || "Failed to save salary record");
      }
    } catch (err) {
      setError("Network error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (salaryId: string) => {
    if (!confirm("Are you sure you want to approve this salary? This will mark it as paid and generate an invoice.")) return;
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/teacher-salary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaryId, status: "paid" }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSalaries(salaries.map(s => 
          s._id === salaryId ? { ...s, status: "paid", paidAt: data.salary.paidAt, invoiceId: data.salary.invoiceId } : s
        ));
        setSuccessMsg("Payment approved and invoice generated successfully!");
      } else {
        alert(data.message || "Failed to approve salary");
      }
    } catch (err) {
      alert("Network error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/teacher-salary?id=${deleteTarget._id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setSalaries(salaries.filter(s => s._id !== deleteTarget._id));
        setShowDeleteModal(false);
        setDeleteTarget(null);
        setSuccessMsg("Salary record deleted successfully!");
      } else {
        alert(data.message || "Failed to delete record");
      }
    } catch (err) {
      alert("Network error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const copyInvoice = (invoiceId: string) => {
    navigator.clipboard.writeText(invoiceId);
    setCopiedId(invoiceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Filtered lists
  const filteredSalaries = salaries.filter(s => {
    const matchesMonth = monthFilter === "all" || s.month === monthFilter;
    const matchesSearch = !searchQuery || 
      s.teacher?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.teacher?.teacherId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  const uniqueMonths = Array.from(new Set(salaries.map(s => s.month))).sort().reverse();

  // Summary statistics
  const totalPending = filteredSalaries.filter(s => s.status === "pending").reduce((a, c) => a + c.calculatedAmount, 0);
  const totalPaid = filteredSalaries.filter(s => s.status === "paid").reduce((a, c) => a + c.calculatedAmount, 0);

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

    const formattedMonth = formatMonthLabel(monthFilter);
    const grandTotal = filteredSalaries.reduce((sum, s) => sum + (Number(s.calculatedAmount) || 0), 0);

    // Load logo if available
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
    } catch {
      logoImg = null;
    }

    const primaryNavy: [number, number, number] = [10, 25, 49]; // #0A1931
    const accentBlue: [number, number, number] = [37, 99, 235]; // #2563EB
    const textDark: [number, number, number] = [30, 41, 59];

    const drawHeader = () => {
      // Top navy accent bar
      doc.setFillColor(...primaryNavy);
      doc.rect(0, 0, pageWidth, 4, "F");

      // Fajr Academy Logo or Title
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        try {
          doc.addImage(logoImg, "PNG", 14, 8, 42, 14);
        } catch {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(...primaryNavy);
          doc.text("FAJR ACADEMY", 14, 17);
        }
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...primaryNavy);
        doc.text("FAJR ACADEMY", 14, 17);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Teacher Salary Disbursement & Bank Details Report", 14, 25);

      // Title & Month Info (Right aligned)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...primaryNavy);
      doc.text("TEACHER SALARY REPORT", pageWidth - 14, 14, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...accentBlue);
      doc.text(`Month: ${formattedMonth}`, pageWidth - 14, 20, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - 14, 25, { align: "right" });

      // Separator line
      doc.setDrawColor(...primaryNavy);
      doc.setLineWidth(0.6);
      doc.line(14, 28, pageWidth - 14, 28);
    };

    const tableColumn = ["Sl No", "Teacher ID", "Teacher Name", "Bank Name", "Branch Name", "Routing No.", "Account No.", "Status", "Total Amount"];
    
    const sortedForPdf = [...filteredSalaries].sort((a, b) => {
      const nameA = (a.teacher?.fullName || "").toLowerCase();
      const nameB = (b.teacher?.fullName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const tableRows = sortedForPdf.map((s, idx) => {
      const p = s.teacher?.paymentInfo || {};
      return [
        idx + 1,
        s.teacher?.teacherId || "—",
        s.teacher?.fullName || "—",
        p.bankName || "—",
        p.branchName || "—",
        p.routingNumber || "—",
        p.accountNumber || "—",
        (s.status || "pending").toUpperCase(),
        formatCurrency(s.calculatedAmount)
      ];
    });

    const footerRow = [
      { content: "TOTAL", colSpan: 2, styles: { halign: 'center' as const } },
      { content: `Total Teachers: ${filteredSalaries.length}`, colSpan: 6, styles: { halign: 'center' as const } },
      { content: formatCurrency(grandTotal), styles: { halign: 'right' as const } }
    ];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      foot: [footerRow],
      startY: 32,
      margin: { top: 32, bottom: 42, left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, halign: 'center', valign: 'middle', textColor: textDark },
      headStyles: { fillColor: primaryNavy, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      footStyles: { fillColor: [241, 245, 249], textColor: primaryNavy, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
        2: { halign: 'left', fontStyle: 'bold' },
        3: { halign: 'left' },
        4: { halign: 'left' },
        5: { halign: 'center' },
        6: { halign: 'center', fontStyle: 'bold' },
        7: { halign: 'center', fontStyle: 'bold' },
        8: { halign: 'right', fontStyle: 'bold' }
      },
      didDrawPage: (data) => {
        drawHeader();

        // Footer on every page showing Total Amount and Page numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;

        doc.setFillColor(248, 250, 252);
        doc.rect(14, pageHeight - 14, pageWidth - 28, 9, "F");
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.rect(14, pageHeight - 14, pageWidth - 28, 9, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...primaryNavy);
        doc.text(`Fajr Academy | Month: ${formattedMonth}`, 18, pageHeight - 8);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(...accentBlue);
        doc.text(`Total Payout Amount: ${formatCurrency(grandTotal)}`, pageWidth / 2, pageHeight - 8, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - 18, pageHeight - 8, { align: "right" });
      }
    });

    // Signatures section at bottom
    const finalY = (doc as any).lastAutoTable.finalY || 140;
    let sigY = finalY + 16;

    if (sigY + 32 > pageHeight - 15) {
      doc.addPage();
      sigY = 38;
    }

    // CEO Signature (Right)
    const ceoX = pageWidth - 90;
    doc.setDrawColor(...primaryNavy);
    doc.setLineWidth(0.8);
    doc.line(ceoX, sigY + 12, ceoX + 65, sigY + 12);

    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(10, 25, 49);
    doc.text("Fajr Academy CEO", ceoX + 8, sigY + 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...primaryNavy);
    doc.text("Chief Executive Officer (CEO)", ceoX + 32.5, sigY + 17, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Fajr Academy", ceoX + 32.5, sigY + 22, { align: "center" });

    // CEO Approval Seal (Center-Right)
    const sealX = ceoX - 35;
    doc.setDrawColor(...accentBlue);
    doc.setLineWidth(0.6);
    doc.circle(sealX + 12, sigY + 13, 10);
    doc.circle(sealX + 12, sigY + 13, 8);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...accentBlue);
    doc.text("APPROVED", sealX + 12, sigY + 11.5, { align: "center" });
    doc.text("CEO SIGN", sealX + 12, sigY + 15, { align: "center" });

    // Accounts Executive Signature (Left)
    const accX = 20;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(accX, sigY + 12, accX + 55, sigY + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...primaryNavy);
    doc.text("Accounts Officer", accX + 27.5, sigY + 17, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Prepared & Verified", accX + 27.5, sigY + 22, { align: "center" });

    doc.save(`Fajr_Academy_Salary_Report_${monthFilter}.pdf`);
  };

  const exportExcel = (isCSV = false) => {
    const exportData = filteredSalaries.map((s, idx) => {
      const p = s.teacher?.paymentInfo || {};
      return {
        "Sl No": idx + 1,
        "Teacher ID": s.teacher?.teacherId || "—",
        "Bank Name": p.bankName || "—",
        "Branch Name": p.branchName || "—",
        "Routing No": p.routingNumber ? `'${p.routingNumber}` : "—",
        "Account No": p.accountNumber ? `'${p.accountNumber}` : "—",
        "Name": s.teacher?.fullName || "—",
        "Total Payout/Total Gross": s.calculatedAmount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Details");
    
    if (isCSV) {
      XLSX.writeFile(workbook, `Salary_Bank_Report_${monthFilter}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, `Salary_Bank_Report_${monthFilter}.xlsx`, { bookType: 'xlsx' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-indigo-600" />
            Teacher Salary Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Perform CRUD operations on monthly salary requests and approve payouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/teachers/salary/reports"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold rounded-xl shadow-sm transition-colors border border-emerald-200"
          >
            <Calendar className="w-4 h-4" />
            Monthly Reports
          </Link>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate Salary Record
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Requests", value: filteredSalaries.length, icon: FileText, bg: "bg-indigo-50", text: "text-indigo-600" },
          { label: "Total Pending (Unpaid)", value: formatCurrency(totalPending), icon: Clock, bg: "bg-amber-50", text: "text-amber-600" },
          { label: "Total Paid", value: formatCurrency(totalPaid), icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-600" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${kpi.bg} rounded-xl flex items-center justify-center`}>
              <kpi.icon className={`w-6 h-6 ${kpi.text}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by teacher name or ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Month:</span>
            <div className="relative w-full sm:w-44">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors bg-white appearance-none"
              >
                <option value="all">All Months</option>
                {uniqueMonths.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
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
      </div>

      {/* Salaries grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredSalaries.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSalaries.map((salary) => (
            <div key={salary._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
              
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-start gap-4">
                {salary.teacher?.avatar ? (
                  <img src={salary.teacher.avatar} alt={salary.teacher.fullName} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center text-lg font-bold">
                    {salary.teacher?.fullName?.charAt(0) || "T"}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base truncate">
                    {salary.teacher?.fullName || "Unknown Teacher"}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                      {salary.teacher?.teacherId || "No ID"}
                    </span>
                    <span className="text-[10px] font-bold text-gray-700 bg-gray-200 px-2 py-0.5 rounded">
                      Month: {salary.month}
                    </span>
                  </div>
                </div>
                
                <div>
                  {salary.status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Contact Info */}
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Info</h4>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> {salary.teacher?.phone || "N/A"}</p>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5 truncate" title={salary.teacher?.email}><Mail className="w-3.5 h-3.5 text-gray-400" /> {salary.teacher?.email || "N/A"}</p>
                  </div>

                  {/* Calculations */}
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Calculation Base</h4>
                    <p className="text-xs font-semibold text-gray-700 capitalize flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                      {salary.salaryType === 'monthly' ? "Fixed Monthly" : "Student Percentage"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {salary.salaryType === 'monthly' 
                        ? `Basic: ${formatCurrency(salary.baseValue)}` 
                        : `${salary.baseValue}% of BDT ${salary.totalStudentFees}`}
                    </p>
                  </div>
                </div>

                {/* Notes if any */}
                {salary.notes && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100 italic">
                    Note: {salary.notes}
                  </div>
                )}

                {/* Invoice ID widget */}
                {salary.status === "paid" && salary.invoiceId && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Invoice ID</span>
                      <p className="font-mono text-xs font-bold text-gray-800">{salary.invoiceId}</p>
                    </div>
                    <button
                      onClick={() => copyInvoice(salary.invoiceId)}
                      className="p-1.5 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                      title="Copy Invoice ID"
                    >
                      {copiedId === salary.invoiceId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Payout</span>
                    <p className="text-xl font-black text-indigo-700">{formatCurrency(salary.calculatedAmount)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Manual Approve payment */}
                    {salary.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(salary._id)}
                        disabled={submitting}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    
                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(salary)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                      title="Edit Salary Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => { setDeleteTarget(salary); setShowDeleteModal(true); }}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Banknote className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Salary Records</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            {monthFilter !== "all" 
              ? `There are no generated salary records for ${monthFilter}.` 
              : "No salary records found. Click 'Generate Salary Record' to create one."}
          </p>
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                <Banknote className="w-5 h-5 text-indigo-600" />
                {modalType === "create" ? "Generate Salary Record" : "Edit Salary Record"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Choose Teacher */}
              {modalType === "create" ? (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Select Teacher *</label>
                  <select
                    value={form.teacherId}
                    onChange={(e) => handleFormChange("teacherId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    {teachersLoading ? (
                      <option>Loading teachers...</option>
                    ) : (
                      teachers.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.fullName} ({t.teacherId || "No ID"})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Teacher</label>
                  <p className="text-sm font-bold text-gray-900 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {selectedSalary?.teacher?.fullName} ({selectedSalary?.teacher?.teacherId})
                  </p>
                </div>
              )}

              {/* Month */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Salary Month *</label>
                <input
                  type="month"
                  value={form.month}
                  onChange={(e) => handleFormChange("month", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              {/* Salary Calculation Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Calculation Type</label>
                  <select
                    value={form.salaryType}
                    onChange={(e) => handleFormChange("salaryType", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="monthly">Fixed Monthly</option>
                    <option value="per-student-percentage">Student Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                    {form.salaryType === "monthly" ? "Monthly Basic (BDT)" : "Percentage Rate (%)"}
                  </label>
                  <input
                    type="number"
                    value={form.baseValue}
                    onChange={(e) => handleFormChange("baseValue", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder={form.salaryType === "monthly" ? "e.g. 30000" : "e.g. 60"}
                    required
                    min="0"
                  />
                </div>
              </div>

              {/* Student parameters if percentage basis */}
              {form.salaryType === "per-student-percentage" && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Total Students</label>
                    <input
                      type="number"
                      value={form.totalStudents}
                      onChange={(e) => handleFormChange("totalStudents", e.target.value)}
                      className="w-full border border-gray-300 bg-white rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Total Student Fees (BDT)</label>
                    <input
                      type="number"
                      value={form.totalStudentFees}
                      onChange={(e) => handleFormChange("totalStudentFees", e.target.value)}
                      className="w-full border border-gray-300 bg-white rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {/* Adjustments: Bonus & Deduction */}
              <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 border border-emerald-100 rounded-2xl shadow-inner">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1.5 uppercase tracking-wider">Bonus / Extra (BDT)</label>
                  <input
                    type="number"
                    value={form.bonus}
                    onChange={(e) => handleFormChange("bonus", e.target.value)}
                    className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium text-emerald-700"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-800 mb-1.5 uppercase tracking-wider">Deduction / Fine (BDT)</label>
                  <input
                    type="number"
                    value={form.deduction}
                    onChange={(e) => handleFormChange("deduction", e.target.value)}
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white font-medium text-red-600"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Calculated Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Calculated Amount (BDT) *</label>
                <input
                  type="number"
                  value={form.calculatedAmount}
                  onChange={(e) => handleFormChange("calculatedAmount", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-700 bg-indigo-50"
                  placeholder="Calculated payout amount"
                  required
                  min="0"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Status</label>
                <div className="flex gap-4">
                  {["pending", "paid"].map(statusVal => (
                    <label key={statusVal} className="flex items-center gap-2 text-sm font-semibold capitalize cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={statusVal}
                        checked={form.status === statusVal}
                        onChange={() => handleFormChange("status", statusVal)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      {statusVal}
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Payment remarks or reference details..."
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalType === "create" ? "Generate Record" : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Delete Salary Record?</h3>
                <p className="text-xs text-gray-500 mt-1 leading-normal">
                  Are you sure you want to permanently delete this salary record for <strong>{deleteTarget?.teacher?.fullName}</strong> ({deleteTarget?.month})?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex border-t border-gray-100 bg-gray-50 p-4 gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60"
              >
                {submitting ? "Deleting..." : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
