/**
 * Shared Google service-account auth for the Acquisition read-back (I-027).
 *
 * Reuses the SAME service account already used for Sheets
 * (GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON / _KEYFILE). That account was granted
 * read access to the GSC property + GA4 property on 2026-07-10, and the
 * Search Console API + GA4 Admin/Data APIs were enabled on project
 * my-drive-importer. See _Memory/2026-07-10-website-i027-acquisition-readback-plan.md.
 *
 * Credential loading mirrors the inline logic in server.ts (JSON var preferred,
 * keyfile fallback, `\n`-escaped private keys normalized) so behavior is identical.
 */
import { readFileSync } from "fs";
import { google } from "googleapis";

/**
 * Env is read LAZILY (inside these getters), not at module top-level — under ESM
 * this module is imported before server.ts runs dotenv.config(), so a top-level
 * read would see an empty value in local dev. (Railway injects env directly, so
 * prod is unaffected, but lazy is correct in both.)
 */
/** GA4 numeric property id (NOT the G-xxxx stream id). */
export function ga4PropertyId(): string {
  return (process.env.GA4_PROPERTY_ID || "").trim();
}

/** Search Console property. Domain properties use the `sc-domain:` prefix. */
export function gscSiteUrl(): string {
  return (process.env.GSC_SITE_URL || "sc-domain:designature.studio").trim();
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/** Load + normalize the service-account credentials, or null if unconfigured/invalid. */
export function loadServiceAccount(): ServiceAccount | null {
  const json = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
  const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();
  if (!json && !keyFile) return null;
  try {
    const creds = json ? JSON.parse(json) : JSON.parse(readFileSync(keyFile, "utf-8"));
    if (typeof creds?.private_key === "string" && creds.private_key.includes("\\n")) {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }
    if (!creds?.client_email || !creds?.private_key) return null;
    return { client_email: creds.client_email, private_key: creds.private_key };
  } catch {
    return null;
  }
}

function jwtFor(creds: ServiceAccount, scopes: string[]) {
  return new google.auth.JWT({ email: creds.client_email, key: creds.private_key, scopes });
}

/** Search Console v3 client (read-only), or null if credentials are unavailable. */
export function getSearchConsoleClient() {
  const creds = loadServiceAccount();
  if (!creds) return null;
  return google.webmasters({
    version: "v3",
    auth: jwtFor(creds, ["https://www.googleapis.com/auth/webmasters.readonly"]),
  });
}

/** GA4 Data API (v1beta) client (read-only), or null if credentials are unavailable. */
export function getAnalyticsDataClient() {
  const creds = loadServiceAccount();
  if (!creds) return null;
  return google.analyticsdata({
    version: "v1beta",
    auth: jwtFor(creds, ["https://www.googleapis.com/auth/analytics.readonly"]),
  });
}

/** True when both credentials and the GA4 property id are present. */
export function isAcquisitionConfigured(): boolean {
  return loadServiceAccount() !== null && ga4PropertyId() !== "";
}
