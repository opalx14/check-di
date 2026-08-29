"use client";

import React from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  UserCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  Code2,
  FileCheck,
} from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-cyan-500/15 via-purple-600/15 to-emerald-500/10 blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          {/* Left Column: Headline & Value Prop */}
          <div className="flex flex-col items-start text-left">
            {/* Competition Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 shadow-inner backdrop-blur-md">
              <span className="flex size-2 rounded-full bg-cyan-400 animate-ping" />
              <span>UniHackFest 2026</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">Technical & Product/Business Tracks</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Đừng chỉ nói bạn có kỹ năng.{" "}
              <span className="block mt-1 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                Check đi.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Check-Di biến project artifacts (GitHub PR, commit, code, PRD) thành{" "}
              <strong className="font-semibold text-white">skill claims có bằng chứng thực</strong>
              . AI Evidence Engine bóc tách dẫn chứng, chuyên gia con người thẩm định và lưu trữ
              chứng chỉ bất biến trên <strong className="font-semibold text-cyan-300">Solana Devnet</strong>.
            </p>

            {/* Feature Pills */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur">
                <Cpu className="size-3.5 text-cyan-400" />
                <span>AI Evidence Extraction</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur">
                <UserCheck className="size-3.5 text-purple-400" />
                <span>Human-in-the-Loop Review</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                <span>Solana PDA Attestation</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur">
                <Lock className="size-3.5 text-amber-400" />
                <span>Zero PII On-chain</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#sandbox"
                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 p-[1px] font-semibold text-white shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02] hover:shadow-cyan-500/35 active:scale-[0.98]"
              >
                <span className="flex items-center gap-2 rounded-[11px] bg-[#090d16] px-5 py-3 text-sm font-semibold transition-colors group-hover:bg-transparent group-hover:text-slate-950">
                  <Sparkles className="size-4 text-cyan-400 group-hover:text-slate-950" />
                  <span>Trải nghiệm Live Sandbox</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>

              <a
                href="#two-tracks"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 backdrop-blur transition-all hover:bg-white/10 hover:text-white"
              >
                <span>Xem mô hình 2 Tracks</span>
              </a>
            </div>

            {/* Key Trust Stats */}
            <div className="mt-12 grid w-full grid-cols-2 gap-4 border-t border-white/10 pt-8 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-black text-white">100%</p>
                <p className="text-xs text-slate-400">Evidence Citation</p>
              </div>
              <div>
                <p className="text-2xl font-black text-cyan-400">0 bytes</p>
                <p className="text-xs text-slate-400">PII On-chain</p>
              </div>
              <div>
                <p className="text-2xl font-black text-purple-400">&lt; 1s</p>
                <p className="text-xs text-slate-400">Public Verification</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-400">Devnet</p>
                <p className="text-xs text-slate-400">Anchor Verified</p>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Interactive Verified Attestation Preview Card */}
          <div className="relative">
            {/* Glow backing */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20 blur-xl" />

            <div className="relative rounded-2xl border border-white/10 bg-[#0c121e]/90 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-7">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Live Attestation Proof
                    </h3>
                    <p className="text-sm font-bold text-white">Solana Smart Contract Core</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="size-3" />
                  Verified On-chain
                </span>
              </div>

              {/* Subject & Skill Summary */}
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Subject (Pseudonymous ID)</span>
                    <span className="font-mono text-cyan-300">0x8f2d...91bc</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Verified Skill</span>
                    <span className="text-xs font-semibold text-white">
                      Anchor Program Architecture · Rust
                    </span>
                  </div>
                </div>

                {/* Evidence Attribution Snippet */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-cyan-300">
                      <Code2 className="size-3.5" />
                      AI Evidence Engine: 96% Match
                    </span>
                    <span className="text-[10px] text-cyan-400/80 font-mono">Rubric R-04</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed font-mono bg-black/40 p-2 rounded-lg border border-white/5">
                    &quot;programs/check_di_registry/src/lib.rs:L42-L89 PDA seeds [&apos;attestation&apos;,
                    issuer, subject]&quot;
                  </p>
                </div>

                {/* Human Reviewer Signoff */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                      <UserCheck className="size-3.5" />
                      Issuer Sign-off
                    </span>
                    <span className="font-mono text-[11px] text-purple-200">UniHackFest Jury #03</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Approved: Full test coverage passed, no security anti-patterns found.
                  </p>
                </div>

                {/* Solana Attestation Metadata Details */}
                <div className="rounded-xl border border-white/5 bg-slate-900/80 p-3.5 space-y-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>evidence_root:</span>
                    <span className="text-slate-200 truncate max-w-[180px]">
                      e3b0c44298fc1c149afbf4c8996fb924...
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>solana_pda:</span>
                    <span className="text-emerald-400 truncate max-w-[180px]">
                      4uQW...8b29 (Devnet)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>status:</span>
                    <span className="text-emerald-300 font-bold">ACTIVE (v1.0)</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Micro-CTA */}
              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Xác minh độc lập công khai</span>
                <a
                  href="#sandbox"
                  className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  <span>Chạy mô phỏng</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
