/**
 * Shopping List — server-side retailer routing (#12 P4).
 *
 * The curated catalog lives in Sanity as `retailer` documents (the same data
 * src/lib/sanity.ts reads on the client). The SERVER had no Sanity access and
 * routed off a stale hardcoded ALL_SHOPS; this fetches the live catalog (public
 * CDN, cached) and routes each item's search to retailers whose BUDGET tier
 * matches the chosen level. Falls back to the bundled FREE_TIER_RETAILERS when
 * Sanity is unavailable so search never breaks.
 *
 * IMPORTANT: budget routing reads `retailer.budget` (separate from the access
 * `tier` = free/design/studio). If Sanity still stores $/$$/$$$/$$$$ we normalize
 * here and warn that it should be reseeded to the named values.
 */
import { createClient } from '@sanity/client';
import { FREE_TIER_RETAILERS } from '../../src/data/retailers.js';

export type BudgetTier = 'value' | 'mid' | 'premium' | 'luxury';
export type BudgetLevel = 'any' | 'value' | 'mid' | 'premium';

export interface ServerRetailer {
  name: string;
  domain: string;
  categories: string[];
  budget: BudgetTier;
  regions: string[];
  /** Quality/preference rank (higher = preferred). Default 0 when unset in Sanity. */
  rank: number;
}

const ALL_TIERS: BudgetTier[] = ['value', 'mid', 'premium', 'luxury'];

/** Which budget tiers a UI level should hit. 'premium' also pulls in luxury. */
const TIERS_FOR_LEVEL: Record<Exclude<BudgetLevel, 'any'>, BudgetTier[]> = {
  value: ['value'],
  mid: ['mid'],
  premium: ['premium', 'luxury'],
};

const warnedMissing = new Set<string>();

/** Normalize a raw Sanity budget value ($/$$/$$$/$$$$ or a named tier) → BudgetTier. */
export function normalizeBudget(raw: string | undefined | null, retailerName = ''): BudgetTier {
  const v = (raw || '').trim().toLowerCase();
  if (v === 'value' || v === 'mid' || v === 'premium' || v === 'luxury') return v;
  const dollars = (v.match(/\$/g) || []).length;
  if (dollars >= 4) return 'luxury';
  if (dollars === 3) return 'premium';
  if (dollars === 2) return 'mid';
  if (dollars === 1) return 'value';
  // No usable budget — warn once per retailer, default to mid so it's still usable.
  if (retailerName && !warnedMissing.has(retailerName)) {
    warnedMissing.add(retailerName);
    console.warn(`[SHOP] retailer "${retailerName}" has no budget set in Sanity — defaulting to "mid". Set retailer.budget (value/mid/premium/luxury).`);
  }
  return 'mid';
}

const sanity = createClient({ projectId: '305mgeeu', dataset: 'production', apiVersion: '2024-01-01', useCdn: true });
const RETAILERS_QUERY = `*[_type == "retailer" && active == true] | order(order asc, name asc) {
  name, domain, categories, budget, regions, rank
}`;

let cache: ServerRetailer[] | null = null;
let inflight: Promise<ServerRetailer[]> | null = null;

