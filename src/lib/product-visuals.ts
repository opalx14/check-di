export type ProductVisual = {
  kind: "durian" | "seafood" | "rice" | "produce";
  label: string;
  imageUrl: string;
  accent: string;
};

const VISUALS: Record<ProductVisual["kind"], ProductVisual> = {
  durian: {
    kind: "durian",
    label: "Nông sản",
    imageUrl:
      "https://images.unsplash.com/photo-1764232288881-a9293b590410?auto=format&fit=crop&w=1400&q=85",
    accent: "from-emerald-500/35 to-lime-500/10",
  },
  seafood: {
    kind: "seafood",
    label: "Hải sản",
    imageUrl:
      "https://images.unsplash.com/photo-1756364084889-9a8d9ece6112?auto=format&fit=crop&w=1400&q=85",
    accent: "from-cyan-500/35 to-sky-500/10",
  },
  rice: {
    kind: "rice",
    label: "Nông sản",
    imageUrl:
      "https://images.unsplash.com/photo-1559720688-a2fe92ca2902?auto=format&fit=crop&w=1400&q=85",
    accent: "from-amber-500/35 to-emerald-500/10",
  },
  produce: {
    kind: "produce",
    label: "Sản phẩm",
    imageUrl:
      "https://images.unsplash.com/photo-1764232288881-a9293b590410?auto=format&fit=crop&w=1400&q=82",
    accent: "from-emerald-500/30 to-cyan-500/10",
  },
};

export function productVisualForName(productName: string): ProductVisual {
  const value = productName.toLowerCase();
  if (value.includes("sầu riêng") || value.includes("durian")) return VISUALS.durian;
  if (
    value.includes("tôm") ||
    value.includes("shrimp") ||
    value.includes("prawn") ||
    value.includes("cá") ||
    value.includes("seafood") ||
    value.includes("hải sản")
  ) {
    return VISUALS.seafood;
  }
  if (value.includes("gạo") || value.includes("rice") || value.includes("lúa")) return VISUALS.rice;
  return VISUALS.produce;
}

export const PRODUCT_VISUAL_EXAMPLES = [
  { name: "Sầu riêng Ri6", origin: "Đắk Lắk", visual: VISUALS.durian },
  { name: "Tôm thẻ chân trắng", origin: "Bạc Liêu", visual: VISUALS.seafood },
  { name: "Gạo ST25", origin: "Sóc Trăng", visual: VISUALS.rice },
] as const;
