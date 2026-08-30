import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Zap,
  X,
} from "lucide-react";
import { Toast } from "./types";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-in slide-in-from-right-4 fade-in duration-300 ${
            t.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : t.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : t.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-indigo-50 border-indigo-200 text-indigo-800"
          }`}
        >
          <span className="flex-shrink-0 mt-0.5">
            {t.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : t.type === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : t.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              <Zap className="w-4 h-4 text-indigo-500" />
            )}
          </span>
          <div className="flex-1">
            <p>{t.message}</p>
            {t.gems !== undefined && (
              <p
                className={`text-xs font-bold mt-0.5 ${
                  t.gems < 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {t.gems > 0 ? `+${t.gems}` : t.gems} 💎 gems
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(t.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
