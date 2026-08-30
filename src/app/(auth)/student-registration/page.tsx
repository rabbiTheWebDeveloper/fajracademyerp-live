"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { PhoneInput, isValidPhoneNumber } from "@/components/ui/phone-input";
import {
  User, Mail, Phone, Lock, BookOpen, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft,
  Sparkles, UserCheck, GraduationCap, ChevronDown,
  UserCircle2, Hash, Copy, Check, Star, BanknoteIcon, Users,
} from "lucide-react";

/* ─── Types ─── */
interface CourseOption { _id: string; title: string; courseId?: string; }

type FormValues = {
  fullName: string; fatherName: string; motherName: string; age: string;
  email: string; phone: string; whatsappNumber: string;
  gender: "male" | "female"; selectedCourse: string;
  admissionFee: string; monthlyFee: string;
  password: string; confirmPassword: string;
};

/* ─── Shared Styles ─── */
const fieldCls = "flex flex-col gap-1.5";
const labelCls = "text-[10px] font-bold uppercase tracking-[0.12em] text-white/40";
const inputBaseCls =
  "w-full bg-transparent outline-none text-[13px] text-white placeholder:text-white/20 py-[11px] leading-none";
const inputWrapBase =
  "flex items-center rounded-[10px] border transition-all duration-200 overflow-hidden";
const inputWrapNormal =
  "bg-white/[0.05] border-white/[0.08] focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/15 focus-within:bg-white/[0.07]";
const inputWrapError =
  "bg-rose-500/5 border-rose-500/35 ring-1 ring-rose-500/10";

/* ─── FormField wrapper ─── */
function Field({
  label, required = false, error, hint, children,
}: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={fieldCls}>
      <label className={labelCls}>{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
      {children}
      {error
        ? <p className="text-[11px] text-rose-400/90 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3 flex-shrink-0" />{error}</p>
        : hint && <p className="text-[11px] text-white/25">{hint}</p>
      }
    </div>
  );
}

/* ─── Prefixed Input (icon left) ─── */
function PrefixInput({
  icon: Icon, hasError = false, trailing, children,
}: { icon: React.ElementType; hasError?: boolean; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`${inputWrapBase} ${hasError ? inputWrapError : inputWrapNormal}`}>
      <Icon className={`ml-3 w-[14px] h-[14px] flex-shrink-0 pointer-events-none ${hasError ? "text-rose-400/60" : "text-white/25"}`} />
      {children}
      {trailing}
    </div>
  );
}

