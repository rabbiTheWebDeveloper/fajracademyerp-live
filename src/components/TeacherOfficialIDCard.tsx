"use client";

import React from "react";
import { UserCircle } from "lucide-react";

export interface TeacherIDCardProfile {
  fullName?: string;
  designation?: string;
  teacherId?: string;
  employeeId?: string;
  adminId?: string;
  staffId?: string;
  department?: string;
  bloodGroup?: string;
  avatar?: string;
  gender?: string;
  role?: string;
  _id?: string;
}

export type OfficialIDCardProfile = TeacherIDCardProfile;

/**
 * Official Teacher & Staff/Admin Digital ID Card — Front Side
 */
export function OfficialIDCard({
  profile,
  idRef,
  cardId = "teacher-official-id-card",
}: {
  profile: TeacherIDCardProfile | any;
  idRef?: React.RefObject<HTMLDivElement | null>;
  cardId?: string;
}) {
  const fullName = (profile?.fullName || "OFFICIAL NAME").toUpperCase();
  const designation = (
    profile?.designation ||
    (profile?.role ? profile.role.replace("-", " ") : "ADMINISTRATOR")
  ).toUpperCase();
  const teacherId =
    profile?.employeeId ||
    profile?.teacherId ||
    profile?.staffId ||
    profile?.adminId ||
    (profile?._id ? `FJRA-${profile._id.toString().slice(-4).toUpperCase()}` : "FJRA-0001");
  const bloodGroup = profile?.bloodGroup || "A+";
  const avatarUrl = profile?.avatar || "/default-female.png";

  return (
    <div
      ref={idRef}
      id={cardId}
      className="relative w-[320px] h-[520px] rounded-3xl shadow-2xl overflow-hidden shrink-0 select-none transition-transform bg-[#121A36]"
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Background Template */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/teacher-id-template.png"
        alt="ID Card Template"
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* Teacher Portrait Photo */}
      <div className="absolute top-0 left-0 right-0 h-[250px] z-10 overflow-hidden flex items-center justify-center bg-slate-100">
        {profile?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={fullName}
            crossOrigin="anonymous"
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
            <UserCircle className="w-28 h-28 text-slate-400" />
          </div>
        )}
      </div>

      {/* Overlaid Details */}
      <div className="absolute top-[258px] left-0 right-0 bottom-0 px-6 text-center z-20 flex flex-col items-center justify-start pointer-events-none">
        <h2 className="text-[21px] sm:text-[23px] font-black text-white tracking-wide leading-tight uppercase font-sans drop-shadow-md px-1 line-clamp-2">
          {fullName}
        </h2>

        <p className="text-xs sm:text-sm font-bold text-white tracking-widest uppercase font-sans mt-3 drop-shadow-sm line-clamp-1">
          {designation}
        </p>

        <p className="text-[14px] sm:text-[15px] font-bold text-white tracking-wider font-sans mt-4 drop-shadow-sm">
          ID: <span className="font-sans">{teacherId}</span>
        </p>

        <p className="text-[14px] sm:text-[15px] font-bold text-white tracking-wider font-sans mt-1 drop-shadow-sm">
          Blood Group: {bloodGroup}
        </p>
      </div>
    </div>
  );
}

/**
 * Official Teacher Digital ID Card — Back Side
 */
export function OfficialIDCardBack({
  idRef,
  cardId = "teacher-official-id-card-back",
}: {
  idRef?: React.RefObject<HTMLDivElement | null>;
  cardId?: string;
}) {
  return (
    <div
      ref={idRef}
      id={cardId}
      className="relative w-[320px] h-[520px] rounded-3xl shadow-2xl overflow-hidden shrink-0 select-none transition-transform bg-[#121A36]"
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/teacher-id-back.png"
        alt="ID Card Back Part"
        crossOrigin="anonymous"
        className="w-full h-full object-cover pointer-events-none"
      />
    </div>
  );
}

/**
 * Universal ID Card Export / Download Helper
 */
export async function downloadIDCardElement(
  elementId: string,
  teacherId: string = "Teacher",
  side: "front" | "back" = "front"
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("ID card element not found");

  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(element, {
      quality: 0.95,
      pixelRatio: 2,
      cacheBust: true,
    });
    const link = document.createElement("a");
    link.download = `ID-Card-${teacherId}-${side.toUpperCase()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.warn("html-to-image failed, trying fallback html2canvas:", err);
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });
    const image = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.download = `ID-Card-${teacherId}-${side.toUpperCase()}.png`;
    link.href = image;
    link.click();
  }
}
