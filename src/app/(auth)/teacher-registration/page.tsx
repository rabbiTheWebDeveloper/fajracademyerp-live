"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, ArrowRight, Save, Loader2, AlertCircle,
  UserCircle, FileText, MapPin, GraduationCap, Plus, Trash2,
  BookOpen, CheckCircle, Shield, Camera, Eye, EyeOff, Phone,
  Mail, Lock, User, Briefcase, Award, Upload,
  ChevronRight, Sparkles
} from "lucide-react";
import Link from "next/link";

interface Qualification {
  degree: string;
  institute: string;
  passingYear: string | number;
}

const STEPS = [
  { id: 1, label: "Personal", icon: User, color: "from-emerald-500 to-teal-500" },
  { id: 2, label: "Address", icon: MapPin, color: "from-blue-500 to-cyan-500" },
  { id: 3, label: "Professional", icon: Briefcase, color: "from-violet-500 to-purple-500" },
  { id: 4, label: "Qualifications", icon: Award, color: "from-amber-500 to-orange-500" },
  { id: 5, label: "Verification", icon: Shield, color: "from-rose-500 to-pink-500" },
];

/* ─── Shared Style Constants ─── */
const inputCls =
  "w-full bg-transparent outline-none text-sm text-white placeholder:text-white/20 pl-10 pr-4 py-3";

const smallInputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none border border-white/[0.08] focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all bg-white/5";

const selectCls =
  "dark-select w-full px-4 py-3 rounded-2xl text-sm text-white bg-white/5 border border-white/[0.08] focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer";

const textareaCls =
  "w-full px-4 py-3 rounded-2xl text-sm text-white bg-white/5 border border-white/[0.08] focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none placeholder:text-white/20";

const labelCls = "block text-sm font-medium text-white/50 mb-2";

