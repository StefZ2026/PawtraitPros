/**
 * Pawtrait Pros — Gelato Greeting Card Configuration
 *
 * Two products: Flat 5×7 and Folded 5×7 greeting cards.
 * Gelato uses productUid strings (not numeric variant IDs like Printful).
 *
 * IMPORTANT: The productUids below are placeholders. Once Stefanie creates
 * a Gelato account and provides the API key, run the catalog discovery
 * endpoint (GET /api/gelato/discover-products) to find the exact UIDs
 * for A5 greeting cards and update these constants.
 *
 * Gelato's closest size to 5×7" is A5 (~5.9×8.3").
 * Cards ship with matching envelopes.
 */

export interface GelatoCardProduct {
  productUid: string;
  name: string;
  format: "flat" | "folded";
  size: string;
  priceCents: number; // retail price per card
  artworkFiles: Array<{ type: string; description: string }>;
}

// These UIDs will be updated after catalog discovery
// Format: cards_pf_{size}_pt_{paper}_cl_{sides}_ft_{fold}_ct_{coating}
export const GELATO_CARD_FLAT_5x7_PRODUCT_UID =
  "cards_pf_a5_pt_350-gsm-coated-silk_cl_4-4_ct_matt-protection_prt_1-1";

export const GELATO_CARD_FOLDED_5x7_PRODUCT_UID =
  "cards_pf_a5_pt_350-gsm-coated-silk_cl_4-4_ft_fold-ver_ct_matt-protection_prt_1-1";

export const GELATO_PRODUCTS: Record<string, GelatoCardProduct> = {
  card_flat_5x7: {
    productUid: GELATO_CARD_FLAT_5x7_PRODUCT_UID,
    name: "Flat Greeting Card — 5×7",
    format: "flat",
    size: "5x7",
    priceCents: 1500, // $15.00 per card
    artworkFiles: [
      { type: "default", description: "Front artwork (print-ready PDF/PNG/JPG)" },
      { type: "back", description: "Back artwork (print-ready PDF/PNG/JPG)" },
    ],
  },
  card_folded_5x7: {
    productUid: GELATO_CARD_FOLDED_5x7_PRODUCT_UID,
    name: "Folded Greeting Card — 5×7",
    format: "folded",
    size: "5x7",
    priceCents: 2000, // $20.00 per card
    artworkFiles: [
      { type: "default", description: "Outside artwork — front cover + back (multi-page PDF or single image)" },
      { type: "inside", description: "Inside artwork (optional — leave blank for white interior)" },
    ],
  },
};

export function getGelatoProduct(key: string): GelatoCardProduct | undefined {
  return GELATO_PRODUCTS[key];
}

export function getAllGelatoProducts(): GelatoCardProduct[] {
  return Object.values(GELATO_PRODUCTS);
}
