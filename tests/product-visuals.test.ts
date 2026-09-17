import { describe, expect, test } from "bun:test";

import {
  DEFAULT_PRODUCT,
  PRODUCT_CATALOG,
  productVisualForName,
} from "@/lib/product-visuals";

describe("product visual catalog", () => {
  test("offers at least twenty fruit choices and defaults to watermelon", () => {
    const fruits = PRODUCT_CATALOG.filter((item) => item.category === "fruit");
    expect(fruits.length).toBeGreaterThanOrEqual(20);
    expect(DEFAULT_PRODUCT.name.toLowerCase()).toContain("dưa hấu");
    expect(productVisualForName("Dưa hấu Hắc Mỹ Nhân").kind).toBe("watermelon");
    expect(productVisualForName("Thanh long ruột đỏ").kind).toBe("dragon-fruit");
  });
});