/** Live retailers from Sanity (cached). Falls back to FREE_TIER_RETAILERS on failure. */
export async function getRetailers(): Promise<ServerRetailer[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const docs = await sanity.fetch<any[]>(RETAILERS_QUERY);
      const list: ServerRetailer[] = (docs || []).map((d) => ({
        name: d.name,
        domain: d.domain || '',
        categories: Array.isArray(d.categories) ? d.categories : [],
        budget: normalizeBudget(d.budget, d.name),
        regions: Array.isArray(d.regions) ? d.regions : [],
        rank: typeof d.rank === 'number' ? d.rank : 0,
      }));
      if (!list.length) throw new Error('no active retailers');
      // One-time warning if Sanity still uses the $-notation (so it gets reseeded).
      if ((docs || []).some((d) => /\$/.test(String(d.budget || '')))) {
        console.warn('[SHOP] Sanity retailer.budget still uses $/$$/$$$/$$$$ — normalized in code; reseed to named values (value/mid/premium/luxury).');
      }
      cache = list;
      return list;
    } catch (e: any) {
      console.warn('[SHOP] Sanity retailer fetch failed, using bundled fallback:', e?.message ?? e);
      // Fallback has no budget/category data → treated as general 'mid' shops.
      return FREE_TIER_RETAILERS.map((r) => ({ name: r.name, domain: r.domain, categories: [], budget: 'mid' as BudgetTier, regions: [], rank: 0 }));
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Maps friendly Sanity category labels → the taxonomy ids they cover, so an
// owner can tag a retailer "Furniture" or "Wall Art" and it routes correctly.
const CATEGORY_ALIASES: Record<string, string[]> = {
  furniture: ['seating', 'tables-desks', 'storage', 'beds'],
  seating: ['seating'], sofas: ['seating'], chairs: ['seating'],
  tables: ['tables-desks'], desks: ['tables-desks'],
  storage: ['storage'], cabinets: ['storage'], shelving: ['storage'],
  beds: ['beds'], bedroom: ['beds', 'storage'],
  lighting: ['lighting'], lamps: ['lighting'],
  rugs: ['rugs'],
  textiles: ['textiles'], bedding: ['textiles'], curtains: ['textiles'], pillows: ['textiles'],
  'wall art': ['art-decor'], art: ['art-decor'], posters: ['art-decor'], prints: ['art-decor'],
  decor: ['art-decor'], mirrors: ['art-decor'], vases: ['art-decor'], 'home decor': ['art-decor'],
};

/** Taxonomy ids a retailer's category labels cover (via aliases + the raw label). */
function retailerTaxonomyIds(retailerCats: string[]): Set<string> {
  const ids = new Set<string>();
  for (const c of retailerCats) {
    const rc = c.toLowerCase().trim();
    for (const id of (CATEGORY_ALIASES[rc] || [])) ids.add(id);
    if (rc) ids.add(rc); // also keep the raw label so taxonomy-id values work directly
  }
  return ids;
}

/**
 * Category fit of a retailer for an item:
 *   3 = focused specialist (sells this category and ≤2 categories total — e.g.
 *       Desenio for wall art), queried FIRST;
 *   2 = broad store that also sells this category (West Elm for wall art);
 *   1 = general (no categories declared);
 *   0 = specializes in something else (a poster shop for a sofa).
 */
function categoryRank(retailerCats: string[], itemCategory: string, taxonomyId: string): 0 | 1 | 2 | 3 {
  if (!retailerCats.length) return 1;
  const ids = retailerTaxonomyIds(retailerCats);
  let matches = !!(taxonomyId && ids.has(taxonomyId));
  if (!matches) {
    const cat = (itemCategory || '').toLowerCase();
    const head = cat.split(/[\s,]/)[0];
    matches = retailerCats.some((c) => { const rc = c.toLowerCase(); return (cat && cat.includes(rc)) || (head && rc.includes(head)); });
  }
  if (!matches) return 0;
  return retailerCats.length <= 2 ? 3 : 2; // focused specialist beats a broad store
}

/**
 * Resolve a Serper result's `source` ("west elm", "Michaels", "crateandbarrel.com")
 * to a CURATED retailer (name + domain), matching by name OR domain. Returns null
 * for any shop not in the Sanity catalog — so non-curated shops (Michaels, etc.)
 * are never shown. Add a shop to Sanity to allow it.
 */
export function matchRetailer(retailers: ServerRetailer[], source: string): { name: string; domain: string } | null {
  const s = (source || '').toLowerCase().trim();
  if (!s) return null;
  const sd = s.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  for (const r of retailers) {
    if (!r.domain) continue;
    const rn = r.name.toLowerCase();
    const rd = r.domain.toLowerCase().replace(/^www\./, '');
    if (s === rn || sd === rd || s.includes(rn) || rn.includes(s)) return { name: r.name, domain: r.domain };
  }
  return null;
}

function regionMatches(regions: string[], gl: string): boolean {
  if (!regions.length) return true; // no region constraint
  const g = (gl || '').toLowerCase();
  return regions.some((r) => {
    const rr = r.toLowerCase();
    return rr === g || rr.includes('global') || rr.includes('worldwide') || rr.includes(g);
  });
}

/**
 * Retailers to query for ONE item, ORDERED so the best are queried first:
 * category specialists first (a wall-art shop for wall art), then by `rank`
 * (higher = preferred — owner-set quality, e.g. Wayfair low), then Sanity order.
 * Filters by region + budget tier (gracefully — never empties the list), and
 * drops off-category specialists when enough on-category shops remain.
 * (Shop names are a soft Serper signal; the relevance filter does the real
 * category enforcement — this just biases WHICH shops get queried.)
 */
export function shopsForLevel(
  retailers: ServerRetailer[],
  level: BudgetLevel,
  item: { category?: string; taxonomyId?: string },
  gl: string,
): ServerRetailer[] {
  const tiers = level === 'any' ? ALL_TIERS : (TIERS_FOR_LEVEL[level] ?? ALL_TIERS);
  const cat = item.category || '';
  const tax = item.taxonomyId || '';
  const inRegion = retailers.filter((r) => regionMatches(r.regions, gl));
  const pool = inRegion.length ? inRegion : retailers;

  // Budget tier filter — but don't let it empty the pool.
  const tierPool = level === 'any' ? pool : pool.filter((r) => tiers.includes(r.budget));
  const base = tierPool.length >= 2 ? tierPool : pool;

  const meta = base.map((r, i) => ({ r, i, cr: categoryRank(r.categories, cat, tax), rank: r.rank || 0 }));
  // Prefer on-category (cr 1|2) shops; only fall back to off-category when too few.
  const onCat = meta.filter((m) => m.cr > 0);
  const usable = onCat.length >= 2 ? onCat : meta;
  return usable
    .sort((a, b) => b.cr - a.cr || b.rank - a.rank || a.i - b.i)
    .map((m) => m.r);
}
