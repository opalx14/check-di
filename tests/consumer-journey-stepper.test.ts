import { describe, expect, test } from "bun:test";

import {
  clampJourneyIndex,
  journeyProgressPercent,
  journeyStepVisualState,
} from "@/lib/consumer/journey-stepper";

describe("consumer journey stepper state", () => {
  test("clamps active index into the available journey", () => {
    expect(clampJourneyIndex(-3, 5)).toBe(0);
    expect(clampJourneyIndex(2.8, 5)).toBe(2);
    expect(clampJourneyIndex(99, 5)).toBe(4);
    expect(clampJourneyIndex(Number.NaN, 5)).toBe(0);
    expect(clampJourneyIndex(2, 0)).toBe(0);
  });

  test("maps first through last step into stable progress", () => {
    expect(journeyProgressPercent(0, 0)).toBe(0);
    expect(journeyProgressPercent(0, 1)).toBe(100);
    expect(journeyProgressPercent(0, 5)).toBe(0);
    expect(journeyProgressPercent(2, 5)).toBe(50);
    expect(journeyProgressPercent(4, 5)).toBe(100);
    expect(journeyProgressPercent(99, 5)).toBe(100);
  });

  test("classifies selected, completed and upcoming steps", () => {
    expect(journeyStepVisualState(1, 2)).toBe("completed");
    expect(journeyStepVisualState(2, 2)).toBe("selected");
    expect(journeyStepVisualState(3, 2)).toBe("upcoming");
  });
});
