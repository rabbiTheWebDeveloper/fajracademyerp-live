"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck, RefreshCw, AlertCircle, User,
  CheckCircle2, XCircle, Clock, Filter, ChevronLeft, ChevronRight,
  Download, Search,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "present",  label: "Present",   dot: "bg-emerald-400", pill: "bg-emerald-100 text-emerald-700" },
  { value: "absent",   label: "Absent",    dot: "bg-red-400",     pill: "bg-red-100 text-red-600"         },
  { value: "late",     label: "Late",      dot: "bg-amber-400",   pill: "bg-amber-100 text-amber-700"     },
  { value: "half-day", label: "Half Day",  dot: "bg-orange-400",  pill: "bg-orange-100 text-orange-700"   },
  { value: "on-leave", label: "On Leave",  dot: "bg-sky-400",     pill: "bg-sky-100 text-sky-700"         },
  { value: "holiday",  label: "Holiday",   dot: "bg-violet-400",  pill: "bg-violet-100 text-violet-700"   },
];

const statusMap = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

function getMonthRange() {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }
  return opts;
}

export default function AdminAttendancePage() {
  const monthOpts = getMonthRange();
  const [records, setRecords]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [month, setMonth]         = useState(monthOpts[0].value);
  const [statusFilter, setStatus] = useState("");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);
  const LIMIT = 20;

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({
        month, page: String(page), limit: String(LIMIT),
      });
      const res  = await fetch(`/api/staff/attendance?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else setError(data.message);
    } catch { setError("Failed to load attendance."); }
    finally { setLoading(false); }
  }, [month, page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { setPage(1); }, [month, statusFilter]);

  // Summary counts
  const summary = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = records.filter(r => r.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = records.filter(r => {
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchSearch = !search ||
      r.staff?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      r.staff?.department?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage attendance records for all staff</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchRecords} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            {monthOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_OPTIONS.map(({ value, label, dot, pill }) => (
          <button key={value}
            onClick={() => setStatus(statusFilter === value ? "" : value)}
            className={`rounded-2xl p-3 text-center border-2 transition-all ${
              statusFilter === value ? "border-blue-400 shadow-sm" : "border-transparent"
            } ${pill.replace("text-","bg-").replace("100","50")}`}>
            <span className={`w-2 h-2 rounded-full mx-auto block mb-1.5 ${dot}`} />
            <p className={`text-xl font-bold ${pill.split(" ")[1]}`}>{loading ? "—" : summary[value] || 0}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by staff name or department..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">
            Records — {monthOpts.find(o => o.value === month)?.label}
            <span className="ml-2 text-gray-400 font-normal">({filtered.length})</span>
          </h3>
          <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No attendance records for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="px-5 py-3 text-left font-semibold">Staff</th>
                  <th className="px-5 py-3 text-left font-semibold">Department</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Check-In</th>
                  <th className="px-5 py-3 text-left font-semibold">Check-Out</th>
                  <th className="px-5 py-3 text-right font-semibold">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const s = statusMap[r.status] || statusMap.absent;
                  const hours = r.workingMinutes ? `${Math.floor(r.workingMinutes/60)}h ${r.workingMinutes%60}m` : "—";
                  return (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {r.staff?.avatar ? (
                            <img src={r.staff.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-bold text-blue-600">
                              {r.staff?.fullName?.split(" ").map((w: string) => w[0]).join("").slice(0,2)}
                            </div>
                          )}
                          <span className="font-semibold text-gray-800">{r.staff?.fullName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 capitalize">{r.staff?.department?.replace(/-/g," ")}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {new Date(r.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{r.checkInTime || "—"}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{r.checkOutTime || "—"}</td>
                      <td className="px-5 py-3.5 text-right text-xs font-medium text-gray-600">{hours}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
