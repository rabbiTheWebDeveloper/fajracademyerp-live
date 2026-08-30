"use client";

import React, { useState } from "react";
import Link from "next/link";

export type FajrLogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "responsive" | "custom";
export type FajrLogoVariant = "adaptive" | "navy" | "white" | "gold";
export type FajrLogoLayout = "horizontal" | "stacked" | "icon-only" | "image";

export interface FajrLogoProps {
  /** Size preset or responsive scale */
  size?: FajrLogoSize;
  /** Color theme variant */
  variant?: FajrLogoVariant;
  /** Layout: image = real PNG logo (default), horizontal = SVG lockup, stacked = stacked SVG, icon-only = emblem only */
  layout?: FajrLogoLayout;
  /** Optional link destination (null = no link) */
  href?: string | null;
  /** Extra CSS classes for the outer container */
  className?: string;
  /** Extra CSS classes applied directly to the <img> element */
  imgClassName?: string;
  /** Accessible label */
  alt?: string;
  /** Priority loading for above-the-fold logos */
  priority?: boolean;
}

// ─── Logo-specific deep navy from the original brand asset ─────────────────
const BRAND_NAVY = "#0B1A45";
const BRAND_NAVY_LIGHT = "#162C65";

// ─── Responsive image heights per size ──────────────────────────────────────
const IMG_HEIGHT: Record<FajrLogoSize, string> = {
  xs:         "h-6 sm:h-7",
  sm:         "h-7 sm:h-8 md:h-9",
  md:         "h-9 sm:h-10 md:h-11",
  lg:         "h-11 sm:h-12 md:h-14",
  xl:         "h-14 sm:h-16 md:h-20",
  responsive: "h-7 sm:h-9 md:h-10 lg:h-11",
  custom:     "h-auto",
};

// ─── Min widths to stop proportional shrink below readable size ──────────────
const IMG_MINW: Record<FajrLogoSize, string> = {
  xs:         "min-w-[100px]",
  sm:         "min-w-[120px]",
  md:         "min-w-[140px]",
  lg:         "min-w-[170px]",
  xl:         "min-w-[220px]",
  responsive: "min-w-[120px] sm:min-w-[150px]",
  custom:     "",
};

// ─── CSS filter treatments per variant ──────────────────────────────────────
// The source PNG is deep navy on white — we manipulate it to:
//   adaptive  → navy in light mode, white-inverted in dark mode
//   navy      → always deep navy (default, no filter)
//   white     → pure white silhouette  (dark sidebars, navy cards)
//   gold      → warm golden shimmer
const IMG_FILTER: Record<FajrLogoVariant, string> = {
  // Light: show as-is (deep navy). Dark: invert to crisp white + subtle gold glow
  adaptive:
    "mix-blend-multiply dark:mix-blend-normal dark:brightness-0 dark:invert dark:drop-shadow-[0_0_8px_rgba(223,183,108,0.3)]",
  // Always shows the original deep navy — clean on white backgrounds
  navy: "mix-blend-multiply",
  // Pure white silhouette for dark/navy/sidebar backgrounds
  white: "brightness-0 invert drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]",
  // Warm golden tint for premium / certificate contexts
  gold: "brightness-0 invert sepia-[0.9] hue-rotate-[5deg] saturate-[300%] drop-shadow-[0_0_10px_rgba(223,183,108,0.45)]",
};

