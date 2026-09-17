import { describe, expect, test } from "bun:test";

import { parseCheckDiScanValue } from "@/lib/client-scan";
import { productVisualForName } from "@/lib/product-visuals";

describe("consumer scan helpers", () => {
  test("extracts public ID from a Check-Di verify URL", () => {
    expect(parseCheckDiScanValue("https://check-di.example/verify/DUR-260830-01")).toBe("DUR-260830-01");
  });

  test("accepts a raw batch ID and removes unsafe characters", () => {
    expect(parseCheckDiScanValue(" DUR-260830-01 ")).toBe("DUR-260830-01");
    expect(parseCheckDiScanValue("DUR 260830 01")).toBe("DUR26083001");
  });

  test("maps product names to stable visual categories", () => {
    expect(productVisualForName("Sầu riêng Ri6").kind).toBe("durian");
    expect(productVisualForName("Tôm thẻ chân trắng").kind).toBe("seafood");
    expect(productVisualForName("Gạo ST25").kind).toBe("rice");
  });
});
