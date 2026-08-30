"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, Save, Loader2, BookOpen, AlertCircle, FileText, MapPin, UserCircle, Briefcase, Plus, Trash2, Calendar, Star, DollarSign, CheckCircle2, Circle, ShieldCheck, Download, Eye, X, Sparkles, CreditCard, Info } from "lucide-react";
import { OfficialIDCard, OfficialIDCardBack, downloadIDCardElement } from "@/components/TeacherOfficialIDCard";

// ── Profile completion scoring ─────────────────────────────────────────────
const ACCOUNT_CHECKS = [
  { key: "avatar",                    label: "Profile photo" },
  { key: "fullName",                  label: "Full name" },
  { key: "phone",                     label: "Phone number" },
  { key: "emergencyContactNumber",    label: "Emergency contact" },
  { key: "gender",                    label: "Gender" },
  { key: "bloodGroup",               label: "Blood group" },
  { key: "presentAddress",           label: "Present address" },
  { key: "permanentAddress",         label: "Permanent address" },
  { key: "nidOrBirthCertificatePicture", label: "NID / Birth certificate" },
  { key: "bio",                       label: "Biography" },
  { key: "joinDate",                  label: "Join date" },
] as const;

const PAYMENT_CHECKS = [
  { key: "accountName",   label: "Payment account name" },
  { key: "accountNumber", label: "Payment account number" },
  { key: "bankName",      label: "Bank / Provider name" },
] as const;

function calcCompletion(profile: any) {
  const checks = [
    ...ACCOUNT_CHECKS.map(c => ({ label: c.label, done: !!profile?.[c.key] })),
    { label: "At least 1 qualification", done: (profile?.qualifications?.length ?? 0) > 0 },
    ...PAYMENT_CHECKS.map(c => ({ label: c.label, done: !!profile?.paymentInfo?.[c.key] })),
  ];
  const done = checks.filter(c => c.done).length;
  return { pct: Math.round((done / checks.length) * 100), checks, done, total: checks.length };
}

