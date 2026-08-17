/**
 * Insights orchestrator — powers the /admin Insights tab. Combines GA4 (traffic
 * pulse + blog readership + channels) and Search Console (query/page tables +
 * per-phrase rank lookups for the GEO watchlist) into one payload, cached 6h so
 * the admin page never hammers the Google APIs. Degrades gracefully: unconfigured
 * → configured:false; a single source failing still returns the rest.
 *
 * The watchlist phrases are passed in (owner-editable, stored in app_state), so
 * the cache is keyed by the phrase set — editing the list refreshes on next load.
 */
import { fetchGa4, fetchGa4Pulse, fetchBlogReadership, type Ga4Result, type Ga4PulseResult, type BlogReadershipResult } from "./ga4.js";
import { fetchSearchConsole, fetchGscInsights, lookupPhrase, type GscResult, type GscInsightsResult, type PhraseRank } from "./searchConsole.js";
import { isAcquisitionConfigured } from "./googleClients.js";
import { getKeywordVolumes, type PhraseVolume } from "./keywordVolume.js";

export interface InsightsData {
  configured: boolean;
  updatedAt: string;
  rangeDays: number;
  pulse: Ga4PulseResult | null;
  /** Channels + AI-assistant + bounce (reuses the Acquisition GA4 read). */
  channels: Ga4Result | null;
  blog: BlogReadershipResult | null;
  gscHeadline: GscResult | null;
  gsc: GscInsightsResult | null;
  watchlist: PhraseRank[];
  /** Per-phrase search volume (lowercased keys) from configured free sources. */
  volumes: Record<string, PhraseVolume>;
  /** Which volume sources are live, e.g. ["google","bing"]. Empty → none connected. */
  volumeSources: string[];
}

const RANGE = 28;
const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_PHRASES = 25;

let cache: { key: string; data: InsightsData; expires: number } | null = null;
let inFlight: Promise<InsightsData> | null = null;

export function clearInsightsCache(): void {
  cache = null;
  inFlight = null;
}

function emptyData(configured: boolean): InsightsData {
  return { configured, updatedAt: new Date().toISOString(), rangeDays: RANGE, pulse: null, channels: null, blog: null, gscHeadline: null, gsc: null, watchlist: [], volumes: {}, volumeSources: [] };
}

async function build(phrases: string[]): Promise<InsightsData> {
  if (!isAcquisitionConfigured()) return emptyData(false);
  const cleaned = phrases.map((p) => p.trim()).filter(Boolean).slice(0, MAX_PHRASES);

  const [pulse, channels, blog, gscHeadline, gsc] = await Promise.all([
    fetchGa4Pulse(RANGE),
    fetchGa4(RANGE),
    fetchBlogReadership(RANGE),
    fetchSearchConsole(RANGE),
    fetchGscInsights(RANGE),
  ]);
  const [watchlist, vol] = await Promise.all([
    Promise.all(cleaned.map((p) => lookupPhrase(p, RANGE))),
    getKeywordVolumes(cleaned),
  ]);

  return { configured: true, updatedAt: new Date().toISOString(), rangeDays: RANGE, pulse, channels, blog, gscHeadline, gsc, watchlist, volumes: vol.byPhrase, volumeSources: vol.sources };
}

/** Cached insights for the given watchlist phrases. `force` bypasses the cache. */
export async function getInsights(phrases: string[], force = false): Promise<InsightsData> {
  const key = phrases.map((p) => p.trim().toLowerCase()).sort().join("|");
  const now = Date.now();
  if (!force && cache && cache.key === key && cache.expires > now) return cache.data;
  if (inFlight) return inFlight;

  inFlight = build(phrases)
    .then((data) => {
      if (data.configured) cache = { key, data, expires: Date.now() + TTL_MS };
      return data;
    })
    .catch((err) => {
      if (cache) return cache.data;
      const d = emptyData(true);
      d.pulse = { ok: false, error: err instanceof Error ? err.message : "failed", byDate: [], newUsers: 0, returningUsers: 0, engagementRatePct: null, avgEngagementSec: null, totalUsers: 0, topPages: [] };
      return d;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}
