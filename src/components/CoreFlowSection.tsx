"use client";

import { useI18n } from "@/lib/i18n";
import { Bot, Building2, Hash, QrCode, Route } from "lucide-react";

export function CoreFlowSection() {
  const { dict } = useI18n();

  const stepIcons = [Building2, Bot, Hash, QrCode];

  return (
    <section id="journey" className="hidden border-t border-white/5 bg-[#080c17]/60 py-20 sm:block sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-cyan-300 backdrop-blur-sm">
            <Route className="size-3.5" />
            {dict.coreFlow.badge}
          </div>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
            {dict.coreFlow.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300/90 sm:text-base">
            {dict.coreFlow.description}
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dict.coreFlow.steps.map((step, index) => {
            const Icon = stepIcons[index] || Building2;
            return (
              <div key={index} className="glass-card-hover rounded-2xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                    <Icon className="size-4.5" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-cyan-400/80">0{index + 1}</span>
                </div>
                <h3 className="font-display mt-5 text-base font-bold tracking-tight text-white">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{step.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
