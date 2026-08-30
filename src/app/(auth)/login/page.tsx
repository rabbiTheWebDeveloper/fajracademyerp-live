"use client";

import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail, Lock, LogIn, AlertCircle, Loader2, Eye, EyeOff,
  ShieldCheck, X, PhoneCall, CheckCircle2, HelpCircle, ArrowRight,
} from "lucide-react";

function WhatsappIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.333 5.001l-1.416 5.172 5.294-1.388c1.464.798 3.116 1.216 4.779 1.217h.004c5.506 0 9.989-4.478 9.99-9.985 0-2.668-1.039-5.176-2.926-7.062a9.923 9.923 0 0 0-7.068-2.939zm.004 1.667c4.586 0 8.32 3.731 8.322 8.317 0 2.227-.867 4.32-2.444 5.895a8.274 8.274 0 0 1-5.882 2.447h-.003c-1.466 0-2.909-.39-4.175-1.128l-.3-.178-3.104.813.827-3.023-.195-.311a8.272 8.272 0 0 1-1.267-4.331c.001-4.586 3.737-8.318 8.32-8.318zm-3.568 4.24c-.198 0-.518.074-.79.37-.272.296-1.038 1.013-1.038 2.47 0 1.457 1.062 2.864 1.21 3.062.148.198 2.091 3.193 5.067 4.478.708.306 1.26.488 1.691.625.71.226 1.356.194 1.866.118.57-.085 1.754-.716 2.001-1.408.247-.692.247-1.285.173-1.408-.074-.124-.272-.198-.569-.346-.297-.148-1.754-.865-2.026-.964-.272-.099-.47-.148-.668.148-.198.297-.766.964-.939 1.162-.173.198-.346.222-.643.074-.297-.148-1.255-.462-2.39-1.475-.883-.787-1.48-1.759-1.653-2.056-.173-.297-.018-.458.13-.605.133-.133.297-.346.445-.519.148-.173.198-.297.297-.494.099-.198.049-.371-.025-.519-.074-.148-.668-1.606-.915-2.2-.24-.578-.485-.5-.668-.509z" />
    </svg>
  );
}

// Role → redirect destination
const ROLE_REDIRECT: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  staff: "/staff",
  admin: "/admin",
  "super-admin": "/admin",
};

