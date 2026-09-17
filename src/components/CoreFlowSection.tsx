"use client";

import { CheckCircle2, MapPin, PackageCheck, Route, Sprout, Truck, Warehouse } from "lucide-react";

import { useI18n } from "@/lib/i18n";

const PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1506212928588-93568581fb14?auto=format&fit=crop&w=1400&q=82";

export function CoreFlowSection() {
  const { dict, locale } = useI18n();

  const stages = [
    { icon: Sprout, label: dict.hero.journeyStages.farm.label },
    { icon: Warehouse, label: dict.hero.journeyStages.packing.label },
    { icon: PackageCheck, label: dict.hero.journeyStages.inspection.label },
    { icon: Truck, label: dict.hero.journeyStages.logistics.label },
    { icon: MapPin, label: dict.hero.journeyStages.retail.label },
  ];

  return (
    <section id="journey" className="border-t border-white/5 bg-[#080c17]/45 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              <Route className="size-3.5" />
              [01 // {dict.coreFlow.badge}]
            </div>
            <h2 className="font-display mt-2 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">
              {locale === "vi" ? "Một lô. Năm chặng. Một QR." : "One batch. Five stages. One QR."}
            </h2>
          </div>
          <p className="max-w-sm text-sm text-slate-400">
            {locale === "vi" ? "Mỗi bên xác nhận đúng phần mình phụ trách." : "Each party confirms only the stage they own."}
          </p>
        </div>

        <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-xl shadow-black/20">
          <div className="grid lg:grid-cols-[0.34fr_0.66fr]">
            <div className="relative min-h-[250px] overflow-hidden lg:min-h-[320px]">
              <img src={PRODUCT_IMAGE} alt={dict.hero.productName} className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07101a] via-transparent to-black/10" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-emerald-300">DUR-260830-01</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{dict.hero.productName.split(" · ")[0]}</p>
                <p className="mt-1 text-xs text-slate-300">Đắk Lắk → TP.HCM</p>
              </div>
            </div>

            <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-8">
              <div className="grid gap-3 sm:grid-cols-5">
                {stages.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <div key={stage.label} className="relative rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-center">
                      <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-300">
                        <Icon className="size-4" />
                      </div>
                      <p className="mt-3 text-xs font-bold text-white">{stage.label}</p>
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-300">
                        <CheckCircle2 className="size-2.5" />
                        {locale === "vi" ? "Đã xác nhận" : "Verified"}
                      </div>
                      {index < stages.length - 1 && (
                        <span className="absolute -right-2 top-1/2 hidden h-px w-4 bg-cyan-400/25 sm:block" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.05] px-4 py-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-300">AI check</p>
                  <p className="mt-1 text-xs text-slate-300">{locale === "vi" ? "Đối chiếu chứng từ trước khi ký." : "Cross-check documents before signing."}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-emerald-300">Integrity</p>
                  <p className="mt-1 text-xs text-slate-300">{locale === "vi" ? "Hash + chữ ký giữ dấu vết thay đổi." : "Hash + signature preserve the audit trail."}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
