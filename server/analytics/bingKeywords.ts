/**
 * Bing Webmaster Tools — free keyword volume (GEO watchlist).
 *
 * Bing's Webmaster API is free and works from a server (unlike Google Trends,
 * which 429s datacenter IPs). Numbers are Bing-search-scaled (smaller than
 * Google) but real and directional. GetKeyword returns a time-series of monthly
 * impression counts for the exact query; we average the returned buckets into a
 * single monthly estimate.
 *
 * Env (read lazily): BING_WEBMASTER_API_KEY — from Bing Webmaster Tools →
 * Settings → API access. The site should be verified there (one-click import
 * from Google Search Console works).
 */
const BING_API = "https://ssl.bing.com/webmaster/api.svc/json";
const TIMEOUT_MS = 15_000;

export function bingConfigured(): boolean {
  return !!(process.env.BING_WEBMASTER_API_KEY || "").trim();
}

async function bingGet(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`Bing HTTP ${res.status}: ${text.slice(0, 150)}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timer);
  }
}

/** Monthly Bing search-impression estimate per phrase (lowercased keys), or null. */
export async function bingVolumes(phrases: string[]): Promise<Record<string, number | null>> {
  const key = (process.env.BING_WEBMASTER_API_KEY || "").trim();
  const out: Record<string, number | null> = {};
  if (!key) return out;

  await Promise.all(
    phrases.map(async (p) => {
      const phrase = p.trim().toLowerCase();
      if (!phrase) return;
      try {
        // GetKeyword: time-series of Impressions for the exact query (broad match by default).
        const url = `${BING_API}/GetKeyword?apikey=${encodeURIComponent(key)}&q=${encodeURIComponent(phrase)}&country=&language=en-US`;
        const j = await bingGet(url);
        const rows: any[] = Array.isArray(j?.d) ? j.d : Array.isArray(j) ? j : [];
        const imps = rows.map((r) => Number(r?.Impressions ?? 0)).filter((n) => n > 0);
        out[phrase] = imps.length ? Math.round(imps.reduce((a, b) => a + b, 0) / imps.length) : null;
      } catch (err) {
        console.error("[bing-kw] failed for", phrase, (err as Error)?.message);
        out[phrase] = null;
      }
    }),
  );
  return out;
}
