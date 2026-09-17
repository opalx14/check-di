export type ProductVisual = {
  kind: "watermelon" | "durian" | "dragon-fruit" | "citrus" | "tropical" | "berry" | "seafood" | "rice" | "produce";
  label: string;
  imageUrl: string;
  accent: string;
};

export type ProductCatalogItem = {
  name: string;
  emoji: string;
  category: "fruit" | "seafood" | "rice";
  keywords: string[];
  visual: ProductVisual;
};

const VISUALS: Record<ProductVisual["kind"], ProductVisual> = {
  watermelon: {
    kind: "watermelon",
    label: "Trái cây",
    imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1400&q=85",
    accent: "from-emerald-500/35 to-rose-500/10",
  },
  durian: {
    kind: "durian",
    label: "Trái cây",
    imageUrl: "https://images.unsplash.com/photo-1764232288881-a9293b590410?auto=format&fit=crop&w=1400&q=85",
    accent: "from-emerald-500/35 to-lime-500/10",
  },
  "dragon-fruit": {
    kind: "dragon-fruit",
    label: "Trái cây",
    imageUrl: "https://images.unsplash.com/photo-1527325678964-54921661f888?auto=format&fit=crop&w=1400&q=85",
    accent: "from-fuchsia-500/30 to-emerald-500/10",
  },
  citrus: {
    kind: "citrus",
    label: "Trái cây",
    imageUrl: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=1400&q=85",
    accent: "from-orange-500/35 to-amber-500/10",
  },
  tropical: {
    kind: "tropical",
    label: "Trái cây",
    imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1400&q=85",
    accent: "from-amber-500/30 to-emerald-500/10",
  },
  berry: {
    kind: "berry",
    label: "Trái cây",
    imageUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1400&q=85",
    accent: "from-rose-500/35 to-red-500/10",
  },
  seafood: {
    kind: "seafood",
    label: "Hải sản",
    imageUrl: "https://images.unsplash.com/photo-1756364084889-9a8d9ece6112?auto=format&fit=crop&w=1400&q=85",
    accent: "from-cyan-500/35 to-sky-500/10",
  },
  rice: {
    kind: "rice",
    label: "Nông sản",
    imageUrl: "https://images.unsplash.com/photo-1559720688-a2fe92ca2902?auto=format&fit=crop&w=1400&q=85",
    accent: "from-amber-500/35 to-emerald-500/10",
  },
  produce: {
    kind: "produce",
    label: "Nông sản",
    imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1400&q=85",
    accent: "from-emerald-500/30 to-cyan-500/10",
  },
};

function fruit(
  name: string,
  emoji: string,
  keywords: string[],
  visual: ProductVisual,
): ProductCatalogItem {
  return { name, emoji, keywords, visual, category: "fruit" };
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  fruit("Dưa hấu Hắc Mỹ Nhân", "🍉", ["dưa hấu", "watermelon"], VISUALS.watermelon),
  fruit("Thanh long ruột đỏ", "🐉", ["thanh long", "dragon fruit"], VISUALS["dragon-fruit"]),
  fruit("Sầu riêng Ri6", "🌳", ["sầu riêng", "durian"], VISUALS.durian),
  fruit("Xoài cát Hòa Lộc", "🥭", ["xoài", "mango"], VISUALS.tropical),
  fruit("Cam sành", "🍊", ["cam", "orange"], VISUALS.citrus),
  fruit("Bưởi da xanh", "🍈", ["bưởi", "pomelo", "grapefruit"], VISUALS.citrus),
  fruit("Quýt đường", "🍊", ["quýt", "tangerine", "mandarin"], VISUALS.citrus),
  fruit("Chanh không hạt", "🍋", ["chanh", "lemon", "lime"], VISUALS.citrus),
  fruit("Chuối già Nam Mỹ", "🍌", ["chuối", "banana"], VISUALS.tropical),
  fruit("Dứa / Khóm", "🍍", ["dứa", "khóm", "thơm", "pineapple"], VISUALS.tropical),
  fruit("Mít Thái", "🌿", ["mít", "jackfruit"], VISUALS.tropical),
  fruit("Đu đủ ruột đỏ", "🧡", ["đu đủ", "papaya"], VISUALS.tropical),
  fruit("Ổi lê", "🍐", ["ổi", "guava"], VISUALS.produce),
  fruit("Nhãn xuồng", "🟤", ["nhãn", "longan"], VISUALS.tropical),
  fruit("Vải thiều", "🔴", ["vải", "lychee"], VISUALS.berry),
  fruit("Chôm chôm", "🔴", ["chôm chôm", "rambutan"], VISUALS.berry),
  fruit("Măng cụt", "🟣", ["măng cụt", "mangosteen"], VISUALS.tropical),
  fruit("Bơ sáp", "🥑", ["bơ", "avocado"], VISUALS.tropical),
  fruit("Dâu tây Đà Lạt", "🍓", ["dâu", "strawberry"], VISUALS.berry),
  fruit("Nho Ninh Thuận", "🍇", ["nho", "grape"], VISUALS.berry),
  fruit("Chanh dây", "🟣", ["chanh dây", "passion fruit"], VISUALS.tropical),
  fruit("Dưa lưới", "🍈", ["dưa lưới", "melon", "cantaloupe"], VISUALS.watermelon),
  fruit("Táo", "🍎", ["táo", "apple"], VISUALS.produce),
  fruit("Lê", "🍐", ["lê", "pear"], VISUALS.produce),
  fruit("Đào", "🍑", ["đào", "peach"], VISUALS.berry),
  fruit("Mận", "🫐", ["mận", "plum"], VISUALS.berry),
  {
    name: "Tôm thẻ chân trắng",
    emoji: "🦐",
    category: "seafood",
    keywords: ["tôm", "shrimp", "prawn", "hải sản", "seafood", "cá"],
    visual: VISUALS.seafood,
  },
  {
    name: "Gạo ST25",
    emoji: "🌾",
    category: "rice",
    keywords: ["gạo", "rice", "lúa"],
    visual: VISUALS.rice,
  },
];

export function productVisualForName(productName: string): ProductVisual {
  const value = productName.toLowerCase();
  const matched = PRODUCT_CATALOG.find((item) =>
    item.keywords.some((keyword) => value.includes(keyword.toLowerCase())),
  );
  return matched?.visual ?? VISUALS.produce;
}

export const DEFAULT_PRODUCT = PRODUCT_CATALOG[0];

export const PRODUCT_VISUAL_EXAMPLES = [
  { name: "Dưa hấu Hắc Mỹ Nhân", origin: "Long An", visual: VISUALS.watermelon },
  { name: "Thanh long ruột đỏ", origin: "Bình Thuận", visual: VISUALS["dragon-fruit"] },
  { name: "Sầu riêng Ri6", origin: "Đắk Lắk", visual: VISUALS.durian },
  { name: "Xoài cát Hòa Lộc", origin: "Tiền Giang", visual: VISUALS.tropical },
  { name: "Tôm thẻ chân trắng", origin: "Bạc Liêu", visual: VISUALS.seafood },
] as const;
