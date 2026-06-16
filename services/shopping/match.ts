/**
 * Shopping List — category-aware query building + relevance filtering (pure).
 *
 * The old pipeline returned the first linked Serper hit with NO relevance check,
 * so a "seating" query could return a cabinet. This scores each hit against the
 * identified item (category presence + color/material/descriptors), drops
 * off-category and accessory-noise hits, and returns the best matches in rank
 * order (empty = graceful no-match). Keyed off the canonical taxonomy
 * (src/data/shoppingTaxonomy) so it stays in sync with identify + the Find chips.
 */
import { SHOPPING_TAXONOMY, categoryToTaxonomyId } from '../../src/data/shoppingTaxonomy.js';

export interface MatchItem {
  taxonomyId?: string;
  category?: string;
  color?: string;
  material?: string;
  shape?: string;
  style?: string;
  search_query?: string;
  keywords?: string[];
}

export interface RawHit {
  title?: string;
  source?: string;
  [k: string]: unknown;
}

// taxonomy id → the title words that identify that category, and its query hints.
const DETECTS: Record<string, string[]> = Object.fromEntries(SHOPPING_TAXONOMY.map((c) => [c.id, c.detects]));
const DETECT_ENTRIES = Object.entries(DETECTS);

/**
 * Finer "specific object" types for intra-category precision. The taxonomy
 * lumps e.g. vases, wall art, mirrors and planters together as `art-decor`, so
 * a category-level match isn't enough — a vase query must not accept wall art.
 * Ordered most-specific-label-first so itemSubtype() resolves cleanly.
 */
const SUBTYPES: Record<string, string[]> = {
  sofa: ['sofa', 'couch', 'loveseat', 'sectional', 'settee'],
  chair: ['armchair', 'accent chair', 'lounge chair', 'dining chair', 'chair', 'stool', 'barstool', 'bench', 'ottoman', 'pouf', 'footstool'],
  table: ['coffee table', 'cocktail table', 'side table', 'end table', 'console table', 'console', 'dining table', 'writing desk', 'desk', 'nightstand', 'table'],
  storage: ['sideboard', 'buffet', 'credenza', 'cabinet', 'bookcase', 'bookshelf', 'dresser', 'chest of drawers', 'media unit', 'media console', 'tv stand', 'shelving', 'shelf', 'wardrobe'],
  bed: ['bed', 'headboard', 'daybed'],
  lighting: ['chandelier', 'pendant', 'sconce', 'floor lamp', 'table lamp', 'lamp', 'ceiling light', 'flush mount', 'lantern'],
  rug: ['rug', 'carpet', 'runner', 'kilim'],
  curtains: ['curtain', 'drape', 'blind', 'shade'],
  softgoods: ['cushion', 'pillow', 'throw', 'blanket', 'bedding', 'duvet', 'quilt', 'coverlet'],
  wallart: ['wall art', 'artwork', 'art print', 'art', 'print', 'poster', 'painting', 'canvas'],
  mirror: ['mirror'],
  vase: ['vase'],
  planter: ['planter', 'plant pot'],
  bowl: ['bowl', 'tray'],
  sculpture: ['sculpture', 'figurine'],
  candle: ['candle'],
};
const SUBTYPE_ENTRIES = Object.entries(SUBTYPES);

/** The specific object type for an item, from its category label ('' if unknown). */
function itemSubtype(item: MatchItem): string {
  const cat = (item.category || '').toLowerCase();
  if (!cat) return '';
  for (const [st, toks] of SUBTYPE_ENTRIES) {
    if (toks.some((t) => cat.includes(t))) return st;
  }
  return '';
}

/** Accessory / wrong-product noise — a part, cover, sample, replica, or print OF the thing. */
const ACCESSORY_NOISE = [
  'slipcover', 'cover only', 'replacement', 'sample', 'swatch', 'decal', 'sticker',
  'miniature', 'dollhouse', 'keychain', 'protector', 'stencil', 'parts', 'cleaner', 'template',
];

const STOP_WORDS = new Set(['and', 'or', 'the', 'with', 'of', 'in', 'unknown', 'set', 'piece']);

