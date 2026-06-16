/**
 * SHOPPING ITEM TAXONOMY — the SINGLE SOURCE OF TRUTH for the Shopping List tool.
 *
 * One ordered, exported list of categories. It drives:
 *   1. the logged-in "Find" scope chips (multi-select),
 *   2. the Results "inputs summary" labels,
 *   3. (LATER, in the separate search-accuracy session) the identify step — Gemini maps each
 *      detected object to one of these `id`s — and category-aware Serper queries via `queryHints`.
 *
 * Owner-approved set (2026-06-11). Adjust LABELS via i18n only; the `id`s are stable contract keys
 * consumed across identify/search/UI — do NOT rename them without updating every consumer.
 *
 * NOTE: this module is DATA only. It does not implement the identify→search mapping (that's the
 * search-accuracy session); it just exposes the taxonomy + a best-effort text→id matcher.
 */

export interface ShoppingCategory {
  /** Stable contract id (used by identify mapping, Find chips, query building). */
  id: string;
  /** i18n key for the display label. */
  labelKey: string;
  /** Object types that map to this category — the identify step will consume these. Lowercase. */
  detects: string[];
  /** Search terms for category-aware queries (consumed later by the search-accuracy session). */
  queryHints: string[];
}

/** Ordered — the Find chips + summary render in this order. */
export const SHOPPING_TAXONOMY: ShoppingCategory[] = [
  {
    id: 'seating',
    labelKey: 'ai.taxonomy.seating',
    detects: ['sofa', 'couch', 'sectional', 'loveseat', 'settee', 'armchair', 'accent chair', 'lounge chair', 'dining chair', 'chair', 'stool', 'barstool', 'bench', 'ottoman', 'pouf', 'footstool'],
    queryHints: ['sofa', 'armchair', 'accent chair', 'dining chair', 'stool', 'bench', 'ottoman'],
  },
  {
    id: 'tables-desks',
    labelKey: 'ai.taxonomy.tablesDesks',
    detects: ['coffee table', 'cocktail table', 'side table', 'end table', 'console table', 'console', 'dining table', 'table', 'desk', 'writing desk', 'nesting tables'],
    queryHints: ['coffee table', 'side table', 'console table', 'dining table', 'desk'],
  },
  {
    id: 'storage',
    labelKey: 'ai.taxonomy.storage',
    detects: ['cabinet', 'sideboard', 'buffet', 'credenza', 'shelving', 'shelf', 'bookcase', 'bookshelf', 'dresser', 'chest of drawers', 'media unit', 'media console', 'tv stand', 'storage'],
    queryHints: ['cabinet', 'sideboard', 'bookcase', 'dresser', 'media unit'],
  },
  {
    id: 'beds',
    labelKey: 'ai.taxonomy.beds',
    detects: ['bed', 'bed frame', 'platform bed', 'headboard', 'daybed'],
    queryHints: ['bed frame', 'headboard'],
  },
  {
    id: 'lighting',
    labelKey: 'ai.taxonomy.lighting',
    detects: ['pendant', 'pendant light', 'chandelier', 'floor lamp', 'table lamp', 'lamp', 'sconce', 'wall light', 'ceiling light', 'flush mount'],
    queryHints: ['pendant light', 'chandelier', 'floor lamp', 'table lamp', 'sconce'],
  },
  {
    id: 'rugs',
    labelKey: 'ai.taxonomy.rugs',
    detects: ['rug', 'area rug', 'runner', 'carpet'],
    queryHints: ['area rug', 'runner'],
  },
  {
    id: 'textiles',
    labelKey: 'ai.taxonomy.textiles',
    detects: ['curtain', 'curtains', 'drape', 'drapes', 'blind', 'blinds', 'shade', 'cushion', 'pillow', 'throw pillow', 'throw', 'blanket', 'bedding', 'duvet', 'quilt', 'coverlet'],
    queryHints: ['curtains', 'blinds', 'cushion', 'throw', 'bedding'],
  },
  {
    id: 'art-decor',
    labelKey: 'ai.taxonomy.artDecor',
    detects: ['wall art', 'art', 'print', 'painting', 'artwork', 'mirror', 'vase', 'planter', 'plant pot', 'object', 'sculpture', 'tray', 'bowl', 'candle holder', 'decor', 'decorative'],
    queryHints: ['wall art', 'mirror', 'vase', 'planter', 'decorative tray'],
  },
];

/** Sentinel meaning "every category" (the Find "All" chip). */
export const SHOPPING_TAXONOMY_ALL = 'all';

/** All taxonomy ids (handy default-selected set for the Find chips). */
export const SHOPPING_TAXONOMY_IDS = SHOPPING_TAXONOMY.map((c) => c.id);

/**
 * Best-effort map a free-text detected category (e.g. Gemini's "Coffee Table", "Pendant Light")
 * to a taxonomy id, or null if it doesn't match any. Used by the UI to filter the displayed list;
 * the search-accuracy session will use the same taxonomy for the authoritative identify mapping.
 */
export function categoryToTaxonomyId(category: string | undefined | null): string | null {
  const c = (category || '').toLowerCase().trim();
  if (!c) return null;
  for (const cat of SHOPPING_TAXONOMY) {
    if (cat.detects.some((d) => c.includes(d))) return cat.id;
  }
  return null;
}
