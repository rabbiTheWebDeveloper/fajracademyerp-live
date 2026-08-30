"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import {
  Value,
  Country,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  isValidPhoneNumber as defaultIsValidPhoneNumber,
} from "react-phone-number-input";
import RPNInput from "react-phone-number-input/input";
import flags from "react-phone-number-input/flags";
import { ChevronDown, Search, Check } from "lucide-react";
import enLabels from "react-phone-number-input/locale/en.json";
import "react-phone-number-input/style.css";

// ─── Validation helper ───────────────────────────────────────────────
export function isValidPhoneNumber(value?: string): boolean {
  if (!value) return false;
  try {
    return defaultIsValidPhoneNumber(value);
  } catch {
    return false;
  }
}

// ─── Auto-detect Country from phone number ───────────────────────────
export function getCountryFromPhoneNumber(value?: string, fallback: Country = "BD"): Country {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = parsePhoneNumber(trimmed.startsWith("+") ? trimmed : `+${trimmed}`);
    if (parsed && parsed.country) {
      return parsed.country as Country;
    }
  } catch {
    // continue to fallback
  }

  // Fallback: match prefix against all countries sorted by longest calling code
  if (trimmed.startsWith("+")) {
    const countries = getCountries();
    const sorted = [...countries].sort(
      (a, b) => getCountryCallingCode(b).length - getCountryCallingCode(a).length
    );
    for (const c of sorted) {
      const dialCode = `+${getCountryCallingCode(c)}`;
      if (trimmed.startsWith(dialCode)) {
        return c;
      }
    }
  }

  return fallback;
}

