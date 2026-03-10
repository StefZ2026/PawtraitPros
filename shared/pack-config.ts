/**
 * Pawtrait Pros — Pack Configuration
 *
 * Each species has exactly 3 packs: Celebrate, Fun, Artistic.
 * Each pack contains 3-5 portrait style IDs (fixed, no seasonal rotation).
 * Staff picks one pack PER SPECIES per day.
 * Regeneration is within-pack only.
 *
 * RULES:
 * - CELEBRATE = seasonal, cozy, birthday — warm, celebratory, seasonal vibes
 * - FUN = costumes, characters, adventure, sci-fi, modern — bold & playful
 * - ARTISTIC = classical painting, fine art, refined — elegant keepsakes
 *
 * Style IDs reference portrait-styles.ts (dog: 1-31, cat: 101-119)
 */

export type IndustryType = "groomer" | "boarding" | "daycare";
export type PackType = "celebrate" | "fun" | "artistic";

export interface Pack {
  type: PackType;
  name: string;
  description: string;
  styleIds: number[];
}

// --- DOG PACKS ---

const DOG_PACKS: Record<PackType, Pack> = {
  celebrate: {
    type: "celebrate",
    name: "Celebrate",
    description: "Seasonal favorites, cozy vibes & celebrations",
    styleIds: [23, 22, 10, 19, 11, 20], // Holiday Spirit, Spring Flower Crown, Halloween Pumpkin, Cozy Cabin, Birthday Party, Autumn Leaves
  },
  artistic: {
    type: "artistic",
    name: "Artistic",
    description: "Fine art & classical — elegant framed keepsakes",
    styleIds: [1, 5, 26, 24, 2, 6], // Renaissance Noble, Art Nouveau Beauty, Impressionist Garden, Vintage Classic, Victorian Gentleman, Steampunk Explorer
  },
  fun: {
    type: "fun",
    name: "Fun",
    description: "Costumes, adventures & bold characters",
    styleIds: [14, 12, 17, 29, 30, 31, 16, 15], // Superhero, Pirate Captain, Beach Day, Pool Party, Campfire, Sleepover Party, Garden Party, Country Cowboy
  },
};

// --- CAT PACKS ---

const CAT_PACKS: Record<PackType, Pack> = {
  celebrate: {
    type: "celebrate",
    name: "Celebrate",
    description: "Seasonal favorites, cozy vibes & celebrations",
    styleIds: [112, 113, 114, 104, 111], // Halloween Black Cat, Holiday Stocking, Spring Blossoms, Sunbeam Napper, Cozy Blanket
  },
  artistic: {
    type: "artistic",
    name: "Artistic",
    description: "Refined classical portraits & fine art",
    styleIds: [101, 102, 103, 109], // Egyptian Royalty, Renaissance Feline, Victorian Lady, Garden Explorer
  },
  fun: {
    type: "fun",
    name: "Fun",
    description: "Playful adventures & quirky characters",
    styleIds: [106, 115, 116, 117, 118, 119], // Purrista Barista, Box Inspector, Tea Party Guest, Pool Party, Campfire, Sleepover Party
  },
};

// --- PUBLIC API ---

/** Returns all 3 packs for a given species */
export function getPacks(species: "dog" | "cat"): Pack[] {
  const packs = species === "dog" ? DOG_PACKS : CAT_PACKS;
  return [packs.celebrate, packs.fun, packs.artistic];
}

/** Returns a single pack by type for a species */
export function getPackByType(species: "dog" | "cat", packType: PackType): Pack | undefined {
  const packs = species === "dog" ? DOG_PACKS : CAT_PACKS;
  return packs[packType];
}

/** Check if a style ID belongs to a specific pack */
export function isStyleInPack(styleId: number, species: "dog" | "cat", packType: PackType): boolean {
  const pack = getPackByType(species, packType);
  return pack ? pack.styleIds.includes(styleId) : false;
}

/** Returns all style IDs used in any pack (both species) */
export function getAllPackStyleIds(): Set<number> {
  const ids = new Set<number>();
  const allPacks = [DOG_PACKS, CAT_PACKS];
  const packTypes: PackType[] = ["celebrate", "fun", "artistic"];
  for (const packMap of allPacks) {
    for (const pt of packTypes) {
      for (const id of packMap[pt].styleIds) ids.add(id);
    }
  }
  return ids;
}

/** Returns all style IDs for a given pack type (across both species) */
export function getStyleIdsForPackType(packType: PackType): Set<number> {
  const ids = new Set<number>();
  for (const id of DOG_PACKS[packType].styleIds) ids.add(id);
  for (const id of CAT_PACKS[packType].styleIds) ids.add(id);
  return ids;
}
