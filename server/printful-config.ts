/**
 * Pawtrait Pros — Printful Product Configuration
 *
 * All confirmed Printful variant IDs for merch products.
 * Prices are retail (what the customer pays).
 * Printful charges wholesale; the difference is margin.
 *
 * Pricing strategy (Fable-benchmarked):
 *   - Prints, cards: ~90% gross margin
 *   - Mugs: ~85% gross margin
 *   - Framed prints, totes: ~80% gross margin
 *   - 70/30 profit split (business 70%, Pawtrait Pros 30%)
 *
 * IMPORTANT: These variant IDs are confirmed and must not be changed
 * without verifying against Printful's catalog API.
 */

export interface PrintfulProduct {
  variantId: number;
  name: string;
  category: "print" | "frame" | "mug" | "tote";
  size?: string;
  frameColor?: string;
  priceCents: number; // retail price
}

export const PRINTFUL_PRODUCTS: Record<string, PrintfulProduct> = {
  // --- UNFRAMED MATTE PRINT ---
  print_8x10: {
    variantId: 4463,
    name: "Enhanced Matte Print — 8×10",
    category: "print",
    size: "8x10",
    priceCents: 8900, // $89.00
  },

  // --- MUGS ---
  mug_11oz: {
    variantId: 1320,
    name: "White Glossy Mug — 11 oz",
    category: "mug",
    size: "11oz",
    priceCents: 4000, // $40.00
  },
  mug_15oz: {
    variantId: 4830,
    name: "White Glossy Mug — 15 oz",
    category: "mug",
    size: "15oz",
    priceCents: 4500, // $45.00
  },

  // --- TOTE ---
  tote_natural: {
    variantId: 4533,
    name: "All-Over Print Tote Bag",
    category: "tote",
    priceCents: 8500, // $85.00
  },

  // --- FRAMED PRINTS: 8×10 ---
  frame_8x10_wood: {
    variantId: 11790,
    name: "Framed Poster 8×10 — Wood",
    category: "frame",
    size: "8x10",
    frameColor: "wood",
    priceCents: 13500, // $135.00
  },
  frame_8x10_black: {
    variantId: 11789,
    name: "Framed Poster 8×10 — Black",
    category: "frame",
    size: "8x10",
    frameColor: "black",
    priceCents: 13500,
  },
  frame_8x10_white: {
    variantId: 11791,
    name: "Framed Poster 8×10 — White",
    category: "frame",
    size: "8x10",
    frameColor: "white",
    priceCents: 13500,
  },

  // --- FRAMED PRINTS: 11×14 ---
  frame_11x14_wood: {
    variantId: 11793,
    name: "Framed Poster 11×14 — Wood",
    category: "frame",
    size: "11x14",
    frameColor: "wood",
    priceCents: 16900, // $169.00
  },
  frame_11x14_black: {
    variantId: 11792,
    name: "Framed Poster 11×14 — Black",
    category: "frame",
    size: "11x14",
    frameColor: "black",
    priceCents: 16900,
  },
  frame_11x14_white: {
    variantId: 11794,
    name: "Framed Poster 11×14 — White",
    category: "frame",
    size: "11x14",
    frameColor: "white",
    priceCents: 16900,
  },

  // --- FRAMED PRINTS: 12×16 ---
  frame_12x16_wood: {
    variantId: 11796,
    name: "Framed Poster 12×16 — Wood",
    category: "frame",
    size: "12x16",
    frameColor: "wood",
    priceCents: 20900, // $209.00
  },
  frame_12x16_black: {
    variantId: 11795,
    name: "Framed Poster 12×16 — Black",
    category: "frame",
    size: "12x16",
    frameColor: "black",
    priceCents: 20900,
  },
  frame_12x16_white: {
    variantId: 11797,
    name: "Framed Poster 12×16 — White",
    category: "frame",
    size: "12x16",
    frameColor: "white",
    priceCents: 20900,
  },
};

// Helper to get all products by category
export function getProductsByCategory(category: "print" | "frame" | "mug" | "tote"): PrintfulProduct[] {
  return Object.values(PRINTFUL_PRODUCTS).filter(p => p.category === category);
}

// Helper to get a product by key
export function getProduct(key: string): PrintfulProduct | undefined {
  return PRINTFUL_PRODUCTS[key];
}

// Get all frame sizes available
export function getFrameSizes(): string[] {
  return [...new Set(
    Object.values(PRINTFUL_PRODUCTS)
      .filter(p => p.category === "frame" && p.size)
      .map(p => p.size!)
  )];
}

// Get frame colors for a given size
export function getFrameColors(size: string): string[] {
  return Object.values(PRINTFUL_PRODUCTS)
    .filter(p => p.category === "frame" && p.size === size && p.frameColor)
    .map(p => p.frameColor!);
}

// Get the product key for a frame by size + color
export function getFrameKey(size: string, color: string): string | undefined {
  return Object.entries(PRINTFUL_PRODUCTS).find(
    ([, p]) => p.category === "frame" && p.size === size && p.frameColor === color
  )?.[0];
}
