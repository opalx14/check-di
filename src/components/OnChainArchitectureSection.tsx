"use client";

import { useI18n } from "@/lib/i18n";
import { Database, FileLock2, Hash, Link2, ShieldCheck } from "lucide-react";

const HASH_SAMPLES = ["a81c...92fa", "bf21...4ac8", "c902...e113", "d710...33bd", "e445...81cc"];

export function OnChainArchitectureSection() {
  const { dict } = useI18n();

  return (
    <section id="technology" className="hidden border-t border-white/5 py-20 sm:block sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
            <Hash className="size-3.5" />
            {dict.architecture.badge}
          </div>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
            {dict.architecture.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300/90 sm:text-base">
            {dict.architecture.description}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-[#0a0f1b] p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-cyan-300">
              <Link2 className="size-4" />
              <p className="font-mono text-xs font-bold uppercase tracking-wider">{dict.architecture.hashChainTitle}</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              {dict.architecture.chainStages.map((label, index) => (
                <div key={index} className="relative rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
                  <p className="font-display text-xs font-semibold tracking-tight text-white">{label}</p>
                  <p className="mt-2 font-mono text-[11px] font-semibold text-cyan-300">{HASH_SAMPLES[index]}</p>
                  {index < dict.architecture.chainStages.length - 1 && (
                    <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 font-mono text-slate-600 sm:block">→</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200/90">
              {dict.architecture.demoDisclaimer}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="glass-card-hover rounded-2xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-300">
                <Database className="size-4" />
                <h3 className="font-display text-sm font-bold tracking-tight text-white">{dict.architecture.offChainTitle}</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">{dict.architecture.offChainText}</p>
            </div>
            <div className="glass-card-hover rounded-2xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-cyan-300">
                <ShieldCheck className="size-4" />
                <h3 className="font-display text-sm font-bold tracking-tight text-white">{dict.architecture.onChainTitle}</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">{dict.architecture.onChainText}</p>
            </div>
            <div className="glass-card-hover rounded-2xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-md sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-purple-300">
                <FileLock2 className="size-4" />
                <h3 className="font-display text-sm font-bold tracking-tight text-white">{dict.architecture.immutabilityTitle}</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">{dict.architecture.immutabilityText}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
