"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  Loader2,
  Key,
  Sun,
  Moon,
  Monitor,
  Eye,
  Download,
  X,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Info,
  Briefcase,
  Building,
  HeartPulse,
  RotateCw,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  OfficialIDCard,
  OfficialIDCardBack,
} from "@/components/TeacherOfficialIDCard";

function formatRoleName(role?: string) {
  if (!role) return "Administrator";
  if (role === "super-admin") return "Super Admin";
  if (role === "admin") return "Administrator";
  return role
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { theme, setTheme } = useTheme();
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  // ID Card State
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [showOverlay, setShowOverlay] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user) {
          const roleDisplayName = formatRoleName(d.user.role);
          setProfile({
            ...d.user,
            designation: d.user.designation || roleDisplayName,
            employeeId:
              d.user.employeeId ||
              (d.user._id ? `FJRA-${d.user._id.slice(-4).toUpperCase()}` : "FJRA-001"),
            bloodGroup: d.user.bloodGroup || "",
            department: d.user.department || "Administration",
            emergencyContactNumber: d.user.emergencyContactNumber || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.secure_url) {
        setProfile((prev: any) => ({ ...prev, avatar: data.secure_url }));
        setMessage("Profile photo uploaded! Click Save to apply changes.");
      } else {
        setMessage(data.message || "Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to upload image due to a network error.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDownloadCard = async (side: "front" | "back" = cardSide) => {
    const elementId =
      side === "front" ? "official-admin-id-card" : "official-admin-id-card-back";
    const element = document.getElementById(elementId);
    if (!element) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      const idCode =
        profile?.employeeId ||
        (profile?._id ? profile._id.slice(-4).toUpperCase() : "Admin");
      link.download = `ID-Card-${idCode}-${side.toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.warn("html-to-image failed, trying fallback html2canvas:", err);
      try {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(element, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        });
        const image = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement("a");
        const idCode =
          profile?.employeeId ||
          (profile?._id ? profile._id.slice(-4).toUpperCase() : "Admin");
        link.download = `ID-Card-${idCode}-${side.toUpperCase()}.png`;
        link.href = image;
        link.click();
      } catch (fallbackErr) {
        console.error("ID Card download failed", fallbackErr);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload: any = {
        fullName: profile.fullName,
        phone: profile.phone,
        emergencyContactNumber: profile.emergencyContactNumber,
        designation: profile.designation,
        employeeId: profile.employeeId,
        bloodGroup: profile.bloodGroup,
        department: profile.department,
        avatar: profile.avatar,
      };

      // Add password change if requested
      if (passwordForm.password) {
        if (passwordForm.password !== passwordForm.confirmPassword) {
          setMessage("Passwords do not match.");
          setSaving(false);
          return;
        }
        if (passwordForm.password.length < 6) {
          setMessage("Password must be at least 6 characters.");
          setSaving(false);
          return;
        }
        const passRes = await fetch(`/api/users/${profile._id}/password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: passwordForm.password }),
        });
        const passData = await passRes.json();
        if (!passData.success) {
          setMessage(passData.message || "Failed to update password.");
          setSaving(false);
          return;
        }
      }

      const r = await fetch(`/api/users/${profile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        setMessage("Profile and ID Card updated successfully!");
        setProfile((prev: any) => ({ ...prev, ...d.user }));
        setPasswordForm({ password: "", confirmPassword: "" });
      } else {
        setMessage(d.message || "Failed to update profile.");
      }
    } catch (err) {
      setMessage("Network error. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3500);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const inputCls =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow";
  const disabledCls =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 cursor-not-allowed";

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Admin Settings & Official ID Card
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Manage your administrative profile, official digital credential ID card, and account preferences.
        </p>
      </div>

      {/* ── Official Digital ID Card Showcase Banner ── */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-slate-800/80 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-4 flex-1 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-400/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Official Digital ID Card
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Official Fajr Academy ID Card
          </h3>

          <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
            Your official Fajr Academy ID card is rendered dynamically from your photo, full name,
            designation, employee code, and blood group. Flip between Front & Back sides or export
            high-resolution PNG copies for printing.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
            {/* Front / Back Toggle Buttons */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setCardSide("front")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  cardSide === "front"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Front Side
              </button>
              <button
                type="button"
                onClick={() => setCardSide("back")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  cardSide === "back"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Back Side
              </button>
            </div>

            {/* View Overlay Modal Button */}
            <button
              type="button"
              onClick={() => setShowOverlay(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-2 shadow-sm"
            >
              <Eye className="w-4 h-4 text-indigo-300" /> View Overlay
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={() => handleDownloadCard(cardSide)}
              disabled={downloading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading
                ? "Exporting..."
                : `Download ${cardSide === "front" ? "Front" : "Back"} (PNG)`}
            </button>
          </div>
        </div>

        {/* Live Miniature Card Preview */}
        <div
          className="flex-shrink-0 cursor-pointer z-10 group relative"
          onClick={() => setCardSide((s) => (s === "front" ? "back" : "front"))}
          title="Click to flip Front / Back"
        >
          <div className="transform scale-[0.68] sm:scale-[0.75] origin-center transition-all duration-300 group-hover:scale-[0.78] shadow-2xl rounded-3xl overflow-hidden ring-4 ring-white/10">
            {cardSide === "front" ? (
              <OfficialIDCard profile={profile} cardId="preview-admin-card-front" />
            ) : (
              <OfficialIDCardBack cardId="preview-admin-card-back" />
            )}
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900/90 backdrop-blur-md rounded-full border border-slate-700 text-[10px] font-semibold text-slate-300 whitespace-nowrap shadow-lg flex items-center gap-1.5 pointer-events-none">
            <RotateCw className="w-3 h-3 text-indigo-400" /> Click to flip
          </div>
        </div>
      </div>

      {/* ── Main Profile & ID Card Settings Form ── */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Profile Header section */}
        <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group flex-shrink-0">
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-3xl font-bold shadow-md border-4 border-white dark:border-slate-800">
                  {profile?.fullName?.charAt(0) || "A"}
                </div>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile?.fullName || "Administrator"}
              </h3>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">
                {profile?.email}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors shadow-sm inline-flex items-center gap-2">
                  {uploadingImage ? "Uploading..." : "Change Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>

                {/* ── ID Card Photo Specifications Tooltip ── */}
                <div className="relative group/photo-tip inline-flex items-center">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
                    title="ID Card Photo Specifications"
                  >
                    <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>ID Card Photo Guide</span>
                  </button>

                  <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-80 p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl text-xs z-50 invisible opacity-0 group-hover/photo-tip:visible group-hover/photo-tip:opacity-100 transition-all duration-200 pointer-events-none border border-slate-700/80">
                    <div className="flex items-center gap-2 font-bold text-indigo-300 mb-2 pb-1.5 border-b border-slate-700">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      ID Card Photo Specifications
                    </div>
                    <ul className="space-y-2 text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-black">•</span>
                        <span>
                          <strong className="text-white">Aspect Ratio:</strong> 3:4 or 4:5 (Vertical Portrait)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-black">•</span>
                        <span>
                          <strong className="text-white">Recommended Size:</strong> 516 px × 527 px
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-black">•</span>
                        <span>
                          <strong className="text-white">Framing:</strong> Centered bust-up portrait with clear background
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wide border border-indigo-100 dark:border-indigo-800/60">
                  {profile?.role?.replace("-", " ") || "Admin"}
                </span>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide border border-emerald-100 dark:border-emerald-800/60">
                  ID: {profile?.employeeId || "FJRA-001"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Inputs ── */}
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-8">
          {/* Section 1: ID Card & Identity Info */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Identity & ID Card Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Full Name (Printed on Card)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={profile?.fullName || ""}
                    onChange={(e) =>
                      setProfile((p: any) => ({ ...p, fullName: e.target.value }))
                    }
                    className={inputCls}
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              {/* Designation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                    Designation (Printed on Card)
                  </label>
                  {profile?.role && (
                    <button
                      type="button"
                      onClick={() =>
                        setProfile((p: any) => ({
                          ...p,
                          designation: formatRoleName(p?.role),
                        }))
                      }
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      title="Sync designation with your official Role name"
                    >
                      Use Role Name ({formatRoleName(profile?.role)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profile?.designation || ""}
                    onChange={(e) =>
                      setProfile((p: any) => ({ ...p, designation: e.target.value }))
                    }
                    className={inputCls}
                    placeholder={`e.g. ${formatRoleName(profile?.role)}`}
                  />
                </div>
              </div>

              {/* Official / Employee ID */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Official / Employee ID
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profile?.employeeId || ""}
                    onChange={(e) =>
                      setProfile((p: any) => ({ ...p, employeeId: e.target.value }))
                    }
                    className={inputCls}
                    placeholder="e.g. FJRA-001"
                  />
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Blood Group (Printed on Card)
                </label>
                <div className="relative">
                  <HeartPulse className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={profile?.bloodGroup || ""}
                    onChange={(e) =>
                      setProfile((p: any) => ({ ...p, bloodGroup: e.target.value }))
                    }
                    className={inputCls}
                  >
                    <option value="">Select Blood Group</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Department
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profile?.department || ""}
                    onChange={(e) =>
                      setProfile((p: any) => ({ ...p, department: e.target.value }))
                    }
                    className={inputCls}
                    placeholder="e.g. Administration, IT, Operations"
                  />
                </div>
              </div>

              {/* Email Address (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Email Address (System Login)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className={disabledCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Numbers */}
          <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Primary Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={profile?.phone || ""}
                    onChange={(e) =>
                      setProfile((p: any) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+8801..."
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Emergency Contact Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={profile?.emergencyContactNumber || ""}
                    onChange={(e) =>
                      setProfile((p: any) => ({
                        ...p,
                        emergencyContactNumber: e.target.value,
                      }))
                    }
                    placeholder="+8801..."
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Security (Change Password) */}
          <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Security (Change Password)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) =>
                      setPasswordForm((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="Enter new password (min. 6 characters)"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({
                        ...p,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Appearance Theme */}
          <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" /> Appearance Theme
            </h4>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all ${
                  theme === "light"
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm"
                    : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs">Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all ${
                  theme === "dark"
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm"
                    : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-500" />
                <span className="text-xs">Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all ${
                  theme === "system"
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm"
                    : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <Monitor className="w-5 h-5 text-gray-500" />
                <span className="text-xs">System Mode</span>
              </button>
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span
              className={`text-sm font-semibold ${
                message.includes("successfully") || message.includes("uploaded")
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {message}
            </span>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* ── Fullscreen Zoom Overlay Modal ── */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full flex flex-col items-center gap-6 shadow-2xl">
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-lg font-bold text-white">Official ID Card Preview</h4>
                <p className="text-xs text-slate-400">
                  Viewing {cardSide === "front" ? "Front Side" : "Back Side"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOverlay(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Card render */}
            <div className="transform scale-[0.88] sm:scale-100 origin-center transition-all duration-300 shadow-2xl rounded-3xl overflow-hidden ring-4 ring-white/10">
              {cardSide === "front" ? (
                <OfficialIDCard profile={profile} cardId="modal-admin-card-front" />
              ) : (
                <OfficialIDCardBack cardId="modal-admin-card-back" />
              )}
            </div>

            {/* Modal Action Controls */}
            <div className="w-full flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCardSide((s) => (s === "front" ? "back" : "front"))}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
              >
                <RotateCw className="w-4 h-4 text-indigo-400" />
                Flip to {cardSide === "front" ? "Back" : "Front"}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadCard("front")}
                disabled={downloading}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 disabled:opacity-60"
              >
                <Download className="w-4 h-4" /> Download Front (PNG)
              </button>

              <button
                type="button"
                onClick={() => handleDownloadCard("back")}
                disabled={downloading}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 disabled:opacity-60"
              >
                <Download className="w-4 h-4" /> Download Back (PNG)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Off-screen export targets for high-res PNG download ── */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none" aria-hidden="true">
        <OfficialIDCard profile={profile} cardId="official-admin-id-card" />
        <OfficialIDCardBack cardId="official-admin-id-card-back" />
      </div>
    </div>
  );
}
