/**
 * Pawtrait Pros — Pack Configuration
 *
 * Each industry vertical shows exactly 3 packs.
 * Each pack contains exactly 6 existing portrait style IDs.
 * Staff never browses the full style catalog — only pack buttons.
 * Regeneration is within-pack only.
 *
 * Style IDs reference portrait-styles.ts (dog: 1-28, cat: 101-116)
 */

export type IndustryType = "groomer" | "boarding" | "daycare";
export type PackType = "seasonal" | "fun" | "artistic";
export type Season = "spring" | "summer" | "fall" | "winter";

export interface Pack {
  type: PackType;
  name: string;
  description: string;
  styleIds: number[];
}

// --- SEASONAL PACKS (auto-rotate by current date) ---
// Each season has 6 styles per species

const DOG_SEASONAL: Record<Season, number[]> = {
  spring: [22, 16, 21, 5, 26, 17],    // Flower Crown, Garden Party, Picnic, Art Nouveau, Impressionist, Beach
  summer: [17, 21, 28, 18, 9, 16],     // Beach, Picnic, Yoga, Mountain, Space, Garden Party
  fall:   [20, 10, 19, 15, 8, 25],     // Autumn Leaves, Halloween, Cozy Cabin, Country Cowboy, Cozy PJs, Baroque
  winter: [23, 19, 8, 1, 2, 3],        // Holiday Spirit, Cozy Cabin, Cozy PJs, Renaissance, Victorian, Royal
};

const CAT_SEASONAL: Record<Season, number[]> = {
  spring: [114, 109, 116, 102, 106, 104], // Spring Blossoms, Garden Explorer, Tea Party, Renaissance, Purrista, Sunbeam
  summer: [109, 116, 106, 105, 107, 115], // Garden Explorer, Tea Party, Purrista, Space Cadet, Midnight Prowler, Box Inspector
  fall:   [112, 104, 111, 103, 108, 101], // Halloween Cat, Sunbeam, Cozy Blanket, Victorian Lady, Bookshelf, Egyptian
  winter: [113, 111, 104, 102, 103, 108], // Holiday Stocking, Cozy Blanket, Sunbeam, Renaissance, Victorian, Bookshelf
};

// --- FUN PACKS (rotate quarterly — different selection per vertical) ---

const DOG_FUN: Record<IndustryType, number[]> = {
  groomer:  [6, 14, 12, 27, 11, 7],   // Steampunk, Superhero, Pirate, Taco Tuesday, Birthday, Tutu
  boarding: [18, 13, 15, 9, 17, 21],   // Mountain, Cowboy Sheriff, Country Cowboy, Space, Beach, Picnic
  daycare:  [14, 11, 27, 28, 17, 6],   // Superhero, Birthday, Taco, Yoga, Beach, Steampunk
};

const CAT_FUN: Record<IndustryType, number[]> = {
  groomer:  [106, 115, 116, 109, 105, 107], // Purrista, Box Inspector, Tea Party, Garden Explorer, Space Cadet, Midnight
  boarding: [107, 105, 109, 115, 106, 116], // Midnight, Space Cadet, Garden Explorer, Box Inspector, Purrista, Tea Party
  daycare:  [115, 106, 105, 116, 109, 107], // Box Inspector, Purrista, Space Cadet, Tea Party, Garden, Midnight
};

// --- ARTISTIC PACKS (rotate quarterly — different selection per vertical) ---

const DOG_ARTISTIC: Record<IndustryType, number[]> = {
  groomer:  [5, 26, 24, 1, 25, 3],    // Art Nouveau, Impressionist, Vintage, Renaissance, Baroque, Royal
  boarding: [24, 26, 5, 1, 2, 20],     // Vintage, Impressionist, Art Nouveau, Renaissance, Victorian, Autumn
  daycare:  [5, 26, 24, 1, 25, 2],     // Art Nouveau, Impressionist, Vintage, Renaissance, Baroque, Victorian
};

const CAT_ARTISTIC: Record<IndustryType, number[]> = {
  groomer:  [101, 102, 103, 104, 108, 111], // Egyptian, Renaissance, Victorian, Sunbeam, Bookshelf, Cozy Blanket
  boarding: [102, 103, 104, 111, 108, 101], // Renaissance, Victorian, Sunbeam, Cozy Blanket, Bookshelf, Egyptian
  daycare:  [104, 102, 103, 101, 111, 108], // Sunbeam, Renaissance, Victorian, Egyptian, Cozy Blanket, Bookshelf
};

