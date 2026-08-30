"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

interface Notice {
  _id: string;
  title: string;
  content: string[];
  bottomQuote?: string;
  signOff?: string;
  modalDuration?: string;
}

export default function NoticeModal() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCloseBtn, setShowCloseBtn] = useState(true);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const res = await fetch("/api/teacher-portal/active-notice");
        const data = await res.json();
        
        if (data.success && data.notice) {
          const activeNotice = data.notice;
          
          // Check localStorage
          const stored = localStorage.getItem("dismissedNotice");
          let shouldShow = true;
          
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.id === activeNotice._id) {
                if (!parsed.expiry || parsed.expiry > Date.now()) {
                  shouldShow = false;
                }
              }
            } catch (e) {
              // fallback for old string format
              if (stored === activeNotice._id) {
                shouldShow = false;
              }
            }
          }

          if (shouldShow) {
            setNotice(activeNotice);
            setIsOpen(true);
            
            // Handle 's' duration (delay close button)
            const duration = activeNotice.modalDuration || "";
            if (duration.endsWith("s")) {
              const seconds = parseInt(duration.replace("s", ""), 10);
              if (!isNaN(seconds) && seconds > 0) {
                setShowCloseBtn(false);
                setCountdown(seconds);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch active notice:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || showCloseBtn) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowCloseBtn(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, showCloseBtn]);

  const handleClose = () => {
    if (!showCloseBtn) return; // Prevent closing if button is disabled
    
    if (notice) {
      let expiry: number | null = null;
      const duration = notice.modalDuration || "";
      if (duration.endsWith("d")) {
        const days = parseInt(duration.replace("d", ""), 10);
        if (!isNaN(days) && days > 0) {
          expiry = Date.now() + days * 24 * 60 * 60 * 1000;
        }
      }
      
      localStorage.setItem("dismissedNotice", JSON.stringify({
        id: notice._id,
        expiry: expiry
      }));
    }
    setIsOpen(false);
  };

  if (loading || !isOpen || !notice) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-200">
        
        {/* Overlapping Bell Icon */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center justify-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm relative">
            {/* Inner ring */}
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center">
              <Bell className="w-10 h-10 text-orange-500 fill-orange-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Close Button / Timer */}
        {showCloseBtn ? (
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm z-10"
            aria-label="Close Notice"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="absolute top-4 right-4 w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold text-xs shadow-sm z-10 border border-gray-200">
            {countdown}s
          </div>
        )}

        {/* Scrollable Content Wrapper for Mobile */}
        <div className="overflow-y-auto max-h-[calc(100vh-6rem)] sm:max-h-[85vh] rounded-xl w-full">
          {/* Content Area */}
        <div className="pt-16 pb-8 px-6 sm:px-10 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {notice.title}
          </h2>
          
          <div className="space-y-4 text-gray-600 text-sm sm:text-base text-left leading-relaxed">
            {notice.content.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Footer Area */}
        { (notice.bottomQuote || notice.signOff) && (
          <div className="px-6 pb-6 sm:px-10">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-left">
              {notice.bottomQuote && (
                <p className="text-gray-900 font-medium mb-3">
                  {notice.bottomQuote}
                </p>
              )}
              {notice.signOff && (
                <div className="text-gray-600 text-sm">
                  {notice.signOff.split(',').map((part, idx) => (
                    <span key={idx} className={idx === 1 ? "block text-blue-600 font-semibold mt-0.5" : "block"}>
                      {part}{idx === 0 ? ',' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

