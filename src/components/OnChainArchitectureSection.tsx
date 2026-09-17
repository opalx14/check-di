"use client";

import { useI18n } from "@/lib/i18n";
import { Database, FileClock, Hash, ShieldCheck } from "lucide-react";

const PROOF_STAGES = [
  { labelIndex: 0, hash: "a81c...92fa" },
  { labelIndex: 2, hash: "c902...e113" },
  { labelIndex: 4, hash: "e445...81cc" },
];

export function OnChainArchitectureSection() {
  const { dict } = useI18n();

  const infoCards = [
    { icon: Database, title: dict.architecture.offChainTitle, text: dict.architecture.offChainText, tone: "text-emerald-300" },
    { icon: ShieldCheck, title: dict.architecture.onChainTitle, text: dict.architecture.onChainText, tone: "text-cyan-300" },
    { icon: FileClock, title: dict.architecture.immutabilityTitle, text: dict.architecture.immutabilityText, tone: "text-violet-300" },
  ];

  return (
    <section id="technology" className="border-t border-white/5 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              <Hash className="size-3.5" />
              {dict.architecture.badge}
            </div>
            <h2 className="font-display mt-4 max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
              {dict.architecture.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">{dict.architecture.description}</p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-[#0a0f1b] p-5 sm:p-6">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                {dict.architecture.hashChainTitle}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                {PROOF_STAGES.map((stage, index) => (
                  <div key={stage.hash} className="relative rounded-2xl border border-white/8 bg-white/[0.025] p-3 text-center sm:p-4">
                    <div className="mx-auto flex size-8 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-300">
                      <span className="font-mono text-[10px] font-bold">{index + 1}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white">
                      {dict.architecture.chainStages[stage.labelIndex]}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-cyan-300/80">{stage.hash}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] px-4 py-3 text-xs text-amber-100/80">
                <span>{dict.architecture.demoDisclaimer}</span>
              </div>
            </div>
          </div>

          <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {infoCards.map(({ icon: Icon, title, text, tone }) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] ${tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-white">{title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-400">{text}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.08] to-cyan-500/[0.03] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">{dict.architecture.registryLabel}</p>
                  <p className="mt-2 font-display text-lg font-bold text-white">{dict.architecture.registryNetwork}</p>
                  <p className="mt-1 text-xs text-slate-400">{dict.architecture.registryText}</p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                  <ShieldCheck className="size-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