/* ─── Sub-components ─── */
function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <label className={labelCls}>
        {label}{" "}
        {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

function InputIcon({
  icon: Icon,
  trailingEl,
  hasError,
  children,
}: {
  icon: React.ElementType;
  trailingEl?: React.ReactNode;
  hasError?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative flex items-center rounded-2xl bg-white/5 border transition-all overflow-hidden ${
      hasError
        ? "border-rose-500/50 ring-1 ring-rose-500/20"
        : "border-white/[0.08] focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20"
    }`}>
      <Icon className={`absolute left-3.5 w-4 h-4 pointer-events-none flex-shrink-0 ${hasError ? "text-rose-400/60" : "text-white/25"}`} />
      {children}
      {trailingEl}
    </div>
  );
}

export default function TeacherRegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [form, setForm] = useState({
    fullName: "",
    designation: "",
    category: "",
    email: "",
    phone: "",
    emergencyContactNumber: "",
    gender: "male",
    password: "",
    avatar: "",
    bloodGroup: "A+",
    presentAddress: "",
    permanentAddress: "",
    nidOrBirthCertificatePicture: "",
    bio: "",
  });

  useEffect(() => {
    setCategoriesLoading(true);
    fetch("/api/teachers/category")
      .then(r => r.json())
      .then(data => { if (data.success) setCategories(data.categories || []); })
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));
  }, []);

  const [qualifications, setQualifications] = useState<Qualification[]>([
    { degree: "", institute: "", passingYear: "" },
  ]);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingNID, setUploadingNID] = useState(false);

  const setField = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "avatar" | "nidOrBirthCertificatePicture"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fieldName === "avatar") setUploadingAvatar(true);
    else setUploadingNID(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, [fieldName]: data.secure_url }));
      } else {
        alert(data.message || "Failed to upload file");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file. Please try again.");
    } finally {
      if (fieldName === "avatar") setUploadingAvatar(false);
      else setUploadingNID(false);
    }
  };

  const handleQualificationChange = (
    index: number,
    field: keyof Qualification,
    value: string
  ) => {
    const updated = [...qualifications];
    updated[index] = { ...updated[index], [field]: value };
    setQualifications(updated);
  };

  const addQualification = () =>
    setQualifications([...qualifications, { degree: "", institute: "", passingYear: "" }]);

  const removeQualification = (index: number) =>
    setQualifications(qualifications.filter((_, i) => i !== index));

  const validateStep = (step: number): { general: string; fields: Record<string, string> } => {
    const fields: Record<string, string> = {};
    let general = "";

    if (step === 1) {
      if (!form.fullName.trim())  fields.fullName = "Full name is required.";
      if (!form.email.trim())     fields.email    = "Email address is required.";
      if (!form.password || form.password.length < 6)
        fields.password = "Password must be at least 6 characters.";
      if (Object.keys(fields).length > 0)
        general = "Please fill in all required fields to continue.";
    }
    if (step === 2) {
      if (!form.presentAddress.trim())  fields.presentAddress  = "Present address is required.";
      if (!form.permanentAddress.trim()) fields.permanentAddress = "Permanent address is required.";
      if (Object.keys(fields).length > 0)
        general = "Both address fields are required.";
    }
    if (step === 3) {
      if (!form.category) {
        fields.category = "Please select a teacher category.";
        general = "Teacher category is required to continue.";
      }
    }
    if (step === 5) {
      const phoneRegex = /^[0-9+\-\s]{10,15}$/;
      if (!form.emergencyContactNumber.trim())
        fields.emergencyContactNumber = "Emergency contact number is required.";
      else if (!phoneRegex.test(form.emergencyContactNumber))
        fields.emergencyContactNumber = "Must be 10–15 digits.";
      if (form.phone && !phoneRegex.test(form.phone))
        fields.phone = "Contact number format is invalid (10-15 digits).";
      if (!form.nidOrBirthCertificatePicture)
        fields.nidOrBirthCertificatePicture = "NID / Birth Certificate picture is required.";
      if (Object.keys(fields).length > 0)
        general = "Please fix the errors below before submitting.";
    }
    return { general, fields };
  };

  const goNext = () => {
    setError("");
    setFieldErrors({});
    const { general, fields } = validateStep(currentStep);
    if (general) {
      setError(general);
      setFieldErrors(fields);
      // Scroll to top of form so error banner is visible
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrentStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setError("");
    setFieldErrors({});
    if (currentStep > 1) setCurrentStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const { general, fields } = validateStep(5);
    if (general) {
      setError(general);
      setFieldErrors(fields);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setLoading(true);

    const formattedQualifications = qualifications
      .filter((q) => q.degree.trim() || q.institute.trim() || q.passingYear)
      .map((q) => ({
        degree: q.degree.trim(),
        institute: q.institute.trim(),
        passingYear: q.passingYear ? Number(q.passingYear) : undefined,
      }));

    const payload = {
      ...form,
      qualifications: formattedQualifications,
      salary: 0,
      salaryType: "monthly",
      status: "inactive",
    };

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to register");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  /* ─── Success Screen ─── */
  if (success) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-800 p-4">
        <div
          className="relative text-center max-w-sm w-full rounded-3xl overflow-hidden p-10"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Application Submitted!
            </h2>
            <p className="text-emerald-100/60 text-sm leading-relaxed mb-8">
              Your teacher profile is pending admin approval. We'll contact you
              shortly. JazakAllahu Khayran!
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all"
            >
              <BookOpen className="w-4 h-4" /> Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-600/15 blur-3xl animate-pulse" />
        <div
          className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative min-h-full flex flex-col">
        {/* ── Top Header Bar ── */}
        <header
          className="sticky top-0 z-30 border-b border-white/5"
          style={{
            background: "rgba(10,25,49,0.70)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide leading-none">
                  FAJR Academy
                </p>
                <p className="hidden sm:block text-xs text-emerald-400/60 mt-0.5">
                  Teacher Registration Portal
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* ── Hero Text ── */}
            <div className="text-center pt-2">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-xs font-semibold text-emerald-300 border border-emerald-500/30"
                style={{ background: "rgba(16,185,129,0.08)" }}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Join Our Teaching Community
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
                Become an Instructor
              </h1>
              <p className="text-sm text-white/35 max-w-md mx-auto">
                Complete all 5 steps to submit your teaching application. Our
                team will review and contact you shortly.
              </p>
            </div>

            {/* ── Step Indicators ── */}
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 mx-8 sm:mx-16 h-px bg-white/[0.06] rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 ease-in-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="relative flex items-start justify-between px-4 sm:px-8">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  const isDone = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (step.id < currentStep) {
                          setError("");
                          setCurrentStep(step.id);
                        }
                      }}
                      className="flex flex-col items-center gap-2"
                      style={{
                        cursor: step.id < currentStep ? "pointer" : "default",
                      }}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 ${
                          isDone
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30"
                            : isActive
                            ? `bg-gradient-to-br ${step.color} shadow-lg`
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Icon
                            className={`w-4 h-4 ${
                              isActive ? "text-white" : "text-white/25"
                            }`}
                          />
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium hidden sm:block transition-colors ${
                          isActive
                            ? "text-white"
                            : isDone
                            ? "text-emerald-400"
                            : "text-white/20"
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Error Banner ── */}
            {error && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-red-300 border border-red-500/20"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                {error}
              </div>
            )}

            {/* ── Form Card ── */}
            <form onSubmit={handleSubmit}>
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* Card Header */}
                <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-white/[0.05]">
                  {(() => {
                    const step = STEPS[currentStep - 1];
                    const Icon = step.icon;
                    return (
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg flex-shrink-0`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-white/25 font-medium uppercase tracking-widest mb-0.5">
                            Step {currentStep} of {STEPS.length}
                          </p>
                          <h2 className="text-xl font-bold text-white">
                            {step.label} Information
                          </h2>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Card Body */}
                <div className="px-6 sm:px-8 py-8">
                  {/* ── STEP 1: Personal Details ── */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      {/* Avatar Upload */}
                      <div
                        className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border border-white/[0.05]"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <div className="relative flex-shrink-0">
                          {form.avatar ? (
                            <img
                              src={form.avatar}
                              alt="Avatar"
                              className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400/50 shadow-lg"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-900 to-teal-900 border border-white/10 flex items-center justify-center shadow-inner">
                              <UserCircle className="w-10 h-10 text-white/20" />
                            </div>
                          )}
                          <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                            <Camera className="w-3.5 h-3.5 text-white" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, "avatar")}
                            />
                          </label>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white/70 mb-1">
                            Profile Photo
                          </p>
                          <p className="text-xs text-white/30">
                            Upload a clear headshot. JPG or PNG, max 5MB.
                          </p>
                          {uploadingAvatar && (
                            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />{" "}
                              Uploading...
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FormField label="Full Name" required error={fieldErrors.fullName}>
                          <InputIcon icon={User} hasError={!!fieldErrors.fullName}>
                            <input
                              type="text"
                              autoFocus
                              placeholder="e.g. Sheikh Abdullah"
                              value={form.fullName}
                              onChange={(e) => { setField("fullName", e.target.value); setFieldErrors(p => ({...p, fullName: ""})); }}
                              className={inputCls}
                            />
                          </InputIcon>
                        </FormField>

                        <FormField label="Email Address" required error={fieldErrors.email}>
                          <InputIcon icon={Mail} hasError={!!fieldErrors.email}>
                            <input
                              type="email"
                              placeholder="teacher@fajracademy.com"
                              value={form.email}
                              onChange={(e) => { setField("email", e.target.value); setFieldErrors(p => ({...p, email: ""})); }}
                              className={inputCls}
                            />
                          </InputIcon>
                        </FormField>

                        <FormField label="Password" required error={fieldErrors.password}>
                          <InputIcon
                            icon={Lock}
                            hasError={!!fieldErrors.password}
                            trailingEl={
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-white/25 hover:text-white/60 transition-colors pr-4 flex-shrink-0"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            }
                          >
                            <input
                              type={showPassword ? "text" : "password"}
                              minLength={6}
                              placeholder="Min. 6 characters"
                              value={form.password}
                              onChange={(e) => { setField("password", e.target.value); setFieldErrors(p => ({...p, password: ""})); }}
                              className={inputCls}
                            />
                          </InputIcon>
                        </FormField>

                        <FormField label="Gender" required>
                          <select value={form.gender} onChange={(e) => setField("gender", e.target.value)} className={selectCls}>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </FormField>

                        <FormField label="Blood Group" required>
                          <select value={form.bloodGroup} onChange={(e) => setField("bloodGroup", e.target.value)} className={selectCls}>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </FormField>

                        <FormField label="Contact Number" error={fieldErrors.phone}>
                          <InputIcon icon={Phone} hasError={!!fieldErrors.phone}>
                            <input
                              type="text"
                              placeholder="+880 1712 345678"
                              value={form.phone}
                              onChange={(e) => { setField("phone", e.target.value); setFieldErrors(p => ({...p, phone: ""})); }}
                              className={inputCls}
                            />
                          </InputIcon>
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Address ── */}
                  {currentStep === 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FormField label="Present Address" required error={fieldErrors.presentAddress}>
                        <textarea
                          rows={6}
                          placeholder="Enter your current residential address..."
                          value={form.presentAddress}
                          onChange={(e) => { setField("presentAddress", e.target.value); setFieldErrors(p => ({...p, presentAddress: ""})); }}
                          className={`${textareaCls} ${fieldErrors.presentAddress ? "border-rose-500/50 ring-1 ring-rose-500/20" : ""}`}
                        />
                      </FormField>
                      <FormField label="Permanent Address" required error={fieldErrors.permanentAddress}>
                        <textarea
                          rows={6}
                          placeholder="Enter address as on your NID card..."
                          value={form.permanentAddress}
                          onChange={(e) => { setField("permanentAddress", e.target.value); setFieldErrors(p => ({...p, permanentAddress: ""})); }}
                          className={`${textareaCls} ${fieldErrors.permanentAddress ? "border-rose-500/50 ring-1 ring-rose-500/20" : ""}`}
                        />
                      </FormField>
                    </div>
                  )}

                  {/* ── STEP 3: Professional ── */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <FormField label="Teacher Category" required error={fieldErrors.category}>
                        {categoriesLoading ? (
                          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/[0.08] text-sm text-white/30">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading categories...
                          </div>
                        ) : (
                          <select
                            value={form.category}
                            onChange={(e) => {
                              const catId = e.target.value;
                              const catName = categories.find((c: any) => c._id === catId)?.name || "";
                              setForm(p => ({ ...p, category: catId, designation: catName }));
                              setFieldErrors(p => ({...p, category: ""}));
                            }}
                            className={`${selectCls} ${fieldErrors.category ? "border-rose-500/50 ring-1 ring-rose-500/20" : ""}`}
                          >
                            <option value="">Select a category...</option>
                            {categories.map((c: any) => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                        {form.designation && (
                          <p className="mt-1.5 text-xs text-emerald-400/70 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Designation set to: <span className="font-semibold">{form.designation}</span>
                          </p>
                        )}
                      </FormField>
                      <FormField label="Bio / Introduction">
                        <textarea
                          rows={7}
                          placeholder="Tell us about your background, teaching experience, and areas of expertise..."
                          value={form.bio}
                          onChange={(e) => setField("bio", e.target.value)}
                          className={textareaCls}
                        />
                      </FormField>
                    </div>
                  )}

                  {/* ── STEP 4: Qualifications ── */}
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      {qualifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-white/10 rounded-2xl">
                          <GraduationCap className="w-10 h-10 text-white/10 mb-3" />
                          <p className="text-sm text-white/25">
                            No qualifications added yet.
                          </p>
                        </div>
                      ) : (
                        qualifications.map((q, index) => (
                          <div
                            key={index}
                            className="relative grid grid-cols-1 sm:grid-cols-12 gap-4 p-5 rounded-2xl border border-white/[0.05]"
                            style={{ background: "rgba(255,255,255,0.03)" }}
                          >
                            <div className="sm:col-span-4">
                              <label className="block text-xs font-semibold text-white/25 uppercase tracking-widest mb-1.5">
                                Degree / Certificate
                              </label>
                              <input
                                type="text"
                                value={q.degree}
                                onChange={(e) =>
                                  handleQualificationChange(
                                    index,
                                    "degree",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. Hafiz-e-Quran"
                                className={smallInputCls}
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <label className="block text-xs font-semibold text-white/25 uppercase tracking-widest mb-1.5">
                                Institute / Board
                              </label>
                              <input
                                type="text"
                                value={q.institute}
                                onChange={(e) =>
                                  handleQualificationChange(
                                    index,
                                    "institute",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. Al-Azhar University"
                                className={smallInputCls}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-white/25 uppercase tracking-widest mb-1.5">
                                Year
                              </label>
                              <input
                                type="number"
                                value={q.passingYear}
                                onChange={(e) =>
                                  handleQualificationChange(
                                    index,
                                    "passingYear",
                                    e.target.value
                                  )
                                }
                                placeholder="2020"
                                className={smallInputCls}
                              />
                            </div>
                            <div className="sm:col-span-1 flex items-end pb-0.5">
                              <button
                                type="button"
                                onClick={() => removeQualification(index)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/[0.05] hover:border-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      <button
                        type="button"
                        onClick={addQualification}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-amber-500/25 text-amber-400/60 hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" /> Add Qualification
                      </button>
                    </div>
                  )}

                  {/* ── STEP 5: Verification ── */}
                  {currentStep === 5 && (
                    <div className="space-y-6">
                      <FormField label="Emergency Contact Number" required error={fieldErrors.emergencyContactNumber}>
                        <InputIcon icon={Phone} hasError={!!fieldErrors.emergencyContactNumber}>
                          <input
                            type="text"
                            autoFocus
                            placeholder="+880 1812 345678"
                            value={form.emergencyContactNumber}
                            onChange={(e) => { setField("emergencyContactNumber", e.target.value); setFieldErrors(p => ({...p, emergencyContactNumber: ""})); }}
                            className={inputCls}
                          />
                        </InputIcon>
                      </FormField>

                      {/* NID Upload */}
                      <div>
                        <label className={labelCls}>
                          NID / Birth Certificate Picture{" "}
                          <span className="text-rose-400">*</span>
                        </label>
                        {fieldErrors.nidOrBirthCertificatePicture && (
                          <p className="mb-1.5 text-xs text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{fieldErrors.nidOrBirthCertificatePicture}
                          </p>
                        )}
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Upload zone */}
                          <label className="flex flex-col items-center justify-center gap-3 min-h-[170px] rounded-2xl border-2 border-dashed border-white/10 hover:border-rose-500/40 hover:bg-rose-500/5 cursor-pointer transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 group-hover:bg-rose-500/15 flex items-center justify-center transition-colors">
                              <Upload className="w-5 h-5 text-rose-400" />
                            </div>
                            <div className="text-center px-4">
                              <p className="text-sm font-medium text-white/50 group-hover:text-white/70 transition-colors">
                                Click to upload document
                              </p>
                              <p className="text-xs text-white/20 mt-1">
                                PNG, JPG or WEBP accepted
                              </p>
                            </div>
                            {uploadingNID && (
                              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />{" "}
                                Uploading securely...
                              </p>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileUpload(
                                  e,
                                  "nidOrBirthCertificatePicture"
                                )
                              }
                            />
                          </label>

                          {/* Preview */}
                          {form.nidOrBirthCertificatePicture ? (
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 min-h-[170px] bg-white/5 group">
                              <img
                                src={form.nidOrBirthCertificatePicture}
                                alt="Document Preview"
                                className="w-full h-full object-cover absolute inset-0"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <a
                                  href={form.nidOrBirthCertificatePicture}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-xl backdrop-blur-sm transition-all"
                                >
                                  View Full Size
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center min-h-[170px] rounded-2xl border border-white/[0.05] bg-white/[0.02]">
                              <FileText className="w-8 h-8 text-white/10 mb-2" />
                              <p className="text-xs text-white/15">
                                Preview will appear here
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Summary Review */}
                      <div
                        className="p-5 rounded-2xl border border-white/[0.05]"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <p className="text-xs font-bold text-white/25 uppercase tracking-widest mb-4">
                          Application Summary
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          {[
                            { label: "Name", value: form.fullName },
                            { label: "Email", value: form.email },
                            { label: "Designation", value: form.designation },
                            { label: "Gender", value: form.gender },
                            { label: "Blood Group", value: form.bloodGroup },
                            {
                              label: "Qualifications",
                              value: `${
                                qualifications.filter((q) => q.degree).length
                              } added`,
                            },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-xs text-white/20">{label}</p>
                              <p className="text-sm text-white/60 font-medium truncate mt-0.5">
                                {value || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Card Footer / Navigation ── */}
                <div className="px-6 sm:px-8 pb-8 flex flex-col-reverse sm:flex-row items-center gap-4 border-t border-white/[0.04] pt-6">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-sm font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" /> Previous
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-sm font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" /> Already have an account?
                    </Link>
                  )}

                  <div className="sm:ml-auto w-full sm:w-auto">
                    {currentStep < 5 ? (
                      <button
                        type="button"
                        onClick={goNext}
                        className="w-full flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading || uploadingAvatar || uploadingNID}
                        className="w-full flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {loading ? "Submitting..." : "Submit Application"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            <p className="text-center text-xs text-white/15 pb-6">
              By submitting, you agree to Fajr Academy&apos;s Terms of Service
              and Privacy Policy.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
