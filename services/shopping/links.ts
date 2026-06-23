/**
 * Shopping List — direct-retailer link resolution + source cleanup (pure).
 * Shared by /api/shopping/search and /api/shopping/alternate (was duplicated
 * inline in both). #12 P2 rule: NEVER surface a google.com link. If a Serper
 * hit exposes no real merchant URL, extractDirectLink returns "" and the caller
 * SKIPS the hit and scans the next one (correctness over fill-rate; server-side
 * redirect-following is a later optimization only if real fill-rate is too low).
 */

/** A usable, direct merchant URL — http(s) and NOT a google.com page/redirect. */
export function isDirect(u?: string | null): u is string {
  return !!u && u.startsWith('http') && !u.includes('google.com');
}

/**
 * Pull the DIRECT retailer product URL out of a Serper shopping hit, or "" when
 * none is resolvable. Order: explicit productLink/merchantLink → an `adurl`/
 * `url`/`q` redirect param embedded in a Google link → the raw link if it's
 * already direct → "" (skip).
 */
export function extractDirectLink(r: any): string {
  if (isDirect(r?.productLink)) return r.productLink;
  if (isDirect(r?.merchantLink)) return r.merchantLink;
  if (r?.link) {
    try {
      const urlObj = new URL(r.link);
      const adUrl = urlObj.searchParams.get('adurl') || urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (isDirect(adUrl)) return adUrl;
    } catch {
      const m = String(r.link).match(/[?&](?:adurl|url|q)=([^&]+)/i);
      if (m) {
        const decoded = decodeURIComponent(m[1]);
        if (isDirect(decoded)) return decoded;
      }
    }
    if (isDirect(r.link)) return r.link;
  }
  return ''; // no direct retailer link — skip rather than show a Google URL
}

/**
 * Heuristics to tell a specific PRODUCT page from a category/search/listing page.
 * Real Serper `/search` resolution often surfaces a retailer's category or range
 * page above the actual product; pickBestProductUrl() uses these to prefer the
 * product page so users land on the item, not a department.
 */
const PRODUCT_PATH = /\/(p|products?|dp|pdp|ip|pip|item|items|prod|buy)\//i;
export function isProductUrl(u?: string | null): boolean {
  if (!u) return false;
  // A listing/category/search page is never a product — even when its path ends
  // in a numeric *category* id (e.g. /cat/indoor-plant-pots-10778/).
  if (isCategoryUrl(u)) return false;
  let path = u;
  try { path = new URL(u).pathname; } catch { /* treat raw string as path */ }
  if (PRODUCT_PATH.test(path)) return true;          // /p/, /products/, /dp/, /pdp/, /item/, /buy/
  if (/\/p\d{4,}(\/|$)/i.test(path)) return true;    // John Lewis  …/p3567890
  if (/\/s\d{5,}(\/|$)/i.test(path)) return true;    // CB2         …/s258612
  if (/-w\d{5,}\.html/i.test(path)) return true;     // Wayfair/AllModern …-w12345.html
  if (/[-/]\d{5,}(\.html)?\/?$/i.test(path)) return true; // IKEA …-90601200/  · trailing numeric id
  return false;
}

/** A listing/search/category/home page — NOT a single product. */
export function isCategoryUrl(u?: string | null): boolean {
  if (!u) return false;
  try {
    const url = new URL(u);
    const sp = url.searchParams;
    if (['q', 'query', 'keyword', 'keywords', 'search', 'searchterm', 'k', 'term'].some((k) => sp.has(k))) return true;
    const path = url.pathname.replace(/\/+$/, '');
    if (path === '') return true; // homepage / root
    if (/\/(search|category|categories|cat|range|ranges|shop|collection|collections|browse|department|departments|list|keyword|results|catalog|catalogsearch)(\/|$|\.php|\.html)/i.test(url.pathname)) return true;
    return false;
  } catch {
    return /[?&](q|query|keyword|search|k|term)=/i.test(u) || /\/(search|category|cat|range|shop|collection|browse|results)(\/|$|\.php)/i.test(u);
  }
}

/**
 * From a Serper `/search` organic result list, pick the best link ON the retailer
 * domain: a real product page first, then any non-listing page, then (last) the
 * first on-domain hit. Returns "" when nothing is on-domain (caller falls back to
 * the retailer site-search). `organic` items are `{ link }` shapes from Serper.
 */
export function pickBestProductUrl(organic: Array<{ link?: string }> | undefined, domain: string): string {
  const d = (domain || '').toLowerCase().replace(/^www\./, '').trim();
  if (!d) return '';
  const onDomain = (organic || []).filter((o) => {
    try {
      const h = new URL(o.link as string).hostname.toLowerCase().replace(/^www\./, '');
      return h === d || h.endsWith('.' + d);
    } catch { return false; }
  });
  if (!onDomain.length) return '';
  const product = onDomain.find((o) => isProductUrl(o.link));
  if (product?.link) return product.link;
  const nonCategory = onDomain.find((o) => !isCategoryUrl(o.link));
  if (nonCategory?.link) return nonCategory.link;
  return (onDomain[0].link as string) || '';
}

