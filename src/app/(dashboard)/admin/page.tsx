"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  DollarSign,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ClipboardCheck,
  Banknote,
  FileSpreadsheet,
  Star,
  Bot,
  ArrowRight,
  BarChart2,
  Activity,
  Award,
  CalendarDays,
  MessageSquare,
  Crown,
  Shield,
  Bell,
  Mail,
  Settings,
  UserCog,
  CalendarCheck,
  FileText,
  Server,
  ScrollText,
  Users2,
  PlusCircle,
  CheckCircle2,
  Layers,
  Search,
  ExternalLink,
  ClipboardList,
  UserCheck,
  PieChart as PieChartIcon,
  Coins,
  Filter,
  Wallet,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 dark:bg-slate-800 rounded-lg ${className}`} />;
}

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    red: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[color] || map["gray"]}`}>
      {label}
    </span>
  );
}

function StatCard({
  label, value, subtext, icon: Icon, gradient, href, loading,
}: {
  label: string; value: string | number; subtext?: string;
  icon: any; gradient: string; href: string; loading?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient} shadow-sm border border-white/20 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
        <div className="flex items-start justify-between">
          <div className="bg-white/25 p-2.5 rounded-xl">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-all" />
        </div>
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-8 w-24 bg-white/30" />
          ) : (
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          )}
          <p className="text-sm text-white/80 mt-1 font-medium">{label}</p>
          {subtext && <p className="text-xs text-white/60 mt-0.5">{subtext}</p>}
        </div>
      </div>
    </Link>
  );
}

