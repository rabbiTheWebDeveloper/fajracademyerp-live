"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  Clock,
  Users,
  GraduationCap,
  UserCog,
  Zap,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  Wifi,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailLog {
  _id: string;
  to: string;
  subject: string;
  status: "success" | "failed";
  sentBy: string;
  error?: string;
  createdAt: string;
}

// ─── Templates ────────────────────────────────────────────────────────────────
const EMAIL_TEMPLATES: Record<string, { subject: string; body: string; label: string; color: string }> = {
  urgent_notice: {
    label: "Urgent Notice",
    color: "text-red-600",
    subject: "Fajr Academy — Urgent Notice",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Important Announcement</h3>
<p>Dear [Recipient Name],</p>
<p>We would like to inform you that <strong>[describe the important event or change]</strong>.</p>
<p>Please take note of the following details:</p>
<ul>
  <li><strong>Date:</strong> [Date]</li>
  <li><strong>Time:</strong> [Time]</li>
  <li><strong>Venue / Platform:</strong> [Location / Online Link]</li>
</ul>
<p>For any queries, please contact the Fajr Academy administration team at <a href="tel:01857381244">01857-381244</a> or visit <a href="https://www.fajracademy.io/">www.fajracademy.io</a>.</p>`,
  },
  holiday_notice: {
    label: "Holiday Notice",
    color: "text-amber-600",
    subject: "Fajr Academy — Holiday Announcement",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Holiday Notice</h3>
<p>Dear All,</p>
<p>This is to inform you that Fajr Academy will remain <strong>closed</strong> from <strong>[Start Date]</strong> to <strong>[End Date]</strong> in observance of <strong>[Holiday Name]</strong>.</p>
<p>Regular classes and all administrative services will resume from <strong>[Re-open Date]</strong>.</p>
<p>We wish everyone a wonderful holiday. Thank you for your continued support.</p>`,
  },
  maintenance: {
    label: "System Maintenance",
    color: "text-blue-600",
    subject: "Fajr Academy ERP — Scheduled Maintenance Window",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Scheduled System Maintenance</h3>
<p>Dear User,</p>
<p>Please be advised that the <strong>Fajr Academy ERP portal</strong> will be undergoing scheduled maintenance on:</p>
<ul>
  <li><strong>Date:</strong> [Date]</li>
  <li><strong>Time:</strong> [Start Time] &ndash; [End Time] (BST)</li>
</ul>
<p>During this window, the platform and all related services may be temporarily unavailable. We sincerely apologize for the inconvenience and appreciate your patience.</p>
<p>If you have any urgent concerns, please call us at <a href="tel:01857381244">01857-381244</a>.</p>`,
  },
  fee_reminder: {
    label: "Fee Reminder",
    color: "text-emerald-600",
    subject: "Fajr Academy — Course Fee Payment Reminder",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Course Fee Payment Reminder</h3>
<p>Dear Student / Guardian,</p>
<p>This is a friendly reminder that the course fee for <strong>[Month / Period]</strong> is due on <strong>[Due Date]</strong>.</p>
<p>Please clear the outstanding amount by logging into your student portal or by contacting our finance team to avoid any interruption to your services.</p>
<p>If you have already made the payment, kindly disregard this message. Thank you!</p>`,
  },
  exam_schedule: {
    label: "Exam Schedule",
    color: "text-purple-600",
    subject: "Fajr Academy — Upcoming Examination Schedule",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Examination Schedule &mdash; [Month / Term]</h3>
<p>Dear Students,</p>
<p>Please find below the examination schedule for the upcoming term. We encourage you to prepare well and be at the exam venue on time.</p>
<ul>
  <li><strong>Exam Date:</strong> [Date]</li>
  <li><strong>Time:</strong> [Time]</li>
  <li><strong>Subject / Course:</strong> [Subject Name]</li>
  <li><strong>Venue:</strong> [Location / Online Link]</li>
</ul>
<p>We wish all students the very best of luck! For further information, please contact your class teacher.</p>`,
  },
  teacher_performance: {
    label: "Teacher Performance",
    color: "text-indigo-600",
    subject: "Fajr Academy — Teacher Performance Review Notice",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Teacher Performance Review</h3>
<p>Dear [Teacher Name],</p>
<p>We hope this message finds you well. As part of our ongoing academic quality assurance process at <strong>Fajr Academy</strong>, we have conducted a review of your recent performance for the period <strong>[Review Period]</strong>.</p>
<p><strong>Performance Summary:</strong></p>
<ul>
  <li><strong>Classes Conducted:</strong> [X] out of [Y] scheduled</li>
  <li><strong>Student Attendance Rate:</strong> [X]%</li>
  <li><strong>Assignment Completion Rate:</strong> [X]%</li>
  <li><strong>Student Feedback Score:</strong> [X] / 5</li>
  <li><strong>Overall Rating:</strong> [Excellent / Good / Needs Improvement]</li>
</ul>
<p>We appreciate your dedication to our students. We encourage you to continue maintaining high standards of teaching and punctuality. Should you have any questions regarding this review, please do not hesitate to contact the administration.</p>`,
  },
  late_class: {
    label: "Late Class Notice",
    color: "text-orange-500",
    subject: "Fajr Academy — Late Class Conduct Notice",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Late Class Conduct Notice</h3>
<p>Dear [Teacher Name],</p>
<p>We would like to bring to your attention that our records indicate you arrived <strong>late</strong> to the following class session:</p>
<ul>
  <li><strong>Course / Class:</strong> [Course Name]</li>
  <li><strong>Scheduled Time:</strong> [Scheduled Start Time]</li>
  <li><strong>Actual Start Time:</strong> [Actual Start Time]</li>
  <li><strong>Date:</strong> [Date]</li>
  <li><strong>Delay Duration:</strong> [X] minutes</li>
</ul>
<p>Punctuality is a cornerstone of academic excellence at Fajr Academy and directly impacts our students' learning experience. We kindly request that you ensure all future sessions begin on time as per the published schedule.</p>
<p>Please treat this as an official reminder. A repeated occurrence may result in a formal note on your performance record. If there were any extenuating circumstances, please inform the administration at your earliest convenience.</p>`,
  },
  class_not_conducted: {
    label: "Class Not Conducted",
    color: "text-rose-600",
    subject: "Fajr Academy — Class Not Conducted — Action Required",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Unattended Class — Action Required</h3>
<p>Dear [Teacher Name],</p>
<p>Our records show that you were absent and <strong>did not conduct</strong> the following scheduled class without any prior notification:</p>
<ul>
  <li><strong>Course / Class:</strong> [Course Name]</li>
  <li><strong>Scheduled Date:</strong> [Date]</li>
  <li><strong>Scheduled Time:</strong> [Time]</li>
  <li><strong>Number of Students Affected:</strong> [X]</li>
</ul>
<p>Failing to conduct a scheduled class without prior notice is a serious matter that disrupts the learning progress of our students. We request you to:</p>
<ol>
  <li>Contact the administration <strong>immediately</strong> to explain the reason for absence.</li>
  <li>Arrange a make-up session for the affected students within <strong>[X] working days</strong>.</li>
</ol>
<p>Please note that repeated occurrences without valid justification will be escalated to the management and may impact your performance assessment. Your cooperation is expected.</p>`,
  },
  activity_report: {
    label: "Teacher Activity Report",
    color: "text-teal-600",
    subject: "Fajr Academy — Monthly Teacher Activity Report — [Month Year]",
    body: `<h3 style="color:#0A1931; font-size:18px; margin-bottom:12px;">Monthly Teacher Activity Report</h3>
<p>Dear [Teacher Name],</p>
<p>Please find below your activity summary for the month of <strong>[Month Year]</strong> as recorded in the Fajr Academy ERP system:</p>
<table style="width:100%; border-collapse:collapse; font-size:14px; margin:16px 0;">
  <thead>
    <tr style="background:#0A1931; color:#fff;">
      <th style="padding:10px 14px; text-align:left;">Metric</th>
      <th style="padding:10px 14px; text-align:center;">Value</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#f8f9fc;">
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb;">Total Scheduled Classes</td>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb; text-align:center;">[X]</td>
    </tr>
    <tr>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb;">Classes Conducted</td>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb; text-align:center;">[X]</td>
    </tr>
    <tr style="background:#f8f9fc;">
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb;">Classes Missed / Not Conducted</td>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb; text-align:center;">[X]</td>
    </tr>
    <tr>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb;">Late Sessions</td>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb; text-align:center;">[X]</td>
    </tr>
    <tr style="background:#f8f9fc;">
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb;">Assignments Given</td>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb; text-align:center;">[X]</td>
    </tr>
    <tr>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb;">Average Student Attendance</td>
      <td style="padding:9px 14px; border-bottom:1px solid #e5e7eb; text-align:center;">[X]%</td>
    </tr>
    <tr style="background:#f8f9fc;">
      <td style="padding:9px 14px;">Overall Performance Rating</td>
      <td style="padding:9px 14px; text-align:center; font-weight:bold; color:#0A1931;">[Excellent / Good / Average]</td>
    </tr>
  </tbody>
</table>
<p>This report is generated from the Fajr Academy ERP system for the reference period. Please review and contact the administration if you believe any data is inaccurate.</p>`,
  },
};


