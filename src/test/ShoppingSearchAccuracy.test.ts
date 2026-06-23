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
import { mockBucketFor, filterMockByRegion } from '../../services/shopping/mockBucket';
import { isProductUrl, isCategoryUrl, pickBestProductUrl, localizeDomain, isMultiStorefront } from '../../services/shopping/links';

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

describe('filterMockByRegion (MOCK region routing)', () => {
  const entries = [
    { region: 'us', source: 'westelm.com' },
    { region: 'us', source: 'cb2.com' },
    { region: 'gb', source: 'johnlewis.com' },
    { region: 'gb', source: 'habitat.co.uk' },
  ];
  it("returns only US entries for gl 'us'", () => {
    expect(filterMockByRegion(entries, 'us').map((e) => e.source)).toEqual(['westelm.com', 'cb2.com']);
  });
  it("returns only UK entries for gl 'gb'", () => {
    expect(filterMockByRegion(entries, 'gb').map((e) => e.source)).toEqual(['johnlewis.com', 'habitat.co.uk']);
  });
  it('treats untagged entries as US', () => {
    const mixed = [{ source: 'untagged.com' }, { region: 'gb', source: 'johnlewis.com' }];
    expect(filterMockByRegion(mixed, 'us').map((e) => e.source)).toEqual(['untagged.com']);
  });
  it('falls back to the full bucket when a region has no entries (never empty)', () => {
    const usOnly = [{ region: 'us', source: 'a' }, { region: 'us', source: 'b' }];
    expect(filterMockByRegion(usOnly, 'gb')).toEqual(usOnly);
  });
  it('includes worldwide/global retailers for ANY country (e.g. Desenio)', () => {
    const entries = [
      { region: 'us', source: 'westelm.com' },
      { region: 'gb', source: 'johnlewis.com' },
      { region: 'worldwide', source: 'desenio.com' },
      { region: 'global', source: 'amara.com' },
    ];
    expect(filterMockByRegion(entries, 'us').map((e) => e.source)).toEqual(['westelm.com', 'desenio.com', 'amara.com']);
    expect(filterMockByRegion(entries, 'gb').map((e) => e.source)).toEqual(['johnlewis.com', 'desenio.com', 'amara.com']);
  });
});

describe('product-link resolution (specific page vs category/search)', () => {
  const PRODUCTS = [
    'https://www.ikea.com/gb/en/p/kuddlava-table-lamp-pleated-white-90601200/',
    'https://www.johnlewis.com/john-lewis-bailey-grand-sofa/p5921786',
    'https://www.cb2.com/gwyneth-velvet-sofa/s258612',
    'https://www.westelm.com/products/andes-grand-sofa-h3902/',
    'https://www.article.com/product/15963/sven-sofa',
    'https://www.wayfair.com/furniture/pdp/sofa-w000123456.html',
  ];
  const NON_PRODUCTS = [
    'https://www.ikea.com/gb/en/cat/plants-plant-pots-pp001/',
    'https://www.ikea.com/gb/en/cat/indoor-plant-pots-10778/', // numeric CATEGORY id must not read as a product
    'https://www.swooneditions.com/range/norfolk-range?srsltid=abc',
    'https://desenio.com/en/search?q=Canvas%20Prints',
    'https://www.johnlewis.com/',
  ];
  it('flags real product pages', () => {
    for (const u of PRODUCTS) expect(isProductUrl(u), u).toBe(true);
  });
  it('does NOT flag category/search/range/home pages as products', () => {
    for (const u of NON_PRODUCTS) expect(isProductUrl(u), u).toBe(false);
  });
  it('flags category/search/range/home pages as listings', () => {
    expect(isCategoryUrl('https://www.ikea.com/gb/en/cat/plants-plant-pots-pp001/')).toBe(true);
    expect(isCategoryUrl('https://www.swooneditions.com/range/norfolk-range?srsltid=abc')).toBe(true);
    expect(isCategoryUrl('https://desenio.com/en/search?q=art')).toBe(true);
    expect(isCategoryUrl('https://www.johnlewis.com/')).toBe(true);
    expect(isCategoryUrl('https://www.ikea.com/gb/en/p/kuddlava-90601200/')).toBe(false);
  });
  it('picks the on-domain PRODUCT page over a category page ranked first', () => {
    const organic = [
      { link: 'https://www.ikea.com/gb/en/cat/plants-plant-pots-pp001/' },
      { link: 'https://www.ikea.com/gb/en/p/kuddlava-table-lamp-90601200/' },
    ];
    expect(pickBestProductUrl(organic, 'ikea.com')).toBe('https://www.ikea.com/gb/en/p/kuddlava-table-lamp-90601200/');
  });
  it('ignores off-domain results entirely', () => {
    const organic = [
      { link: 'https://www.pinterest.com/pin/ikea-lamp-12345/' },
      { link: 'https://www.ikea.com/gb/en/p/real-lamp-90601200/' },
    ];
    expect(pickBestProductUrl(organic, 'ikea.com')).toBe('https://www.ikea.com/gb/en/p/real-lamp-90601200/');
  });
  it('falls back to the first on-domain hit when no product page exists', () => {
    const organic = [
      { link: 'https://www.swooneditions.com/range/norfolk-range' },
      { link: 'https://www.swooneditions.com/about' },
    ];
    // No product page → first non-category (the /about) wins over the /range listing.
    expect(pickBestProductUrl(organic, 'swooneditions.com')).toBe('https://www.swooneditions.com/about');
  });
  it('returns "" when nothing is on-domain (caller falls back to site-search)', () => {
    expect(pickBestProductUrl([{ link: 'https://www.pinterest.com/x' }], 'ikea.com')).toBe('');
  });
});

