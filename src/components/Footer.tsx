import React from "react";
import { ShieldCheck, Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#05070d] py-12 text-slate-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand info */}
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 font-mono font-bold text-xs border border-cyan-500/20">
              CĐ
            </div>
            <div>
              <p className="font-bold text-white">Check-Di</p>
              <p className="text-[11px] text-slate-500">
                Evidence-backed Skill Verification · UniHackFest 2026
              </p>
            </div>
          </div>

          {/* Quick status & details */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Solana Devnet Active
            </span>
            <span className="text-slate-600">·</span>
            <span>Next.js 16 App Router</span>
            <span className="text-slate-600">·</span>
            <span>Two Tracks · One Core</span>
          </div>

          {/* Copyright */}
          <div className="text-slate-500 text-[11px]">
            Built with ❤️ for UniHackFest 2026
          </div>
        </div>
      </div>
    </footer>
  );
}
