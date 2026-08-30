import React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { ClassSession } from "./types";

interface DeleteModalProps {
  cls: ClassSession | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteModal({
  cls,
  deleting,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  if (!cls) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col scale-in duration-200">
        <div className="p-6 text-center overflow-y-auto flex-1">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1 text-lg">Delete Class?</h3>
          <p className="text-sm text-gray-600 mb-0.5 font-medium">
            {cls.student?.fullName} · {cls.course?.title}
          </p>
          <p className="text-xs text-gray-400 capitalize">
            {cls.dayOfWeek} · {cls.startTime} – {cls.endTime}
          </p>
        </div>
        <div className="flex border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="w-px bg-gray-100" />
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
