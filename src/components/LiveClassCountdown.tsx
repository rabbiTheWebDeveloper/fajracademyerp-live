'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Video, Bell, BellOff, ArrowRight, Sparkles, CheckCircle2, Volume2 } from 'lucide-react';
import Link from 'next/link';

export interface ClassScheduleItem {
  _id?: string;
  classId?: string;
  course?: { title?: string; _id?: string };
  student?: { fullName?: string; _id?: string; studentId?: string };
  teacher?: { fullName?: string; _id?: string };
  startTime: string; // e.g. "10:30 AM" or "10:30" or "22:00"
  endTime?: string;
  duration?: number;
  meetLink?: string;
  type?: string;
  [key: string]: any;
}

interface LiveClassCountdownProps {
  schedules: ClassScheduleItem[];
  role?: 'teacher' | 'admin';
  classPageHref?: string;
}

export default function LiveClassCountdown({
  schedules = [],
  role = 'teacher',
  classPageHref = '/teacher/class',
}: LiveClassCountdownProps) {
  const [now, setNow] = useState<Date>(new Date());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notifiedSessions, setNotifiedSessions] = useState<Record<string, boolean>>({});

  // 1. Ticking clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Notification permission state check
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Soft audio chime using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';

      // 2-tone pleasant chime (D5 -> A5)
      const nowTime = audioCtx.currentTime;
      osc.frequency.setValueAtTime(587.33, nowTime); // D5
      osc.frequency.setValueAtTime(880, nowTime + 0.18); // A5

      gain.gain.setValueAtTime(0.3, nowTime);
      gain.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.65);

      osc.start(nowTime);
      osc.stop(nowTime + 0.65);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, []);

  // Send system notification using Service Worker with instant fallback to standard Notification
  const sendSystemNotification = useCallback(
    async (title: string, options: NotificationOptions & { data?: any }) => {
      // 1. Try Service Worker if available and ready within 300ms
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const reg = await Promise.race([
            navigator.serviceWorker.getRegistration(),
            new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 300)),
          ]);

          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              ...options,
              badge: '/fajr-logo.png',
              vibrate: [200, 100, 200],
            } as any);
            return;
          }
        } catch (err) {
          // Fall through to standard notification
        }
      }

      // 2. Direct Window Notification fallback
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const notif = new Notification(title, {
            ...options,
            badge: '/fajr-logo.png',
          } as any);
          if (options?.data?.url) {
            notif.onclick = () => {
              window.focus();
              window.location.href = options.data.url;
            };
          }
        }
      } catch (e) {
        console.warn('Browser Notification error:', e);
      }
    },
    []
  );

  const handleTestOrEnableAlert = async () => {
    try {
      // Play audio chime immediately (user interaction satisfies browser autoplay policies)
      playNotificationSound();

      // Vibrate if on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Check & request notification permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        let perm = Notification.permission;
        if (perm !== 'granted') {
          perm = await Notification.requestPermission();
          setNotificationPermission(perm);
        }

        if (perm === 'granted') {
          await sendSystemNotification('🔔 ফজরিয়া ক্লাস অ্যালার্ট (টেস্ট)', {
            body: 'ক্লাস শুরুর ১০ মিনিট ও ৫ মিনিট আগে আপনি সাউন্ডসহ রিমাইন্ডার পাবেন।',
            icon: '/fajr-logo.png',
            tag: 'class-alert-test',
            data: { url: classPageHref },
          });
        }
      }
    } catch (e) {
      console.warn('Alert test error:', e);
    }
  };

  // Helper to parse time strings like "10:30 AM", "02:15 PM", "14:00" to minutes from 00:00
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const str = timeStr.trim().toUpperCase();
    const isPM = str.includes('PM');
    const isAM = str.includes('AM');
    const clean = str.replace(/(AM|PM)/g, '').trim();
    const parts = clean.split(':');
    let hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();

  // Process today's schedules
  const processedSchedules = (schedules || [])
    .filter((s) => Boolean(s?.startTime))
    .map((s) => {
      const startMins = parseTimeToMinutes(s.startTime);
      const duration = Number(s.duration) || 45;
      const endMins = s.endTime ? parseTimeToMinutes(s.endTime) : startMins + duration;
      return {
        ...s,
        startMins,
        endMins: endMins <= startMins ? startMins + duration : endMins,
      };
    })
    .sort((a, b) => a.startMins - b.startMins);

  // Active / Live Session
  const activeSession = processedSchedules.find(
    (s) => currentMinutes >= s.startMins && currentMinutes < s.endMins
  );

  // Next Upcoming Session
  const upcomingSession = processedSchedules.find((s) => s.startMins > currentMinutes);

  // Push / Browser Notification 10m, 5m, 1m before start
  useEffect(() => {
    if (!upcomingSession || notificationPermission !== 'granted') return;

    const minsLeft = upcomingSession.startMins - currentMinutes;
    const sessionKey = `${upcomingSession._id || upcomingSession.startTime}-${minsLeft}`;

    if ((minsLeft === 10 || minsLeft === 5 || minsLeft === 1) && !notifiedSessions[sessionKey]) {
      setNotifiedSessions((prev) => ({ ...prev, [sessionKey]: true }));
      playNotificationSound();

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      const rolePrefix = role === 'teacher' ? 'উস্তাদ' : 'অ্যাডমিন';
      const studentName = upcomingSession.student?.fullName ? `${upcomingSession.student.fullName}-এর সাথে ` : '';
      const courseTitle = upcomingSession.course?.title || 'ক্লাস';

      sendSystemNotification(`⏰ ক্লাস রিমাইন্ডার (${minsLeft} মিনিট বাকি)`, {
        body: `${rolePrefix}, ${studentName}${courseTitle} শুরু হতে ${minsLeft} মিনিট বাকি।`,
        icon: '/fajr-logo.png',
        tag: 'class-reminder',
        data: { url: upcomingSession.meetLink || classPageHref },
      });
    }
  }, [
    upcomingSession,
    currentMinutes,
    notificationPermission,
    notifiedSessions,
    playNotificationSound,
    role,
    sendSystemNotification,
    classPageHref,
  ]);

  // 🏁 Class Time Over / Class End Notification Trigger
  useEffect(() => {
    if (notificationPermission !== 'granted' || processedSchedules.length === 0) return;

    processedSchedules.forEach((session) => {
      // If the current minute just reached or passed the end time (within 2 min window)
      if (currentMinutes >= session.endMins && currentMinutes <= session.endMins + 2) {
        const sessionKey = `${session._id || session.startTime}-class-ended`;

        if (!notifiedSessions[sessionKey]) {
          setNotifiedSessions((prev) => ({ ...prev, [sessionKey]: true }));
          playNotificationSound();

          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([150, 100, 150, 100, 250]);
          }

          const rolePrefix = role === 'teacher' ? 'উস্তাদ' : 'অ্যাডমিন';
          const studentName = session.student?.fullName ? `${session.student.fullName}-এর সাথে ` : '';
          const courseTitle = session.course?.title || 'ক্লাস';

          sendSystemNotification('🏁 ক্লাসের সময় সমাপ্ত হয়েছে', {
            body: `${rolePrefix}, ${studentName}${courseTitle}-এর নির্ধারিত সময় শেষ হয়েছে। অ্যাটেন্ডেন্স ও প্রগ্রেস সাবমিট করুন।`,
            icon: '/fajr-logo.png',
            tag: `class-ended-${session._id || session.startTime}`,
            data: { url: classPageHref },
          });
        }
      }
    });
  }, [
    processedSchedules,
    currentMinutes,
    notificationPermission,
    notifiedSessions,
    playNotificationSound,
    role,
    sendSystemNotification,
    classPageHref,
  ]);

  // If no classes at all for today
  if (!activeSession && !upcomingSession) {
    return null;
  }

  // Countdown calculations
  let countdownText = '';
  let isLive = false;

  if (activeSession) {
    isLive = true;
    const remainingMins = Math.max(0, activeSession.endMins - currentMinutes - 1);
    const remainingSecs = 59 - currentSeconds;
    countdownText = `${remainingMins}m ${remainingSecs < 10 ? '0' : ''}${remainingSecs}s left`;
  } else if (upcomingSession) {
    const diffTotalSeconds = Math.max(0, (upcomingSession.startMins - currentMinutes) * 60 - currentSeconds);
    const diffHours = Math.floor(diffTotalSeconds / 3600);
    const diffMins = Math.floor((diffTotalSeconds % 3600) / 60);
    const diffSecs = diffTotalSeconds % 60;

    if (diffHours > 0) {
      countdownText = `${diffHours}h ${diffMins}m ${diffSecs < 10 ? '0' : ''}${diffSecs}s`;
    } else {
      countdownText = `${diffMins}m ${diffSecs < 10 ? '0' : ''}${diffSecs}s`;
    }
  }

  const currentDisplaySession = activeSession || upcomingSession;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-lg transition-all duration-300 ${isLive
          ? 'bg-gradient-to-r from-[#1e0810] via-[#2d0f1a] to-[#12060b] border-rose-500/40 text-white shadow-rose-950/40'
          : 'bg-gradient-to-r from-[#071326] via-[#0b1c38] to-[#08152b] border-[#DFB76C]/30 text-white shadow-indigo-950/40'
        }`}
    >
      {/* Background Ambient Glow */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isLive ? 'bg-rose-500/15' : 'bg-[#DFB76C]/15'
          }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Status & Course Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${isLive
                ? 'bg-gradient-to-br from-rose-600 to-red-700 text-white ring-2 ring-rose-400/50 animate-pulse'
                : 'bg-gradient-to-br from-[#0B1A45] to-[#1a3875] border border-[#DFB76C]/40 text-[#DFB76C]'
              }`}
          >
            <Video className={`w-6 h-6 ${isLive ? 'animate-bounce' : ''}`} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${isLive
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-[#DFB76C]/15 text-[#DFB76C] border border-[#DFB76C]/30'
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isLive ? 'bg-white animate-ping' : 'bg-emerald-400 animate-pulse'
                    }`}
                />
                {isLive ? '🔴 LIVE NOW' : 'NEXT UPCOMING CLASS'}
              </span>

              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleTestOrEnableAlert}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer active:scale-95"
                  title="Enable browser chime & push alert"
                >
                  <Bell className="w-3 h-3 text-amber-400" /> অ্যালার্ট চালু করুন
                </button>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-white mt-1 truncate">
              {currentDisplaySession?.course?.title || 'Scheduled Class Session'}
            </h3>

            <div className="text-xs text-indigo-200/80 flex items-center gap-2 flex-wrap mt-0.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#DFB76C]" /> {currentDisplaySession?.startTime}
                {currentDisplaySession?.endTime ? ` – ${currentDisplaySession.endTime}` : ''}
              </span>
              {currentDisplaySession?.student?.fullName && (
                <>
                  <span className="text-slate-500">•</span>
                  <span>
                    Student: <strong className="text-white">{currentDisplaySession.student.fullName}</strong>
                  </span>
                </>
              )}
              {role === 'admin' && currentDisplaySession?.teacher?.fullName && (
                <>
                  <span className="text-slate-500">•</span>
                  <span>
                    Teacher: <strong className="text-[#DFB76C]">{currentDisplaySession.teacher.fullName}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Ticking Counter & Action Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/10 shrink-0">
          {/* Ticking Clock */}
          <div className="text-left md:text-right pr-2">
            <span className="text-[10px] uppercase font-extrabold text-indigo-300 tracking-wider block">
              {isLive ? 'Session Ending In' : 'Starts In'}
            </span>
            <span
              className={`font-mono text-xl sm:text-2xl font-black tracking-tight ${isLive ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                }`}
            >
              {countdownText}
            </span>
          </div>

          {/* Action Button */}
          {currentDisplaySession?.meetLink ? (
            <a
              href={currentDisplaySession.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 ${isLive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-400/40'
                  : 'bg-gradient-to-r from-[#DFB76C] to-[#C99A45] hover:from-[#e7c47d] hover:to-[#dfab52] text-[#071326] shadow-amber-900/20'
                }`}
            >
              {isLive ? 'Join Live Now' : 'Open Meet'}
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <Link
              href={classPageHref}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 ${isLive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-white hover:bg-indigo-50 text-indigo-950 shadow-white/10'
                }`}
            >
              {isLive ? 'Enter Classroom' : 'Go to Class'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
