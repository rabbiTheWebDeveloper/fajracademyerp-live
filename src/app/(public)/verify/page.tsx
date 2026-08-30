"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Printer,
  Sparkles,
  GraduationCap,
  Briefcase,
  Calendar,
  Building2,
  ArrowRight,
  Award,
  User,
  Star,
  Lock,
  Globe,
} from "lucide-react";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FajrLogo } from "@/components/FajrLogo";

interface VerificationResult {
  userType: "Student" | "Teacher" | "Staff" | "User";
  role: string;
  idCode: string;
  fullName: string;
  avatar?: string;
  gender?: string;
  status: string;
  course?: string;
  designation?: string;
  department?: string;
  joinedDate?: string;
  verificationId: string;
  verifiedAt: string;
}

function getUserTypeGradient(type: string) {
  switch (type?.toLowerCase()) {
    case "teacher": return "from-violet-600 to-purple-700";
    case "staff":   return "from-amber-500 to-orange-600";
    default:        return "from-emerald-500 to-teal-600";
  }
}

function getUserTypeGradientLight(type: string) {
  switch (type?.toLowerCase()) {
    case "teacher": return "from-violet-50 to-purple-50 border-violet-100";
    case "staff":   return "from-amber-50 to-orange-50 border-amber-100";
    default:        return "from-emerald-50 to-teal-50 border-emerald-100";
  }
}