// Per-retailer site-search URL patterns (verified structurally valid 2026-06-15).
// Real Serper /shopping returns NO merchant product URLs (only google.com links),
// so we link to the retailer's own search for the exact product title — a real,
// working destination on the actual store. Unknown retailers use a generic ?q=.
const SEARCH_TEMPLATES: Record<string, string> = {
  'westelm.com': 'https://www.westelm.com/search/results.html?words=',
  'potterybarn.com': 'https://www.potterybarn.com/search/results.html?words=',
  'cb2.com': 'https://www.cb2.com/search?query=',
  'crateandbarrel.com': 'https://www.crateandbarrel.com/search?query=',
  'article.com': 'https://www.article.com/search?q=',
  'allmodern.com': 'https://www.allmodern.com/keyword.php?keyword=',
  'ikea.com': 'https://www.ikea.com/us/en/search/?q=',
  'wayfair.com': 'https://www.wayfair.com/keyword.php?keyword=',
  'wayfair.co.uk': 'https://www.wayfair.co.uk/keyword.php?keyword=',
  'wayfair.ca': 'https://www.wayfair.ca/keyword.php?keyword=',
  'amazon.com': 'https://www.amazon.com/s?k=',
  'amazon.co.uk': 'https://www.amazon.co.uk/s?k=',
  'amazon.ca': 'https://www.amazon.ca/s?k=',
  'society6.com': 'https://society6.com/s?q=',
  'roomandboard.com': 'https://www.roomandboard.com/catalog/search?query=',
  'bludot.com': 'https://www.bludot.com/catalogsearch/result/?q=',
  'desenio.com': 'https://desenio.com/en/search?q=',
};

/**
 * Country-specific storefronts. Some retailers run a SEPARATE site per country
 * (different TLD), so a UK search MUST resolve to e.g. wayfair.co.uk — never
 * wayfair.com (US) or wayfair.ca. The curated Sanity `domain` holds the brand's
 * primary domain; this maps it to the right storefront for the selected geo
 * (Serper `gl`). Retailers with ONE global site (amara.com) or geo PATHS
 * (ikea.com/gb/…) are NOT listed — the `gl` bias already routes those correctly.
 * Add a brand here when it has distinct per-country TLDs.
 */
const COUNTRY_STOREFRONTS: Record<string, Record<string, string>> = {
  wayfair: { gb: 'wayfair.co.uk', us: 'wayfair.com', ca: 'wayfair.ca', de: 'wayfair.de' },
  amazon: { gb: 'amazon.co.uk', us: 'amazon.com', ca: 'amazon.ca', de: 'amazon.de', fr: 'amazon.fr' },
};

/** Brand key from a domain ("www.wayfair.co.uk" → "wayfair"). */
function brandOf(domain: string): string {
  return (domain || '').toLowerCase().replace(/^www\./, '').split('.')[0];
}

/** True if the domain's brand runs distinct per-country storefronts. */
export function isMultiStorefront(domain?: string | null): boolean {
  return !!COUNTRY_STOREFRONTS[brandOf(domain || '')];
}

/**
 * Map a curated retailer domain to the correct country storefront for `gl`
 * (e.g. wayfair.com + 'gb' → 'wayfair.co.uk'). Single-storefront brands are
 * returned unchanged. Strict: a recognised brand with no entry for `gl` falls
 * back to its 'us' storefront rather than guessing.
 */
export function localizeDomain(domain: string, gl: string): string {
  const d = (domain || '').toLowerCase().replace(/^www\./, '').trim();
  const map = COUNTRY_STOREFRONTS[brandOf(d)];
  if (!map) return d;
  const g = (gl || 'us').toLowerCase();
  return map[g] || map['us'] || d;
}

/** Strip the leading brand + noisy punctuation from a Serper product title. */
export function cleanProductTitle(title: string, retailerName?: string): string {
  let t = (title || '').trim();
  if (retailerName) {
    const esc = retailerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp('^' + esc + '\\s*', 'i'), '')            // leading brand
      .replace(new RegExp('\\s*[-–—|]\\s*' + esc + '\\s*$', 'i'), '') // trailing "- CB2"
      .trim();
  }
  t = t.replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b(\w+)\s+\1\b/gi, '$1'); // collapse a doubled word ("Rug Rug" → "Rug")
  return t.split(' ').slice(0, 8).join(' ') || (title || '').trim();
}

/**
 * A real, working link to a product: the retailer's own site searched for the
 * exact product title. `domain` comes from the curated Sanity retailer catalog.
 * Returns "" when there's no domain to link to.
 */
export function retailerSearchUrl(domain: string, title: string, retailerName?: string): string {
  const d = (domain || '').toLowerCase().replace(/^www\./, '').trim();
  if (!d) return '';
  const q = encodeURIComponent(cleanProductTitle(title, retailerName));
  const base = SEARCH_TEMPLATES[d] || `https://${d}/search?q=`;
  return base + q;
}

/** Turn a raw domain/source ("www.westelm.com") into a clean label ("Westelm"). */
export function cleanSource(raw: string): string {
  const s = (raw || '')
    .replace(/^https?:\/\//i, '').replace(/^www\./i, '')
    .split(/[/?#]/)[0]
    .replace(/\.(com|org|net|edu|gov|io|co|uk|ca|au|de|fr|am|ae)$/i, '')
    .split(/[-_.]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    .trim();
  return s || 'Shop';
}
