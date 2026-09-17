"use client";

import { useI18n } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, PackagePlus, QrCode, Sparkles, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "check_di_first_visit_tour_v1";

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};

type TourStep = {
  target?: string;
  mobileTarget?: string;
  title: string;
  text: string;
  icon: typeof Sparkles;
};

function readTargetRect(selector?: string): TargetRect | null {
  if (!selector) return null;
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
  };
}

export function GettingStartedSection() {
  const { dict } = useI18n();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const steps = useMemo<TourStep[]>(
    () => [
      {
        title: dict.gettingStarted.tourWelcomeTitle,
        text: dict.gettingStarted.tourWelcomeText,
        icon: Sparkles,
      },
      {
        target: '[data-tour="wallet"]',
        title: dict.gettingStarted.tourSteps[0].title,
        text: dict.gettingStarted.tourSteps[0].text,
        icon: Wallet,
      },
      {
        target: '[data-tour="create-batch"]',
        title: dict.gettingStarted.tourSteps[1].title,
        text: dict.gettingStarted.tourSteps[1].text,
        icon: PackagePlus,
      },
      {
        target: '[data-tour="scan"]',
        mobileTarget: '[data-tour="scan-mobile"]',
        title: dict.gettingStarted.tourSteps[2].title,
        text: dict.gettingStarted.tourSteps[2].text,
        icon: QrCode,
      },
    ],
    [dict.gettingStarted],
  );

  useEffect(() => {
    try {
      const forceTour = new URLSearchParams(window.location.search).get("tour") === "1";
      const completed = localStorage.getItem(STORAGE_KEY) === "done";
      if (forceTour || !completed) {
        const timer = window.setTimeout(() => setVisible(true), 450);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setVisible(true), 450);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    function syncTarget() {
      const step = steps[stepIndex];
      const isMobile = window.innerWidth < 768;
      const selector = isMobile && step.mobileTarget ? step.mobileTarget : step.target;
      setTargetRect(readTargetRect(selector));
    }

    syncTarget();
    const raf = window.requestAnimationFrame(syncTarget);
    window.addEventListener("resize", syncTarget);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncTarget);
    };
  }, [stepIndex, steps, visible]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // The tour can still be dismissed when storage is unavailable.
    }
    setVisible(false);
  }

  if (!visible) return null;

  const step = steps[stepIndex];
  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const cardWidth = 360;
  const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;

  const cardStyle = targetRect
    ? {
        left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - cardWidth / 2, viewportWidth - cardWidth - 16)),
        top:
          targetRect.bottom + 16 + 250 < viewportHeight
            ? targetRect.bottom + 16
            : Math.max(16, targetRect.top - 266),
        width: Math.min(cardWidth, viewportWidth - 32),
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label={dict.gettingStarted.tourWelcomeTitle}>
      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-2xl border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.78),0_0_28px_rgba(34,211,238,0.5)] transition-all duration-200"
          style={{
            top: targetRect.top - 7,
            left: targetRect.left - 7,
            width: targetRect.width + 14,
            height: targetRect.height + 14,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />
      )}

      <button
        type="button"
        onClick={finish}
        className="fixed right-4 top-4 z-[122] inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-300 shadow-xl transition hover:bg-slate-800 hover:text-white"
      >
        <X className="size-3.5" />
        {dict.gettingStarted.tourSkip}
      </button>

      <div
        className={`${targetRect ? "fixed" : "absolute left-1/2 top-1/2 w-[min(92vw,390px)] -translate-x-1/2 -translate-y-1/2"} z-[121] overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-2xl shadow-black/50`}
        style={targetRect ? cardStyle : undefined}
      >
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
              <Icon className="size-5" />
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-400">
              {stepIndex + 1}/{steps.length}
            </span>
          </div>

          <h2 className="font-display mt-4 text-xl font-extrabold tracking-tight text-white sm:text-2xl">{step.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.text}</p>

          <div className="mt-5 flex items-center gap-1.5">
            {steps.map((item, index) => (
              <span
                key={item.title}
                className={`h-1.5 rounded-full transition-all ${index === stepIndex ? "w-7 bg-cyan-400" : "w-2 bg-slate-700"}`}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={isFirst}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white disabled:invisible"
            >
              <ChevronLeft className="size-4" />
              {dict.gettingStarted.tourBack}
            </button>

            <button
              type="button"
              onClick={() => (isLast ? finish() : setStepIndex((current) => current + 1))}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-cyan-300"
            >
              {isLast ? dict.gettingStarted.tourDone : dict.gettingStarted.tourNext}
              {!isLast && <ChevronRight className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
