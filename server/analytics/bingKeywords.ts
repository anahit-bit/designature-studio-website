/**
 * Bing Webmaster Tools — free keyword volume (GEO watchlist).
 *
 * Bing's Webmaster API is free and works from a server (unlike Google Trends,
 * which 429s datacenter IPs). Numbers are Bing-search-scaled (smaller than
 * Google) but real and directional.
 *
 * Endpoint: GetKeywordStats returns a WEEKLY time-series of {BroadImpressions,
 * Impressions} for the query (verified live 2026-08-17: GetKeyword returns 0/null,
 * GetKeywordStats has the data). We use BroadImpressions (query + variations, the
 * fuller demand signal) and convert the recent weekly buckets → a monthly estimate.
 *
 * ⚠️ MIGRATION DUE: this is the LEGACY api.svc endpoint, which Bing is retiring
 * 2026-08-31. Before then, migrate to the new Bing Webmaster REST API. Until/if it
 * breaks, the provider degrades gracefully to null → "—" (no crash).
 *
 * Env (read lazily): BING_WEBMASTER_API_KEY — Bing Webmaster Tools → Settings →
 * API access → Generate API Key. Site must be verified there (GSC import works).
 */
const BING_API = "https://ssl.bing.com/webmaster/api.svc/json";
const TIMEOUT_MS = 15_000;
const WEEKS_PER_MONTH = 52 / 12; // ≈4.33 — weekly buckets → monthly estimate

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
        // GetKeywordStats: weekly time-series {BroadImpressions, Impressions, Date}.
        const url = `${BING_API}/GetKeywordStats?apikey=${encodeURIComponent(key)}&q=${encodeURIComponent(phrase)}&country=&language=en-US`;
        const j = await bingGet(url);
        const rows: any[] = Array.isArray(j?.d) ? j.d : Array.isArray(j) ? j : [];
        // Broad impressions (query + variations) = the fuller demand signal. Use the
        // most recent ~4 weekly buckets and scale to a monthly figure.
        const broad = rows.map((r) => Number(r?.BroadImpressions ?? 0)).filter((n) => n >= 0);
        const recent = broad.slice(-4);
        if (recent.length === 0) { out[phrase] = null; }
        else {
          const weeklyAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const monthly = Math.round(weeklyAvg * WEEKS_PER_MONTH);
          out[phrase] = monthly > 0 ? monthly : null;
        }
      } catch (err) {
        console.error("[bing-kw] failed for", phrase, (err as Error)?.message);
        out[phrase] = null;
      }
    }),
  );
  return out;
}
