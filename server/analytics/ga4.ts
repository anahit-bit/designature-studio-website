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
