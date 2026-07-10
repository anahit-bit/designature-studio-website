/**
 * Search Console Search Analytics read (I-027). Pulls Google-organic-search
 * data for the /admin Acquisition section: totals + top queries + top page +
 * top country over a trailing window. GSC only sees Google organic search —
 * direct/social come from GA4 (see ga4.ts). Data lags ~2–3 days.
 */
import { getSearchConsoleClient, gscSiteUrl } from "./googleClients.js";

export interface GscResult {
  ok: boolean;
  error?: string;
  clicks: number;
  impressions: number;
  ctrPct: number;
  position: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number }>;
  topPage: { page: string; clicks: number } | null;
  topCountry: { country: string; clicks: number } | null;
}

const EMPTY: Omit<GscResult, "ok" | "error"> = {
  clicks: 0,
  impressions: 0,
  ctrPct: 0,
  position: 0,
  topQueries: [],
  topPage: null,
  topCountry: null,
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Fetch the last `rangeDays` of Search Analytics. Never throws — returns {ok:false,error}. */
export async function fetchSearchConsole(rangeDays = 28): Promise<GscResult> {
  const sc = getSearchConsoleClient();
  if (!sc) return { ok: false, error: "Service account not configured", ...EMPTY };

  const siteUrl = gscSiteUrl();
  const startDate = isoDaysAgo(rangeDays);
  const endDate = isoDaysAgo(0);
  const base = { startDate, endDate };

  try {
    const [totals, queries, pages, countries] = await Promise.all([
      sc.searchanalytics.query({ siteUrl, requestBody: { ...base, rowLimit: 1 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { ...base, dimensions: ["query"], rowLimit: 8 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { ...base, dimensions: ["page"], rowLimit: 1 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { ...base, dimensions: ["country"], rowLimit: 1 } }),
    ]);

    const t = totals.data.rows?.[0];
    const topPageRow = pages.data.rows?.[0];
    const topCountryRow = countries.data.rows?.[0];

    return {
      ok: true,
      clicks: Math.round(t?.clicks ?? 0),
      impressions: Math.round(t?.impressions ?? 0),
      ctrPct: Number(((t?.ctr ?? 0) * 100).toFixed(1)),
      position: Number((t?.position ?? 0).toFixed(1)),
      topQueries: (queries.data.rows || []).map((r) => ({
        query: r.keys?.[0] || "",
        clicks: Math.round(r.clicks ?? 0),
        impressions: Math.round(r.impressions ?? 0),
      })),
      topPage: topPageRow ? { page: topPageRow.keys?.[0] || "", clicks: Math.round(topPageRow.clicks ?? 0) } : null,
      // GSC returns ISO-3166-alpha-3 country codes (e.g. "usa", "arm").
      topCountry: topCountryRow
        ? { country: (topCountryRow.keys?.[0] || "").toUpperCase(), clicks: Math.round(topCountryRow.clicks ?? 0) }
        : null,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "GSC query failed", ...EMPTY };
  }
}
