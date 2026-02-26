/**
 * Pawtrait Pros — Gelato Greeting Card Configuration
 *
 * Products: Flat 5×7 and Folded 5×7 greeting cards (5R format = 177.8×127mm).
 * Occasions: 12 card occasions, all available year-round, seasonal ones highlighted.
 *
 * Gelato uses productUid strings. The UIDs below were discovered via the
 * Gelato Product API (/catalogs/cards/products:search and /catalogs/folded-cards/products:search).
 *
 * Card artwork is generated server-side using sharp — portrait composited onto
 * occasion-themed templates. Gelato just prints whatever artwork we send.
 */

// --- PRODUCT TYPES ---

export interface GelatoCardProduct {
  productUid: string;
  name: string;
  format: "flat" | "folded";
  size: string;
  priceCents: number;
  artworkFiles: Array<{ type: string; description: string }>;
}

// Validated UIDs from Gelato Product API (5R = 5×7", 130lb coated silk, 4-4, matte)
export const GELATO_CARD_FLAT_5x7_PRODUCT_UID =
  "cards_pf_5r_pt_130-lb-cover-coated-silk_cl_4-4_ct_matt-protection_prt_1-1_ver";

export const GELATO_CARD_FOLDED_5x7_PRODUCT_UID =
  "brochures_pf_5r_pt_130-lb-cover-coated-silk_cl_4-4_ft_fold-ver_ct_matt-protection_prt_1-1_ver";

export const GELATO_PRODUCTS: Record<string, GelatoCardProduct> = {
  card_flat_5x7: {
    productUid: GELATO_CARD_FLAT_5x7_PRODUCT_UID,
    name: "Flat Greeting Card — 5×7",
    format: "flat",
    size: "5x7",
    priceCents: 1500,
    artworkFiles: [
      { type: "default", description: "Front artwork (print-ready PNG/JPG)" },
      { type: "back", description: "Back artwork (print-ready PNG/JPG)" },
    ],
  },
  card_folded_5x7: {
    productUid: GELATO_CARD_FOLDED_5x7_PRODUCT_UID,
    name: "Folded Greeting Card — 5×7",
    format: "folded",
    size: "5x7",
    priceCents: 2000,
    artworkFiles: [
      { type: "default", description: "Outside artwork — front cover + back when folded" },
      { type: "inside", description: "Inside artwork (greeting text spread)" },
    ],
  },
};

export function getGelatoProduct(key: string): GelatoCardProduct | undefined {
  return GELATO_PRODUCTS[key];
}

export function getAllGelatoProducts(): GelatoCardProduct[] {
  return Object.values(GELATO_PRODUCTS);
}

// --- CARD DIMENSIONS (pixels at 300 DPI) ---

// 5R = 177.8×127mm = 7×5" → at 300 DPI = 2100×1500px
// Vertical orientation means the 5" (127mm) is width, 7" (177.8mm) is height → 1500×2100px
export const CARD_DIMENSIONS = {
  flat_front: { width: 1500, height: 2100 },  // portrait orientation
  flat_back: { width: 1500, height: 2100 },
  folded_outside: { width: 1500, height: 2100 },  // outside when closed (front cover visible)
  folded_inside: { width: 1500, height: 2100 },   // inside spread when opened
};

// --- OCCASIONS ---

export interface CardOccasion {
  id: string;
  name: string;
  greetingText: string;
  subText: string;
  seasonalMonths: number[] | null; // null = always; month indices 0-11
  sortOrder: number;
  templateColors: {
    primary: string;    // main accent color
    secondary: string;  // background/border color
    textColor: string;  // text on card
  };
}

