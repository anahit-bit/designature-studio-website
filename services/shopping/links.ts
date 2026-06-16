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
  'society6.com': 'https://society6.com/s?q=',
  'roomandboard.com': 'https://www.roomandboard.com/catalog/search?query=',
  'bludot.com': 'https://www.bludot.com/catalogsearch/result/?q=',
  'desenio.com': 'https://desenio.com/en/search?q=',
};

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
