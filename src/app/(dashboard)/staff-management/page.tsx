"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Search, RefreshCw, AlertCircle,
  User, Pencil, Trash2, X, Eye, CheckCircle2,
  ChevronLeft, ChevronRight, Filter, Download,
  UserCheck, UserX, Briefcase, Key,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionContext";
import { ReadOnlyNotice } from "@/components/PermissionGuard";

const DEPARTMENTS = [
  { value: "after-sales",          label: "After Sales"          },
  { value: "sales",                label: "Sales"                },
  { value: "business-development", label: "Business Development" },
  { value: "marketing",            label: "Marketing"            },
  { value: "cam",                  label: "CAM"                  },
  { value: "customer-executive",   label: "Customer Executive"   },
  { value: "admin",                label: "Admin"                },
  { value: "hr",                   label: "HR"                   },
  { value: "finance",              label: "Finance"              },
  { value: "it",                   label: "IT"                   },
  { value: "other",                label: "Other"                },
];

const STATUS_OPTIONS = [
  { value: "active",     label: "Active",     dot: "bg-emerald-400" },
  { value: "inactive",   label: "Inactive",   dot: "bg-slate-400"   },
  { value: "on-leave",   label: "On Leave",   dot: "bg-amber-400"   },
  { value: "terminated", label: "Terminated", dot: "bg-red-400"     },
];

