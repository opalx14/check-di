"use client";

import { useI18n } from "@/lib/i18n";
import { Building2, Factory, ScanLine, ShoppingBasket, Truck } from "lucide-react";

export function DualTrackSection() {
  const { dict } = useI18n();

  const groupIcons = [Factory, Building2, Truck, ShoppingBasket];

  return (
    <section id="participants" className="hidden border-t border-white/5 bg-[#080b14]/70 py-20 sm:block sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-purple-300 backdrop-blur-sm">
            <ScanLine className="size-3.5" />
            {dict.dualTrack.badge}
          </div>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
            {dict.dualTrack.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300/90 sm:text-base">
            {dict.dualTrack.description}
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dict.dualTrack.groups.map((group, index) => {
            const Icon = groupIcons[index] || Factory;
            return (
              <div key={index} className="glass-card-hover rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-md">
                <div className="flex size-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
                  <Icon className="size-4.5" />
                </div>
                <h3 className="font-display mt-5 text-base font-bold tracking-tight text-white">{group.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{group.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5 text-center font-display text-sm font-medium tracking-tight text-cyan-200">
          {dict.dualTrack.competitionBanner}
        </div>
      </div>
    </section>
  );
}
