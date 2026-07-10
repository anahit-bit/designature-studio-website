/**
 * Acquisition orchestrator (I-027). Combines Search Console + GA4 into the shape
 * the /admin Acquisition section renders, with an in-memory TTL cache so the
 * admin dashboard (polled) never hammers the Google APIs. Degrades gracefully:
 * if one source fails, the other still renders; if unconfigured, `configured:false`.
 */
import { fetchGa4, type Ga4Result } from "./ga4.js";
import { fetchSearchConsole, type GscResult } from "./searchConsole.js";
import { isAcquisitionConfigured } from "./googleClients.js";

export interface AcquisitionData {
  configured: boolean;
  updatedAt: string;
  rangeDays: number;
  ga4: Ga4Result | null;
  gsc: GscResult | null;
}

const RANGE_DAYS = 28;
/** Cache TTL — GSC data only refreshes ~daily, so a few hours is plenty. */
const TTL_MS = 6 * 60 * 60 * 1000;

let cache: { data: AcquisitionData; expires: number } | null = null;
let inFlight: Promise<AcquisitionData> | null = null;

async function build(): Promise<AcquisitionData> {
  if (!isAcquisitionConfigured()) {
    return { configured: false, updatedAt: new Date().toISOString(), rangeDays: RANGE_DAYS, ga4: null, gsc: null };
  }
  const [ga4, gsc] = await Promise.all([fetchGa4(RANGE_DAYS), fetchSearchConsole(RANGE_DAYS)]);
  return { configured: true, updatedAt: new Date().toISOString(), rangeDays: RANGE_DAYS, ga4, gsc };
}

/**
 * Return acquisition data, served from cache when fresh. Concurrent callers
 * during a refresh share one in-flight fetch. `force` bypasses the cache.
 */
export async function getAcquisition(force = false): Promise<AcquisitionData> {
  const now = Date.now();
  if (!force && cache && cache.expires > now) return cache.data;
  if (inFlight) return inFlight;

  inFlight = build()
    .then((data) => {
      // Only cache a configured result; transient "unconfigured" (e.g. env not
      // yet loaded) shouldn't be pinned for 6h.
      if (data.configured) cache = { data, expires: Date.now() + TTL_MS };
      return data;
    })
    .catch((err) => {
      // On a hard failure, serve stale cache if we have it; else surface empty.
      if (cache) return cache.data;
      return {
        configured: true,
        updatedAt: new Date().toISOString(),
        rangeDays: RANGE_DAYS,
        ga4: { ok: false, error: err instanceof Error ? err.message : "failed", totalSessions: 0, bounceRatePct: null, channels: [], organicSearch: 0, direct: 0, social: 0, topLandingPage: null, topCountry: null },
        gsc: { ok: false, error: err instanceof Error ? err.message : "failed", clicks: 0, impressions: 0, ctrPct: 0, position: 0, topQueries: [], topPage: null, topCountry: null },
      } as AcquisitionData;
    })
    .finally(() => { inFlight = null; });

  return inFlight;
}

/** Test helper — clear the module cache. */
export function __clearAcquisitionCache(): void {
  cache = null;
  inFlight = null;
}