describe('country storefront localization (strict per-country domains)', () => {
  it('maps Wayfair to the selected country storefront', () => {
    expect(localizeDomain('wayfair.com', 'gb')).toBe('wayfair.co.uk');
    expect(localizeDomain('wayfair.com', 'us')).toBe('wayfair.com');
    expect(localizeDomain('wayfair.com', 'ca')).toBe('wayfair.ca');
    expect(localizeDomain('www.wayfair.co.uk', 'gb')).toBe('wayfair.co.uk');
  });
  it('maps Amazon to the selected country storefront (gb → amazon.co.uk, never .com)', () => {
    expect(localizeDomain('amazon.com', 'gb')).toBe('amazon.co.uk');
    expect(localizeDomain('amazon.com', 'us')).toBe('amazon.com');
    expect(localizeDomain('amazon.co.uk', 'us')).toBe('amazon.com');
    expect(isMultiStorefront('amazon.com')).toBe(true);
  });
  it('never returns another country storefront for GB', () => {
    const gb = localizeDomain('wayfair.com', 'gb');
    expect(gb).toBe('wayfair.co.uk');
    expect(gb).not.toBe('wayfair.com');
    expect(gb).not.toBe('wayfair.ca');
  });
  it('falls back to the US storefront for an unmapped geo (no guessing)', () => {
    expect(localizeDomain('wayfair.com', 'am')).toBe('wayfair.com');
  });
  it('leaves single-storefront retailers unchanged', () => {
    expect(localizeDomain('johnlewis.com', 'gb')).toBe('johnlewis.com');
    expect(localizeDomain('ikea.com', 'gb')).toBe('ikea.com'); // path-based geo, handled by gl
    expect(isMultiStorefront('wayfair.com')).toBe(true);
    expect(isMultiStorefront('johnlewis.com')).toBe(false);
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
  it("maps the 'gb' geo code to UK-tagged retailers (UK enablement)", () => {
    const s: ServerRetailer[] = [
      { name: 'John Lewis', domain: 'johnlewis.com', categories: ['Furniture'], budget: 'mid', regions: ['UK'], rank: 0 },
      { name: 'Habitat', domain: 'habitat.co.uk', categories: ['Furniture'], budget: 'mid', regions: ['UK'], rank: 0 },
      { name: 'West Elm', domain: 'westelm.com', categories: ['Furniture'], budget: 'mid', regions: ['US'], rank: 0 },
    ];
    const item = { category: 'Sofa', taxonomyId: 'seating' };
    const ukNames = shopsForLevel(s, 'any', item, 'gb').map((x) => x.name);
    expect(ukNames).toEqual(expect.arrayContaining(['John Lewis', 'Habitat']));
    expect(ukNames).not.toContain('West Elm');
    // And a US search must NOT pull the UK-only shops.
    const usNames = shopsForLevel(s, 'any', item, 'us').map((x) => x.name);
    expect(usNames).toContain('West Elm');
    expect(usNames).not.toContain('John Lewis');
  });
  it('includes Worldwide/Global retailers for any country (Desenio example)', () => {
    const s: ServerRetailer[] = [
      { name: 'West Elm', domain: 'westelm.com', categories: ['Wall Art'], budget: 'mid', regions: ['US'], rank: 0 },
      { name: 'John Lewis', domain: 'johnlewis.com', categories: ['Wall Art'], budget: 'mid', regions: ['UK'], rank: 0 },
      { name: 'Desenio', domain: 'desenio.com', categories: ['Wall Art'], budget: 'value', regions: ['Worldwide'], rank: 0 },
    ];
    const item = { category: 'Wall Art', taxonomyId: 'art-decor' };
    expect(shopsForLevel(s, 'any', item, 'gb').map((x) => x.name)).toEqual(expect.arrayContaining(['John Lewis', 'Desenio']));
    expect(shopsForLevel(s, 'any', item, 'us').map((x) => x.name)).toEqual(expect.arrayContaining(['West Elm', 'Desenio']));
    // Worldwide retailer present in BOTH; country-specific shops stay in their lane.
    expect(shopsForLevel(s, 'any', item, 'gb').map((x) => x.name)).not.toContain('West Elm');
    expect(shopsForLevel(s, 'any', item, 'us').map((x) => x.name)).not.toContain('John Lewis');
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
