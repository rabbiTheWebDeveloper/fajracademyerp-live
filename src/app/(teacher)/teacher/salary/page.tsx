"use client";

import { useState, useEffect } from "react";
import { 
  Banknote, Calendar, Loader2, Plus, 
  AlertCircle, CheckCircle2, Clock, Calculator, 
  Users, TrendingUp, DollarSign, UserCircle, Save, ShieldCheck,
  Lock, Unlock, Timer, Sparkles
} from "lucide-react";

export default function TeacherSalaryPage() {
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Payment Info State
  const [paymentForm, setPaymentForm] = useState({
    method: "Bank_Transfer", 
    accountName: "", 
    accountNumber: "", 
    bankName: "Islami Bank Bangladesh PLC.", 
    branchName: "",
    routingNumber: "",
    accountType: "Savings",
    customBankName: ""
  });
  const [updateCount, setUpdateCount] = useState(0);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState({ text: "", type: "" });

  // Payment window status & live countdown (Every month 15th 00:00 to 28th 23:59:59 active)
  const calculateWindowStatus = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // 15th at 00:00:00.000
    const openDate = new Date(year, month, 15, 0, 0, 0, 0);
    // 28th at 23:59:59.999
    const closeDate = new Date(year, month, 30, 23, 59, 59, 999);

    let isOpen = false;
    let targetDate: Date;

    if (now >= openDate && now <= closeDate) {
      isOpen = true;
      targetDate = closeDate;
    } else if (now < openDate) {
      isOpen = false;
      targetDate = openDate;
    } else {
      isOpen = false;
      targetDate = new Date(year, month + 1, 15, 0, 0, 0, 0);
    }

    const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      isOpen,
      targetDate,
      days,
      hours,
      minutes,
      seconds,
      totalSeconds
    };
  };

  const [windowInfo, setWindowInfo] = useState(calculateWindowStatus);

  useEffect(() => {
    const timer = setInterval(() => {
      setWindowInfo(calculateWindowStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [genMessage, setGenMessage] = useState({ text: "", type: "" });

  const KNOWN_PROVIDERS = [
    "Islami Bank Bangladesh PLC.",
    "bKash",
    "Nagad",
    "Rocket (DBBL)",
    "Dutch-Bangla Bank PLC.",
    "BRAC Bank PLC.",
    "The City Bank PLC.",
    "Sonali Bank PLC.",
    "Pubali Bank PLC.",
    "Eastern Bank PLC.",
    "United Commercial Bank (UCB)",
    "Al-Arafah Islami Bank PLC.",
    "First Security Islami Bank PLC.",
    "Shahjalal Islami Bank PLC.",
    "Social Islami Bank PLC.",
    "CellFin (IBBL)",
    "Upay"
  ];

  useEffect(() => {
    // Set default month to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
    
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salRes, profRes] = await Promise.all([
        fetch("/api/teacher-portal/salary"),
        fetch("/api/teacher-portal/profile")
      ]);
      const salData = await salRes.json();
      const profData = await profRes.json();
      
      if (salData.success) setSalaries(salData.salaries);
      else setError(salData.message || "Failed to load salary history");

      if (profData.success && profData.teacher?.paymentInfo) {
        const pInfo = profData.teacher.paymentInfo;
        const savedBank = pInfo.bankName || "Islami Bank Bangladesh PLC.";
        const isCustom = !KNOWN_PROVIDERS.includes(savedBank) && savedBank !== "Other";

        setPaymentForm({
          method: pInfo.method || "Bank_Transfer",
          accountName: pInfo.accountName || "",
          accountNumber: pInfo.accountNumber || "",
          bankName: isCustom ? "Other" : savedBank,
          branchName: pInfo.branchName || "",
          routingNumber: pInfo.routingNumber || "",
          accountType: pInfo.accountType || (["bKash", "Nagad", "Rocket"].includes(pInfo.method) ? "Personal" : "Savings"),
          customBankName: isCustom ? savedBank : ""
        });
        setUpdateCount(pInfo.updateCount || 0);
      }
    } catch (err) {
      setError("Network error while loading data.");
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (newMethod: string) => {
    setPaymentForm(prev => {
      let newBankName = prev.bankName;
      let newAccountType = prev.accountType;
      if (newMethod === "bKash") {
        newBankName = "bKash";
        newAccountType = "Personal";
      } else if (newMethod === "Nagad") {
        newBankName = "Nagad";
        newAccountType = "Personal";
      } else if (newMethod === "Rocket") {
        newBankName = "Rocket (DBBL)";
        newAccountType = "Personal";
      } else if (newMethod === "Bank_Transfer") {
        if (["bKash", "Nagad", "Rocket (DBBL)", "Upay"].includes(prev.bankName) || !prev.bankName) {
          newBankName = "Islami Bank Bangladesh PLC.";
        }
        newAccountType = "Savings";
      }
      return { ...prev, method: newMethod, bankName: newBankName, accountType: newAccountType };
    });
  };

  const handleProviderChange = (newProvider: string) => {
    setPaymentForm(prev => {
      let newMethod = prev.method;
      let newAccountType = prev.accountType;
      if (newProvider === "bKash") {
        newMethod = "bKash";
        newAccountType = "Personal";
      } else if (newProvider === "Nagad") {
        newMethod = "Nagad";
        newAccountType = "Personal";
      } else if (newProvider === "Rocket (DBBL)" || newProvider === "Upay") {
        newMethod = "bKash";
        newAccountType = "Personal";
      } else if (newProvider !== "Other") {
        newMethod = "Bank_Transfer";
        newAccountType = "Savings";
      }
      return { ...prev, bankName: newProvider, method: newMethod, accountType: newAccountType };
    });
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!windowInfo.isOpen) {
      setPaymentMessage({ 
        text: "পেমেন্ট তথ্য আপডেট শুধুমাত্র প্রতি মাসের ১৫ থেকে ২৮ তারিখ রাত ১১:৫৯ পর্যন্ত সক্রিয় থাকে। (Payment updates are only allowed between 15th and 28th 11:59 PM).", 
        type: "error" 
      });
      return;
    }

    if (updateCount >= 4) {
      setPaymentMessage({ text: "Maximum update limit reached. You can only update payment information up to 4 times.", type: "error" });
      return;
    }

    setSavingPayment(true);
    setPaymentMessage({ text: "", type: "" });
    try {
      const finalBankName = paymentForm.bankName === "Other" 
        ? (paymentForm.customBankName.trim() || "Other Bank") 
        : (paymentForm.bankName || "Islami Bank Bangladesh PLC.");

      const payload = {
        method: paymentForm.method,
        accountName: paymentForm.accountName,
        accountNumber: paymentForm.accountNumber,
        bankName: finalBankName,
        branchName: paymentForm.branchName,
        routingNumber: paymentForm.routingNumber,
        accountType: paymentForm.accountType || "Savings"
      };
      const res = await fetch("/api/teacher-portal/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentInfo: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentMessage({ text: "Payment information saved successfully!", type: "success" });
        if (data.teacher?.paymentInfo?.updateCount !== undefined) {
          setUpdateCount(data.teacher.paymentInfo.updateCount);
        } else {
          setUpdateCount(prev => prev + 1);
        }
      } else {
        setPaymentMessage({ text: data.message || "Failed to save payment info", type: "error" });
      }
    } catch (err) {
      setPaymentMessage({ text: "Network error occurred", type: "error" });
    } finally {
      setSavingPayment(false);
      setTimeout(() => setPaymentMessage({ text: "", type: "" }), 5000);
    }
  };

  // Re-fetch only salaries when generating
  const fetchSalariesOnly = async () => {
    try {
      const res = await fetch("/api/teacher-portal/salary");
      const data = await res.json();
      if (data.success) setSalaries(data.salaries);
    } catch (err) {}
  };

  const handleGenerate = async () => {
    if (!selectedMonth) return;
    
    setGenerating(true);
    setGenMessage({ text: "", type: "" });
    
    try {
      const res = await fetch("/api/teacher-portal/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });
      const data = await res.json();
      
      if (data.success) {
        setGenMessage({ text: "Salary generated successfully!", type: "success" });
        fetchSalariesOnly(); // Refresh the list
      } else {
        setGenMessage({ text: data.message || "Generation failed", type: "error" });
      }
    } catch (err) {
      setGenMessage({ text: "Network error occurred", type: "error" });
    } finally {
      setGenerating(false);
      setTimeout(() => setGenMessage({ text: "", type: "" }), 5000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5" /> Pending
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Banknote className="w-6 h-6 text-indigo-600" />
          Salary Dashboard
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Generate your monthly salary requests and track your payment history.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {/* Payment Information Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-blue-500" />
              Payment Information
            </h3>
            {paymentMessage.text && (
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                paymentMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {paymentMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {paymentMessage.text}
              </div>
            )}
          </div>
          {/* Payment completion mini-bar */}
          {(() => {
            const currentBank = paymentForm.bankName === "Other" ? paymentForm.customBankName : paymentForm.bankName;
            const isBank = paymentForm.method === "Bank_Transfer";
            const isIBBL = isBank && (paymentForm.bankName === "Islami Bank Bangladesh PLC." || !paymentForm.bankName);
            const isOtherBank = isBank && !isIBBL;

            const payFields = [
              { label: "Account name", val: paymentForm.accountName },
              { label: "Account number", val: paymentForm.accountNumber },
              { label: "Bank / Provider", val: currentBank },
              ...(isOtherBank ? [
                { label: "Account type", val: paymentForm.accountType },
                { label: "Branch name", val: paymentForm.branchName },
                { label: "Routing number", val: paymentForm.routingNumber },
              ] : [])
            ];
            const done = payFields.filter(f => !!f.val).length;
            const pct = Math.round((done / payFields.length) * 100);
            const barColor = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";
            const textColor = pct === 100 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
            return (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    <ShieldCheck className={`w-3.5 h-3.5 ${textColor}`} />
                    Payment Info Completion
                  </span>
                  <span className={`text-sm font-black ${textColor}`}>{pct}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{done} of {payFields.length} required fields filled</p>
              </div>
            );
          })()}
        </div>

        {/* ── Monthly Schedule Countdown Banner ── */}
        <div className={`p-5 sm:p-6 border-b transition-all ${
          windowInfo.isOpen 
            ? "bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-emerald-900/50" 
            : "bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white border-rose-900/50"
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  windowInfo.isOpen 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      windowInfo.isOpen ? "bg-emerald-400" : "bg-rose-400"
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      windowInfo.isOpen ? "bg-emerald-500" : "bg-rose-500"
                    }`} />
                  </span>
                  {windowInfo.isOpen ? "উইন্ডো সক্রিয় (Window Open)" : "উইন্ডো বন্ধ (Window Locked)"}
                </span>

                <span className="text-xs text-slate-300 font-medium">
                  {windowInfo.isOpen 
                    ? "১৫ তারিখ ০০:০০ থেকে ২৮ তারিখ রাত ১১:৫৯" 
                    : "২৯ তারিখ থেকে ১৪ তারিখ রাত ১১:৫৯ বন্ধ"}
                </span>
              </div>

              <h4 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                {windowInfo.isOpen ? (
                  <>
                    <Unlock className="w-5 h-5 text-emerald-400" />
                    পেমেন্ট তথ্য আপডেট উইন্ডো এখন চালু আছে
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-rose-400" />
                    পেমেন্ট তথ্য আপডেট উইন্ডো এখন সাময়িক বন্ধ
                  </>
                )}
              </h4>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {windowInfo.isOpen ? (
                  <span>
                    পেমেন্ট তথ্য পরিবর্তনের উইন্ডো এখন সক্রিয়। আপনি ২৮ তারিখ রাত ১১:৫৯ পর্যন্ত তথ্য আপডেট করতে পারবেন।
                  </span>
                ) : (
                  <span>
                    পেমেন্ট প্রসেসিং ও অডিটের সুবিধার্থে প্রতি মাসের <strong>২৯ তারিখ থেকে ১৪ তারিখ রাত ১১:৫৯</strong> পর্যন্ত উইন্ডো বন্ধ থাকে।
                  </span>
                )}
              </p>
            </div>

            {/* Live Countdown Display */}
            <div className={`p-4 rounded-2xl border backdrop-blur-md flex flex-col items-center justify-center shrink-0 w-full sm:w-auto min-w-[290px] shadow-lg ${
              windowInfo.isOpen 
                ? "bg-slate-950/60 border-emerald-500/30 text-white" 
                : "bg-slate-950/60 border-rose-500/30 text-white"
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-bold mb-2.5">
                <Timer className={`w-4 h-4 ${windowInfo.isOpen ? "text-emerald-400" : "text-rose-400"}`} />
                <span className="text-slate-200">
                  {windowInfo.isOpen ? "উইন্ডো বন্ধ হতে বাকি (Closes In)" : "পরবর্তী উইন্ডো শুরু হতে বাকি (Opens In)"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border shadow-inner ${
                    windowInfo.isOpen 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}>
                    {String(windowInfo.days).padStart(2, '0')}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Days</span>
                </div>

                <span className={`text-xl font-black pb-4 ${windowInfo.isOpen ? "text-emerald-400" : "text-rose-400"}`}>:</span>

                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border shadow-inner ${
                    windowInfo.isOpen 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}>
                    {String(windowInfo.hours).padStart(2, '0')}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Hours</span>
                </div>

                <span className={`text-xl font-black pb-4 ${windowInfo.isOpen ? "text-emerald-400" : "text-rose-400"}`}>:</span>

                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border shadow-inner ${
                    windowInfo.isOpen 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}>
                    {String(windowInfo.minutes).padStart(2, '0')}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Mins</span>
                </div>

                <span className={`text-xl font-black pb-4 ${windowInfo.isOpen ? "text-emerald-400" : "text-rose-400"}`}>:</span>

                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border shadow-inner ${
                    windowInfo.isOpen 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}>
                    {String(windowInfo.seconds).padStart(2, '0')}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Secs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSavePayment} className="p-6">
          {/* Disclaimer Banner */}
          <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="font-bold text-amber-950 text-sm">সতর্কবার্তা ও বিশেষ নির্দেশাবলী (Disclaimer & Notice)</p>
              <p className="leading-relaxed text-amber-900 font-medium">
                অনুগ্রহ করে তথ্য জমা দেওয়ার পূর্বে আপনার পেমেন্ট সংক্রান্ত সকল তথ্য (অ্যাকাউন্ট নাম, অ্যাকাউন্ট নম্বর ইত্যাদি) সঠিকভাবে দেখে নিশ্চিত করুন।
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-medium border-t border-amber-200/60 mt-2">
                <span className="text-amber-950">
                  📅 সময়সূচি: <strong>প্রতি মাসের ১৫ থেকে ২৮ তারিখ রাত ১১:৫৯</strong> পর্যন্ত উন্মুক্ত | ⚠️ সর্বোচ্চ <strong className="font-bold text-red-600 underline">৪ বার</strong> আপডেট সম্ভব
                </span>
                <span className="bg-amber-200/80 px-2.5 py-0.5 rounded-full text-[11px] text-amber-950 font-bold ml-auto border border-amber-300">
                  পরিবর্তন করা হয়েছে: {updateCount} / ৪
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Method <span className="text-red-500 font-bold ml-1">*</span>
              </label>
              <select 
                value={paymentForm.method || "Bank_Transfer"} 
                disabled={!windowInfo.isOpen || updateCount >= 4}
                onChange={e => handleMethodChange(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Bank_Transfer">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                <option value="bKash">bKash (বিকাশ)</option>
                <option value="Nagad">Nagad (নগদ)</option>
                <option value="Rocket">Rocket (রকেট)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Bank / Provider Name <span className="text-red-500 font-bold ml-1">*</span>
              </label>
              <select
                value={paymentForm.bankName || "Islami Bank Bangladesh PLC."}
                disabled={!windowInfo.isOpen || updateCount >= 4}
                onChange={e => handleProviderChange(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <optgroup label="Default / Recommended Bank">
                  <option value="Islami Bank Bangladesh PLC.">Islami Bank Bangladesh PLC. (Default)</option>
                </optgroup>
                <optgroup label="Mobile Financial Services (MFS)">
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Nagad">Nagad (নগদ)</option>
                  <option value="Rocket (DBBL)">Rocket (DBBL)</option>
                  <option value="CellFin (IBBL)">CellFin (IBBL)</option>
                  <option value="Upay">Upay</option>
                </optgroup>
                <optgroup label="Other Commercial & Islamic Banks">
                  <option value="Dutch-Bangla Bank PLC.">Dutch-Bangla Bank PLC.</option>
                  <option value="BRAC Bank PLC.">BRAC Bank PLC.</option>
                  <option value="The City Bank PLC.">The City Bank PLC.</option>
                  <option value="Sonali Bank PLC.">Sonali Bank PLC.</option>
                  <option value="Pubali Bank PLC.">Pubali Bank PLC.</option>
                  <option value="Eastern Bank PLC.">Eastern Bank PLC.</option>
                  <option value="United Commercial Bank (UCB)">United Commercial Bank (UCB)</option>
                  <option value="Al-Arafah Islami Bank PLC.">Al-Arafah Islami Bank PLC.</option>
                  <option value="First Security Islami Bank PLC.">First Security Islami Bank PLC.</option>
                  <option value="Shahjalal Islami Bank PLC.">Shahjalal Islami Bank PLC.</option>
                  <option value="Social Islami Bank PLC.">Social Islami Bank PLC.</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="Other">Other Bank / Provider (অন্যান্য)</option>
                </optgroup>
              </select>
            </div>

            {paymentForm.bankName === "Other" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Specify Bank / Provider Name <span className="text-red-500 font-bold ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!windowInfo.isOpen || updateCount >= 4}
                  value={paymentForm.customBankName}
                  onChange={e => setPaymentForm(p => ({ ...p, customBankName: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Enter Bank or Provider Name"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Account Holder Name <span className="text-red-500 font-bold ml-1">*</span>
              </label>
              <input 
                type="text" 
                required 
                disabled={!windowInfo.isOpen || updateCount >= 4}
                value={paymentForm.accountName} 
                onChange={e => setPaymentForm(p => ({ ...p, accountName: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={paymentForm.method === "bKash" || paymentForm.method === "Nagad" ? "Name registered with account" : "Account Holder Name"} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {paymentForm.method === "bKash" ? "bKash Mobile Number" : paymentForm.method === "Nagad" ? "Nagad Mobile Number" : paymentForm.method === "Rocket" ? "Rocket Mobile Number" : "Account Number"}{" "}
                <span className="text-red-500 font-bold ml-1">*</span>
              </label>
              <input 
                type="text" 
                required 
                disabled={!windowInfo.isOpen || updateCount >= 4}
                value={paymentForm.accountNumber} 
                onChange={e => setPaymentForm(p => ({ ...p, accountNumber: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={paymentForm.method === "bKash" || paymentForm.method === "Nagad" || paymentForm.method === "Rocket" ? "017XXXXXXXX / 018XXXXXXXX" : "Bank Account Number"} 
              />
            </div>

            {/* Other Banks: Account Type (Savings / Current) */}
            {paymentForm.method === "Bank_Transfer" && paymentForm.bankName !== "Islami Bank Bangladesh PLC." && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Account Type (হিসাবের ধরন) <span className="text-red-500 font-bold ml-1">*</span>
                </label>
                <select 
                  value={paymentForm.accountType || "Savings"} 
                  disabled={!windowInfo.isOpen || updateCount >= 4}
                  onChange={e => setPaymentForm(p => ({ ...p, accountType: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Savings">Savings Account (সঞ্চয়ী হিসাব)</option>
                  <option value="Current">Current Account (চলতি হিসাব)</option>
                </select>
              </div>
            )}

            {/* Other Banks: Branch Name */}
            {paymentForm.method === "Bank_Transfer" && paymentForm.bankName !== "Islami Bank Bangladesh PLC." && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Branch Name (শাখার নাম) <span className="text-red-500 font-bold ml-1">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  disabled={!windowInfo.isOpen || updateCount >= 4}
                  value={paymentForm.branchName} 
                  onChange={e => setPaymentForm(p => ({ ...p, branchName: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g. Dhanmondi Branch, Motijheel" 
                />
              </div>
            )}

            {/* Other Banks: Routing Number */}
            {paymentForm.method === "Bank_Transfer" && paymentForm.bankName !== "Islami Bank Bangladesh PLC." && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Routing Number (রাউটিং নম্বর) <span className="text-red-500 font-bold ml-1">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  disabled={!windowInfo.isOpen || updateCount >= 4}
                  value={paymentForm.routingNumber} 
                  onChange={e => setPaymentForm(p => ({ ...p, routingNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="9-digit Bank Routing Number" 
                />
              </div>
            )}

            {/* Islami Bank Optional Routing/Branch */}
            {paymentForm.method === "Bank_Transfer" && paymentForm.bankName === "Islami Bank Bangladesh PLC." && (
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Routing Number / Branch <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <input 
                  type="text" 
                  disabled={!windowInfo.isOpen || updateCount >= 4}
                  value={paymentForm.routingNumber} 
                  onChange={e => setPaymentForm(p => ({ ...p, routingNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Optional routing or branch info" 
                />
              </div>
            )}

            {/* MFS Account Type */}
            {(paymentForm.method === "bKash" || paymentForm.method === "Nagad" || paymentForm.method === "Rocket") && (
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Account Type (অ্যাকাউন্ট টাইপ)
                </label>
                <select 
                  value={paymentForm.accountType || "Personal"} 
                  disabled={!windowInfo.isOpen || updateCount >= 4}
                  onChange={e => setPaymentForm(p => ({ ...p, accountType: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Personal">Personal (ব্যক্তিগত অ্যাকাউন্ট)</option>
                  <option value="Agent">Agent (এজেন্ট)</option>
                  <option value="Merchant">Merchant (মার্চেন্ট)</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-500">
              {!windowInfo.isOpen ? (
                <span className="text-rose-600 font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> উইন্ডো বন্ধ রয়েছে (১৫-২৮ তারিখের মধ্যে আপডেট করুন)
                </span>
              ) : updateCount >= 4 ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> সর্বোচ্চ ৪ বার আপডেট এর লিমিট শেষ হয়ে গেছে
                </span>
              ) : (
                <span>অবশিষ্ট আপডেটের সুযোগ: <strong className="text-gray-800">{4 - updateCount}</strong>/৪</span>
              )}
            </span>
            <button 
              type="submit" 
              disabled={savingPayment || !windowInfo.isOpen || updateCount >= 4}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
            >
              {savingPayment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : !windowInfo.isOpen ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {savingPayment 
                ? "সংরক্ষণ করা হচ্ছে..." 
                : !windowInfo.isOpen 
                ? "উইন্ডো বন্ধ (১৫-২৮ তারিখ উন্মুক্ত)" 
                : updateCount >= 4 
                ? "আপডেট সীমা শেষ (৪/৪)" 
                : "Save Payment Info"}
            </button>
          </div>
        </form>
      </div>

      {/* Salary History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Salary History
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : salaries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider"> Amount</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Generated On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salaries.map((salary) => (
                  <tr key={salary._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                        {salary.month}
                      </span>
                    </td>
                 
                    <td className="p-4">
                      <span className="text-lg font-bold text-gray-900 flex items-center gap-1">
                        {formatCurrency(salary.calculatedAmount)}
                      </span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(salary.status)}
                    </td>
                    <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(salary.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Banknote className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No salary history</h3>
            <p className="text-sm text-gray-500 mt-1">You haven't generated any salary requests yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
