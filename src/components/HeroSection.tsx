"use client";

import { useI18n } from "@/lib/i18n";
import { ArrowDown, CheckCircle2, Factory, MapPin, PackageCheck, QrCode, Sprout, Truck } from "lucide-react";

export function HeroSection() {
  const { dict } = useI18n();

  const journeyStages = [
    { icon: Sprout, label: dict.hero.journeyStages.farm.label, place: dict.hero.journeyStages.farm.place },
    { icon: Factory, label: dict.hero.journeyStages.packing.label, place: dict.hero.journeyStages.packing.place },
    { icon: PackageCheck, label: dict.hero.journeyStages.inspection.label, place: dict.hero.journeyStages.inspection.place },
    { icon: Truck, label: dict.hero.journeyStages.logistics.label, place: dict.hero.journeyStages.logistics.place },
    { icon: MapPin, label: dict.hero.journeyStages.retail.label, place: dict.hero.journeyStages.retail.place },
  ];

  return (
    <section id="top" className="relative overflow-hidden pb-10 pt-8 sm:pb-24 sm:pt-20">
      <div className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-cyan-500/15 via-purple-600/15 to-emerald-500/10 blur-[130px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-7 sm:gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <div>
            <div className="hidden items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-300 backdrop-blur-md sm:inline-flex">
              <span className="size-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              {dict.hero.badge}
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-[-0.035em] text-white sm:mt-6 sm:text-6xl lg:text-[68px] leading-[1.08] sm:leading-[1.04]">
              <span className="sm:hidden">{dict.hero.mobileTitle}</span>
              <span className="hidden sm:inline">
                {dict.hero.titleLine1}
                <span className="block bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                  {dict.hero.titleLine2}
                </span>
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300/90 sm:mt-6 sm:text-lg">
              <span className="sm:hidden">{dict.hero.mobileDescription}</span>
              <span className="hidden sm:inline">{dict.hero.description}</span>
            </p>

            <div className="mt-7 hidden flex-wrap gap-2.5 sm:flex">
              {dict.hero.tags.map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 font-mono text-[11px] font-medium tracking-tight text-slate-200 transition hover:border-cyan-500/30 hover:text-cyan-200"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-7 hidden flex-wrap gap-4 sm:mt-9 sm:flex">
              <a
                href="#demo"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 font-display text-sm font-bold tracking-tight text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:opacity-95 hover:shadow-cyan-500/30 sm:w-auto"
              >
                <QrCode className="size-4" />
                <span className="sm:hidden">{dict.hero.mobileScanTitle}</span>
                <span className="hidden sm:inline">{dict.hero.scanCta}</span>
              </a>
              <a
                href="#journey"
                className="hidden items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-display text-sm font-medium tracking-tight text-slate-200 transition hover:border-white/30 hover:bg-white/10 sm:inline-flex"
              >
                {dict.hero.journeyCta}
                <ArrowDown className="size-4" />
              </a>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-1 hidden rounded-3xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20 blur-xl lg:block" />
            <div className="relative hidden overflow-hidden rounded-3xl border border-white/10 bg-[#0c121e]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-7 lg:block">
              {/* Top Accent Gradient Line */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400" />

              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                      {dict.hero.sampleBatch}
                    </p>
                    <span className="font-mono text-[10px] text-slate-500">· QL14 354km</span>
                  </div>
                  <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-white">
                    {dict.hero.productName}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">{dict.hero.routeSummary}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  {dict.hero.sampleDataBadge}
                </span>
              </div>

              <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#080d17] p-5">
                <div className="pointer-events-none absolute inset-0 opacity-30 bg-grid-pattern" />
                <div className="relative flex items-center justify-between gap-2">
                  {journeyStages.map((stage, index) => {
                    const Icon = stage.icon;
                    return (
                      <div key={stage.label} className="relative z-10 flex min-w-0 flex-1 flex-col items-center text-center">
                        <div className="relative flex size-10 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                          <Icon className="size-4" />
                          <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full border border-emerald-300 bg-emerald-500 text-slate-950 font-bold text-[8px]">
                            ✓
                          </span>
                        </div>
                        <p className="mt-2 font-display text-[11px] font-semibold tracking-tight text-white">{stage.label}</p>
                        <p className="mt-0.5 max-w-[90px] text-[10px] leading-tight text-slate-400">{stage.place}</p>
                        {index < journeyStages.length - 1 && (
                          <div className="absolute left-[60%] top-5 h-0.5 w-[80%] bg-gradient-to-r from-emerald-500/50 via-cyan-500/50 to-emerald-500/30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <p className="font-mono text-[11px] font-medium tracking-tight text-slate-400">{dict.hero.latestStageLabel}</p>
                  <p className="font-display mt-1 text-sm font-semibold tracking-tight text-white">{dict.hero.latestStageValue}</p>
                  <p className="font-mono mt-1 text-xs text-cyan-300/80">{dict.hero.latestStageTime}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-300">{dict.hero.qrActionLabel}</p>
                  <p className="font-display mt-1 text-sm font-bold tracking-tight text-white">{dict.hero.qrActionValue}</p>
                  <p className="mt-1 text-xs text-slate-400">{dict.hero.qrActionDetail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
