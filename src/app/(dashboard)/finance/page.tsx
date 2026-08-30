"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Download, Search, X, Calendar,
  Loader2, RefreshCw, ChevronLeft, ChevronRight, Plus, Trash2, Edit, Save, UserCheck, User, AlertCircle, FileText, Printer
} from "lucide-react";
import { generateInvoicePDF, exportTransactionsStatementPDF } from "@/lib/invoice-generator";

const STATUS_COLORS = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  refunded: "bg-red-100 text-red-700",
  failed: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};

const MONTH_OPTIONS = (() => {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  // Generate options from 12 months ago to 12 months in the future
  for (let i = -12; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const formatted = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    opts.push({ value: formatted, label: formatted });
  }
  return opts.reverse(); // Newest months first
})();

export default function FinancePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [searchStudentId, setSearchStudentId] = useState("");
  const [searchTeacherId, setSearchTeacherId] = useState("");
  const [createFormError, setCreateFormError] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [mrNumberInput, setMrNumberInput] = useState("");
  const [updatingTxn, setUpdatingTxn] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  });
  const [totalAmount, setTotalAmount] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const LIMIT = 10;

  // Create Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(false);

  const [createForm, setCreateForm] = useState({
    student: "",
    course: "",
    amount: "",
    type: "monthly-fee",
    status: "pending",
    paymentMethod: "other",
    paymentMethodDetails: "",
    mrNumber: "",
    notes: "",
    month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    dueDate: "",
    print: false,
  });
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [selectedStudentObj, setSelectedStudentObj] = useState<any>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);

  // Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    student: "",
    course: "",
    amount: "",
    type: "",
    status: "",
    paymentMethod: "",
    paymentMethodDetails: "",
    mrNumber: "",
    notes: "",
    month: "",
    dueDate: "",
    print: false,
  });
  const [editStudentSearchQuery, setEditStudentSearchQuery] = useState("");
  const [isEditStudentDropdownOpen, setIsEditStudentDropdownOpen] = useState(false);
  const [selectedEditStudentObj, setSelectedEditStudentObj] = useState<any>(null);

  const fetchDropdownData = useCallback(async () => {
    setFetchingData(true);
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        fetch("/api/students?limit=500"),
        fetch("/api/courses?limit=100")
      ]);
      const studentsData = await studentsRes.json();
      const coursesData = await coursesRes.json();
      if (studentsData.success) setStudentsList(studentsData.students || []);
      if (coursesData.success) setCoursesList(coursesData.courses || []);
    } catch (err) {
      console.error("Error fetching students/courses:", err);
    } finally {
      setFetchingData(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    if (selectedTxn) {
      setMrNumberInput(selectedTxn.mrNumber || "");
    } else {
      setMrNumberInput("");
      setIsEditing(false);
    }
  }, [selectedTxn]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTxn) return;
    setUpdatingTxn(true);
    try {
      const res = await fetch(`/api/payments/${selectedTxn._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          mrNumber: mrNumberInput
        })
      });
      const data = await res.json();
      if (data.success && data.payment) {
        setPayments(prev => prev.map(p => p._id === selectedTxn._id ? data.payment : p));
        setSelectedTxn(data.payment);
        fetchStats();
      } else if (data.success) {
        setSelectedTxn(null);
        fetchPayments();
        fetchStats();
      } else {
        alert(data.message || "Failed to update payment status.");
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setUpdatingTxn(false);
    }
  };

  const handleCreatePayment = async (e: any) => {
    e.preventDefault();
    setCreateFormError("");
    if (!createForm.student) {
      setCreateFormError("Please select a student.");
      return;
    }
    if (!createForm.amount || Number(createForm.amount) <= 0) {
      setCreateFormError("Please enter a valid amount.");
      return;
    }
    setCreatingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          amount: Number(createForm.amount)
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setCreateFormError("");
        setCreateForm({
          student: "",
          course: "",
          amount: "",
          type: "installment",
          status: "pending",
          paymentMethod: "other",
          paymentMethodDetails: "",
          mrNumber: "",
          notes: "",
          month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          dueDate: "",
          print: false,
        });
        setStudentSearchQuery("");
        setSelectedStudentObj(null);
        fetchPayments();
        fetchStats();
      } else {
        setCreateFormError(data.message || "Failed to record payment.");
      }
    } catch (err) {
      setCreateFormError("Network error.");
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleStartEdit = () => {
    setEditFormError("");
    setEditForm({
      student: selectedTxn.student?._id || selectedTxn.student || "",
      course: selectedTxn.course?._id || selectedTxn.course || "",
      amount: selectedTxn.amount || "",
      type: selectedTxn.type || "installment",
      status: selectedTxn.status || "pending",
      paymentMethod: selectedTxn.paymentMethod || "other",
      paymentMethodDetails: selectedTxn.paymentMethodDetails || "",
      mrNumber: selectedTxn.mrNumber || "",
      notes: selectedTxn.notes || "",
      month: selectedTxn.month || "",
      dueDate: selectedTxn.dueDate ? new Date(selectedTxn.dueDate).toISOString().split("T")[0] : "",
      print: Boolean(selectedTxn.print),
    });
    const stObj = selectedTxn.student || null;
    setSelectedEditStudentObj(stObj);
    setEditStudentSearchQuery(stObj?.fullName || "");
    setIsEditing(true);
  };

  const handleUpdatePayment = async (e: any) => {
    e.preventDefault();
    setEditFormError("");
    if (!editForm.student) {
      setEditFormError("Please select a student.");
      return;
    }
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      setEditFormError("Please enter a valid amount.");
      return;
    }
    setUpdatingTxn(true);
    try {
      const res = await fetch(`/api/payments/${selectedTxn._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          amount: Number(editForm.amount)
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        setEditFormError("");
        if (data.payment) {
          setPayments(prev => prev.map(p => p._id === selectedTxn._id ? data.payment : p));
          setSelectedTxn(data.payment);
        } else {
          setSelectedTxn(null);
          fetchPayments();
        }
        fetchStats();
      } else {
        setEditFormError(data.message || "Failed to update payment.");
      }
    } catch (err) {
      setEditFormError("Network error.");
    } finally {
      setUpdatingTxn(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!window.confirm("Are you sure you want to delete this payment record? This action cannot be undone.")) {
      return;
    }
    setUpdatingTxn(true);
    try {
      const res = await fetch(`/api/payments/${selectedTxn._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTxn(null);
        setIsEditing(false);
        fetchPayments();
        fetchStats();
      } else {
        alert(data.message || "Failed to delete payment.");
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setUpdatingTxn(false);
    }
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams({ stats: "true" });
      if (search) params.set("search", search);
      if (searchStudentId) params.set("studentId", searchStudentId);
      if (searchTeacherId) params.set("teacherId", searchTeacherId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (month) params.set("month", month);

      const res = await fetch(`/api/payments?${params}`);
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) { console.error(err); }
    finally { setStatsLoading(false); }
  }, [search, searchStudentId, searchTeacherId, startDate, endDate, month]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), search, status });
      if (searchStudentId) params.set("studentId", searchStudentId);
      if (searchTeacherId) params.set("teacherId", searchTeacherId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (month) params.set("month", month);
      const res = await fetch(`/api/payments?${params}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, searchStudentId, searchTeacherId, status, startDate, endDate, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const StatCard = ({ label, value, subLabel, icon: Icon, iconBg, trend }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        <div className={`p-2 rounded-lg ${iconBg}`}><Icon className="w-5 h-5" /></div>
      </div>
      <p className="text-3xl font-bold text-gray-900">
        {statsLoading ? <span className="inline-block h-8 w-24 bg-gray-200 rounded animate-pulse" /> : value}
      </p>
      {subLabel && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className={`flex items-center font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {Math.abs(trend)}%
          </span>
          <span className="text-gray-500">{subLabel}</span>
        </div>
      )}
    </div>
  );

  const togglePrintStatus = async (txn: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !txn.print;
    try {
      const res = await fetch(`/api/payments/${txn._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ print: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setPayments(prev => prev.map(p => p._id === txn._id ? { ...p, print: newStatus } : p));
        if (selectedTxn && selectedTxn._id === txn._id) {
          setSelectedTxn((prev: any) => ({ ...prev, print: newStatus }));
        }
      }
    } catch (err) {
      console.error("Failed to toggle print status:", err);
    }
  };

  const handleDownloadInvoice = async (txn: any, sourceId: string, isPrint: boolean = false) => {
    if (!txn) return;
    setDownloadingId(sourceId);
    try {
      await generateInvoicePDF(txn, isPrint);
      // Automatically mark as printed in MongoDB upon download or print
      if (!txn.print) {
        fetch(`/api/payments/${txn._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ print: true }),
        }).then(() => {
          setPayments(prev => prev.map(p => p._id === txn._id ? { ...p, print: true } : p));
          if (selectedTxn && selectedTxn._id === txn._id) {
            setSelectedTxn((prev: any) => ({ ...prev, print: true }));
          }
        }).catch(console.error);
      }
    } catch (err) {
      console.error("Error generating invoice PDF:", err);
      alert("Could not process invoice. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportStatement = async () => {
    if (payments.length === 0) {
      alert("No transactions to export.");
      return;
    }
    setDownloadingId("statement");
    try {
      await exportTransactionsStatementPDF(payments, {
        month,
        startDate,
        endDate,
        status,
        totalAmount,
      });
    } catch (err) {
      console.error("Error exporting statement PDF:", err);
      alert("Could not export statement PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Finance & Billing</h2>
          <p className="text-sm text-gray-500 mt-1">Track revenue, manage payments, and process refunds.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> Record Payment
          </button>
          <button onClick={fetchPayments} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={handleExportStatement}
            disabled={downloadingId === "statement"}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloadingId === "statement" ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloadingId === "statement" ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Monthly Revenue" value={stats ? `৳${stats.monthlyRevenue.toLocaleString()}` : "—"}
          icon={DollarSign} iconBg="bg-blue-50 text-blue-600"
          subLabel="vs last month" trend={stats?.monthlyChange || 0} />
        <StatCard label="Pending Dues" value={stats ? `৳${stats.pendingDues.toLocaleString()}` : "—"}
          icon={DollarSign} iconBg="bg-amber-50 text-amber-600"
          subLabel="outstanding" trend={-5} />
        <StatCard label="Refunds Processed" value={stats ? `৳${stats.refunded.toLocaleString()}` : "—"}
          icon={DollarSign} iconBg="bg-red-50 text-red-600"
          subLabel="this month" trend={-8} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-900 whitespace-nowrap">Transactions</h3>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-100 whitespace-nowrap">
              Total Amount: ৳{totalAmount.toLocaleString()}
            </span>
            {(search || searchStudentId || searchTeacherId || status || startDate || endDate || month) && (
              <button
                onClick={() => {
                  setSearch("");
                  setSearchStudentId("");
                  setSearchTeacherId("");
                  setStatus("");
                  setStartDate("");
                  setEndDate("");
                  setMonth("");
                  setPage(1);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline ml-2 whitespace-nowrap"
              >
                Clear all filters
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
            {/* Student ID Search */}
            <div className="relative w-full sm:w-52">
              <UserCheck className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Student ID / Name..."
                value={searchStudentId}
                onChange={e => { setSearchStudentId(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-7 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchStudentId && (
                <button
                  onClick={() => { setSearchStudentId(""); setPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear Student ID search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Teacher ID Search */}
            <div className="relative w-full sm:w-48">
              <UserCheck className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Teacher ID / Name..."
                value={searchTeacherId}
                onChange={e => { setSearchTeacherId(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-7 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTeacherId && (
                <button
                  onClick={() => { setSearchTeacherId(""); setPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear Teacher ID search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Transaction / Invoice / MR ID Search */}
            <div className="relative w-full sm:w-52">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="TXN / Invoice / MR..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-7 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear TXN search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="text-sm border-none focus:outline-none p-0 text-gray-600 bg-transparent" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
                className="text-sm border-none focus:outline-none p-0 text-gray-600 bg-transparent" />
            </div>

            {/* Target Month Select */}
            <div className="relative w-full sm:w-60 flex items-center">
              <span className="absolute left-3 text-xs text-gray-500 pointer-events-none font-medium whitespace-nowrap">Month:</span>
              <select
                value={month}
                onChange={e => { setMonth(e.target.value); setPage(1); }}
                className="w-full pl-14 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950 font-medium appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.25rem',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <option value="">All Target Months</option>
                {MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div className="relative w-full sm:w-44 flex items-center">
              <span className="absolute left-3 text-xs text-gray-500 pointer-events-none font-medium whitespace-nowrap">Status:</span>
              <select
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="w-full pl-14 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950 font-medium appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.25rem',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <option value="">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Assigned Teacher</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(9)].map((_, j) => (
                  <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></td>
                ))}</tr>
              )) : payments.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center text-gray-500">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No transactions found</p>
                </td></tr>
              ) : payments.map((txn) => (
                <tr key={txn._id} className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTxn(txn)}>
                  <td className="px-6 py-4 font-mono text-xs text-blue-700 font-medium">
                    <div>
                      <span>{txn.transactionId}</span>
                      {txn.month && (
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 capitalize-none">
                          {txn.month}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {txn.student?.avatar ? (
                        <img src={txn.student.avatar} alt={txn.student.fullName} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200">
                          {txn.student?.fullName?.charAt(0) || "S"}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 leading-none">{txn.student?.fullName || "—"}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-1">{txn.student?.studentId || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">{txn.course?.title || txn.student?.course || "—"}</td>
                  <td className="px-6 py-4">
                    {txn.student?.teacherInfo ? (
                      <div className="flex items-center gap-2">
                        {txn.student.teacherInfo.avatar ? (
                          <img src={txn.student.teacherInfo.avatar} alt={txn.student.teacherInfo.name} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold border border-indigo-200">
                            {txn.student.teacherInfo.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700">{txn.student.teacherInfo.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 capitalize">{txn.type?.replace("-", " ")}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">৳{txn.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(txn.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[txn.status]}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        disabled={downloadingId === txn._id}
                        onClick={() => handleDownloadInvoice(txn, txn._id, false)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 ${
                          txn.print
                            ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-300"
                            : "text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border-blue-200"
                        }`}
                        title={txn.print ? "Receipt Downloaded & Printed" : "Download PDF Receipt"}
                      >
                        {downloadingId === txn._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span>{downloadingId === txn._id ? "PDF..." : "Invoice"}</span>
                      </button>
                      
                      {/* Interactive Print Status Badge */}
                      <button
                        type="button"
                        onClick={(e) => togglePrintStatus(txn, e)}
                        title="Click to toggle print status"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          txn.print
                            ? "text-emerald-800 bg-emerald-100/80 border-emerald-300 hover:bg-emerald-200"
                            : "text-amber-800 bg-amber-100/70 border-amber-300 hover:bg-amber-200"
                        }`}
                      >
                        {txn.print ? "✓ Printed" : "• Not Printed"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <div>Showing <span className="font-medium text-gray-900">{((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)}</span> of <span className="font-medium text-gray-900">{total}</span></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => p-1)} disabled={page<=1} className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="px-3 py-1.5 bg-blue-600 text-white rounded-md">{page}</span>
            <button onClick={() => setPage(p => p+1)} disabled={page>=totalPages} className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className={`bg-white rounded-xl shadow-xl w-full transition-all duration-300 overflow-hidden ${isEditing ? 'max-w-xl' : 'max-w-md'}`}>
            {isEditing ? (
              <form onSubmit={handleUpdatePayment} className="flex flex-col h-full">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit Transaction</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedTxn.transactionId} · {selectedTxn.invoiceId}</p>
                  </div>
                  <button type="button" onClick={() => setIsEditing(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {editFormError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200 flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                      <span>{editFormError}</span>
                    </div>
                  )}
                  {/* Searchable student dropdown */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Student *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type to search student name or ID..."
                        value={editStudentSearchQuery}
                        onChange={e => {
                          setEditStudentSearchQuery(e.target.value);
                          setIsEditStudentDropdownOpen(true);
                          if (!e.target.value) {
                            setSelectedEditStudentObj(null);
                            setEditForm((prev: any) => ({ ...prev, student: "" }));
                          }
                        }}
                        onFocus={() => setIsEditStudentDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsEditStudentDropdownOpen(false), 200)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                        required
                      />
                      {selectedEditStudentObj && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEditStudentObj(null);
                            setEditStudentSearchQuery("");
                            setEditForm((prev: any) => ({ ...prev, student: "" }));
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {isEditStudentDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 divide-y divide-gray-100 text-gray-800">
                        {studentsList.filter(s => 
                          s.fullName.toLowerCase().includes(editStudentSearchQuery.toLowerCase()) ||
                          (s.studentId && s.studentId.toLowerCase().includes(editStudentSearchQuery.toLowerCase()))
                        ).length === 0 ? (
                          <div className="p-2 text-xs text-gray-500 text-center">No students found</div>
                        ) : (
                          studentsList.filter(s => 
                            s.fullName.toLowerCase().includes(editStudentSearchQuery.toLowerCase()) ||
                            (s.studentId && s.studentId.toLowerCase().includes(editStudentSearchQuery.toLowerCase()))
                          ).map(student => (
                            <div
                              key={student._id}
                              onMouseDown={() => {
                                setSelectedEditStudentObj(student);
                                setEditStudentSearchQuery(student.fullName);
                                setEditForm((prev: any) => ({ 
                                  ...prev, 
                                  student: student._id,
                                  course: student.course?._id || student.course || prev.course
                                }));
                                setIsEditStudentDropdownOpen(false);
                              }}
                              className="p-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs transition-colors"
                            >
                              <div>
                                <p className="font-semibold text-gray-950">{student.fullName}</p>
                                <p className="text-gray-500 text-[10px]">{student.email || "No email"}</p>
                              </div>
                              <span className="font-mono bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[10px]">
                                {student.studentId || "No ID"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Course select */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Course</label>
                    <select
                      value={editForm.course}
                      onChange={e => setEditForm((p: any) => ({ ...p, course: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                    >
                      <option value="">No Course (Select to assign)</option>
                      {coursesList.map(course => (
                        <option key={course._id} value={course._id}>{course.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (BDT) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editForm.amount}
                        onChange={e => setEditForm((p: any) => ({ ...p, amount: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      />
                    </div>

                    {/* Month */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Target Month</label>
                      <select
                        value={editForm.month}
                        onChange={e => setEditForm((p: any) => ({ ...p, month: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      >
                        <option value="">No Target Month</option>
                        {MONTH_OPTIONS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Type */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                      <select
                        value={editForm.type}
                        onChange={e => setEditForm((p: any) => ({ ...p, type: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      >
                        <option value="monthly-fee">Monthly Fee</option>
                        <option value="admission-fee">Admission Fee</option>
                        <option value="installment">Installment</option>
                        <option value="refund">Refund</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={e => setEditForm((p: any) => ({ ...p, status: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="refunded">Refunded</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Payment Method */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Method</label>
                      <select
                        value={editForm.paymentMethod}
                        onChange={e => setEditForm((p: any) => ({ ...p, paymentMethod: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      >
                        <option value="credit-card">Credit Card</option>
                        <option value="bank-transfer">Bank Transfer</option>
                        <option value="paypal">PayPal</option>
                        <option value="cash">Cash</option>
                        <option value="mobile-banking">Mobile Banking</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={e => setEditForm((p: any) => ({ ...p, dueDate: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Payment Details */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Method Details</label>
                      <input
                        type="text"
                        placeholder="e.g. ending in 4242"
                        value={editForm.paymentMethodDetails}
                        onChange={e => setEditForm((p: any) => ({ ...p, paymentMethodDetails: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      />
                    </div>

                    {/* MR Number */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">MR Number</label>
                      <input
                        type="text"
                        placeholder="e.g. MR-2026-001"
                        value={editForm.mrNumber}
                        onChange={e => setEditForm((p: any) => ({ ...p, mrNumber: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={editForm.notes}
                      onChange={e => setEditForm((p: any) => ({ ...p, notes: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                      placeholder="Add remarks..."
                    />
                  </div>

                  {/* Print Status Checkbox */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <input
                      type="checkbox"
                      id="edit-print-checkbox"
                      checked={Boolean(editForm.print)}
                      onChange={e => setEditForm((p: any) => ({ ...p, print: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="edit-print-checkbox" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                      Receipt Printed Status ({editForm.print ? "Printed" : "Not Printed"})
                    </label>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleDeletePayment}
                    disabled={updatingTxn}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingTxn}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {updatingTxn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Transaction Details</h3>
                  <button onClick={() => setSelectedTxn(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Amount</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">৳{selectedTxn.amount?.toLocaleString()}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[selectedTxn.status]}`}>
                      {selectedTxn.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    {[
                      ["Transaction ID", selectedTxn.transactionId],
                      ["Invoice ID", selectedTxn.invoiceId],
                      ["MR Number", selectedTxn.mrNumber || "—"],
                      ["Type", selectedTxn.type?.replace("-", " ")],
                      ["Target Month", selectedTxn.month || "—"],
                      ["Date", new Date(selectedTxn.createdAt).toLocaleDateString()],
                      ["Print Status", selectedTxn.print ? "Printed (Yes)" : "Not Printed (No)"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className={`text-sm font-medium capitalize ${label === "Print Status" ? (selectedTxn.print ? "text-emerald-700 font-semibold" : "text-gray-600") : "text-gray-900"}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    {/* Student Details Card */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-150 flex items-start gap-3">
                      {selectedTxn.student?.avatar ? (
                        <img src={selectedTxn.student.avatar} alt={selectedTxn.student.fullName} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold border border-blue-200">
                          {selectedTxn.student?.fullName?.charAt(0) || "S"}
                        </div>
                      )}
                      <div className="space-y-0.5 text-gray-900">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Student Profile</p>
                        <p className="text-sm font-bold text-gray-950">{selectedTxn.student?.fullName || "—"}</p>
                        <p className="text-xs text-gray-500">{selectedTxn.student?.email}</p>
                        <p className="text-xs text-gray-400 font-mono">ID: {selectedTxn.student?.studentId}</p>
                      </div>
                    </div>

                    {/* Course Details Card */}
                    <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div className="text-gray-900">
                        <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Enrolled Course</p>
                        <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedTxn.course?.title || selectedTxn.student?.course || "—"}</p>
                      </div>
                    </div>

                    {/* Teacher Details Card */}
                    <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex items-start gap-3">
                      {selectedTxn.student?.teacherInfo ? (
                        <>
                          {selectedTxn.student.teacherInfo.avatar ? (
                            <img src={selectedTxn.student.teacherInfo.avatar} alt={selectedTxn.student.teacherInfo.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold border border-indigo-200">
                              {selectedTxn.student.teacherInfo.name.charAt(0)}
                            </div>
                          )}
                          <div className="text-gray-900">
                            <p className="text-xs text-indigo-800 font-bold uppercase tracking-wider">Assigned Teacher</p>
                            <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedTxn.student.teacherInfo.name}</p>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-500 italic p-1">No assigned teacher found for this student.</div>
                      )}
                    </div>
                  </div>

                  {selectedTxn.paymentMethodDetails && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Payment Method</p>
                      <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{selectedTxn.paymentMethod?.replace("-", " ")} {selectedTxn.paymentMethodDetails}</p>
                    </div>
                  )}
                  {selectedTxn.notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Payment Notes / Remarks</p>
                      <p className="text-sm font-medium text-gray-950 mt-1">{selectedTxn.notes}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Money Receipt (MR) Number</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mrNumberInput}
                          onChange={e => setMrNumberInput(e.target.value)}
                          placeholder="e.g. MR-2026-001"
                          className="flex-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                        />
                        {mrNumberInput !== (selectedTxn.mrNumber || "") && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedTxn.status)}
                            disabled={updatingTxn}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors"
                          >
                            {updatingTxn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save MR"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Change Payment Status</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {["completed", "pending", "refunded", "failed", "cancelled"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={updatingTxn || selectedTxn.status === st}
                            onClick={() => handleUpdateStatus(st)}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg capitalize flex items-center justify-center gap-1 transition-all ${
                              selectedTxn.status === st
                                ? "bg-gray-200 text-gray-600 cursor-default border border-gray-300 font-bold"
                                : st === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white"
                                : st === "pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-600 hover:text-white"
                                : st === "refunded"
                                ? "bg-red-50 text-red-700 border border-red-300 hover:bg-red-600 hover:text-white"
                                : "bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-600 hover:text-white"
                            }`}
                          >
                            {updatingTxn && selectedTxn.status !== st ? null : null}
                            {st === selectedTxn.status ? `✓ ${st}` : st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={downloadingId === "modal-download"}
                      onClick={() => handleDownloadInvoice(selectedTxn, "modal-download", false)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {downloadingId === "modal-download" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{downloadingId === "modal-download" ? "Downloading..." : "Download PDF"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={downloadingId === "modal-print"}
                      onClick={() => handleDownloadInvoice(selectedTxn, "modal-print", true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {downloadingId === "modal-print" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                      <span>{downloadingId === "modal-print" ? "Opening Print..." : "Print Receipt"}</span>
                    </button>
                    <button
                      onClick={handleStartEdit}
                      className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit
                    </button>
                  </div>
                  <button onClick={() => setSelectedTxn(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Payment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-8 overflow-hidden">
            <form onSubmit={handleCreatePayment} className="flex flex-col h-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Record New Payment</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Enter transaction details manually.</p>
                </div>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {createFormError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                    <span>{createFormError}</span>
                  </div>
                )}
                {/* Searchable student dropdown */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Student *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search student name or ID..."
                      value={studentSearchQuery}
                      onChange={e => {
                        setStudentSearchQuery(e.target.value);
                        setIsStudentDropdownOpen(true);
                        if (!e.target.value) {
                          setSelectedStudentObj(null);
                          setCreateForm(prev => ({ ...prev, student: "" }));
                        }
                      }}
                      onFocus={() => setIsStudentDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsStudentDropdownOpen(false), 200)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                      required
                    />
                    {selectedStudentObj && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentObj(null);
                          setStudentSearchQuery("");
                          setCreateForm(prev => ({ ...prev, student: "" }));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isStudentDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 divide-y divide-gray-100 text-gray-805">
                      {studentsList.filter(s => 
                        s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                        (s.studentId && s.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                      ).length === 0 ? (
                        <div className="p-2 text-xs text-gray-500 text-center">No students found</div>
                      ) : (
                        studentsList.filter(s => 
                          s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                          (s.studentId && s.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                        ).map(student => (
                          <div
                            key={student._id}
                            onMouseDown={() => {
                              setSelectedStudentObj(student);
                              setStudentSearchQuery(student.fullName);
                              setCreateForm(prev => ({ 
                                ...prev, 
                                student: student._id,
                                course: student.course?._id || student.course || prev.course
                              }));
                              setIsStudentDropdownOpen(false);
                            }}
                            className="p-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-gray-950">{student.fullName}</p>
                              <p className="text-gray-500 text-[10px]">{student.email || "No email"}</p>
                            </div>
                            <span className="font-mono bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[10px]">
                              {student.studentId || "No ID"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Course select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Course</label>
                  <select
                    value={createForm.course}
                    onChange={e => setCreateForm(p => ({ ...p, course: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                  >
                    <option value="">No Course (Select to assign)</option>
                    {coursesList.map(course => (
                      <option key={course._id} value={course._id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (BDT) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={createForm.amount}
                      onChange={e => setCreateForm(p => ({ ...p, amount: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    />
                  </div>

                  {/* Month */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Month</label>
                    <select
                      value={createForm.month}
                      onChange={e => setCreateForm(p => ({ ...p, month: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    >
                      <option value="">No Target Month</option>
                      {MONTH_OPTIONS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                    <select
                      value={createForm.type}
                      onChange={e => setCreateForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    >
                      <option value="monthly-fee">Monthly Fee</option>
                      <option value="admission-fee">Admission Fee</option>
                      <option value="installment">Installment</option>
                      <option value="refund">Refund</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={createForm.status}
                      onChange={e => setCreateForm(p => ({ ...p, status: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Method</label>
                    <select
                      value={createForm.paymentMethod}
                      onChange={e => setCreateForm(p => ({ ...p, paymentMethod: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    >
                      <option value="credit-card">Credit Card</option>
                      <option value="bank-transfer">Bank Transfer</option>
                      <option value="paypal">PayPal</option>
                      <option value="cash">Cash</option>
                      <option value="mobile-banking">Mobile Banking</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={createForm.dueDate}
                      onChange={e => setCreateForm(p => ({ ...p, dueDate: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Payment Details */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Method Details</label>
                    <input
                      type="text"
                      placeholder="e.g. ending in 4242"
                      value={createForm.paymentMethodDetails}
                      onChange={e => setCreateForm(p => ({ ...p, paymentMethodDetails: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    />
                  </div>

                  {/* MR Number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">MR Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MR-2026-001"
                      value={createForm.mrNumber}
                      onChange={e => setCreateForm(p => ({ ...p, mrNumber: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={createForm.notes}
                    onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-955"
                    placeholder="Add remarks..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPayment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {creatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