/* ─── Eye toggle button ─── */
function EyeBtn({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle}
      className="mr-3 text-white/25 hover:text-white/60 transition-colors cursor-pointer flex-shrink-0">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

function StudentRegistrationForm() {
  const searchParams = useSearchParams();
  const crmParam = searchParams.get("crm") || searchParams.get("ref") || "";

  const [step, setStep] = useState<1 | 2>(1);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [formError, setFormError] = useState("");
  const [copiedConflictId, setCopiedConflictId] = useState(false);
  const [checkingStep1, setCheckingStep1] = useState(false);
  const [existingStudentConflict, setExistingStudentConflict] = useState<{
    studentId: string;
    fullName?: string;
    field?: string;
    message?: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<{
    fullName: string;
    studentId: string;
    email: string;
    phone?: string;
    status?: string;
    invoiceId?: string;
    monthlyFee?: number;
    admissionFee?: number;
  } | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const { register, control, handleSubmit, trigger, watch, setValue, setError, clearErrors, getValues,
    formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { gender: "male", selectedCourse: "", admissionFee: "", monthlyFee: "" },
  });

  const watchGender = watch("gender");
  const watchPassword = watch("password");

  useEffect(() => {
    setLoadingCourses(true);
    fetch("/api/courses?limit=100")
      .then(r => r.json())
      .then(d => { if (d.courses) setCourses(d.courses); })
      .catch(console.error)
      .finally(() => setLoadingCourses(false));
  }, []);

  const handleNextStep = async () => {
    setFormError("");
    setExistingStudentConflict(null);
    clearErrors(["phone", "email"]);

    const isValid = await trigger(["fullName", "email", "fatherName", "motherName", "age", "phone", "whatsappNumber"]);
    if (!isValid) return;

    setCheckingStep1(true);
    try {
      const phoneVal = getValues("phone") || "";
      const emailVal = getValues("email") || "";
      const checkRes = await fetch(
        `/api/students/check?phone=${encodeURIComponent(phoneVal.trim())}&email=${encodeURIComponent(emailVal.trim())}`
      );
      const checkData = await checkRes.json();

      if (checkData?.exists) {
        setExistingStudentConflict({
          studentId: checkData.studentId || "N/A",
          fullName: checkData.fullName,
          field: checkData.field,
          message: checkData.message,
        });
        setFormError(checkData.message);

        if (checkData.field === "phone") {
          setError("phone", {
            type: "manual",
            message: checkData.message || `Phone already registered (ID: ${checkData.studentId})`,
          });
        } else if (checkData.field === "email") {
          setError("email", {
            type: "manual",
            message: checkData.message || `Email already registered (ID: ${checkData.studentId})`,
          });
        }
        return;
      }

      setStep(2);
    } catch (e: any) {
      // If check endpoint has unexpected issue, allow advancing to step 2 (server POST will validate)
      setStep(2);
    } finally {
      setCheckingStep1(false);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setFormError("");
    setExistingStudentConflict(null);
    try {
      const payload: Record<string, any> = {
        fullName: data.fullName.trim(), gender: data.gender,
        fatherName: data.fatherName.trim(), motherName: data.motherName.trim(),
        age: Number(data.age), phone: data.phone.trim(),
        whatsappNumber: data.whatsappNumber.trim(), email: data.email.trim(),
        password: data.password,
        status: "inactive",
        isActive: false,
      };
      if (crmParam) payload.crmRefId = crmParam.trim();
      if (data.selectedCourse) payload.course = data.selectedCourse;
      if (data.admissionFee) payload.admissionFee = Number(data.admissionFee);
      if (data.monthlyFee) payload.monthlyFee = Number(data.monthlyFee);

      const res = await fetch("/api/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.studentId) {
          setExistingStudentConflict({
            studentId: json.studentId,
            fullName: json.fullName,
            field: json.field,
            message: json.message,
          });
        }
        if (json.field === "phone") {
          setError("phone", {
            type: "manual",
            message: json.message,
          });
          setStep(1);
        } else if (json.field === "email") {
          setError("email", {
            type: "manual",
            message: json.message,
          });
          setStep(1);
        }
        throw new Error(json.message || "Registration failed.");
      }
      setCreatedStudent({
        fullName: json.student.fullName,
        studentId: json.student.studentId || "Generated",
        email: json.student.email,
        phone: json.student.phone || data.phone.trim(),
        status: json.student.status || "inactive",
        invoiceId: json.invoice?.invoiceId,
        monthlyFee: json.invoice?.amount ?? json.student.monthlyFee,
        admissionFee: json.admissionInvoice?.amount ?? json.student.admissionFee,
      });
    } catch (err: any) { setFormError(err.message || "Unexpected error."); }
  };

  const copyConflictId = () => {
    if (!existingStudentConflict?.studentId) return;
    navigator.clipboard.writeText(existingStudentConflict.studentId).then(() => {
      setCopiedConflictId(true);
      setTimeout(() => setCopiedConflictId(false), 2000);
    });
  };

  const copyId = () => {
    if (!createdStudent) return;
    navigator.clipboard.writeText(createdStudent.studentId).then(() => { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); });
  };

  const copyActivationMessage = () => {
    if (!createdStudent) return;
    const msg = `Assalamu Alaikum,\nI have registered as a new student at FAJR Academy.\nPlease activate my account.\n\n📌 Student ID: ${createdStudent.studentId}\n👤 Name: ${createdStudent.fullName}\n📧 Email: ${createdStudent.email}\n📱 Phone: ${createdStudent.phone || ""}`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    });
  };

  /* ════════ SUCCESS ════════ */
  if (createdStudent) return (
    <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl text-white overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />
      <div className="p-5 sm:p-7 flex flex-col items-center gap-4 text-center">
        {/* Icon */}
        <div className="relative mt-1">
          <div className="w-[64px] h-[64px] rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow">
            <Star className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Registration Received
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome, {createdStudent.fullName.split(" ")[0]}! 🎉
          </h2>
          <p className="text-[12px] text-slate-400">Your student account has been created successfully.</p>
        </div>

        {/* Credentials card */}
        <div className="w-full bg-emerald-950/40 border border-emerald-500/20 rounded-xl overflow-hidden text-left">
          <div className="px-4 py-2 border-b border-emerald-500/15 text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 flex items-center justify-between">
            <span>Your Credentials</span>
            <span className="text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-[9px]">
              Status: Inactive
            </span>
          </div>
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3 bg-black/25 border border-emerald-500/15 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-mono font-bold text-emerald-300 text-sm tracking-wider truncate">
                  {createdStudent.studentId}
                </span>
              </div>
              <button onClick={copyId}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md px-2.5 py-1 transition-all flex-shrink-0 cursor-pointer">
                {copiedId ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <div className="flex items-center gap-2 text-left">
              <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="font-mono text-[11px] text-slate-400 truncate">{createdStudent.email}</span>
            </div>
            {createdStudent.invoiceId && (
              <div className="pt-2 border-t border-emerald-500/15 flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-1.5">
                  <BanknoteIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="font-mono text-[11px] text-slate-300">
                    Invoice: <strong className="text-amber-300 font-semibold">{createdStudent.invoiceId}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  Pending (৳{createdStudent.monthlyFee})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Activation Box */}
        <div className="w-full bg-gradient-to-b from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-xl overflow-hidden text-left shadow-xl">
          <div className="px-4 py-2.5 bg-emerald-500/15 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Activate Account via WhatsApp
              </span>
            </div>
            <button
              onClick={copyActivationMessage}
              type="button"
              className="text-[10px] text-emerald-300 hover:text-white flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              {copiedMsg ? <><Check className="w-2.5 h-2.5 text-emerald-400" /> Copied Text</> : <><Copy className="w-2.5 h-2.5" /> Copy Message</>}
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Your account is currently <strong className="text-amber-300">Inactive</strong>. To activate your account, please send a WhatsApp message with your <strong className="text-emerald-300">Student ID ({createdStudent.studentId})</strong> to any of the numbers below:
            </p>

            {/* 3 WhatsApp Numbers */}
            <div className="space-y-2">
              {[
                { number: "+880 1857-381244", raw: "8801857381244", label: "Admin Support 1" },
                { number: "+880 1600-198884", raw: "8801600198884", label: "Admin Support 2" },
                { number: "+880 1515-603145", raw: "8801515603145", label: "Admin Support 3" },
              ].map((wa, idx) => {
                const waUrl = `https://wa.me/${wa.raw}?text=${encodeURIComponent(
                  `Assalamu Alaikum,\nI have registered as a new student on FAJR Academy.\nPlease activate my account.\n\n📌 Student ID: ${createdStudent.studentId}\n👤 Name: ${createdStudent.fullName}\n📧 Email: ${createdStudent.email}\n📱 Phone: ${createdStudent.phone || ""}`
                )}`;
                return (
                  <a
                    key={idx}
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-black/35 hover:bg-emerald-900/30 border border-emerald-500/20 hover:border-emerald-500/50 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-emerald-300 font-mono tracking-wide">
                          {wa.number}
                        </p>
                        <p className="text-[9px] text-slate-400">{wa.label}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 group-hover:bg-emerald-500/25 px-2.5 py-1 rounded border border-emerald-500/25 transition-colors">
                      Chat to Activate <ArrowRight className="w-3 h-3" />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="w-full bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-2.5 flex items-start gap-2.5 text-left">
          <AlertCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-300/80 leading-relaxed">
            After sending the WhatsApp message, your account will be activated by our team. You can then log in using your <strong className="text-blue-300">Student ID ({createdStudent.studentId})</strong> and password.
          </p>
        </div>

        <Link href="/login"
          className="w-full inline-flex justify-center items-center gap-2 py-3 rounded-xl font-semibold text-[13px] text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] cursor-pointer">
          <UserCheck className="w-4 h-4" /> Go to Login Page
        </Link>
      </div>
    </div>
  );

  /* ════════ FORM ════════ */
  return (
    <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl text-white overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

      <div className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
            <GraduationCap className="w-3.5 h-3.5" /> Student Portal
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-white">Create Your Account</h1>
          {crmParam && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-[11px] font-medium animate-in fade-in duration-200">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Affiliated Registration: <strong className="font-mono text-blue-200">{crmParam}</strong></span>
            </div>
          )}
        </div>

        {/* Step Progress */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map(s => (
              <div key={s} className={`h-1 rounded-full transition-all duration-500 ${step >= s ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-white/[0.08]"}`} />
            ))}
          </div>
          <div className="flex justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${step === 1 ? "text-emerald-400" : "text-white/35"}`}>
              ① Personal Info
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${step === 2 ? "text-emerald-400" : "text-white/35"}`}>
              ② Course &amp; Security
            </span>
          </div>
        </div>

        {/* Account conflict with Student ID banner */}
        {existingStudentConflict ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-left space-y-3 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Account Already Exists
                </p>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  {existingStudentConflict.message ||
                    `This ${existingStudentConflict.field || "number"} is already registered in our system.`}
                </p>
              </div>
            </div>

            {existingStudentConflict.studentId && existingStudentConflict.studentId !== "N/A" && (
              <div className="flex items-center justify-between gap-3 bg-black/40 border border-amber-500/20 rounded-lg px-3.5 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-amber-400/80 font-medium">Registered Student ID:</span>
                  <span className="font-mono font-bold text-amber-300 text-xs tracking-wider truncate">
                    {existingStudentConflict.studentId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyConflictId}
                  className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded px-2 py-1 transition-all flex-shrink-0 cursor-pointer"
                >
                  {copiedConflictId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy ID
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2">
              <span className="text-[11px] text-amber-200/70">Already have this account?</span>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-2 transition-colors"
              >
                Sign In Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : formError ? (
          /* Generic Global error */
          <div className="flex items-start gap-2.5 bg-rose-500/8 border border-rose-500/20 text-rose-300 px-3.5 py-3 rounded-xl text-[12px] font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px text-rose-400" />
            {formError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ══ STEP 1 ══ */}
          <div className={step === 1 ? "space-y-3.5" : "hidden"}>
            {/* Full Name */}
            <Field label="Full Name" required error={errors.fullName?.message}>
              <PrefixInput icon={User} hasError={!!errors.fullName}>
                <input type="text" placeholder="e.g. Mohammad Abdullah"
                  className={`${inputBaseCls} pl-2.5 pr-3`}
                  {...register("fullName", { required: "Full name is required", minLength: { value: 3, message: "At least 3 characters" } })} />
              </PrefixInput>
            </Field>

            {/* Email */}
            <Field label="Email Address" required error={errors.email?.message}>
              <PrefixInput icon={Mail} hasError={!!errors.email}>
                <input type="email" placeholder="e.g. student@example.com"
                  className={`${inputBaseCls} pl-2.5 pr-3`}
                  {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" } })} />
              </PrefixInput>
            </Field>

            {/* Father + Mother */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Father's Name" required error={errors.fatherName?.message}>
                <PrefixInput icon={UserCircle2} hasError={!!errors.fatherName}>
                  <input type="text" placeholder="Father's name"
                    className={`${inputBaseCls} pl-2.5 pr-2`}
                    {...register("fatherName", { required: "Required" })} />
                </PrefixInput>
              </Field>
              <Field label="Mother's Name" required error={errors.motherName?.message}>
                <PrefixInput icon={UserCircle2} hasError={!!errors.motherName}>
                  <input type="text" placeholder="Mother's name"
                    className={`${inputBaseCls} pl-2.5 pr-2`}
                    {...register("motherName", { required: "Required" })} />
                </PrefixInput>
              </Field>
            </div>

            {/* Age + Gender */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age" required error={errors.age?.message}>
                <PrefixInput icon={Hash} hasError={!!errors.age}>
                  <input type="number" placeholder="e.g. 18" min={1} max={120}
                    className={`${inputBaseCls} pl-2.5 pr-3`}
                    {...register("age", { required: "Required", min: { value: 1, message: "Must be ≥ 1" } })} />
                </PrefixInput>
              </Field>
              <Field label="Gender" required>
                <div className="grid grid-cols-2 gap-2">
                  {(["male", "female"] as const).map(g => (
                    <button key={g} type="button" onClick={() => setValue("gender", g)}
                      className={`py-[11px] text-[11px] font-bold rounded-[10px] border capitalize transition-all cursor-pointer ${
                        watchGender === g
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "bg-white/[0.05] border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.08]"
                      }`}>
                      {g === "male" ? "♂ Male" : "♀ Female"}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Phone + WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone Number" required error={errors.phone?.message}>
                <Controller
                  name="phone"
                  control={control}
                  rules={{
                    required: "Phone number is required",
                    validate: (val) =>
                      isValidPhoneNumber(val) || "Please enter a valid phone number",
                  }}
                  render={({ field: { onChange, value, ref, onBlur } }) => (
                    <PhoneInput
                      ref={ref}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      defaultCountry="BD"
                      placeholder="01700 000000"
                      hasError={!!errors.phone}
                    />
                  )}
                />
              </Field>
              <Field label="WhatsApp" required error={errors.whatsappNumber?.message}>
                <Controller
                  name="whatsappNumber"
                  control={control}
                  rules={{
                    required: "WhatsApp number is required",
                    validate: (val) =>
                      isValidPhoneNumber(val) || "Please enter a valid phone number",
                  }}
                  render={({ field: { onChange, value, ref, onBlur } }) => (
                    <PhoneInput
                      ref={ref}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      defaultCountry="BD"
                      placeholder="01700 000000"
                      hasError={!!errors.whatsappNumber}
                    />
                  )}
                />
              </Field>
            </div>

            <button type="button" onClick={handleNextStep} disabled={checkingStep1}
              className="w-full flex items-center justify-center gap-2 mt-1 py-3.5 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
              {checkingStep1 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking Details...
                </>
              ) : (
                <>
                  Continue to Step 2 <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* ══ STEP 2 ══ */}
          <div className={step === 2 ? "space-y-3.5" : "hidden"}>
            {/* Course */}
            <Field label="Select Course" required error={errors.selectedCourse?.message}>
              <div className={`${inputWrapBase} ${errors.selectedCourse ? inputWrapError : inputWrapNormal}`}>
                <BookOpen className="ml-3 w-[14px] h-[14px] text-white/25 flex-shrink-0 pointer-events-none" />
                <select className={`${inputBaseCls} pl-2.5 pr-8 cursor-pointer appearance-none`}
                  {...register("selectedCourse", { required: "Please select a course" })}>
                  <option value="" className="bg-slate-900">— Choose a Course —</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id} className="bg-slate-900 text-white">
                      {c.title}{c.courseId ? ` (${c.courseId})` : ""}
                    </option>
                  ))}
                </select>
                {loadingCourses
                  ? <Loader2 className="mr-3 w-4 h-4 animate-spin text-emerald-400 flex-shrink-0" />
                  : <ChevronDown className="mr-3 w-4 h-4 text-white/25 flex-shrink-0 pointer-events-none" />
                }
              </div>
            </Field>

            {/* Fee Card */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.07] bg-white/[0.02]">
                <BanknoteIcon className="w-3.5 h-3.5 text-emerald-400/60" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Fee Details
                </span>
                <span className="ml-auto text-[10px] text-rose-400/70 font-bold">* Required</span>
              </div>

              {/* Two fee columns */}
              <div className="grid grid-cols-2 divide-x divide-white/[0.07]">
                {/* Admission Fee */}
                <div className="p-3.5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Admission Fee <span className="text-rose-400">*</span></p>
                  <div className={`${inputWrapBase} ${errors.admissionFee ? inputWrapError : "bg-white/[0.05] border-white/[0.08] focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/15"}`}>
                    <span className="pl-3 pr-2 text-[13px] font-bold text-emerald-400 flex-shrink-0 select-none leading-none py-[11px]">৳</span>
                    <input type="number" placeholder="0" min={0}
                      className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-white/20 py-[11px] pr-2 leading-none min-w-0"
                      {...register("admissionFee", { required: "Admission fee is required", min: { value: 0, message: "Must be ≥ 0" } })} />
                    <span className="pr-3 text-[10px] text-white/20 font-semibold flex-shrink-0 select-none">BDT</span>
                  </div>
                  {errors.admissionFee && (
                    <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" />{errors.admissionFee.message}</p>
                  )}
                </div>

                {/* Monthly Fee */}
                <div className="p-3.5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Monthly Fee <span className="text-rose-400">*</span></p>
                  <div className={`${inputWrapBase} ${errors.monthlyFee ? inputWrapError : "bg-white/[0.05] border-white/[0.08] focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/15"}`}>
                    <span className="pl-3 pr-2 text-[13px] font-bold text-emerald-400 flex-shrink-0 select-none leading-none py-[11px]">৳</span>
                    <input type="number" placeholder="0" min={0}
                      className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-white/20 py-[11px] pr-2 leading-none min-w-0"
                      {...register("monthlyFee", { required: "Monthly fee is required", min: { value: 0, message: "Must be ≥ 0" } })} />
                    <span className="pr-3 text-[10px] text-white/20 font-semibold flex-shrink-0 select-none">BDT</span>
                  </div>
                  {errors.monthlyFee && (
                    <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" />{errors.monthlyFee.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Password */}
            <Field label="Password" required error={errors.password?.message} hint="Minimum 6 characters">
              <PrefixInput icon={Lock} hasError={!!errors.password}
                trailing={<EyeBtn show={showPw} toggle={() => setShowPw(v => !v)} />}>
                <input type={showPw ? "text" : "password"} placeholder="Create a strong password"
                  autoComplete="new-password"
                  className={`${inputBaseCls} pl-2.5 flex-1`}
                  {...register("password", { required: "Password is required", minLength: { value: 6, message: "At least 6 characters" } })} />
              </PrefixInput>
            </Field>

            {/* Confirm Password */}
            <Field label="Confirm Password" required error={errors.confirmPassword?.message}>
              <PrefixInput icon={Lock} hasError={!!errors.confirmPassword}
                trailing={<EyeBtn show={showCpw} toggle={() => setShowCpw(v => !v)} />}>
                <input type={showCpw ? "text" : "password"} placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`${inputBaseCls} pl-2.5 flex-1`}
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: v => v === watchPassword || "Passwords do not match",
                  })} />
              </PrefixInput>
            </Field>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-0.5">
              <button type="button" onClick={() => { setStep(1); setFormError(""); }}
                className="flex items-center gap-1.5 px-5 py-3.5 rounded-xl text-[13px] font-bold text-white/50 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/15 transition-all cursor-pointer flex-shrink-0">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
                  : <><Sparkles className="w-4 h-4" /> Complete Registration</>
                }
              </button>
            </div>
          </div>
        </form>

        {/* Footer links */}
        <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-white/30">
          <span>
            Already registered?{" "}
            <Link href="/login" className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors">Sign In</Link>
          </span>
          <span className="text-white/15">·</span>
          <span>
            Are you a Teacher?{" "}
            <Link href="/teacher-registration" className="font-bold text-sky-400 hover:text-sky-300 transition-colors">Apply Here</Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function StudentRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <StudentRegistrationForm />
    </Suspense>
  );
}