function QuickAction({ label, href, icon: Icon, color }: {
  label: string; href: string; icon: any; color: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5 ${color}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ─── CRM In-Charge Pie Chart Section Component ─────────────────────────────────

const CRM_PIE_COLORS = [
  "#2563eb", // Blue
  "#7c3aed", // Violet
  "#059669", // Emerald
  "#d97706", // Amber
  "#db2777", // Pink
  "#0891b2", // Cyan
  "#4f46e5", // Indigo
  "#ea580c", // Orange
  "#65a30d", // Lime
  "#9333ea", // Purple
  "#64748b", // Slate (Unassigned)
];

function CrmInChargePieChartSection() {
  const [metric, setMetric] = useState<"count" | "total" | "admission" | "monthly">("count");

  // Default to Current Month (e.g. "2026-8")
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  });

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Month selector options (Current month first, followed by past months, and All Time)
  const monthOptions = useMemo(() => {
    const options: { label: string; value: string; month: string; year: string }[] = [];
    const now = new Date();
    const currentM = now.getMonth() + 1;
    const currentY = now.getFullYear();

    // 1. Current Month (Default)
    const currentLabel = `${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })} (Current Month)`;
    options.push({
      label: currentLabel,
      value: `${currentY}-${currentM}`,
      month: String(currentM),
      year: String(currentY),
    });

    // 2. Previous 2 months
    for (let i = 1; i < 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      options.push({ label, value: `${y}-${m}`, month: String(m), year: String(y) });
    }

    // 3. All Time option
    options.push({ label: "All Time (Cumulative)", value: "all-all", month: "all", year: "all" });

    return options;
  }, []);

  const fetchCrmStats = useCallback(async () => {
    setLoading(true);
    try {
      const currentOpt = monthOptions.find((o) => o.value === selectedPeriod) || monthOptions[0];
      const res = await fetch(`/api/dashboard/crm-stats?month=${currentOpt.month}&year=${currentOpt.year}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Error fetching CRM in-charge stats:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, monthOptions]);

  useEffect(() => {
    fetchCrmStats();
  }, [fetchCrmStats]);

  const items = data?.items || [];
  const totals = data?.totals || {
    totalStudents: 0,
    totalAdmissionFee: 0,
    totalMonthlyFee: 0,
    totalAmount: 0,
    totalMonthlyDue: 0,
  };

  // Prepare Pie Chart data according to selected metric
  const pieData = useMemo(() => {
    return items
      .map((item: any) => {
        let val = 0;
        if (metric === "count") val = item.studentCount;
        else if (metric === "total") val = item.totalAmount;
        else if (metric === "admission") val = item.admissionFee;
        else if (metric === "monthly") val = item.monthlyFee;

        return {
          name: item.crmName,
          value: val,
          raw: item,
        };
      })
      .filter((d: any) => d.value > 0);
  }, [items, metric]);

  const activeTotalValue = useMemo(() => {
    if (metric === "count") return `${totals.totalStudents} Students`;
    if (metric === "total") return `৳${totals.totalAmount.toLocaleString()} BDT`;
    if (metric === "admission") return `৳${totals.totalAdmissionFee.toLocaleString()} BDT`;
    if (metric === "monthly") return `৳${totals.totalMonthlyFee.toLocaleString()} BDT`;
    return "";
  }, [metric, totals]);

  const activeMetricLabel = useMemo(() => {
    if (metric === "count") return "Students In Charge";
    if (metric === "total") return "Total Financial Value (BDT)";
    if (metric === "admission") return "Admission Fees Collected (BDT)";
    if (metric === "monthly") return "Monthly Fees Expected (BDT)";
    return "";
  }, [metric]);

  // Custom Pie Tooltip with solid background and crisp layout
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0];
      const raw = pData.payload?.raw;
      if (!raw) return null;
      const countPct = totals.totalStudents > 0 ? ((raw.studentCount / totals.totalStudents) * 100).toFixed(1) : "0";
      const amountPct = totals.totalAmount > 0 ? ((raw.totalAmount / totals.totalAmount) * 100).toFixed(1) : "0";

      return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2.5 min-w-[220px] pointer-events-none z-50 ring-1 ring-black/5">
          <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-slate-800 pb-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
              {(raw.crmName || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 dark:text-white truncate">{raw.crmName}</p>
              <p className="text-[10px] text-gray-400 font-medium">CRM In-Charge</p>
            </div>
          </div>
          <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Students:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {raw.studentCount} <span className="text-gray-400 font-normal">({countPct}%)</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Admission Fee:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">৳{raw.admissionFee.toLocaleString()} BDT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Monthly Fee:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">৳{raw.monthlyFee.toLocaleString()} BDT</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 dark:border-slate-800 font-bold">
              <span className="text-gray-900 dark:text-white">Total Amount:</span>
              <span className="text-purple-600 dark:text-purple-400 font-mono">৳{raw.totalAmount.toLocaleString()} BDT ({amountPct}%)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-6">

      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                CRM In-Charge Distribution
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40">
                  Monthly Analytics
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Student count and fee breakdown (Admission + Monthly) across assigned CRM in-charge staff.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Month Filter & Metric Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Picker */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none pl-8 pr-8 py-2 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <CalendarDays className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Metric Switcher */}
          <div className="flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setMetric("count")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${metric === "count"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              title="View by Student Count"
            >
              <Users className="w-3 h-3" />
              <span>Student Count</span>
            </button>
            <button
              onClick={() => setMetric("total")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${metric === "total"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              title="View by Total Amount (Admission + Monthly)"
            >
              <Coins className="w-3 h-3" />
              <span>Total Amount (৳ BDT)</span>
            </button>
            <button
              onClick={() => setMetric("admission")}
              className={`px-3 py-1.5 rounded-lg transition-all hidden sm:flex items-center gap-1.5 ${metric === "admission"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              title="View by Admission Fee"
            >
              <span>Admission (৳ BDT)</span>
            </button>
            <button
              onClick={() => setMetric("monthly")}
              className={`px-3 py-1.5 rounded-lg transition-all hidden sm:flex items-center gap-1.5 ${metric === "monthly"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              title="View by Monthly Fee"
            >
              <span>Monthly Fee (৳ BDT)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards with Info Hover Explanations ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Total Students */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3.5 relative">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Total Students</p>
            <div className="group relative inline-flex items-center">
              <Info className="w-3.5 h-3.5 text-blue-400 hover:text-blue-600 dark:text-blue-500 cursor-help transition-colors" />
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-2xl text-[11px] leading-relaxed z-50 border border-slate-700/50 dark:border-slate-200">
                <p className="font-bold border-b border-white/10 dark:border-slate-200 pb-1 mb-1.5 text-blue-300 dark:text-blue-600">
                  Total Students In Period
                </p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mb-1.5">
                  Count of all students created or admitted within the selected month (or all time).
                </p>
                <div className="bg-white/10 dark:bg-slate-100 p-1.5 rounded text-[10px] font-mono text-emerald-300 dark:text-emerald-700">
                  <span className="font-semibold text-gray-200 dark:text-gray-800">Formula: </span>
                  Sum of student records matching month
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {loading ? "..." : totals.totalStudents.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Assigned to CRM in-charge</p>
        </div>

        {/* Card 2: Admission Fees */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3.5 relative">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Admission Fees</p>
            <div className="group relative inline-flex items-center">
              <Info className="w-3.5 h-3.5 text-emerald-400 hover:text-emerald-600 dark:text-emerald-500 cursor-help transition-colors" />
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-2xl text-[11px] leading-relaxed z-50 border border-slate-700/50 dark:border-slate-200">
                <p className="font-bold border-b border-white/10 dark:border-slate-200 pb-1 mb-1.5 text-emerald-300 dark:text-emerald-600">
                  Total Admission Fees
                </p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mb-1.5">
                  Sum of one-time registration / admission fees across all students admitted in this period.
                </p>
                <div className="bg-white/10 dark:bg-slate-100 p-1.5 rounded text-[10px] font-mono text-emerald-300 dark:text-emerald-700">
                  <span className="font-semibold text-gray-200 dark:text-gray-800">Formula: </span>
                  ∑ (student.admissionFee)
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {loading ? "..." : `৳${totals.totalAdmissionFee.toLocaleString()} BDT`}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">One-time registration</p>
        </div>

        {/* Card 3: Monthly Fees */}
        <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-xl p-3.5 relative">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">Monthly Fees</p>
            <div className="group relative inline-flex items-center">
              <Info className="w-3.5 h-3.5 text-violet-400 hover:text-violet-600 dark:text-violet-500 cursor-help transition-colors" />
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-2xl text-[11px] leading-relaxed z-50 border border-slate-700/50 dark:border-slate-200">
                <p className="font-bold border-b border-white/10 dark:border-slate-200 pb-1 mb-1.5 text-violet-300 dark:text-violet-600">
                  Total Monthly Recurring Fees
                </p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mb-1.5">
                  Expected monthly tuition billing generated from this batch of students.
                </p>
                <div className="bg-white/10 dark:bg-slate-100 p-1.5 rounded text-[10px] font-mono text-emerald-300 dark:text-emerald-700">
                  <span className="font-semibold text-gray-200 dark:text-gray-800">Formula: </span>
                  ∑ (student.monthlyFee)
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {loading ? "..." : `৳${totals.totalMonthlyFee.toLocaleString()} BDT`}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Expected monthly billing</p>
        </div>

        {/* Card 4: Total Combined */}
        <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3.5 relative">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Total Combined</p>
            <div className="group relative inline-flex items-center">
              <Info className="w-3.5 h-3.5 text-purple-400 hover:text-purple-600 dark:text-purple-500 cursor-help transition-colors" />
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-2xl text-[11px] leading-relaxed z-50 border border-slate-700/50 dark:border-slate-200">
                <p className="font-bold border-b border-white/10 dark:border-slate-200 pb-1 mb-1.5 text-purple-300 dark:text-purple-600">
                  Total Financial Value
                </p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mb-1.5">
                  Combined gross revenue volume of admission fees plus recurring monthly fees.
                </p>
                <div className="bg-white/10 dark:bg-slate-100 p-1.5 rounded text-[10px] font-mono text-emerald-300 dark:text-emerald-700">
                  <span className="font-semibold text-gray-200 dark:text-gray-800">Formula: </span>
                  Admission Fees + Monthly Fees
                </div>
                <div className="absolute top-full right-2 sm:left-1/2 sm:-translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
              </div>
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {loading ? "..." : `৳${totals.totalAmount.toLocaleString()} BDT`}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Admission + Monthly</p>
        </div>
      </div>

      {/* ── Main Chart & Breakdown Section ── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <Skeleton className="w-56 h-56 rounded-full" />
          </div>
          <div className="lg:col-span-7 space-y-2.5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : pieData.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
          <UserCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No CRM student data found for this period</p>
          <p className="text-xs text-gray-400 mt-1">Try switching to &quot;All Time&quot; or selecting a different month.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

          {/* Pie Chart Donut (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="w-full h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={<CustomPieTooltip />}
                    wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={102}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {pieData.map((entry: any, index: number) => {
                      const isHovered = hoveredIndex === index;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={CRM_PIE_COLORS[index % CRM_PIE_COLORS.length]}
                          opacity={hoveredIndex === null || isHovered ? 1 : 0.35}
                          stroke={isHovered ? "#ffffff" : "transparent"}
                          strokeWidth={2}
                          className="transition-all duration-200 cursor-pointer outline-none"
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label — Smoothly fades out when hovering over slices to prevent text overlap */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4 transition-all duration-200 ${hoveredIndex !== null ? "opacity-0 scale-90" : "opacity-100 scale-100"
                  }`}
              >
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {metric === "count" ? "Total Count" : "Total (৳ BDT)"}
                </span>
                <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight mt-0.5">
                  {activeTotalValue}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                  {pieData.length} CRM Staff
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-1">
              Showing distribution by <span className="font-semibold text-gray-700 dark:text-gray-300">{activeMetricLabel}</span>
            </p>
          </div>

          {/* CRM List Breakdown (7 cols) */}
          <div className="lg:col-span-7 space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {items.map((item: any, idx: number) => {
              const color = CRM_PIE_COLORS[idx % CRM_PIE_COLORS.length];
              const isHovered = hoveredIndex === idx;
              const countPct = totals.totalStudents > 0 ? ((item.studentCount / totals.totalStudents) * 100).toFixed(1) : "0";
              const amountPct = totals.totalAmount > 0 ? ((item.totalAmount / totals.totalAmount) * 100).toFixed(1) : "0";

              return (
                <div
                  key={item.crmId}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all duration-150 ${isHovered
                      ? "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm"
                      : "border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 bg-gray-50/40 dark:bg-slate-800/40"
                    }`}
                >
                  {/* Left: CRM info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {(item.crmName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {item.crmName}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {item.crmEmail || (item.crmId === "unassigned" ? "Students without CRM" : "CRM Staff")}
                      </p>
                    </div>
                  </div>

                  {/* Right: Metrics */}
                  <div className="flex items-center gap-4 mt-2 sm:mt-0 justify-between sm:justify-end text-xs">
                    {/* Student count pill */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span>{item.studentCount} Students</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">({countPct}% share)</span>
                    </div>

                    {/* Fees Breakdown */}
                    <div className="text-right pl-3 border-l border-gray-200 dark:border-slate-700">
                      <div className="font-bold text-gray-900 dark:text-white">
                        ৳{item.totalAmount.toLocaleString()} BDT
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Adm: <span className="text-emerald-600 dark:text-emerald-400 font-medium">৳{item.admissionFee.toLocaleString()} BDT</span> · Mo: <span className="text-blue-600 dark:text-blue-400 font-medium">৳{item.monthlyFee.toLocaleString()} BDT</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}

interface SubRoute {
  name: string;
  href: string;
  icon?: any;
  badge?: string;
  permission?: string;
}

interface ModuleCardProps {
  title: string;
  description: string;
  icon: any;
  href: string;
  iconColor: string;
  iconBg: string;
  accentBorder: string;
  subRoutes: SubRoute[];
  permission?: string;
  children?: React.ReactNode;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [chartData, setChartData] = useState<any>({
    weeklyData: [],
    monthlyDailyData: [],
    teacherActivityData: [],
    weeklyStudentData: [],
    monthlyStudentData: [],
  });
  const [enrollPeriod, setEnrollPeriod] = useState<"weekly" | "monthly">("weekly");
  const [revenuePeriod, setRevenuePeriod] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Section module data
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const fetchMain = useCallback(async () => {
    setLoading(true);
    setChartLoading(true);
    try {
      const [mainRes, userRes] = await Promise.all([
        fetch("/api/dashboard/stats?type=all"),
        fetch("/api/auth/me"),
      ]);
      const [mainData, userData] = await Promise.all([
        mainRes.json(), userRes.json(),
      ]);
      if (mainData.success) {
        if (mainData.kpis) setKpis(mainData.kpis);
        if (mainData.chartData) setChartData(mainData.chartData);
      }
      if (userData.success) setUser(userData.user);
    } catch (err) {
      console.error("Dashboard data error:", err);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    setSectionsLoading(true);
    try {
      const results = await Promise.allSettled([
        fetch("/api/students?limit=5").then((r) => r.json()),
        fetch("/api/teachers?limit=5").then((r) => r.json()),
      ]);
      const [studRes, teachRes] = results;
      if (studRes.status === "fulfilled" && studRes.value?.success) setStudents(studRes.value.students || []);
      if (teachRes.status === "fulfilled" && teachRes.value?.success) setTeachers(teachRes.value.teachers || []);
    } catch (err) {
      console.error("Section data error:", err);
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMain();
    fetchSections();
  }, [fetchMain, fetchSections]);

  const hasPerm = useCallback((perm?: string) => {
    if (!perm) return true;
    if (!user) return false;
    if (user.permissions?.includes("*")) return true;
    return user.permissions?.includes(perm);
  }, [user]);

  const handleRefresh = () => {
    fetchMain();
    fetchSections();
  };

  const statCards = [
    { label: "Active Students", value: loading ? "—" : (kpis?.activeStudents?.toLocaleString() ?? "—"), subtext: `of ${kpis?.totalStudents?.toLocaleString() ?? "?"} total`, icon: Users, gradient: "bg-gradient-to-br from-blue-500 to-blue-700", href: "/students" },
    { label: "Total Teachers", value: loading ? "—" : (kpis?.totalTeachers?.toLocaleString() ?? "—"), subtext: `${kpis?.activeTeachers?.toLocaleString() ?? "?"} active`, icon: GraduationCap, gradient: "bg-gradient-to-br from-violet-500 to-violet-700", href: "/teachers" },
    { label: "Monthly Revenue", value: loading ? "—" : `৳${kpis?.monthlyRevenue?.toLocaleString() ?? "0"} BDT`, subtext: "Completed this month", icon: Banknote, gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700", href: "/finance" },
    { label: "Avg Rating", value: loading ? "—" : (kpis?.avgTeacherRating && kpis.avgTeacherRating !== "N/A" ? `${kpis.avgTeacherRating}/5` : "N/A"), subtext: "Teacher average", icon: Star, gradient: "bg-gradient-to-br from-rose-500 to-pink-600", href: "/teachers" },
  ];

  const studentBarData = enrollPeriod === "weekly" ? (chartData?.weeklyStudentData || []) : (chartData?.monthlyStudentData || []);
  const revenueData = revenuePeriod === "weekly" ? (chartData?.weeklyData || []) : (chartData?.monthlyDailyData || []);
  const teacherData = chartData?.teacherActivityData || [];

  // ─── Complete List of All Modules & Sub-routes under (dashboard) ─────────────
  const allModules: ModuleCardProps[] = [
    {
      title: "Student CRM & Experience",
      description: "Manage student profiles, enrollments, admissions, and feedback.",
      icon: Users,
      href: "/students",
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      accentBorder: "border-blue-100 dark:border-blue-900/40",
      permission: "student-crm",
      subRoutes: [
        { name: "Student Directory", href: "/students", icon: Users, permission: "student-crm" },
        { name: "Add New Student", href: "/students/add", icon: PlusCircle, badge: "Action", permission: "student-crm" },
        { name: "Student Feedback", href: "/feedback", icon: Star, permission: "student-feedback" },
      ],
      children: (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Recent Students</p>
          {sectionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-xs text-gray-400">No students recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {students.slice(0, 3).map((s: any) => (
                <div key={s._id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px]">
                      {(s.fullName || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{s.fullName}</span>
                  </div>
                  <Badge label={s.status || "active"} color={s.status === "active" ? "green" : s.status === "at-risk" ? "red" : "gray"} />
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Teacher Management & Faculty",
      description: "Teacher directory, schedules, categories, salaries, payment info, and gems.",
      icon: GraduationCap,
      href: "/teachers",
      iconColor: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      accentBorder: "border-violet-100 dark:border-violet-900/40",
      permission: "teacher-management",
      subRoutes: [
        { name: "Teacher List", href: "/teachers", icon: Users, permission: "teacher-management" },
        { name: "Add Teacher", href: "/teachers/add", icon: PlusCircle, badge: "Action", permission: "teacher-management" },
        { name: "Teacher Schedule", href: "/teachers/schedule", icon: CalendarDays, permission: "teacher-schedule" },
        { name: "Teacher Category", href: "/teachers/category", icon: Shield, permission: "teacher-category" },
        { name: "Teacher Salaries", href: "/teachers/salary", icon: Banknote, permission: "teacher-salaries" },
        { name: "Salary Reports", href: "/teachers/salary/reports", icon: FileSpreadsheet, permission: "teacher-salaries" },
        { name: "Payment Info", href: "/teachers/payment-info", icon: FileSpreadsheet, permission: "teacher-payment-info" },
        { name: "Gems Management", href: "/teachers/gems", icon: Star, permission: "teacher-gems" },
      ],
      children: (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Faculty Highlights</p>
          {sectionsLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : teachers.length === 0 ? (
            <p className="text-xs text-gray-400">No teachers found.</p>
          ) : (
            <div className="space-y-2">
              {teachers.slice(0, 2).map((t: any) => (
                <div key={t._id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-[10px]">
                      {(t.fullName || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{t.fullName}</span>
                  </div>
                  <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                    <Star className="w-3 h-3" /> {t.rating?.toFixed(1) || "N/A"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Classes & Curriculum",
      description: "Classrooms overview, class reports, scheduling, and course catalog management.",
      icon: CalendarDays,
      href: "/classes",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      accentBorder: "border-emerald-100 dark:border-emerald-900/40",
      permission: "classrooms",
      subRoutes: [
        { name: "Classes Overview", href: "/classes", icon: CalendarDays, permission: "classrooms" },
        { name: "Class Reports", href: "/classes/reports", icon: ClipboardCheck, permission: "classrooms" },
        { name: "Course Management", href: "/courses", icon: BookOpen, permission: "course-management" },
      ],
      children: (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center">
          <Link href="/classes" className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
            <p className="text-xs text-gray-500 dark:text-gray-400">Classrooms</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">Live Sessions</p>
          </Link>
          <Link href="/courses" className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
            <p className="text-xs text-gray-500 dark:text-gray-400">Curricula</p>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mt-0.5">Course Catalog</p>
          </Link>
        </div>
      ),
    },
    {
      title: "Staff & HR Operations",
      description: "Staff directory, attendance tracking, leave approvals, payroll, daily reports & activities.",
      icon: UserCog,
      href: "/staff-management",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
      accentBorder: "border-indigo-100 dark:border-indigo-900/40",
      permission: "staff-management",
      subRoutes: [
        { name: "Staff Directory", href: "/staff-management", icon: Users, permission: "staff-management" },
        { name: "Attendance", href: "/staff-management/attendance", icon: CalendarCheck, permission: "staff-attendance" },
        { name: "Leave Requests", href: "/staff-management/leave", icon: FileText, permission: "staff-leave" },
        { name: "Staff Payroll", href: "/staff-management/payroll", icon: Banknote, permission: "staff-payroll" },
        { name: "Daily Reports", href: "/staff-management/daily-reports", icon: ClipboardList, permission: "daily-reports" },
        { name: "Activity Logs", href: "/staff-management/activities", icon: Activity, permission: "activity-logs" },
      ],
      children: (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
          <Link href="/staff-management/leave" className="hover:text-indigo-600 font-medium flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-indigo-500" /> Pending Leaves
          </Link>
          <Link href="/staff-management/attendance" className="hover:text-indigo-600 font-medium flex items-center gap-1">
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" /> Today Attendance
          </Link>
        </div>
      ),
    },
    {
      title: "Finance, Billing & Payroll",
      description: "Financial tracking, fee invoicing, monthly salary breakdowns, and payroll reports.",
      icon: DollarSign,
      href: "/finance",
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      accentBorder: "border-amber-100 dark:border-amber-900/40",
      permission: "finance-billing",
      subRoutes: [
        { name: "Finance Dashboard", href: "/finance", icon: DollarSign, permission: "finance-billing" },
        { name: "Monthly Salary Report", href: "/salary-reports/monthly", icon: FileSpreadsheet, permission: "salary-report" },
        { name: "Teacher Salaries", href: "/teachers/salary", icon: Banknote, permission: "teacher-salaries" },
        { name: "Staff Payroll", href: "/staff-management/payroll", icon: Banknote, permission: "staff-payroll" },
      ],
      children: (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Revenue</p>
            <p className="text-base font-bold text-amber-700 dark:text-amber-400">{loading ? "—" : `৳${kpis?.monthlyRevenue?.toLocaleString() ?? "0"} BDT`}</p>
          </div>
          <Link href="/salary-reports/monthly" className="text-xs font-semibold px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
            Monthly Report
          </Link>
        </div>
      ),
    },
    {
      title: "Support & Communication",
      description: "Customer service tickets, global notice board, student feedback, and email campaigns.",
      icon: MessageSquare,
      href: "/support",
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-50 dark:bg-rose-950/40",
      accentBorder: "border-rose-100 dark:border-rose-900/40",
      permission: "support-tickets",
      subRoutes: [
        { name: "Support Tickets", href: "/support", icon: MessageSquare, permission: "support-tickets" },
        { name: "Global Notices", href: "/notices", icon: Bell, permission: "notice-board" },
        { name: "Email Management", href: "/emails", icon: Mail, permission: "email-management" },
        { name: "Student Feedback", href: "/feedback", icon: Star, permission: "student-feedback" },
      ],
      children: (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
          <Link href="/notices" className="hover:text-rose-600 font-medium flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 text-amber-500" /> Post Notice
          </Link>
          <Link href="/emails" className="hover:text-rose-600 font-medium flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-blue-500" /> Send Email
          </Link>
        </div>
      ),
    },
    {
      title: "Executive & Governance",
      description: "Executive CEO requests, role assignments, security permissions, and app settings.",
      icon: Crown,
      href: "/ceo-requests",
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-50 dark:bg-purple-950/40",
      accentBorder: "border-purple-100 dark:border-purple-900/40",
      permission: "ceo-requests",
      subRoutes: [
        { name: "CEO Requests", href: "/ceo-requests", icon: Crown, permission: "ceo-requests" },
        { name: "Roles & Permissions", href: "/roles", icon: Shield, permission: "roles-permissions" },
        { name: "System Settings", href: "/settings", icon: Settings, permission: "settings" },
      ],
      children: (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
          <Link href="/roles" className="hover:text-purple-600 font-medium flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-purple-500" /> Manage Roles
          </Link>
          <Link href="/settings" className="hover:text-purple-600 font-medium flex items-center gap-1">
            <Settings className="w-3.5 h-3.5 text-gray-500" /> Preferences
          </Link>
        </div>
      ),
    },
    {
      title: "System Diagnostics & Analytics",
      description: "Monitor server health, audit trails, and academy visitor traffic statistics.",
      icon: Server,
      href: "/system-health",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
      accentBorder: "border-cyan-100 dark:border-cyan-900/40",
      permission: "system-logs",
      subRoutes: [
        { name: "System Health", href: "/system-health", icon: Activity, permission: "system-health" },
        { name: "Audit Logs", href: "/audit-logs", icon: ScrollText, permission: "audit-logs" },
        { name: "Visitor Stats", href: "/visitor-stats", icon: Users2, permission: "visitor-stats" },
      ],
      children: (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> All Systems Operational
          </span>
          <Link href="/audit-logs" className="hover:text-cyan-600 font-medium flex items-center gap-1">
            <ScrollText className="w-3.5 h-3.5" /> View Logs
          </Link>
        </div>
      ),
    },
  ];

  // Filter modules based on permissions and search query
  const visibleModules = useMemo(() => {
    return allModules.filter((mod) => {
      const parentPermOk = hasPerm(mod.permission);
      const anySubPermOk = mod.subRoutes.some((sub) => hasPerm(sub.permission));
      if (!parentPermOk && !anySubPermOk) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchTitle = mod.title.toLowerCase().includes(q);
      const matchDesc = mod.description.toLowerCase().includes(q);
      const matchSub = mod.subRoutes.some((s) => s.name.toLowerCase().includes(q) || s.href.toLowerCase().includes(q));

      return matchTitle || matchDesc || matchSub;
    });
  }, [allModules, hasPerm, searchQuery]);

  return (
    <div className="space-y-8 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Operations & Administration Hub
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Comprehensive control center for all Fajr Academy ERP modules, schedules, and operations.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search module or route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {/* ── Quick Actions Launchpad ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" /> Quick Launchpad
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">Instant shortcuts</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {hasPerm("student-crm") && (
            <QuickAction label="New Student" href="/students/add" icon={PlusCircle} color="border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100" />
          )}
          {hasPerm("teacher-management") && (
            <QuickAction label="Add Teacher" href="/teachers/add" icon={GraduationCap} color="border-violet-200 dark:border-violet-900/50 text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100" />
          )}
          {hasPerm("classrooms") && (
            <QuickAction label="Live Classes" href="/classes" icon={CalendarDays} color="border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100" />
          )}
          {hasPerm("course-management") && (
            <QuickAction label="Courses" href="/courses" icon={BookOpen} color="border-cyan-200 dark:border-cyan-900/50 text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100" />
          )}
          {hasPerm("staff-management") && (
            <QuickAction label="Staff HR" href="/staff-management" icon={UserCog} color="border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100" />
          )}
          {hasPerm("finance-billing") && (
            <QuickAction label="Finance" href="/finance" icon={DollarSign} color="border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100" />
          )}
          {hasPerm("salary-report") && (
            <QuickAction label="Salary Reports" href="/salary-reports/monthly" icon={FileSpreadsheet} color="border-lime-200 dark:border-lime-900/50 text-lime-700 dark:text-lime-400 bg-lime-50 dark:bg-lime-950/30 hover:bg-lime-100" />
          )}
          {hasPerm("support-tickets") && (
            <QuickAction label="Support" href="/support" icon={MessageSquare} color="border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100" />
          )}
          {hasPerm("notice-board") && (
            <QuickAction label="Notices" href="/notices" icon={Bell} color="border-yellow-200 dark:border-yellow-900/50 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100" />
          )}
          {hasPerm("email-management") && (
            <QuickAction label="Emails" href="/emails" icon={Mail} color="border-teal-200 dark:border-teal-900/50 text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100" />
          )}
          {hasPerm("ceo-requests") && (
            <QuickAction label="CEO Requests" href="/ceo-requests" icon={Crown} color="border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100" />
          )}
          {hasPerm("system-logs") && (
            <QuickAction label="System Health" href="/system-health" icon={Server} color="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100" />
          )}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollments Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {enrollPeriod === "weekly" ? "Student Registrations This Week" : "Student Registrations This Month"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {enrollPeriod === "weekly" ? "Daily new student Registration" : "Daily Student Registrations across current month"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setEnrollPeriod("weekly")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${enrollPeriod === "weekly" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setEnrollPeriod("monthly")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${enrollPeriod === "monthly" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                >
                  Monthly
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" /> Live
              </div>
            </div>
          </div>
          <div className="h-56 w-full">
            {chartLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={studentBarData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px" }}
                    formatter={(v: any) => [v, "New Students"]}
                  />
                  <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEnroll)" name="New Students" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Student Daily Registration Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {enrollPeriod === "weekly" ? "New Students This Week" : "New Students This Month"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Daily registrations from Student records</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-semibold bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 rounded-full">
              StudentModel
            </div>
          </div>
          <div className="flex-1 h-56 w-full">
            {chartLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentBarData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradStudent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px" }}
                    formatter={(v: any) => [v, "New Students"]}
                  />
                  <Bar dataKey="count" fill="url(#barGradStudent)" radius={[5, 5, 0, 0]} name="New Students" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Analytics & Operations Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {revenuePeriod === "weekly" ? "Weekly Revenue" : "Monthly Daily Revenue"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {revenuePeriod === "weekly" ? "Daily revenue from completed payments" : "Daily completed payments across current month"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setRevenuePeriod("weekly")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${revenuePeriod === "weekly" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setRevenuePeriod("monthly")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${revenuePeriod === "monthly" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                >
                  Monthly
                </button>
              </div>
              <Link href="/finance" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                Finance <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="h-48 w-full">
            {chartLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `৳${v}`} />
                  <Tooltip formatter={(v) => [`৳${v} BDT`, "Revenue"]} contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Teacher Live Activity Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Teacher Live Activity</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Completed vs. Scheduled sessions this week</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="text-gray-600 dark:text-gray-400">Scheduled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">Completed</span>
              </div>
            </div>
          </div>
          <div className="h-48 w-full">
            {chartLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teacherData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                  <Bar dataKey="scheduled" fill="#818cf8" radius={[4, 4, 0, 0]} name="Scheduled Classes" />
                  <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed Classes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── CRM In-Charge Performance & Distribution Pie Chart ── */}
      <CrmInChargePieChartSection />

      {/* ── All Module Sections & Sub-Routes Directory ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              All Academy Modules & Sub-Routes ({visibleModules.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Direct access to all 30+ pages, forms, and tools across the ERP platform.
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Clear filter
            </button>
          )}
        </div>

        {visibleModules.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 text-center">
            <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No modules match "{searchQuery}"</p>
            <p className="text-xs text-gray-400 mt-1">Try searching with a different term like students, teachers, salary, or payroll.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border ${mod.accentBorder} shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200`}
                >
                  {/* Card Header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${mod.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${mod.iconColor}`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{mod.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{mod.description}</p>
                        </div>
                      </div>
                      <Link
                        href={mod.href}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                        title={`Open ${mod.title}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>

                    {/* Sub-Routes List */}
                    <div className="mt-4 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                        Pages & Actions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.subRoutes.filter((sr) => hasPerm(sr.permission)).map((sr) => {
                          const SubIcon = sr.icon || ArrowRight;
                          return (
                            <Link
                              key={sr.href}
                              href={sr.href}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-gray-100 dark:border-slate-800"
                            >
                              <SubIcon className="w-3 h-3 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                              <span>{sr.name}</span>
                              {sr.badge && (
                                <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] rounded font-bold">
                                  {sr.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Card Widgets */}
                    {mod.children}
                  </div>

                  {/* Card Footer Link */}
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-800/30 rounded-b-2xl flex items-center justify-between">
                    <Link
                      href={mod.href}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Open {mod.title.split(" ")[0]} Module <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {mod.subRoutes.filter(sr => hasPerm(sr.permission)).length} routes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
