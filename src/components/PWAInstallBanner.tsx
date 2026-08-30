"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles } from "lucide-react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running as PWA (standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Check if dismissed recently (within 24 hours)
    const lastDismissed = localStorage.getItem("fajr_pwa_banner_dismissed");
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed, 10);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Fallback: If not standalone, show branded banner after short delay
    const timer = setTimeout(() => {
      if (!isStandalone && (!lastDismissed || Date.now() - parseInt(lastDismissed, 10) >= 24 * 60 * 60 * 1000)) {
        setShowBanner(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      alert("To install Fajr Academy ERP, open your browser menu (⋮ or 🧭) and select 'Add to Home Screen' or 'Install App'.");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("fajr_pwa_banner_dismissed", Date.now().toString());
  };

  if (installed || !showBanner) return null;

  return (
    <>
      {/* Responsive PWA Install Banner */}
      <aside
        aria-label="Install App"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom,12px))] sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 md:right-8 sm:max-w-md z-50 transition-all duration-300 ease-out"
      >
        <div className="bg-[#0A1931]/95 border border-blue-500/30 text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Logo & Application Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 p-1.5 flex-shrink-0 border border-white/20 shadow-inner overflow-hidden flex items-center justify-center relative group">
              <img
                src="/logo.png"
                alt="Fajr Academy Logo"
                className="w-full h-full object-contain filter drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-xs sm:text-sm text-white tracking-tight truncate">
                  Fajr Academy
                </h4>
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/25 text-blue-300 px-1.5 py-0.5 rounded-md border border-blue-400/30 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-blue-400" /> ERP
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-200/75 truncate mt-0.5">
                Install app for fast offline access
              </p>
            </div>
          </div>

          {/* Responsive Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-blue-600/40 flex items-center gap-1.5 transition-all duration-200 active:scale-95 hover:shadow-blue-500/50"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span className="hidden xs:inline sm:inline">Install</span>
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="p-1.5 sm:p-2 text-blue-300/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Responsive iOS Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0A1931] border border-blue-500/30 text-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Install on iOS</h3>
                  <p className="text-[11px] text-blue-300/70">Apple Safari browser</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-blue-200/80 leading-relaxed">
              Follow these simple steps to add <strong>Fajr Academy</strong> to your Home Screen:
            </p>

            <ol className="text-xs space-y-3 text-blue-100/90">
              <li className="flex items-center gap-3 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                <span className="w-6 h-6 rounded-full bg-blue-600/40 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">
                  1
                </span>
                <span>Tap the <strong>Share</strong> icon in Safari&apos;s bottom bar</span>
              </li>
              <li className="flex items-center gap-3 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                <span className="w-6 h-6 rounded-full bg-blue-600/40 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">
                  2
                </span>
                <span>Scroll down &amp; tap <strong>Add to Home Screen</strong></span>
              </li>
              <li className="flex items-center gap-3 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                <span className="w-6 h-6 rounded-full bg-blue-600/40 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">
                  3
                </span>
                <span>Tap <strong>Add</strong> at top right to complete</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
