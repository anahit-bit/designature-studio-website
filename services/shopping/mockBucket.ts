/**
 * MOCK-only helper: pick which canned bucket of mocks/serper-shopping-mock.json
 * to return for a given query. Routes by the ITEM noun and IGNORES the retailer
 * OR-filter — the old logic scanned the whole query and "Article" (a retailer)
 * contains the substring "art", so every unmatched query wrongly fell into the
 * "art" bucket. Real Serper has no buckets; this only affects MOCK_SERPER dev.
 */
const ROUTES: [RegExp, string][] = [
  [/\b(sofa|couch|loveseat|sectional|settee)\b/, 'sofa'],
  [/\b(armchair|accent chair|lounge chair|dining chair|chair|stool|barstool|bench|ottoman|pouf)\b/, 'chair'],
  [/\b(sideboard|credenza|buffet|cabinet|bookcase|bookshelf|dresser|shelving|shelf|wardrobe|media unit|media console|tv stand|storage)\b/, 'storage'],
  [/\b(coffee table|side table|end table|console table|dining table|writing desk|desk|nightstand|table)\b/, 'table'],
  [/\b(chandelier|pendant|sconce|floor lamp|table lamp|lamp|ceiling light|flush mount|lantern|lighting)\b/, 'lighting'],
  [/\b(area rug|rug|carpet|runner|kilim)\b/, 'rug'],
  [/\b(curtain|curtains|drape|drapes|blind|shade|cushion|pillow|throw|blanket|bedding|duvet|quilt)\b/, 'textiles'],
  [/\b(wall art|art|print|poster|painting|canvas|artwork)\b/, 'art'],
  [/\b(mirror|bowl|tray|sculpture|figurine|candle|object)\b/, 'decor'],
  [/\b(vase|planter|plant pot)\b/, 'vase'],
];

export function mockBucketFor(query: string): string {
  const q = query.toLowerCase().split(' (')[0]; // drop the retailer OR-filter
  for (const [re, bucket] of ROUTES) if (re.test(q)) return bucket;
  return 'default';
}

/**
 * MOCK-only helper: narrow a bucket's entries to the request region so a UK (gl
 * 'gb') search returns UK retailers and a US ('us') search returns US ones.
 * Each mock entry carries a `region` tag ('us' | 'gb'); untagged entries are
 * treated as 'us'. Falls back to the full (unfiltered) bucket if a region has no
 * entries, so the strip is never empty. Mirrors the gl→region intent of the
 * server's regionMatches() (ISO 'gb' ⇒ region 'gb').
 */
export function filterMockByRegion<T extends { region?: string }>(entries: T[], gl: string): T[] {
  const region = (gl || 'us').toLowerCase() === 'gb' ? 'gb' : 'us';
  // A retailer matches if it's tagged for the selected country OR ships worldwide/
  // globally (mirrors the server's regionMatches: country OR worldwide/global).
  const inRegion = entries.filter((e) => {
    const r = (e.region || 'us').toLowerCase();
    return r === region || r === 'worldwide' || r === 'global' || r === 'all';
  });
  return inRegion.length ? inRegion : entries;
}
