"use client";

import { useI18n, Locale } from "@/lib/i18n";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type LanguageSwitcherProps = {
  variant?: "dropdown" | "inline";
  className?: string;
};

const LANGUAGES: Array<{ code: Locale; label: string; short: string; flag: string }> = [
  { code: "vi", label: "Tiếng Việt", short: "VI", flag: "🇻🇳" },
  { code: "en", label: "English", short: "EN", flag: "🇬🇧" },
];

export function LanguageSwitcher({ variant = "dropdown", className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (variant === "inline") {
    return (
      <div className={`grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 p-1 ${className}`}>
        {LANGUAGES.map((lang) => {
          const isActive = locale === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLocale(lang.code)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {isActive && <Check className="size-3 text-cyan-400" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
          isOpen
            ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-500/30 hover:bg-white/[0.07] hover:text-white"
        }`}
      >
        <Globe className="size-3.5 text-slate-400 transition-colors group-hover:text-cyan-300" />
        <span className="flex items-center gap-1.5">
          <span>{currentLang.flag}</span>
          <span className="font-mono tracking-wider">{currentLang.short}</span>
        </span>
        <ChevronDown
          className={`size-3 text-slate-400 transition-transform duration-200 group-hover:text-slate-200 ${
            isOpen ? "rotate-180 text-cyan-300" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-44 origin-top-right rounded-2xl border border-white/10 bg-[#0c121e]/95 p-1.5 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5">
            {LANGUAGES.map((lang) => {
              const isActive = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLocale(lang.code);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? "border border-cyan-500/25 bg-cyan-500/10 font-bold text-cyan-300"
                      : "border border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </div>
                  {isActive && <Check className="size-3.5 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
