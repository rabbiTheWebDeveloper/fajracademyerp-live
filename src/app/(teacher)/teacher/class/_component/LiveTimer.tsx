import React, { useState, useEffect } from "react";
import { fmt } from "./types";

export function LiveTimer({
  startedAt,
  duration = 45,
}: {
  startedAt: string;
  duration?: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const TARGET = duration * 60;

  useEffect(() => {
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const remaining = Math.max(TARGET - elapsed, 0);
  const pct = Math.min((elapsed / TARGET) * 100, 100);
  const over = elapsed > TARGET;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="5"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke={over ? "#ef4444" : "#6366f1"}
            strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-[10px] font-black tabular-nums ${
              over ? "text-red-600" : "text-indigo-700"
            }`}
          >
            {over
              ? `+${fmt(Math.floor((elapsed - TARGET) / 60))}:${fmt((elapsed - TARGET) % 60)}`
              : `${fmt(Math.floor(remaining / 60))}:${fmt(remaining % 60)}`}
          </span>
        </div>
      </div>
      <span
        className={`text-[10px] font-semibold ${
          over ? "text-red-500 animate-pulse" : "text-gray-400"
        }`}
      >
        {over ? "Time up!" : "left"}
      </span>
    </div>
  );
}
