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

// ─── Insights: expanded query/page tables + exact-phrase rank lookup ──────────

export interface GscQueryRow { query: string; clicks: number; impressions: number; ctrPct: number; position: number; }
export interface GscPageRow { page: string; clicks: number; impressions: number; position: number; }

export interface GscInsightsResult {
  ok: boolean;
  error?: string;
  queries: GscQueryRow[];
  /** How many brand queries were filtered out of `queries` (shown as a note). */
  brandHidden: number;
  /** Top /journal pages by impressions — per-post search visibility (GEO working). */
  journalPages: GscPageRow[];
}

/**
 * Brand-query detector. Brand searches (designature + its common typos, studioture,
 * "stature design") are people who already know the studio — no discovery insight —
 * so we hide them from the Search & GEO table. Extend the pattern if new typos appear.
 */
const BRAND_QUERY_RE = /designat|studioture|stature\s*design/i;
export function isBrandQuery(q: string | undefined): boolean {
  return BRAND_QUERY_RE.test((q || "").trim());
}

/** Expanded query table (with position, brand queries hidden) + per-Journal-page perf. Never throws. */
export async function fetchGscInsights(rangeDays = 28): Promise<GscInsightsResult> {
  const sc = getSearchConsoleClient();
  if (!sc) return { ok: false, error: "Service account not configured", queries: [], brandHidden: 0, journalPages: [] };
  const siteUrl = gscSiteUrl();
  const base = { startDate: isoDaysAgo(rangeDays), endDate: isoDaysAgo(0) };

  try {
    const [queries, pages] = await Promise.all([
      // Fetch extra rows so brand-filtering still leaves a full table of discovery queries.
      sc.searchanalytics.query({ siteUrl, requestBody: { ...base, dimensions: ["query"], rowLimit: 60 } }),
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          ...base,
          dimensions: ["page"],
          rowLimit: 15,
          dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/journal" }] }],
        },
      }),
    ]);

    const allQueries = (queries.data.rows || []).map((r) => ({
      query: r.keys?.[0] || "",
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      ctrPct: Number(((r.ctr ?? 0) * 100).toFixed(1)),
      position: Number((r.position ?? 0).toFixed(1)),
    }));
    const discovery = allQueries.filter((q) => !isBrandQuery(q.query));
    const brandHidden = allQueries.length - discovery.length;

    return {
      ok: true,
      brandHidden,
      queries: discovery.slice(0, 25),
      journalPages: (pages.data.rows || []).map((r) => ({
        page: r.keys?.[0] || "",
        clicks: Math.round(r.clicks ?? 0),
        impressions: Math.round(r.impressions ?? 0),
        position: Number((r.position ?? 0).toFixed(1)),
      })),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "GSC insights failed", queries: [], brandHidden: 0, journalPages: [] };
  }
}

export interface PhraseRank {
  phrase: string;
  found: boolean;
  clicks: number;
  impressions: number;
  ctrPct: number;
  /** Google average position; null when the phrase has no impressions in range. */
  position: number | null;
}

/**
 * Exact-phrase rank lookup for the GEO watchlist. GSC query strings are
 * lowercased, so we match on the lowercased phrase. `found:false` means the site
 * had zero impressions for that exact query in range (not ranking yet).
 */
export async function lookupPhrase(phrase: string, rangeDays = 28): Promise<PhraseRank> {
  const clean = phrase.trim().toLowerCase();
  const empty: PhraseRank = { phrase: clean, found: false, clicks: 0, impressions: 0, ctrPct: 0, position: null };
  const sc = getSearchConsoleClient();
  if (!sc || !clean) return empty;
  const siteUrl = gscSiteUrl();
  const base = { startDate: isoDaysAgo(rangeDays), endDate: isoDaysAgo(0) };

  try {
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        ...base,
        dimensions: ["query"],
        rowLimit: 1,
        dimensionFilterGroups: [{ filters: [{ dimension: "query", operator: "equals", expression: clean }] }],
      },
    });
    const row = res.data.rows?.[0];
    if (!row) return empty;
    return {
      phrase: clean,
      found: true,
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
      ctrPct: Number(((row.ctr ?? 0) * 100).toFixed(1)),
      position: Number((row.position ?? 0).toFixed(1)),
    };
  } catch {
    return empty;
  }
}