function VerificationContent() {
  const searchParams = useSearchParams();
  const useRouterObj = useRouter();
  const { resolvedTheme } = useTheme();

  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [focused, setFocused] = useState(false);

  const initialId = searchParams.get("id") || "";

  const performVerification = async (idToVerify: string) => {
    const trimmed = idToVerify.trim();
    if (!trimmed) {
      setError("Please enter a valid User ID, Student ID, or Teacher ID.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.success && data.verified) {
        setResult(data.data);
      } else {
        setError(data.message || "User ID not found in Fajr Academy database.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      setInputQuery(initialId);
      performVerification(initialId);
    }
  }, [initialId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      useRouterObj.push(`/verify?id=${encodeURIComponent(inputQuery.trim())}`);
      performVerification(inputQuery);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/verify?id=${encodeURIComponent(result?.idCode || inputQuery)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        .verify-page {
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          min-height: 100vh;
          color: #334155;
          position: relative;
          overflow-x: hidden;
          transition: background 0.3s, color 0.3s;
        }

        /* ── Animated Background ── */
        .bg-mesh {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 80% 60% at 20% -10%, rgba(16,185,129,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 110%, rgba(99,102,241,0.05) 0%, transparent 60%);
        }

        .grid-lines {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
          animation: orbFloat 8s ease-in-out infinite;
          opacity: 0.6;
        }
        .orb-1 { width: 600px; height: 600px; background: rgba(16,185,129,0.06); top: -200px; left: -150px; }
        .orb-2 { width: 500px; height: 500px; background: rgba(99,102,241,0.06); bottom: -100px; right: -100px; animation-delay: 3s; }
        .orb-3 { width: 350px; height: 350px; background: rgba(6,182,212,0.04); top: 40%; left: 50%; transform: translateX(-50%); animation-delay: 5s; }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        /* Dark Mode Background */
        html.dark .verify-page {
          background: #020817;
          color: #cbd5e1;
        }
        html.dark .bg-mesh {
          background:
            radial-gradient(ellipse 80% 60% at 20% -10%, rgba(16,185,129,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 110%, rgba(99,102,241,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(6,182,212,0.05) 0%, transparent 70%),
            linear-gradient(180deg, #020817 0%, #030f1a 40%, #020817 100%);
        }
        html.dark .grid-lines {
          background-image:
            linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px);
        }
        html.dark .orb { opacity: 1; }

        /* ── Header ── */
        .site-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(148,163,184,0.1);
          transition: background-color 0.3s, border-color 0.3s;
        }
        html.dark .site-header {
          background: rgba(2,8,23,0.75);
          border-bottom: 1px solid rgba(148,163,184,0.08);
        }
        .header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
        }
        .logo-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid rgba(148,163,184,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          flex-shrink: 0;
        }
        html.dark .logo-box {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 0 1px rgba(16,185,129,0.15), 0 4px 16px rgba(0,0,0,0.3);
        }
        .logo-box img { width: 36px; height: 36px; object-fit: contain; }
        .logo-text { display: flex; flex-direction: column; }
        .logo-name {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        html.dark .logo-name { color: #fff; }
        .logo-sub {
          font-size: 0.62rem;
          font-weight: 600;
          color: #059669;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        html.dark .logo-sub { color: #10b981; }
        .header-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(5,150,105,0.06);
          border: 1px solid rgba(5,150,105,0.18);
          border-radius: 9999px;
          padding: 6px 14px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #059669;
        }
        html.dark .header-badge {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          color: #34d399;
        }
        .header-right { display: flex; align-items: center; gap: 12px; }
        .btn-signin {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 12px;
          padding: 9px 18px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .btn-signin:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: rgba(148,163,184,0.3);
        }
        html.dark .btn-signin {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #cbd5e1;
          box-shadow: none;
        }
        html.dark .btn-signin:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
          border-color: rgba(255,255,255,0.18);
        }

        /* ── Main ── */
        .main-content {
          position: relative;
          z-index: 10;
          max-width: 900px;
          margin: 0 auto;
          padding: 60px 24px 80px;
        }
        @media (max-width: 640px) {
          .main-content { padding: 30px 16px 80px; }
          .header-badge { display: none !important; }
          .header-inner { padding: 0 1rem; height: 64px; }
          .logo-name { font-size: 1rem; }
          .logo-sub { font-size: 0.55rem; }
          .btn-signin { padding: 7px 14px; font-size: 0.75rem; }
        }

        /* ── Hero Section ── */
        .hero {
          text-align: center;
          margin-bottom: 48px;
        }
        .hero-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(5,150,105,0.06);
          border: 1px solid rgba(5,150,105,0.18);
          border-radius: 9999px;
          padding: 8px 18px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #059669;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 24px;
        }
        html.dark .hero-chip {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          color: #34d399;
        }
        .hero-title {
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 900;
          color: #0f172a;
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin-bottom: 16px;
        }
        html.dark .hero-title { color: #fff; }
        .hero-title span {
          background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-desc {
          font-size: 1rem;
          color: #475569;
          max-width: 520px;
          margin: 0 auto;
          line-height: 1.7;
        }
        html.dark .hero-desc { color: #64748b; }

        /* ── Search Card ── */
        .search-card {
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 24px;
          padding: 32px;
          backdrop-filter: blur(20px);
          margin-bottom: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        html.dark .search-card {
          background: rgba(15,23,42,0.7);
          border: 1px solid rgba(148,163,184,0.1);
          box-shadow: 0 0 0 1px rgba(16,185,129,0.05), 0 24px 60px rgba(0,0,0,0.3);
        }
        .search-card.focused {
          border-color: rgba(5,150,105,0.3);
          box-shadow: 0 10px 30px rgba(5,150,105,0.05);
        }
        html.dark .search-card.focused {
          border-color: rgba(16,185,129,0.3);
          box-shadow: 0 0 0 1px rgba(16,185,129,0.1), 0 24px 60px rgba(0,0,0,0.3), 0 0 40px rgba(16,185,129,0.05);
        }
        .search-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: block;
          margin-bottom: 12px;
        }
        .search-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .search-input-wrap {
          position: relative;
          flex: 1;
          min-width: 240px;
        }
        .search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          width: 18px;
          height: 18px;
        }
        .search-input {
          width: 100%;
          padding: 16px 20px 16px 50px;
          background: #fff;
          border: 1px solid rgba(148,163,184,0.22);
          border-radius: 16px;
          color: #0f172a;
          font-size: 0.95rem;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 500;
          transition: all 0.2s;
          outline: none;
          text-overflow: ellipsis;
        }
        html.dark .search-input {
          background: rgba(2,8,23,0.8);
          border: 1px solid rgba(148,163,184,0.12);
          color: #e2e8f0;
        }
        .search-input::placeholder { color: #cbd5e1; }
        html.dark .search-input::placeholder { color: #334155; }
        .search-input:focus {
          border-color: rgba(5,150,105,0.4);
          box-shadow: 0 0 0 3px rgba(5,150,105,0.08);
        }
        html.dark .search-input:focus {
          border-color: rgba(16,185,129,0.5);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.08);
        }
        .search-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 28px;
          background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
          border: none;
          border-radius: 16px;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          white-space: nowrap;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 20px rgba(5,150,105,0.2);
        }
        .search-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #047857 0%, #0f766e 100%);
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(5,150,105,0.3);
        }
        .search-btn:active:not(:disabled) { transform: translateY(0); }
        .search-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .search-hints {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .hint-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 500;
        }
        .hint-dot { width: 5px; height: 5px; border-radius: 50%; background: #e2e8f0; }
        html.dark .hint-dot { background: #1e293b; }

        /* ── Loading ── */
        .loading-wrap {
          padding: 80px 0;
          text-align: center;
        }
        .spinner-ring {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid rgba(226,232,240,0.8);
          border-top-color: #059669;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }
        html.dark .spinner-ring {
          border: 3px solid rgba(15,23,42,0.9);
          border-top-color: #10b981;
        }
        .loading-text {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          animation: pulse 2s ease-in-out infinite;
        }

        /* ── Error State ── */
        .error-card {
          background: rgba(239,68,68,0.04);
          border: 1px solid rgba(239,68,68,0.18);
          border-radius: 24px;
          padding: 48px 32px;
          text-align: center;
          animation: fadeSlideIn 0.4s ease-out;
        }
        html.dark .error-card {
          background: rgba(127,29,29,0.15);
          border: 1px solid rgba(239,68,68,0.2);
        }
        .error-icon-wrap {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #dc2626;
        }
        html.dark .error-icon-wrap {
          background: rgba(127,29,29,0.3);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
        }
        .error-title { font-size: 1.25rem; font-weight: 700; color: #991b1b; margin-bottom: 8px; }
        html.dark .error-title { color: #fca5a5; }
        .error-msg { font-size: 0.875rem; color: #dc2626; opacity: 0.9; max-width: 400px; margin: 0 auto 16px; line-height: 1.6; }
        html.dark .error-msg { color: #f87171; }
        .error-tip { font-size: 0.75rem; color: #94a3b8; }

        /* ── Result Card ── */
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .result-wrap { animation: fadeSlideIn 0.5s cubic-bezier(0.16,1,0.3,1); }

        .result-card {
          background: #fff;
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.05);
          print-color-adjust: exact;
        }
        html.dark .result-card {
          background: rgba(10,18,36,0.85);
          border: 1px solid rgba(148,163,184,0.06);
          box-shadow: 0 0 0 1px rgba(148,163,184,0.06), 0 32px 80px rgba(0,0,0,0.5);
        }

        /* Top accent bar */
        .card-accent-bar {
          height: 4px;
          background: linear-gradient(90deg, #059669 0%, #0d9488 50%, #6366f1 100%);
        }
        .card-accent-bar.teacher { background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #a855f7 100%); }
        .card-accent-bar.staff   { background: linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #f97316 100%); }

        .card-body { padding: 36px 40px 32px; }

        /* Verified header */
        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 28px;
          border-bottom: 1px solid rgba(148,163,184,0.1);
          margin-bottom: 36px;
          flex-wrap: wrap;
        }
        html.dark .card-header {
          border-bottom: 1px solid rgba(148,163,184,0.07);
        }
        .verified-badge-row { display: flex; align-items: center; gap: 14px; }
        .verified-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(5,150,105,0.06);
          border: 1px solid rgba(5,150,105,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
          flex-shrink: 0;
        }
        html.dark .verified-icon-box {
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          color: #10b981;
          box-shadow: 0 0 24px rgba(16,185,129,0.15);
        }
        .verified-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(5,150,105,0.06);
          border: 1px solid rgba(5,150,105,0.18);
          border-radius: 9999px;
          padding: 4px 12px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #059669;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        html.dark .verified-label {
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          color: #34d399;
        }
        .verified-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; }
        html.dark .verified-title { color: #fff; }
        .ref-block {
          text-align: right;
          font-size: 0.72rem;
          color: #94a3b8;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1.8;
        }
        html.dark .ref-block { color: #334155; }
        .ref-block strong { color: #475569; font-weight: 600; }
        html.dark .ref-block strong { color: #94a3b8; }

        /* ID Card Grid */
        .id-card-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 40px;
          align-items: start;
        }
        @media (max-width: 640px) {
          .id-card-grid { grid-template-columns: 1fr; }
          .card-body { padding: 24px 20px 20px; }
          .card-header { flex-direction: column; }
          .ref-block { text-align: left; }
          .search-row { flex-direction: column; }
          .search-btn { width: 100%; justify-content: center; }
        }

        /* Avatar column */
        .avatar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .avatar-frame {
          position: relative;
          flex-shrink: 0;
        }
        .avatar-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid rgba(5,150,105,0.2);
          animation: ringPulse 3s ease-in-out infinite;
        }
        .avatar-ring.teacher { border-color: rgba(139,92,246,0.25); }
        .avatar-ring.staff   { border-color: rgba(245,158,11,0.25); }
        html.dark .avatar-ring { border-color: rgba(16,185,129,0.3); }
        html.dark .avatar-ring.teacher { border-color: rgba(139,92,246,0.35); }
        html.dark .avatar-ring.staff   { border-color: rgba(245,158,11,0.35); }

        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%  { transform: scale(1.04); opacity: 1; }
        }
        .avatar-img {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(5,150,105,0.25);
          display: block;
          background: #f8fafc;
        }
        .avatar-img.teacher { border-color: rgba(139,92,246,0.3); }
        .avatar-img.staff   { border-color: rgba(245,158,11,0.3); }
        html.dark .avatar-img {
          border-color: rgba(16,185,129,0.4);
          background: #0f172a;
        }
        html.dark .avatar-img.teacher { border-color: rgba(139,92,246,0.5); }
        html.dark .avatar-img.staff   { border-color: rgba(245,158,11,0.5); }

        .avatar-initials {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.02em;
          border: 3px solid transparent;
        }
        .avatar-type-pill {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 0.62rem;
          font-weight: 800;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 3px 12px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .avatar-name {
          text-align: center;
        }
        .avatar-name h3 {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }
        html.dark .avatar-name h3 { color: #f1f5f9; }
        
        .id-code-pill {
          display: inline-block;
          background: rgba(5,150,105,0.06);
          border: 1px solid rgba(5,150,105,0.18);
          border-radius: 9999px;
          padding: 4px 14px;
          font-size: 0.7rem;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          color: #059669;
          letter-spacing: 0.05em;
        }
        .id-code-pill.teacher { background: rgba(139,92,246,0.06); border-color: rgba(139,92,246,0.18); color: #7c3aed; }
        .id-code-pill.staff   { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.18); color: #d97706; }
        
        html.dark .id-code-pill { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.2); color: #10b981; }
        html.dark .id-code-pill.teacher { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.2); color: #a78bfa; }
        html.dark .id-code-pill.staff   { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.2); color: #fbbf24; }

        /* Info column */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 480px) { .info-grid { grid-template-columns: 1fr; } }
        
        .info-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        html.dark .info-label { color: #475569; }
        
        .info-value {
          font-size: 0.9rem;
          font-weight: 700;
          color: #334155;
        }
        html.dark .info-value { color: #e2e8f0; }
        
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 700;
          color: #059669;
          text-transform: capitalize;
        }
        html.dark .status-pill { color: #10b981; }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #059669;
          box-shadow: 0 0 8px rgba(5,150,105,0.4);
          animation: statusBlink 2s ease-in-out infinite;
        }
        html.dark .status-dot {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16,185,129,0.6);
        }
        @keyframes statusBlink {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }

        /* Watermark seal footer */
        .card-seal {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 20px;
          border-top: 1px solid rgba(148,163,184,0.1);
          margin-top: 4px;
          flex-wrap: wrap;
          gap: 12px;
        }
        html.dark .card-seal { border-top: 1px solid rgba(148,163,184,0.07); }
        .seal-left { display: flex; align-items: center; gap: 10px; }
        .seal-logo { height: 26px; width: auto; opacity: 0.45; }
        html.dark .seal-logo { opacity: 0.5; }
        .seal-text { font-size: 0.7rem; color: #94a3b8; font-weight: 500; }
        html.dark .seal-text { color: #334155; }
        .seal-right { font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; color: #cbd5e1; }
        html.dark .seal-right { color: #1e293b; }

        /* Action buttons */
        .action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          border-top: 1px solid rgba(148,163,184,0.1);
          gap: 12px;
          flex-wrap: wrap;
          background: #f8fafc;
        }
        html.dark .action-row {
          border-top: 1px solid rgba(148,163,184,0.06);
          background: rgba(2,8,23,0.3);
        }
        @media (max-width: 640px) { .action-row { padding: 16px 20px; } }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .action-btn-ghost {
          background: #fff;
          border-color: rgba(148,163,184,0.22);
          color: #475569;
        }
        .action-btn-ghost:hover { background: #f8fafc; color: #0f172a; }
        html.dark .action-btn-ghost {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
          color: #94a3b8;
        }
        html.dark .action-btn-ghost:hover { background: rgba(255,255,255,0.07); color: #e2e8f0; }
        
        .action-btn-primary {
          background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(5,150,105,0.2);
        }
        .action-btn-primary:hover {
          background: linear-gradient(135deg, #047857 0%, #0f766e 100%);
          box-shadow: 0 6px 24px rgba(5,150,105,0.3);
          transform: translateY(-1px);
        }

        /* ── Features Row ── */
        .features-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 40px;
        }
        @media (max-width: 640px) { .features-row { grid-template-columns: 1fr; } }
        .feature-card {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(148,163,184,0.12);
          border-radius: 20px;
          padding: 24px 20px;
          text-align: center;
          backdrop-filter: blur(10px);
          transition: border-color 0.3s, transform 0.3s;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }
        .feature-card:hover { border-color: rgba(5,150,105,0.2); transform: translateY(-2px); }
        html.dark .feature-card {
          background: rgba(15,23,42,0.5);
          border: 1px solid rgba(148,163,184,0.07);
          box-shadow: none;
        }
        html.dark .feature-card:hover { border-color: rgba(16,185,129,0.2); }
        
        .feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px; font-size: 1.1rem;
        }
        .feature-title { font-size: 0.85rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        html.dark .feature-title { color: #e2e8f0; }
        .feature-desc  { font-size: 0.75rem; color: #64748b; line-height: 1.5; }
        html.dark .feature-desc { color: #475569; }

        /* ── Footer ── */
        .site-footer {
          position: relative;
          z-index: 10;
          border-top: 1px solid rgba(148,163,184,0.1);
          background: rgba(255, 255, 255, 0.5);
          padding: 28px 24px;
          text-align: center;
          font-size: 0.75rem;
          color: #64748b;
        }
        html.dark .site-footer {
          border-top: 1px solid rgba(148,163,184,0.06);
          background: rgba(2,8,23,0.6);
          color: #334155;
        }

        /* ── Print styles ── */
        @media print {
          .bg-mesh, .grid-lines, .orb { display: none !important; }
          .site-header, .hero, .search-card, .action-row, .features-row, .site-footer { display: none !important; }
          .result-card { box-shadow: none; border: 1px solid #e2e8f0; }
          .card-body { padding: 24px; }
          .info-value, .avatar-name h3 { color: #111 !important; }
          .info-label { color: #666 !important; }
          .verified-title { color: #111 !important; }
        }
      `}</style>

      <div className="verify-page">
        {/* Animated BG */}
        <div className="bg-mesh" />
        <div className="grid-lines" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* ── Header ── */}
        <header className="site-header print:hidden">
          <div className="header-inner">
            <div className="flex items-center gap-3">
              <FajrLogo size="sm" href="/" />
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#c5a059]/10 text-[#88692c] dark:text-[#dfb76c] border border-[#c5a059]/30">
                Verification Portal
              </span>
            </div>

            <div className="header-right">
              <ThemeToggle />
              <div className="header-badge" style={{ display: "flex" }}>
                <ShieldCheck style={{ width: 12, height: 12 }} />
                Secure · Official
              </div>
              <Link href="/login" className="btn-signin">
                Sign In <ArrowRight style={{ width: 13, height: 13 }} />
              </Link>
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="main-content">
          {/* Hero */}
          <div className="hero print:hidden">
            <div className="hero-chip">
              <ShieldCheck style={{ width: 14, height: 14 }} />
              Official Member Verification
            </div>
            <h1 className="hero-title">
              Verify Member <span>Authenticity</span>
            </h1>
            <p className="hero-desc">
              Instantly confirm the validity of any Student, Teacher, or Staff member registered at Fajr Academy using their official ID.
            </p>
          </div>

          {/* Search Card */}
          <div className={`search-card print:hidden ${focused ? "focused" : ""}`}>
            <form onSubmit={handleSubmit}>
              <label className="search-label">
                Enter User ID · Student ID · Teacher ID · or Email
              </label>
              <div className="search-row">
                <div className="search-input-wrap">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. STUM072... or FJRT..."
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="search-input"
                  />
                </div>
                <button type="submit" disabled={loading} className="search-btn">
                  {loading ? (
                    <>
                      <Loader2 style={{ width: 18, height: 18, animation: "spin 0.8s linear infinite" }} />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck style={{ width: 18, height: 18 }} />
                      Verify Now
                    </>
                  )}
                </button>
              </div>
              <div className="search-hints">
                <div className="hint-item">
                  <span className="hint-dot" />
                  Student IDs start with STU
                </div>
                <div className="hint-item">
                  <span className="hint-dot" />
                  Teacher IDs start with FJRT
                </div>
                <div className="hint-item">
                  <span className="hint-dot" />
                  Staff IDs start with STA
                </div>
              </div>
            </form>
          </div>

          {/* Loading */}
          {loading && (
            <div className="loading-wrap">
              <div className="spinner-ring" />
              <p className="loading-text">Checking official Fajr Academy records...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="error-card">
              <div className="error-icon-wrap">
                <XCircle style={{ width: 34, height: 34 }} />
              </div>
              <h3 className="error-title">Verification Unsuccessful</h3>
              <p className="error-msg">{error}</p>
              <p className="error-tip">
                Tip: Ensure the ID is typed exactly as shown on the official ID card or admission receipt.
              </p>
            </div>
          )}

          {/* ── Result ── */}
          {!loading && result && (() => {
            const uType = result.userType?.toLowerCase() || "student";
            const gradient = getUserTypeGradient(uType);
            const gradientLight = getUserTypeGradientLight(uType);

            return (
              <div className="result-wrap">
                <div className="result-card">
                  {/* Accent bar */}
                  <div className={`card-accent-bar ${uType}`} />

                  <div className="card-body">
                    {/* Header row */}
                    <div className="card-header">
                      <div className="verified-badge-row">
                        <div className="verified-icon-box">
                          <CheckCircle2 style={{ width: 26, height: 26 }} />
                        </div>
                        <div>
                          <div className="verified-label">
                            <Sparkles style={{ width: 10, height: 10 }} />
                            Authentic &amp; Verified
                          </div>
                          <div className="verified-title">Official Fajr Academy Member</div>
                        </div>
                      </div>
                      <div className="ref-block">
                        <div>Ref: <strong>{result.verificationId}</strong></div>
                        <div>Verified: {new Date(result.verifiedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
                      </div>
                    </div>

                    {/* ID Card Grid */}
                    <div className="id-card-grid">
                      {/* Avatar column */}
                      <div className="avatar-col">
                        <div className="avatar-frame">
                          <div className={`avatar-ring ${uType}`} />
                          {result.gender?.toLowerCase() === "female" ? (
                            <img
                              src="/default-female.png"
                              alt="Female Profile"
                              className={`avatar-img ${uType}`}
                              style={{ padding: "2px" }}
                            />
                          ) : result.avatar ? (
                            <img
                              src={result.avatar}
                              alt={result.fullName}
                              className={`avatar-img ${uType}`}
                            />
                          ) : (
                            <div
                              className={`avatar-initials bg-gradient-to-br ${gradient}`}
                            >
                              {result.fullName?.slice(0, 2)?.toUpperCase() || "FA"}
                            </div>
                          )}
                          <span
                            className={`avatar-type-pill bg-gradient-to-r ${gradient}`}
                          >
                            {result.userType}
                          </span>
                        </div>
                        <div className="avatar-name">
                          <h3>{result.fullName}</h3>
                          <span className={`id-code-pill ${uType}`}>
                            {result.idCode}
                          </span>
                        </div>
                      </div>

                      {/* Info column */}
                      <div className="info-col">
                        <div className="info-grid">
                          <div className="info-item">
                            <div className="info-label">
                              <Award style={{ width: 11, height: 11, color: "#059669" }} />
                              Member Category
                            </div>
                            <div className="info-value">{result.role}</div>
                          </div>

                          <div className="info-item">
                            <div className="info-label">
                              <Building2 style={{ width: 11, height: 11, color: "#2563eb" }} />
                              Department / Program
                            </div>
                            <div className="info-value">
                              {result.course || result.designation || result.department || "Fajr Academy"}
                            </div>
                          </div>

                          <div className="info-item">
                            <div className="info-label">
                              <Calendar style={{ width: 11, height: 11, color: "#7c3aed" }} />
                              Member Since
                            </div>
                            <div className="info-value">
                              {result.joinedDate
                                ? new Date(result.joinedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                                : "Active Registration"}
                            </div>
                          </div>

                          <div className="info-item">
                            <div className="info-label">
                              <ShieldCheck style={{ width: 11, height: 11, color: "#059669" }} />
                              Current Status
                            </div>
                            <div className="info-value">
                              <div className="status-pill">
                                <span className="status-dot" />
                                {result.status} Member
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Seal */}
                        <div className="card-seal">
                          <div className="seal-left">
                            <img src="/fajr-logo.png" alt="Seal" className="seal-logo"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="seal-text">Certified by Fajr Academy ERP System</span>
                          </div>
                          <span className="seal-right">SECURE · AUTHENTIC · VERIFIED</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="action-row print:hidden">
                    <button onClick={handleCopyLink} className="action-btn action-btn-ghost">
                      {copied ? <Check style={{ width: 15, height: 15, color: "#059669" }} /> : <Copy style={{ width: 15, height: 15 }} />}
                      {copied ? "Link Copied!" : "Copy Share Link"}
                    </button>
                    <button onClick={handlePrint} className="action-btn action-btn-primary">
                      <Printer style={{ width: 15, height: 15 }} />
                      Print Certificate
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Features row */}
          {!result && !loading && !error && (
            <div className="features-row print:hidden">
              <div className="feature-card">
                <div className="feature-icon" style={{ background: "rgba(5,150,105,0.06)", color: "#059669" }}>
                  <ShieldCheck style={{ width: 22, height: 22 }} />
                </div>
                <div className="feature-title">Secure Verification</div>
                <div className="feature-desc">All records are encrypted and cross-checked with the official Fajr Academy database.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon" style={{ background: "rgba(99,102,241,0.06)", color: "#4f46e5" }}>
                  <Star style={{ width: 22, height: 22 }} />
                </div>
                <div className="feature-title">Instant Results</div>
                <div className="feature-desc">Get real-time verification status for Students, Teachers, and Staff in seconds.</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon" style={{ background: "rgba(245,158,11,0.06)", color: "#d97706" }}>
                  <Lock style={{ width: 22, height: 22 }} />
                </div>
                <div className="feature-title">Privacy Protected</div>
                <div className="feature-desc">Only authorized data is displayed. Sensitive details remain private and protected.</div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="site-footer print:hidden">
          <p>
            © {new Date().getFullYear()} Fajr Academy. All rights reserved. &nbsp;·&nbsp; Official Member Verification Portal &nbsp;·&nbsp;
            <Globe style={{ width: 11, height: 11, display: "inline", marginLeft: 4, marginRight: 2, verticalAlign: "middle" }} />
            fajracademy.io
          </p>
        </footer>
      </div>
    </>
  );
}

export default function PublicVerifyPage() {
  return (
    <ThemeProvider>
      <Suspense
        fallback={
          <div style={{
            minHeight: "100vh",
            background: "#020817",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Loader2 style={{ width: 36, height: 36, color: "#10b981", animation: "spin 0.8s linear infinite" }} />
          </div>
        }
      >
        <VerificationContent />
      </Suspense>
    </ThemeProvider>
  );
}
