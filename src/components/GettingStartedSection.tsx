"use client";

import { useI18n } from "@/lib/i18n";
import {
  ArrowRight,
  Building2,
  Check,
  FileCheck2,
  Loader2,
  PackagePlus,
  QrCode,
  ScanLine,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Membership = {
  organizationId: string;
  organizationName: string;
  walletPublicKey?: string;
  role: string;
};

type MePayload = {
  ok?: boolean;
  memberships?: Membership[];
};

type SetupState = "loading" | "anonymous" | "no_wallet" | "ready";

export function GettingStartedSection() {
  const { dict } = useI18n();
  const [setupState, setSetupState] = useState<SetupState>("loading");
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSetupState() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setSetupState("anonymous");
          return;
        }

        const payload = (await response.json()) as MePayload;
        const memberships = payload.memberships ?? [];
        if (!payload.ok || memberships.length === 0) {
          if (!cancelled) setSetupState("anonymous");
          return;
        }

        const membership = memberships.find((item) => Boolean(item.walletPublicKey)) ?? memberships[0];
        if (cancelled) return;

        setOrganizationName(membership.organizationName);
        setSetupState(membership.walletPublicKey ? "ready" : "no_wallet");
      } catch {
        if (!cancelled) setSetupState("anonymous");
      }
    }

    void loadSetupState();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeStep = setupState === "ready" ? 2 : setupState === "no_wallet" ? 1 : 0;
  const stepIcons = [Building2, Wallet, PackagePlus, FileCheck2];

  const primaryAction = useMemo(() => {
    if (setupState === "no_wallet") {
      return { href: "/organization/wallet", label: dict.gettingStarted.ctaWallet, icon: Wallet };
    }
    if (setupState === "ready") {
      return { href: "/batches/new", label: dict.gettingStarted.ctaCreateBatch, icon: PackagePlus };
    }
    return {
      href: "/login?next=/organization/wallet",
      label: dict.gettingStarted.ctaAnonymous,
      icon: Building2,
    };
  }, [dict.gettingStarted, setupState]);

  return (
    <section id="getting-started" className="border-y border-white/5 bg-[#080c17]/75 py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            <ShieldCheck className="size-3.5" />
            {dict.gettingStarted.badge}
          </div>
          <h2 className="font-display mt-4 text-2xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            {dict.gettingStarted.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            {dict.gettingStarted.description}
          </p>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.65fr_0.75fr] lg:gap-5">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]/90 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div>
                <h3 className="font-display text-lg font-bold text-white">{dict.gettingStarted.organizationTitle}</h3>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {dict.gettingStarted.organizationHint}
                </p>
              </div>

              <div className="shrink-0">
                {setupState === "loading" ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-400">
                    <Loader2 className="size-3 animate-spin" />
                    {dict.gettingStarted.loadingStatus}
                  </div>
                ) : organizationName ? (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.07] px-3 py-2 text-right">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                      {dict.gettingStarted.signedInAs}
                    </p>
                    <p className="mt-0.5 max-w-48 truncate text-xs font-semibold text-cyan-200">{organizationName}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
              {dict.gettingStarted.steps.map((step, index) => {
                const Icon = stepIcons[index] ?? Building2;
                const isCompleted = setupState !== "loading" && index < activeStep;
                const isActive = setupState !== "loading" && index === activeStep;

                return (
                  <div
                    key={step.title}
                    className={`relative rounded-2xl border p-4 transition sm:p-5 ${
                      isActive
                        ? "border-cyan-400/40 bg-cyan-500/[0.08] shadow-[0_0_24px_rgba(6,182,212,0.08)]"
                        : isCompleted
                          ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                          : "border-white/8 bg-slate-950/35"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex size-10 items-center justify-center rounded-xl border ${
                          isCompleted
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : isActive
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                              : "border-white/10 bg-white/5 text-slate-500"
                        }`}
                      >
                        {isCompleted ? <Check className="size-4" /> : <Icon className="size-4" />}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-300"
                            : isActive
                              ? "bg-cyan-500/10 text-cyan-300"
                              : "bg-white/5 text-slate-500"
                        }`}
                      >
                        {isCompleted
                          ? dict.gettingStarted.completedLabel
                          : isActive
                            ? dict.gettingStarted.nextLabel
                            : dict.gettingStarted.laterLabel}
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="font-mono text-[10px] font-semibold text-slate-600">0{index + 1}</span>
                      <h4 className={`font-display text-sm font-bold ${isActive ? "text-white" : "text-slate-200"}`}>
                        {step.title}
                      </h4>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{step.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-4 sm:px-6 sm:py-5">
              {setupState === "loading" ? (
                <div className="h-11 w-full animate-pulse rounded-xl bg-white/5 sm:w-56" />
              ) : (
                <a
                  href={primaryAction.href}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 font-display text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:brightness-110 sm:w-auto"
                >
                  <primaryAction.icon className="size-4" />
                  {primaryAction.label}
                  <ArrowRight className="size-4" />
                </a>
              )}
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.08] to-slate-950/60 p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
                <ScanLine className="size-5" />
              </div>
              <h3 className="font-display mt-4 text-lg font-bold text-white">{dict.gettingStarted.consumerTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{dict.gettingStarted.consumerText}</p>

              <div className="mt-5 space-y-3">
                {dict.gettingStarted.consumerSteps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-violet-500/25 bg-violet-500/10 font-mono text-[10px] font-bold text-violet-300">
                      {index + 1}
                    </span>
                    <p className="pt-0.5 text-xs leading-relaxed text-slate-300">{step}</p>
                  </div>
                ))}
              </div>

              <a
                href="#demo"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/15"
              >
                <QrCode className="size-4" />
                {dict.gettingStarted.consumerCta}
              </a>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-500">{dict.gettingStarted.consumerNote}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
