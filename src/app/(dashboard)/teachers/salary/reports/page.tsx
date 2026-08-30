"use client";

import React, { useState, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, ArrowLeft, Loader2, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Plus, X, Banknote, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface SalaryReportData {
  serial: number;
  teacherName: string;
  teacherId: string;
  _id?: string;
  isGenerated?: boolean;
  avatar: string;
  phoneNumber: string;
  totalClasses: number;
  totalStudents: number;
  studentPaidCount: number;
  studentPaidIds: string;
  studentPaymentCompleted: number;
  studentPaymentDue: number;
  salaryType: string;
  baseSalary: number;
  calculatedTotalSalary: number;
  attendancePercentage: number;
  overallPerformance: string;
}

export default function TeacherSalaryReport() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reportData, setReportData] = useState<SalaryReportData[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Generate Salary Record Modal states ---
  const [showModal, setShowModal] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    teacherId: "",
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
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

  const fetchTeachers = async () => {
    setTeachersLoading(true);
    try {
      const res = await fetch("/api/admin/teacher-salary/teachers");
      const data = await res.json();
      if (data.success) {
        setTeachers(data.teachers || []);
        if (data.teachers && data.teachers.length > 0 && !form.teacherId) {
          setForm(prev => ({ ...prev, teacherId: data.teachers[0]._id }));
        }
      }
    } catch (err) {
      console.error("Error loading teachers:", err);
    } finally {
      setTeachersLoading(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchTeachers();
    }
  }, [showModal]);

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
      teacherId: teachers[0]?._id || (teachers.length > 0 ? teachers[0]._id : ""),
      month: selectedMonth || new Date().toISOString().slice(0, 7),
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
    setError("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const handleOpenCreateRow = (row: SalaryReportData) => {
    setForm({
      teacherId: row._id || "",
      month: selectedMonth || new Date().toISOString().slice(0, 7),
      salaryType: row.salaryType || "monthly",
      baseValue: (row.baseSalary || 0).toString(),
      totalStudents: row.totalStudents.toString(),
      totalStudentFees: row.studentPaymentCompleted.toString(),
      bonus: "0",
      deduction: "0",
      calculatedAmount: (row.calculatedTotalSalary || 0).toString(),
      status: "pending",
      notes: ""
    });
    setError("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    
    try {
      const res = await fetch("/api/admin/teacher-salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg("Salary record created successfully as pending!");
        setShowModal(false);
        fetchReportData();
      } else {
        setError(data.message || "Failed to save salary record");
      }
    } catch (err) {
      setError("Network error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  // Sorting state: default highest student wise
  const [sortField, setSortField] = useState<keyof SalaryReportData>("totalStudents");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof SalaryReportData) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const displayData = [...reportData]
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }
      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    })
    .map((row, idx) => ({ ...row, serial: idx + 1 }));

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/teacher-salary?month=${selectedMonth}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const { data } = await res.json();
      setReportData(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF("landscape");
    const img = new Image();
    img.src = "/fajr-logo.png";

    const generateDoc = () => {
      // Fajr Academy Brand Colors: Primary Dark Navy #0A1931 -> RGB(10, 25, 49)
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

      // Title & Month Metadata
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 25, 49);
      doc.text("TEACHER SALARY REPORT", 283, 14, { align: "right" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Month: ${selectedMonth}   |   Generated: ${new Date().toLocaleDateString()}`, 283, 20, { align: "right" });

      // Decorative Navy Separator
      doc.setDrawColor(10, 25, 49);
      doc.setLineWidth(0.8);
      doc.line(14, 27, 283, 27);

      const tableColumn = [
        "Sl", "Teacher Name", "ID", "Phone", 
        "Class", "Student", "Paid Count", "Paid Amt", "Due Amt",
        "Salary Type", "Base", "Total Salary", "Att. %", "Performance"
      ];
      
      const tableRows = displayData.map(row => [
        row.serial, row.teacherName, row.teacherId, row.phoneNumber,
        row.totalClasses, row.totalStudents, row.studentPaidCount, 
        formatCurrency(row.studentPaymentCompleted), formatCurrency(row.studentPaymentDue),
        row.salaryType, formatCurrency(row.baseSalary), formatCurrency(row.calculatedTotalSalary), 
        `${row.attendancePercentage}%`, row.overallPerformance
      ]);

      const footerRow = [
        "Total", "", "", "", 
        totalClassesSum, totalStudentsSum, totalPaidCountSum, 
        formatCurrency(totalPaidAmtSum), formatCurrency(totalDueAmtSum),
        "", formatCurrency(totalBaseSalarySum), formatCurrency(totalCalculatedSalarySum), 
        "", ""
      ];

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        foot: [footerRow],
        startY: 31,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.5, halign: 'center', valign: 'middle' },
        columnStyles: {
          1: { halign: 'left', fontStyle: 'bold' },
          2: { halign: 'left' },
          3: { halign: 'left' }
        },
        headStyles: { 
          fillColor: navyColor, 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: {
          fillColor: [226, 232, 240],
          textColor: navyColor,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });
      
      doc.save(`Teacher_Salary_Report_${selectedMonth}.pdf`);
    };

    if (img.complete) {
      generateDoc();
    } else {
      img.onload = generateDoc;
      img.onerror = generateDoc;
    }
  };

  const exportExcel = (isCSV = false) => {
    const exportData = displayData.map(row => ({
      "Serial": row.serial,
      "Teacher Name": row.teacherName,
      "Teacher ID": row.teacherId,
      "Phone Number": row.phoneNumber,
      "Total Class": row.totalClasses,
      "Total Student": row.totalStudents,
      "Paid Student Count": row.studentPaidCount,
      "Paid Student IDs": row.studentPaidIds,
      "Student Payment (Paid)": row.studentPaymentCompleted,
      "Student Payment (Due)": row.studentPaymentDue,
      "Salary Type": row.salaryType,
      "Base Salary": row.baseSalary,
      "Total Salary": row.calculatedTotalSalary,
      "Attendance %": row.attendancePercentage,
      "Overall Performance": row.overallPerformance
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Salary Report");
    
    if (isCSV) {
      XLSX.writeFile(workbook, `Teacher_Salary_Report_${selectedMonth}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, `Teacher_Salary_Report_${selectedMonth}.xlsx`, { bookType: 'xlsx' });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(val);
  };

  const totalClassesSum = displayData.reduce((acc, row) => acc + row.totalClasses, 0);
  const totalStudentsSum = displayData.reduce((acc, row) => acc + row.totalStudents, 0);
  const totalPaidCountSum = displayData.reduce((acc, row) => acc + row.studentPaidCount, 0);
  const totalPaidAmtSum = displayData.reduce((acc, row) => acc + row.studentPaymentCompleted, 0);
  const totalDueAmtSum = displayData.reduce((acc, row) => acc + row.studentPaymentDue, 0);
  const totalBaseSalarySum = displayData.reduce((acc, row) => acc + row.baseSalary, 0);
  const totalCalculatedSalarySum = displayData.reduce((acc, row) => acc + row.calculatedTotalSalary, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
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
            <AlertCircle className="w-5 h-5 text-red-600" />
            {error}
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Link href="/teachers/salary" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Salaries
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            Teacher Salary Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monthly breakdown of teacher salaries, student payments, and performance.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Generate Salary Record
          </button>

          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700"
          />
          
          <div className="flex items-center gap-2">
            <button 
              onClick={exportPDF} 
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={() => exportExcel(false)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-medium transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button 
              onClick={() => exportExcel(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 select-none">
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                  <button onClick={() => handleSort("serial")} className="inline-flex items-center gap-1 hover:text-emerald-600 group">
                    Sl {sortField === "serial" ? (sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("teacherName")} className="inline-flex items-center gap-1 hover:text-emerald-600 group">
                    Teacher {sortField === "teacherName" ? (sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Action</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID & Phone</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                  <button onClick={() => handleSort("totalClasses")} className="inline-flex items-center gap-1 hover:text-emerald-600 group">
                    Class {sortField === "totalClasses" ? (sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-bold text-emerald-700 uppercase tracking-wider text-center bg-emerald-50/70 rounded-t-lg">
                  <button onClick={() => handleSort("totalStudents")} className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold group">
                    Student {sortField === "totalStudents" ? (sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />) : <ArrowUpDown className="w-3 h-3 text-emerald-500" />}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                  <button onClick={() => handleSort("studentPaidCount")} className="inline-flex items-center gap-1 hover:text-emerald-600 group">
                    Paid Count {sortField === "studentPaidCount" ? (sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider max-w-[150px]">Paid IDs</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  <button onClick={() => handleSort("studentPaymentCompleted")} className="inline-flex items-center gap-1 hover:text-emerald-600 group">
                    Paid Amt {sortField === "studentPaymentCompleted" ? (sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  <button onClick={() => handleSort("studentPaymentDue")} className="inline-flex items-center gap-1 hover:text-emerald-600 group">
                    Due Amt {sortField === "studentPaymentDue" ? (sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Salary Type</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Base</th>
                <th className="py-4 px-4 text-xs font-bold text-emerald-600 uppercase tracking-wider text-right">
                  <button onClick={() => handleSort("calculatedTotalSalary")} className="inline-flex items-center gap-1 hover:text-emerald-700 group">
                    Total Salary {sortField === "calculatedTotalSalary" ? (sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Att. %</th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Loading salary report...</p>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-gray-500 font-medium">
                    No data found for this month.
                  </td>
                </tr>
              ) : (
                displayData.map((row) => (
                  <tr key={row.teacherId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-400 text-center">{row.serial}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-[150px]">
                        {row.avatar ? (
                          <img src={row.avatar} alt={row.teacherName} className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {row.teacherName.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-semibold text-gray-800">{row.teacherName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.isGenerated ? (
                        <div className="flex flex-col items-center justify-center text-emerald-600 gap-0.5" title="Salary record already generated for this month">
                          <CheckCircle2 className="w-5 h-5 mx-auto" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Done</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenCreateRow(row)}
                          className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-semibold mx-auto"
                          title="Generate Record"
                        >
                          <Plus className="w-3.5 h-3.5" /> Generate
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-medium text-gray-800">{row.teacherId}</p>
                      <p className="text-xs text-gray-500">{row.phoneNumber}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-lg text-xs min-w-[2.5rem]">
                        {row.totalClasses}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-lg text-xs min-w-[2.5rem]">
                        {row.totalStudents}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-semibold text-gray-700">{row.studentPaidCount}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-gray-500 max-w-[150px] truncate" title={row.studentPaidIds}>
                        {row.studentPaidIds}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-semibold text-emerald-600">{formatCurrency(row.studentPaymentCompleted)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-semibold text-red-500">{formatCurrency(row.studentPaymentDue)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 capitalize border border-purple-100">
                        {row.salaryType.replace(/-/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600 font-medium">
                      {formatCurrency(row.baseSalary)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-bold text-gray-900 bg-gray-100/80 px-2 py-1 rounded-md border border-gray-200">
                        {formatCurrency(row.calculatedTotalSalary)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-semibold text-gray-700">{row.attendancePercentage}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        row.overallPerformance === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                        row.overallPerformance === 'Good' ? 'bg-blue-100 text-blue-700' :
                        row.overallPerformance === 'Average' ? 'bg-amber-100 text-amber-700' :
                        row.overallPerformance === 'Poor' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {row.overallPerformance}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {reportData.length > 0 && !loading && (
              <tfoot className="bg-emerald-50/50 border-t-2 border-emerald-100">
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-right font-bold text-gray-800">Total:</td>
                  <td className="py-4 px-4 text-center font-bold text-gray-800">{totalClassesSum}</td>
                  <td className="py-4 px-4 text-center font-bold text-blue-700">{totalStudentsSum}</td>
                  <td className="py-4 px-4 text-center font-bold text-gray-800">{totalPaidCountSum}</td>
                  <td className="py-4 px-4"></td>
                  <td className="py-4 px-4 text-right font-bold text-emerald-700">{formatCurrency(totalPaidAmtSum)}</td>
                  <td className="py-4 px-4 text-right font-bold text-red-600">{formatCurrency(totalDueAmtSum)}</td>
                  <td className="py-4 px-4"></td>
                  <td className="py-4 px-4 text-right font-bold text-gray-700">{formatCurrency(totalBaseSalarySum)}</td>
                  <td className="py-4 px-4 text-right font-bold text-emerald-800">{formatCurrency(totalCalculatedSalarySum)}</td>
                  <td colSpan={2} className="py-4 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {/* CREATE SALARY RECORD MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                <Banknote className="w-5 h-5 text-indigo-600" />
                Generate Salary Record
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Modal Error Display */}
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {error}
                  </div>
                  <button type="button" onClick={() => setError("")} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Choose Teacher */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Select Teacher *</label>
                <select
                  value={form.teacherId}
                  onChange={(e) => handleFormChange("teacherId", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">Choose a teacher...</option>
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
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Final Salary Amount (BDT) *</label>
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
                  placeholder="Reference, adjustments reasons..."
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
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Generate Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