const statusStyle: Record<string, { pill: string; dot: string }> = {
  active:     { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  inactive:   { pill: "bg-slate-100 text-slate-500",     dot: "bg-slate-400"   },
  "on-leave": { pill: "bg-amber-100 text-amber-700",     dot: "bg-amber-400"   },
  terminated: { pill: "bg-red-100 text-red-600",         dot: "bg-red-400"     },
  suspended:  { pill: "bg-orange-100 text-orange-700",   dot: "bg-orange-400"  },
};

const EMPTY_FORM = {
  fullName: "", email: "", phone: "", password: "",
  gender: "", department: "", designation: "",
  employmentType: "full-time", basicSalary: "",
  presentAddress: "", permanentAddress: "", bio: "",
  useDefaultPassword: false,
};

export default function StaffManagementPage() {
  const { can } = usePermissions();
  const [staff, setStaff]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState("");

  // Filters & pagination
  const [search, setSearch]           = useState("");
  const [deptFilter, setDeptFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const LIMIT = 15;

  // Modals
  const [showAddModal, setShowAddModal]     = useState(false);
  const [showEditModal, setShowEditModal]   = useState(false);
  const [showViewModal, setShowViewModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selected, setSelected]             = useState<any | null>(null);
  const [form, setForm]                     = useState({ ...EMPTY_FORM });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        ...(search     && { search }),
        ...(deptFilter && { department: deptFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res  = await fetch(`/api/staff?${params}`);
      const data = await res.json();
      if (data.success) {
        setStaff(data.staff || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else setError(data.message);
    } catch { setError("Failed to load staff."); }
    finally { setLoading(false); }
  }, [page, search, deptFilter, statusFilter]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, deptFilter, statusFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const { useDefaultPassword, ...submitForm } = form;
      const res  = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submitForm, basicSalary: Number(submitForm.basicSalary) || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Staff member added successfully!");
        setShowAddModal(false);
        setForm({ ...EMPTY_FORM });
        fetchStaff();
      } else setError(data.message);
    } catch { setError("Network error."); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true); setError("");
    try {
      const { password: _, ...updateData } = form as any;
      const res  = await fetch(`/api/staff/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updateData, basicSalary: Number(form.basicSalary) || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Staff member updated!");
        setShowEditModal(false);
        fetchStaff();
      } else setError(data.message);
    } catch { setError("Network error."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true); setError("");
    try {
      const res  = await fetch(`/api/staff/${selected._id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccess("Staff member deleted.");
        setShowDeleteModal(false);
        fetchStaff();
      } else setError(data.message);
    } catch { setError("Network error."); }
    finally { setSubmitting(false); }
  };

  const openEdit = (s: any) => {
    setSelected(s);
    setForm({
      fullName: s.fullName || "", email: s.email || "", phone: s.phone || "",
      password: "", gender: s.gender || "", department: s.department || "",
      designation: s.designation || "", employmentType: s.employmentType || "full-time",
      basicSalary: String(s.basicSalary || ""), presentAddress: s.presentAddress || "",
      permanentAddress: s.permanentAddress || "", bio: s.bio || "",
      useDefaultPassword: false,
    });
    setShowEditModal(true);
  };

  const deptLabel = (val: string) => DEPARTMENTS.find(d => d.value === val)?.label || val;

  // Summary counts
  const activeCount   = staff.filter(s => s.status === "active").length;
  const deptCounts    = DEPARTMENTS.slice(0,4).map(d => ({ label: d.label, count: staff.filter(s => s.department === d.value).length }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all office staff across departments & user roles</p>
        </div>
        {can("staff-management", "create") && (
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setShowAddModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B1A45] hover:bg-[#132B66] text-white text-sm font-bold shadow-md shadow-[#0B1A45]/20 transition-all hover:-translate-y-0.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Add New Staff
          </button>
        )}
      </div>

      <ReadOnlyNotice module="staff-management" featureName="Staff Management" />

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
          <button onClick={() => setSuccess("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Staff",   value: total,       icon: Users,     color: "text-[#0B1A45]",    bg: "bg-blue-50/70" },
          { label: "Active",        value: activeCount, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50/70" },
          { label: "Departments",   value: DEPARTMENTS.length, icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-50/70" },
          { label: "On Leave",      value: staff.filter(s=>s.status==="on-leave").length, icon: UserX, color: "text-amber-600", bg: "bg-amber-50/70" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 ${bg} flex items-center gap-3 border border-gray-100 shadow-sm`}>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</p>
              <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Role & Department Quick Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setDeptFilter("")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            deptFilter === ""
              ? "bg-[#0B1A45] text-white shadow-sm"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All Roles ({total})
        </button>
        {DEPARTMENTS.map((d) => {
          const isSelected = deptFilter === d.value;
          return (
            <button
              key={d.value}
              onClick={() => setDeptFilter(d.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-[#0B1A45] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name, email, ID, designation..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1A45] bg-gray-50" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1A45] bg-gray-50 min-w-[160px]">
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1A45] bg-gray-50 min-w-[140px]">
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={fetchStaff} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">
            Staff Members <span className="ml-2 text-gray-400 font-normal">({total})</span>
          </h3>
          <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No staff members found.</p>
            <button onClick={() => { setForm({ ...EMPTY_FORM }); setShowAddModal(true); }}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              Add First Staff Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="px-5 py-3 text-left font-semibold">Staff Member</th>
                  <th className="px-5 py-3 text-left font-semibold">Staff ID</th>
                  <th className="px-5 py-3 text-left font-semibold">Department</th>
                  <th className="px-5 py-3 text-left font-semibold">Designation</th>
                  <th className="px-5 py-3 text-right font-semibold">Salary</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Joined</th>
                  <th className="px-5 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s) => {
                  const st = statusStyle[s.status] || statusStyle.inactive;
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {s.avatar ? (
                            <img src={s.avatar} alt={s.fullName} className="w-9 h-9 rounded-full object-cover border-2 border-gray-100" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                              {s.fullName?.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{s.fullName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-gray-400">{s.email}</span>
                              {s.source === "user_account" && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">User</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{s.staffId || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-xs font-bold capitalize">
                          {deptLabel(s.department)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs font-medium">{s.designation || "—"}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-gray-700 text-xs">৳{(s.basicSalary||0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${st.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {s.status?.charAt(0).toUpperCase() + s.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setSelected(s); setShowViewModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {can("staff-management", "update") && (
                            <button onClick={() => openEdit(s)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {can("staff-management", "update") && (
                            <button onClick={() => { setSelected(s); setShowResetPasswordModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors" title="Reset Password">
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {can("staff-management", "delete") && (
                            <button onClick={() => { setSelected(s); setShowDeleteModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      {showAddModal && (
        <StaffFormModal
          title="Add New Staff Member"
          form={form} setForm={setForm}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAdd}
          submitting={submitting}
          error={error}
          showPassword
        />
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && (
        <StaffFormModal
          title={`Edit — ${selected?.fullName}`}
          form={form} setForm={setForm}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdate}
          submitting={submitting}
          error={error}
          showPassword={false}
        />
      )}

      {/* ── VIEW MODAL ── */}
      {showViewModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Staff Details</h3>
              <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-xl font-bold shadow">
                  {selected.fullName?.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{selected.fullName}</h4>
                  <p className="text-sm text-gray-500">{selected.designation}</p>
                  <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{selected.staffId}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Email",         selected.email],
                  ["Phone",         selected.phone || "—"],
                  ["Department",    deptLabel(selected.department)],
                  ["Employment",    selected.employmentType?.replace(/-/g," ")],
                  ["Gender",        selected.gender],
                  ["Basic Salary",  `৳${(selected.basicSalary||0).toLocaleString()}`],
                  ["Status",        selected.status],
                  ["Joined",        selected.joiningDate ? new Date(selected.joiningDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800 capitalize">{value}</p>
                  </div>
                ))}
              </div>
              {selected.presentAddress && (
                <div className="mt-4 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-400 mb-0.5">Present Address</p>
                  <p className="text-sm text-gray-700">{selected.presentAddress}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {showDeleteModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Delete Staff Member?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to delete <strong>{selected.fullName}</strong>? This action cannot be undone.
            </p>
            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60">
                {submitting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {showResetPasswordModal && selected && (
        <ResetPasswordModal
          staff={selected}
          onClose={() => setShowResetPasswordModal(false)}
          onSuccess={(msg) => setSuccess(msg)}
        />
      )}
    </div>
  );
}

// ─── Reusable Staff Form Modal ─────────────────────────────────────────────────
function StaffFormModal({ title, form, setForm, onClose, onSubmit, submitting, error, showPassword }: {
  title: string; form: any; setForm: any; onClose: () => void;
  onSubmit: (e: React.FormEvent) => void; submitting: boolean; error: string; showPassword: boolean;
}) {
  const f = (field: string) => (e: any) => setForm((p: any) => ({ ...p, [field]: e.target.value }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Full Name *",     field: "fullName",    type: "text",     placeholder: "e.g. Fatima Zahra" },
              { label: "Email *",         field: "email",       type: "email",    placeholder: "staff@company.com" },
              { label: "Phone",           field: "phone",       type: "text",     placeholder: "+880..." },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
                <input required={label.includes("*")} type={type} value={form[field]} onChange={f(field)}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
            ))}

            {showPassword && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Password *</label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={f("password")}
                  placeholder="Min. 6 characters"
                  disabled={form.useDefaultPassword}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 disabled:opacity-60"
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.useDefaultPassword}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev: any) => ({
                        ...prev,
                        useDefaultPassword: checked,
                        password: checked ? "123456" : "",
                      }));
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-500 font-medium">Use default password (123456)</span>
                </label>
              </div>
            )}

            {[
              { label: "Designation *",   field: "designation", type: "text",     placeholder: "e.g. Sales Executive" },
              { label: "Basic Salary (৳)",field: "basicSalary", type: "number",   placeholder: "0" },
              { label: "Present Address", field: "presentAddress", type: "text",  placeholder: "Current address" },
              { label: "Permanent Address",field:"permanentAddress",type:"text",  placeholder: "Permanent address" },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
                <input required={label.includes("*")} type={type} value={form[field]} onChange={f(field)}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Gender *</label>
              <select required value={form.gender} onChange={f("gender")}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50">
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Department *</label>
              <select required value={form.department} onChange={f("department")}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1A45] bg-gray-50">
                <option value="">Select...</option>
                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Employment Type</label>
              <select value={form.employmentType} onChange={f("employmentType")}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1A45] bg-gray-50">
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Bio / Notes</label>
              <textarea rows={2} value={form.bio} onChange={f("bio")} placeholder="Optional notes about this staff member..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1A45] bg-gray-50 resize-none" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#0B1A45] hover:bg-[#132B66] text-white text-sm font-bold shadow-md shadow-[#0B1A45]/20 disabled:opacity-60 transition-all cursor-pointer">
              {submitting ? "Saving..." : showPassword ? "Add Staff Member" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ staff, onClose, onSuccess }: {
  staff: any; onClose: () => void; onSuccess: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [useDefault, setUseDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/${staff._id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(`Password for ${staff.fullName} reset successfully!`);
        onClose();
      } else {
        setError(data.message || "Failed to update password.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Reset Password</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Set a new password for staff member: <strong className="text-gray-900">{staff.fullName}</strong> ({staff.email})
            </p>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password *</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              disabled={useDefault}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 disabled:opacity-60 transition-all"
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useDefault}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseDefault(checked);
                  setPassword(checked ? "123456" : "");
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 font-medium">Use default password (123456)</span>
            </label>
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm disabled:opacity-60 transition-colors">
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
