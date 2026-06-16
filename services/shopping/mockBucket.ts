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