export const CARD_OCCASIONS: CardOccasion[] = [
  {
    id: "birthday",
    name: "Birthday",
    greetingText: "Happy Birthday!",
    subText: "Wishing you a day full of treats and belly rubs!",
    seasonalMonths: null,
    sortOrder: 1,
    templateColors: { primary: "#FF6B35", secondary: "#FFF0E6", textColor: "#CC4400" }, // warm orange
  },
  {
    id: "thank_you",
    name: "Thank You",
    greetingText: "Thank You!",
    subText: "Your kindness means the world to us.",
    seasonalMonths: null,
    sortOrder: 2,
    templateColors: { primary: "#2E8B57", secondary: "#E0F2E9", textColor: "#1B5E3A" }, // sea green
  },
  {
    id: "congratulations",
    name: "Congratulations",
    greetingText: "Congratulations!",
    subText: "Here's to celebrating this special moment!",
    seasonalMonths: null,
    sortOrder: 3,
    templateColors: { primary: "#DAA520", secondary: "#FDF5DC", textColor: "#8B6914" }, // goldenrod
  },
  {
    id: "get_well",
    name: "Get Well Soon",
    greetingText: "Get Well Soon!",
    subText: "Sending warm thoughts and healing vibes your way.",
    seasonalMonths: null,
    sortOrder: 4,
    templateColors: { primary: "#4A90D9", secondary: "#E1EFFA", textColor: "#2A5FAA" }, // cornflower blue
  },
  {
    id: "thinking_of_you",
    name: "Thinking of You",
    greetingText: "Thinking of You",
    subText: "Just a little reminder that someone cares.",
    seasonalMonths: null,
    sortOrder: 5,
    templateColors: { primary: "#9B59B6", secondary: "#F0E4F7", textColor: "#6C3483" }, // soft purple
  },
  {
    id: "valentines",
    name: "Valentine's Day",
    greetingText: "Be My Valentine!",
    subText: "You make my heart do zoomies!",
    seasonalMonths: [0, 1], // Jan–Feb
    sortOrder: 10,
    templateColors: { primary: "#E91E63", secondary: "#FDDDE6", textColor: "#AD1457" }, // hot pink
  },
  {
    id: "easter",
    name: "Easter / Spring",
    greetingText: "Happy Easter!",
    subText: "Hoppy Easter from your favorite fur baby!",
    seasonalMonths: [2, 3], // Mar–Apr
    sortOrder: 11,
    templateColors: { primary: "#7CB342", secondary: "#EDF5E0", textColor: "#4E7A1E" }, // spring green
  },
  {
    id: "mothers_day",
    name: "Mother's Day",
    greetingText: "Happy Mother's Day!",
    subText: "To the best pet mom — with love and slobbery kisses.",
    seasonalMonths: [3, 4], // Apr–May
    sortOrder: 12,
    templateColors: { primary: "#E84393", secondary: "#FDE0ED", textColor: "#B5176D" }, // rose pink
  },
  {
    id: "fathers_day",
    name: "Father's Day",
    greetingText: "Happy Father's Day!",
    subText: "To the best pet dad — thanks for all the walks and treats.",
    seasonalMonths: [4, 5], // May–Jun
    sortOrder: 13,
    templateColors: { primary: "#2C3E7B", secondary: "#DEE3F2", textColor: "#1A2550" }, // navy blue
  },
  {
    id: "halloween",
    name: "Halloween",
    greetingText: "Happy Halloween!",
    subText: "Have a spooktacular day!",
    seasonalMonths: [8, 9], // Sep–Oct
    sortOrder: 14,
    templateColors: { primary: "#FF6F00", secondary: "#FFE8CC", textColor: "#CC5800" }, // pumpkin orange
  },
  {
    id: "holiday",
    name: "Holiday / Christmas",
    greetingText: "Happy Holidays!",
    subText: "Wishing you a season full of joy, love, and treats!",
    seasonalMonths: [10, 11], // Nov–Dec
    sortOrder: 15,
    templateColors: { primary: "#1B7A3D", secondary: "#DFF0E5", textColor: "#145C2E" }, // christmas green
  },
  {
    id: "new_year",
    name: "New Year",
    greetingText: "Happy New Year!",
    subText: "Here's to a pawsome new year together!",
    seasonalMonths: [11, 0], // Dec–Jan
    sortOrder: 16,
    templateColors: { primary: "#C0A000", secondary: "#FAF6DC", textColor: "#8B7500" }, // champagne gold
  },
];

// --- OCCASION HELPERS ---

export function getOccasion(id: string): CardOccasion | undefined {
  return CARD_OCCASIONS.find((o) => o.id === id);
}

export function getAllOccasions(): CardOccasion[] {
  return CARD_OCCASIONS;
}

/**
 * Returns all occasions sorted for display: seasonal (featured) ones first for the
 * given month, then evergreen ones, then off-season ones.
 */
export function sortOccasionsForDisplay(month: number): Array<CardOccasion & { featured: boolean }> {
  return CARD_OCCASIONS
    .map((o) => ({
      ...o,
      featured: o.seasonalMonths !== null && o.seasonalMonths.includes(month),
    }))
    .sort((a, b) => {
      // Featured first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      // Then evergreen (no seasonal months)
      const aEvergreen = a.seasonalMonths === null;
      const bEvergreen = b.seasonalMonths === null;
      if (aEvergreen && !bEvergreen) return -1;
      if (!aEvergreen && bEvergreen) return 1;
      // Then by sortOrder
      return a.sortOrder - b.sortOrder;
    });
}
