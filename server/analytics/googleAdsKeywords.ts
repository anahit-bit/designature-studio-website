/**
 * Google Ads Keyword Planner — free, Google-accurate monthly search volume.
 *
 * The authoritative "how many people search this" number. Uses the Ads API
 * `generateKeywordHistoricalMetrics` endpoint (hand-rolled REST + OAuth refresh,
 * no heavy SDK). Requires a Google Ads account with API access approved.
 *
 * Env (read lazily):
 *   GOOGLE_ADS_DEVELOPER_TOKEN     — from the Ads account API Center (needs Basic access)
 *   GOOGLE_ADS_CLIENT_ID / _SECRET — OAuth client (falls back to GOOGLE_CLIENT_ID/_SECRET)
 *   GOOGLE_ADS_REFRESH_TOKEN       — refresh token for a user with Ads access + adwords scope
 *   GOOGLE_ADS_CUSTOMER_ID         — the Ads customer id (digits; dashes ok)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID   — optional manager (MCC) id
 */
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADS_VERSION = "v17";
const TIMEOUT_MS = 20_000;

function clientId(): string { return (process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim(); }
function clientSecret(): string { return (process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim(); }
function digits(s: string): string { return (s || "").replace(/[^0-9]/g, ""); }

export function googleAdsConfigured(): boolean {
  return !!(
    (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim() &&
    (process.env.GOOGLE_ADS_REFRESH_TOKEN || "").trim() &&
    digits(process.env.GOOGLE_ADS_CUSTOMER_ID || "") &&
    clientId() && clientSecret()
  );
}

async function accessToken(): Promise<string | null> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: (process.env.GOOGLE_ADS_REFRESH_TOKEN || "").trim(),
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = await res.json().catch(() => null);
  return j?.access_token || null;
}

/** Avg monthly Google searches per phrase (lowercased keys), or null. Never throws. */
export async function googleAdsVolumes(phrases: string[]): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  if (!googleAdsConfigured() || phrases.length === 0) return out;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const token = await accessToken();
    if (!token) throw new Error("no access token (check refresh token / OAuth client)");
    const customerId = digits(process.env.GOOGLE_ADS_CUSTOMER_ID || "");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "developer-token": (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim(),
      "Content-Type": "application/json",
    };
    const login = digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "");
    if (login) headers["login-customer-id"] = login;

    const res = await fetch(
      `https://googleads.googleapis.com/${ADS_VERSION}/customers/${customerId}:generateKeywordHistoricalMetrics`,
      {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({ keywords: phrases.map((p) => p.trim()).filter(Boolean), keywordPlanNetwork: "GOOGLE_SEARCH" }),
      },
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`Ads HTTP ${res.status}: ${text.slice(0, 200)}`);
    const j = text ? JSON.parse(text) : {};
    for (const r of j?.results || []) {
      const kw = String(r?.text || "").trim().toLowerCase();
      if (!kw) continue;
      const v = r?.keywordMetrics?.avgMonthlySearches;
      out[kw] = v === undefined || v === null ? null : Number(v);
    }
  } catch (err) {
    console.error("[google-ads-kw] failed:", (err as Error)?.message);
  } finally {
    clearTimeout(timer);
  }
  return out;
}
