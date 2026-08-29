"use client";

import { useI18n } from "@/lib/i18n";
import {
  AlertTriangle,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileCheck2,
  Hash,
  Layers,
  MapPin,
  PackageCheck,
  Pause,
  Play,
  QrCode,
  Route,
  ShieldCheck,
  Sparkles,
  Sprout,
  Thermometer,
  Truck,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StageId = "farm" | "packing" | "inspection" | "logistics" | "retail";

type TraceStage = {
  id: StageId;
  title: string;
  organization: string;
  location: string;
  time: string;
  detail: string;
  hash: string;
  icon: typeof Sprout;
  aiCheck?: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  svgX: number; // SVG viewBox x (0-1000)
  svgY: number; // SVG viewBox y (0-320)
  shortPlace: string;
  docName?: string;
  docType?: string;
  coords?: string;
  temp?: string;
  highway?: string;
};

const STAGE_CONFIGS: Array<{
  id: StageId;
  hash: string;
  icon: typeof Sprout;
  x: number;
  y: number;
  svgX: number;
  svgY: number;
  highway?: string;
}> = [
  { id: "farm", hash: "a81c7f023d88b492fa", icon: Sprout, x: 12, y: 26, svgX: 120, svgY: 85, highway: "QL26" },
  { id: "packing", hash: "bf2160ae991c4ac831", icon: Warehouse, x: 30, y: 39, svgX: 300, svgY: 125, highway: "QL14" },
  { id: "inspection", hash: "c90234de5113e1137a", icon: PackageCheck, x: 48, y: 51.5, svgX: 480, svgY: 165, highway: "QL14" },
  { id: "logistics", hash: "d710aa4933bd33bd6f", icon: Truck, x: 68, y: 65.5, svgX: 680, svgY: 210, highway: "ĐT741" },
  { id: "retail", hash: "e445bb1081cc81cc90", icon: MapPin, x: 88, y: 79.5, svgX: 880, svgY: 255, highway: "QL13 / Q7" },
];

// Continuous natural South-West transit corridor from Dak Lak (Highlands) to HCMC (Delta)
const ROUTE_PATH = "M 120 85 C 210 100, 220 125, 300 125 C 380 125, 400 165, 480 165 C 570 165, 590 210, 680 210 C 770 210, 800 255, 880 255";

export function InteractiveSandbox() {
  const { dict } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConsumerView, setShowConsumerView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const stages: TraceStage[] = useMemo(() => {
    return STAGE_CONFIGS.map((cfg) => {
      const stageDict = dict.sandbox.stages[cfg.id];
      return {
        id: cfg.id,
        title: stageDict.title,
        organization: stageDict.org,
        location: stageDict.location,
        time: stageDict.time,
        detail: stageDict.detail,
        hash: cfg.hash,
        icon: cfg.icon,
        aiCheck: "aiCheck" in stageDict ? (stageDict.aiCheck as string) : undefined,
        x: cfg.x,
        y: cfg.y,
        svgX: cfg.svgX,
        svgY: cfg.svgY,
        shortPlace: stageDict.shortPlace,
        docName: stageDict.docName,
        docType: stageDict.docType,
        coords: stageDict.coords,
        temp: stageDict.temp,
        highway: cfg.highway,
      };
    });
  }, [dict]);

  const selected = stages[selectedIndex] || stages[0];

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setSelectedIndex((current) => {
        if (current >= stages.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1300);

    return () => window.clearInterval(timer);
  }, [isPlaying, stages.length]);

  const progress = useMemo(
    () => (selectedIndex / (stages.length - 1)) * 100,
    [selectedIndex, stages.length],
  );

  const selectStage = (index: number) => {
    setIsPlaying(false);
    setSelectedIndex(index);
  };

  const playJourney = () => {
    if (selectedIndex === stages.length - 1) setSelectedIndex(0);
    setIsPlaying(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <section id="demo" className="relative border-t border-white/10 py-8 sm:py-24">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-10 top-1/2 -z-10 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="hidden flex-col gap-4 sm:flex lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-cyan-300 backdrop-blur-md">
              <Sparkles className="size-3.5" />
              {dict.sandbox.simulatedDataBadge}
            </div>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
              {dict.sandbox.title}
            </h2>
            <p className="mt-4 hidden text-sm leading-relaxed text-slate-300/90 sm:block sm:text-base">
              {dict.sandbox.description}
            </p>
          </div>

          <div className="hidden flex-wrap items-center gap-3 sm:flex">
            {!showConsumerView && (
              <button
                type="button"
                onClick={isPlaying ? () => setIsPlaying(false) : playJourney}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900/90 px-5 py-3 font-display text-sm font-semibold tracking-tight text-white shadow-lg transition hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-200"
              >
                {isPlaying ? <Pause className="size-4 text-amber-400" /> : <Play className="size-4 text-cyan-400" />}
                {isPlaying ? dict.sandbox.pause : dict.sandbox.playJourney}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowConsumerView((value) => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-5 py-3 font-display text-sm font-bold tracking-tight text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:opacity-95 hover:shadow-cyan-500/30"
            >
              <QrCode className="size-4" />
              {showConsumerView ? dict.sandbox.backToMap : dict.sandbox.simulateQrScan}
            </button>
          </div>
        </div>

        {!showConsumerView ? (
          <div className="mt-2 sm:mt-10">
            {/* Mobile Scan Card Trigger */}
            <MobileScanCard onScan={() => setShowConsumerView(true)} />

            {/* Desktop Simulator View */}
            <div className="hidden space-y-6 sm:block">
              {/* High-Tech Geographic Transit Map */}
              <JourneyMap
                stages={stages}
                selectedIndex={selectedIndex}
                progress={progress}
                isPlaying={isPlaying}
                onSelect={selectStage}
              />

              {/* Waypoint Stepper & Checkpoint Inspector */}
              <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                {/* Stepper List */}
                <div className="rounded-3xl border border-white/10 bg-[#090e1a]/90 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        <Layers className="size-3.5" />
                        {dict.sandbox.stagesCount}
                      </div>
                      <h3 className="font-display mt-1 text-base font-bold tracking-tight text-white">
                        {dict.sandbox.journeyTitle}
                      </h3>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-300">
                      5/5 OK
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {stages.map((stage, index) => {
                      const Icon = stage.icon;
                      const active = index === selectedIndex;
                      const complete = index < selectedIndex;
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => selectStage(index)}
                          className={`group relative flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                            active
                              ? "border-cyan-500/60 bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                              : complete
                                ? "border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-500/40"
                                : "border-white/5 bg-slate-900/40 hover:border-white/15 hover:bg-slate-900/70"
                          }`}
                        >
                          {/* Active Indicator Bar */}
                          {active && (
                            <div className="absolute -left-[1px] top-3 bottom-3 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                          )}

                          {/* Node Icon */}
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                              active
                                ? "border-cyan-400 bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                                : complete
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                  : "border-white/10 bg-slate-950/80 text-slate-400 group-hover:text-slate-200"
                            }`}
                          >
                            <Icon className="size-4.5" />
                          </div>

                          {/* Text Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-xs font-bold tracking-tight text-white">
                                {index + 1}. {stage.title}
                              </span>
                              {stage.temp && (
                                <span className="font-mono text-[10px] text-slate-400">· {stage.temp}</span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">{stage.organization}</p>
                          </div>

                          {/* Status Icon */}
                          <div className="shrink-0">
                            {complete ? (
                              <CheckCircle2 className="size-4.5 text-emerald-400" />
                            ) : active ? (
                              <span className="flex size-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] animate-pulse" />
                            ) : (
                              <span className="font-mono text-[10px] text-slate-600">0{index + 1}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stage Detail Inspector */}
                <StageDetail
                  stage={selected}
                  copiedHash={copiedHash}
                  onCopyHash={copyToClipboard}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Redesigned Consumer Verification Pass View */
          <ConsumerView
            stages={stages}
            copiedHash={copiedHash}
            onCopyHash={copyToClipboard}
          />
        )}
      </div>
    </section>
  );
}

function MobileScanCard({ onScan }: { onScan: () => void }) {
  const { dict } = useI18n();

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={onScan}
        className="group relative flex h-60 w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#060a12] p-6 shadow-2xl shadow-cyan-500/10"
      >
        {/* Decorative Scanner Reticle */}
        <span className="absolute left-6 top-6 h-7 w-7 border-l-2 border-t-2 border-cyan-400" />
        <span className="absolute right-6 top-6 h-7 w-7 border-r-2 border-t-2 border-cyan-400" />
        <span className="absolute bottom-6 left-6 h-7 w-7 border-b-2 border-l-2 border-cyan-400" />
        <span className="absolute bottom-6 right-6 h-7 w-7 border-b-2 border-r-2 border-cyan-400" />

        {/* Ambient pulse */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_70%)]" />

        {/* Center QR Graphic */}
        <div className="relative flex size-24 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-md">
          <QrCode className="size-16 text-cyan-300 transition-transform group-hover:scale-105" strokeWidth={1.3} />
          {/* Laser scanning beam line */}
          <span className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_rgba(34,211,238,1)] animate-pulse" />
        </div>

        <div className="relative mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-3 py-1 font-mono text-[10px] font-bold text-cyan-300">
            <Sparkles className="size-3" />
            {dict.sandbox.simulatedDataBadge}
          </span>
          <p className="font-display mt-2 text-sm font-bold text-white">
            {dict.hero.mobileScanTitle}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{dict.hero.mobileScanHint}</p>
        </div>
      </button>
    </div>
  );
}

function JourneyMap({
  stages,
  selectedIndex,
  progress,
  isPlaying,
  onSelect,
  compact = false,
}: {
  stages: TraceStage[];
  selectedIndex: number;
  progress: number;
  isPlaying: boolean;
  onSelect?: (index: number) => void;
  compact?: boolean;
}) {
  const { dict } = useI18n();
  const selected = stages[selectedIndex] || stages[0];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#070c16]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
      {/* Map HUD Top Bar */}
      <div className="flex flex-col gap-3 border-b border-white/10 bg-[#09101d]/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            <Route className="size-4 text-cyan-400" />
            {dict.sandbox.mapTitle}
          </div>
          <p className="font-display mt-0.5 text-xs font-semibold tracking-tight text-slate-200 sm:text-sm">
            {dict.sandbox.mapSubtitle}
          </p>
        </div>

        {/* Telemetry HUD Badges */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] sm:text-[11px]">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1 text-slate-300">
            <MapPin className="size-3 text-cyan-400" />
            <span>{dict.sandbox.telemetryDistance}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1 text-slate-300">
            <Clock className="size-3 text-emerald-400" />
            <span>{dict.sandbox.telemetryDuration}</span>
          </div>
          <div className="hidden items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-2.5 py-1 text-cyan-300 sm:flex">
            <Thermometer className="size-3 text-cyan-400" />
            <span>{dict.sandbox.telemetryColdChain}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-300">
            <CheckCircle2 className="size-3" />
            <span>{dict.sandbox.stageCounter} {selectedIndex + 1}/5</span>
          </div>
        </div>
      </div>

      {/* Map Graphic Canvas */}
      <div className={`relative overflow-hidden ${compact ? "h-[220px] sm:h-[260px]" : "h-[300px] sm:h-[380px]"}`}>
        {/* Subtle grid pattern & atmospheric light */}
        <div className="absolute inset-0 bg-grid-pattern opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(6,182,212,0.12),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(16,185,129,0.10),transparent_40%)]" />

        {/* Vector Highway & Topographical Map */}
        <svg
          viewBox="0 0 1000 320"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Ambient topographical contours */}
          <path
            d="M 50 140 Q 200 40, 380 90 T 700 80 T 960 120"
            fill="none"
            stroke="rgba(34,211,238,0.05)"
            strokeWidth="1"
          />
          <path
            d="M 40 220 Q 250 180, 480 240 T 800 230 T 950 280"
            fill="none"
            stroke="rgba(16,185,129,0.04)"
            strokeWidth="1"
          />
          <path
            d="M 120 40 Q 300 20, 520 70 T 880 50"
            fill="none"
            stroke="rgba(148,163,184,0.03)"
            strokeWidth="1"
          />

          {/* Background Route Guide Track */}
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="rgba(148,163,184,0.25)"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
          />

          {/* Active Glowing Route Trail */}
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="url(#routeGlowGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - progress}
            className="transition-all duration-700 ease-out"
            filter="url(#glowFilter)"
          />

          <defs>
            {/* Route color gradient */}
            <linearGradient id="routeGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Origin & Destination Regional Badges */}
        <div className="pointer-events-none absolute left-4 top-3 flex items-center gap-1.5 rounded-md border border-cyan-500/20 bg-slate-950/80 px-2 py-1 font-mono text-[9px] font-bold text-cyan-300 sm:left-6 sm:top-4 sm:text-[10px]">
          <span className="size-1.5 rounded-full bg-cyan-400" />
          {dict.sandbox.originLabel}
        </div>

        <div className="pointer-events-none absolute right-4 bottom-16 flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-slate-950/80 px-2 py-1 font-mono text-[9px] font-bold text-emerald-300 sm:right-6 sm:bottom-16 sm:text-[10px]">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          {dict.sandbox.destinationLabel}
        </div>

        {/* Highway Badges on Map */}
        {!compact && (
          <>
            <div className="pointer-events-none absolute left-[21%] top-[25%] rounded border border-white/10 bg-slate-950/60 px-1.5 py-0.5 font-mono text-[8px] text-slate-500">
              QL26
            </div>
            <div className="pointer-events-none absolute left-[39%] top-[40%] rounded border border-white/10 bg-slate-950/60 px-1.5 py-0.5 font-mono text-[8px] text-slate-500">
              QL14
            </div>
            <div className="pointer-events-none absolute left-[58%] top-[56%] rounded border border-white/10 bg-slate-950/60 px-1.5 py-0.5 font-mono text-[8px] text-slate-500">
              ĐT741
            </div>
          </>
        )}

        {/* Active Stage Pulsing Beacon (Positioned behind the node, not obscuring!) */}
        <div
          className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-700 ease-out"
          style={{ left: `${selected.x}%`, top: `${selected.y}%` }}
        >
          <span className="relative flex size-14 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
            <span className="absolute inset-2 rounded-full border border-cyan-400/40 bg-cyan-500/10" />
          </span>
        </div>

        {/* Waypoint Checkpoint Nodes */}
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const active = index === selectedIndex;
          const complete = index < selectedIndex;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={onSelect ? () => onSelect(index) : undefined}
              style={{ left: `${stage.x}%`, top: `${stage.y}%` }}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer text-center focus:outline-none"
              aria-label={`${dict.sandbox.stageCounter} ${index + 1}: ${stage.title}`}
            >
              {/* Waypoint Circle */}
              <div
                className={`relative mx-auto flex size-9 items-center justify-center rounded-full border-2 transition-all duration-300 sm:size-11 ${
                  active
                    ? "scale-110 border-cyan-300 bg-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.7)]"
                    : complete
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:scale-105"
                      : "border-white/20 bg-slate-950/90 text-slate-400 hover:border-cyan-400/50 hover:text-cyan-200"
                }`}
              >
                <Icon className="size-4 sm:size-4.5" />

                {/* Micro Verified Checkmark Pill for completed stages */}
                {complete && (
                  <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-emerald-300 bg-emerald-500 text-slate-950">
                    <Check className="size-2.5 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* Waypoint Text Label Tooltip */}
              <div
                className={`mt-1.5 hidden rounded-lg border px-2 py-0.5 text-[9px] font-bold tracking-tight backdrop-blur-md transition-all sm:block sm:text-[10px] ${
                  active
                    ? "border-cyan-400/40 bg-cyan-950/90 text-cyan-200 shadow-lg shadow-cyan-950/50"
                    : complete
                      ? "border-emerald-500/30 bg-slate-950/85 text-emerald-200"
                      : "border-white/10 bg-slate-950/80 text-slate-400 group-hover:text-slate-200"
                }`}
              >
                {index + 1}. {stage.shortPlace}
              </div>
            </button>
          );
        })}

        {/* Bottom Interactive Telemetry & Scrubber Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/85 px-3.5 py-2 text-[11px] shadow-xl backdrop-blur-xl sm:bottom-4 sm:left-4 sm:right-4 sm:px-5 sm:py-2.5">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="flex size-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-display font-semibold text-white">{selected.title}</span>
            <span className="hidden font-mono text-slate-400 sm:inline">· {selected.location}</span>
          </div>

          <div className="flex items-center gap-2.5 text-slate-400">
            <span className="hidden font-mono text-[10px] sm:inline">{dict.sandbox.progressLabel}</span>
            <div className="h-2 w-20 overflow-hidden rounded-full bg-white/10 sm:w-36">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <span className="font-mono font-bold text-cyan-300">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageDetail({
  stage,
  copiedHash,
  onCopyHash,
}: {
  stage: TraceStage;
  copiedHash: string | null;
  onCopyHash: (hash: string) => void;
}) {
  const { dict } = useI18n();
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "docs">("overview");

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#090e1a]/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      <div>
        {/* Header with Title and Verification Pill */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <ShieldCheck className="size-4 text-cyan-400" />
              {dict.sandbox.viewingStage}
            </div>
            <h3 className="font-display mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {stage.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">{stage.location}</p>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            {dict.sandbox.recordedStatus}
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex rounded-xl border border-white/10 bg-slate-950/60 p-1 font-display text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
              activeTab === "overview"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {dict.sandbox.tabOverview}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
              activeTab === "ai"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {dict.sandbox.tabAiCheck}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("docs")}
            className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
              activeTab === "docs"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {dict.sandbox.tabDocuments}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <InfoCard label={dict.sandbox.orgLabel} value={stage.organization} icon={Building2} />
              <InfoCard label={dict.sandbox.timeLabel} value={stage.time} icon={Clock} isMono />
              <InfoCard label={dict.sandbox.locationLabel} value={stage.coords || stage.location} icon={MapPin} isMono />
              <InfoCard label="Bảo quản" value={stage.temp || "Tiêu chuẩn"} icon={Thermometer} />
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
                {dict.sandbox.stageDataLabel}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                {stage.detail}
              </p>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="mt-4 space-y-3">
            {stage.aiCheck ? (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/25 p-4">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Bot className="size-4" />
                  <p className="font-mono text-xs font-bold uppercase tracking-wider">
                    {dict.sandbox.aiCheckTitle}
                  </p>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-slate-200 sm:text-sm">
                  {stage.aiCheck}
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] text-emerald-300">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>Không phát hiện mâu thuẫn dữ liệu</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 text-xs text-slate-400">
                {dict.sandbox.aiCheckEmpty}
              </div>
            )}
          </div>
        )}

        {activeTab === "docs" && (
          <div className="mt-4 space-y-3">
            {stage.docName && (
              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4">
                <div className="flex items-center gap-2 text-purple-300">
                  <FileCheck2 className="size-4" />
                  <p className="font-mono text-xs font-bold uppercase tracking-wider">
                    {dict.sandbox.documentsTitle}
                  </p>
                </div>
                <p className="mt-2 text-xs font-bold text-white">{stage.docName}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{stage.docType}</p>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Hash className="size-4" />
                  <p className="font-mono text-xs font-bold uppercase tracking-wider">
                    {dict.sandbox.dataHashTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCopyHash(stage.hash)}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] text-emerald-300 hover:bg-emerald-500/20"
                >
                  {copiedHash === stage.hash ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copiedHash === stage.hash ? dict.sandbox.copied : dict.sandbox.copyHash}
                </button>
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-emerald-300">{stage.hash}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{dict.sandbox.hashNote}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-5 border-t border-white/5 pt-3 font-mono text-[10px] text-slate-500">
        Mã lô: <span className="text-cyan-300">DUR-260830-01</span> · Solana Devnet Integrity Anchor
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon: Icon,
  isMono = false,
}: {
  label: string;
  value: string;
  icon: typeof Sprout;
  isMono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
        <Icon className="size-3 text-cyan-400" />
        <span>{label}</span>
      </div>
      <p
        className={`mt-1.5 truncate text-xs font-semibold text-white ${
          isMono ? "font-mono text-cyan-300/90" : "font-sans"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ConsumerView({
  stages,
  copiedHash,
  onCopyHash,
}: {
  stages: TraceStage[];
  copiedHash: string | null;
  onCopyHash: (hash: string) => void;
}) {
  const { dict } = useI18n();
  const [selectedMobileIndex, setSelectedMobileIndex] = useState(stages.length - 1);
  const [showProofDetails, setShowProofDetails] = useState(false);

  return (
    <div className="mx-auto mt-4 max-w-4xl space-y-5 sm:mt-8 sm:space-y-6">
      {/* 1. Digital Product Passport Header Pass */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#0e1726] to-[#070b14] p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl sm:p-7">
        {/* Holographic Top Border & Accent Light */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400" />
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="size-3.5" />
              {dict.sandbox.passportTitle}
            </div>

            <h3 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {dict.hero.productName}
            </h3>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              {dict.sandbox.passportSubtitle}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 text-slate-300">
                {dict.hero.sampleBatch}: <span className="font-bold text-cyan-300">DUR-260830-01</span>
              </span>
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 font-bold text-emerald-300">
                VietGAP #VG-2026
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-white/10 bg-slate-950/70 p-3 sm:flex-col sm:items-center sm:text-center">
            <QrCode className="size-10 text-cyan-300" strokeWidth={1.5} />
            <div>
              <p className="font-mono text-[10px] font-bold text-slate-400">{dict.sandbox.consumerQrTitle}</p>
              <p className="font-mono text-[9px] text-emerald-400">STATUS: VERIFIED</p>
            </div>
          </div>
        </div>

        {/* 2. AI Intelligence & Document Cross-Check Radar Card */}
        <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-cyan-300">
              <Bot className="size-5" />
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider">
                  {dict.sandbox.aiCardTitle}
                </p>
                <p className="text-xs font-semibold text-emerald-300">
                  {dict.sandbox.aiCardStatus}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300">
              5/5 VALIDATED
            </span>
          </div>

          <div className="mt-3.5 grid gap-2 sm:grid-cols-3">
            <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-[11px] text-slate-300">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              <span>{dict.sandbox.aiCardPoint1}</span>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-[11px] text-slate-300">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              <span>{dict.sandbox.aiCardPoint2}</span>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-[11px] text-slate-300">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              <span>{dict.sandbox.aiCardPoint3}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Embedded Geographic Route Map */}
      <JourneyMap
        stages={stages}
        selectedIndex={selectedMobileIndex}
        progress={100}
        isPlaying={false}
        onSelect={(index) => setSelectedMobileIndex(index)}
        compact
      />

      {/* 4. Interactive 5-Stage Supply Chain Timeline Cards */}
      <div className="rounded-3xl border border-white/10 bg-[#090e1a]/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
              {dict.sandbox.stagesCount}
            </p>
            <h4 className="font-display mt-0.5 text-lg font-bold text-white">
              {dict.sandbox.consumerVerifiedAllStages}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowProofDetails((v) => !v)}
            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            {showProofDetails ? dict.sandbox.closeProof : dict.sandbox.openProof}
            {showProofDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isSelected = index === selectedMobileIndex;

            return (
              <div
                key={stage.id}
                onClick={() => setSelectedMobileIndex(index)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? "border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                    : "border-white/5 bg-slate-900/40 hover:border-white/15"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                      <Icon className="size-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-bold text-white">
                          {index + 1}. {stage.title}
                        </p>
                        <span className="font-mono text-[10px] text-emerald-400">· {stage.temp || "18°C"}</span>
                      </div>
                      <p className="text-xs text-slate-400">{stage.organization} · <span className="text-slate-500">{stage.location}</span></p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-[10px] text-slate-400">{stage.time.split("·")[0]}</span>
                    <div className="mt-1 flex items-center justify-end gap-1 text-emerald-300">
                      <CheckCircle2 className="size-3.5" />
                      <span className="font-mono text-[10px] font-bold">XÁC NHẬN</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details when selected or proof toggled */}
                {(isSelected || showProofDetails) && (
                  <div className="mt-3.5 border-t border-white/5 pt-3 space-y-2 text-xs">
                    <p className="text-slate-300 leading-relaxed">{stage.detail}</p>
                    {stage.docName && (
                      <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-1.5 text-purple-200">
                        <FileCheck2 className="size-3.5 text-purple-400" />
                        <span className="font-mono text-[11px] font-semibold">{stage.docName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/60 px-3 py-1.5 font-mono text-[10px]">
                      <span className="text-slate-500">Hash: <span className="text-emerald-300">{stage.hash}</span></span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyHash(stage.hash);
                        }}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        {copiedHash === stage.hash ? dict.sandbox.copied : dict.sandbox.copyHash}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Disclaimer Card */}
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3.5 text-xs leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <span>{dict.sandbox.consumerNotice}</span>
        </div>
      </div>
    </div>
  );
}
