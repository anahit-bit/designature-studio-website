/**
 * GA4 Data API read (I-027). Powers the Acquisition tiles that Search Console
 * can't: traffic-source split (Direct / Social), bounce rate, plus top landing
 * page + top country. One batchRunReports call (4 reports) over a trailing window.
 */
import { getAnalyticsDataClient, ga4PropertyId } from "./googleClients.js";

export interface Ga4Result {
  ok: boolean;
  error?: string;
  totalSessions: number;
  bounceRatePct: number | null;
  channels: Array<{ channel: string; sessions: number; bounceRatePct: number }>;
  organicSearch: number;
  direct: number;
  social: number;
  /** LLM referrals (ChatGPT / Perplexity / Copilot) — GA4's "AI Assistant" channel. GEO leading indicator. */
  aiAssistant: number;
  topLandingPage: { path: string; sessions: number } | null;
  topCountry: { country: string; sessions: number } | null;
}

const EMPTY: Omit<Ga4Result, "ok" | "error"> = {
  totalSessions: 0,
  bounceRatePct: null,
  channels: [],
  organicSearch: 0,
  direct: 0,
  social: 0,
  aiAssistant: 0,
  topLandingPage: null,
  topCountry: null,
};

const pct = (ratio: number) => Number((ratio * 100).toFixed(1));

/** Fetch GA4 acquisition metrics for the last `rangeDays`. Never throws. */
export async function fetchGa4(rangeDays = 28): Promise<Ga4Result> {
  const data = getAnalyticsDataClient();
  if (!data) return { ok: false, error: "Service account not configured", ...EMPTY };
  const propertyId = ga4PropertyId();
  if (!propertyId) return { ok: false, error: "GA4_PROPERTY_ID not set", ...EMPTY };

  const dateRanges = [{ startDate: `${rangeDays}daysAgo`, endDate: "today" }];
  const sessionsDesc = [{ metric: { metricName: "sessions" }, desc: true }];

  try {
    const res = await data.properties.batchRunReports({
      property: `properties/${propertyId}`,
      requestBody: {
        requests: [
          { dateRanges, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }, { name: "bounceRate" }], orderBys: sessionsDesc, limit: "20" },
          { dateRanges, metrics: [{ name: "sessions" }, { name: "bounceRate" }] },
          { dateRanges, dimensions: [{ name: "landingPage" }], metrics: [{ name: "sessions" }], orderBys: sessionsDesc, limit: "1" },
          { dateRanges, dimensions: [{ name: "country" }], metrics: [{ name: "sessions" }], orderBys: sessionsDesc, limit: "1" },
        ],
      },
    });

    const reports = res.data.reports || [];
    const [chan, totals, landing, country] = reports;

    const channels = (chan?.rows || []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value || "(unknown)",
      sessions: Number(r.metricValues?.[0]?.value || 0),
      bounceRatePct: pct(Number(r.metricValues?.[1]?.value || 0)),
    }));
    const byChannel = (name: string) => channels.find((c) => c.channel === name)?.sessions || 0;

    const totRow = totals?.rows?.[0];
    const landRow = landing?.rows?.[0];
    const ctryRow = country?.rows?.[0];

    return {
      ok: true,
      totalSessions: Number(totRow?.metricValues?.[0]?.value || 0),
      bounceRatePct: totRow ? pct(Number(totRow.metricValues?.[1]?.value || 0)) : null,
      channels,
      organicSearch: byChannel("Organic Search"),
      direct: byChannel("Direct"),
      social: byChannel("Organic Social") + byChannel("Paid Social"),
      aiAssistant: byChannel("AI Assistant"),
      topLandingPage: landRow
        ? { path: landRow.dimensionValues?.[0]?.value || "", sessions: Number(landRow.metricValues?.[0]?.value || 0) }
        : null,
      topCountry: ctryRow
        ? { country: ctryRow.dimensionValues?.[0]?.value || "", sessions: Number(ctryRow.metricValues?.[0]?.value || 0) }
        : null,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "GA4 report failed", ...EMPTY };
  }
}

// ─── Insights: traffic pulse + blog readership (extends the Acquisition read) ──

export interface Ga4PulseResult {
  ok: boolean;
  error?: string;
  /** Per-day sessions + users, ascending — powers the trend sparkline. */
  byDate: Array<{ date: string; sessions: number; users: number }>;
  newUsers: number;
  returningUsers: number;
  engagementRatePct: number | null;
  avgEngagementSec: number | null;
  totalUsers: number;
  topPages: Array<{ path: string; views: number; users: number }>;
}

