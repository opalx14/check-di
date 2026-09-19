import { describe, expect, test } from "bun:test";

import en from "@/lib/i18n/locales/en.json";
import vi from "@/lib/i18n/locales/vi.json";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("consumer i18n completeness", () => {
  test("keeps consumer verify translation keys in parity", () => {
    expect(leafKeys(en.consumerVerify).sort()).toEqual(
      leafKeys(vi.consumerVerify).sort(),
    );
    expect(en.consumerVerify.independentAction).toBe("Run independent check");
    expect(vi.consumerVerify.independentAction).toBe("Kiểm tra độc lập");
  });

  test("keeps consumer scan translation keys in parity", () => {
    expect(leafKeys(en.consumerScan).sort()).toEqual(
      leafKeys(vi.consumerScan).sort(),
    );
    expect(en.consumerScan.title).toBe("Scan QR. View the journey.");
    expect(vi.consumerScan.title).toBe("Quét QR. Xem hành trình.");
  });
});
