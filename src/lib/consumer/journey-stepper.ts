export function clampJourneyIndex(index: number, length: number) {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), length - 1);
}

export function journeyProgressPercent(index: number, length: number) {
  if (length <= 1) return length === 1 ? 100 : 0;
  return (clampJourneyIndex(index, length) / (length - 1)) * 100;
}

export function journeyStepVisualState(index: number, activeIndex: number) {
  if (index === activeIndex) return "selected" as const;
  if (index < activeIndex) return "completed" as const;
  return "upcoming" as const;
}
