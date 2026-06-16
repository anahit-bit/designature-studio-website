/**
 * Regression tests for the Shopping List search-accuracy rework (task #12):
 *   P1 price parsing ($179,900 bug) · P2 direct-link resolution (no google) ·
 *   P3 dedupe + free-tier pick + category-aware query + relevance filter ·
 *   P4 budget-tier normalization + retailer routing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parsePrice, normalizePrice } from '../lib/priceParse';
import { isDirect, extractDirectLink, cleanSource, retailerSearchUrl, cleanProductTitle } from '../../services/shopping/links';
import { dedupeItems, pickFreeItems, SelItem } from '../../services/shopping/select';
import { buildShoppingQuery, scoreHit, pickMatches } from '../../services/shopping/match';
import { normalizeBudget, shopsForLevel, matchRetailer, ServerRetailer } from '../../services/shopping/retailers';
import { mockBucketFor } from '../../services/shopping/mockBucket';

// ── P1 · PRICE ───────────────────────────────────────────────────────────────
describe('P1 · parsePrice', () => {
  it('reads "$1,799.00" as 1799, never 179900 (the bug)', () => {
    expect(parsePrice('$1,799.00')).toBe(1799);
    expect(parsePrice('$1,799.00')).not.toBe(179900);
  });
  it('handles "from $X", ranges (low bound), EU notation, plain numbers', () => {
    expect(parsePrice('from $2,200')).toBe(2200);
    expect(parsePrice('$300–900')).toBe(300);
    expect(parsePrice('1.799,00')).toBe(1799);
    expect(parsePrice('$1,299')).toBe(1299);
    expect(parsePrice('$19.99')).toBe(19);
    expect(parsePrice(2499)).toBe(2499);
  });
  it('non-numeric → 0', () => {
    expect(parsePrice('View')).toBe(0);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice(null)).toBe(0);
  });
  it('Est. total sums correctly (no concatenation)', () => {
    const prices = ['$1,799.00', '$499.00', '$2,200.00'];
    expect(prices.reduce((s, p) => s + parsePrice(p), 0)).toBe(4498);
  });
  it('normalizePrice → clean "$1,799"; passes non-prices through', () => {
    expect(normalizePrice('$1,799.00')).toBe('$1,799');
    expect(normalizePrice('View')).toBe('View');
    expect(normalizePrice(null)).toBeNull();
  });
});

// ── P2 · DIRECT LINKS ──────────────────────────────────────────────────────────
describe('P2 · direct links', () => {
  it('isDirect rejects google + non-http', () => {
    expect(isDirect('https://www.westelm.com/p')).toBe(true);
    expect(isDirect('https://www.google.com/shopping/product/1')).toBe(false);
    expect(isDirect(null)).toBe(false);
  });
  it('extracts a real merchant URL and never returns a google link', () => {
    expect(extractDirectLink({ link: 'https://www.westelm.com/products/sofa' })).toBe('https://www.westelm.com/products/sofa');
    expect(extractDirectLink({ link: 'https://www.google.com/url?adurl=https://cb2.com/sofa' })).toBe('https://cb2.com/sofa');
    expect(extractDirectLink({ productLink: 'https://ikea.com/p/1', link: 'https://google.com/x' })).toBe('https://ikea.com/p/1');
  });
  it('google-only hit → "" (skipped, not surfaced)', () => {
    expect(extractDirectLink({ link: 'https://www.google.com/shopping/product/123' })).toBe('');
    expect(extractDirectLink({})).toBe('');
  });
  it('cleanSource tidies a domain into a label', () => {
    expect(cleanSource('www.westelm.com')).toBe('Westelm');
  });
  it('builds a real retailer site-search URL (brand stripped, no google)', () => {
    const u = retailerSearchUrl('westelm.com', 'West Elm Laurent 76" Sofa Performance', 'West Elm');
    expect(u.startsWith('https://www.westelm.com/search/results.html?words=')).toBe(true);
    expect(u).not.toContain('google.com');
    expect(u.toLowerCase()).toContain('laurent');
    expect(u).not.toMatch(/west%20elm/i);
  });
  it('uses a generic ?q= for unknown retailers and "" for no domain', () => {
    expect(retailerSearchUrl('example.com', 'Cool Lamp')).toBe('https://example.com/search?q=Cool%20Lamp');
    expect(retailerSearchUrl('', 'x')).toBe('');
  });
  it('cleanProductTitle strips the brand and caps length', () => {
    expect(cleanProductTitle('West Elm Andes Curved Velvet Sofa Navy', 'West Elm')).toBe('Andes Curved Velvet Sofa Navy');
  });
});

// ── P3 · DEDUPE + FREE PICK ────────────────────────────────────────────────────
describe('P3 · dedupeItems', () => {
  it('merges identical detections into one entry with quantity', () => {
    const items: SelItem[] = [
      { taxonomyId: 'seating', category: 'Dining Chair', color: 'sage' },
      { taxonomyId: 'seating', category: 'Dining Chair', color: 'sage' },
      { taxonomyId: 'seating', category: 'Dining Chair', color: 'sage' },
      { taxonomyId: 'seating', category: 'Sofa', color: 'navy' },
    ];
    const out = dedupeItems(items);
    expect(out).toHaveLength(2);
    expect(out.find((i) => i.category === 'Dining Chair')?.quantity).toBe(3);
    expect(out.find((i) => i.category === 'Sofa')?.quantity).toBe(1);
  });
});

describe('P3 · pickFreeItems (4 main pieces, spread across categories)', () => {
  it('prefers main categories and excludes textiles/art-decor when 4 mains exist', () => {
    const items = [
      { taxonomyId: 'seating', category: 'Sofa', prominence: 90 },
      { taxonomyId: 'tables-desks', category: 'Coffee Table', prominence: 80 },
      { taxonomyId: 'rugs', category: 'Area Rug', prominence: 70 },
      { taxonomyId: 'lighting', category: 'Chandelier', prominence: 60 },
      { taxonomyId: 'textiles', category: 'Duvet', prominence: 95 },
      { taxonomyId: 'art-decor', category: 'Wall Art', prominence: 85 },
    ];
    const free = pickFreeItems(items, 4);
    expect(free).toHaveLength(4);
    const cats = free.map((i) => i.taxonomyId);
    expect(cats).not.toContain('textiles');
    expect(cats).not.toContain('art-decor');
    expect(new Set(cats).size).toBe(4); // spread across distinct categories
  });
  it('falls back to secondary only when fewer than 4 mains', () => {
    const items = [
      { taxonomyId: 'seating', category: 'Sofa', prominence: 90 },
      { taxonomyId: 'rugs', category: 'Area Rug', prominence: 70 },
      { taxonomyId: 'tables-desks', category: 'Side Table', prominence: 50 },
      { taxonomyId: 'art-decor', category: 'Wall Art', prominence: 85 },
      { taxonomyId: 'textiles', category: 'Curtains', prominence: 65 },
    ];
    const free = pickFreeItems(items, 4);
    expect(free).toHaveLength(4);
    expect(free.map((i) => i.taxonomyId)).toContain('art-decor'); // 4th slot filled from secondary
  });
});

// ── P3 · QUERY + RELEVANCE FILTER ──────────────────────────────────────────────
describe('P3 · buildShoppingQuery', () => {
  const sofa = { taxonomyId: 'seating', category: 'Sofa', color: 'navy', material: 'velvet', search_query: 'navy velvet curved sofa' };
  it('keeps the search_query + appends a quoted retailer OR-filter (no site:)', () => {
    const q = buildShoppingQuery(sofa, ['West Elm', 'CB2']);
    expect(q).toContain('navy velvet curved sofa');
    expect(q).toContain('"West Elm" OR "CB2"');
    expect(q).not.toContain('site:');
  });
  it('anchors with the category when the query omits it', () => {
    const rug = { taxonomyId: 'rugs', category: 'Area Rug', search_query: 'rust geometric handwoven' };
    expect(buildShoppingQuery(rug, []).toLowerCase()).toContain('rug');
  });
});

describe('P3 · scoreHit / pickMatches', () => {
  const sofa = { taxonomyId: 'seating', category: 'Sofa', color: 'navy', material: 'velvet', shape: 'curved', search_query: 'navy velvet curved sofa' };
  it('scores an on-category, on-color, on-material hit above a bare one', () => {
    expect(scoreHit(sofa, { title: 'Navy Velvet Curved Sofa' })).toBeGreaterThan(scoreHit(sofa, { title: 'Grey Linen Loveseat' }));
  });
  it('disqualifies accessory noise and off-category hits', () => {
    expect(scoreHit(sofa, { title: 'Velvet Sofa Slipcover' })).toBe(-Infinity);
    expect(scoreHit(sofa, { title: 'Sage Green Curtain Panel' })).toBe(-Infinity);
  });
  it('pickMatches keeps only on-category matches, ranked, capped', () => {
    const hits = [
      { title: 'Sofa Slipcover Navy' },        // noise → drop
      { title: 'Navy Velvet Curved Sofa' },    // strong keep
      { title: 'Sage Green Curtain Panel' },   // off-category → drop
      { title: 'Grey Fabric Sofa 3-Seater' },  // weak keep
    ];
    const kept = pickMatches(sofa, hits, 2);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThanOrEqual(2);
    expect(kept.every((h) => /sofa/i.test(h.title!))).toBe(true);
    expect(kept[0].title).toMatch(/Navy Velvet/);
  });
  it('returns empty on no on-category match (graceful no-match)', () => {
    expect(pickMatches(sofa, [{ title: 'Ceramic Table Lamp' }, { title: 'Wool Area Rug' }], 2)).toEqual([]);
  });
  it('keeps ALL threshold matches, not just the first (tiebreak-bug regression)', () => {
    // 8 category-only matches (score == KEEP_THRESHOLD). The old index penalty
    // pushed every one but the first below threshold → "no other option".
    const cab = { taxonomyId: 'storage', category: 'Display Cabinet', search_query: 'wood display cabinet' };
    const hits = Array.from({ length: 8 }, (_, i) => ({ title: `Brand Storage Cabinet ${i}` }));
    expect(pickMatches(cab, hits, 8)).toHaveLength(8);
  });
  it('rejects a different object within the same broad category (vase ≠ wall art)', () => {
    const vase = { taxonomyId: 'art-decor', category: 'Vase', material: 'ceramic', search_query: 'green ceramic vase' };
    expect(scoreHit(vase, { title: 'Modern Abstract Canvas Wall Art' })).toBe(-Infinity);
    expect(scoreHit(vase, { title: 'Sculptural Ceramic Vase, Cream' })).toBeGreaterThan(0);
    const wallart = { taxonomyId: 'art-decor', category: 'Wall Art', search_query: 'framed abstract wall art' };
    expect(scoreHit(wallart, { title: 'Hand-Thrown Stoneware Vase' })).toBe(-Infinity);
    expect(scoreHit(wallart, { title: 'Framed Abstract Canvas Print' })).toBeGreaterThan(0);
  });
});

// ── MOCK bucket routing (dev harness) ──────────────────────────────────────────
describe('mockBucketFor', () => {
  const filter = ' ("West Elm" OR "CB2" OR "Article" OR "AllModern")';
  it('routes by item noun and ignores the retailer filter (Article ≠ art)', () => {
    expect(mockBucketFor('blush pink accent armchair' + filter)).toBe('chair');
    expect(mockBucketFor('long light wood sideboard glass doors' + filter)).toBe('storage');
    expect(mockBucketFor('gold 6-globe mid century chandelier' + filter)).toBe('lighting');
    expect(mockBucketFor('sheer off-white window curtains' + filter)).toBe('textiles');
    expect(mockBucketFor('dark green ceramic vase' + filter)).toBe('vase');
    expect(mockBucketFor('framed abstract wall art' + filter)).toBe('art');
    expect(mockBucketFor('olive green curved sofa' + filter)).toBe('sofa');
    expect(mockBucketFor('light beige area rug' + filter)).toBe('rug');
  });
});

// ── P4 · BUDGET ROUTING ────────────────────────────────────────────────────────
describe('P4 · normalizeBudget', () => {
  it('maps $/$$/$$$/$$$$ → named tiers', () => {
    expect(normalizeBudget('$')).toBe('value');
    expect(normalizeBudget('$$')).toBe('mid');
    expect(normalizeBudget('$$$')).toBe('premium');
    expect(normalizeBudget('$$$$')).toBe('luxury');
  });
  it('passes named tiers through and defaults missing → mid', () => {
    expect(normalizeBudget('premium')).toBe('premium');
    expect(normalizeBudget('')).toBe('mid');
  });
});

// ── INTEGRATION · the search compose over the real Serper mock ────────────────
describe('integration · search pipeline (mock hits)', () => {
  it('sofa item → one on-category product with a direct link + clean price', () => {
    const mock = JSON.parse(readFileSync('mocks/serper-shopping-mock.json', 'utf-8'));
    const item = { taxonomyId: 'seating', category: 'Sofa', color: 'navy', material: 'velvet', search_query: 'navy velvet curved sofa' };
    const products = pickMatches(item, mock.sofa, 5)
      .map((r: any) => ({ title: r.title, price: normalizePrice(r.price), link: extractDirectLink(r) }))
      .filter((p) => p.link)
      .slice(0, 1);
    expect(products).toHaveLength(1);
    expect(products[0].link).not.toContain('google.com');
    expect(products[0].link.startsWith('http')).toBe(true);
    expect(products[0].price).toMatch(/^\$[\d,]+$/); // "$2,499" — no ".00", no concatenation
    expect(/sofa/i.test(products[0].title!)).toBe(true);
  });
});

describe('P4 · shopsForLevel', () => {
  const shops: ServerRetailer[] = [
    { name: 'IKEA', domain: 'ikea.com', categories: [], budget: 'value', regions: [], rank: 0 },
    { name: 'West Elm', domain: 'westelm.com', categories: [], budget: 'mid', regions: [], rank: 0 },
    { name: 'Article', domain: 'article.com', categories: [], budget: 'mid', regions: [], rank: 0 },
    { name: 'Room & Board', domain: 'roomandboard.com', categories: [], budget: 'premium', regions: [], rank: 0 },
    { name: 'RH', domain: 'rh.com', categories: [], budget: 'luxury', regions: [], rank: 0 },
  ];
  const item = { category: 'Sofa', taxonomyId: 'seating' };
  it("'any' returns all", () => {
    expect(shopsForLevel(shops, 'any', item, 'us')).toHaveLength(5);
  });
  it("'premium' includes luxury, excludes value/mid", () => {
    const names = shopsForLevel(shops, 'premium', item, 'us').map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['Room & Board', 'RH']));
    expect(names).not.toContain('IKEA');
  });
  it("'mid' returns the mid-tier shops", () => {
    const names = shopsForLevel(shops, 'mid', item, 'us').map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['West Elm', 'Article']));
    expect(names).not.toContain('RH');
  });
  it('orders category specialists first (wall-art shop for wall art)', () => {
    const s: ServerRetailer[] = [
      { name: 'West Elm', domain: 'westelm.com', categories: ['Furniture'], budget: 'mid', regions: [], rank: 0 },
      { name: 'Desenio', domain: 'desenio.com', categories: ['Wall Art'], budget: 'mid', regions: [], rank: 0 },
      { name: 'IKEA', domain: 'ikea.com', categories: ['Furniture'], budget: 'value', regions: [], rank: 0 },
    ];
    const order = shopsForLevel(s, 'any', { category: 'Wall Art', taxonomyId: 'art-decor' }, 'us').map((x) => x.name);
    expect(order[0]).toBe('Desenio');
  });
  it('breaks ties by rank (higher = preferred)', () => {
    const s: ServerRetailer[] = [
      { name: 'Wayfair', domain: 'wayfair.com', categories: ['Furniture'], budget: 'mid', regions: [], rank: 2 },
      { name: 'Article', domain: 'article.com', categories: ['Furniture'], budget: 'mid', regions: [], rank: 9 },
    ];
    const order = shopsForLevel(s, 'any', { category: 'Sofa', taxonomyId: 'seating' }, 'us').map((x) => x.name);
    expect(order[0]).toBe('Article');
  });
});

describe('matchRetailer (curated-only)', () => {
  const shops: ServerRetailer[] = [
    { name: 'West Elm', domain: 'westelm.com', categories: [], budget: 'mid', regions: [], rank: 0 },
    { name: 'Crate & Barrel', domain: 'crateandbarrel.com', categories: [], budget: 'mid', regions: [], rank: 0 },
  ];
  it('matches a Serper source by display name or by domain', () => {
    expect(matchRetailer(shops, 'west elm')?.name).toBe('West Elm');
    expect(matchRetailer(shops, 'West Elm')?.domain).toBe('westelm.com');
    expect(matchRetailer(shops, 'crateandbarrel.com')?.name).toBe('Crate & Barrel');
  });
  it('returns null for a non-curated shop (Michaels) so it is never shown', () => {
    expect(matchRetailer(shops, 'michaels.com')).toBeNull();
    expect(matchRetailer(shops, 'Michaels')).toBeNull();
  });
});
