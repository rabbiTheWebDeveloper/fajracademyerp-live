"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Download, Loader2, FileSpreadsheet, FileText, AlertCircle, Search, Filter, Users, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type PaymentInfoRow = {
  "SL No": string | number;
  "Bank Name": string;
  "Branch Name": string;
  "Routing Number": string;
  "Account Number": string;
  "Employee Name": string;
  "Total Gross": number;
  "Commision": number;
  "Advance": number;
  "Net Amount": number;
};

export default function TeacherPaymentInfoPage() {
  const [rawData, setRawData] = useState<PaymentInfoRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "has_account">("all");

  const fetchData = useCallback(async () => {
    try {
      setFetching(true);
      setError("");
      const res = await fetch("/api/admin/teacher-payment-info");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch data");
      }
      setRawData(json.data || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute filtered & re-indexed list
  const filteredData = useMemo(() => {
    let result = rawData;

    // Filter by Account Number presence if selected
    if (filterMode === "has_account") {
      result = result.filter(
        (row) => row["Account Number"] && String(row["Account Number"]).trim() !== ""
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (row) =>
          row["Employee Name"].toLowerCase().includes(q) ||
          row["Bank Name"].toLowerCase().includes(q) ||
          row["Account Number"].toLowerCase().includes(q) ||
          row["Branch Name"].toLowerCase().includes(q) ||
          row["Routing Number"].toLowerCase().includes(q)
      );
    }

    // Re-index SL No
    return result.map((row, idx) => ({
      ...row,
      "SL No": String(idx + 1).padStart(2, "0"),
    }));
  }, [rawData, filterMode, searchQuery]);

  // Stats
  const totalCount = rawData.length;
  const withAccountCount = useMemo(
    () => rawData.filter((r) => r["Account Number"] && String(r["Account Number"]).trim() !== "").length,
    [rawData]
  );
  const totalNetAmount = useMemo(
    () => filteredData.reduce((acc, r) => acc + (r["Net Amount"] || 0), 0),
    [filteredData]
  );

  // Export to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const headers = Object.keys(filteredData[0]);
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers
          .map((fieldName) => {
            let val = (row as any)[fieldName];
            if (val === null || val === undefined) val = "";
            const strVal = String(val);
            return strVal.includes(",") || strVal.includes('"')
              ? `"${strVal.replace(/"/g, '""')}"`
              : strVal;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Teacher_Payment_Info_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (filteredData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Info");
    XLSX.writeFile(workbook, `Teacher_Payment_Info_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export to PDF (Following Salary Reports design)
  const exportToPDF = () => {
    if (filteredData.length === 0) return;

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

      // Title & Metadata
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 25, 49);
      doc.text("TEACHERS PAYMENT INFO REPORT", 283, 14, { align: "right" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}   |   Total Teachers: ${filteredData.length}`,
        283,
        20,
        { align: "right" }
      );

      // Decorative Navy Separator Line
      doc.setDrawColor(10, 25, 49);
      doc.setLineWidth(0.8);
      doc.line(14, 27, 283, 27);

      const tableColumn = [
        "SL No",
        "Bank Name",
        "Branch Name",
        "Routing Number",
        "Account Number",
        "Employee Name",
        "Total Gross",
        "Commision",
        "Advance",
        "Net Amount",
      ];

      const tableRows = filteredData.map((row) => [
        row["SL No"],
        row["Bank Name"] || "IBBL",
        row["Branch Name"] || "—",
        row["Routing Number"] || "—",
        row["Account Number"] || "—",
        row["Employee Name"],
        row["Total Gross"] ? row["Total Gross"].toLocaleString() : "0",
        row["Commision"] ? row["Commision"].toLocaleString() : "0",
        row["Advance"] ? row["Advance"].toLocaleString() : "0",
        row["Net Amount"] ? row["Net Amount"].toLocaleString() : "0",
      ]);

      // Calculate totals for footer row
      const totalGrossSum = filteredData.reduce((sum, r) => sum + (r["Total Gross"] || 0), 0);
      const totalCommisionSum = filteredData.reduce((sum, r) => sum + (r["Commision"] || 0), 0);
      const totalAdvanceSum = filteredData.reduce((sum, r) => sum + (r["Advance"] || 0), 0);
      const totalNetSum = filteredData.reduce((sum, r) => sum + (r["Net Amount"] || 0), 0);

      const footerRow = [
        "Total",
        "",
        "",
        "",
        "",
        `${filteredData.length} Teachers`,
        totalGrossSum.toLocaleString(),
        totalCommisionSum.toLocaleString(),
        totalAdvanceSum.toLocaleString(),
        totalNetSum.toLocaleString(),
      ];

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        foot: [footerRow],
        startY: 31,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.5, halign: "center", valign: "middle" },
        columnStyles: {
          0: { halign: "center", cellWidth: 14 },
          1: { halign: "center", cellWidth: 24 },
          2: { halign: "left" },
          3: { halign: "center" },
          4: { halign: "center", fontStyle: "bold" },
          5: { halign: "left", fontStyle: "bold" },
          6: { halign: "right" },
          7: { halign: "right" },
          8: { halign: "right" },
          9: { halign: "right", fontStyle: "bold" },
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

      doc.save(`Teacher_Payment_Info_${new Date().toISOString().split("T")[0]}.pdf`);
    };

    if (img.complete) {
      generateDoc();
    } else {
      img.onload = generateDoc;
      img.onerror = generateDoc;
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto animate-in fade-in zoom-in-95 duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teachers Payment Info</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage teacher bank accounts, routing numbers, and download payment statements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center justify-center rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 h-10 px-4 py-2 gap-2 shadow-sm transition-all"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            CSV
          </button>
          <button
            onClick={exportToExcel}
            className="inline-flex items-center justify-center rounded-xl text-sm font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 h-10 px-4 py-2 gap-2 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center justify-center rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Active Teachers</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">With Account Number</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{withAccountCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Net Amount (Filtered)</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">৳ {totalNetAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filter Toggle Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Teachers ({rawData.length})
          </button>
          <button
            onClick={() => setFilterMode("has_account")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === "has_account"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Has Account Number Only ({withAccountCount})
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {fetching ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 mt-4">Loading payment info...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Failed to load data</h3>
            <p className="text-slate-500 max-w-md">{error}</p>
            <button
              onClick={fetchData}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No records match your view</h3>
            <p className="text-slate-500 max-w-md">
              {filterMode === "has_account"
                ? "No teachers currently have an Account Number saved."
                : "No teacher records found matching your search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">SL No</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Bank Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Branch Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Routing Number</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Account Number</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Employee Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Total Gross</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Commision</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Advance</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right text-blue-700">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{row["SL No"]}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{row["Bank Name"] || "IBBL"}</td>
                    <td className="px-6 py-4 text-slate-600">{row["Branch Name"] || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{row["Routing Number"] || "—"}</td>
                    <td className="px-6 py-4 text-slate-900 font-mono text-xs font-semibold">
                      {row["Account Number"] || <span className="text-slate-300 font-normal">Not Provided</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{row["Employee Name"]}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{row["Total Gross"].toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{row["Commision"].toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{row["Advance"].toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-700">{row["Net Amount"].toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
