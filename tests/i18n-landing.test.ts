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

describe("landing i18n completeness", () => {
  test("keeps nav and hero translation keys in parity", () => {
    expect(leafKeys(en.nav).sort()).toEqual(leafKeys(vi.nav).sort());
    expect(leafKeys(en.hero).sort()).toEqual(leafKeys(vi.hero).sort());

    expect(en.nav.productInventory).toBe("Product inventory");
    expect(vi.nav.productInventory).toBe("Kho sản phẩm");
    expect(en.nav.scanQr).toBe("Scan QR");
    expect(vi.nav.scanQr).toBe("Quét QR");
  });

  test("keeps quick lookup copy in parity", () => {
    expect(leafKeys(en.quickLookup).sort()).toEqual(
      leafKeys(vi.quickLookup).sort(),
    );
    expect(en.quickLookup.title).toBe("Have a batch ID? Verify it now.");
    expect(vi.quickLookup.title).toBe("Có mã lô? Kiểm tra ngay.");
  });

  test("translates hero proof summary labels", () => {
    expect(en.hero.journeyCountValue).toBe("5 stages");
    expect(vi.hero.journeyCountValue).toBe("5 chặng");
    expect(en.hero.qrReadyLabel).toBe("view journey");
    expect(vi.hero.qrReadyLabel).toBe("xem hành trình");
  });
});
