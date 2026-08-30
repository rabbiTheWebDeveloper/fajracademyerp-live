"use client";

import React, { createContext, useContext, useMemo } from "react";
import { CrudAction, hasModuleAction, getModulePermissionSummary } from "@/lib/permissions";

export interface UserPermissionContextType {
  user: any | null;
  can: (moduleId: string, action?: CrudAction) => boolean;
  canAny: (moduleId: string, actions: CrudAction[]) => boolean;
  isReadOnly: (moduleId: string) => boolean;
  isSuperAdmin: boolean;
}

const PermissionContext = createContext<UserPermissionContextType>({
  user: null,
  can: () => true,
  canAny: () => true,
  isReadOnly: () => false,
  isSuperAdmin: true,
});

export function PermissionProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any | null;
}) {
  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    return (
      user.role === "super-admin" ||
      user.permissions?.includes("*") ||
      (user.role === "admin" && (!user.permissions || user.permissions.length === 0 || user.permissions.includes("*")))
    );
  }, [user]);

  const value = useMemo<UserPermissionContextType>(() => {
    const permissions: string[] = user?.permissions || [];

    const can = (moduleId: string, action: CrudAction = "read"): boolean => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      return hasModuleAction(permissions, moduleId, action);
    };

    const canAny = (moduleId: string, actions: CrudAction[]): boolean => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      return actions.some((act) => hasModuleAction(permissions, moduleId, act));
    };

    const isReadOnly = (moduleId: string): boolean => {
      if (!user) return false;
      if (isSuperAdmin) return false;
      const summary = getModulePermissionSummary(permissions, moduleId);
      return summary.isReadOnly;
    };

    return {
      user,
      can,
      canAny,
      isReadOnly,
      isSuperAdmin,
    };
  }, [user, isSuperAdmin]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