export interface BlogPostStat {
  path: string;
  views: number;
  users: number;
  /** Average engagement time per reader, seconds. */
  avgEngagementSec: number;
}
export interface BlogReadershipResult {
  ok: boolean;
  error?: string;
  totalViews: number;
  totalReaders: number;
  posts: BlogPostStat[];
}

/** GA4 date dimension is "YYYYMMDD" → ISO "YYYY-MM-DD". */
function ga4Date(raw: string): string {
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  return raw;
}

const PULSE_EMPTY: Omit<Ga4PulseResult, "ok" | "error"> = {
  byDate: [], newUsers: 0, returningUsers: 0, engagementRatePct: null, avgEngagementSec: null, totalUsers: 0, topPages: [],
};

/** Traffic pulse: session/user trend, new vs returning, engagement, top pages. Never throws. */
export async function fetchGa4Pulse(rangeDays = 28): Promise<Ga4PulseResult> {
  const data = getAnalyticsDataClient();
  if (!data) return { ok: false, error: "Service account not configured", ...PULSE_EMPTY };
  const propertyId = ga4PropertyId();
  if (!propertyId) return { ok: false, error: "GA4_PROPERTY_ID not set", ...PULSE_EMPTY };

  const dateRanges = [{ startDate: `${rangeDays}daysAgo`, endDate: "today" }];
  try {
    const res = await data.properties.batchRunReports({
      property: `properties/${propertyId}`,
      requestBody: {
        requests: [
          { dateRanges, dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }, { name: "totalUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }], limit: "400" },
          { dateRanges, dimensions: [{ name: "newVsReturning" }], metrics: [{ name: "totalUsers" }] },
          { dateRanges, metrics: [{ name: "engagementRate" }, { name: "averageSessionDuration" }, { name: "totalUsers" }] },
          { dateRanges, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: "10" },
        ],
      },
    });
    const [dateR, nvr, totals, pages] = res.data.reports || [];

    const byDate = (dateR?.rows || []).map((r) => ({
      date: ga4Date(r.dimensionValues?.[0]?.value || ""),
      sessions: Number(r.metricValues?.[0]?.value || 0),
      users: Number(r.metricValues?.[1]?.value || 0),
    }));
    let newUsers = 0, returningUsers = 0;
    for (const r of nvr?.rows || []) {
      const label = (r.dimensionValues?.[0]?.value || "").toLowerCase();
      const u = Number(r.metricValues?.[0]?.value || 0);
      if (label === "new") newUsers += u;
      else if (label === "returning") returningUsers += u;
    }
    const totRow = totals?.rows?.[0];
    const topPages = (pages?.rows || []).map((r) => ({
      path: r.dimensionValues?.[0]?.value || "",
      views: Number(r.metricValues?.[0]?.value || 0),
      users: Number(r.metricValues?.[1]?.value || 0),
    }));

    return {
      ok: true,
      byDate,
      newUsers,
      returningUsers,
      engagementRatePct: totRow ? pct(Number(totRow.metricValues?.[0]?.value || 0)) : null,
      avgEngagementSec: totRow ? Math.round(Number(totRow.metricValues?.[1]?.value || 0)) : null,
      totalUsers: totRow ? Number(totRow.metricValues?.[2]?.value || 0) : 0,
      topPages,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "GA4 pulse failed", ...PULSE_EMPTY };
  }
}

/** Blog readership: per-post views/readers/engagement for pages under /journal. Never throws. */
export async function fetchBlogReadership(rangeDays = 28): Promise<BlogReadershipResult> {
  const data = getAnalyticsDataClient();
  if (!data) return { ok: false, error: "Service account not configured", totalViews: 0, totalReaders: 0, posts: [] };
  const propertyId = ga4PropertyId();
  if (!propertyId) return { ok: false, error: "GA4_PROPERTY_ID not set", totalViews: 0, totalReaders: 0, posts: [] };

  const dateRanges = [{ startDate: `${rangeDays}daysAgo`, endDate: "today" }];
  try {
    const res = await data.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }, { name: "userEngagementDuration" }],
        dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/journal" } } },
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: "30",
      },
    });
    const posts: BlogPostStat[] = (res.data.rows || []).map((r) => {
      const views = Number(r.metricValues?.[0]?.value || 0);
      const users = Number(r.metricValues?.[1]?.value || 0);
      const engDur = Number(r.metricValues?.[2]?.value || 0);
      return {
        path: r.dimensionValues?.[0]?.value || "",
        views,
        users,
        avgEngagementSec: users > 0 ? Math.round(engDur / users) : 0,
      };
    });
    return {
      ok: true,
      totalViews: posts.reduce((a, p) => a + p.views, 0),
      totalReaders: posts.reduce((a, p) => a + p.users, 0),
      posts,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "GA4 blog read failed", totalViews: 0, totalReaders: 0, posts: [] };
  }
}
