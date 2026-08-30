"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, Download, ChevronDown, Banknote,
  TrendingUp, User, CheckCircle2, Clock, Eye, X,
  RefreshCw, AlertCircle,
} from "lucide-react";

const statusStyle: Record<string, { pill: string; icon: any }> = {
  paid:       { pill: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  pending:    { pill: "bg-amber-100 text-amber-700",     icon: Clock        },
  processing: { pill: "bg-sky-100 text-sky-700",         icon: Clock        },
  "on-hold":  { pill: "bg-red-100 text-red-600",         icon: Clock        },
};

const fmt = (n: number) => `৳${(n || 0).toLocaleString()}`;

// Generate month options — current month going back 12 months
function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

export default function PayrollPage() {
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [payrolls, setPayrolls]   = useState<any[]>([]);
  const [totals, setTotals]       = useState<any>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [viewSlip, setViewSlip]   = useState<any | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/staff/payroll?month=${selectedMonth}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setPayrolls(data.payrolls || []);
        setTotals(data.totals    || {});
      } else {
        setError(data.message || "Failed to load payroll.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

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
      }
    } catch {
      setError("Failed to mark as paid.");
    } finally {
      setMarkingPaid(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Salary & Payroll</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage monthly salary disbursements</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchPayroll} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 appearance-none">
              {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Net Payroll",   value: fmt(totals.totalNet   || 0), icon: Banknote,    gradient: "bg-gradient-to-br from-sky-500 to-blue-600"      },
          { label: "Total Bonus",         value: fmt(totals.totalBonus || 0), icon: TrendingUp,  gradient: "bg-gradient-to-br from-emerald-500 to-teal-600"   },
          { label: "Total Deductions",    value: fmt(totals.totalDeductions || 0), icon: DollarSign, gradient: "bg-gradient-to-br from-red-500 to-rose-600"  },
          { label: "Salaries Paid",       value: `${payrolls.filter(p=>p.status==="paid").length}/${payrolls.length}`, icon: CheckCircle2, gradient: "bg-gradient-to-br from-violet-500 to-purple-600" },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className={`rounded-2xl p-5 ${gradient} text-white shadow-sm`}>
            <div className="bg-white/20 w-9 h-9 rounded-xl flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl font-bold">{loading ? "—" : value}</p>
            <p className="text-xs text-white/75 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-sky-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Payroll — {monthOptions.find(o=>o.value===selectedMonth)?.label}</h3>
          </div>
          <span className="text-xs text-slate-400">{payrolls.length} records</span>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-slate-300" /></div>
        ) : payrolls.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No payroll records for this month.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-50">
                  <th className="px-5 py-3 text-left font-semibold">Staff</th>
                  <th className="px-5 py-3 text-left font-semibold">Dept</th>
                  <th className="px-5 py-3 text-right font-semibold">Basic</th>
                  <th className="px-5 py-3 text-right font-semibold">Bonus</th>
                  <th className="px-5 py-3 text-right font-semibold">Deductions</th>
                  <th className="px-5 py-3 text-right font-semibold">Net Salary</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payrolls.map((p) => {
                  const s = statusStyle[p.status] || statusStyle.pending;
                  const Icon = s.icon;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.staff?.avatar ? (
                            <img src={p.staff.avatar} alt={p.staff.fullName} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-sky-400" />
                            </div>
                          )}
                          <span className="font-semibold text-slate-800">{p.staff?.fullName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 capitalize">{p.staff?.department?.replace(/-/g," ")}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-700">{fmt(p.basicSalary)}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-600">+{fmt(p.performanceBonus)}</td>
                      <td className="px-5 py-3 text-right font-mono text-red-500">-{fmt(p.totalDeductions)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{fmt(p.netSalary)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                          <Icon className="w-3 h-3" />{p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewSlip(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="View Slip">
                            <Eye className="w-4 h-4" />
                          </button>
                          {p.status === "pending" && (
                            <button
                              onClick={() => handleMarkPaid(p._id)}
                              disabled={markingPaid === p._id}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-60"
                            >
                              {markingPaid === p._id ? "..." : "Mark Paid"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay slip modal */}
      {viewSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Pay Slip — {monthOptions.find(o=>o.value===selectedMonth)?.label}</h3>
              <button onClick={() => setViewSlip(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-4">
                <p className="font-bold text-slate-900">{viewSlip.staff?.fullName || "—"}</p>
                <p className="text-xs text-slate-500 capitalize">{viewSlip.staff?.designation}</p>
              </div>
              {[
                ["Basic Salary",        fmt(viewSlip.basicSalary),        "text-slate-700"],
                ["HRA",                 fmt(viewSlip.houseRentAllowance),  "text-slate-700"],
                ["Medical Allowance",   fmt(viewSlip.medicalAllowance),    "text-slate-700"],
                ["Performance Bonus",   `+${fmt(viewSlip.performanceBonus)}`,"text-emerald-600"],
                ["Total Deductions",    `-${fmt(viewSlip.totalDeductions)}`,"text-red-500"],
              ].map(([label, value, cls]) => (
                <div key={label} className="flex justify-between text-sm py-1 border-b border-slate-50">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-semibold ${cls}`}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center font-bold bg-gradient-to-r from-sky-600 to-blue-600 -mx-5 px-5 py-3 rounded-b-2xl text-white mt-2">
                <span>Net Salary</span>
                <span>{fmt(viewSlip.netSalary)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