function words(s?: string): string[] {
  if (!s) return [];
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/** Resolve an item to a taxonomy id (trust its taxonomyId, else map its category). */
function taxId(item: MatchItem): string {
  if (item.taxonomyId && DETECTS[item.taxonomyId]) return item.taxonomyId;
  return categoryToTaxonomyId(item.category) || '';
}

/** Whole-word (single token) or substring (multi-word) membership in a title. */
function titleHas(titleWords: Set<string>, titleStr: string, token: string): boolean {
  return token.includes(' ') ? titleStr.includes(token) : titleWords.has(token);
}

/**
 * Build the per-item Serper query: the model's descriptor-rich search_query,
 * anchored with the item's category label when the query doesn't already name
 * the category, plus a quoted retailer OR-filter. Category EXCLUSION is handled
 * in scoring (Google Shopping ignores `-term` unreliably).
 */
export function buildShoppingQuery(item: MatchItem, shopNames: string[] = []): string {
  const base = (item.search_query && item.search_query.trim())
    || [item.color, item.material, item.style, item.category].filter(Boolean).join(' ').trim()
    || (item.category || '').trim();

  const id = taxId(item);
  const detects = DETECTS[id] || words(item.category);
  const baseLower = base.toLowerCase();
  const hasCat = detects.some((d) => baseLower.includes(d));
  const anchored = hasCat || !item.category ? base : `${base} ${item.category}`.trim();

  const filter = shopNames.length ? ` (${shopNames.map((s) => `"${s}"`).join(' OR ')})` : '';
  return `${anchored}${filter}`;
}

/**
 * Score one hit against the item. Higher = better; -Infinity = disqualified
 * (accessory noise, or a clearly off-category product).
 */
export function scoreHit(item: MatchItem, hit: RawHit): number {
  const titleStr = (hit.title || '').toLowerCase();
  if (!titleStr) return -Infinity;
  if (ACCESSORY_NOISE.some((n) => titleStr.includes(n))) return -Infinity;

  const titleWords = new Set(titleStr.split(/[^a-z0-9]+/).filter(Boolean));
  const id = taxId(item);
  const catTokens = (DETECTS[id] && DETECTS[id].length) ? DETECTS[id] : words(item.category);
  const hasCategory = catTokens.some((tok) => titleHas(titleWords, titleStr, tok));

  if (!hasCategory) {
    // Off-category: the title names a DIFFERENT tracked category and not ours.
    for (const [key, toks] of DETECT_ENTRIES) {
      if (key === id) continue;
      if (toks.some((tok) => titleHas(titleWords, titleStr, tok))) return -Infinity;
    }
  }

  // Intra-category object precision: if we know the item's specific object and
  // the title is a DIFFERENT specific object without the item's own, it's the
  // wrong product — disqualify (e.g. a "vase" must not accept "wall art", though
  // both are art-decor).
  const isub = itemSubtype(item);
  if (isub && !SUBTYPES[isub].some((t) => titleHas(titleWords, titleStr, t))) {
    for (const [st, toks] of SUBTYPE_ENTRIES) {
      if (st === isub) continue;
      if (toks.some((t) => titleHas(titleWords, titleStr, t))) return -Infinity;
    }
  }

  let score = 0;
  if (hasCategory) score += 4;
  if (words(item.color).some((t) => titleHas(titleWords, titleStr, t))) score += 2;
  if (words(item.material).some((t) => titleHas(titleWords, titleStr, t))) score += 2;
  if ([...words(item.shape), ...words(item.style)].some((t) => titleHas(titleWords, titleStr, t))) score += 1;
  if (Array.isArray(item.keywords)) {
    let kw = 0;
    for (const k of item.keywords) {
      if (kw >= 3) break;
      if (words(k).some((t) => titleHas(titleWords, titleStr, t))) kw += 1;
    }
    score += kw;
  }
  return score;
}

/** Minimum score a hit must reach to be kept (≈ "the category at least matched"). */
export const KEEP_THRESHOLD = 4;

/**
 * Rank + filter raw hits for one item: drop accessory noise / off-category,
 * keep the best `limit` that clear KEEP_THRESHOLD, descending by score (ties
 * preserve Serper order). Empty array = graceful no-match.
 */
export function pickMatches<T extends RawHit>(item: MatchItem, hits: T[], limit = 1): T[] {
  return hits
    .map((hit, i) => ({ hit, score: scoreHit(item, hit), i })) // keep raw score for the threshold
    .filter((s) => s.score >= KEEP_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.i - b.i) // rank by score, ties keep Serper order
    .slice(0, limit)
    .map((s) => s.hit);
}