// --- PACK DESCRIPTIONS ---

const PACK_DESCRIPTIONS: Record<IndustryType, Record<PackType, { name: string; description: string }>> = {
  groomer: {
    seasonal: { name: "Seasonal", description: "Checkout impulse & gifting — styles that match the season" },
    fun: { name: "Fun", description: "Costumes & playful looks — perfect for mugs & totes" },
    artistic: { name: "Artistic", description: "Fine art & prints — elegant framed keepsakes" },
  },
  boarding: {
    seasonal: { name: "Seasonal", description: "\"While you were away\" memories — warm seasonal moments" },
    fun: { name: "Fun", description: "Playtime & camp vibes — adventure-filled styles" },
    artistic: { name: "Artistic", description: "Keepsake prints — approachable fine art portraits" },
  },
  daycare: {
    seasonal: { name: "Seasonal", description: "Repeat engagement — bright seasonal favorites" },
    fun: { name: "Fun", description: "Fast dopamine — bold, shareable, instantly recognizable" },
    artistic: { name: "Artistic", description: "Premium option — top-converting art styles" },
  },
};

// --- PUBLIC API ---

export function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function getCurrentPacks(industryType: IndustryType, species: "dog" | "cat"): Pack[] {
  const season = getCurrentSeason();
  const descriptions = PACK_DESCRIPTIONS[industryType];

  const seasonalStyles = species === "dog" ? DOG_SEASONAL[season] : CAT_SEASONAL[season];
  const funStyles = species === "dog" ? DOG_FUN[industryType] : CAT_FUN[industryType];
  const artisticStyles = species === "dog" ? DOG_ARTISTIC[industryType] : CAT_ARTISTIC[industryType];

  return [
    {
      type: "seasonal",
      name: descriptions.seasonal.name,
      description: descriptions.seasonal.description,
      styleIds: seasonalStyles,
    },
    {
      type: "fun",
      name: descriptions.fun.name,
      description: descriptions.fun.description,
      styleIds: funStyles,
    },
    {
      type: "artistic",
      name: descriptions.artistic.name,
      description: descriptions.artistic.description,
      styleIds: artisticStyles,
    },
  ];
}

export function getPackByType(industryType: IndustryType, species: "dog" | "cat", packType: PackType): Pack | undefined {
  return getCurrentPacks(industryType, species).find(p => p.type === packType);
}

export function isStyleInPack(styleId: number, industryType: IndustryType, species: "dog" | "cat", packType: PackType): boolean {
  const pack = getPackByType(industryType, species, packType);
  return pack ? pack.styleIds.includes(styleId) : false;
}

/** Returns all style IDs used in any pack (all seasons, all industries, both species) */
export function getAllPackStyleIds(): Set<number> {
  const ids = new Set<number>();
  const industries: IndustryType[] = ["groomer", "boarding", "daycare"];
  const seasons: Season[] = ["spring", "summer", "fall", "winter"];
  for (const season of seasons) {
    for (const id of DOG_SEASONAL[season]) ids.add(id);
    for (const id of CAT_SEASONAL[season]) ids.add(id);
  }
  for (const industry of industries) {
    for (const id of DOG_FUN[industry]) ids.add(id);
    for (const id of CAT_FUN[industry]) ids.add(id);
    for (const id of DOG_ARTISTIC[industry]) ids.add(id);
    for (const id of CAT_ARTISTIC[industry]) ids.add(id);
  }
  return ids;
}

/** Returns all style IDs for a given pack type (across all seasons/industries/species) */
export function getStyleIdsForPackType(packType: PackType): Set<number> {
  const ids = new Set<number>();
  const industries: IndustryType[] = ["groomer", "boarding", "daycare"];
  const seasons: Season[] = ["spring", "summer", "fall", "winter"];
  if (packType === "seasonal") {
    for (const season of seasons) {
      for (const id of DOG_SEASONAL[season]) ids.add(id);
      for (const id of CAT_SEASONAL[season]) ids.add(id);
    }
  } else if (packType === "fun") {
    for (const industry of industries) {
      for (const id of DOG_FUN[industry]) ids.add(id);
      for (const id of CAT_FUN[industry]) ids.add(id);
    }
  } else {
    for (const industry of industries) {
      for (const id of DOG_ARTISTIC[industry]) ids.add(id);
      for (const id of CAT_ARTISTIC[industry]) ids.add(id);
    }
  }
  return ids;
}
