"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Banknote, Calendar, Loader2, Plus,
  AlertCircle, CheckCircle2, Clock, Calculator,
  Users, TrendingUp, DollarSign, UserCircle, Save, ShieldCheck,
  Lock, Unlock, Timer, Sparkles, Search, Filter,
  ArrowRight, Phone, Check, RefreshCw, Edit3, Trash2,
  Building2, CreditCard, Send, FileSpreadsheet, Eye, ChevronRight,
  History, Receipt, FileText, CheckCheck, Landmark, Briefcase, Tag, Shield
} from "lucide-react";

const KNOWN_PROVIDERS = [
  "Islami Bank Bangladesh PLC.",
  "bKash",
  "Nagad",
  "Rocket (DBBL)",
  "Dutch-Bangla Bank PLC.",
  "BRAC Bank PLC.",
  "The City Bank PLC.",
  "Sonali Bank PLC.",
  "Pubali Bank PLC.",
  "Eastern Bank PLC.",
  "United Commercial Bank (UCB)",
  "Al-Arafah Islami Bank PLC.",
  "First Security Islami Bank PLC.",
  "Shahjalal Islami Bank PLC.",
  "Social Islami Bank PLC.",
  "CellFin (IBBL)",
  "Upay",
  "Other"
];

export default function AdminSalaryPage() {
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"salary_sheet" | "payment_info" | "salary_history">("salary_sheet");
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [teacherHistory, setTeacherHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  // Selected employee for payment info & history
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    method: "Bank_Transfer",
    accountName: "",
    accountNumber: "",
    bankName: "Islami Bank Bangladesh PLC.",
    branchName: "",
    routingNumber: "",
    accountType: "Savings",
    customBankName: ""
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentToast, setPaymentToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Generate Salary Modal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [genEmpId, setGenEmpId] = useState("");
  const [genBaseSalary, setGenBaseSalary] = useState<number>(0);
  const [genBonus, setGenBonus] = useState<number>(0);
  const [genDeduction, setGenDeduction] = useState<number>(0);
  const [genNotes, setGenNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  // Live Payment Window Calculation (15th 00:00 to 28th 23:59)
  const calculateWindowStatus = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const openDate = new Date(year, month, 15, 0, 0, 0, 0);
    const closeDate = new Date(year, month, 28, 23, 59, 59, 999);

    let isOpen = false;
    let targetDate: Date;

    if (now >= openDate && now <= closeDate) {
      isOpen = true;
      targetDate = closeDate;
    } else if (now < openDate) {
      isOpen = false;
      targetDate = openDate;
    } else {
      isOpen = false;
      targetDate = new Date(year, month + 1, 15, 0, 0, 0, 0);
    }

    const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { isOpen, targetDate, days, hours, minutes, seconds };
  };

  const [windowInfo, setWindowInfo] = useState(calculateWindowStatus);

  useEffect(() => {
    const timer = setInterval(() => {
      setWindowInfo(calculateWindowStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize current month
  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(currentMonth);
  }, []);

  // Fetch data
  const fetchData = async (isRefresh = false, historyId = "") => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append("month", selectedMonth);
      if (historyId || selectedEmpId) params.append("historyEmployeeId", historyId || selectedEmpId);

      const res = await fetch(`/api/admin/salary?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setIsAdmin(data.isAdmin !== false);
        setCurrentUser(data.currentUser || null);
        setEmployees(data.employees || []);
        setSalaries(data.salaries || []);
        setTeacherHistory(data.teacherHistory || []);
        setSummary(data.summary || null);

        // If user is non-admin, default active tab to personal history or payment info
        if (data.isAdmin === false) {
          setActiveTab("salary_history");
        }

        // Auto select first employee
        if (!selectedEmpId && data.employees?.length > 0) {
          selectEmployee(data.employees[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching salary data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  }, [selectedMonth]);

  // When selecting employee (Teacher or Staff like Sadia - After Sales)
  const selectEmployee = (emp: any) => {
    if (!emp) return;
    setSelectedEmpId(emp._id);
    const pInfo = emp.paymentInfo || {};
    const isMobile = ["bKash", "Nagad", "Rocket", "Upay", "CellFin"].some(
      (m) => pInfo.bankName?.toLowerCase().includes(m.toLowerCase()) || pInfo.method?.toLowerCase().includes(m.toLowerCase())
    );

    let defaultBank = pInfo.bankName || "Islami Bank Bangladesh PLC.";
    let custom = "";
    if (!KNOWN_PROVIDERS.includes(defaultBank) && defaultBank !== "") {
      custom = defaultBank;
      defaultBank = "Other";
    }

    setPaymentForm({
      method: pInfo.method || (isMobile ? "bKash" : "Bank_Transfer"),
      accountName: pInfo.accountName || emp.fullName || "",
      accountNumber: pInfo.accountNumber || "",
      bankName: defaultBank,
      branchName: pInfo.branchName || "",
      routingNumber: pInfo.routingNumber || "",
      accountType: pInfo.accountType || (isMobile ? "Personal" : "Savings"),
      customBankName: custom,
    });

    fetchHistoryForEmployee(emp._id);
  };

  const fetchHistoryForEmployee = async (empId: string) => {
    try {
      const res = await fetch(`/api/admin/salary?historyEmployeeId=${empId}`);
      const data = await res.json();
      if (data.success && data.teacherHistory) {
        setTeacherHistory(data.teacherHistory);
      }
    } catch {}
  };

  const handleProviderChange = (newProvider: string) => {
    setPaymentForm((prev) => {
      let newMethod = prev.method;
      let newAccountType = prev.accountType;

      if (newProvider === "bKash" || newProvider === "Nagad" || newProvider === "Rocket (DBBL)" || newProvider === "Upay") {
        newMethod = newProvider.split(" ")[0];
        newAccountType = "Personal";
      } else if (newProvider !== "Other") {
        newMethod = "Bank_Transfer";
        newAccountType = "Savings";
      }
      return { ...prev, bankName: newProvider, method: newMethod, accountType: newAccountType };
    });
  };

  const handleSavePaymentInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId && isAdmin) {
      setPaymentToast({ text: "Please select an employee / teacher first.", type: "error" });
      return;
    }

    setSavingPayment(true);
    setPaymentToast(null);

    try {
      const finalBankName =
        paymentForm.bankName === "Other"
          ? paymentForm.customBankName.trim() || "Other Bank"
          : paymentForm.bankName || "Islami Bank Bangladesh PLC.";

      const payload = {
        action: "save_payment",
        employeeId: selectedEmpId || currentUser?._id,
        method: paymentForm.method,
        accountName: paymentForm.accountName,
        accountNumber: paymentForm.accountNumber,
        bankName: finalBankName,
        branchName: paymentForm.branchName,
        routingNumber: paymentForm.routingNumber,
        accountType: paymentForm.accountType || "Savings",
      };

      const res = await fetch("/api/admin/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setPaymentToast({ text: data.message || "Payment info saved successfully!", type: "success" });
        fetchData(true);
      } else {
        setPaymentToast({ text: data.message || "Failed to update payment info.", type: "error" });
      }
    } catch {
      setPaymentToast({ text: "Network error occurred.", type: "error" });
    } finally {
      setSavingPayment(false);
      setTimeout(() => setPaymentToast(null), 4000);
    }
  };

  const handleOpenGenerateModal = (emp?: any) => {
    if (emp) {
      setGenEmpId(emp._id);
      setGenBaseSalary(emp.salary || 0);
    } else if (employees.length > 0) {
      setGenEmpId(employees[0]._id);
      setGenBaseSalary(employees[0].salary || 0);
    }
    setGenBonus(0);
    setGenDeduction(0);
    setGenNotes("");
    setGenerateModalOpen(true);
  };

  const handleGenerateSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genEmpId || !selectedMonth) return;

    setGenerating(true);
    try {
      const calculatedAmount = Math.max(0, Number(genBaseSalary) + Number(genBonus) - Number(genDeduction));
      const payload = {
        action: "generate_salary",
        employeeId: genEmpId,
        month: selectedMonth,
        baseValue: Number(genBaseSalary),
        bonus: Number(genBonus),
        deduction: Number(genDeduction),
        calculatedAmount,
        notes: genNotes,
        status: "pending",
      };

      const res = await fetch("/api/admin/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setGenerateModalOpen(false);
        fetchData(true);
      } else {
        alert(data.message || "Failed to generate salary");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleTogglePaidStatus = async (salaryId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "paid" ? "pending" : "paid";
    try {
      const res = await fetch("/api/admin/salary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaryId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData(true);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDeleteSalary = async (salaryId: string) => {
    if (!confirm("Are you sure you want to delete this salary record?")) return;
    try {
      const res = await fetch(`/api/admin/salary?id=${salaryId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchData(true);
      }
    } catch (err) {
      console.error("Error deleting salary:", err);
    }
  };

  // Filtered salary records
  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      const name = s.employee?.fullName?.toLowerCase() || "";
      const code = s.employee?.code?.toLowerCase() || "";
      const dept = s.employee?.department?.toLowerCase() || "";
      const matchSearch =
        !searchQuery ||
        name.includes(searchQuery.toLowerCase()) ||
        code.includes(searchQuery.toLowerCase()) ||
        dept.includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const matchDept =
        deptFilter === "all" ||
        (deptFilter === "teacher" && s.type === "teacher") ||
        (deptFilter === "after_sales" && dept.includes("after sales")) ||
        (deptFilter === "staff" && s.type === "staff");

      return matchSearch && matchStatus && matchDept;
    });
  }, [salaries, searchQuery, statusFilter, deptFilter]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e._id === selectedEmpId) || (employees.length > 0 ? employees[0] : null);
  }, [employees, selectedEmpId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* ── Top Header with Brand Theme ────────────────────────────────────── */}
      <div className="bg-[#0B1A45] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-[#DFB76C]/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
              <span>{isAdmin ? "Admin Payroll Management" : "My Personal Salary Portal"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAdmin
                ? "Staff & Teacher Salary Hub"
                : `Salary & Payment Information — ${selectedEmployee?.fullName || "Employee"}`}
            </h1>
            <p className="text-sm text-white/75 max-w-xl">
              {isAdmin
                ? "Process monthly salaries, manage banking credentials, and review historical ledgers."
                : `Department: ${selectedEmployee?.department || "After Sales"} · Review your monthly salary slips and update payment credentials.`}
            </p>
          </div>

          {/* Month Selector & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
              <Calendar className="w-4 h-4 text-[#DFB76C] ml-2" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none pr-2 cursor-pointer"
              />
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>

            {isAdmin && (
              <button
                onClick={() => handleOpenGenerateModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#DFB76C] hover:bg-[#d4a856] text-[#0B1A45] text-xs sm:text-sm font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                Calculate Salary
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>{isAdmin ? "Total Gross" : "Base Salary"}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0B1A45] dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            ৳{(isAdmin ? summary?.totalGross : selectedEmployee?.salary)?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-gray-400 font-semibold">{selectedMonth}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>{isAdmin ? "Net Disbursable" : "Net Monthly Payout"}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
            ৳{(isAdmin ? summary?.totalNet : (teacherHistory[0]?.netAmount || selectedEmployee?.salary))?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-gray-400 font-semibold">After allowances & deductions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>{isAdmin ? "Paid Status" : "Current Month Status"}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400">
            {isAdmin ? `${summary?.paidCount || 0} Paid` : (teacherHistory[0]?.status?.toUpperCase() || "PENDING")}
          </p>
          <p className="text-[11px] text-amber-600 font-bold">{isAdmin ? `${summary?.pendingCount || 0} Pending` : "Verified status"}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>{isAdmin ? "Total Employees" : "Department"}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            {isAdmin ? employees.length : (selectedEmployee?.department || "Staff")}
          </p>
          <p className="text-[11px] text-gray-400 font-semibold">
            {isAdmin ? `${summary?.teachersCount || 0} Teachers · ${summary?.staffCount || 0} Staff` : (selectedEmployee?.employeeId || "Emp ID")}
          </p>
        </div>
      </div>

      {/* ── Live Payment Window Status Alert ──────────────────────────────── */}
      <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        windowInfo.isOpen
          ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          : "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            windowInfo.isOpen ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
          }`}>
            {windowInfo.isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                windowInfo.isOpen ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {windowInfo.isOpen ? "Payment Window Active" : "Payment Window Closed"}
              </span>
              <span className="text-xs text-gray-500 font-medium">15th to 28th Monthly Window</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-0.5">
              {windowInfo.isOpen
                ? "Payment information can be updated directly. Monthly statements are always accessible."
                : "Payment window closed for the month. Historical receipts are accessible."}
            </p>
          </div>
        </div>

        {/* Live Timer Badges */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="text-xs text-gray-500 font-bold mr-1">Time Left:</span>
          <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border font-mono text-xs font-extrabold text-[#0B1A45] dark:text-white shadow-2xs">
            {String(windowInfo.days).padStart(2, "0")}d
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border font-mono text-xs font-extrabold text-[#0B1A45] dark:text-white shadow-2xs">
            {String(windowInfo.hours).padStart(2, "0")}h
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border font-mono text-xs font-extrabold text-[#0B1A45] dark:text-white shadow-2xs">
            {String(windowInfo.minutes).padStart(2, "0")}m
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border font-mono text-xs font-extrabold text-[#0B1A45] dark:text-white shadow-2xs">
            {String(windowInfo.seconds).padStart(2, "0")}s
          </div>
        </div>
      </div>

      {/* ── Main View Switcher Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-2 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setActiveTab("salary_sheet")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "salary_sheet"
                  ? "bg-[#0B1A45] text-white shadow-md"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 hover:text-gray-900"
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Monthly Salary Sheet ({filteredSalaries.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("salary_history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "salary_history"
                ? "bg-[#0B1A45] text-white shadow-md"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 hover:text-gray-900"
            }`}
          >
            <History className="w-4 h-4 text-[#DFB76C]" />
            <span>{isAdmin ? "Previous Months History" : "My Previous Months Salary Statements"}</span>
          </button>

          <button
            onClick={() => setActiveTab("payment_info")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "payment_info"
                ? "bg-[#0B1A45] text-white shadow-md"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 hover:text-gray-900"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isAdmin ? "Insert / Update Payment Info" : "My Payment & Bank Information"}</span>
          </button>
        </div>

        {isAdmin && activeTab === "salary_sheet" && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#0B1A45]"
            >
              <option value="all">All Departments</option>
              <option value="teacher">Teachers Only</option>
              <option value="after_sales">After Sales</option>
              <option value="staff">Staff Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#0B1A45]"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid Only</option>
              <option value="pending">Pending Only</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#0B1A45]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── TAB 1: MONTHLY SALARY SHEET TABLE (Admin only) ──────────────────── */}
      {isAdmin && activeTab === "salary_sheet" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4">SL</th>
                  <th className="px-5 py-4">Employee / Role</th>
                  <th className="px-5 py-4">Payment Method & Account</th>
                  <th className="px-5 py-4">Base Gross</th>
                  <th className="px-5 py-4">Bonus / Allowances (+)</th>
                  <th className="px-5 py-4">Deductions (-)</th>
                  <th className="px-5 py-4">Net Payout</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0B1A45]" />
                      <p className="text-xs text-gray-400 mt-2 font-semibold">Loading salary sheet...</p>
                    </td>
                  </tr>
                ) : filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-gray-600">No salary records generated for {selectedMonth}.</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Calculate Salary" above to create or calculate monthly payroll.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSalaries.map((row, idx) => {
                    const emp = row.employee || {};
                    const pInfo = row.paymentInfo || {};

                    return (
                      <tr key={row._id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-bold text-gray-400 font-mono">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0B1A45]/10 text-[#0B1A45] font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {emp.avatar ? (
                                <img src={emp.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                              ) : (
                                emp.fullName?.charAt(0).toUpperCase() || "E"
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{emp.fullName || "Employee"}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-mono">{emp.code || "ID: N/A"}</span>
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-extrabold uppercase">
                                  {emp.department || emp.designation || "Staff"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-bold text-gray-800 dark:text-gray-200">
                              <Building2 className="w-3 h-3 text-[#0B1A45]" />
                              {pInfo.bankName || "Islami Bank PLC."}
                            </span>
                            <p className="text-[11px] text-gray-500 font-mono">
                              {pInfo.accountNumber ? `A/C: ${pInfo.accountNumber}` : "No A/C Added"}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">
                          ৳{Number(row.baseValue || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-600">
                          +৳{Number(row.bonus || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-rose-600">
                          -৳{Number(row.deduction || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 font-black text-sm text-[#0B1A45] dark:text-[#DFB76C]">
                          ৳{Number(row.netAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              row.status === "paid"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${row.status === "paid" ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTogglePaidStatus(row._id, row.status)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                row.status === "paid"
                                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                              }`}
                            >
                              {row.status === "paid" ? "Undo Pay" : "Mark as Paid"}
                            </button>
                            <button
                              onClick={() => {
                                const matchEmp = employees.find((e) => e._id === row.employeeId);
                                if (matchEmp) selectEmployee(matchEmp);
                                setActiveTab("salary_history");
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Past History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSalary(row._id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: PREVIOUS MONTHS SALARY HISTORY / STATEMENTS ───────────────── */}
      {activeTab === "salary_history" && (
        <div className={`grid grid-cols-1 ${isAdmin ? "lg:grid-cols-12" : "grid-cols-1"} gap-6`}>
          {/* Left: Employee Selection (Visible to Admin only) */}
          {isAdmin && (
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0B1A45]" />
                Select Employee ({employees.length})
              </h3>

              <div className="divide-y divide-gray-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto pr-1">
                {employees.map((e) => {
                  const isSelected = e._id === selectedEmpId;
                  return (
                    <button
                      key={e._id}
                      type="button"
                      onClick={() => selectEmployee(e)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between my-1 ${
                        isSelected
                          ? "bg-[#0B1A45] text-white shadow-md"
                          : "hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-[#0B1A45]"
                        }`}>
                          {e.avatar ? <img src={e.avatar} className="w-9 h-9 rounded-xl object-cover" alt="" /> : e.fullName?.charAt(0)}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs truncate">{e.fullName}</p>
                          <p className={`text-[10px] font-mono ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                            {e.department} · Base: ৳{e.salary || 0}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-white" : "text-gray-300"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right / Main: Past Months Timeline Table */}
          <div className={`${isAdmin ? "lg:col-span-8" : "w-full"} bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6`}>
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#0B1A45]" />
                  Monthly Salary Statements for:{" "}
                  <span className="text-[#0B1A45] dark:text-[#DFB76C] font-black">{selectedEmployee?.fullName || "Employee"}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Department: <span className="font-bold text-gray-700 dark:text-gray-300">{selectedEmployee?.department || "Staff"}</span> · Month-by-month financial ledger.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0B1A45] text-xs font-extrabold border border-blue-100">
                {teacherHistory.length} Past Statements
              </span>
            </div>

            {teacherHistory.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-600">No previous salary statements found for this employee.</p>
                <p className="text-xs text-gray-400 mt-1">Salary slips and disbursement records will appear here as each month is processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">Month</th>
                      <th className="px-4 py-3.5">Base Salary</th>
                      <th className="px-4 py-3.5">Bonus / Allowances (+)</th>
                      <th className="px-4 py-3.5">Deductions (-)</th>
                      <th className="px-4 py-3.5">Net Payout</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                    {teacherHistory.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-white font-mono flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#0B1A45]" />
                          {item.month}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-gray-700 dark:text-gray-300">
                          ৳{Number(item.baseValue || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-emerald-600">
                          +৳{Number(item.bonus || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-rose-600">
                          -৳{Number(item.deduction || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 font-black text-sm text-[#0B1A45] dark:text-[#DFB76C]">
                          ৳{Number(item.netAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              item.status === "paid"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 font-mono text-[11px]">
                          {item.paidAt ? new Date(item.paidAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: PAYMENT INFO SUBMISSION & DIRECTORY ──────────────────────── */}
      {activeTab === "payment_info" && (
        <div className={`grid grid-cols-1 ${isAdmin ? "lg:grid-cols-12" : "grid-cols-1"} gap-6`}>
          {/* Left Column: Employee Selector List (Visible to Admin only) */}
          {isAdmin && (
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0B1A45]" />
                Select Staff / Teacher ({employees.length})
              </h3>

              <div className="divide-y divide-gray-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto pr-1">
                {employees.map((e) => {
                  const isSelected = e._id === selectedEmpId;
                  const pInfo = e.paymentInfo || {};

                  return (
                    <button
                      key={e._id}
                      type="button"
                      onClick={() => selectEmployee(e)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between my-1 ${
                        isSelected
                          ? "bg-[#0B1A45] text-white shadow-md"
                          : "hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-[#0B1A45]"
                        }`}>
                          {e.avatar ? <img src={e.avatar} className="w-9 h-9 rounded-xl object-cover" alt="" /> : e.fullName?.charAt(0)}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs truncate">{e.fullName}</p>
                          <p className={`text-[10px] font-mono ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                            {e.department} · {pInfo.bankName || "No Bank Info"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-white" : "text-gray-300"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right / Main Column: Payment Info Submission Form */}
          <div className={`${isAdmin ? "lg:col-span-8" : "w-full"} bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6`}>
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0B1A45]" />
                  {isAdmin
                    ? `Submit Payment Details for: ${selectedEmployee?.fullName || "Employee"}`
                    : "My Bank & Mobile Money Information"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Department: <span className="font-bold text-gray-700 dark:text-gray-300">{selectedEmployee?.department || "After Sales"}</span> · Secure banking verification for automated payroll.
                </p>
              </div>
            </div>

            {paymentToast && (
              <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center gap-2.5 ${
                paymentToast.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}>
                {paymentToast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{paymentToast.text}</span>
              </div>
            )}

            <form onSubmit={handleSavePaymentInfo} className="space-y-4">
              {/* Payment Provider Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Bank or Mobile Money Provider *
                </label>
                <select
                  value={paymentForm.bankName}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-xs font-semibold bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0B1A45]"
                >
                  {KNOWN_PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {paymentForm.bankName === "Other" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Custom Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom bank name..."
                    value={paymentForm.customBankName}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, customBankName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0B1A45]"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sadia Sultana"
                    value={paymentForm.accountName}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, accountName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0B1A45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Account / Mobile Wallet Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20501234567890 or 017XXXXXXXX"
                    value={paymentForm.accountNumber}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0B1A45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Branch Name (If Bank)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Principal Branch, Dhaka"
                    value={paymentForm.branchName}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, branchName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0B1A45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Routing Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 125271234"
                    value={paymentForm.routingNumber}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, routingNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0B1A45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Type
                  </label>
                  <select
                    value={paymentForm.accountType}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, accountType: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-semibold bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0B1A45]"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                    <option value="Personal">Personal (Mobile Money)</option>
                    <option value="Agent">Agent</option>
                    <option value="Salary">Salary</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-6 py-2.5 rounded-xl bg-[#0B1A45] hover:bg-[#132B66] text-white text-xs font-extrabold shadow-md shadow-[#0B1A45]/20 flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Payment Information</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CALCULATE / GENERATE SALARY MODAL (Admin only) ─────────────────── */}
      {isAdmin && generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#0B1A45]" />
                Generate / Calculate Salary ({selectedMonth})
              </h3>
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateSalarySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Employee / Role *</label>
                <select
                  value={genEmpId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setGenEmpId(id);
                    const selected = employees.find((x) => x._id === id);
                    if (selected) setGenBaseSalary(selected.salary || 0);
                  }}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border text-xs font-semibold bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0B1A45]"
                >
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.fullName} ({e.department}) - Base: ৳{e.salary || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Base Salary (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={genBaseSalary}
                    onChange={(e) => setGenBaseSalary(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-gray-50 dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1.5">Bonus (+ ৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={genBonus}
                    onChange={(e) => setGenBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-emerald-50 text-emerald-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1.5">Deduction (- ৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={genDeduction}
                    onChange={(e) => setGenDeduction(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-rose-50 text-rose-800 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600">Net Calculated Payout:</span>
                <span className="text-base font-black text-[#0B1A45] dark:text-[#DFB76C]">
                  ৳{Math.max(0, Number(genBaseSalary) + Number(genBonus) - Number(genDeduction)).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly salary + performance bonus"
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-gray-50 dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 rounded-xl bg-[#0B1A45] hover:bg-[#132B66] text-white text-xs font-bold shadow-md shadow-[#0B1A45]/20 flex items-center gap-1.5 disabled:opacity-60"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save & Generate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
