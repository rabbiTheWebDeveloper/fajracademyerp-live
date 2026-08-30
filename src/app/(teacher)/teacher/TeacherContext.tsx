"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { apiFetch } from "./apiFetch";

interface TeacherProfile {
  _id?: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  role?: string;
  [key: string]: unknown;
}

interface TeacherContextValue {
  profile: TeacherProfile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const TeacherContext = createContext<TeacherContextValue>({
  profile: null,
  profileLoading: true,
  refreshProfile: async () => {},
});

export function useTeacher() {
  return useContext(TeacherContext);
}

const PROFILE_TTL = 5 * 60 * 1000; // cache profile for 5 minutes

export function TeacherProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      // TTL = 5 min — subsequent navigations within 5 min use cached version
      const data = await apiFetch("/api/teacher-portal/profile", undefined, PROFILE_TTL);
      if (data?.success) setProfile(data.teacher);
    } catch {
      /* silently fail — layout still renders */
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    // Re-fetch on tab focus (not on interval) — data only refreshes when user comes back
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchProfile();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchProfile]);

  return (
    <TeacherContext.Provider value={{ profile, profileLoading, refreshProfile: fetchProfile }}>
      {children}
    </TeacherContext.Provider>
  );
}