// ─── Fallback SVG text sizes (used when image fails or layout=horizontal) ───
const SVG_SIZES: Record<FajrLogoSize, { title: string; sub: string; icon: string; gap: string }> = {
  xs:         { title: "text-sm font-extrabold tracking-widest",              sub: "text-[8px]  tracking-[0.25em] font-bold", icon: "w-5 h-5",                gap: "gap-1.5" },
  sm:         { title: "text-base sm:text-lg font-extrabold tracking-widest", sub: "text-[9px]  sm:text-[10px] tracking-[0.25em] font-bold", icon: "w-6 h-6 sm:w-7 sm:h-7", gap: "gap-2" },
  md:         { title: "text-xl sm:text-2xl font-extrabold tracking-widest",  sub: "text-[10px] sm:text-xs tracking-[0.28em] font-bold", icon: "w-8 h-8 sm:w-9 sm:h-9", gap: "gap-2.5" },
  lg:         { title: "text-2xl sm:text-3xl font-black tracking-widest",     sub: "text-xs sm:text-sm tracking-[0.3em] font-bold",  icon: "w-10 h-10 sm:w-12 sm:h-12", gap: "gap-3" },
  xl:         { title: "text-3xl sm:text-4xl font-black tracking-widest",     sub: "text-sm sm:text-base tracking-[0.35em] font-bold", icon: "w-12 h-12 sm:w-16 sm:h-16", gap: "gap-3.5" },
  responsive: { title: "text-base sm:text-xl md:text-2xl font-extrabold tracking-widest", sub: "text-[9px] sm:text-[11px] md:text-xs tracking-[0.28em] font-bold", icon: "w-7 h-7 sm:w-9 sm:h-9", gap: "gap-2 sm:gap-2.5" },
  custom:     { title: "font-extrabold tracking-widest",                      sub: "tracking-[0.25em] font-bold", icon: "w-8 h-8", gap: "gap-2" },
};