export default function TeacherSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingNID, setUploadingNID] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [cardSide, setCardSide] = useState<"front" | "back">("front");

  const handleDownloadCard = async (side: "front" | "back" = cardSide) => {
    const elementId = side === "front" ? "teacher-official-id-card" : "teacher-official-id-card-back";
    const element = document.getElementById(elementId);
    if (!element) return;
    setDownloading(true);
    try {
      // Primary renderer: html-to-image (native SVG foreignObject engine, handles modern CSS colors & images without lab() parsing errors)
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `ID-Card-${profile?.teacherId || "Teacher"}-${side.toUpperCase()}.png`;
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
        link.download = `ID-Card-${profile?.teacherId || "Teacher"}-${side.toUpperCase()}.png`;
        link.href = image;
        link.click();
      } catch (fallbackErr) {
        console.error("ID Card download failed", fallbackErr);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordUpdating(true);
    setPasswordMessage("");
    setPasswordError("");
    try {
      const res = await fetch("/api/teacher-portal/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMessage("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(data.message || "Failed to update password.");
      }
    } catch (err) {
      setPasswordError("Network error. Please try again.");
    } finally {
      setPasswordUpdating(false);
      setTimeout(() => setPasswordMessage(""), 3000);
    }
  };

  const addQualification = () => {
    const newQuals = [...(profile?.qualifications || []), { degree: "", institute: "", passingYear: new Date().getFullYear() }];
    setProfile((p: any) => ({ ...p, qualifications: newQuals }));
  };
  const updateQualification = (index: number, field: string, value: any) => {
    const newQuals = [...(profile?.qualifications || [])];
    newQuals[index][field] = value;
    setProfile((p: any) => ({ ...p, qualifications: newQuals }));
  };
  const removeQualification = (index: number) => {
    const newQuals = [...(profile?.qualifications || [])];
    newQuals.splice(index, 1);
    setProfile((p: any) => ({ ...p, qualifications: newQuals }));
  };

  useEffect(() => {
    fetch("/api/teacher-portal/profile")
      .then(r => r.json())
      .then(d => {
        if (d.success) setProfile(d.teacher);
        setLoading(false);
      });
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMessage("");
    setError("");

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
        setMessage("Image uploaded successfully! Click save to apply changes.");
      } else {
        setError(data.message || "Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload image due to a network error.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNIDUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingNID(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.secure_url) {
        setProfile((prev: any) => ({ ...prev, nidOrBirthCertificatePicture: data.secure_url }));
        setMessage("Document uploaded successfully! Click save to apply changes.");
      } else {
        setError(data.message || "Failed to upload document.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload document due to a network error.");
    } finally {
      setUploadingNID(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const r = await fetch("/api/teacher-portal/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const d = await r.json();
      if (d.success) {
        setMessage("Profile updated successfully!");
        setProfile(d.teacher);
      } else {
        setError(d.message || "Failed to update profile.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const inputCls = "w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors";
  const disabledCls = "w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Account Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your personal information, address, and profile data.</p>
      </div>

      {/* ── Official Teacher ID Card Section (Approved vs Locked/Pending/Rejected) ── */}
      {profile?.idCardStatus === "approved" ? (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="space-y-3 flex-1 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Verified & Approved ID Card
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">Your Digital Teacher ID Card</h3>
            <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
              Your official Fajr Academy ID card is approved and formatted dynamically from your avatar, full name, designation, teacher ID, and blood group. Preview both Front & Back sides or download a high-resolution PNG copy.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {/* Front / Back Toggle Switcher */}
              <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15">
                <button
                  type="button"
                  onClick={() => setCardSide("front")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    cardSide === "front" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Front Side
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide("back")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    cardSide === "back" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Back Side
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowOverlay(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all border border-white/20 flex items-center gap-2 shadow-sm"
              >
                <Eye className="w-4 h-4 text-indigo-300" /> View Overlay
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCard(cardSide)}
                disabled={downloading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-60"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? "Exporting..." : `Download ${cardSide === "front" ? "Front" : "Back"} (PNG)`}
              </button>
            </div>
          </div>

          {/* Live Miniature ID Card Preview (Front or Back) */}
          <div
            className="flex-shrink-0 cursor-pointer z-10"
            onClick={() => setCardSide((s) => (s === "front" ? "back" : "front"))}
            title="Click to flip Front / Back"
          >
            <div className="transform scale-[0.7] sm:scale-[0.78] origin-center transition-transform hover:scale-[0.81]">
              {cardSide === "front" ? <OfficialIDCard profile={profile} /> : <OfficialIDCardBack />}
            </div>
          </div>
        </div>
      ) : (
        /* ── Locked State for Pending / Rejected ── */
        <div className={`rounded-2xl border p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-md transition-all ${
          profile?.idCardStatus === "rejected"
            ? "bg-gradient-to-r from-red-950 via-slate-900 to-red-950 text-white border-red-900/60"
            : "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-slate-800"
        }`}>
          <div className="space-y-3.5 flex-1 text-center md:text-left z-10">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${
              profile?.idCardStatus === "rejected"
                ? "bg-red-500/20 text-red-300 border-red-400/40"
                : "bg-amber-500/20 text-amber-300 border-amber-400/40"
            }`}>
              {profile?.idCardStatus === "rejected" ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  ID Card Verification Cancelled / Rejected
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  ID Card Pending Admin Approval
                </>
              )}
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight">
              {profile?.idCardStatus === "rejected"
                ? "Digital Teacher ID Card is Not Approved"
                : "Digital Teacher ID Card is Locked"}
            </h3>

            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              {profile?.idCardStatus === "rejected"
                ? "Your ID card approval request was not approved or has been cancelled by the administration. Please ensure your profile photo, full name, designation, and verification documents are accurate, or contact support."
                : "Your official Digital Teacher ID Card is currently under review by the administration. Once approved by an administrator, your verified ID card preview and high-resolution PNG download options will be unlocked here automatically."}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <a
                href="https://wa.me/8801410764581?text=Hello%20Fajr%20Academy%20Support%2C%20I%20would%20like%20to%20request%20Teacher%20ID%20Card%20approval."
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
              >
                Request Admin Approval via WhatsApp
              </a>
            </div>
          </div>

          {/* Locked ID Visual Graphic */}
          <div className="flex-shrink-0 z-10 flex flex-col items-center justify-center w-[220px] h-[230px] rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md p-5 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-3 shadow-inner border border-white/10">
              <Lock className={`w-8 h-8 ${profile?.idCardStatus === "rejected" ? "text-red-400" : "text-amber-400"}`} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-white mb-1">
              {profile?.idCardStatus === "rejected" ? "Approval Rejected" : "Approval Required"}
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              Admin must approve ID card before it can be viewed or downloaded.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Profile Header section */}
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group flex-shrink-0">
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={profile.avatar} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" 
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-3xl font-bold shadow-md border-4 border-white">
                  {profile?.fullName?.charAt(0) || "T"}
                </div>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900">{profile?.fullName}</h3>
              <p className="text-sm font-medium text-gray-500 mb-3">{profile?.email}</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm inline-flex items-center gap-2">
                  {uploadingImage ? "Uploading..." : "Change Photo"}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                    disabled={uploadingImage} 
                  />
                </label>

                {/* ── ID Card Photo Size Guide Tooltip ── */}
                <div className="relative group/photo-tip inline-flex items-center">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
                    title="ID Card Photo Specifications"
                  >
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>ID Card Photo Guide</span>
                  </button>

                  {/* Tooltip Hover Popover */}
                  <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl text-xs z-50 invisible opacity-0 group-hover/photo-tip:visible group-hover/photo-tip:opacity-100 transition-all duration-200 pointer-events-none border border-slate-700/80">
                    <div className="flex items-center gap-2 font-bold text-indigo-300 mb-2 pb-1.5 border-b border-slate-700">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      ID Card Ideal Photo Specifications
                    </div>
                    <ul className="space-y-2 text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-black">•</span>
                        <span><strong className="text-white">Aspect Ratio:</strong> 3:4 or 4:5 (Vertical Portrait)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-black">•</span>
                        <span><strong className="text-white">Recommended Size:</strong> 516 px x 527 px</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-black">•</span>
                        <span><strong className="text-white">Format & File:</strong> JPG, PNG, WEBP (Max 5 MB)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-black">•</span>
                        <span><strong className="text-white">Framing:</strong> Centered headshot / bust-up portrait with clear lighting</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-100">
                  {profile?.designation || "Instructor"}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${
                  profile?.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                  {profile?.status || "Active"}
                </span>
              </div>

              {/* ── Profile Completion Bar ── */}
              {(() => {
                const { pct, checks, done, total } = calcCompletion(profile);
                const color = pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-indigo-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
                const textColor = pct === 100 ? "text-emerald-600" : pct >= 70 ? "text-indigo-600" : pct >= 40 ? "text-amber-600" : "text-red-500";
                const incomplete = checks.filter(c => !c.done);
                return (
                  <div className="mt-4 w-full max-w-md">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                        <ShieldCheck className={`w-4 h-4 ${textColor}`} />
                        Profile Completion
                      </span>
                      <span className={`text-lg font-black ${textColor}`}>{pct}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{done} of {total} fields completed</p>
                    {incomplete.length > 0 && pct < 100 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {incomplete.slice(0, 5).map(c => (
                          <span key={c.label} className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                            <Circle className="w-2.5 h-2.5 text-gray-400" />
                            {c.label}
                          </span>
                        ))}
                        {incomplete.length > 5 && (
                          <span className="text-[10px] text-gray-400 font-medium px-1">+{incomplete.length - 5} more</span>
                        )}
                      </div>
                    )}
                    {pct === 100 && (
                      <p className="mt-1.5 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Your profile is 100% complete!
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {error && (
          <div className="m-6 mb-0 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-8">
          
          {/* Section 1: Basic Information */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <UserCircle className="w-5 h-5 text-indigo-600" />
              <h4 className="text-base font-semibold text-gray-900">Basic Information</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Teacher ID</label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={profile?.teacherId || "Not assigned"} disabled className={disabledCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Designation</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={profile?.designation || ""} disabled className={disabledCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" required value={profile?.fullName || ""} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="email" value={profile?.email || ""} disabled className={disabledCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Gender</label>
                <select value={profile?.gender || "male"} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Blood Group</label>
                <select value={profile?.bloodGroup || "A+"} onChange={e => setProfile(p => ({ ...p, bloodGroup: e.target.value }))} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Address */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h4 className="text-base font-semibold text-gray-900">Contact & Address</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="tel" value={profile?.phone || ""} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="+8801..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Emergency Contact Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="tel" required value={profile?.emergencyContactNumber || ""} onChange={e => setProfile(p => ({ ...p, emergencyContactNumber: e.target.value }))} className={inputCls} placeholder="+8801..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Present Address</label>
                <textarea required value={profile?.presentAddress || ""} onChange={e => setProfile(p => ({ ...p, presentAddress: e.target.value }))} rows={3} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Permanent Address</label>
                <textarea required value={profile?.permanentAddress || ""} onChange={e => setProfile((p: any) => ({ ...p, permanentAddress: e.target.value }))} rows={3} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">NID / Birth Certificate (Document Link or Text)</label>
                <div className="flex gap-2">
                  <input type="text" value={profile?.nidOrBirthCertificatePicture || ""} onChange={e => setProfile((p: any) => ({ ...p, nidOrBirthCertificatePicture: e.target.value }))} className={`${inputCls} flex-1`} placeholder="Enter NID Number or Document URL..." />
                  <label className="cursor-pointer px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm inline-flex items-center justify-center flex-shrink-0">
                    {uploadingNID ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload File"}
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleNIDUpload} disabled={uploadingNID} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Professional Info */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <FileText className="w-5 h-5 text-amber-600" />
              <h4 className="text-base font-semibold text-gray-900">Professional Profile</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Join Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="date" value={profile?.joinDate ? new Date(profile.joinDate).toISOString().split('T')[0] : ""} onChange={e => setProfile((p: any) => ({ ...p, joinDate: e.target.value }))} className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            
        
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {profile?.rating || "0.0"} ({profile?.totalRatings || 0} reviews)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Biography & Notes</label>
                <textarea value={profile?.bio || ""} onChange={e => setProfile((p: any) => ({ ...p, bio: e.target.value }))} rows={4} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y" placeholder="Brief introduction, teaching philosophy, or notable achievements..." />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Educational Qualifications</label>
                  <button type="button" onClick={addQualification} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Qualification
                  </button>
                </div>
                
                {profile?.qualifications?.length > 0 ? (
                  <div className="space-y-3">
                    {profile.qualifications.map((qual: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <input type="text" placeholder="Degree (e.g. BSc in CSE)" value={qual.degree} onChange={e => updateQualification(idx, "degree", e.target.value)} className="w-full sm:w-1/3 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <input type="text" placeholder="Institute" value={qual.institute} onChange={e => updateQualification(idx, "institute", e.target.value)} className="w-full sm:w-1/3 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <input type="number" placeholder="Passing Year" value={qual.passingYear} onChange={e => updateQualification(idx, "passingYear", parseInt(e.target.value))} className="w-full sm:w-1/4 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <button type="button" onClick={() => removeQualification(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md ml-auto">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No qualifications added yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <span className={`text-sm font-medium ${message ? 'text-emerald-600' : ''}`}>{message}</span>
            <button type="submit" disabled={saving || uploadingImage} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 transition-colors shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-6">
        <form onSubmit={handlePasswordUpdate} className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Lock className="w-5 h-5 text-red-500" />
            <h4 className="text-base font-semibold text-gray-900">Security & Password</h4>
          </div>
          
          {passwordError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{passwordError}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Current Password</label>
              <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="Enter current password" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">New Password</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="Enter new password" minLength={6} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="Confirm new password" minLength={6} />
            </div>
          </div>
          
          <div className="pt-2 flex items-center justify-between">
            <span className={`text-sm font-medium ${passwordMessage ? 'text-emerald-600' : ''}`}>{passwordMessage}</span>
            <button type="submit" disabled={passwordUpdating} className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-60 flex items-center gap-2 transition-colors shadow-sm">
              {passwordUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {passwordUpdating ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* ── ID Card Overlay Modal ── */}
      {showOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900/90 border border-slate-700/60 p-6 sm:p-8 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-5 max-w-lg w-full relative">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowOverlay(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center text-white space-y-1 pt-1">
              <h3 className="text-xl font-bold tracking-tight">Official Teacher ID Card</h3>
              <p className="text-xs text-slate-300">Fajr Academy Verified Identity Card</p>
            </div>

            {/* Front / Back Switcher in Modal */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => setCardSide("front")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  cardSide === "front" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                }`}
              >
                Front Side
              </button>
              <button
                type="button"
                onClick={() => setCardSide("back")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  cardSide === "back" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                }`}
              >
                Back Side
              </button>
            </div>

            {/* ID Card Display (Front or Back) */}
            <div className="shadow-2xl rounded-3xl overflow-hidden my-1">
              {cardSide === "front" ? <OfficialIDCard profile={profile} /> : <OfficialIDCardBack />}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2.5 w-full pt-1">
              <button
                type="button"
                onClick={() => handleDownloadCard("front")}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download Front
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCard("back")}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs sm:text-sm transition-all shadow-lg disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download Back
              </button>
              <button
                type="button"
                onClick={() => setShowOverlay(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all"
              >
                Done
              </button>
            </div>

            {/* Photo Tip Note */}
            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Recommended photo: <strong>3:4 portrait (600×800 px)</strong> for crispest print quality.</span>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
