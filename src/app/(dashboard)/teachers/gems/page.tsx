"use client";

import { useState, useEffect } from "react";
import { Search, Gem, Star, Trophy, Loader2, Info, CheckCircle2, X } from "lucide-react";

export default function GemsManagementPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("Admin adjustment");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teacher-gems");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTeachers(data.teachers);
          setFilteredTeachers(data.teachers);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load gems data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const s = search.toLowerCase();
    setFilteredTeachers(
      teachers.filter((t) =>
        t.fullName.toLowerCase().includes(s) || t.teacherId.toLowerCase().includes(s)
      )
    );
  }, [search, teachers]);

  const openModal = (teacher: any) => {
    setSelectedTeacher(teacher);
    setAmount(0);
    setNote("Admin adjustment");
    setIsModalOpen(true);
  };

  const handleSubmitGems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || amount === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/teacher-gems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacher._id,
          amount: Number(amount),
          note,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Successfully ${amount > 0 ? 'awarded' : 'deducted'} ${Math.abs(amount)} gems.`, "success");
        setIsModalOpen(false);
        fetchData(); // Refresh list to get updated totals
      } else {
        showToast(data.message || "Failed to update gems", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"} animate-in slide-in-from-top-4 duration-300`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Gem className="w-6 h-6 text-indigo-600" />
            </div>
            Teacher Gems Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            View teacher points and manually award or deduct gems.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Instructor</th>
                <th className="px-6 py-4 text-center">Current Tier</th>
                <th className="px-6 py-4 text-center">Streak</th>
                <th className="px-6 py-4 text-center">Monthly Gems</th>
                <th className="px-6 py-4 text-center">Total Gems</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                    <p className="text-slate-500 mt-2 font-medium">Loading gems data...</p>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-sm">
                          {t.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{t.fullName}</p>
                          <p className="text-xs text-slate-500 font-medium">ID: {t.teacherId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                        <span>{t.tier.emoji}</span>
                        <span>{t.tier.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-600 font-bold">
                        <Star className="w-4 h-4 fill-orange-500" />
                        {t.streak} Days
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-700">{t.monthlyGems.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-sm border border-indigo-100">
                        <Gem className="w-4 h-4" />
                        {t.totalGems.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModal(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                      >
                        Adjust Gems
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Adjustment Modal */}
      {isModalOpen && selectedTeacher && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Gem className="w-4 h-4" />
                </div>
                Adjust Gems
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGems} className="p-6 space-y-5">
              
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-3">
                <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-indigo-900">{selectedTeacher.fullName}</p>
                  <p className="text-xs font-medium text-indigo-700/80">
                    Currently has {selectedTeacher.totalGems} total gems.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Amount (Positive to add, Negative to deduct)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Gem className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] font-medium mt-1 text-slate-500">
                  Example: 50 to give 50 gems, -20 to deduct 20 gems.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reason / Note
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent performance bonus"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || amount === 0}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {isSubmitting ? "Saving..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
