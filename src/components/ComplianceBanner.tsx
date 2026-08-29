"use client";

import { useI18n } from "@/lib/i18n";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export function ComplianceBanner() {
  const { dict } = useI18n();

  return (
    <section id="safety" className="hidden border-t border-white/5 bg-[#060810] py-16 sm:block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-[#080d1a] p-6 sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                <ShieldCheck className="size-3.5" />
                {dict.compliance.badge}
              </div>
              <h3 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-white">{dict.compliance.title}</h3>
              <p className="mt-3 text-xs leading-relaxed text-slate-300/80">{dict.compliance.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {dict.compliance.rules.map((rule, index) => (
                <div key={index} className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-slate-950/60 p-3 text-xs text-slate-200">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <span className="leading-snug">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
