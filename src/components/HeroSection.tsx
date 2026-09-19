"use client";

import { useI18n } from "@/lib/i18n";
import { productVisualForName } from "@/lib/product-visuals";
import { ArrowRight, CheckCircle2, MapPin, PackageCheck, QrCode, Sprout, Truck } from "lucide-react";

export function HeroSection() {
  const { dict } = useI18n();

  const sampleVisual = productVisualForName(dict.hero.productName);

  const journeyStages = [
    { icon: Sprout, label: dict.hero.journeyStages.farm.label },
    { icon: PackageCheck, label: dict.hero.journeyStages.packing.label },
    { icon: CheckCircle2, label: dict.hero.journeyStages.inspection.label },
    { icon: Truck, label: dict.hero.journeyStages.logistics.label },
    { icon: MapPin, label: dict.hero.journeyStages.retail.label },
  ];

  return (
    <section id="top" className="relative overflow-hidden pb-14 pt-10 sm:pb-20 sm:pt-16">
      <div className="pointer-events-none absolute -top-52 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/12 via-purple-500/10 to-emerald-500/12 blur-[130px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] px-3 py-1 font-mono text-[11px] font-semibold text-cyan-300">
              <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)]" />
              {dict.hero.badge}
            </div>

            <h1 className="font-display mt-5 max-w-2xl text-4xl font-extrabold leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl lg:text-[58px]">
              {dict.hero.titleLine1}
              <span className="block bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                {dict.hero.titleLine2}
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300/90 sm:text-lg">
              {dict.hero.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {dict.hero.tags.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/scan"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:brightness-110"
              >
                <QrCode className="size-4" />
                {dict.hero.scanCta}
              </a>
              <a
                href="/supplier"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                {dict.hero.journeyCta}
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[32px] bg-gradient-to-br from-cyan-500/15 via-transparent to-emerald-500/15 blur-2xl" />
            <div className="relative min-h-[520px] overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
              <img
                src={sampleVisual.imageUrl}
                alt={dict.hero.productName}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07101a] via-[#07101a]/30 to-black/10" />

              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-6">
                <div className="rounded-2xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-xl">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                    {dict.hero.sampleBatch}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-white">{dict.hero.productName}</p>
                  <p className="mt-1 text-xs text-slate-300">{dict.hero.routeSummary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 backdrop-blur-xl sm:inline-flex">
                    <CheckCircle2 className="size-3.5" />
                    {dict.hero.sampleDataBadge}
                  </span>
                  <a
                    href="/scan"
                    className="flex size-14 items-center justify-center rounded-xl bg-white text-slate-950 shadow-lg"
                    aria-label="Mở máy quét QR"
                  >
                    <QrCode className="size-7" />
                  </a>
                </div>
              </div>

              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-[#08111d]/88 p-4 backdrop-blur-2xl sm:inset-x-5 sm:bottom-5 sm:p-5">
                <div className="flex items-center justify-between gap-1">
                  {journeyStages.map((stage, index) => {
                    const Icon = stage.icon;
                    return (
                      <div key={stage.label} className="relative flex flex-1 flex-col items-center text-center">
                        <div className="relative z-10 flex size-9 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
                          <Icon className="size-4" />
                        </div>
                        <p className="mt-2 text-[10px] font-semibold text-slate-200 sm:text-[11px]">{stage.label}</p>
                        {index < journeyStages.length - 1 && (
                          <span className="absolute left-[64%] top-[18px] h-px w-[72%] bg-gradient-to-r from-emerald-400/50 to-cyan-400/30" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-4 text-center">
                  <div>
                    <p className="font-display text-sm font-bold text-white">{dict.hero.journeyCountValue}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{dict.hero.journeyCountLabel}</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-white">{dict.hero.originValue}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{dict.hero.originLabel}</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-emerald-300">{dict.hero.qrReadyValue}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{dict.hero.qrReadyLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
