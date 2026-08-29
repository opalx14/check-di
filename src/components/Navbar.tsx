"use client";

import React, { useState } from "react";
import { ShieldCheck, Sparkles, Terminal, Activity, ArrowRight, ExternalLink, Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#07090e]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="flex size-full items-center justify-center rounded-[11px] bg-[#090d16]">
              <span className="font-mono text-sm font-black tracking-tight text-white">CĐ</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">Check-Di</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Devnet v0.1
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">Evidence-backed skill verification</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-7 md:flex">
          <a
            href="#sandbox"
            className="text-xs font-medium text-slate-300 transition-colors hover:text-cyan-400"
          >
            Live Sandbox
          </a>
          <a
            href="#flow"
            className="text-xs font-medium text-slate-300 transition-colors hover:text-cyan-400"
          >
            Quy trình Core
          </a>
          <a
            href="#two-tracks"
            className="text-xs font-medium text-slate-300 transition-colors hover:text-cyan-400"
          >
            2 Tracks · 1 Core
          </a>
          <a
            href="#onchain"
            className="text-xs font-medium text-slate-300 transition-colors hover:text-cyan-400"
          >
            Solana Registry
          </a>
          <a
            href="#compliance"
            className="text-xs font-medium text-slate-300 transition-colors hover:text-cyan-400"
          >
            Bảo mật & Privacy
          </a>
        </nav>

        {/* Action button & Network Pill */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <Activity className="size-3 animate-pulse text-emerald-400" />
            <span>Solana Devnet: OK</span>
          </div>

          <a
            href="#sandbox"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02] hover:shadow-cyan-500/30 active:scale-[0.98]"
          >
            <Sparkles className="size-3.5" />
            <span>Test Sandbox</span>
            <ArrowRight className="size-3" />
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-800 bg-[#0b0f19] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <a
              href="#sandbox"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 hover:text-cyan-400"
            >
              Live Sandbox
            </a>
            <a
              href="#flow"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 hover:text-cyan-400"
            >
              Quy trình Core
            </a>
            <a
              href="#two-tracks"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 hover:text-cyan-400"
            >
              2 Tracks · 1 Core
            </a>
            <a
              href="#onchain"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 hover:text-cyan-400"
            >
              Solana Registry
            </a>
            <a
              href="#compliance"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 hover:text-cyan-400"
            >
              Bảo mật & Privacy
            </a>
            <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-2">
              <a
                href="#sandbox"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 py-2.5 text-xs font-semibold text-slate-950"
              >
                <Sparkles className="size-3.5" />
                <span>Thử nghiệm Sandbox ngay</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