// ─── Inline brand navy crest SVG (used when PNG fails to load) ──────────────
function FajrBrandMark({
  className = "w-8 h-8",
  variant = "adaptive",
}: {
  className?: string;
  variant?: FajrLogoVariant;
}) {
  const isWhite = variant === "white";
  const isGold  = variant === "gold";

  const bodyFill  = isGold  ? "url(#fg)" : isWhite ? "#ffffff" : BRAND_NAVY;
  const leafFill  = isGold  ? "url(#fg)" : "#DFB76C";
  const dotFill   = isGold  ? "url(#fg)" : "#DFB76C";

  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className} ${variant === "adaptive" ? "text-[#0D1B3E] dark:text-white" : ""}`}
      aria-hidden="true"
    >
      <defs>
        {/* Gold shimmer gradient */}
        <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#F6E05E" />
          <stop offset="45%"  stopColor="#DFB76C" />
          <stop offset="100%" stopColor="#976E1A" />
        </linearGradient>
        {/* Brand navy gradient */}
        <linearGradient id="fn" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={BRAND_NAVY_LIGHT} />
          <stop offset="100%" stopColor={BRAND_NAVY} />
        </linearGradient>
      </defs>

      {/* ── Open Quran book ── */}
      <path
        d="M100 85 C70 85 40 90 30 100 L30 130 C40 125 70 120 100 120 C130 120 160 125 170 130 L170 100 C160 90 130 85 100 85Z"
        fill={isGold ? "url(#fg)" : isWhite ? "#ffffff" : "url(#fn)"}
      />
      {/* Book spine */}
      <rect x="97" y="82" width="6" height="40" rx="2"
        fill={isGold ? "url(#fg)" : "#DFB76C"}
      />

      {/* ── Radiating knowledge leaves (top of book) ── */}
      {/* Centre leaf */}
      <path d="M100 30 C97 46 97 60 100 80 C103 60 103 46 100 30Z" fill={leafFill} />
      {/* Inner-left leaf */}
      <path d="M86 36 C80 50 84 64 94 76 C90 62 86 50 86 36Z" fill={leafFill} />
      {/* Inner-right leaf */}
      <path d="M114 36 C120 50 116 64 106 76 C110 62 114 50 114 36Z" fill={leafFill} />
      {/* Outer-left leaf */}
      <path d="M72 44 C62 58 68 72 82 80 C72 68 66 56 72 44Z" fill={leafFill} opacity="0.85"/>
      {/* Outer-right leaf */}
      <path d="M128 44 C138 58 132 72 118 80 C128 68 134 56 128 44Z" fill={leafFill} opacity="0.85"/>

      {/* ── Stylised "فجر" calligraphic sweep ── */}
      <path
        d="M50 150
           C55 170 80 178 100 175
           C120 178 145 170 150 150
           C160 138 158 122 148 118
           C138 114 130 124 120 122
           C112 120 114 108 100 108
           C86 108 88 120 80 122
           C70 124 62 114 52 118
           C42 122 40 138 50 150Z"
        fill={bodyFill}
        className={variant === "adaptive" ? "text-[#0D1B3E] dark:text-white" : ""}
      />

      {/* ── Diamond nukta dot ── */}
      <path d="M100 185 L107 193 L100 201 L93 193Z" fill={dotFill} />

    </svg>
  );
}

// ─── Main Exported Component ─────────────────────────────────────────────────
export function FajrLogo({
  size     = "responsive",
  variant  = "adaptive",
  layout   = "image",          // Default: render the real PNG logo
  href     = "/",
  className    = "",
  imgClassName = "",
  alt      = "FAJR Academy",
  priority = false,
}: FajrLogoProps) {
  const [imgError, setImgError] = useState(false);

  const hPx   = IMG_HEIGHT[size]  || IMG_HEIGHT.responsive;
  const minW  = IMG_MINW[size]    || IMG_MINW.responsive;
  const filter = IMG_FILTER[variant] || IMG_FILTER.adaptive;
  const svg   = SVG_SIZES[size]   || SVG_SIZES.responsive;

  // ── Typography colours ───────────────────────────────────────────────────
  const titleCol =
    variant === "white" ? "text-white"
    : variant === "gold"  ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500"
    : variant === "navy"  ? `text-[${BRAND_NAVY}]`
    : `text-[${BRAND_NAVY}] dark:text-white`;

  const subCol =
    variant === "white" ? "text-amber-300/90"
    : variant === "gold"  ? "text-amber-300"
    : variant === "navy"  ? "text-[#DFB76C]"
    : "text-[#DFB76C] dark:text-amber-400";

  // ── Content selection ────────────────────────────────────────────────────
  let content: React.ReactNode;

  // 1) Real PNG logo — default & best for fidelity
  if ((layout === "image" || layout === "horizontal") && !imgError) {
    content = (
      <img
        src="/fajr-logo.png"
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onError={() => setImgError(true)}
        className={[
          "w-auto object-contain select-none transition-all duration-300",
          hPx,
          minW,
          filter,
          imgClassName,
        ].join(" ")}
      />
    );

  // 2) Stacked — emblem above brand text (login card, splash)
  } else if (layout === "stacked") {
    content = (
      <div className="flex flex-col items-center gap-2 select-none">
        <FajrBrandMark className={svg.icon} variant={variant} />
        <div className="flex flex-col items-center leading-none">
          <span className={`font-serif leading-none ${svg.title} ${titleCol}`}>FAJR</span>
          <span className={`font-sans mt-1 leading-none ${svg.sub} ${subCol} uppercase`}>Academy</span>
        </div>
      </div>
    );

  // 3) Icon only — collapsed sidebar, mobile tab bar
  } else if (layout === "icon-only") {
    content = <FajrBrandMark className={svg.icon} variant={variant} />;

  // 4) Fallback for PNG failure — SVG text lockup
  } else {
    content = (
      <div className={`inline-flex items-center ${svg.gap} select-none`}>
        <FajrBrandMark className={svg.icon} variant={variant} />
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-serif leading-none ${svg.title} ${titleCol}`}>FAJR</span>
            {/* Brand accent dot */}
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-[#DFB76C] to-amber-300 shadow-[0_0_5px_rgba(223,183,108,0.7)]" />
          </div>
          <span className={`font-sans mt-0.5 leading-none uppercase ${svg.sub} ${subCol}`}>Academy</span>
        </div>
      </div>
    );
  }

  // ── Wrapper div ──────────────────────────────────────────────────────────
  const wrapper = (
    <div
      className={`inline-flex items-center shrink-0 select-none ${className}`}
      title={alt}
    >
      {content}
    </div>
  );

  // ── Link wrapper (optional) ──────────────────────────────────────────────
  if (href) {
    return (
      <Link
        href={href}
        aria-label={alt}
        className="inline-flex items-center shrink-0 group rounded-lg
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFB76C]/60
                   transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
      >
        {wrapper}
      </Link>
    );
  }

  return wrapper;
}

export default FajrLogo;