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
    <section id="getting-started" className="border-b border-white/5 bg-[#080c17]/95 py-5 sm:py-7">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="size-3.5" />
              {dict.gettingStarted.badge}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between lg:block">
              <div>
                <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-white sm:text-3xl">
                  {dict.gettingStarted.title}
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {dict.gettingStarted.description}
                </p>
              </div>
              {organizationName && (
                <div className="shrink-0 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.07] px-3 py-2 text-left sm:text-right lg:mt-3 lg:inline-block">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                    {dict.gettingStarted.signedInAs}
                  </p>
                  <p className="mt-0.5 max-w-48 truncate text-xs font-semibold text-cyan-200">{organizationName}</p>
                </div>
              )}
            </div>
          </div>

          <a
            href="#demo"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-violet-400/20 bg-violet-500/10 px-3.5 py-2.5 text-xs font-semibold text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/15 lg:self-auto"
          >
            <ScanLine className="size-4" />
            {dict.gettingStarted.consumerCta}
          </a>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {dict.gettingStarted.steps.map((step, index) => {
            const Icon = stepIcons[index] ?? Building2;
            const isCompleted = setupState !== "loading" && index < activeStep;
            const isActive = setupState !== "loading" && index === activeStep;

            return (
              <div
                key={step.title}
                className={`relative rounded-2xl border p-3.5 transition sm:p-4 ${
                  isActive
                    ? "border-cyan-400/40 bg-cyan-500/[0.08] shadow-[0_0_24px_rgba(6,182,212,0.08)]"
                    : isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                      : "border-white/8 bg-slate-950/35"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${
                      isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : isActive
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          : "border-white/10 bg-white/5 text-slate-500"
                    }`}
                  >
                    {setupState === "loading" && index === 0 ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isCompleted ? (
                      <Check className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] font-semibold text-slate-600">0{index + 1}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider ${
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
                    <h3 className={`mt-1 font-display text-sm font-bold ${isActive ? "text-white" : "text-slate-200"}`}>
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{step.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/8 bg-slate-950/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-start gap-2.5">
            <QrCode className="mt-0.5 size-4 shrink-0 text-violet-300" />
            <div>
              <p className="text-xs font-semibold text-slate-200">{dict.gettingStarted.consumerTitle}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{dict.gettingStarted.consumerNote}</p>
            </div>
          </div>

          {setupState === "loading" ? (
            <div className="h-10 w-full animate-pulse rounded-xl bg-white/5 sm:w-48" />
          ) : (
            <a
              href={primaryAction.href}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 font-display text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:brightness-110 sm:w-auto"
            >
              <primaryAction.icon className="size-4" />
              {primaryAction.label}
              <ArrowRight className="size-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
