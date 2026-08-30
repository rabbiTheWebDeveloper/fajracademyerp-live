"use client";

import React from "react";
import { Eye, ShieldAlert, Lock } from "lucide-react";
import { usePermissions } from "@/context/PermissionContext";
import { CrudAction } from "@/lib/permissions";

interface PermissionGuardProps {
  module: string;
  action?: CrudAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally render children if the user has the required action permission.
 */
export function PermissionGuard({
  module,
  action = "read",
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { can } = usePermissions();

  if (!can(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * A notification banner rendered on a page when the current user has only Read-Only access.
 */
export function ReadOnlyNotice({
  module,
  featureName,
  className = "",
}: {
  module: string;
  featureName?: string;
  className?: string;
}) {
  const { isReadOnly } = usePermissions();

  if (!isReadOnly(module)) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-xl text-xs font-medium shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>
          <strong className="font-semibold">Read-Only Mode:</strong> You have viewing access only for{" "}
          {featureName || "this module"}. Creating, modifying, or deleting records is restricted.
        </span>
      </div>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
        View Only
      </span>
    </div>
  );
}

/**
 * Access Denied screen when a user has no access at all to a page.
 */
export function AccessDeniedView({
  featureName,
}: {
  featureName?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm text-center my-8">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Access Restricted</h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mt-1 mb-6">
        You do not have permission to view {featureName || "this feature"}. Contact an administrator to adjust your role access rights.
      </p>
    </div>
  );
}

/**
 * A button that either hides or disables itself if the user lacks the required CRUD permission.
 */
export function PermissionButton({
  module,
  action = "create",
  mode = "hide",
  disabledTooltip = "Action not permitted for your role",
  children,
  className = "",
  disabled = false,
  ...rest
}: {
  module: string;
  action?: CrudAction;
  mode?: "hide" | "disable";
  disabledTooltip?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { can } = usePermissions();
  const allowed = can(module, action);

  if (!allowed) {
    if (mode === "hide") return null;
    return (
      <button
        {...rest}
        disabled={true}
        title={disabledTooltip}
        className={`${className} opacity-40 cursor-not-allowed pointer-events-none`}
      >
        {children}
      </button>
    );
  }

  return (
    <button {...rest} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

