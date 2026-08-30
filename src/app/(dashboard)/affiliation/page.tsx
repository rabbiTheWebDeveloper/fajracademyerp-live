"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Link2,
  Users,
  Copy,
  Check,
  Search,
  ExternalLink,
  QrCode,
  Share2,
  TrendingUp,
  DollarSign,
  UserCheck,
  UserX,
  Shield,
  Sparkles,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  Filter,
  Layers,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  RefreshCw,
  Eye,
  CheckCircle2,
} from "lucide-react";

interface AffiliatedStudent {
  _id: string;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  monthlyFee: number;
  admissionFee: number;
  courseTitle: string;
  registeredAt: string;
  totalPaid: number;
}

interface AffiliateUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatar: string;
  type: string;
  affiliateLink: string;
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalRevenue: number;
  students: AffiliatedStudent[];
}

interface AffiliationStats {
  totalAffiliatedStudents: number;
  totalActiveAffiliated: number;
  totalInactiveAffiliated: number;
  totalRevenue: number;
  activeAffiliatesCount: number;
  totalAffiliatesCount: number;
}

export default function AffiliationManagementPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [affiliates, setAffiliates] = useState<AffiliateUser[]>([]);
  const [stats, setStats] = useState<AffiliationStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Custom campaign tag creator
  const [customTag, setCustomTag] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedCustom, setCopiedCustom] = useState(false);

  // Modals
  const [selectedAffiliateStudents, setSelectedAffiliateStudents] = useState<AffiliateUser | null>(null);
  const [qrModalData, setQrModalData] = useState<{ name: string; url: string } | null>(null);

  // 1. Check super admin authorization
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setCurrentUser(d.user);
      })
      .catch(console.error)
      .finally(() => setLoadingUser(false));
  }, []);

  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === "super-admin" || currentUser.permissions?.includes("*");
  }, [currentUser]);

  // 2. Fetch Affiliation Data (super admin only)
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/affiliation");
      const data = await res.json();
      if (data.success) {
        setAffiliates(data.affiliates || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to load affiliation data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const handleCopyCustom = () => {
    if (!customTag.trim()) return;
    const url = `https://app.fajracademy.io/student-registration?crm=${encodeURIComponent(customTag.trim())}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCustom(true);
      setTimeout(() => setCopiedCustom(false), 2000);
    });
  };

  // Filtered affiliates
  const filteredAffiliates = useMemo(() => {
    return affiliates.filter((aff) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        aff.fullName.toLowerCase().includes(q) ||
        aff.email.toLowerCase().includes(q) ||
        aff.phone.toLowerCase().includes(q) ||
        aff._id.toLowerCase().includes(q) ||
        aff.role.toLowerCase().includes(q);

      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && ["admin", "super-admin"].includes(aff.role)) ||
        (roleFilter === "staff" && !["admin", "super-admin", "custom-campaign"].includes(aff.role)) ||
        (roleFilter === "campaign" && aff.role === "custom-campaign");

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "has-students" && aff.totalStudents > 0) ||
        (statusFilter === "no-students" && aff.totalStudents === 0);

      return matchSearch && matchRole && matchStatus;
    });
  }, [affiliates, searchQuery, roleFilter, statusFilter]);

  // If loading user state
  if (loadingUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-gray-500 dark:text-slate-400">Verifying super-admin privileges...</p>
      </div>
    );
  }

  // ── Access Denied Screen ──
  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Super Admin Access Only</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
          The CRM Affiliation and Referral Links management section is strictly restricted to Super Administrators.
          Please contact your system administrator if you require access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-16 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Super Admin Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            CRM Affiliation &amp; Referral Links
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Generate and track dedicated student registration links with automated CRM in-charge tagging.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loadingData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Stats Cards ── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Affiliated Students */}
          <div className="bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Affiliated Registrations
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalAffiliatedStudents}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <UserCheck className="w-3 h-3" /> {stats.totalActiveAffiliated} Active
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <UserX className="w-3 h-3" /> {stats.totalInactiveAffiliated} Inactive
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Active CRM In-Charges */}
          <div className="bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Active CRM In-Charges
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.activeAffiliatesCount}{" "}
                <span className="text-sm font-normal text-gray-400 dark:text-slate-500">
                  / {stats.totalAffiliatesCount} Total
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Team members with &ge; 1 registration
              </p>
            </div>
          </div>

          {/* Card 3: Total Collected Revenue */}
          <div className="bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Affiliate Revenue
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ৳{stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Completed student payments
              </p>
            </div>
          </div>

          {/* Card 4: Base Registration Endpoint */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 border border-amber-500/20 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Affiliation URL Structure
              </span>
              <Link2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs font-mono text-gray-700 dark:text-slate-300 break-all bg-white/60 dark:bg-black/40 p-2 rounded-lg border border-amber-500/20">
              https://app.fajracademy.io/student-registration?crm=<strong>ID</strong>
            </p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              Pass CRM user ID or campaign tag to auto-link student accounts.
            </p>
          </div>
        </div>
      )}

      {/* ── Custom Campaign Link Creator Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold tracking-tight">Generate Custom Campaign / Partner Link</h3>
        </div>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Create tracking links for social media ads, partner agencies, or promotional campaigns. When a student registers using this custom tag, it is automatically assigned as their CRM In-Charge.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 max-w-2xl">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono select-none">
              ?crm=
            </span>
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="e.g. facebook-ad-2026 or partner-agency-01"
              className="w-full pl-16 pr-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={handleCopyCustom}
            disabled={!customTag.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
          >
            {copiedCustom ? (
              <>
                <Check className="w-4 h-4" /> Link Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Custom Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Affiliates Directory Header & Filters ── */}
      <div className="bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              CRM In-Charges &amp; Affiliation Directory ({filteredAffiliates.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Personal registration links for each admin, staff member, and campaign.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search CRM name, email, role..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins &amp; Super-Admins</option>
              <option value="staff">Staff &amp; Managers</option>
              <option value="campaign">Custom Campaigns</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Conversion States</option>
              <option value="has-students">Has Registered Students (&ge; 1)</option>
              <option value="no-students">Zero Registrations (0)</option>
            </select>
          </div>
        </div>

        {/* ── Table List ── */}
        {loadingData ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-xs text-gray-500 dark:text-slate-400">Loading affiliation records...</p>
          </div>
        ) : filteredAffiliates.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-xs">
            No CRM affiliates found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">CRM In-Charge</th>
                  <th className="py-3 px-3">Unique Affiliation Link</th>
                  <th className="py-3 px-3 text-center">Registrations</th>
                  <th className="py-3 px-3 text-center">Status Breakdown</th>
                  <th className="py-3 px-3 text-right">Revenue</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {filteredAffiliates.map((aff) => {
                  const isCopied = copiedLink === aff._id;
                  const waMessage = `Assalamu Alaikum! Register as a student at FAJR Academy using this official link: ${aff.affiliateLink}`;
                  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

                  return (
                    <tr
                      key={aff._id}
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* CRM User Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {aff.avatar ? (
                            <img
                              src={aff.avatar}
                              alt={aff.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                              {aff.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {aff.fullName}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
                              <span className="capitalize px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium">
                                {aff.role.replace("-", " ")}
                              </span>
                              {aff.phone && <span className="font-mono">{aff.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Affiliate Link Input & Copy */}
                      <td className="py-3 px-3 min-w-[280px]">
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/90 border border-gray-200 dark:border-white/10 rounded-lg p-1.5">
                          <span className="font-mono text-[11px] text-gray-700 dark:text-slate-300 truncate flex-1 pl-1">
                            {aff.affiliateLink}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(aff.affiliateLink, aff._id)}
                            className="p-1.5 rounded-md hover:bg-amber-500/15 text-gray-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex-shrink-0 cursor-pointer"
                            title="Copy link"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Total Registered Count */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedAffiliateStudents(aff)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold transition-all cursor-pointer"
                          title="Click to view students"
                        >
                          <Users className="w-3 h-3" />
                          {aff.totalStudents} {aff.totalStudents === 1 ? "Student" : "Students"}
                        </button>
                      </td>

                      {/* Status Breakdown */}
                      <td className="py-3 px-3 text-center">
                        {aff.totalStudents > 0 ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                              {aff.activeStudents} Active
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                              {aff.inactiveStudents} Inactive
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Revenue */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                        {aff.totalRevenue > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ৳{aff.totalRevenue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">৳0</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Share */}
                          <a
                            href={waShareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                            title="Share via WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </a>

                          {/* QR Code */}
                          <button
                            type="button"
                            onClick={() =>
                              setQrModalData({ name: aff.fullName, url: aff.affiliateLink })
                            }
                            className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 transition-all cursor-pointer"
                            title="Show QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Open Test Link */}
                          <a
                            href={aff.affiliateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-all"
                            title="Open registration page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* View Students Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => setSelectedAffiliateStudents(aff)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
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

      {/* ── MODAL 1: Affiliated Students List ── */}
      {selectedAffiliateStudents && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Affiliated Students for {selectedAffiliateStudents.fullName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Total: {selectedAffiliateStudents.students.length} registered students through this link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAffiliateStudents(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Table */}
            <div className="p-6 overflow-y-auto flex-1">
              {selectedAffiliateStudents.students.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                  No students have registered using this CRM link yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Student ID</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Registration Date</th>
                      <th className="py-2.5 px-3 text-right">Fee / Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                    {selectedAffiliateStudents.students.map((st) => (
                      <tr key={st._id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {st.studentId}
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">
                          {st.fullName}
                        </td>
                        <td className="py-3 px-3 text-gray-600 dark:text-slate-400">
                          <div>{st.phone || "—"}</div>
                          <div className="text-[11px] text-gray-400 dark:text-slate-500">{st.email}</div>
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-slate-300 font-medium">
                          {st.courseTitle}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize ${
                              st.status === "active"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 dark:text-slate-400">
                          {st.registeredAt ? new Date(st.registeredAt).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <div className="font-bold text-gray-900 dark:text-white">
                            ৳{st.monthlyFee} / mo
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            Paid: ৳{st.totalPaid.toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/40 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedAffiliateStudents(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: QR Code Viewer ── */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Affiliation QR Code
              </h3>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400">
              Scan to register under <strong>{qrModalData.name}</strong>
            </p>

            <div className="p-4 bg-white rounded-xl border border-gray-200 inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  qrModalData.url
                )}`}
                alt="Affiliate QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <p className="text-[11px] font-mono text-gray-600 dark:text-slate-300 break-all bg-gray-50 dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-white/10">
              {qrModalData.url}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy(qrModalData.url, "qr-copy")}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink === "qr-copy" ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied Link
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