// ─── Recipient Groups ────────────────────────────────────────────────────────
const RECIPIENT_GROUPS = [
  { value: "custom",   label: "Custom Email Address", icon: Mail,          description: "Send to a specific email address" },
  { value: "teachers", label: "All Active Teachers",  icon: GraduationCap, description: "Reach all teachers currently active in the system" },
  { value: "students", label: "All Active Students",  icon: Users,         description: "Reach all enrolled and active students" },
  { value: "staff",    label: "All Active Staff",     icon: UserCog,       description: "Reach all administrative and support staff" },
];

// ─── Helper ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EmailManagementPage() {
  // Logs
  const [logs, setLogs]             = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logPage, setLogPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs]   = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount]   = useState(0);

  // Compose form
  const [recipientType,   setRecipientType]   = useState("custom");
  const [customEmail,     setCustomEmail]     = useState("");
  const [subject,         setSubject]         = useState("");
  const [emailBody,       setEmailBody]       = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending,         setSending]         = useState(false);
  const [sendMsg,         setSendMsg]         = useState<{ type: "success"|"error"; text: string } | null>(null);

  // SMTP test
  const [testEmail,  setTestEmail]  = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMsg,    setTestMsg]    = useState<{ type: "success"|"error"; text: string } | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"compose"|"logs">("compose");

  // ── Fetch logs ──────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (p = 1) => {
    setLogsLoading(true);
    try {
      const res  = await fetch(`/api/admin/emails?page=${p}&limit=15`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setTotalLogs(data.total);
        setTotalPages(data.totalPages);
        setLogPage(data.currentPage);
        // Compute success / fail count from current page logs
        const s = (data.logs as EmailLog[]).filter(l => l.status === "success").length;
        setSuccessCount(s);
        setFailCount(data.logs.length - s);
      }
    } catch (err) {
      console.error("fetchLogs:", err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(logPage); }, [logPage, fetchLogs]);

  // ── Apply template ──────────────────────────────────────────────────────────
  function applyTemplate(key: string) {
    setSelectedTemplate(key);
    if (key && EMAIL_TEMPLATES[key]) {
      setSubject(EMAIL_TEMPLATES[key].subject);
      setEmailBody(EMAIL_TEMPLATES[key].body);
    } else if (!key) {
      setSubject("");
      setEmailBody("");
    }
  }

  // ── Send email ──────────────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSendMsg(null);
    if (!subject.trim() || !emailBody.trim()) {
      setSendMsg({ type: "error", text: "Subject and message body are required." });
      return;
    }
    if (recipientType === "custom" && !customEmail.trim()) {
      setSendMsg({ type: "error", text: "Please enter a recipient email address." });
      return;
    }
    setSending(true);
    try {
      const res  = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientType, customEmail, subject, body: emailBody }),
      });
      const data = await res.json();
      if (data.success) {
        setSendMsg({ type: "success", text: data.message });
        setSubject(""); setEmailBody(""); setCustomEmail(""); setSelectedTemplate("");
        fetchLogs(1);
        setActiveTab("logs");
      } else {
        setSendMsg({ type: "error", text: data.message || "Failed to send email." });
      }
    } catch (err: any) {
      setSendMsg({ type: "error", text: err.message || "Unexpected error." });
    } finally {
      setSending(false);
    }
  }

  // ── SMTP test ───────────────────────────────────────────────────────────────
  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    setTestMsg(null);
    if (!testEmail.trim()) {
      setTestMsg({ type: "error", text: "Enter a test recipient address." });
      return;
    }
    setTestSending(true);
    try {
      const res  = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", customEmail: testEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setTestMsg({ type: "success", text: "Test email sent! Check your inbox (and spam folder)." });
        setTestEmail("");
        fetchLogs(1);
      } else {
        setTestMsg({ type: "error", text: data.message || "Test failed." });
      }
    } catch (err: any) {
      setTestMsg({ type: "error", text: err.message });
    } finally {
      setTestSending(false);
    }
  }

  // ── Derived recipient label ─────────────────────────────────────────────────
  const recipientLabel = RECIPIENT_GROUPS.find(g => g.value === recipientType)?.label ?? "Unknown";
  const RecipientIcon  = RECIPIENT_GROUPS.find(g => g.value === recipientType)?.icon ?? Mail;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-none">Email Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Compose, broadcast &amp; track all outgoing emails</p>
            </div>
          </div>

          {/* SMTP Status Pill */}
          <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-gray-700 font-semibold">SMTP Connected</span>
            <span className="text-gray-400 text-xs hidden sm:inline">· rabbi.fajracademy@gmail.com</span>
          </div>
        </div>

        {/* ── Stat Cards Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Sent",       value: totalLogs,    icon: BarChart3,  from: "from-indigo-500", to: "to-indigo-700",  bg: "bg-indigo-50",  text: "text-indigo-700" },
            { label: "Delivered",        value: successCount, icon: CheckCircle2, from: "from-emerald-500", to: "to-emerald-700", bg: "bg-emerald-50", text: "text-emerald-700" },
            { label: "Failed",           value: failCount,    icon: AlertCircle,  from: "from-red-500",   to: "to-red-700",    bg: "bg-red-50",     text: "text-red-700" },
            { label: "Gmail Gateway",    value: "Active",     icon: Wifi,         from: "from-violet-500", to: "to-violet-700", bg: "bg-violet-50",  text: "text-violet-700" },
          ].map(({ label, value, icon: Icon, from, to, bg, text }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm overflow-hidden relative">
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${from} ${to}`} />
              <div className={`w-9 h-9 rounded-xl ${bg} ${text} flex items-center justify-center mb-2.5`}>
                <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              </div>
              <p className={`text-xl font-extrabold ${text}`}>{value}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Main Content: Two Columns ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Sidebar ──────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">

            {/* Recipient Picker */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Recipient Group</p>
                <p className="text-xs text-gray-500 mt-0.5">Choose who receives this email</p>
              </div>
              <div className="p-3 space-y-1.5">
                {RECIPIENT_GROUPS.map(({ value, label, icon: Icon, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRecipientType(value)}
                    className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all ${
                      recipientType === value
                        ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                        : "border-transparent text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      recipientType === value ? "bg-indigo-100" : "bg-gray-100"
                    }`}>
                      <Icon className={`w-4 h-4 ${recipientType === value ? "text-indigo-600" : "text-gray-500"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight">{label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">{description}</p>
                    </div>
                    {recipientType === value && (
                      <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Picker */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Email Templates</p>
                <p className="text-xs text-gray-500 mt-0.5">Pre-written templates, click to apply</p>
              </div>
              <div className="p-3 space-y-1.5">
                <button
                  type="button"
                  onClick={() => applyTemplate("")}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    !selectedTemplate ? "bg-gray-100 border-gray-300 text-gray-800" : "border-transparent text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 inline mr-2 text-gray-400" />
                  Blank Email
                </button>
                {Object.entries(EMAIL_TEMPLATES).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(key)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedTemplate === key
                        ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                        : "border-transparent text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 inline mr-2 ${color}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* SMTP Test Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">SMTP Connection Test</p>
                <p className="text-xs text-gray-500 mt-0.5">Verify the email gateway is working</p>
              </div>
              <form onSubmit={handleTest} className="p-4 space-y-3">
                <input
                  type="email"
                  placeholder="Send test to: you@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={testSending}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-sm shadow-indigo-200"
                >
                  {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                  {testSending ? "Sending Test..." : "Send Test Email"}
                </button>
                {testMsg && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs border ${
                    testMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}>
                    {testMsg.type === "success"
                      ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    }
                    <span className="leading-relaxed">{testMsg.text}</span>
                  </div>
                )}
              </form>
            </div>

          </div>

          {/* ── Right Main Area ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Tab Switcher */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex gap-1.5">
              {[
                { key: "compose", label: "Compose Email", icon: Send },
                { key: "logs",    label: "Sent Logs",     icon: Clock },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === key
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {key === "logs" && totalLogs > 0 && (
                    <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === "logs" ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-700"
                    }`}>{totalLogs}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Compose Tab ──────────────────────────────────────────── */}
            {activeTab === "compose" && (
              <>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                {/* Form header banner */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <RecipientIcon className="w-4.5 h-4.5 w-[18px] h-[18px] text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">New Email Composition</p>
                    <p className="text-xs text-gray-500">To: <span className="font-semibold text-indigo-700">{recipientLabel}</span></p>
                  </div>
                </div>

                <form onSubmit={handleSend} className="p-6 space-y-5">

                  {/* Custom email field */}
                  {recipientType === "custom" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        Recipient Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none transition-shadow"
                        required
                      />
                    </div>
                  )}

                  {/* Bulk broadcast notice */}
                  {recipientType !== "custom" && (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs text-amber-900 font-medium">
                        This will send an email to <strong>all active {recipientType}</strong> in the system. Please double-check the content before sending.
                      </p>
                    </div>
                  )}

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      placeholder="Enter a clear and descriptive subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none font-medium transition-shadow"
                      required
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                      <span>Message Body</span>
                      <span className="text-gray-400 font-normal normal-case">HTML supported</span>
                    </label>
                    <textarea
                      rows={10}
                      placeholder="Write your message here. You can use HTML tags for formatting…"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none font-mono resize-none transition-shadow leading-relaxed"
                      required
                    />
                    <p className="text-xs text-gray-400">{emailBody.length} characters</p>
                  </div>

                  {/* Feedback */}
                  {sendMsg && (
                    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                      sendMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}>
                      {sendMsg.type === "success"
                        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      }
                      <span className="leading-relaxed">{sendMsg.text}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => { setSubject(""); setEmailBody(""); setCustomEmail(""); setSelectedTemplate(""); setSendMsg(null); }}
                      className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      Clear All
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      className="px-7 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {sending ? "Sending…" : "Send Email"}
                    </button>
                  </div>
                </form>
              </div>

              {/* ── Email Preview Card ──────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <p className="text-sm font-bold text-gray-900">Live Email Preview</p>
                  <span className="ml-auto text-xs text-gray-400 font-medium">Auto-applied to every email</span>
                </div>
                {/* Scaled email mockup */}
                <div className="p-4 bg-gray-50">
                  <div className="max-w-full mx-auto rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[11px] leading-relaxed font-sans">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#0A1931] to-[#1c3f70] px-6 py-5 text-center">
                      <p className="text-white text-xl font-extrabold tracking-wide m-0"
                         style={{ fontFamily: "Georgia, serif" }}>
                        Fajr Academy
                      </p>
                      <p className="text-[9px] text-[#8aadcf] mt-2 uppercase tracking-widest font-semibold m-0">
                        Official Communication
                      </p>
                    </div>
                    {/* Body */}
                    <div className="bg-white px-6 py-5 min-h-[60px] text-gray-700">
                      <p className="text-gray-400 italic text-[11px]">
                        Your message content appears here&hellip;
                      </p>
                    </div>
                    {/* Divider */}
                    <div className="px-6"><div className="border-t border-gray-100" /></div>
                    {/* Footer */}
                    <div className="bg-[#f8f9fd] px-6 py-4 text-center space-y-1">
                      <a
                        href="https://www.fajracademy.io/"
                        className="text-[#0A1931] font-bold text-[11px] no-underline block"
                        target="_blank"
                        rel="noreferrer"
                      >
                        www.fajracademy.io
                      </a>
                      <p className="text-gray-400 text-[10px] m-0">&#128222; 01857-381244</p>
                      <p className="text-[9px] text-gray-300 leading-relaxed m-0">
                        Automated email &mdash; please do not reply directly.<br />
                        &copy; {new Date().getFullYear()} Fajr Academy. All rights reserved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}


            {/* ── Logs Tab ─────────────────────────────────────────────── */}
            {activeTab === "logs" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Log header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Email Send History</p>
                    <p className="text-xs text-gray-500 mt-0.5">{totalLogs} emails logged in the system</p>
                  </div>
                  <button
                    onClick={() => fetchLogs(logPage)}
                    disabled={logsLoading}
                    className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${logsLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                        <th className="px-6 py-3.5 text-left">#</th>
                        <th className="px-6 py-3.5 text-left">Recipient</th>
                        <th className="px-6 py-3.5 text-left">Subject</th>
                        <th className="px-6 py-3.5 text-left">Date & Time</th>
                        <th className="px-6 py-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {logs.map((log, idx) => (
                        <tr key={log._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                            {(logPage - 1) * 15 + idx + 1}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900 text-xs font-mono">{log.to}</span>
                          </td>
                          <td className="px-6 py-4 max-w-[200px]">
                            <span className="text-xs text-gray-700 truncate block" title={log.subject}>{log.subject}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              log.status === "success"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`} title={log.error || ""}>
                              {log.status === "success"
                                ? <><CheckCircle2 className="w-3 h-3" /> Delivered</>
                                : <><AlertCircle className="w-3 h-3" /> Failed</>
                              }
                            </span>
                          </td>
                        </tr>
                      ))}

                      {!logsLoading && logs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                            <p className="text-sm font-semibold text-gray-400">No emails logged yet</p>
                            <p className="text-xs text-gray-300 mt-1">Send your first email from the Compose tab</p>
                          </td>
                        </tr>
                      )}

                      {logsLoading && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Page <span className="font-bold text-gray-700">{logPage}</span> of {totalPages} · {totalLogs} total
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLogPage(p => Math.max(p - 1, 1))}
                        disabled={logPage === 1}
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-40 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setLogPage(p => Math.min(p + 1, totalPages))}
                        disabled={logPage === totalPages}
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-40 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
