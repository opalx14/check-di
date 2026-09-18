"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type TourStep = {
  target: string;
  title: string;
  description: string;
  badge?: string;
  actionLabel?: string;
  actionHref?: string;
};

type TourGuideProps = {
  tourKey: string;
  flowTitle: string;
  role: "supplier" | "consumer";
  steps: TourStep[];
  autoStart?: boolean;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
};

function getTargetRect(selector: string): TargetRect | null {
  if (typeof document === "undefined") return null;
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
  };
}

export function TourGuide({
  tourKey,
  flowTitle,
  role,
  steps,
  autoStart = true,
}: TourGuideProps) {
  const storageKey = `check_di_tour_${tourKey}_v1`;
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  // Check on mount whether tour should auto-start
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const forceTour = urlParams.get("tour") === "1" || urlParams.get("tour") === tourKey;
      const alreadyDone = localStorage.getItem(storageKey) === "done";

      if (forceTour || (autoStart && !alreadyDone)) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 450);
        return () => clearTimeout(timer);
      }
    } catch {
      // Storage unavailable fallback
      if (autoStart) {
        const timer = setTimeout(() => setIsOpen(true), 450);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStart, storageKey, tourKey]);

  // Update target rect when open or step changes
  const updateRect = useCallback(() => {
    if (!isOpen) {
      setTargetRect(null);
      return;
    }
    const currentStep = steps[stepIndex];
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    const rect = getTargetRect(currentStep.target);
    if (rect) {
      setTargetRect(rect);
      const element = document.querySelector<HTMLElement>(currentStep.target);
      if (element) {
        const inViewport =
          rect.top >= 60 &&
          rect.bottom <= window.innerHeight - 60;
        if (!inViewport) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    } else {
      setTargetRect(null);
    }
  }, [isOpen, stepIndex, steps]);

  useEffect(() => {
    updateRect();
    const handleSync = () => {
      requestAnimationFrame(updateRect);
    };
    window.addEventListener("resize", handleSync);
    window.addEventListener("scroll", handleSync, true);
    return () => {
      window.removeEventListener("resize", handleSync);
      window.removeEventListener("scroll", handleSync, true);
    };
  }, [updateRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeTour();
      } else if (e.key === "ArrowRight") {
        if (stepIndex < steps.length - 1) {
          setStepIndex((i) => i + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (stepIndex > 0) {
          setStepIndex((i) => i - 1);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, stepIndex, steps.length]);

  function closeTour() {
    try {
      localStorage.setItem(storageKey, "done");
    } catch {
      // ignore
    }
    setIsOpen(false);
  }

  function startTour() {
    setStepIndex(0);
    setIsOpen(true);
  }

  const currentStep = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Floating trigger pill when tour is closed
  if (!isOpen) {
    return (
      <aside aria-label="Hướng dẫn demo" className="fixed bottom-5 right-5 z-[80]">
        <button
          type="button"
          onClick={startTour}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-[#0b111c]/95 px-3.5 py-2 text-xs font-bold text-cyan-300 shadow-xl shadow-black/50 backdrop-blur-md transition hover:border-cyan-400 hover:bg-[#121c2e] hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          aria-label={`Mở ${flowTitle}`}
        >
          <Sparkles className="size-3.5 text-cyan-400 animate-pulse" />
          <span>{flowTitle}</span>
        </button>
      </aside>
    );
  }

  if (!currentStep) return null;

  // Calculate card position so it does NOT cover the target element
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const isMobile = viewportWidth < 768;
  const cardWidth = Math.min(390, viewportWidth - 32);

  let cardStyle: React.CSSProperties = {};

  if (targetRect) {
    if (isMobile) {
      // On mobile: dock at top or bottom depending on target vertical center
      const targetCenterY = targetRect.top + targetRect.height / 2;
      if (targetCenterY < viewportHeight / 2) {
        // Target is in top half -> dock popover at bottom
        cardStyle = {
          position: "fixed",
          bottom: "16px",
          left: "16px",
          right: "16px",
          maxWidth: "calc(100vw - 32px)",
        };
      } else {
        // Target is in bottom half -> dock popover at top
        cardStyle = {
          position: "fixed",
          top: "16px",
          left: "16px",
          right: "16px",
          maxWidth: "calc(100vw - 32px)",
        };
      }
    } else {
      // On desktop: place above or below with smart horizontal clamping
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const left = Math.max(
        16,
        Math.min(targetCenterX - cardWidth / 2, viewportWidth - cardWidth - 16)
      );

      const estimatedHeight = 240;
      const fitsBelow = targetRect.bottom + estimatedHeight + 16 < viewportHeight;

      if (fitsBelow) {
        cardStyle = {
          position: "fixed",
          top: `${Math.max(16, targetRect.bottom + 12)}px`,
          left: `${left}px`,
          width: `${cardWidth}px`,
        };
      } else {
        cardStyle = {
          position: "fixed",
          bottom: `${Math.max(16, viewportHeight - targetRect.top + 12)}px`,
          left: `${left}px`,
          width: `${cardWidth}px`,
        };
      }
    }
  } else {
    // Center modal fallback if target is not currently in DOM
    cardStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: `${cardWidth}px`,
    };
  }

  const roleBadgeColor =
    role === "supplier"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <aside aria-label={flowTitle} className="fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      {/* Target Spotlight Highlight Ring */}
      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-2xl border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.76),0_0_28px_rgba(34,211,238,0.5)] transition-all duration-300 ease-out"
          style={{
            top: Math.max(0, targetRect.top - 6),
            left: Math.max(0, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] transition-opacity"
          onClick={closeTour}
        />
      )}

      {/* Floating Tour Popover Card */}
      <div
        className="z-[122] overflow-hidden rounded-3xl border border-white/12 bg-[#0b111c] shadow-2xl shadow-black/70 animate-in fade-in zoom-in-95 duration-200"
        style={cardStyle}
      >
        {/* Top Accent Gradient Bar */}
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400" />

        <div className="p-5 sm:p-6">
          {/* Header row: flow tag + step counter + close */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${roleBadgeColor}`}
              >
                <Sparkles className="size-2.5" />
                {role === "supplier" ? "Nhà cung cấp" : "Người mua"}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Bước {stepIndex + 1}/{steps.length}
              </span>
            </div>
            <button
              type="button"
              onClick={closeTour}
              className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              aria-label="Đóng hướng dẫn"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Title & Description */}
          <div className="mt-3.5">
            <h2 className="font-display text-base font-extrabold text-white sm:text-lg leading-snug">
              {currentStep.title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {currentStep.description}
            </p>
          </div>

          {/* Action Link if provided */}
          {currentStep.actionHref && currentStep.actionLabel && (
            <div className="mt-3.5 pt-2 border-t border-white/8">
              <a
                href={currentStep.actionHref}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition"
              >
                {currentStep.actionLabel}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}

          {/* Footer Controls: Back, Skip, Next / Done */}
          <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-3.5">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white disabled:invisible transition"
            >
              <ChevronLeft className="size-3.5" />
              Quay lại
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeTour}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition"
              >
                Bỏ qua
              </button>

              {isLast ? (
                currentStep.actionHref ? (
                  <a
                    href={currentStep.actionHref}
                    onClick={closeTour}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 transition"
                  >
                    {currentStep.actionLabel || "Tiếp tục"}
                    <ArrowRight className="size-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={closeTour}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 transition"
                  >
                    Hoàn tất tour
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 transition"
                >
                  Tiếp theo
                  <ChevronRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
