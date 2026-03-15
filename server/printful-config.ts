/**
 * Pawtrait Pros — Printful Product Configuration
 *
 * All confirmed Printful variant IDs for merch products.
 * Product 2: Enhanced Matte Paper Framed Poster (in)
 * Product 19: White Glossy Mug
 * Product 84: All-Over Print Tote Bag
 *
 * Pricing strategy:
 *   - Frames: 79% gross margin
 *   - Mugs & Totes: 80% gross margin
 *   - 70/30 profit split (Pawtrait Pros 70%, business 30%)
 *
 * Wholesale costs verified from Printful API on 2026-03-14.
 * IMPORTANT: These variant IDs are confirmed against Printful product 2 (inch version).
 */

export interface PrintfulProduct {
  variantId: number;
  name: string;
  category: "frame" | "mug" | "tote";
  size?: string;
  frameColor?: string;
  priceCents: number; // retail price
  wholesaleCostCents: number; // Printful wholesale cost per unit
}

export const PRINTFUL_PRODUCTS: Record<string, PrintfulProduct> = {
  // --- MUGS (product 19) ---
  mug_11oz: {
    variantId: 1320,
    name: "White Glossy Mug — 11 oz",
    category: "mug",
    size: "11oz",
    priceCents: 3000, // $30.00 (80% margin)
    wholesaleCostCents: 595, // $5.95
  },
  mug_15oz: {
    variantId: 4830,
    name: "White Glossy Mug — 15 oz",
    category: "mug",
    size: "15oz",
    priceCents: 4000, // $40.00 (80% margin)
    wholesaleCostCents: 795, // $7.95
  },

  // --- TOTE (product 84) ---
  tote_natural: {
    variantId: 4533,
    name: "All-Over Print Tote Bag",
    category: "tote",
    priceCents: 8600, // $86.00 (80% margin)
    wholesaleCostCents: 1725, // $17.25
  },

  // --- FRAMED PRINTS: 8×10 (product 2) ---
  frame_8x10_wood: {
    variantId: 15021,
    name: "Framed Poster 8×10 — Wood",
    category: "frame",
    size: "8x10",
    frameColor: "wood",
    priceCents: 9700, // $97.00 (79% margin)
    wholesaleCostCents: 2035, // $20.35
  },
  frame_8x10_black: {
    variantId: 4651,
    name: "Framed Poster 8×10 — Black",
    category: "frame",
    size: "8x10",
    frameColor: "black",
    priceCents: 9700,
    wholesaleCostCents: 2035,
  },
  frame_8x10_white: {
    variantId: 10754,
    name: "Framed Poster 8×10 — White",
    category: "frame",
    size: "8x10",
    frameColor: "white",
    priceCents: 9700,
    wholesaleCostCents: 2035,
  },

  // --- FRAMED PRINTS: 11×14 (product 2) ---
  frame_11x14_wood: {
    variantId: 15023,
    name: "Framed Poster 11×14 — Wood",
    category: "frame",
    size: "11x14",
    frameColor: "wood",
    priceCents: 14300, // $143.00 (79% margin)
    wholesaleCostCents: 3009, // $30.09
  },
  frame_11x14_black: {
    variantId: 14292,
    name: "Framed Poster 11×14 — Black",
    category: "frame",
    size: "11x14",
    frameColor: "black",
    priceCents: 14300,
    wholesaleCostCents: 3009,
  },
  frame_11x14_white: {
    variantId: 14293,
    name: "Framed Poster 11×14 — White",
    category: "frame",
    size: "11x14",
    frameColor: "white",
    priceCents: 14300,
    wholesaleCostCents: 3009,
  },

  // --- FRAMED PRINTS: 12×16 (product 2) ---
  frame_12x16_wood: {
    variantId: 15025,
    name: "Framed Poster 12×16 — Wood",
    category: "frame",
    size: "12x16",
    frameColor: "wood",
    priceCents: 15000, // $150.00 (79% margin)
    wholesaleCostCents: 3157, // $31.57
  },
  frame_12x16_black: {
    variantId: 1350,
    name: "Framed Poster 12×16 — Black",
    category: "frame",
    size: "12x16",
    frameColor: "black",
    priceCents: 15000,
    wholesaleCostCents: 3157,
  },
  frame_12x16_white: {
    variantId: 10751,
    name: "Framed Poster 12×16 — White",
    category: "frame",
    size: "12x16",
    frameColor: "white",
    priceCents: 15000,
    wholesaleCostCents: 3157,
  },
};

// Helper to get all products by category
export function getProductsByCategory(category: "frame" | "mug" | "tote"): PrintfulProduct[] {
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
