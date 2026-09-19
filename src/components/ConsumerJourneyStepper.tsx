"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sprout,
  Truck,
  Warehouse,
} from "lucide-react";

import {
  clampJourneyIndex,
  journeyProgressPercent,
  journeyStepVisualState,
} from "@/lib/consumer/journey-stepper";

export type ConsumerJourneyStep = {
  id: string;
  stage: "production" | "packing" | "inspection" | "logistics" | "retail";
  organizationName: string;
  location: string;
  occurredAt: string;
  summary: string;
  lifecycleStatus: "draft" | "confirmed" | "revoked" | "superseded";
  warningCount: number;
  devnetVerified: boolean;
  eventPda?: string;
};

const stageMeta = {
  production: { label: "Thu hoạch", icon: Sprout },
  packing: { label: "Đóng gói", icon: Warehouse },
  inspection: { label: "Kiểm định", icon: PackageCheck },
  logistics: { label: "Vận chuyển", icon: Truck },
  retail: { label: "Điểm bán", icon: MapPin },
} as const;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function short(value?: string, left = 8, right = 6) {
  if (!value) return "—";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

export function ConsumerJourneyStepper({
  events,
}: {
  events: ConsumerJourneyStep[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = clampJourneyIndex(activeIndex, events.length);
  const active = events[safeIndex];
  const progress = journeyProgressPercent(safeIndex, events.length);

  if (!active) return null;

  const meta = stageMeta[active.stage];
  const Icon = meta.icon;
  const terminal =
    active.lifecycleStatus === "revoked" ||
    active.lifecycleStatus === "superseded";

  return (
    <div className="mt-7 border-t border-white/8 pt-5" data-tour="verify-journey-timeline">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Hành trình
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Chọn từng chặng để xem ai xác nhận, ở đâu và proof tương ứng.
          </p>
        </div>
        <span className="font-mono text-[10px] text-slate-500">
          {safeIndex + 1}/{events.length}
        </span>
      </div>

      <div className="relative mt-4">
        <div className="absolute left-5 right-5 top-[18px] h-px bg-white/8" />
        <div
          className="absolute left-5 top-[18px] h-px bg-emerald-400/45 transition-[width] duration-300"
          style={{ width: `calc((100% - 2.5rem) * ${progress / 100})` }}
        />

        <div className="relative flex gap-2 overflow-x-auto pb-2">
          {events.map((event, index) => {
            const itemMeta = stageMeta[event.stage];
            const ItemIcon = itemMeta.icon;
            const visualState = journeyStepVisualState(index, safeIndex);
            const selected = visualState === "selected";
            const completed = visualState === "completed" || selected;

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-pressed={selected}
                className="group flex min-w-[76px] flex-1 flex-col items-center text-center outline-none"
              >
                <span
                  className={`relative z-10 flex size-9 items-center justify-center rounded-full border transition ${
                    selected
                      ? "border-cyan-400/55 bg-cyan-400/15 text-cyan-200 ring-4 ring-cyan-500/5"
                      : completed
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-slate-950 text-slate-500"
                  }`}
                >
                  <ItemIcon className="size-4" />
                </span>
                <span
                  className={`mt-2 max-w-[86px] text-[10px] font-semibold sm:text-[11px] ${
                    selected ? "text-white" : "text-slate-400"
                  }`}
                >
                  {itemMeta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                terminal
                  ? "border-red-500/20 bg-red-500/10 text-red-300"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{meta.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {active.organizationName} · {active.location}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500">
            {formatTime(active.occurredAt)}
          </span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-300">
          {active.summary}
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
              Devnet integrity
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
              {active.devnetVerified ? (
                <>
                  <ShieldCheck className="size-3.5 text-emerald-300" />
                  <span className="text-emerald-300">Verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-3.5 text-amber-300" />
                  <span className="text-amber-300">Needs check</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
              AI/data checks
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle2
                className={`size-3.5 ${
                  active.warningCount === 0
                    ? "text-emerald-300"
                    : "text-amber-300"
                }`}
              />
              <span
                className={
                  active.warningCount === 0
                    ? "text-emerald-300"
                    : "text-amber-300"
                }
              >
                {active.warningCount === 0
                  ? "Không cảnh báo"
                  : `${active.warningCount} cảnh báo`}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
              Event PDA
            </p>
            <p className="mt-1 font-mono text-xs text-slate-300">
              {short(active.eventPda)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}
            disabled={safeIndex === 0}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
            Chặng trước
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveIndex((value) => Math.min(events.length - 1, value + 1))
            }
            disabled={safeIndex === events.length - 1}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Chặng tiếp
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