// ─── Country Flag Component (Vector SVG flag from react-phone-number-input) ─────────
export function CountryFlag({
  country,
  className = "w-4 h-3",
}: {
  country?: Country | string;
  className?: string;
}) {
  if (!country) return <span className="text-xs">🌐</span>;
  const FlagComponent = flags[country as Country];
  if (!FlagComponent) return <span className="text-xs">🌐</span>;

  return (
    <span className={`inline-flex items-center justify-center flex-shrink-0 overflow-hidden rounded-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-slate-700 bg-white ${className}`}>
      <FlagComponent title={String(country)} />
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────
export interface PhoneInputProps {
  value?: string;
  onChange?: (value?: string) => void;
  defaultCountry?: Country;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  name?: string;
  id?: string;
  onBlur?: () => void;
  /** Use light theme (dark text on white bg) for use inside white modals/cards */
  light?: boolean;
}

// ─── Country Dropdown Portal ──────────────────────────────────────────
interface CountryDropdownPortalProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  selectedCountry: Country;
  onSelect: (country: Country) => void;
}

function CountryDropdownPortal({
  anchorRef,
  isOpen,
  onClose,
  selectedCountry,
  onSelect,
}: CountryDropdownPortalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 260 });

  const allCountries = getCountries();

  const filteredCountries = allCountries.filter((country) => {
    const name = ((enLabels as any)[country] || country).toLowerCase();
    const code = country.toLowerCase();
    const callingCode = getCountryCallingCode(country);
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      name.includes(query) ||
      code.includes(query) ||
      `+${callingCode}`.includes(query) ||
      callingCode.includes(query)
    );
  });

  // Calculate position based on button anchor
  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const dropdownWidth = 264;
    const viewportWidth = window.innerWidth;
    let left = rect.left;
    if (left + dropdownWidth > viewportWidth - 8) {
      left = viewportWidth - dropdownWidth - 8;
    }
    setPosition({
      top: rect.bottom + 6,
      left,
      width: dropdownWidth,
    });
  }, [anchorRef]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen, updatePosition]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      )
        return;
      onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 99999,
      }}
    >
      {/* Scrollbar styles */}
      <style>{`
        .pni-scroll::-webkit-scrollbar { width: 5px; }
        .pni-scroll::-webkit-scrollbar-track { background: transparent; }
        .pni-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
        .pni-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>

      <div
        className="flex flex-col overflow-hidden rounded-xl border border-white/10 shadow-2xl"
        style={{
          background: "rgba(10, 15, 30, 0.97)",
          backdropFilter: "blur(24px)",
          maxHeight: "min(288px, calc(100vh - 80px))",
        }}
      >
        {/* Search */}
        <div className="p-2 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search country or dial code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none text-white placeholder:text-white/30 text-xs leading-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto pni-scroll p-1 space-y-px">
          {filteredCountries.length === 0 ? (
            <div className="py-4 text-center text-xs text-white/40">
              No country found
            </div>
          ) : (
            filteredCountries.map((country) => {
              const Flag = flags[country];
              const callingCode = getCountryCallingCode(country);
              const countryName = (enLabels as any)[country] || country;
              const isSelected = country === selectedCountry;

              return (
                <button
                  key={country}
                  type="button"
                  onClick={() => {
                    onSelect(country);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-[7px] rounded-lg text-[12px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                      : "text-white/75 hover:text-white hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-[18px] h-[13px] flex items-center justify-center overflow-hidden rounded-[2px] flex-shrink-0 bg-slate-800">
                      {Flag ? (
                        <Flag title={country} />
                      ) : (
                        <span className="text-[8px] text-white/60">
                          {country}
                        </span>
                      )}
                    </div>
                    <span className="truncate leading-none">{countryName}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <span className="font-mono text-[11px] text-emerald-400/70">
                      +{callingCode}
                    </span>
                    {isSelected && (
                      <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── PhoneInput Component ────────────────────────────────────────────
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      defaultCountry = "BD",
      placeholder = "Enter phone number",
      disabled = false,
      hasError = false,
      light = false,
      className = "",
      name,
      id,
      onBlur,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [selectedCountryOverride, setSelectedCountryOverride] = useState<Country | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Compute effective country synchronously during render to prevent react-phone-number-input mismatch errors
    const effectiveCountry: Country = useMemo(() => {
      if (selectedCountryOverride) return selectedCountryOverride;
      if (value && typeof value === "string" && value.trim().startsWith("+")) {
        return getCountryFromPhoneNumber(value, defaultCountry);
      }
      return defaultCountry;
    }, [selectedCountryOverride, value, defaultCountry]);

    // Reset override if value is changed externally to a different country dial code
    const prevValueRef = useRef(value);
    useEffect(() => {
      if (value !== prevValueRef.current) {
        prevValueRef.current = value;
        if (value && typeof value === "string" && value.trim().startsWith("+")) {
          const detected = getCountryFromPhoneNumber(value, defaultCountry);
          if (selectedCountryOverride && detected !== selectedCountryOverride) {
            try {
              const currentDial = `+${getCountryCallingCode(selectedCountryOverride)}`;
              if (!value.trim().startsWith(currentDial)) {
                setSelectedCountryOverride(null);
              }
            } catch {
              setSelectedCountryOverride(null);
            }
          }
        }
      }
    }, [value, defaultCountry, selectedCountryOverride]);

    const FlagComponent = flags[effectiveCountry];

    return (
      <div className={`relative w-full ${className}`}>
        <div
          className={`flex items-center rounded-lg border transition-all duration-200 ${
            hasError
              ? light
                ? "bg-red-50 border-red-400 ring-1 ring-red-300"
                : "bg-rose-500/5 border-rose-500/35 ring-1 ring-rose-500/10"
              : light
              ? "bg-white border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
              : "bg-white/[0.05] border-white/[0.08] focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/15 focus-within:bg-white/[0.07]"
          }`}
        >
          {/* ── Country Selector ── */}
          <button
            ref={buttonRef}
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-[11px] rounded-l-[10px] transition-colors cursor-pointer border-r flex-shrink-0 ${
              light
                ? "hover:bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-900"
                : "hover:bg-white/[0.06] border-white/[0.08] text-white/80 hover:text-white"
            }`}
            title="Select country"
          >
            <div className="w-[20px] h-[14px] flex items-center justify-center overflow-hidden rounded-[2px] shadow-sm flex-shrink-0 bg-slate-700">
              {FlagComponent ? (
                <FlagComponent title={effectiveCountry} />
              ) : (
                <span className="text-[9px] font-bold text-white">
                  {effectiveCountry}
                </span>
              )}
            </div>
            <span className={`text-[12px] font-mono font-semibold leading-none ${
              light ? "text-indigo-600" : "text-emerald-400"
            }`}>
              +{getCountryCallingCode(effectiveCountry)}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              } ${
                light ? "text-gray-400" : "text-white/35"
              }`}
            />
          </button>

          {/* ── Phone Number Input ── */}
          <div className="flex-1 min-w-0 flex items-center px-3">
            <RPNInput
              id={inputId}
              name={name}
              ref={ref as any}
              value={(value as Value) || ""}
              onChange={(val) => {
                if (val && typeof val === "string" && val.startsWith("+")) {
                  const detected = getCountryFromPhoneNumber(val, effectiveCountry);
                  if (detected && detected !== effectiveCountry) {
                    try {
                      const currentDial = `+${getCountryCallingCode(effectiveCountry)}`;
                      if (!val.startsWith(currentDial)) {
                        setSelectedCountryOverride(detected);
                      }
                    } catch {
                      setSelectedCountryOverride(detected);
                    }
                  }
                }
                onChange?.(val as string | undefined);
              }}
              country={effectiveCountry}
              disabled={disabled}
              placeholder={placeholder}
              onBlur={onBlur}
              className={`w-full bg-transparent outline-none text-[13px] py-[11px] leading-none border-none ring-0 focus:ring-0 focus:outline-none ${
                light
                  ? "text-gray-900 placeholder:text-gray-400"
                  : "text-white placeholder:text-white/20"
              }`}
            />
          </div>
        </div>

        {/* ── Portal Dropdown ── */}
        <CountryDropdownPortal
          anchorRef={buttonRef}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          selectedCountry={effectiveCountry}
          onSelect={(country) => setSelectedCountryOverride(country)}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