function getRoleRedirect(role?: string): string {
  if (!role) return "/admin";
  if (ROLE_REDIRECT[role]) return ROLE_REDIRECT[role];
  if (["sales", "marketing", "bd", "cam", "customer-executive"].includes(role)) {
    return "/staff";
  }
  return "/admin";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // "loading" = submitting; "redirecting" = success, waiting for navigation
  const [phase, setPhase] = useState<"idle" | "loading" | "redirecting">("idle");
  const [error, setError] = useState("");

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState<boolean | null>(null);

  const whatsappSupportUrl =
    "https://wa.me/8801641028312?text=" +
    encodeURIComponent("Hello Fajr Academy Support, I need assistance with my account login.");

  const isDisabled = phase !== "idle";

  // ── Pre-check: if user already has a valid cookie, skip login page ──────────
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me", { method: "GET" })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (isMounted && data?.success && data.user?.role) {
          const dest = getRoleRedirect(data.user.role);
          if (dest && window.location.pathname !== dest) {
            window.location.replace(dest);
          }
        }
      })
      .catch(() => {/* not logged in — stay on page */});

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Handle login ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setPhase("loading");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Login failed. Please try again.");
        setPhase("idle");
        return;
      }

      // Switch to redirecting phase — keep spinner visible during navigation
      setPhase("redirecting");
      const dest = getRoleRedirect(data.user?.role);
      // Use native window.location.replace instead of Next.js router for cross-layout
      // navigation. This forces a hard reload, which is much faster than waiting for
      // Next.js to fetch and evaluate the entire RSC payload for the new portal layout.
      window.location.replace(dest);
      // Do NOT call router.refresh() here — it causes a double-render flash.
    } catch {
      setError("Network error. Please check your connection and try again.");
      setPhase("idle");
    }
  };

  // ── Handle forgot password ────────────────────────────────────────────────────
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotMessage("");
    setForgotSuccess(null);
    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const data = await res.json();
      setForgotSuccess(data.success);
      setForgotMessage(data.message || "An error occurred.");
    } catch {
      setForgotSuccess(false);
      setForgotMessage("Network error. Please try again later.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Full-screen redirect overlay — prevents blank flash during navigation */}
      {phase === "redirecting" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-indigo-950/80 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
          <p className="text-white text-sm font-semibold tracking-wide animate-pulse">
            Signing you in…
          </p>
        </div>
      )}

      <div className="bg-white/75 backdrop-blur-md p-6 sm:p-8 border border-white/20 rounded-2xl shadow-2xl relative">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
          <p className="text-sm text-gray-600 mt-2">Sign in to Fajr Academy ERP</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/25 text-red-900 rounded-xl text-sm space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
            <div className="pt-2 border-t border-red-200/50 flex flex-wrap items-center gap-2">
              <a
                href={whatsappSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-105"
              >
                <WhatsappIcon className="w-4 h-4" /> WhatsApp Support
              </a>
              <a
                href="tel:01857381244"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" /> 01857-381244
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email / ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email or Student ID
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/30 border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1A45] focus:bg-white/80 transition-all text-gray-900 placeholder-gray-500 disabled:opacity-60"
                placeholder="Email, Student ID, or Student Number"
                disabled={isDisabled}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotIdentifier(email);
                  setForgotMessage("");
                  setForgotSuccess(null);
                }}
                className="text-sm font-semibold text-[#0B1A45] hover:text-[#162C65] transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-white/30 border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1A45] focus:bg-white/80 transition-all text-gray-900 placeholder-gray-500 disabled:opacity-60"
                placeholder="Enter your password"
                disabled={isDisabled}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl shadow-lg shadow-[#0B1A45]/25 text-sm font-semibold text-white bg-[#0B1A45] hover:bg-[#132B66] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B1A45] transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {phase === "loading" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
            ) : phase === "redirecting" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Opening Dashboard…</>
            ) : (
              <><LogIn className="w-4 h-4" /> Sign In</>
            )}
          </button>
        </form>

        {/* Verify link */}
        <div className="mt-6 pt-4 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-600">
          <span>Verify Student or Teacher ID?</span>
          <Link
            href="/verify"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-200/80 shadow-sm transition-all hover:scale-105"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verify Member
          </Link>
        </div>
      </div>

      {/* ── Forgot Password Modal ─────────────────────────────────────────────── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in slide-in-from-bottom-4 duration-200">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#0B1A45]/10 text-[#0B1A45] flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Forgot Password</h3>
                <p className="text-xs text-gray-500">Recover your account or contact support</p>
              </div>
            </div>

            {forgotMessage && (
              <div className={`mb-4 p-4 rounded-xl text-sm border flex items-start gap-3 ${
                forgotSuccess
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}>
                {forgotSuccess
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="font-medium leading-relaxed">{forgotMessage}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={whatsappSupportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-105"
                    >
                      <WhatsappIcon className="w-4 h-4" /> WhatsApp Support
                    </a>
                    <a
                      href="tel:01857381244"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> 01857-381244
                    </a>
                  </div>
                </div>
              </div>
            )}

            {!forgotSuccess && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Email, Student ID, or Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. your@email.com or FA-1234"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1A45] text-gray-900"
                    disabled={forgotLoading}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#0B1A45] hover:bg-[#132B66] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-[#0B1A45]/20"
                >
                  {forgotLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Looking up account…</>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">Need direct assistance?</span>
              <div className="flex items-center gap-2">
                <a
                  href={whatsappSupportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <WhatsappIcon className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <span className="text-gray-300">|</span>
                <a href="tel:01857381244" className="font-bold text-[#0B1A45] hover:underline flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5" /> 01857-381244
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
