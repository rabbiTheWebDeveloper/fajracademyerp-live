"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { HelpCircle, Mail, PhoneCall, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function WhatsappIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.333 5.001l-1.416 5.172 5.294-1.388c1.464.798 3.116 1.216 4.779 1.217h.004c5.506 0 9.989-4.478 9.99-9.985 0-2.668-1.039-5.176-2.926-7.062a9.923 9.923 0 0 0-7.068-2.939zm.004 1.667c4.586 0 8.32 3.731 8.322 8.317 0 2.227-.867 4.32-2.444 5.895a8.274 8.274 0 0 1-5.882 2.447h-.003c-1.466 0-2.909-.39-4.175-1.128l-.3-.178-3.104.813.827-3.023-.195-.311a8.272 8.272 0 0 1-1.267-4.331c.001-4.586 3.737-8.318 8.32-8.318zm-3.568 4.24c-.198 0-.518.074-.79.37-.272.296-1.038 1.013-1.038 2.47 0 1.457 1.062 2.864 1.21 3.062.148.198 2.091 3.193 5.067 4.478.708.306 1.26.488 1.691.625.71.226 1.356.194 1.866.118.57-.085 1.754-.716 2.001-1.408.247-.692.247-1.285.173-1.408-.074-.124-.272-.198-.569-.346-.297-.148-1.754-.865-2.026-.964-.272-.099-.47-.148-.668.148-.198.297-.766.964-.939 1.162-.173.198-.346.222-.643.074-.297-.148-1.255-.462-2.39-1.475-.883-.787-1.48-1.759-1.653-2.056-.173-.297-.018-.458.13-.605.133-.133.297-.346.445-.519.148-.173.198-.297.297-.494.099-.198.049-.371-.025-.519-.074-.148-.668-1.606-.915-2.2-.24-.578-.485-.5-.668-.509z"/>
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<boolean | null>(null);

  const whatsappSupportUrl = "https://wa.me/8801641028312?text=" + encodeURIComponent("Hello Fajr Academy Support, I need help resetting my password.");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();
      setSuccess(data.success);
      setMessage(data.message || "An error occurred.");
    } catch (err) {
      setSuccess(false);
      setMessage("Network error. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/75 backdrop-blur-md p-6 sm:p-8 border border-white/20 rounded-2xl shadow-2xl max-w-md mx-auto">
      <div className="flex items-center gap-2 text-gray-500 mb-4">
        <Link href="/login" className="hover:text-[#0B1A45] transition-colors flex items-center gap-1 text-sm font-semibold text-[#0B1A45]/80">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
      </div>

      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#0B1A45]/10 text-[#0B1A45] flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Forgot Password</h2>
        <p className="text-sm text-gray-600 mt-1">Recover your Fajr Academy ERP account</p>
      </div>

      {message && (
        <div className={`mb-5 p-4 rounded-xl text-sm border flex items-start gap-3 ${
          success 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium leading-relaxed">{message}</p>
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
                href="tel:01641028312"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call 01641028312
              </a>
            </div>
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email, Student ID, or Phone
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1A45] text-gray-900 placeholder-gray-500"
                placeholder="Enter Email, Student ID, or Phone"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl shadow-lg shadow-[#0B1A45]/20 text-sm font-semibold text-white bg-[#0B1A45] hover:bg-[#132B66] focus:outline-none focus:ring-2 focus:ring-[#0B1A45] transition-all disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking Account...
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-600">
        <span>Need immediate assistance?</span>
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
          <a href="tel:01641028312" className="font-bold text-[#0B1A45] hover:underline flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5" /> 01641028312
          </a>
        </div>
      </div>
    </div>
  );
}
