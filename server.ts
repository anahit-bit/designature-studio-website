import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import { google } from "googleapis";
import * as net from "net";

// ─── Gemini SDK (used by shopping identify + room audit endpoints) ─────────────
import { GoogleGenAI } from "@google/genai";

// ─── AI Vision pipeline services ──────────────────────────────────────────────
import { extractStyleBrief } from "./services/aiVision/styleExtraction.js";
import { generateConceptImage } from "./services/aiVision/imageGeneration.js";
import { getCacheKey, getCachedBrief, setCachedBrief } from "./services/aiVision/styleCache.js";
import { STYLE_NAME_TO_PRESET, ROOM_NAME_TO_TYPE } from "./services/aiVision/stylePresets.js";

// ─── Shopping List search-accuracy (#12): price + direct-link + match helpers ─
import { normalizePrice } from "./src/lib/priceParse.js";
import { extractDirectLink, cleanSource, retailerSearchUrl, cleanProductTitle, pickBestProductUrl, localizeDomain, isMultiStorefront } from "./services/shopping/links.js";
import { buildShoppingQuery, pickMatches } from "./services/shopping/match.js";
import { dedupeItems, pickFreeItems } from "./services/shopping/select.js";
import { getRetailers, shopsForLevel, matchRetailer } from "./services/shopping/retailers.js";
import { mockBucketFor, filterMockByRegion } from "./services/shopping/mockBucket.js";
import { SHOPPING_TAXONOMY, SHOPPING_TAXONOMY_IDS, categoryToTaxonomyId } from "./src/data/shoppingTaxonomy.js";

// ─── Payments foundation (I-024 / B0): Postgres migration at boot ─────────────
import { runMigrations } from "./db/migrate.js";
import { getPool } from "./db/pgPool.js";
import { loadState, saveState } from "./db/state.js";
import { sendEmail } from "./lib/email.js";
// ─── Payments Rail B (I-025): Ameriabank vPOS $99 consultation ────────────────
import {
  getAmeriaConfig,
  buildGatewayRedirectUrl,
  initPayment,
  getPaymentDetails,
  refundPayment,
  cancelPayment,
  evaluatePaymentSuccess,
  normalizeCode,
} from "./services/payments/ameria.js";
// ─── Book-first consultation (I-025-v2): Calendly availability + Google Calendar ─
import { filterAvailable, gmtLabelForTz } from "./services/consultation/slots.js";
import {
  getConsultationConfig,
  isCalendlyConfigured,
  fetchCalendlyAvailableSlots,
  HORIZON_DAYS,
} from "./services/consultation/calendly.js";
import {
  buildConsentUrl,
  exchangeCodeForTokens,
  getRedirectUri as getCalendarRedirectUri,
  isCalendarConfigured,
  insertEvent as calendarInsertEvent,
  deleteEvent as calendarDeleteEvent,
} from "./services/calendar/googleCalendar.js";
// ─── GEO / SEO (Phase 1): robots, sitemap, per-route meta + JSON-LD injection ──
import { buildRobotsTxt } from "./server/config/bots.js";
import { buildSitemap } from "./server/seo/sitemap.js";
import { renderRoute, loadTemplate } from "./server/seo/render.js";
import { absUrl } from "./server/seo/config.js";
// ─── Legacy WordPress → canonical redirect map (GSC unindexed-pages fix) ───────
import { legacyRedirects } from "./server/redirects.js";

const FALLBACK_ENV_PATH = 'E:/Secrets/Website/.env';
dotenv.config({
  path: existsSync('.env')
    ? '.env'
    : existsSync(FALLBACK_ENV_PATH)
    ? FALLBACK_ENV_PATH
    : undefined,
});

/** Free tier caps (UI + API). Paid tier can be added later with an `isPaid` flag. */
const FREE_TIER_MAX_CONCEPTS = 3;
const FREE_TIER_MAX_SHOPPING_LISTS = 3;
/** Free tier: identify enumerates ALL items, but Serper only searches the top N;
 *  the rest come back as a `teaser` (names only) to drive the upgrade hook. Paid = all. */
const FREE_TIER_MAX_ITEMS = 4;
/** Hard cap on TOTAL surfaced items (searched + teaser), for ALL tiers. Identify
 *  enumerates everything, but a room of 27 distinct objects reads as noise — we
 *  keep only the N most significant pieces (furniture/lighting/rugs first, then
 *  the most prominent decor). Paid shops all N; free shops FREE_TIER_MAX_ITEMS of
 *  them and the rest fill in as locked teaser markers. Override via SHOPPING_MAX_ITEMS. */
const MAX_LIST_ITEMS = (() => {
  const parsed = parseInt((process.env.SHOPPING_MAX_ITEMS || "12"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
})();

/** Accounts that get unlimited quotas — never clamped or decremented. */
const UNLIMITED_ACCOUNT_EMAILS = [
  "anahit@designature.studio",
  "anahit.ghasabyan@gmail.com",
];

/** @deprecated kept for call-sites that haven't been updated yet */
const CONCEPT_TEST_ACCOUNT_EMAIL = UNLIMITED_ACCOUNT_EMAILS[0];

function isConceptTestAccountEmail(email: string): boolean {
  return UNLIMITED_ACCOUNT_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * I-011 — admin allowlist for /api/admin/* endpoints.
 * Narrower than UNLIMITED_ACCOUNT_EMAILS: only the studio owner sees observability.
 */
const ADMIN_EMAILS = ["anahit@designature.studio"];
function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// ─── JSON "database": in-memory object, durably persisted to Postgres ───────
// Historically this lived ONLY in `users.json` on disk. On Railway that disk is
// ephemeral (wiped every redeploy) → /admin reset to 0. Now the object is held
// in memory (`dbCache`), write-through-persisted to the `app_state` Postgres row
// on every writeDB(), and mirrored to the local file for dev convenience + a
// fallback when Postgres is unreachable. See db/state.ts + db/migrate.ts.
const DB_PATH = "./users.json";
const DB_SEED_PATH = "./users.seed.json";

// Which app_state row this process owns. Dev and prod share one Railway Postgres
// instance, so isolate them: prod → 'main', local dev → 'dev'. Railway injects a
// whole family of RAILWAY_* env vars, so detect the platform by ANY of them
// (robust to Railway renaming individual vars). Override with APP_STATE_ID if
// ever needed. Getting this wrong in prod would make prod read the dev row, so
// keep the detection broad.
const IS_RAILWAY = Object.keys(process.env).some((k) => k.startsWith("RAILWAY_"));
const STATE_ID = (process.env.APP_STATE_ID || (IS_RAILWAY ? "main" : "dev")).trim();

interface User {
  email: string;
  name: string;
  picture: string;
  googleId: string;
  generationsLeft: number;
  /** Remaining shopping-list runs (Serper searches) for free tier; optional in older `users.json` */
  shoppingListsLeft?: number;
  isPaid?: boolean;
  auditQuota?: number;
  createdAt: string;
  lastUsed: string;
  /** True for records imported from the Google Sheet historical roster that have
   *  not yet signed in via Google (so no real googleId). Cleared on reconciliation
   *  at their next login. Purely for admin visibility of the pre-existing roster. */
  backfilled?: boolean;
}

function normalizeUserForFreeTier(user: User): { user: User; changed: boolean } {
  let changed = false;
  const u = { ...user };
  const isUnlimited = isConceptTestAccountEmail(u.email);

  if (isUnlimited) {
    // Unlimited accounts (owner/demo) — force 999, never clamp
    if (u.generationsLeft !== 999) { u.generationsLeft = 999; changed = true; }
    if (u.shoppingListsLeft !== 999) { u.shoppingListsLeft = 999; changed = true; }
  } else {
    // Everyone else — enforce free-tier caps regardless of isPaid flag.
    // (No paid tier exists yet; isPaid on the user record is only used for
    //  audit access in the API response, not for quota bypass.)
    if (u.generationsLeft > FREE_TIER_MAX_CONCEPTS) {
      u.generationsLeft = FREE_TIER_MAX_CONCEPTS;
      changed = true;
    }
    if (typeof u.shoppingListsLeft !== "number" || Number.isNaN(u.shoppingListsLeft)) {
      u.shoppingListsLeft = FREE_TIER_MAX_SHOPPING_LISTS;
      changed = true;
    }
    if (u.shoppingListsLeft > FREE_TIER_MAX_SHOPPING_LISTS) {
      u.shoppingListsLeft = FREE_TIER_MAX_SHOPPING_LISTS;
      changed = true;
    }
  }
  return { user: u, changed };
}

interface SerperLogEntry {
  ts: string;
  userEmail: string;
  query: string;
  count: number;
  source: string;
}

/** Per-provider rolling counters across daily/weekly/monthly UTC windows (I-010, history[] added I-021b). */
interface ProviderCounter {
  daily:   { date: string; count: number }; // YYYY-MM-DD
  weekly:  { date: string; count: number }; // YYYY-Www  (ISO week)
  monthly: { date: string; count: number }; // YYYY-MM
  /** Per-day history, capped at 30 days. Powers sparklines in /admin. */
  history?: Array<{ date: string; count: number }>;
}

/** Max days of per-provider per-day history we keep for sparklines (I-021b). */
const PROVIDER_HISTORY_DAYS = 30;

interface DB {
  users: Record<string, User>; // keyed by googleId
  /** Per-UTC-day Serper credit usage. Reset when `date` rolls over. */
  serperUsage?: { date: string; count: number };
  /** Append-only forensic log of Serper-burning calls. Capped at 1000 entries. */
  serperLog?: SerperLogEntry[];
  /** Per-provider call counters (I-010). Lazy-initialized on first call. */
  apiCounters?: Record<string, ProviderCounter>;
  /** Append-only user activity log (I-016). Capped at 5000 entries.
   *  `source` is set on signup entries only (C-followup, 2026-05-19).
   *  `meta` carries structured event payload (e.g. payment order_id/amount). */
  activityLog?: Array<{ ts: string; userEmail: string; action: string; source?: string; meta?: Record<string, unknown> }>;
  /** Durable feedback inbox (2026-07-10). The message body is written to a Google
   *  Sheet via Apps Script for archive, but we ALSO keep it here so /admin has a
   *  readable, ownable inbox that survives redeploys. Capped at 2000, FIFO. */
  feedback?: Array<{
    ts: string;
    name: string;
    email: string;
    country?: string;
    type: string;        // 'testimonial' | 'bug' | 'feature' | 'general'
    message: string;
    rating?: number | null;
    projectType?: string;
    status: 'new' | 'read';
  }>;
}

/** UTC YYYY-MM-DD for daily-budget bucketing. */
function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** ISO timestamp for the next UTC midnight after `now`. */
function nextUtcMidnightIso(now: Date = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return next.toISOString();
}

/** ISO-week key like "2026-W19" (UTC). */
function utcWeekString(d: Date = new Date()): string {
  // ISO week: Thursday of the same week determines the week-year.
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Month key "YYYY-MM" (UTC). */
function utcMonthString(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * I-010 — bump per-provider counters in rolling daily/weekly/monthly UTC windows.
 * Mutates `db.apiCounters` in place; caller is responsible for `writeDB(db)`.
 */
function recordApiCall(db: DB, provider: string, delta: number = 1): void {
  if (!db.apiCounters) db.apiCounters = {};
  const today = utcDateString();
  const week = utcWeekString();
  const month = utcMonthString();
  if (!db.apiCounters[provider]) {
    db.apiCounters[provider] = {
      daily:   { date: today, count: 0 },
      weekly:  { date: week,  count: 0 },
      monthly: { date: month, count: 0 },
    };
  }
  const c = db.apiCounters[provider];
  if (c.daily.date   !== today) c.daily   = { date: today, count: 0 };
  if (c.weekly.date  !== week)  c.weekly  = { date: week,  count: 0 };
  if (c.monthly.date !== month) c.monthly = { date: month, count: 0 };
  c.daily.count   += delta;
  c.weekly.count  += delta;
  c.monthly.count += delta;

  // I-021b — per-day history for sparklines, capped at PROVIDER_HISTORY_DAYS.
  if (!c.history) c.history = [];
  const last = c.history.length > 0 ? c.history[c.history.length - 1] : null;
  if (last && last.date === today) {
    last.count += delta;
  } else {
    c.history.push({ date: today, count: delta });
  }
  // Trim entries older than the window — compute the cutoff string once.
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - PROVIDER_HISTORY_DAYS);
  const cutoff = utcDateString(cutoffDate);
  c.history = c.history.filter((h) => h.date >= cutoff);
}

/** Convenience wrapper: read/bump/write in one call. For routes that don't already touch the DB. */
function bumpApiCount(provider: string, delta: number = 1): void {
  try {
    const db = readDB();
    recordApiCall(db, provider, delta);
    writeDB(db);
  } catch (err) {
    console.error(`[apiCounters] failed to bump ${provider}:`, err);
  }
}

/** Sentinel for logged-out visitors in the activity log. Rendered muted in the admin UI. */
const ANON_USER = "anonymous";

/**
 * I-016 — append an activity log entry. Caps at 5000 entries (FIFO drop).
 * Mutates `db.activityLog` in place; caller owns `writeDB(db)`.
 * `source` (C-followup) is only meaningful on signup entries; pass undefined
 * for everything else so the JSON stays compact.
 */
function logActivity(
  db: DB,
  userEmail: string,
  action: string,
  source?: string,
  meta?: Record<string, unknown>,
): void {
  if (!db.activityLog) db.activityLog = [];
  const entry: { ts: string; userEmail: string; action: string; source?: string; meta?: Record<string, unknown> } = {
    ts: new Date().toISOString(),
    userEmail,
    action,
  };
  if (source && source.trim()) entry.source = source.trim().slice(0, 60);
  if (meta && Object.keys(meta).length > 0) entry.meta = meta;
  db.activityLog.push(entry);
  while (db.activityLog.length > 5000) db.activityLog.shift();
}

/** Convenience wrapper: read/log/write in one call. Used by routes that don't already touch the DB. */
function recordActivity(userEmail: string, action: string, meta?: Record<string, unknown>): void {
  try {
    const db = readDB();
    logActivity(db, userEmail, action, undefined, meta);
    writeDB(db);
  } catch (err) {
    console.error(`[activityLog] failed to record ${action}:`, err);
  }
}

/**
 * Auto-expire stale slot holds (I-025-v2, book-first). When a customer holds a
 * slot but doesn't complete payment inside the 20-minute window, this sweep flips
 * the 'pending' order to 'cancelled', which drops it out of the partial unique
 * index and returns the slot to availability. No bank call — the payment was
 * never captured. Fires a consultation_slot_expired activity event per row.
 * Runs on a 5-minute interval (set up in startServer).
 */
async function expireStalePendingOrders(): Promise<void> {
  try {
    const r = await getPool().query(
      `UPDATE orders SET status = 'cancelled'
        WHERE status = 'pending'
          AND product_type = 'consultation'
          AND slot_hold_expires_at IS NOT NULL
          AND slot_hold_expires_at < NOW()
        RETURNING id, ameria_order_id, client_email, slot_start_time`,
    );
    for (const row of r.rows) {
      recordActivity(row.client_email || ANON_USER, "consultation_slot_expired", {
        order_id: row.id,
        ameria_order_id: row.ameria_order_id,
        slot_start_time: row.slot_start_time ? new Date(row.slot_start_time).toISOString() : null,
      });
    }
    if (r.rows.length > 0) {
      console.log(`[expire] released ${r.rows.length} expired slot hold(s)`);
    }
  } catch (err) {
    console.error("[expire] slot-hold expiry sweep failed:", err);
  }
}

// In-memory source of truth. Hydrated from Postgres at boot (hydrateDbFromPostgres),
// or lazily from the local file if a helper touches the DB before boot / when
// Postgres is unreachable (dev without DATABASE_URL).
let dbCache: DB | null = null;

/** The original file/seed load path — now a fallback, not the primary store. */
function readDbFromFile(): DB {
  if (!existsSync(DB_PATH)) {
    if (existsSync(DB_SEED_PATH)) {
      writeFileSync(DB_PATH, readFileSync(DB_SEED_PATH, "utf-8"));
    } else {
      writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
    }
  }
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function readDB(): DB {
  if (dbCache) return dbCache;
  // Pre-boot / Postgres-less fallback: behave exactly like before this change so
  // unit tests importing helpers (without startServer) and dev without a DB URL
  // keep working off the file. Boot replaces this via hydrateDbFromPostgres().
  dbCache = readDbFromFile();
  return dbCache;
}

// Coalescing Postgres persister — always writes the LATEST dbCache, with at most
// one write in flight and one queued. Bursts of writeDB() (some handlers write
// two or three times) collapse into a small number of queries.
let persisting = false;
let persistQueued = false;
async function persistState(): Promise<void> {
  if (persisting) {
    persistQueued = true;
    return;
  }
  persisting = true;
  try {
    do {
      persistQueued = false;
      if (dbCache) await saveState(STATE_ID, dbCache);
    } while (persistQueued);
  } catch (err) {
    // Non-fatal: the data is safe in memory + the file mirror; it just isn't
    // durable across a redeploy until Postgres is reachable again.
    console.error(
      "[state] Postgres persist failed (data kept in memory + file mirror):",
      err instanceof Error ? err.message : err,
    );
  } finally {
    persisting = false;
  }
}

function writeDB(db: DB) {
  dbCache = db;
  // Best-effort local file mirror — keeps dev debugging easy and provides a
  // fallback read source. Never throw into the request path.
  try {
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch {
    /* ignore — Postgres is the durable store */
  }
  // Durable write-through to Postgres (the fix for Railway's ephemeral disk).
  void persistState();
}

/**
 * Read the historical free-user roster from the Google Sheet (A–K columns).
 * Used once, at boot, to backfill /admin so it isn't empty on day one — the sheet
 * is the only durable record of everyone who signed in before this fix. Read-only;
 * returns [] on any missing-credential / API error (never throws into boot).
 * Column order A–K: created_at, email, name, provider, plan, first_login_at,
 * last_login_at, login_count, country, tool_used, source.
 */
async function readFreeUsersFromSheet(): Promise<
  Array<{ createdAt: string; email: string; name: string; firstLogin: string; lastLogin: string }>
> {
  const spreadsheetId = (
    process.env.FREE_USERS_SPREADSHEET_ID || "14aFSp92YNw7DiBS-k3Ci7-pW_rIzQ_qURPkqzLirg0M"
  ).trim();
  const serviceAccountJson = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
  const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();
  if ((!serviceAccountJson && !keyFile) || !spreadsheetId) return [];

  let credentials: any;
  credentials = serviceAccountJson
    ? JSON.parse(serviceAccountJson)
    : JSON.parse(readFileSync(keyFile, "utf-8"));
  if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }
  if (!credentials?.client_email || !credentials?.private_key) return [];

  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheetsApi = google.sheets({ version: "v4", auth: jwtClient });

  const meta = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });
  const firstSheetTitle = meta.data.sheets?.[0]?.properties?.title;
  if (!firstSheetTitle) return [];

  const existing = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `${firstSheetTitle}!A:K`,
    majorDimension: "ROWS",
  });
  const rows = existing.data.values ?? [];
  const out: Array<{ createdAt: string; email: string; name: string; firstLogin: string; lastLogin: string }> = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const email = String(row[1] || "").trim();
    if (!email) continue;
    if (i === 0 && email.toLowerCase() === "email") continue; // header row
    out.push({
      createdAt: String(row[0] || ""),
      email,
      name: String(row[2] || ""),
      firstLogin: String(row[5] || ""),
      lastLogin: String(row[6] || ""),
    });
  }
  return out;
}

/**
 * One-time backfill of the historical roster into `dbCache.users`. Adds only
 * emails not already present, keyed by `sheet:<email>` with `backfilled: true`
 * and no googleId. They're upgraded to their real googleId key on next login
 * (reconciliation in /api/auth/google). No-op if the sheet is unreadable.
 */
async function backfillUsersFromSheet(): Promise<void> {
  if (!dbCache) return;
  try {
    const rows = await readFreeUsersFromSheet();
    if (!rows.length) return;
    const existingEmails = new Set(
      Object.values(dbCache.users).map((u) => (u.email || "").trim().toLowerCase()),
    );
    let added = 0;
    for (const r of rows) {
      const emailLower = r.email.trim().toLowerCase();
      if (!emailLower || existingEmails.has(emailLower)) continue;
      dbCache.users[`sheet:${emailLower}`] = {
        email: r.email.trim(),
        name: r.name || r.email.trim(),
        picture: "",
        googleId: "",
        generationsLeft: FREE_TIER_MAX_CONCEPTS,
        shoppingListsLeft: FREE_TIER_MAX_SHOPPING_LISTS,
        createdAt: r.createdAt || r.firstLogin || new Date().toISOString(),
        lastUsed: r.lastLogin || r.createdAt || new Date().toISOString(),
        backfilled: true,
      };
      existingEmails.add(emailLower);
      added++;
    }
    if (added) console.log(`✅ backfilled ${added} historical user(s) from Google Sheet into app_state`);
  } catch (err) {
    console.error("[backfill] sheet backfill skipped:", err instanceof Error ? err.message : err);
  }
}

/**
 * Boot hydration: load the durable state from Postgres into `dbCache`. On a
 * fresh row, seed from the local file then backfill the historical roster from
 * the Google Sheet, and persist. If Postgres is unreachable, degrade to the
 * file-backed behavior (identical to before this change → zero regression).
 */
async function hydrateDbFromPostgres(): Promise<void> {
  // Keep the local file mirror in step with what we just loaded/seeded, so the
  // on-disk users.json is never a stale snapshot for anyone inspecting it.
  const mirrorToFile = () => {
    try {
      if (dbCache) writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2));
    } catch {
      /* ignore — Postgres is the durable store */
    }
  };
  try {
    const stored = (await loadState(STATE_ID)) as unknown as DB | null;
    if (stored && typeof stored === "object" && stored.users) {
      dbCache = stored;
      const userCount = Object.keys(dbCache.users).length;
      console.log(`✅ app_state hydrated from Postgres (id='${STATE_ID}', ${userCount} users)`);
      if (userCount === 0) {
        await backfillUsersFromSheet();
        await saveState(STATE_ID, dbCache);
      }
      mirrorToFile();
      return;
    }
    // First boot on this row — seed from file, backfill roster, persist.
    dbCache = readDbFromFile();
    if (!dbCache.users) dbCache.users = {};
    console.log(
      `app_state empty for id='${STATE_ID}' — seeding from file (${Object.keys(dbCache.users).length} users) + Google Sheet backfill`,
    );
    await backfillUsersFromSheet();
    await saveState(STATE_ID, dbCache);
    console.log(`✅ app_state initialized in Postgres (id='${STATE_ID}', ${Object.keys(dbCache.users).length} users)`);
    mirrorToFile();
  } catch (err) {
    console.error(
      "⚠️  app_state hydration failed — falling back to file-backed users.json (NOT durable across redeploys):",
      err instanceof Error ? err.message : err,
    );
    dbCache = readDbFromFile();
    if (!dbCache.users) dbCache.users = {};
  }
}

// ─── Platform inventory (I-012) ─────────────────────────────────────────────
// Loaded once at startup from server/config/platforms.json. Read-only after boot.
interface Platform {
  name: string;
  owner_email: string;
  monthly_cost: string;
  /** Annual cost when on an annual plan or computable from monthly (I-021d). */
  annual_cost?: string | null;
  free_tier_quota: string | null;
  renewal_date: string | null;
  powers: string;
  criticality: number;
}
const PLATFORMS_PATH = "./server/config/platforms.json";
let PLATFORMS: Platform[] = [];
try {
  PLATFORMS = JSON.parse(readFileSync(PLATFORMS_PATH, "utf-8")) as Platform[];
  console.log(`[platforms] loaded ${PLATFORMS.length} entries from ${PLATFORMS_PATH}`);
} catch (err) {
  console.error(`[platforms] failed to load ${PLATFORMS_PATH}:`, err);
}

// ─── Session store (in-memory, keyed by session token) ─────────────────────
const sessions: Record<string, string> = {}; // token → googleId

function createSession(googleId: string): string {
  const token = createHash("sha256")
    .update(googleId + Date.now() + Math.random())
    .digest("hex");
  sessions[token] = googleId;
  return token;
}

function getSession(token: string): string | null {
  return sessions[token] || null;
}

// ─── Admin session store (I-019) ────────────────────────────────────────────
// Separate from end-user sessions. Backed by an HttpOnly cookie. Lost on
// process restart — acceptable for v1 (admin re-logs in).
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h per spec
const ADMIN_COOKIE_NAME = "admin_session";
const adminSessions: Record<string, { email: string; expiresAt: number }> = {};

function createAdminSession(email: string): string {
  const token = randomBytes(32).toString("hex");
  adminSessions[token] = { email, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS };
  return token;
}

function getAdminSession(token: string): { email: string } | null {
  const s = adminSessions[token];
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    delete adminSessions[token];
    return null;
  }
  return { email: s.email };
}

function destroyAdminSession(token: string): void {
  delete adminSessions[token];
}

/** Tiny cookie parser — avoids pulling in cookie-parser for one cookie. */
function parseCookies(req: any): Record<string, string> {
  const raw = req.headers?.cookie;
  if (!raw || typeof raw !== "string") return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// ─── Login rate limit (I-019) ───────────────────────────────────────────────
// In-memory per-IP: 5 failed attempts → 15-minute lockout. Resets on success.
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const loginAttempts: Record<string, { count: number; lockedUntil: number }> = {};

function clientIp(req: any): string {
  return ((req.headers["x-forwarded-for"] as string) || req.ip || "unknown")
    .split(",")[0]
    .trim();
}

// ─── Journal comment submission rate limit (Phase 2) ────────────────────────
// In-memory per-IP sliding window: at most N comment POSTs per window. Best-effort
// spam brake (paired with a honeypot field + admin moderation), lost on restart.
const COMMENT_MAX_PER_WINDOW = 5;
const COMMENT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const commentPostTimes: Record<string, number[]> = {};
function isCommentRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (commentPostTimes[ip] || []).filter((t) => now - t < COMMENT_WINDOW_MS);
  if (recent.length >= COMMENT_MAX_PER_WINDOW) {
    commentPostTimes[ip] = recent;
    return true;
  }
  recent.push(now);
  commentPostTimes[ip] = recent;
  return false;
}

function isLockedOut(ip: string): { locked: boolean; resetIn: number; remaining: number } {
  const rec = loginAttempts[ip];
  if (!rec) return { locked: false, resetIn: 0, remaining: ADMIN_LOGIN_MAX_ATTEMPTS };
  if (rec.lockedUntil > Date.now()) {
    return { locked: true, resetIn: rec.lockedUntil - Date.now(), remaining: 0 };
  }
  if (rec.lockedUntil > 0) {
    // lock expired — reset record
    delete loginAttempts[ip];
    return { locked: false, resetIn: 0, remaining: ADMIN_LOGIN_MAX_ATTEMPTS };
  }
  return { locked: false, resetIn: 0, remaining: ADMIN_LOGIN_MAX_ATTEMPTS - rec.count };
}

function recordLoginAttempt(ip: string, success: boolean): void {
  if (success) {
    delete loginAttempts[ip];
    return;
  }
  const rec = loginAttempts[ip] || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + ADMIN_LOGIN_LOCKOUT_MS;
  }
  loginAttempts[ip] = rec;
}

// ─── Server ────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  // Railway's service networking routes to a FIXED target port of 3000 (set when
  // the app first shipped). Following Railway's injected $PORT (8080) instead
  // makes the edge proxy miss the app → 502. Keep the app on 3000 to match.
  const PORT = 3000;

  // Raised to 100 MB to accommodate base64-encoded room + reference images in one request
  app.use(express.json({ limit: "100mb" }));

  // ── Cloudinary Configuration ──
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // ── Payments foundation (I-024 / B0): ensure orders + subscriptions tables ──
  // Idempotent CREATE ... IF NOT EXISTS. Don't let a transient DB outage block
  // the rest of the server (AI tools, auth, admin) from booting in dev — log
  // loudly instead so payments breakage is obvious.
  try {
    await runMigrations();
  } catch (err) {
    console.error(
      "❌ payments DB migration failed — payments features will not work:",
      err instanceof Error ? err.message : err,
    );
  }

  // ── Admin durability: hydrate the in-memory DB from Postgres (app_state) ──
  // MUST run after migrations (needs the app_state table) and before the app
  // starts serving, so the first request sees the durable state, not the wiped
  // ephemeral file. Degrades to file-backed if Postgres is unreachable.
  await hydrateDbFromPostgres();

  // Sweep stale pending consultation orders → cancelled, every 5 minutes (I-025).
  // Run once at boot to clear anything left stale across a restart, then on an
  // interval. unref() so the timer never keeps the process alive on its own.
  void expireStalePendingOrders();
  const expireTimer = setInterval(() => void expireStalePendingOrders(), 5 * 60 * 1000);
  expireTimer.unref();

  // ════════════════════════════════════════════════════════════════════════
  // I-021b · Per-provider cost estimates (USD per call).
  // ════════════════════════════════════════════════════════════════════════
  // Rough estimates — refresh when provider pricing materially changes.
  // Used to compute "API spend MTD" + "cost per active user" in /api/admin/usage.
  //
  // Gemini     : 2.5-flash text/image roughly $0.0001/call at our prompt sizes.
  // Cloudinary : free tier (25 credits = ~25k transforms) — $0 within budget.
  // Serper     : Shopping API at $0.02/credit on the $50/2,500 plan.
  // Sheets     : Google Sheets API — free.
  // IPApi      : free tier 1k/day — $0 within budget.
  // EmailJS    : free tier 200/mo — $0 within budget.
  // ════════════════════════════════════════════════════════════════════════
  const CALL_COSTS: Record<string, number> = {
    gemini:     0.0001,
    cloudinary: 0,
    serper:     0.02,
    sheets:     0,
    ipapi:      0,
    emailjs:    0,
  };
  /** Free-tier hard caps per provider (monthly unless noted) — used for cost bars. */
  const PROVIDER_FREE_CAPS: Record<string, { window: 'daily' | 'monthly'; limit: number; label: string }> = {
    gemini:     { window: 'daily',   limit: 1500, label: '1,500 / day' },
    cloudinary: { window: 'monthly', limit:   25, label: '25 credits / mo' },
    serper:     { window: 'daily',   limit:  200, label: '200 / day' },
    sheets:     { window: 'monthly', limit:    0, label: 'no fixed cap' },
    ipapi:      { window: 'daily',   limit: 1000, label: '1,000 / day' },
    emailjs:    { window: 'monthly', limit:  200, label: '200 / mo' },
  };

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "ai-studio-uploads",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    } as any,
  });

  const upload = multer({ storage: storage });

  // ── POST /api/upload — upload image to Cloudinary ──
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    bumpApiCount("cloudinary"); // I-010
    res.json({ url: req.file.path });
  });

  // ── GET /api/images — list images from Cloudinary ──
  app.get("/api/images", async (req, res) => {
    try {
      const { folder = "ai-studio-uploads" } = req.query;
      const folderName = String(folder || "").trim();

      // Cloudinary can run in "dynamic folders" mode where public_id paths are flattened.
      // In that setup, prefix search won't find by folder, so prefer asset_folder query.
      try {
        const byAssetFolder = await cloudinary.api.resources_by_asset_folder(folderName, {
          type: "upload",
          max_results: 200,
        } as any);
        return res.json(byAssetFolder.resources || []);
      } catch (assetFolderErr) {
        // Fallback for accounts/files that still use folder-prefixed public_id
        const byPrefix = await cloudinary.api.resources({
          type: "upload",
          prefix: folderName,
          max_results: 200,
        });
        return res.json(byPrefix.resources || []);
      }
    } catch (error: any) {
      console.error("Cloudinary list error:", error);
      res.status(500).json({ error: error.message || "Failed to list images" });
    }
  });

  // ── Auth middleware helper ──
  function requireAuth(req: any, res: any): string | null {
    const token = req.headers["x-session-token"] as string;
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }
    const googleId = getSession(token);
    if (!googleId) {
      res.status(401).json({ error: "Session expired" });
      return null;
    }
    return googleId;
  }

  // ── I-019: admin gate for /api/admin/* + /admin/* surfaces ──────────────────
  // Replaces the Phase B email-allowlist gate. Reads the HttpOnly admin_session
  // cookie (set by /api/admin/login), validates the token against adminSessions,
  // returns {email} on success or null with 401 already sent.
  //
  // Old name `requireAdmin` is kept as an alias so the 3 pre-existing
  // /api/admin/* endpoints (reset-user, users, usage) don't churn yet — they
  // pick up the new gate transparently.
  function requireAdminAuth(req: any, res: any): { email: string } | null {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }
    const session = getAdminSession(token);
    if (!session) {
      res.status(401).json({ error: "Session expired" });
      return null;
    }
    return session;
  }

  /** @deprecated alias preserved during the I-011 → I-019 migration. */
  function requireAdmin(req: any, res: any): { email: string } | null {
    return requireAdminAuth(req, res);
  }

  // ── Free-tier users Google Sheets upsert (best-effort) ──────────────────
  async function upsertFreeTierUserByEmail(params: {
    email: string;
    name: string;
    provider: string;
    plan: string;
    country: string;
    toolUsed: string;
    source: string;
    createdAt: string;
    nowIso: string;
  }) {
    const spreadsheetId =
      (process.env.FREE_USERS_SPREADSHEET_ID ||
        "14aFSp92YNw7DiBS-k3Ci7-pW_rIzQ_qURPkqzLirg0M").trim();

    const serviceAccountJson = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
    const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();

    // Do not break auth flow if env vars are missing.
    if (!serviceAccountJson && !keyFile) {
      console.warn(
        "Google Sheets upsert skipped: missing GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON/GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE"
      );
      return;
    }

    if (!spreadsheetId) {
      console.warn("Google Sheets upsert skipped: missing FREE_USERS_SPREADSHEET_ID");
      return;
    }

    let credentials: any;
    try {
      if (serviceAccountJson) {
        credentials = JSON.parse(serviceAccountJson);
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      } else {
        credentials = JSON.parse(readFileSync(keyFile, "utf-8"));
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      }
    } catch (err) {
      console.error("Google Sheets upsert skipped: invalid service account credentials", err);
      return;
    }

    if (!credentials?.client_email || !credentials?.private_key) {
      console.error("Google Sheets upsert skipped: missing client_email/private_key in service account JSON");
      return;
    }

    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes,
    });

    const sheetsApi = google.sheets({ version: "v4", auth: jwtClient });

    const createdAt = params.createdAt || params.nowIso;
    const rowNow = params.nowIso;
    const emailLower = params.email.trim().toLowerCase();

    // 1) Find the first worksheet/tab title
    const meta = await sheetsApi.spreadsheets.get({
      spreadsheetId,
      fields: "sheets(properties(title))",
    });
    const firstSheetTitle = meta.data.sheets?.[0]?.properties?.title;
    if (!firstSheetTitle) {
      console.warn("Google Sheets upsert skipped: could not read first worksheet/tab title");
      return;
    }

    // 2) Read existing A-K cells and upsert by email (column B)
    const range = `${firstSheetTitle}!A:K`;
    const existing = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension: "ROWS",
    });
    const rows = existing.data.values ?? [];

    // Optional header detection: if row 1 looks like our headers, skip it.
    let headerOffset = 0;
    const firstRow = rows[0] || [];
    const firstCell = String(firstRow[0] || "").toLowerCase();
    const secondCell = String(firstRow[1] || "").toLowerCase();
    if (firstCell === "created_at" && secondCell === "email") headerOffset = 1;

    let matchIndex = -1;
    for (let i = headerOffset; i < rows.length; i++) {
      const row = rows[i] || [];
      const rowEmail = String(row[1] || "").trim().toLowerCase();
      if (rowEmail === emailLower) {
        matchIndex = i;
        break;
      }
    }

    // Column order A-K:
    // created_at,email,name,provider,plan,first_login_at,last_login_at,login_count,country,tool_used,source
    const toStr = (v: any) => (v == null ? "" : String(v));

    if (matchIndex >= 0) {
      const existingRow = rows[matchIndex] || [];
      const createdAtExisting = toStr(existingRow[0]) || createdAt;
      const firstLoginExisting = toStr(existingRow[5]) || createdAt;

      const parsedCount = parseInt(String(existingRow[7] ?? ""), 10);
      const loginCountNext = Number.isFinite(parsedCount) ? parsedCount + 1 : 1;

      const rowNumber = matchIndex + 1; // sheet rows are 1-indexed
      const rowUpdate = [
        createdAtExisting, // preserve created_at
        params.email,
        params.name,
        params.provider,
        params.plan,
        firstLoginExisting, // preserve first_login_at
        rowNow, // last_login_at
        loginCountNext,
        params.country,
        params.toolUsed,
        params.source,
      ];

      await sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range: `${firstSheetTitle}!A${rowNumber}:K${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [rowUpdate] },
      });
      bumpApiCount("sheets"); // I-010 — free-tier user upsert (update)
    } else {
      const newRow = [
        createdAt,
        params.email,
        params.name,
        params.provider,
        params.plan,
        createdAt, // first_login_at
        rowNow, // last_login_at
        1, // login_count
        params.country,
        params.toolUsed,
        params.source,
      ];

      await sheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: `${firstSheetTitle}!A:K`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [newRow] },
      });
      bumpApiCount("sheets"); // I-010 — free-tier user upsert (insert)
    }
  }

  // ── Newsletter sheet read (I-021b) ─────────────────────────────────────
  // Pulls the live newsletter list for the /admin newsletter section.
  // Returns the lifetime row count + the 5 newest rows.
  const NEWSLETTER_SHEET_ID = "1ADcawOqI2VElxwPSSuL-PGX3OjHehacod_ApDPRqFo4";
  async function readNewsletterFromSheet(): Promise<{ count: number; recent: Array<{ email: string; signupDate: string; source: string }>; all: Array<{ email: string; signupDate: string; source: string }>; error?: string }> {
    const serviceAccountJson = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
    const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();
    if (!serviceAccountJson && !keyFile) {
      return { count: 0, recent: [], all: [], error: "Sheet credentials not configured" };
    }

    let credentials: any;
    try {
      if (serviceAccountJson) {
        credentials = JSON.parse(serviceAccountJson);
      } else {
        credentials = JSON.parse(readFileSync(keyFile, "utf-8"));
      }
      if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
      }
    } catch {
      return { count: 0, recent: [], all: [], error: "Sheet credentials invalid" };
    }

    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheetsApi = google.sheets({ version: "v4", auth: jwtClient });

    const meta = await sheetsApi.spreadsheets.get({
      spreadsheetId: NEWSLETTER_SHEET_ID,
      fields: "sheets(properties(title))",
    });
    const sheetTitle = meta.data.sheets?.[0]?.properties?.title;
    if (!sheetTitle) return { count: 0, recent: [], all: [], error: "Sheet has no tabs" };

    const data = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: NEWSLETTER_SHEET_ID,
      range: `${sheetTitle}!A:D`,
      majorDimension: "ROWS",
    });
    bumpApiCount("sheets"); // I-010 — successful Sheets read
    const rows = data.data.values || [];

    // Detect header row: row 1 has 'email' in column B → skip it.
    const headerOffset = rows[0] && String(rows[0][1] || "").trim().toLowerCase() === "email" ? 1 : 0;
    const body = rows.slice(headerOffset);
    const count = body.length;
    // Newest first — powers both the dashboard recent-5 and the full Waitlist page.
    const all = body
      .slice()
      .reverse()
      .map((r) => ({
        email: String(r[1] || ""),
        signupDate: String(r[0] || ""),
        source: String(r[3] || ""),
      }));
    return { count, recent: all.slice(0, 5), all };
  }

  // ── POST /api/auth/google — exchange Google ID token for session ──
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, toolUsed, source } = req.body || {};
      if (!credential) {
        return res.status(400).json({ error: "Missing credential" });
      }

      // Decode the JWT payload (Google ID token) — parts are base64url encoded
      const parts = credential.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ error: "Invalid credential format" });
      }

      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
      );

      const { sub: googleId, email, name, picture } = payload;

      if (!googleId || !email) {
        return res.status(400).json({ error: "Invalid token payload" });
      }

      // Get or create user
      const db = readDB();
      let user = db.users[googleId];
      let isNewUser = !user;

      if (!user) {
        // Before creating fresh, reconcile any record with the same email stored
        // under a DIFFERENT key — e.g. a "sheet:<email>" placeholder backfilled
        // from the historical roster (no googleId yet). Adopt it under the real
        // googleId so we don't duplicate the account and we keep the original
        // createdAt. Such a user pre-existed, so it's NOT a new signup.
        const emailLower = email.trim().toLowerCase();
        const priorKey = Object.keys(db.users).find(
          (k) => k !== googleId && (db.users[k].email || "").trim().toLowerCase() === emailLower,
        );
        if (priorKey) {
          const prior = db.users[priorKey];
          delete db.users[priorKey];
          user = {
            ...prior,
            email,
            name: name || prior.name || email,
            picture: picture || prior.picture || "",
            googleId,
            lastUsed: new Date().toISOString(),
          };
          delete user.backfilled;
          db.users[googleId] = user;
          isNewUser = false;
          console.log(`Reconciled backfilled user ${email} → googleId ${googleId}`);
        } else {
          // New user — give 3 free generations + 3 shopping list runs
          user = {
            email,
            name: name || email,
            picture: picture || "",
            googleId,
            generationsLeft: FREE_TIER_MAX_CONCEPTS,
            shoppingListsLeft: FREE_TIER_MAX_SHOPPING_LISTS,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
          };
          db.users[googleId] = user;
          console.log(`New user registered: ${email}`);
        }
      } else {
        // Existing user — update profile info
        user.email = email;
        user.name = name || user.name;
        user.picture = picture || user.picture;
        user.lastUsed = new Date().toISOString();
        db.users[googleId] = user;
        console.log(`Existing user logged in: ${email} (${user.generationsLeft} gens left)`);
      }

      // I-016 — log signup or login; written together with the user record below.
      // C-followup: signup entries carry a `source` slug for attribution. Empty / missing
      // source falls back to "unknown" so the activation breakdown stays honest.
      if (isNewUser) {
        const signupSource = typeof source === "string" && source.trim() ? source.trim() : "unknown";
        logActivity(db, email, "signup", signupSource);
      } else {
        logActivity(db, email, "login");
      }
      writeDB(db);

      // Clamp legacy accounts (e.g. admin-inflated concept counts) and migrate shoppingListsLeft
      {
        const norm = normalizeUserForFreeTier(user);
        user = norm.user;
        if (norm.changed) {
          db.users[googleId] = user;
          writeDB(db);
        }
      }

      const token = createSession(googleId);

      // Best-effort free-tier tracking update (must never break auth flow)
      const nowIso = new Date().toISOString();
      void upsertFreeTierUserByEmail({
        email,
        name: user.name,
        provider: "google",
        plan: "free",
        country: "",
        toolUsed: typeof toolUsed === "string" ? toolUsed : "",
        source: typeof source === "string" ? source : "",
        createdAt: user.createdAt || nowIso,
        nowIso,
      }).catch((err) => console.error("Free-tier Google Sheets upsert error:", err));

      const ownerLogin = isConceptTestAccountEmail(user.email);
      res.json({
        token,
        // I-023 — lets the client fire a GA4 `signup` event for first-time accounts.
        // Independent of the server-side activityLog signup entry written above.
        isNewUser,
        user: {
          email: user.email,
          name: user.name,
          picture: user.picture,
          generationsLeft: user.generationsLeft,
          shoppingListsLeft: user.shoppingListsLeft,
          isPaid: ownerLogin ? true : false,
          auditsLeft: ownerLogin ? 999 : 0,
        },
      });
    } catch (err) {
      console.error("Auth error:", err);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // ── Tracker endpoints (I-016) ─────────────────────────────────────────────
  // Tiny endpoints that only log to activityLog. Anon-tolerant: when no session,
  // userEmail is recorded as "anonymous". Never 5xx — tracking must not break UX.
  function emailFromSession(req: any): string {
    try {
      const token = req.headers["x-session-token"] as string;
      if (!token) return ANON_USER;
      const googleId = getSession(token);
      if (!googleId) return ANON_USER;
      const db = readDB();
      const user = db.users[googleId];
      return user?.email || ANON_USER;
    } catch {
      return ANON_USER;
    }
  }

  app.post("/api/track/calendly", (req, res) => {
    recordActivity(emailFromSession(req), "calendly_click");
    res.json({ ok: true });
  });

  app.post("/api/track/quiz-start", (req, res) => {
    recordActivity(emailFromSession(req), "quiz_start");
    res.json({ ok: true });
  });

  app.post("/api/track/quiz-complete", (req, res) => {
    recordActivity(emailFromSession(req), "quiz_complete");
    res.json({ ok: true });
  });

  // I-021b — "started" trackers for the other 3 tools so funnels show real data.
  // Each fires once when the tool's generate button enters its ready state.
  app.post("/api/track/vision-start", (req, res) => {
    recordActivity(emailFromSession(req), "vision_started");
    res.json({ ok: true });
  });

  app.post("/api/track/shopping-start", (req, res) => {
    recordActivity(emailFromSession(req), "shopping_started");
    res.json({ ok: true });
  });

  app.post("/api/track/audit-start", (req, res) => {
    recordActivity(emailFromSession(req), "audit_started");
    res.json({ ok: true });
  });

  // ── GET /api/auth/me — get current user info ──
  app.get("/api/auth/me", (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const db = readDB();
    let user = db.users[googleId];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const norm = normalizeUserForFreeTier(user);
    user = norm.user;
    if (norm.changed) {
      db.users[googleId] = user;
      writeDB(db);
    }

    const ownerAccount = isConceptTestAccountEmail(user.email);
    const isPaidUser = ownerAccount || user.isPaid === true;
    res.json({
      email: user.email,
      name: user.name,
      picture: user.picture,
      generationsLeft: user.generationsLeft,
      shoppingListsLeft: user.shoppingListsLeft,
      isPaid: isPaidUser,
      auditsLeft: isPaidUser ? 999 : 0,
    });
  });

  // ── POST /api/auth/logout — clear session ──
  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers["x-session-token"] as string;
    if (token && sessions[token]) {
      delete sessions[token];
    }
    res.json({ ok: true });
  });

  // ── POST /api/generation/use — consume one generation ──
  app.post("/api/generation/use", (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const { count = 1 } = req.body;

    const db = readDB();
    const user = db.users[googleId];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.generationsLeft < count) {
      return res.status(403).json({ error: "No generations left", generationsLeft: user.generationsLeft });
    }

    if (user.generationsLeft < 999) user.generationsLeft -= count;
    user.lastUsed = new Date().toISOString();
    db.users[googleId] = user;
    writeDB(db);

    res.json({ generationsLeft: user.generationsLeft });
  });

  // ── POST /api/generation/restore — restore generations on failure ──
  app.post("/api/generation/restore", (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const { count = 1 } = req.body;

    const db = readDB();
    const user = db.users[googleId];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const cap = isConceptTestAccountEmail(user.email) ? 999 : FREE_TIER_MAX_CONCEPTS;
    user.generationsLeft = Math.min(cap, user.generationsLeft + count);
    db.users[googleId] = user;
    writeDB(db);

    res.json({ generationsLeft: user.generationsLeft });
  });

  // ── Testimonials cache ──────────────────────────────────────────────────────
  let testimonialsCache: { data: any; expires: number } | null = null;
  const TESTIMONIALS_CACHE_MS = 10 * 60 * 1000;

  // ── GET /api/testimonials ────────────────────────────────────────────────────
  app.get('/api/testimonials', async (_req, res) => {
    try {
      if (testimonialsCache && testimonialsCache.expires > Date.now()) {
        return res.json(testimonialsCache.data);
      }
      const url = process.env.APPS_SCRIPT_URL;
      if (!url) return res.status(500).json({ ok: false, error: 'apps script url not configured' });
      const r = await fetch(url, { method: 'GET' });
      const data = await r.json();
      if (data.ok) {
        testimonialsCache = { data, expires: Date.now() + TESTIMONIALS_CACHE_MS };
        bumpApiCount("sheets"); // I-010 — successful Apps Script → Sheets read
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── POST /api/feedback ───────────────────────────────────────────────────────
  app.post('/api/feedback', async (req, res) => {
    try {
      const url = (process.env.APPS_SCRIPT_URL || '').trim();
      const token = (process.env.APPS_SCRIPT_TOKEN || '').trim();
      console.log(`[FEEDBACK] url present=${!!url} token present=${!!token}`);

      if (!url || !token) return res.status(500).json({ ok: false, error: 'apps script not configured' });

      const { name, country, email, type, message, rating, project_type } = req.body || {};
      console.log(`[FEEDBACK] body:`, JSON.stringify({ name, country, email, type, message: message?.slice(0,40), rating, project_type }));

      // Always required
      if (!type || !['testimonial', 'bug', 'feature', 'general'].includes(type)) {
        return res.status(400).json({ ok: false, error: 'Invalid type' });
      }
      if (!message || !message.trim()) {
        return res.status(400).json({ ok: false, error: 'Message is required' });
      }

      // Conditionally required (testimonials only)
      if (type === 'testimonial') {
        if (!name || !name.trim()) {
          return res.status(400).json({ ok: false, error: 'Name is required for testimonials' });
        }
        if (!email || !email.trim()) {
          return res.status(400).json({ ok: false, error: 'Email is required for testimonials' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return res.status(400).json({ ok: false, error: 'Invalid email format' });
        }
        if (!rating || rating < 1 || rating > 5) {
          return res.status(400).json({ ok: false, error: 'Rating is required for testimonials' });
        }
      }

      // Optional field — validate if present
      if (project_type && !['Residential', 'Commercial', 'Other'].includes(project_type)) {
        return res.status(400).json({ ok: false, error: 'Invalid project type' });
      }

      const scriptBody = {
        token,
        name:         (name         || '').trim(),
        country:      (country      || '').trim(),
        email:        (email        || '').trim(),
        type,
        message:      (message      || '').trim(),
        rating:       rating != null ? rating : '',
        project_type: (project_type || '').trim(),
      };
      console.log(`[FEEDBACK] POST → ${url} body:`, JSON.stringify({ ...scriptBody, token: '[redacted]' }));

      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptBody),
        redirect: 'follow',
      });
      const text = await r.text();
      console.log(`[FEEDBACK] Apps Script status=${r.status} response:`, text.slice(0, 300));

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error(`[FEEDBACK] Apps Script returned non-JSON. Status=${r.status}. Body: ${text.slice(0, 200)}`);
        return res.status(502).json({ ok: false, error: `Apps Script returned non-JSON (status ${r.status})` });
      }

      if (data.ok) {
        console.log(`[FEEDBACK] Write confirmed — invalidating testimonials cache`);
        testimonialsCache = null;
        bumpApiCount("sheets"); // I-010 — successful Apps Script → Sheets write
        // I-016 — feedback submission. No auth on this endpoint; use submitted email or "anonymous".
        const submitterEmail = (typeof email === "string" && email.trim()) ? email.trim().toLowerCase() : ANON_USER;
        recordActivity(submitterEmail, "feedback_submit");
        // Durable feedback inbox (2026-07-10): keep the full message so /admin has
        // a readable, ownable inbox that survives redeploys (sheet = archive).
        try {
          const fdb = readDB();
          if (!fdb.feedback) fdb.feedback = [];
          fdb.feedback.push({
            ts: new Date().toISOString(),
            name: (name || "").trim(),
            email: (email || "").trim(),
            country: (country || "").trim(),
            type,
            message: (message || "").trim(),
            rating: rating != null ? rating : null,
            projectType: (project_type || "").trim(),
            status: "new",
          });
          while (fdb.feedback.length > 2000) fdb.feedback.shift();
          writeDB(fdb);
        } catch (e) {
          console.error("[feedback] durable store failed:", e);
        }
      } else {
        console.error(`[FEEDBACK] Apps Script returned ok=false:`, data.error);
      }

      res.json(data);
    } catch (err) {
      console.error(`[FEEDBACK] Unexpected error:`, err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── POST /api/shopping/identify — identify shoppable items from an image ──
  app.post("/api/shopping/identify", async (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const { imageDataUrl } = req.body ?? {};
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ error: "imageDataUrl is required." });
    }
    const matches = imageDataUrl.match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: "Invalid image format." });

    try {
      const apiKey = process.env.GEMINI_API_KEY ?? "";
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
      const ai = new GoogleGenAI({ apiKey });

      // #12 P3a — owner-approved prompt (validated via scripts/test-identify.ts):
      // enumerate only genuinely-visible objects, each mapped to ONE taxonomy id
      // (seating ≠ storage; recessed/built-in lighting skipped; chandeliers
      // recognized). Return descriptors + prominence so the search step can build
      // category-aware queries, dedupe, and pick the FREE-tier main pieces.
      const taxonomyForPrompt = SHOPPING_TAXONOMY
        .map((c) => `  - ${c.id}: ${c.detects.slice(0, 9).join(", ")}`)
        .join("\n");
      const identifyPrompt = `You are a professional interior design sourcing assistant analyzing ONE room photo.

GOAL: list every DISTINCT, clearly-visible, shoppable object in the room, each mapped to exactly ONE category id from the fixed taxonomy below.

TAXONOMY (id: example object types that belong to it):
${taxonomyForPrompt}

RULES:
- List ONLY objects you can actually see in THIS photo. Never invent, assume, or add "typical" items.
- Each entry is ONE distinct physical object. Never list the same object twice and never split it (a sectional sofa = one "seating" item).
- Ignore tiny, blurry, heavily-cropped, or barely-visible objects, and built-in architecture (windows, doors, flooring, the ceiling).
- Every item's "taxonomyId" MUST be one of the ids above, copied verbatim. If an object fits none of them, OMIT it.
- Map by FUNCTION, not by looks: a sideboard / credenza / TV unit / bookcase = storage (NEVER seating); a pendant or lamp = lighting; a framed print / mirror / vase / sculpture = art-decor; a coffee/side/console/dining table = tables-desks.
- LIGHTING — only list DECORATIVE, separately-purchasable fixtures: chandeliers, pendants, flush / semi-flush ceiling mounts, floor lamps, table lamps, wall sconces. DO NOT list recessed / can / cove / track / strip or any other built-in lighting — treat those as architecture and skip them. A hanging ceiling fixture with multiple bulbs, arms, tiers, or globes is a CHANDELIER (or pendant) — never call it a "recessed light". A statement ceiling fixture over a seating or dining area is a focal point — score its prominence HIGH.
- "prominence" = how visually dominant the object is in the photo, 0-100 (combine size + centrality + how in-focus it is).

For EACH item return:
- category: 1-3 word plain type label (e.g. "Sofa", "Area Rug", "Pendant Light", "Sideboard")
- taxonomyId: exactly one id from the taxonomy above, verbatim
- description: one short phrase describing THIS specific item (used as a subtitle, max ~8 words)
- color: dominant color(s) you see
- material: primary material, or "unknown"
- shape: silhouette / form / pattern, or "unknown"
- style: design era/style, or "unknown"
- prominence: integer 0-100
- search_query: 5-10 word retail search query (color + material + shape + category + style)

Output ONLY valid JSON, no markdown fences, no commentary:
{"items":[{"category":"Sofa","taxonomyId":"seating","description":"Curved navy velvet sofa","color":"navy blue","material":"velvet","shape":"low curved","style":"mid-century modern","prominence":95,"search_query":"navy velvet curved sofa mid century modern"}]}`;

      const geminiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: matches[1], data: matches[2] } },
            { text: identifyPrompt },
          ],
        },
      });
      bumpApiCount("gemini"); // I-010 — identify call consumed

      const rawText: string =
        (geminiRes as any).text ??
        geminiRes?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text ?? "")
          .join("") ?? "";
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(422).json({ error: "Could not identify items from the image." });
      }
      const identified = JSON.parse(jsonMatch[0]);
      // Validate/normalize taxonomyId; drop anything that can't be mapped to a
      // canonical category (so downstream scope/query/match always get clean ids).
      const items = (Array.isArray(identified.items) ? identified.items : [])
        .map((it: any) => {
          let id = typeof it.taxonomyId === "string" ? it.taxonomyId.trim() : "";
          if (!SHOPPING_TAXONOMY_IDS.includes(id)) id = categoryToTaxonomyId(it.category) || categoryToTaxonomyId(it.description) || "";
          return SHOPPING_TAXONOMY_IDS.includes(id)
            ? { ...it, taxonomyId: id, description: it.description || it.category }
            : null;
        })
        .filter(Boolean);
      return res.json({ items });

    } catch (err: any) {
      console.error("[Shopping] identify error:", err?.message ?? err);
      return res.status(500).json({ error: "Could not identify items. Please try again." });
    }
  });

  // ── GET /api/shopping/status — cheap probe for "is shopping available?" ──
  //
  // Used by the client to swap CTAs / show offline pills without committing to
  // a search (which would burn auth/db work). Reflects both the env kill switch
  // and the daily budget state. No auth required — public probe.
  app.get("/api/shopping/status", (_req, res) => {
    const SHOPPING_DISABLED = (process.env.SHOPPING_DISABLED || "false").toLowerCase() === "true";
    if (SHOPPING_DISABLED) {
      return res.json({ disabled: true, code: "disabled" });
    }

    const SERPER_DAILY_BUDGET = (() => {
      const parsed = parseInt((process.env.SERPER_DAILY_BUDGET || "200"), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
    })();
    const todayUtc = utcDateString();
    const db = readDB();
    const usage = db.serperUsage && db.serperUsage.date === todayUtc ? db.serperUsage : { date: todayUtc, count: 0 };
    // Budget is exceeded when there isn't headroom for a typical 4-call list.
    if (usage.count + 4 > SERPER_DAILY_BUDGET) {
      return res.json({
        disabled: true,
        code: "daily_budget_exceeded",
        resetAt: nextUtcMidnightIso(),
      });
    }
    res.json({ disabled: false });
  });

  // ── POST /api/shopping/search — Serper.dev Google Shopping API ──
  app.post("/api/shopping/search", async (req, res) => {
    try {
      // ─── Kill switch (I-009) ────────────────────────────────────────────────
      // Set SHOPPING_DISABLED=true in env to take the endpoint offline before
      // any auth/db work. Used while serper.dev credits are exhausted or under
      // investigation. The client renders a graceful "offline + notify me" UI.
      const SHOPPING_DISABLED = (process.env.SHOPPING_DISABLED || "false").toLowerCase() === "true";
      if (SHOPPING_DISABLED) {
        return res.status(503).json({
          error: "Shopping List is temporarily offline",
          code: "disabled",
        });
      }

      const googleIdShopping = requireAuth(req, res);
      if (!googleIdShopping) return;

      const dbShop = readDB();
      let shopUser = dbShop.users[googleIdShopping];
      if (!shopUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const normShop = normalizeUserForFreeTier(shopUser);
      shopUser = normShop.user;
      if (normShop.changed) {
        dbShop.users[googleIdShopping] = shopUser;
        writeDB(dbShop);
      }
      console.log(`[SHOP] ${shopUser.email} | isPaid=${shopUser.isPaid} | shoppingListsLeft=${shopUser.shoppingListsLeft}`);
      if (shopUser.shoppingListsLeft < 1) {
        return res.status(403).json({
          error: "No shopping list runs left",
          shoppingListsLeft: shopUser.shoppingListsLeft,
        });
      }

      const { items, country, budgetLevel, roomCap, scopeIds } = req.body;
      const gl = country || 'us';
      // roomCap is FLAG-ONLY in v1 (the client flags over-cap); budgetLevel drives
      // retailer-tier routing below (#12 P4).
      void roomCap;
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: "Missing or invalid items list" });

      const isPaidShop = shopUser.isPaid === true || shopUser.shoppingListsLeft >= 999;

      // #12 P3 — normalize taxonomy ids (defensive; identify already tags them),
      // apply the PAID "Find" scope (free always searches all mains), then dedupe
      // identical detections (6 identical chairs → one entry, quantity 6).
      const normItems = items.map((it: any) => {
        const id = (typeof it.taxonomyId === "string" && SHOPPING_TAXONOMY_IDS.includes(it.taxonomyId))
          ? it.taxonomyId
          : (categoryToTaxonomyId(it.category) || "");
        return { ...it, taxonomyId: id };
      });
      const scope = Array.isArray(scopeIds) ? scopeIds.filter((s: any) => typeof s === "string") : [];
      const scoped = (isPaidShop && scope.length) ? normItems.filter((i: any) => scope.includes(i.taxonomyId)) : normItems;
      const deduped = dedupeItems(scoped);

      // ── Total-list cap (all tiers) + free-tier search cap (#12 P3c) ─────────
      // First trim the deduped set to the MAX_LIST_ITEMS most SIGNIFICANT pieces
      // (pickFreeItems = mains-first by prominence, then top decor) so an over-
      // detailed room (27 objects) reads as a focused ~12-item list for everyone.
      // Then split the capped set: paid SHOPS all of it; free shops the top
      // FREE_TIER_MAX_ITEMS and the remainder become locked `teaser` markers that
      // fill the list up to the cap (NO product lookup for those).
      const capped = pickFreeItems(deduped, MAX_LIST_ITEMS);
      const searchedItems = isPaidShop ? capped : pickFreeItems(capped, FREE_TIER_MAX_ITEMS);
      const teaserItems = capped
        .filter((it: any) => !searchedItems.includes(it))
        .map((it: any) => ({ category: it.category, label: it.description || it.category }));

      // Serper.dev API key — set SERPER_API_KEY in AI Studio Secrets
      // MOCK_SERPER=true bypasses Serper entirely (returns canned products from
      // mocks/serper-shopping-mock.json) so dev iteration doesn't burn credits.
      const MOCK_SERPER = (process.env.MOCK_SERPER || "").toLowerCase() === "true";
      const SERPER_API_KEY = (process.env.SERPER_API_KEY || "").trim();
      if (!MOCK_SERPER && !SERPER_API_KEY) return res.status(500).json({ error: "SERPER_API_KEY not set — add it in AI Studio Secrets" });

      // Product mapping (link resolution + price normalization) is built after
      // the Sanity retailer fetch below — see `productLink`.

      const serperSearch = async (query: string, num = 8): Promise<any[]> => {
        if (MOCK_SERPER) {
          try {
            const mockPath = path.resolve(process.cwd(), "mocks/serper-shopping-mock.json");
            const mock = JSON.parse(readFileSync(mockPath, "utf-8"));
            // Route by the item noun (ignores the retailer OR-filter — see mockBucketFor),
            // then narrow to the request region (gl 'gb' → UK shops, else US).
            const bucketKey = mockBucketFor(query);
            const bucket: any[] = filterMockByRegion(mock[bucketKey] || mock.default || [], gl);
            console.log(`[SHOP][MOCK] gl=${gl} bucket=${bucketKey} → ${bucket.map((b) => b.source).join(", ") || "∅"}`);
            return bucket.slice(0, num);
          } catch (e: any) {
            console.error("[SHOP][MOCK] failed to load mocks/serper-shopping-mock.json:", e?.message);
            return [];
          }
        }
        const res = await fetch("https://google.serper.dev/shopping", {
          method: "POST",
          headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ q: query, gl, hl: "en", num }),
        });
        const data = await res.json();
        if (!res.ok) { console.error(`Serper error "${query}":`, data.message); return []; }
        return data.shopping || [];
      };

      // #12 P4 — retailer routing now comes from the live Sanity catalog
      // (services/shopping/retailers): shopsForLevel() filters by budget tier
      // (level → tiers), category overlap, and region. Fetched once below.
      const budgetLevelNorm = (typeof budgetLevel === "string" ? budgetLevel : "any") as any;
      const retailers = await getRetailers();

      // Resolve a Serper result's `source` to a CURATED retailer (Sanity only) —
      // non-curated shops (e.g. Michaels) resolve to null and are skipped.
      const retailerBySource = (source: string) => matchRetailer(retailers, source);
      // Resolve the EXACT product page via a Serper WEB search (the /shopping
      // endpoint gives no merchant URL). Returns the first organic result on the
      // retailer's own domain, or "" → caller falls back to the retailer search URL.
      const resolveExactUrl = async (title: string, domain: string, retailerName?: string): Promise<string> => {
        if (MOCK_SERPER || !domain || !title) return "";
        try {
          const q = `${cleanProductTitle(title, retailerName)} ${domain}`;
          const resp = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ q, gl, hl: "en", num: 10 }),
          });
          if (!resp.ok) return "";
          const data = await resp.json();
          // Prefer a real PRODUCT page on the retailer's domain over a category/
          // search/range page (which Serper often ranks first).
          return pickBestProductUrl(data.organic, domain);
        } catch { return ""; }
      };

      // ─── Daily budget (I-009) ───────────────────────────────────────────────
      // SERPER_DAILY_BUDGET caps Serper credits per UTC day. Mock mode bypasses
      // the budget entirely (no real credits burned). The counter lives in
      // db.serperUsage; rolls over at UTC midnight.
      const SERPER_DAILY_BUDGET = (() => {
        const parsed = parseInt((process.env.SERPER_DAILY_BUDGET || "200"), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
      })();
      // Each item costs up to 2 Serper credits: 1 shopping search + 1 web search
      // to resolve the exact product page. Reserve for the worst case up front.
      const plannedSerperCalls = searchedItems.length;
      const todayUtc = utcDateString();
      if (!MOCK_SERPER) {
        const usage = dbShop.serperUsage && dbShop.serperUsage.date === todayUtc
          ? dbShop.serperUsage
          : { date: todayUtc, count: 0 };
        if (usage.count + plannedSerperCalls * 3 > SERPER_DAILY_BUDGET) {
          return res.status(503).json({
            error: "Daily limit reached, back tomorrow",
            code: "daily_budget_exceeded",
            resetAt: nextUtcMidnightIso(),
          });
        }
        // Persist the rollover even if no new calls happen below — keeps the
        // counter honest across day boundaries.
        if (!dbShop.serperUsage || dbShop.serperUsage.date !== todayUtc) {
          dbShop.serperUsage = usage;
        }
      }

      // ── Category-aware query per item → relevance-filtered best match ───────
      // #12 P3e: buildShoppingQuery bakes in descriptors + a curated-retailer OR
      // filter; pickMatches drops off-category + accessory hits so a "seating"
      // query never returns a cabinet. ONE best match per item by default (extra
      // options come on demand via /api/shopping/alternate). No match → empty.
      const searchResults = await Promise.all(
        searchedItems.map(async (item: any) => {
          let calls = 0;
          try {
            const relevantShops = shopsForLevel(retailers, budgetLevelNorm, { category: item.category, taxonomyId: item.taxonomyId }, gl);
            const shopNames = relevantShops.slice(0, 6).map((s) => s.name);
            console.log(`[SHOP] Serper: "${buildShoppingQuery(item, shopNames)}"`);
            let hits = await serperSearch(buildShoppingQuery(item, shopNames), 10); calls++;
            let ranked = pickMatches(item, hits, 8);
            // Broaden on empty: niche pieces may only exist at a shop OUTSIDE the
            // curated OR-filter (e.g. a specific cabinet only at IKEA). Retry once
            // without the shop filter for recall — relevance + retailer resolution
            // still keep results on-category and from real retailers.
            if (ranked.length === 0) {
              console.log(`[SHOP] broadening (no shop filter) for "${item.category}"`);
              hits = await serperSearch(buildShoppingQuery(item, []), 10); calls++;
              ranked = pickMatches(item, hits, 8);
            }
            // Keep the best match we can link to a retailer — resolving the EXACT
            // product page (web search), else the retailer's site-search.
            let product: any = null;
            for (const r of ranked) {
              let direct = extractDirectLink(r);
              const ret = retailerBySource(r.source);
              // Strict per-country storefront: a multi-country brand (e.g. Wayfair)
              // MUST link to the selected country's site (gb → wayfair.co.uk), never
              // .com (US) or .ca. Localize the curated domain, and drop a direct link
              // that points at the wrong-country storefront.
              const ld = ret ? localizeDomain(ret.domain, gl) : "";
              if (direct && ret && isMultiStorefront(ret.domain)) {
                try {
                  const h = new URL(direct).hostname.toLowerCase().replace(/^www\./, "");
                  if (h !== ld && !h.endsWith("." + ld)) direct = "";
                } catch { direct = ""; }
              }
              if (!direct && !ret) continue;
              let link = direct;
              if (!link && ret) {
                const exact = await resolveExactUrl(r.title, ld, ret.name); if (!MOCK_SERPER) calls++;
                link = exact || retailerSearchUrl(ld, r.title, ret.name);
              }
              if (link) {
                product = { title: r.title || "Product", price: normalizePrice(r.price), source: ret ? ret.name : cleanSource(r.source || ""), link, thumbnail: r.imageUrl || null, rating: r.rating || null, reviews: r.ratingCount || null };
                break;
              }
            }
            return {
              item: { category: item.category, description: item.description, search_query: item.search_query, taxonomyId: item.taxonomyId, quantity: item.quantity },
              products: product ? [product] : [],
              calls,
            };
          } catch (err) {
            console.error("Serper search error for", item.category, err);
            return { item: { category: item.category, description: item.description }, products: [], calls };
          }
        })
      );

      if (shopUser.shoppingListsLeft < 999) shopUser.shoppingListsLeft -= 1;
      shopUser.lastUsed = new Date().toISOString();
      dbShop.users[googleIdShopping] = shopUser;

      // ─── Budget counter + forensic log (I-009) ──────────────────────────────
      // Actual credits = the calls each item actually made (1 shopping + maybe a
      // broaden retry + an exact-URL web search). Skip in mock mode.
      const actualSerperCalls = MOCK_SERPER ? 0 : searchResults.reduce((s: number, r: any) => s + (r.calls || 0), 0);
      if (!MOCK_SERPER && actualSerperCalls > 0) {
        const current = dbShop.serperUsage && dbShop.serperUsage.date === todayUtc
          ? dbShop.serperUsage
          : { date: todayUtc, count: 0 };
        dbShop.serperUsage = { date: todayUtc, count: current.count + actualSerperCalls };

        const log: SerperLogEntry[] = Array.isArray(dbShop.serperLog) ? dbShop.serperLog : [];
        log.push({
          ts: new Date().toISOString(),
          userEmail: shopUser.email,
          query: searchedItems.map((i: any) => i.search_query).join(" | "),
          count: actualSerperCalls,
          source: "shopping_search",
        });
        // Cap at 1000 entries — drop oldest when over.
        while (log.length > 1000) log.shift();
        dbShop.serperLog = log;

        // I-010 — mirror into per-provider apiCounters for cross-provider parity.
        recordApiCall(dbShop, "serper", actualSerperCalls);
      }

      // I-016 — activity log (always, including mock mode — the user did "generate")
      logActivity(dbShop, shopUser.email, "generate_shopping");

      writeDB(dbShop);

      // Strip the internal per-item `calls` counter from the client payload.
      const clean = searchResults.map((r: any) => ({ item: r.item, products: r.products }));
      res.json({
        results: clean,
        searched: clean,
        teaser: teaserItems,
        totalIdentified: capped.length, // capped total (searched + teaser), not the raw identify count
        shoppingListsLeft: shopUser.shoppingListsLeft,
      });

    } catch (err: any) {
      console.error("Shopping search error:", err);
      res.status(500).json({ error: "Shopping search failed: " + (err.message || "unknown error") });
    }
  });

  // ── POST /api/shopping/alternate (#11) — fetch ONE alternate product for an item ──
  // On-demand only: spends a single Serper credit when the user clicks "Find another
  // option". PAID (alternates are a paid refinement). Does NOT consume a shopping list.
  app.post("/api/shopping/alternate", async (req, res) => {
    try {
      const SHOPPING_DISABLED = (process.env.SHOPPING_DISABLED || "false").toLowerCase() === "true";
      if (SHOPPING_DISABLED) return res.status(503).json({ error: "Shopping List is temporarily offline", code: "disabled" });

      const gid = requireAuth(req, res);
      if (!gid) return;
      const db = readDB();
      let u = db.users[gid];
      if (!u) return res.status(404).json({ error: "User not found" });
      const norm = normalizeUserForFreeTier(u); u = norm.user;
      if (norm.changed) { db.users[gid] = u; writeDB(db); }
      const isPaidShop = u.isPaid === true || u.shoppingListsLeft >= 999;
      // Alternates are a PAID refinement (§9). Free users are gated in the UI; enforce here too.
      if (!isPaidShop) return res.status(403).json({ error: "Alternates are a paid feature", code: "paid_only" });

      const { item, country, excludeSources } = req.body || {};
      const gl = country || "us";
      if (!item || !item.search_query) return res.status(400).json({ error: "Missing item" });
      const exclude: string[] = Array.isArray(excludeSources) ? excludeSources.map((s: string) => String(s).toLowerCase()) : [];

      const MOCK_SERPER = (process.env.MOCK_SERPER || "").toLowerCase() === "true";
      const SERPER_API_KEY = (process.env.SERPER_API_KEY || "").trim();
      if (!MOCK_SERPER && !SERPER_API_KEY) return res.status(500).json({ error: "SERPER_API_KEY not set" });

      // Daily budget — one planned call.
      const SERPER_DAILY_BUDGET = (() => { const p = parseInt((process.env.SERPER_DAILY_BUDGET || "200"), 10); return Number.isFinite(p) && p > 0 ? p : 200; })();
      const today = utcDateString();
      if (!MOCK_SERPER) {
        const usage = db.serperUsage && db.serperUsage.date === today ? db.serperUsage : { date: today, count: 0 };
        if (usage.count + 2 > SERPER_DAILY_BUDGET) return res.status(503).json({ error: "Daily limit reached, back tomorrow", code: "daily_budget_exceeded", resetAt: nextUtcMidnightIso() });
        if (!db.serperUsage || db.serperUsage.date !== today) db.serperUsage = usage;
      }

      // extractDirectLink + cleanSource imported from services/shopping/links (#12 P2).
      let hits: any[] = [];
      if (MOCK_SERPER) {
        try {
          const mock = JSON.parse(readFileSync(path.resolve(process.cwd(), "mocks/serper-shopping-mock.json"), "utf-8"));
          const key = mockBucketFor(String(item.search_query));
          hits = filterMockByRegion(mock[key] || mock.default || [], gl).slice(0, 10);
        } catch { hits = []; }
      } else {
        const resp = await fetch("https://google.serper.dev/shopping", {
          method: "POST",
          headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ q: item.search_query, gl, hl: "en", num: 10 }),
        });
        const data = await resp.json();
        hits = resp.ok ? (data.shopping || []) : [];
      }

      // First on-category product (relevance-filtered) from a retailer we can link
      // to, whose source isn't already shown. Real Serper gives no merchant URLs,
      // so we build a retailer site-search link (same as /search).
      const altRetailers = await getRetailers();
      // Curated retailers only (Sanity) — non-curated shops are skipped.
      const altRetailerBySource = (source: string) => matchRetailer(altRetailers, source);
      const altResolveExactUrl = async (title: string, domain: string, retailerName?: string): Promise<string> => {
        if (MOCK_SERPER || !domain || !title) return "";
        try {
          const resp = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ q: `${cleanProductTitle(title, retailerName)} ${domain}`, gl, hl: "en", num: 10 }),
          });
          if (!resp.ok) return "";
          const data = await resp.json();
          return pickBestProductUrl(data.organic, domain);
        } catch { return ""; }
      };
      let product: any = null;
      for (const r of pickMatches(item, hits, 12)) {
        const ret = altRetailerBySource(r.source);
        const source = ret ? ret.name : cleanSource(r.source || "");
        if (exclude.includes(source.toLowerCase())) continue;
        let direct = extractDirectLink(r);
        // Strict per-country storefront (see /search): localize the domain + drop a
        // direct link pointing at the wrong-country site (gb → wayfair.co.uk only).
        const ld = ret ? localizeDomain(ret.domain, gl) : "";
        if (direct && ret && isMultiStorefront(ret.domain)) {
          try {
            const h = new URL(direct).hostname.toLowerCase().replace(/^www\./, "");
            if (h !== ld && !h.endsWith("." + ld)) direct = "";
          } catch { direct = ""; }
        }
        if (!direct && !ret) continue;
        let link = direct;
        if (!link && ret) {
          const exact = await altResolveExactUrl(r.title, ld, ret.name);
          link = exact || retailerSearchUrl(ld, r.title, ret.name);
        }
        if (link) { product = { title: r.title || "Product", price: normalizePrice(r.price), source, link, thumbnail: r.imageUrl || null }; break; }
      }

      // Credits: 1 shopping search + 1 web search (exact URL) when a product was found.
      if (!MOCK_SERPER) {
        const altCalls = product ? 2 : 1;
        const cur = db.serperUsage && db.serperUsage.date === today ? db.serperUsage : { date: today, count: 0 };
        db.serperUsage = { date: today, count: cur.count + altCalls };
        const log: SerperLogEntry[] = Array.isArray(db.serperLog) ? db.serperLog : [];
        log.push({ ts: new Date().toISOString(), userEmail: u.email, query: String(item.search_query), count: altCalls, source: "shopping_alternate" });
        while (log.length > 1000) log.shift();
        db.serperLog = log;
        recordApiCall(db, "serper", altCalls);
        writeDB(db);
      }

      res.json({ product });
    } catch (err: any) {
      console.error("Shopping alternate error:", err);
      res.status(500).json({ error: "Alternate lookup failed: " + (err.message || "unknown error") });
    }
  });

  // ── GET /api/pinterest/pin — extract og:image from a Pinterest pin URL ──
  app.get("/api/pinterest/pin", async (req, res) => {
    const { url } = req.query as { url?: string };
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    // Accept pinterest.com/pin/... or pinterest.com/username/board/... or pin.it/...
    if (!url.includes("pinterest.com") && !url.includes("pin.it")) {
      return res.status(400).json({ error: "Not a Pinterest URL" });
    }
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "follow",
      });
      if (!response.ok) {
        return res.status(502).json({ error: "Could not fetch Pinterest page" });
      }
      const html = await response.text();
      // Extract og:image
      const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (!match || !match[1]) {
        return res.status(404).json({ error: "No image found on this Pinterest page" });
      }
      const imageUrl = match[1].replace(/&amp;/g, "&");
      return res.json({ imageUrl });
    } catch (err: any) {
      console.error("Pinterest fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch Pinterest image" });
    }
  });

  // ── POST /api/contact — Studio "Start a conversation" form → email to hello@ ──
  // Body: { name, email, message, projectType?, budget? }. Sends via Resend
  // (lib/email.sendEmail). Replaces the old client-side EmailJS path (dead creds).
  app.post("/api/contact", async (req, res) => {
    const { name, email, message, projectType, budget } = req.body || {};
    const nameSafe = typeof name === "string" ? name.trim().slice(0, 120) : "";
    const emailSafe = typeof email === "string" ? email.trim().slice(0, 160) : "";
    const messageSafe = typeof message === "string" ? message.trim().slice(0, 4000) : "";
    if (!nameSafe || !messageSafe || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSafe)) {
      return res.status(400).json({ error: "Name, a valid email, and a message are required." });
    }
    const projectTypeSafe = typeof projectType === "string" ? projectType.trim().slice(0, 80) : "";
    const budgetSafe = typeof budget === "string" ? budget.trim().slice(0, 80) : "";
    const escHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `
      <h2 style="font-family:sans-serif">New studio enquiry</h2>
      <p><strong>Name:</strong> ${escHtml(nameSafe)}</p>
      <p><strong>Email:</strong> ${escHtml(emailSafe)}</p>
      ${projectTypeSafe ? `<p><strong>Project type:</strong> ${escHtml(projectTypeSafe)}</p>` : ""}
      ${budgetSafe ? `<p><strong>Rough budget:</strong> ${escHtml(budgetSafe)}</p>` : ""}
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap">${escHtml(messageSafe)}</p>
    `;
    try {
      await sendEmail({
        to: "hello@designature.studio",
        subject: `New enquiry from ${nameSafe}`,
        html,
      });
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[contact] send failed:", err?.message || err);
      res.status(500).json({ error: "Failed to send message." });
    }
  });

  // ── POST /api/newsletter/subscribe — append email to newsletter sheet ──
  // Body: { email, source? }. source is a short slug identifying where the
  // signup originated (I-021a): "home_footer", "shopping_offline", etc.
  // Stored in column D ("Source") — header is added on first write if missing.
  app.post("/api/newsletter/subscribe", async (req, res) => {
    const { email, source } = req.body || {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const sourceSafe = typeof source === "string" ? source.trim().slice(0, 60) : "";

    const spreadsheetId = "1ADcawOqI2VElxwPSSuL-PGX3OjHehacod_ApDPRqFo4";
    const serviceAccountJson = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
    const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();

    if (!serviceAccountJson && !keyFile) {
      console.warn("Newsletter subscribe: missing service account credentials");
      return res.status(503).json({ error: "Sheet integration not configured" });
    }

    try {
      let credentials: any;
      if (serviceAccountJson) {
        credentials = JSON.parse(serviceAccountJson);
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      } else {
        credentials = JSON.parse(readFileSync(keyFile, "utf-8"));
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      }

      const jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const sheetsApi = google.sheets({ version: "v4", auth: jwtClient });

      const meta = await sheetsApi.spreadsheets.get({
        spreadsheetId,
        fields: "sheets(properties(title))",
      });
      const sheetTitle = meta.data.sheets?.[0]?.properties?.title;
      if (!sheetTitle) throw new Error("Could not read sheet title");

      // Detect country server-side from IP (accurate, not browser language)
      let detectedCountry = '';
      let ipapiCalled = false;
      try {
        const rawIp = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
        const isLocal = !rawIp || rawIp === '127.0.0.1' || rawIp === '::1' || rawIp.startsWith('192.168.') || rawIp.startsWith('10.');
        if (!isLocal) {
          const geoRes = await fetch(`https://ipapi.co/${rawIp}/country/`);
          ipapiCalled = true; // I-010 — credit was consumed regardless of HTTP status
          if (geoRes.ok) detectedCountry = (await geoRes.text()).trim();
        }
      } catch {
        ipapiCalled = true; // attempted fetch failed mid-flight → still counts
      }

      // I-021a — backfill "Source" column header on first newsletter write that
      // carries a source. Reads row 1 (A1:D1); if D1 is empty, writes the full
      // 4-column header in place. One-shot — runs only when sourceSafe is set
      // AND the header isn't already there, so existing rows stay aligned.
      if (sourceSafe) {
        try {
          const headerRange = `${sheetTitle}!A1:D1`;
          const headerRes = await sheetsApi.spreadsheets.values.get({ spreadsheetId, range: headerRange });
          const headerRow = headerRes.data.values?.[0] || [];
          const hasSourceCol = (headerRow[3] || "").toString().trim().toLowerCase() === "source";
          if (!hasSourceCol) {
            await sheetsApi.spreadsheets.values.update({
              spreadsheetId,
              range: headerRange,
              valueInputOption: "RAW",
              requestBody: { values: [["created_at", "email", "country", "Source"]] },
            });
          }
        } catch (e) {
          console.warn("[newsletter] header backfill skipped:", e);
        }
      }

      const now = new Date().toISOString();
      await sheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetTitle}!A:D`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[
            now,                         // created_at
            email.trim().toLowerCase(),  // email
            detectedCountry,             // country (from IP)
            sourceSafe,                  // source (I-021a)
          ]],
        },
      });

      // I-010 — bump sheets + (conditionally) ipapi in one DB write.
      try {
        const db = readDB();
        recordApiCall(db, "sheets");
        if (ipapiCalled) recordApiCall(db, "ipapi");
        writeDB(db);
      } catch (err) {
        console.error("[apiCounters] newsletter bump failed:", err);
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Newsletter subscribe error:", err);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  // ── POST /api/pricing/notify — collect pricing launch notification emails ──
  app.post("/api/pricing/notify", async (req, res) => {
    const { email, plan } = req.body || {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const spreadsheetId = "1Q-fEVKDy6ZlBGh_eGq-0DgcPxbQ5nyrEdQlxRaVkulg";
    const serviceAccountJson = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || "").trim();
    const keyFile = (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEYFILE || "").trim();

    if (!serviceAccountJson && !keyFile) {
      console.warn("Pricing notify: missing service account credentials");
      return res.status(503).json({ error: "Sheet integration not configured" });
    }

    try {
      let credentials: any;
      if (serviceAccountJson) {
        credentials = JSON.parse(serviceAccountJson);
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      } else {
        credentials = JSON.parse(readFileSync(keyFile, "utf-8"));
        if (typeof credentials?.private_key === "string" && credentials.private_key.includes("\\n")) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
        }
      }

      const jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const sheetsApi = google.sheets({ version: "v4", auth: jwtClient });

      const meta = await sheetsApi.spreadsheets.get({
        spreadsheetId,
        fields: "sheets(properties(title))",
      });
      const sheetTitle = meta.data.sheets?.[0]?.properties?.title;
      if (!sheetTitle) throw new Error("Could not read sheet title");

      const now = new Date().toISOString();
      await sheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetTitle}!A:C`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[now, email.trim().toLowerCase(), plan || ""]],
        },
      });
      bumpApiCount("sheets"); // I-010

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Pricing notify error:", err);
      res.status(500).json({ error: "Failed to save" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // Journal comments (Phase 2) — own, moderated.
  //   GET  /api/journal/:slug/comments   PUBLIC  → approved only
  //   POST /api/journal/:slug/comments   PUBLIC  → creates a 'pending' comment
  //   GET  /api/admin/comments           requireAdmin → list by status
  //   POST /api/admin/comments/moderate  requireAdmin → approve / reject
  // Graceful DB failure: reads fall back to an empty list (page still renders);
  // writes surface a 503. See db/migrate.ts `blog_comments`.
  // ════════════════════════════════════════════════════════════════════════
  const slugParamSafe = (raw: unknown): string =>
    typeof raw === "string" ? raw.trim().slice(0, 200) : "";

  app.get("/api/journal/:slug/comments", async (req, res) => {
    const slug = slugParamSafe(req.params.slug);
    if (!slug) return res.status(400).json({ error: "Bad slug" });
    try {
      const r = await getPool().query(
        `SELECT id, author_name, body, created_at
           FROM blog_comments
          WHERE post_slug = $1 AND status = 'approved'
          ORDER BY created_at DESC
          LIMIT 500`,
        [slug],
      );
      res.json({ comments: r.rows });
    } catch (err: any) {
      // Never 500 the reader on a CMS/DB hiccup — show the article without comments.
      console.warn("[journal] list comments failed:", err?.message || err);
      res.json({ comments: [] });
    }
  });

  app.post("/api/journal/:slug/comments", async (req, res) => {
    const slug = slugParamSafe(req.params.slug);
    if (!slug) return res.status(400).json({ error: "Bad slug" });

    const { authorName, body, website } = req.body || {};

    // Honeypot: real users never fill the hidden "website" field. Pretend success
    // (don't tip off the bot) but store nothing.
    if (typeof website === "string" && website.trim() !== "") {
      return res.json({ ok: true });
    }

    const nameSafe = typeof authorName === "string" ? authorName.trim().slice(0, 80) : "";
    const bodySafe = typeof body === "string" ? body.trim().slice(0, 3000) : "";
    if (!nameSafe || !bodySafe) {
      return res.status(400).json({ error: "Name and comment are required." });
    }

    if (isCommentRateLimited(clientIp(req))) {
      return res
        .status(429)
        .json({ error: "You're commenting too fast — please try again in a few minutes." });
    }

    try {
      await getPool().query(
        `INSERT INTO blog_comments (post_slug, author_name, body, status)
         VALUES ($1, $2, $3, 'pending')`,
        [slug, nameSafe, bodySafe],
      );
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[journal] insert comment failed:", err?.message || err);
      res.status(503).json({ error: "Comments are temporarily unavailable." });
    }
  });

  app.get("/api/admin/comments", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const statusRaw = typeof req.query.status === "string" ? req.query.status : "pending";
    const status = ["pending", "approved", "rejected"].includes(statusRaw) ? statusRaw : "";
    try {
      const r = status
        ? await getPool().query(
            `SELECT id, post_slug, author_name, body, status, created_at
               FROM blog_comments WHERE status = $1
              ORDER BY created_at DESC LIMIT 1000`,
            [status],
          )
        : await getPool().query(
            `SELECT id, post_slug, author_name, body, status, created_at
               FROM blog_comments ORDER BY created_at DESC LIMIT 1000`,
          );
      res.json({ comments: r.rows });
    } catch (err: any) {
      console.error("[journal] admin list comments failed:", err?.message || err);
      res.status(500).json({ error: "Failed to load comments." });
    }
  });

  app.post("/api/admin/comments/moderate", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { id, action } = req.body || {};
    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({ error: "Missing comment id." });
    }
    const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";
    if (!nextStatus) return res.status(400).json({ error: "Invalid action." });
    try {
      const r = await getPool().query(
        `UPDATE blog_comments SET status = $1 WHERE id = $2`,
        [nextStatus, id.trim()],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: "Comment not found." });
      res.json({ ok: true });
    } catch (err: any) {
      // Invalid UUID etc. → treat as a bad request, not a server fault.
      console.warn("[journal] moderate comment failed:", err?.message || err);
      res.status(400).json({ error: "Could not update that comment." });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // I-018 · /api/admin/* AUTH AUDIT  (last reviewed 2026-05-18 · Phase C)
  // ════════════════════════════════════════════════════════════════════════
  // Every admin endpoint must call requireAdminAuth at the top of its handler.
  // If you add a new /api/admin/* route, add it to this list AND apply the gate.
  //
  //   METHOD  PATH                       GATE
  //   POST    /api/admin/login           PUBLIC (rate-limited)
  //   POST    /api/admin/logout          PUBLIC (idempotent cookie clear)
  //   GET     /api/admin/me              PUBLIC (session probe, returns {authed})
  //   POST    /api/admin/reset-user      requireAdminAuth (via requireAdmin alias)
  //   GET     /api/admin/users           requireAdminAuth (via requireAdmin alias)
  //   GET     /api/admin/usage           requireAdminAuth (via requireAdmin alias)
  //   GET     /api/admin/users-detail    requireAdminAuth (via requireAdmin alias)
  //   GET     /api/admin/comments        requireAdminAuth (via requireAdmin alias)  [Phase 2 Journal]
  //   POST    /api/admin/comments/moderate requireAdminAuth (via requireAdmin alias) [Phase 2 Journal]
  //
  // History:
  //   2026-05-15 (I-011 drive-by): reset-user + users were unauthenticated.
  //                                Gated under the email-allowlist.
  //   2026-05-18 (I-018):          audit confirmed 3 routes gated.
  //   2026-05-18 (I-019):          swapped gate from email-allowlist (Google
  //                                OAuth session) to bcrypt admin session
  //                                cookie. Decouples admin from end-user auth.
  // ════════════════════════════════════════════════════════════════════════

  // ── POST /api/admin/login — admin session bootstrap (I-019) ─────────────
  app.post("/api/admin/login", async (req, res) => {
    const ip = clientIp(req);
    const lock = isLockedOut(ip);
    if (lock.locked) {
      const minutes = Math.ceil(lock.resetIn / 60_000);
      return res.status(429).json({
        error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        lockedUntil: Date.now() + lock.resetIn,
      });
    }

    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string") {
      recordLoginAttempt(ip, false);
      return res.status(400).json({ error: "Email and password required." });
    }

    const ok = (() => {
      if (!isAdminEmail(email)) return false;
      const hash = (process.env.ADMIN_PASSWORD_HASH || "").trim();
      if (!hash) {
        console.error("[admin/login] ADMIN_PASSWORD_HASH is not set");
        return false;
      }
      try {
        return bcrypt.compareSync(password, hash);
      } catch (err) {
        console.error("[admin/login] bcrypt.compare error:", err);
        return false;
      }
    })();

    if (!ok) {
      recordLoginAttempt(ip, false);
      const after = isLockedOut(ip);
      return res.status(401).json({
        error: "Invalid email or password.",
        attemptsRemaining: after.remaining,
      });
    }

    recordLoginAttempt(ip, true);
    const token = createAdminSession(email.trim().toLowerCase());
    const isProd = process.env.NODE_ENV === "production";
    res.cookie(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_TTL_MS,
      path: "/",
    });
    res.json({ ok: true, expiresIn: ADMIN_SESSION_TTL_MS });
  });

  // ── POST /api/admin/logout — clear admin cookie (I-019) ─────────────────
  app.post("/api/admin/logout", (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_COOKIE_NAME];
    if (token) destroyAdminSession(token);
    res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  });

  // ── GET /api/admin/me — current admin session info (I-019) ──────────────
  // Used by the client on /admin/* mount to decide whether to redirect to
  // /admin/login or render the page. Never throws — returns { authed: false }
  // when no session is present.
  app.get("/api/admin/me", (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_COOKIE_NAME];
    if (!token) return res.json({ authed: false });
    const session = getAdminSession(token);
    if (!session) return res.json({ authed: false });
    res.json({ authed: true, email: session.email });
  });

  // ── POST /api/admin/reset-user — reset generations for testing ──
  app.post("/api/admin/reset-user", (req, res) => {
    if (!requireAdmin(req, res)) return; // I-011 drive-by: was unauthenticated, now admin-only
    const { email, count = 3 } = req.body;
    const db = readDB();
    const user = Object.values(db.users).find((u: User) => u.email === email);
    if (!user) return res.status(404).json({ error: "User not found" });
    const isOwnerReset = isConceptTestAccountEmail(user.email);
    const cap = isOwnerReset ? 999 : FREE_TIER_MAX_CONCEPTS;
    user.generationsLeft = Math.min(cap, Number(count) || FREE_TIER_MAX_CONCEPTS);
    user.shoppingListsLeft = isOwnerReset ? 999 : FREE_TIER_MAX_SHOPPING_LISTS;
    db.users[user.googleId] = user;
    writeDB(db);
    res.json({ ok: true, email: user.email, generationsLeft: user.generationsLeft });
  });

  // ── POST /api/ai-vision/generate — two-step concept generation ──
  //
  // Step 1: extract style brief from reference images (or use hardcoded preset brief).
  // Step 2: generate the concept image with gemini-2.5-flash-image.
  //
  // Body (JSON):
  //   roomPhoto       string  — data URL of the room photo (required)
  //   referenceImages string[] — data URLs of reference images (may be empty)
  //   stylePreset     string  — frontend display name e.g. "Japandi" (optional)
  //   roomType        string  — frontend display name e.g. "Living Room" (optional)
  //   variationSeed   number  — increments per "Generate Variation" click (optional)
  //
  app.post("/api/ai-vision/generate", async (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const {
      roomPhoto,
      referenceImages = [],
      stylePreset,
      roomType,
      variationSeed,
      isSampleRun = false,
    } = req.body ?? {};

    // ── Validate inputs ────────────────────────────────────────────────────────
    if (!roomPhoto || typeof roomPhoto !== "string") {
      return res.status(400).json({ error: "Room photo is required." });
    }
    if (
      (!Array.isArray(referenceImages) || referenceImages.length === 0) &&
      !stylePreset
    ) {
      return res
        .status(400)
        .json({
          error:
            "Please add a reference image or select a style to continue.",
        });
    }

    // ── Quota check + decrement ────────────────────────────────────────────────
    const db = readDB();
    const user = db.users[googleId];
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.generationsLeft <= 0 && !isSampleRun) {
      return res
        .status(403)
        .json({ error: "No generations left.", generationsLeft: 0 });
    }
    if (!isSampleRun && user.generationsLeft < 999) {
      user.generationsLeft -= 1;
      user.lastUsed = new Date().toISOString();
      db.users[googleId] = user;
      writeDB(db);
    } else if (isSampleRun) {
      console.log(`[AI Vision] Sample run for ${user.email} — quota not decremented (${user.generationsLeft} remaining)`);
    }

    // ── Helper: parse data URL → { data, mimeType } ───────────────────────────
    function parseDataUrl(
      dataUrl: string
    ): { data: string; mimeType: string } | null {
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
      if (!m) return null;
      return { mimeType: m[1], data: m[2] };
    }

    try {
      // ── Resolve preset key (if any) ──────────────────────────────────────────
      const resolvedPreset = stylePreset
        ? STYLE_NAME_TO_PRESET[stylePreset as string]
        : undefined;

      // ── Parse reference image data URLs ─────────────────────────────────────
      const parsedRefs = (referenceImages as string[])
        .map(parseDataUrl)
        .filter((p): p is { data: string; mimeType: string } => p !== null);

      // References win over preset; if no parseable refs use preset only
      const hasRefs = parsedRefs.length > 0;

      // ── Step 1: Style brief (cached) ────────────────────────────────────────
      const cacheKey = getCacheKey({
        referenceImageData: parsedRefs.map((r) => r.data),
        preset: hasRefs ? undefined : resolvedPreset,
      });

      let styleBrief = getCachedBrief(cacheKey);

      if (!styleBrief) {
        styleBrief = await extractStyleBrief({
          referenceImageData: hasRefs ? parsedRefs : [],
          fallbackPreset: hasRefs ? undefined : resolvedPreset,
        });
        setCachedBrief(cacheKey, styleBrief);
        bumpApiCount("gemini"); // I-010 — style-brief extraction (skipped on cache hit)
      }

      // ── Step 2: Concept image ────────────────────────────────────────────────
      const parsedRoom = parseDataUrl(roomPhoto as string);
      if (!parsedRoom) {
        throw new Error("Room photo could not be parsed as a data URL.");
      }

      const resolvedRoomType = roomType
        ? ROOM_NAME_TO_TYPE[roomType as string]
        : undefined;

      const conceptDataUrl = await generateConceptImage({
        roomPhoto: parsedRoom,
        styleBrief,
        roomType: resolvedRoomType,
        variationSeed: typeof variationSeed === "number" ? variationSeed : undefined,
      });
      // I-010 — concept image generation. Retries undercount in v1 (NOTE: services/aiVision/imageGeneration.ts retries up to 2× on quota errors; instrument inside the service to capture retries accurately).
      bumpApiCount("gemini");
      recordActivity(user.email, "generate_vision"); // I-016

      return res.json({
        success: true,
        conceptUrl: conceptDataUrl,
        generationsLeft: user.generationsLeft,
      });

    } catch (err: any) {
      console.error("[AI Vision] Generation failed:", err?.message ?? err);

      // Restore quota on generation failure
      try {
        const dbRetry = readDB();
        const u = dbRetry.users[googleId];
        if (u && u.generationsLeft < 999) {
          const cap = isConceptTestAccountEmail(u.email) ? 999 : FREE_TIER_MAX_CONCEPTS;
          u.generationsLeft = Math.min(cap, u.generationsLeft + 1);
          dbRetry.users[googleId] = u;
          writeDB(dbRetry);
        }
      } catch (restoreErr) {
        console.error("[AI Vision] Failed to restore quota after error:", restoreErr);
      }

      const msg: string = err?.message ?? "";
      if (msg.includes("403") || msg.toLowerCase().includes("permission")) {
        return res
          .status(500)
          .json({ error: "API key error. Please contact support." });
      }
      if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate")) {
        return res
          .status(429)
          .json({ error: "Generation quota exceeded. Please try again shortly." });
      }
      if (msg.includes("incomplete brief")) {
        return res
          .status(503)
          .json({ error: "We hit a snag generating your concept. Please try again." });
      }
      return res
        .status(500)
        .json({ error: "Concept generation failed. Please try again." });
    }
  });

  // ── POST /api/room-audit/analyze — run Gemini room audit server-side ──
  app.post("/api/room-audit/analyze", async (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const { imageDataUrl, goals = [] } = req.body ?? {};
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ error: "imageDataUrl is required." });
    }
    const matches = imageDataUrl.match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: "Invalid image format." });

    try {
      const apiKey = process.env.GEMINI_API_KEY ?? "";
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
      const ai = new GoogleGenAI({ apiKey });

      const goalContext = Array.isArray(goals) && goals.length > 0
        ? `\nThe homeowner's goals: ${goals.join(", ")}.`
        : "";

      const prompt = `You are an expert interior designer performing a professional room audit.
Analyze this room photo and produce a structured design audit.${goalContext}

Score each of these 6 dimensions from 1-10 and write 1-2 sentences explaining the score:
1. Layout & Flow — furniture arrangement, traffic paths, spatial balance
2. Lighting — natural light use, layered lighting, ambiance
3. Color Harmony — palette cohesion, contrast, mood
4. Clutter & Organization — visual cleanliness, storage use
5. Functionality — practical use of space, ergonomics
6. Style Cohesion — consistency of design language, intentionality

Then calculate an overall score from 1-100 (weighted average, not a simple mean — layout and functionality matter more).

Finally, list exactly 3 "Fix Now" items — the highest-impact, most actionable improvements the homeowner can make immediately. For EACH fix, also give a normalized location {x,y} as numbers from 0 to 100 — the percentage position (x = left→right, y = top→bottom) of the exact spot in THIS photo the fix refers to (the rug, the empty corner, the sofa, etc.). Point at the real object; do not guess a position if you are unsure.

Output ONLY valid JSON with no markdown fences, no explanation:
{"overallScore":72,"dimensions":[{"label":"Layout & Flow","score":7,"verdict":"The sofa placement creates a clear conversation zone, but the dining table blocks the path to the balcony."},{"label":"Lighting","score":5,"verdict":"..."},{"label":"Color Harmony","score":8,"verdict":"..."},{"label":"Clutter & Organization","score":6,"verdict":"..."},{"label":"Functionality","score":7,"verdict":"..."},{"label":"Style Cohesion","score":6,"verdict":"..."}],"fixNow":[{"text":"Move the dining table 30cm left to open the balcony path","x":44,"y":66},{"text":"Add a floor lamp in the dark corner by the bookshelf","x":14,"y":52},{"text":"Replace the mismatched throw pillows with a cohesive neutral set","x":62,"y":70}]}`;

      const geminiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: matches[1], data: matches[2] } },
            { text: prompt },
          ],
        },
      });
      bumpApiCount("gemini"); // I-010 — room audit consumed

      const rawText: string =
        (geminiRes as any).text ??
        geminiRes?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text ?? "")
          .join("") ?? "";
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(422).json({ error: "Could not parse audit results." });
      }
      const parsed = JSON.parse(jsonMatch[0]);
      // I-016 — log generate_audit with the user's email
      try {
        const auditDb = readDB();
        const auditUser = auditDb.users[googleId];
        if (auditUser) recordActivity(auditUser.email, "generate_audit");
      } catch { /* non-fatal */ }
      return res.json({ result: parsed });

    } catch (err: any) {
      console.error("[Room Audit] analyze error:", err?.message ?? err);
      return res.status(500).json({ error: "Audit failed. Please try again." });
    }
  });

  // ── GET /api/admin/users — simple admin view (I-011: now admin-gated) ──
  app.get("/api/admin/users", (req, res) => {
    if (!requireAdmin(req, res)) return; // I-011 drive-by: was unauthenticated, now admin-only
    const db = readDB();
    const users = Object.values(db.users)
      .slice()
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) // newest signup first
      .map((u) => ({
        email: u.email,
        name: u.name,
        generationsLeft: u.generationsLeft,
        createdAt: u.createdAt,
        lastUsed: u.lastUsed,
      }));
    res.json({ total: users.length, users });
  });

  // ── GET /api/admin/users-detail — users page list + per-email history (I-020) ──
  //
  // No query param   → returns { users: UserDetail[] } where each entry is a
  //                    lifetime view: email, name, signupDate, lastLogin,
  //                    tier, totalActivityCount (count of activityLog entries
  //                    keyed on this email).
  // ?email=<urlenc>  → returns { user, activity } where activity is the user's
  //                    full activityLog history (newest first).
  //
  // Tier rules (two types only — "unlimited" retired 2026-07, folded into "paid"):
  //   "paid" — studio-owner allowlist (isConceptTestAccountEmail) OR user.isPaid === true
  //   "free" — everyone else
  app.get("/api/admin/users-detail", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = readDB();
    const allActivity = db.activityLog || [];

    const tierOf = (u: User): "paid" | "free" =>
      isConceptTestAccountEmail(u.email) || u.isPaid ? "paid" : "free";

    const emailQuery = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : null;

    if (emailQuery) {
      const user = Object.values(db.users).find(
        (u) => u.email.trim().toLowerCase() === emailQuery,
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      const activity = allActivity
        .filter((e) => e.userEmail.trim().toLowerCase() === emailQuery)
        .slice()
        .reverse(); // newest first
      return res.json({
        user: {
          email: user.email,
          name: user.name,
          signupDate: user.createdAt,
          lastLogin: user.lastUsed,
          tier: tierOf(user),
          generationsLeft: user.generationsLeft,
          shoppingListsLeft: user.shoppingListsLeft ?? null,
          totalActivityCount: activity.length,
        },
        activity,
      });
    }

    // List view — single pass over activityLog to count per email.
    const counts: Record<string, number> = {};
    for (const e of allActivity) {
      const key = e.userEmail.trim().toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }

    // Paid-consultation count + latest date per user (keyed by googleId). Best-
    // effort: if the orders DB is unreachable, fall back to 0 rather than 500.
    const consultByGid: Record<string, { count: number; last: string | null }> = {};
    try {
      const cr = await getPool().query(
        `SELECT user_id, COUNT(*)::int AS cnt, MAX(paid_at) AS last_paid
           FROM orders
          WHERE product_type = 'consultation' AND status = 'paid' AND user_id IS NOT NULL
          GROUP BY user_id`,
      );
      for (const row of cr.rows) {
        consultByGid[row.user_id] = {
          count: row.cnt,
          last: row.last_paid ? new Date(row.last_paid).toISOString() : null,
        };
      }
    } catch (err) {
      console.error("[admin/users-detail] consultation count query failed:", err);
    }

    const users = Object.values(db.users)
      .slice()
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) // newest signup first
      .map((u) => ({
        email: u.email,
        name: u.name,
        signupDate: u.createdAt,
        lastLogin: u.lastUsed,
        tier: tierOf(u),
        totalActivityCount: counts[u.email.trim().toLowerCase()] || 0,
        consultations: consultByGid[u.googleId]?.count || 0,
        lastConsultation: consultByGid[u.googleId]?.last || null,
      }));
    res.json({ users });
  });

  // ── GET /api/admin/counts — sidebar badge counts (2026-07-10) ──────────────
  // Cheap-ish rollup for the admin left-nav badges. DB counts are instant; the
  // waitlist count comes from the newsletter Sheet (cached 60s so nav mounts are
  // snappy). Each source degrades to 0 independently rather than 500-ing.
  let waitlistCountCache: { val: number; exp: number } | null = null;
  app.get("/api/admin/counts", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = readDB();
    const users = Object.keys(db.users || {}).length;
    const feedbackNew = (db.feedback || []).filter((f) => f.status === "new").length;
    let comments = 0;
    let orders = 0;
    try {
      const cr = await getPool().query(`SELECT COUNT(*)::int AS n FROM blog_comments WHERE status = 'pending'`);
      comments = cr.rows[0]?.n || 0;
    } catch { /* degrade */ }
    try {
      const orq = await getPool().query(
        `SELECT COUNT(*)::int AS n FROM orders WHERE product_type = 'consultation' AND status = 'paid'`,
      );
      orders = orq.rows[0]?.n || 0;
    } catch { /* degrade */ }
    let waitlist = 0;
    try {
      if (waitlistCountCache && waitlistCountCache.exp > Date.now()) {
        waitlist = waitlistCountCache.val;
      } else {
        waitlist = (await readNewsletterFromSheet()).count;
        waitlistCountCache = { val: waitlist, exp: Date.now() + 60_000 };
      }
    } catch { /* degrade */ }
    res.json({ users, comments, feedback: feedbackNew, waitlist, orders });
  });

  // ── GET /api/admin/feedback — durable feedback inbox (newest first) ────────
  app.get("/api/admin/feedback", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = readDB();
    const items = (db.feedback || []).slice().reverse();
    res.json({ items, newCount: items.filter((f) => f.status === "new").length });
  });

  // ── POST /api/admin/feedback/read — mark one (by ts) or all as read ────────
  app.post("/api/admin/feedback/read", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { ts, all } = req.body || {};
    const db = readDB();
    if (!db.feedback) db.feedback = [];
    let changed = 0;
    for (const f of db.feedback) {
      if ((all === true || (typeof ts === "string" && f.ts === ts)) && f.status !== "read") {
        f.status = "read";
        changed++;
      }
    }
    if (changed) writeDB(db);
    res.json({ ok: true, changed });
  });

  // ── GET /api/admin/waitlist — full paid-feature / newsletter list ──────────
  app.get("/api/admin/waitlist", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const nl = await readNewsletterFromSheet();
      res.json({ count: nl.count, items: nl.all, error: nl.error });
    } catch (e: any) {
      res.json({ count: 0, items: [], error: e?.message || "Sheet read failed" });
    }
  });

  // ── GET /api/admin/usage — observability aggregator (I-011 · I-021b) ──
  // Powers the /admin dashboard. Single roundtrip returns:
  //   counters         per-provider rolling counters + 30d history (I-010 + I-021b)
  //   activity         last 50 activityLog entries (newest first)
  //   platforms        platform inventory cards
  //   serperLog        last 100 Serper forensic entries (newest first)
  //   users            total + signups7d + logins24h + paid/free counts
  //   shoppingStatus   mirror of /api/shopping/status
  //   funnels          4 tools: started → completed counts + rate (last 7d)
  //   activation       anon→signup rate + median time-to-first-tool + top trigger
  //   newsletter       count + recent 5 (read live from the Sheet)
  //   retention        D1/D7/D30 cohort return rates + DAU/WAU/MAU
  //   cost             per-provider $ + MTD total + cost-per-active-user (est.)
  app.get("/api/admin/usage", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = readDB();
    const userList = Object.values(db.users);
    const allActivity = db.activityLog || [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * dayMs;

    const isPaidUser = (u: User) => !!u.isPaid || isConceptTestAccountEmail(u.email);

    const signups7d = userList.filter((u) => {
      const t = Date.parse(u.createdAt);
      return Number.isFinite(t) && now - t < 7 * dayMs;
    }).length;
    const logins24h = allActivity.filter((e) => {
      if (e.action !== "login") return false;
      const t = Date.parse(e.ts);
      return Number.isFinite(t) && now - t < dayMs;
    }).length;

    // Shopping availability — mirror of /api/shopping/status logic.
    const SHOPPING_DISABLED = (process.env.SHOPPING_DISABLED || "false").toLowerCase() === "true";
    const SERPER_DAILY_BUDGET = (() => {
      const parsed = parseInt((process.env.SERPER_DAILY_BUDGET || "200"), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
    })();
    const todayUtc = utcDateString();
    const usage = db.serperUsage && db.serperUsage.date === todayUtc ? db.serperUsage : { date: todayUtc, count: 0 };
    const budgetExceeded = usage.count + 4 > SERPER_DAILY_BUDGET;
    const shoppingStatus = SHOPPING_DISABLED
      ? { disabled: true, code: "disabled" as const, dailyBudget: SERPER_DAILY_BUDGET, todayCount: usage.count }
      : budgetExceeded
        ? { disabled: true, code: "daily_budget_exceeded" as const, dailyBudget: SERPER_DAILY_BUDGET, todayCount: usage.count, resetAt: nextUtcMidnightIso() }
        : { disabled: false, dailyBudget: SERPER_DAILY_BUDGET, todayCount: usage.count };

    // ── Funnels (last 7d) ────────────────────────────────────────────────
    // Quiz also accepts the older `quiz_start` action name for back-compat.
    const recent = allActivity.filter((e) => {
      const t = Date.parse(e.ts);
      return Number.isFinite(t) && t >= sevenDaysAgo;
    });
    const cnt = (action: string | string[]) => {
      const set = Array.isArray(action) ? new Set(action) : new Set([action]);
      return recent.filter((e) => set.has(e.action)).length;
    };
    const mkFunnel = (name: string, status: 'live' | 'offline', startedActions: string | string[], completedAction: string) => {
      const started = cnt(startedActions);
      const completed = cnt(completedAction);
      const pct = started > 0 ? Math.round((completed / started) * 100) : 0;
      return { name, status, started, completed, pct };
    };
    const funnels = [
      mkFunnel("Style Quiz",   "live",                                       ["quiz_start", "quiz_started"], "quiz_complete"),
      mkFunnel("AI Vision",    "live",                                       "vision_started",              "generate_vision"),
      mkFunnel("Shopping List", SHOPPING_DISABLED ? "offline" : "live",      "shopping_started",            "generate_shopping"),
      mkFunnel("Room Audit",   "live",                                       "audit_started",               "generate_audit"),
    ];

    // ── Activation ───────────────────────────────────────────────────────
    // Signup-rate: 7d signups ÷ 7d total anonymous-tracker hits (calendly/quiz/etc.)
    // — rough proxy until GA4 sessions land (I-007).
    const anonEvents7d = recent.filter((e) => e.userEmail === ANON_USER).length;
    const anonToSignupRate = anonEvents7d > 0
      ? Math.round((signups7d / (anonEvents7d + signups7d)) * 100)
      : null;

    // Median time-to-first-tool: across users who signed up AND fired a generate_* event later.
    const TOOL_ACTIONS = new Set(["generate_vision", "generate_shopping", "generate_audit"]);
    const ttftSecs: number[] = [];
    for (const u of userList) {
      const signupTs = Date.parse(u.createdAt);
      if (!Number.isFinite(signupTs)) continue;
      const firstTool = allActivity.find(
        (e) => e.userEmail === u.email && TOOL_ACTIONS.has(e.action) && Date.parse(e.ts) >= signupTs,
      );
      if (firstTool) {
        const dt = (Date.parse(firstTool.ts) - signupTs) / 1000;
        if (dt >= 0 && Number.isFinite(dt)) ttftSecs.push(dt);
      }
    }
    const medianTtftSec = ttftSecs.length === 0
      ? null
      : ttftSecs.slice().sort((a, b) => a - b)[Math.floor(ttftSecs.length / 2)];

    // C-followup — top sign-up trigger comes from the source slug stamped on
    // each `signup` activityLog entry. Missing slug → "unknown".
    const signupEntries = allActivity.filter((e) => e.action === "signup");
    const sourceCounts: Record<string, number> = {};
    for (const e of signupEntries) {
      const s = e.source || "unknown";
      sourceCounts[s] = (sourceCounts[s] || 0) + 1;
    }
    const allSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
    const topSignupSource = allSources.length === 0
      ? null
      : {
          source: allSources[0].source,
          count: allSources[0].count,
          pctOfSignups: signupEntries.length > 0
            ? Math.round((allSources[0].count / signupEntries.length) * 100)
            : 0,
        };

    const activation = {
      anonToSignupRatePct: anonToSignupRate,
      medianTimeToFirstToolSec: medianTtftSec === null ? null : Math.round(medianTtftSec),
      // Legacy field kept for prior consumers; new clients should read topSignupSource.
      topSignupTrigger: topSignupSource ? topSignupSource.source : null,
      topSignupSource,
      allSources,
      totalSignups: signupEntries.length,
      ttftSampleSize: ttftSecs.length,
    };

    // ── Newsletter (live read from the Sheet) ────────────────────────────
    let newsletter: { count: number; recent: Array<{ email: string; signupDate: string; source: string }>; error?: string };
    try {
      newsletter = await readNewsletterFromSheet();
    } catch (e: any) {
      newsletter = { count: 0, recent: [], error: e?.message || "Sheet read failed" };
    }

    // ── Retention ────────────────────────────────────────────────────────
    // Cohort logic: of users who signed up at least N days ago, what % had ANY
    // activity-log event between their signup ts and now? For DXX we measure
    // "any activity at least XX days after signup".
    const cohortReturn = (minDaysOld: number, minGapDays: number): number | null => {
      const cohort = userList.filter((u) => {
        const t = Date.parse(u.createdAt);
        return Number.isFinite(t) && now - t >= minDaysOld * dayMs;
      });
      if (cohort.length === 0) return null;
      const returned = cohort.filter((u) => {
        const signupTs = Date.parse(u.createdAt);
        return allActivity.some(
          (e) => e.userEmail === u.email && Date.parse(e.ts) >= signupTs + minGapDays * dayMs,
        );
      }).length;
      return Math.round((returned / cohort.length) * 100);
    };
    const distinctActiveUsers = (windowMs: number): number => {
      const cutoff = now - windowMs;
      const set = new Set<string>();
      for (const e of allActivity) {
        const t = Date.parse(e.ts);
        if (!Number.isFinite(t) || t < cutoff) continue;
        if (e.userEmail === ANON_USER) continue;
        set.add(e.userEmail);
      }
      return set.size;
    };
    const retention = {
      d1ReturnPct:  cohortReturn(1, 1),
      d7ReturnPct:  cohortReturn(7, 7),
      d30ReturnPct: cohortReturn(30, 30),
      dau: distinctActiveUsers(dayMs),
      wau: distinctActiveUsers(7 * dayMs),
      mau: distinctActiveUsers(30 * dayMs),
    };

    // ── Cost (estimated) ─────────────────────────────────────────────────
    const counters = db.apiCounters || {};
    const byProvider = (["gemini", "cloudinary", "serper", "sheets", "ipapi", "emailjs"] as const).map((p) => {
      const c = counters[p];
      const cap = PROVIDER_FREE_CAPS[p];
      const todayCount = c?.daily?.date === todayUtc ? c.daily.count : 0;
      const monthlyCount = c?.monthly?.date === utcMonthString() ? c.monthly.count : 0;
      const windowCount = cap.window === 'daily' ? todayCount : monthlyCount;
      const pct = cap.limit > 0 ? Math.round((windowCount / cap.limit) * 100) : 0;
      const status: 'healthy' | 'watch' | 'critical' | 'offline' =
        p === 'serper' && SHOPPING_DISABLED ? 'offline' :
        cap.limit === 0 ? 'healthy' :
        pct >= 80 ? 'critical' :
        pct >= 50 ? 'watch' :
                    'healthy';
      const costPerCall = CALL_COSTS[p] ?? 0;
      const mtdCost = monthlyCount * costPerCall;
      return {
        provider: p,
        windowCount,
        windowLimit: cap.limit,
        windowLabel: cap.label,
        pct,
        status,
        mtdCost,
      };
    });
    const totalMtdCost = byProvider.reduce((acc, x) => acc + x.mtdCost, 0);
    const cost = {
      mtdSpendEst: totalMtdCost,
      costPerActiveUserEst: retention.mau > 0 ? totalMtdCost / retention.mau : null,
      byProvider,
    };

    res.json({
      counters,
      activity: allActivity.slice(-50).reverse(), // newest first
      platforms: PLATFORMS,
      serperLog: (db.serperLog || []).slice(-100).reverse(), // newest first
      users: {
        total: userList.length,
        signups7d,
        logins24h,
        paid: userList.filter(isPaidUser).length,
        free: userList.filter((u) => !isPaidUser(u)).length,
      },
      shoppingStatus,
      funnels,
      activation,
      newsletter,
      retention,
      cost,
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Payments — Rail B (I-025): Ameriabank vPOS $99 consultation, guest checkout
  // ════════════════════════════════════════════════════════════════════════
  // Pay-first flow: POST /initiate creates a pending `orders` row + reserves a
  // vPOS payment → browser redirects to the ARCA hosted page → on return the
  // gateway hits GET /callback, where we VERIFY server-side (GetPaymentDetails)
  // before marking paid + emailing the private Calendly link. Admins can refund.
  //
  // Security posture: amount + currency are server-authoritative (mode-resolved,
  // never from the client); we verify via GetPaymentDetails rather than trusting
  // the redirect code; we cross-check the bank-echoed Opaque against our order
  // UUID; vPOS creds never reach the browser; /initiate is rate-limited per IP.

  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  // In-memory per-IP rate limit for payment initiation (no general limiter
  // exists project-wide). Guards against OrderID/sequence exhaustion + abuse.
  const initiateHits: Record<string, number[]> = {};
  const INITIATE_WINDOW_MS = 10 * 60 * 1000;
  const INITIATE_MAX = 10;
  const initiateRateLimited = (ip: string): boolean => {
    const now = Date.now();
    const arr = (initiateHits[ip] || []).filter((t) => now - t < INITIATE_WINDOW_MS);
    arr.push(now);
    initiateHits[ip] = arr;
    return arr.length > INITIATE_MAX;
  };

  const CONSULTATION_DESCRIPTION = "Designature Studio — 45-min virtual consultation";
  /** Second attendee on every booking (the studio host). */
  const CONSULTATION_HOST_EMAIL = (process.env.CONSULTATION_HOST_EMAIL || "anahit@designature.studio").trim();

  /** Human-readable slot, rendered in the studio's timezone (for emails/logs). */
  const formatSlot = (iso: string, timeZone: string): string => {
    try {
      const d = new Date(iso);
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);
      return `${date} · ${time}`;
    } catch {
      return iso;
    }
  };

  /**
   * Create the Google Calendar booking for a paid order (idempotent via the
   * order id as requestId). Stores google_calendar_event_id. Best-effort: a
   * calendar failure must NEVER unwind a captured payment — we log loudly and
   * leave the order paid so the owner can add the event manually.
   */
  const createCalendarEventForOrder = async (order: any): Promise<void> => {
    if (order.google_calendar_event_id) return; // already created (re-hit guard)
    if (!order.slot_start_time) {
      console.error("[calendar] paid order has no slot_start_time — cannot book:", order.id);
      return;
    }
    if (!isCalendarConfigured()) {
      console.error(
        "[calendar] GOOGLE_CALENDAR_REFRESH_TOKEN not set — booking NOT created for paid order",
        order.id,
        "(run /api/admin/google-calendar/authorize).",
      );
      return;
    }
    try {
      const cfg = getConsultationConfig();
      const result = await calendarInsertEvent({
        startIso: new Date(order.slot_start_time).toISOString(),
        durationMinutes: cfg.durationMinutes,
        attendeeEmail: order.client_email,
        hostEmail: CONSULTATION_HOST_EMAIL,
        requestId: order.id,
        summary: CONSULTATION_DESCRIPTION,
      });
      await getPool()
        .query(`UPDATE orders SET google_calendar_event_id=$1 WHERE id=$2`, [result.eventId, order.id])
        .catch((err) => console.error("[calendar] event created but id-store failed:", err));
      console.log(
        "[calendar] booked event",
        JSON.stringify({ orderId: order.id, eventId: result.eventId, meet: result.meetLink }),
      );
    } catch (err) {
      console.error("[calendar] events.insert failed (order stays paid, book manually):", order.id, err);
    }
  };

  /**
   * Delete the calendar event tied to an order (on refund/cancel). Best-effort:
   * money movement already succeeded, so a calendar failure is logged, not
   * fatal. Clears google_calendar_event_id on success.
   */
  const deleteCalendarEventForOrder = async (order: any): Promise<void> => {
    if (!order.google_calendar_event_id) return;
    if (!isCalendarConfigured()) {
      console.error("[calendar] cannot delete event (not configured) for order", order.id);
      return;
    }
    try {
      await calendarDeleteEvent(order.google_calendar_event_id);
      await getPool()
        .query(`UPDATE orders SET google_calendar_event_id=NULL WHERE id=$1`, [order.id])
        .catch(() => {});
      console.log("[calendar] deleted event for order", order.id);
    } catch (err) {
      console.error("[calendar] events.delete failed (refund/cancel still succeeded):", order.id, err);
    }
  };

  /** Structured, greppable payment-event log line (timestamp + diagnostics). */
  const logPaymentEvent = (order: any, details: any, ok: boolean) => {
    console.log("[ameria] payment_event", JSON.stringify({
      ts: new Date().toISOString(),
      orderId: order?.id,
      ameriaOrderId: order?.ameria_order_id,
      email: order?.client_email,
      responseCode: details?.ResponseCode,
      paymentState: details?.PaymentState,
      depositedAmount: details?.DepositedAmount,
      ok,
    }));
  };

  /**
   * Branded payment RECEIPT email (book-first). The booking already happened —
   * Google Calendar sends the actual invite + Meet link + reminders separately.
   * This is a quiet receipt, NOT a "click here to book" prompt.
   */
  const buildConsultationReceiptEmailHtml = (slotIso: string | null): string => {
    const cobalt = "#0047AB";
    const tz = getConsultationConfig().timeZone;
    // Show the time as a city-free GMT offset; the Google Calendar invite is the
    // authoritative copy and localises to the customer's own timezone.
    const when = slotIso ? formatSlot(slotIso, tz) : null;
    const gmt = slotIso ? gmtLabelForTz(tz, new Date(slotIso)) : "";
    const whenBlock = when
      ? `<tr><td style="padding:0 40px 20px;">
          <div style="padding:16px 18px;background:#f4f7fc;border-left:3px solid ${cobalt};">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${cobalt};font-weight:700;">Your session</p>
            <p style="margin:0;font-size:16px;line-height:1.5;color:#1C1C1C;font-weight:600;">${when} <span style="color:#6B6B6B;font-weight:400;">(${gmt})</span></p>
            <p style="margin:6px 0 0;font-size:12px;color:#6B6B6B;">Your calendar invite shows this in your own timezone.</p>
          </div>
        </td></tr>`
      : "";
    return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#1C1C1C;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E7E3DB;">
        <tr><td style="padding:36px 40px 8px;">
          <p style="margin:0 0 18px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${cobalt};font-weight:700;">Designature Studio</p>
          <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.15;color:#1C1C1C;">You're booked.</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#404040;">Your payment cleared and your 45-minute virtual consultation is confirmed. A separate Google Calendar invitation is on its way — it carries your <strong>Google Meet link</strong> and reminders, and shows the time in your own timezone.</p>
        </td></tr>
        ${whenBlock}
        <tr><td style="padding:0 40px 8px;border-top:1px solid #E7E3DB;">
          <h2 style="margin:26px 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:20px;color:#1C1C1C;">What to have ready</h2>
          <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;line-height:1.7;color:#404040;">
            <li>A few photos of the room — phone shots are completely fine.</li>
            <li>A Pinterest board or saved screenshots, if you've been collecting ideas.</li>
            <li>What's bothering you about the space, or how you want it to feel.</li>
            <li>A rough floor plan, if you happen to have one. Not required.</li>
          </ul>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <p style="margin:0;padding:16px 18px;background:#f4f7fc;border-left:3px solid ${cobalt};font-size:13px;line-height:1.6;color:#404040;">A quiet reminder: your <strong>$99 is fully creditable toward a Designature design project</strong> if you book one within 30 days.</p>
          <p style="margin:22px 0 0;font-size:12px;color:#9a9a9a;">Need to reschedule or cancel? Reply to this email or write to hello@designature.studio.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  };

  /** Mark an order failed (best-effort), log it, and redirect the browser. */
  const finalizeFailure = async (order: any, reason: string, res: any, responseCode?: unknown) => {
    console.warn("[ameria/callback] → failed:", reason, order?.id);
    try {
      await getPool().query(`UPDATE orders SET status='failed' WHERE id=$1`, [order.id]);
    } catch (err) {
      console.error("[ameria/callback] mark-failed write failed:", err);
    }
    recordActivity(order.client_email, "consultation_failed", {
      user_id: order.user_id,
      order_id: order.id,
      response_code: responseCode ?? null,
    });
    return res.redirect(302, "/booking/failed");
  };

  /** How long a picked slot is held for the customer to complete payment. */
  const SLOT_HOLD_MINUTES = 20;
  /** Serializes concurrent holds so the overlap check + INSERT are atomic. */
  const HOLD_ADVISORY_LOCK_SQL = `SELECT pg_advisory_xact_lock(hashtext('designature-consultation-hold')::bigint)`;

  /**
   * Reserve the vPOS payment for an already-created pending order. Shared by the
   * hold route. On success updates ameria_payment_id + logs consultation_initiated
   * and returns the gateway redirect URL; on failure marks the order 'failed'
   * (which frees the slot) and throws a tagged error the caller maps to 502.
   */
  const reserveVposPayment = async (order: { id: string; ameria_order_id: string; client_email: string; user_id?: string }): Promise<string> => {
    const cfg = getAmeriaConfig();
    const pool = getPool();
    try {
      const init = await initPayment({
        orderId: order.ameria_order_id,
        description: CONSULTATION_DESCRIPTION,
        opaque: order.id,
      });
      // InitPayment success is ResponseCode === 1 (Table-1 "00" is for the later
      // GetPaymentDetails/RefundPayment calls, not InitPayment).
      if (Number(init.responseCode) !== 1 || !init.paymentId) {
        console.error("[consultation/hold] InitPayment rejected:", init.responseCode, init.responseMessage, JSON.stringify(init.raw));
        await pool.query(`UPDATE orders SET status='failed' WHERE id=$1`, [order.id]).catch(() => {});
        throw new Error("vpos-init-rejected");
      }
      await pool.query(`UPDATE orders SET ameria_payment_id=$1 WHERE id=$2`, [init.paymentId, order.id]);
      recordActivity(order.client_email, "consultation_initiated", {
        user_id: order.user_id,
        order_id: order.id,
        amount: cfg.amount,
      });
      return buildGatewayRedirectUrl(cfg.baseUrl, init.paymentId);
    } catch (err: any) {
      if (err?.message !== "vpos-init-rejected") {
        console.error("[consultation/hold] InitPayment error:", err);
        await pool.query(`UPDATE orders SET status='failed' WHERE id=$1`, [order.id]).catch(() => {});
      }
      throw err;
    }
  };

  // ── GET /api/consultation/slots — available booking slots (next 30 days) ─────
  // Availability is MIRRORED LIVE from Calendly (the owner manages her schedule
  // there), minus our own live holds. Requires sign-in (the picker loads post-auth).
  app.get("/api/consultation/slots", async (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;

    const cfg = getConsultationConfig();
    const now = new Date();

    if (!isCalendlyConfigured()) {
      console.error(
        "[consultation/slots] Calendly not configured — set CALENDLY_ACCESS_TOKEN + CALENDLY_PAID_CONSULT_EVENT_TYPE_URI",
      );
      return res.json({ slots: [], durationMinutes: cfg.durationMinutes, configured: false });
    }

    // Live Calendly availability (cached 60s, chunked into <=7-day windows).
    let calendlySlots: string[];
    try {
      calendlySlots = await fetchCalendlyAvailableSlots(now, HORIZON_DAYS);
    } catch (err) {
      console.error("[consultation/slots] Calendly availability fetch failed:", err);
      return res.status(502).json({ error: "Could not load availability. Please try again." });
    }

    // Our own live holds (pending/paid) so two customers can't hold the same time
    // (Calendly won't know about a Google-Calendar event until it syncs).
    let held: string[] = [];
    try {
      const r = await getPool().query(
        `SELECT slot_start_time FROM orders
          WHERE product_type='consultation'
            AND status IN ('pending','paid')
            AND slot_start_time IS NOT NULL
            AND slot_start_time >= NOW() - INTERVAL '1 day'`,
      );
      held = r.rows.map((row: any) => new Date(row.slot_start_time).toISOString());
    } catch (err) {
      console.error("[consultation/slots] held-slot lookup failed:", err);
      return res.status(500).json({ error: "Could not load availability. Please try again." });
    }

    const slots = filterAvailable(calendlySlots, [], held, cfg.durationMinutes);
    return res.json({ slots, durationMinutes: cfg.durationMinutes, configured: true });
  });

  // ── POST /api/consultation/hold — hold a slot 20min + reserve vPOS payment ───
  // Book-first: the order row is created HERE (with the slot), held for 20min,
  // then we reserve the payment and hand back the gateway redirect. The auto-
  // expire sweep releases the hold if payment never completes.
  app.post("/api/consultation/hold", async (req, res) => {
    const ip = clientIp(req);
    if (initiateRateLimited(ip)) {
      return res.status(429).json({ error: "Too many attempts. Please wait a few minutes and try again." });
    }

    const googleId = requireAuth(req, res);
    if (!googleId) return;
    const sessUser = readDB().users[googleId];
    if (!sessUser?.email) {
      return res.status(401).json({ error: "Your session has no email on file — please sign in again." });
    }
    const clientEmail = sessUser.email;

    const slotRaw = (req.body?.slot_start_time ?? "").toString().trim();
    const cfg = getConsultationConfig();
    const now = new Date();
    const slotTs = Date.parse(slotRaw);
    if (!slotRaw || !Number.isFinite(slotTs)) {
      return res.status(400).json({ error: "That time isn't available to book. Please pick another slot." });
    }
    const slotIso = new Date(slotTs).toISOString();

    // Server-authoritative validation: the requested slot must be a currently
    // bookable Calendly slot (reuses the 60s cache from /slots — no extra call).
    if (!isCalendlyConfigured()) {
      return res.status(503).json({ error: "Booking is temporarily unavailable. Please try again shortly." });
    }
    try {
      const available = await fetchCalendlyAvailableSlots(now, HORIZON_DAYS);
      if (!available.includes(slotIso)) {
        return res.status(400).json({ error: "That time isn't available to book. Please pick another slot." });
      }
    } catch (err) {
      console.error("[consultation/hold] Calendly validation failed:", err);
      return res.status(502).json({ error: "Could not confirm availability. Please try again." });
    }

    const ameriaCfg = getAmeriaConfig();
    if (!ameriaCfg.baseUrl || !ameriaCfg.clientId || !ameriaCfg.username || !ameriaCfg.password) {
      console.error("[consultation/hold] vPOS env incomplete");
      return res.status(503).json({ error: "Payments are temporarily unavailable. Please try again shortly." });
    }

    // Create the hold atomically: an advisory lock serializes concurrent holds so
    // the overlap check + INSERT can't race; the partial unique index is the final
    // backstop against an identical-slot double-hold. We store the ACTUALLY-charged
    // amount/currency (mode-resolved) so the order is a truthful ledger row.
    const pool = getPool();
    const client = await pool.connect();
    let order: { id: string; ameria_order_id: string };
    try {
      await client.query("BEGIN");
      await client.query(HOLD_ADVISORY_LOCK_SQL);

      const overlap = await client.query(
        `SELECT 1 FROM orders
          WHERE product_type='consultation'
            AND status IN ('pending','paid')
            AND slot_start_time IS NOT NULL
            AND slot_start_time < ($1::timestamptz + make_interval(mins => $2))
            AND (slot_start_time + make_interval(mins => $2)) > $1::timestamptz
          LIMIT 1`,
        [slotIso, cfg.durationMinutes],
      );
      if (overlap.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "That time was just taken. Please pick another slot." });
      }

      const r = await client.query(
        `INSERT INTO orders (product_type, amount, currency, status, client_email, user_id,
                             slot_start_time, slot_hold_expires_at)
         VALUES ('consultation', $1, $2, 'pending', $3, $4, $5,
                 NOW() + make_interval(mins => $6))
         RETURNING id, ameria_order_id`,
        [
          ameriaCfg.amount,
          ameriaCfg.mode === "sandbox" ? "AMD" : "USD",
          clientEmail,
          googleId,
          slotIso,
          SLOT_HOLD_MINUTES,
        ],
      );
      order = r.rows[0];
      await client.query("COMMIT");
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      if (err?.code === "23505") {
        // Unique-index violation → the slot was taken between our check and insert.
        return res.status(409).json({ error: "That time was just taken. Please pick another slot." });
      }
      console.error("[consultation/hold] DB insert failed:", err);
      return res.status(500).json({ error: "Could not hold your slot. Please try again." });
    } finally {
      client.release();
    }

    // Reserve the payment for the held order.
    try {
      const redirectUrl = await reserveVposPayment({ ...order, client_email: clientEmail, user_id: googleId });
      const holdExpiresAt = new Date(now.getTime() + SLOT_HOLD_MINUTES * 60_000).toISOString();
      return res.json({ orderId: order.id, redirectUrl, slotStartTime: slotIso, holdExpiresAt });
    } catch {
      return res.status(502).json({ error: "The payment gateway could not start the session. Please try again." });
    }
  });

  // ── POST /api/consultation/release — free a still-pending hold immediately ───
  // Called when a customer backs out of the hold modal (or lets the countdown
  // lapse client-side). Only cancels a PENDING order the caller owns, so it can't
  // touch a paid booking. The 5-min auto-expire sweep is the backstop if this
  // never fires (e.g. tab closed).
  app.post("/api/consultation/release", async (req, res) => {
    const googleId = requireAuth(req, res);
    if (!googleId) return;
    const orderId = (req.body?.orderId ?? "").toString().trim();
    if (!isUuid(orderId)) return res.status(400).json({ error: "A valid orderId is required." });
    try {
      const r = await getPool().query(
        `UPDATE orders SET status='cancelled'
          WHERE id=$1 AND user_id=$2 AND product_type='consultation' AND status='pending'
          RETURNING id, client_email, slot_start_time`,
        [orderId, googleId],
      );
      if (r.rows.length > 0) {
        recordActivity(r.rows[0].client_email, "consultation_hold_released", {
          user_id: googleId,
          order_id: orderId,
          slot_start_time: r.rows[0].slot_start_time ? new Date(r.rows[0].slot_start_time).toISOString() : null,
        });
      }
      return res.json({ released: r.rows.length > 0 });
    } catch (err) {
      console.error("[consultation/release] failed:", err);
      return res.status(500).json({ error: "Could not release the hold." });
    }
  });

  // ── GET /api/payments/ameria/callback — gateway returns the browser here ─────
  app.get("/api/payments/ameria/callback", async (req, res) => {
    const q: any = req.query;
    // vPOS 3.1 casing is orderID / responseCode / paymentID / opaque — be tolerant.
    const orderID = (q.orderID ?? q.OrderID ?? q.orderId ?? "").toString().trim();
    const opaque = (q.opaque ?? q.Opaque ?? "").toString().trim();

    if (!orderID || !opaque || !isUuid(opaque)) {
      console.warn("[ameria/callback] missing/invalid orderID|opaque", { orderID, opaque });
      return res.redirect(302, "/booking/failed");
    }

    const pool = getPool();
    let order: any;
    try {
      const r = await pool.query(
        `SELECT * FROM orders WHERE ameria_order_id=$1 AND id=$2 LIMIT 1`,
        [orderID, opaque],
      );
      order = r.rows[0];
    } catch (err) {
      console.error("[ameria/callback] DB lookup failed:", err);
      return res.redirect(302, "/booking/failed");
    }
    if (!order) {
      console.warn("[ameria/callback] order not found / opaque mismatch", { orderID, opaque });
      return res.redirect(302, "/booking/failed");
    }

    // Idempotency — a re-hit of the callback must not re-verify or re-email.
    if (order.status === "paid" || order.status === "refunded") {
      return res.redirect(302, `/booking/confirmed?order=${order.id}`);
    }
    if (order.status === "failed" || order.status === "cancelled") {
      return res.redirect(302, "/booking/failed");
    }
    if (!order.ameria_payment_id) return finalizeFailure(order, "no payment id on order", res);

    // Authoritative verification — never trust the redirect responseCode alone.
    let details;
    try {
      details = await getPaymentDetails(order.ameria_payment_id);
    } catch (err) {
      console.error("[ameria/callback] GetPaymentDetails error:", err);
      return finalizeFailure(order, "GetPaymentDetails threw", res);
    }

    // Cross-check the bank-echoed Opaque against our UUID (tamper/replay guard).
    if (details.Opaque && String(details.Opaque).trim() !== String(order.id).trim()) {
      return finalizeFailure(order, `Opaque mismatch (${details.Opaque})`, res);
    }

    const cfg = getAmeriaConfig();
    const verdict = evaluatePaymentSuccess(details, cfg.amount, cfg.currency);
    logPaymentEvent(order, details, verdict.ok);
    if (!verdict.ok) {
      return finalizeFailure(order, `verify failed: ${verdict.reasons.join("; ")}`, res, details.ResponseCode);
    }

    try {
      await pool.query(`UPDATE orders SET status='paid', paid_at=now() WHERE id=$1`, [order.id]);
    } catch (err) {
      // The payment IS captured — don't fail the user. Log loudly for reconciliation.
      console.error("[ameria/callback] mark-paid write failed (payment captured):", err);
    }
    recordActivity(order.client_email, "consultation_paid", {
      user_id: order.user_id,
      order_id: order.id,
      amount: Number(order.amount),
      ameria_payment_id: order.ameria_payment_id,
      slot_start_time: order.slot_start_time ? new Date(order.slot_start_time).toISOString() : null,
    });

    // Book-first: create the Google Calendar event (auto-generates the Meet link
    // and sends both attendees the invite). Best-effort — a captured payment is
    // never unwound by a calendar hiccup (createCalendarEventForOrder logs loudly).
    await createCalendarEventForOrder(order);

    // A dropped email must NEVER lose a paid order — log + continue to confirmed.
    // This is a RECEIPT now (Google Calendar delivers the actual invite + Meet link).
    try {
      await sendEmail({
        to: order.client_email,
        subject: "You're booked — your Designature Studio consultation",
        html: buildConsultationReceiptEmailHtml(order.slot_start_time ? new Date(order.slot_start_time).toISOString() : null),
      });
    } catch (err) {
      console.error("[ameria/callback] receipt email failed (order still paid):", err);
    }
    return res.redirect(302, `/booking/confirmed?order=${order.id}`);
  });

  // ── GET /api/payments/ameria/confirmation — booking receipt status ───────────
  // Book-first: the booking already happened, so /booking/confirmed is a quiet
  // receipt. We return the paid status + the booked slot for a genuinely
  // paid/refunded order (keyed by its UUID) so the page can show "You're booked
  // for {slot}". No Calendly link — Google Calendar delivered the invite.
  app.get("/api/payments/ameria/confirmation", async (req, res) => {
    const orderId = ((req.query.orderId ?? req.query.order) || "").toString().trim();
    if (!isUuid(orderId)) return res.json({ paid: false });
    try {
      const r = await getPool().query(
        `SELECT status, client_email, slot_start_time FROM orders WHERE id=$1 LIMIT 1`,
        [orderId],
      );
      const order = r.rows[0];
      if (!order || (order.status !== "paid" && order.status !== "refunded")) {
        return res.json({ paid: false });
      }
      return res.json({
        paid: true,
        email: order.client_email,
        slotStartTime: order.slot_start_time ? new Date(order.slot_start_time).toISOString() : null,
      });
    } catch (err) {
      console.error("[ameria/confirmation] error:", err);
      return res.status(500).json({ error: "Could not load your booking." });
    }
  });

  // ── GET /api/payments/ameria/orders — admin: list recent consultation orders ─
  // Read-only listing so the owner can find order UUIDs to refund (and watch the
  // sandbox testing milestone progress) without querying Postgres directly.
  // Admin-gated via the same admin_session cookie as the refund endpoint.
  app.get("/api/payments/ameria/orders", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
    try {
      const r = await getPool().query(
        `SELECT id, ameria_order_id, status, amount, currency, client_email,
                ameria_payment_id,
                (ameria_payment_id IS NOT NULL) AS has_payment,
                slot_start_time, google_calendar_event_id,
                created_at, paid_at
           FROM orders
          WHERE product_type = 'consultation'
          ORDER BY created_at DESC
          LIMIT $1`,
        [limit],
      );
      res.json({ orders: r.rows });
    } catch (err) {
      console.error("[ameria/orders] list failed:", err);
      res.status(500).json({ error: "Could not list orders." });
    }
  });

  // ── POST /api/payments/ameria/refund — admin-only (reuse admin_session gate) ──
  app.post("/api/payments/ameria/refund", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const orderId = (req.body?.orderId ?? "").toString().trim();
    if (!isUuid(orderId)) return res.status(400).json({ error: "A valid orderId is required." });

    const pool = getPool();
    let order: any;
    try {
      const r = await pool.query(`SELECT * FROM orders WHERE id=$1 LIMIT 1`, [orderId]);
      order = r.rows[0];
    } catch (err) {
      console.error("[ameria/refund] lookup failed:", err);
      return res.status(500).json({ error: "Lookup failed." });
    }
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (!order.ameria_payment_id) return res.status(409).json({ error: "Order has no payment to refund." });
    if (order.status !== "paid") {
      return res.status(409).json({ error: `Order is '${order.status}', not 'paid' — cannot refund.` });
    }

    // Default = the gateway-captured amount (we stored the actually-charged figure
    // in order.amount, so this is correct in sandbox AND production). Admin may
    // pass a smaller `amount` for a partial refund.
    const requested = req.body?.amount;
    const amount =
      requested != null && Number.isFinite(Number(requested)) && Number(requested) > 0
        ? Number(requested)
        : Number(order.amount);

    try {
      const refund = await refundPayment(order.ameria_payment_id, amount);
      if (normalizeCode(refund.responseCode) !== "00") {
        console.error("[ameria/refund] bank declined:", refund.responseCode, refund.responseMessage);
        return res.status(502).json({
          error: "The refund was not accepted by the bank.",
          responseCode: refund.responseCode,
          responseMessage: refund.responseMessage,
        });
      }
      await pool.query(`UPDATE orders SET status='refunded' WHERE id=$1`, [order.id]);
      recordActivity(order.client_email, "consultation_refunded", {
        user_id: order.user_id,
        order_id: order.id,
        amount,
      });
      // Remove the calendar event + cancel the invites. Best-effort — the refund
      // already succeeded, so a calendar failure is logged, not surfaced as an error.
      await deleteCalendarEventForOrder(order);
      return res.json({ ok: true, orderId: order.id, amount });
    } catch (err) {
      console.error("[ameria/refund] error:", err);
      return res.status(502).json({ error: "Could not reach the bank to process the refund." });
    }
  });

  // ── POST /api/payments/ameria/cancel — admin-only (reuse admin_session gate) ──
  // Voids a CAPTURED (paid) single-stage payment via vPOS CancelPayment (full
  // void, no amount) — the same-day reversal before batch settlement, within the
  // bank's 72h void window. Distinct from RefundPayment (post-settlement; money
  // actually moves back to the card).
  //
  // Requires status='paid'. Diagnostic evidence (2026-06, scripts/sandbox-cancel-
  // test.ts): CancelPayment needs a captured amount — a 'pending' order (init'd,
  // no gateway capture) returns HTTP 500, and a gateway-touched-but-abandoned one
  // returns code 07 "Reversal impossible". On success the order goes paid →
  // cancelled.
  app.post("/api/payments/ameria/cancel", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const orderId = (req.body?.orderId ?? "").toString().trim();
    if (!isUuid(orderId)) return res.status(400).json({ error: "A valid orderId is required." });

    const pool = getPool();
    let order: any;
    try {
      const r = await pool.query(`SELECT * FROM orders WHERE id=$1 LIMIT 1`, [orderId]);
      order = r.rows[0];
    } catch (err) {
      console.error("[ameria/cancel] lookup failed:", err);
      return res.status(500).json({ error: "Lookup failed." });
    }
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (!order.ameria_payment_id) {
      return res.status(409).json({ error: "Order has no payment to cancel." });
    }
    // A 'pending' order has no captured amount to void (bank returns HTTP 500 /
    // code 07). Cancel/void only applies to a captured ('paid') payment.
    if (order.status === "pending") {
      return res.status(409).json({
        error: "Order is 'pending' — let it expire naturally or wait for status='paid'",
      });
    }
    if (order.status !== "paid") {
      return res.status(409).json({ error: `Order is '${order.status}', not 'paid' — cannot cancel.` });
    }

    try {
      const cancel = await cancelPayment(order.ameria_payment_id);
      if (normalizeCode(cancel.responseCode) !== "00") {
        console.error("[ameria/cancel] bank declined:", cancel.responseCode, cancel.responseMessage);
        return res.status(502).json({
          error: "The cancellation was not accepted by the bank.",
          responseCode: cancel.responseCode,
          responseMessage: cancel.responseMessage,
        });
      }
      await pool.query(`UPDATE orders SET status='cancelled' WHERE id=$1`, [order.id]);
      recordActivity(order.client_email, "consultation_cancelled", {
        user_id: order.user_id,
        order_id: order.id,
        amount: Number(order.amount),
      });
      // Remove the calendar event + cancel the invites (best-effort, as with refund).
      await deleteCalendarEventForOrder(order);
      return res.json({ ok: true, orderId: order.id });
    } catch (err) {
      console.error("[ameria/cancel] error:", err);
      return res.status(502).json({ error: "Could not reach the bank to process the cancellation." });
    }
  });

  // ── Dev-only helpers: exercise the success + fail paths without the bank ─────
  // Gated by NODE_ENV !== 'production'. seed-order creates a pending order;
  // force-callback drives it to paid (with email) or failed, mirroring the real
  // callback's side-effects so the end-to-end flow is verifiable locally.
  if (process.env.NODE_ENV !== "production") {
    // Seed a pending, slot-held order (first available slot unless one is given)
    // so the callback + calendar flow can be exercised without the bank.
    app.post("/api/payments/ameria/_dev/seed-order", async (req, res) => {
      const email = (req.body?.clientEmail ?? "dev@example.com").toString().trim();
      const cfg = getAmeriaConfig();
      // Prefer a real Calendly slot when configured; otherwise a fixed near-future
      // on-the-hour time so the callback/calendar flow is exercisable offline.
      let slotIso: string;
      if (req.body?.slot_start_time) {
        slotIso = new Date(req.body.slot_start_time).toISOString();
      } else if (isCalendlyConfigured()) {
        const avail = await fetchCalendlyAvailableSlots(new Date(), HORIZON_DAYS).catch(() => []);
        slotIso = avail[0] || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        d.setUTCMinutes(0, 0, 0);
        slotIso = d.toISOString();
      }
      const r = await getPool().query(
        `INSERT INTO orders (product_type, amount, currency, status, client_email, ameria_payment_id,
                             slot_start_time, slot_hold_expires_at)
         VALUES ('consultation', $1, $2, 'pending', $3, 'dev-fake-payment-id', $4,
                 NOW() + make_interval(mins => 20))
         RETURNING id, ameria_order_id`,
        [cfg.amount, cfg.mode === "sandbox" ? "AMD" : "USD", email, slotIso],
      );
      res.json({ orderId: r.rows[0].id, ameriaOrderId: r.rows[0].ameria_order_id, slotStartTime: slotIso });
    });

    app.get("/api/payments/ameria/_dev/force-callback", async (req, res) => {
      const orderId = (req.query.orderId ?? "").toString().trim();
      const result = (req.query.result ?? "success").toString().trim();
      if (!isUuid(orderId)) return res.status(400).send("orderId (uuid) required");
      const pool = getPool();
      const r = await pool.query(`SELECT * FROM orders WHERE id=$1 LIMIT 1`, [orderId]);
      const order = r.rows[0];
      if (!order) return res.status(404).send("order not found");

      if (result === "success") {
        await pool.query(`UPDATE orders SET status='paid', paid_at=now() WHERE id=$1`, [order.id]);
        recordActivity(order.client_email, "consultation_paid", {
          user_id: order.user_id,
          order_id: order.id,
          amount: Number(order.amount),
          ameria_payment_id: order.ameria_payment_id,
          slot_start_time: order.slot_start_time ? new Date(order.slot_start_time).toISOString() : null,
        });
        await createCalendarEventForOrder(order);
        try {
          await sendEmail({
            to: order.client_email,
            subject: "You're booked — your Designature Studio consultation",
            html: buildConsultationReceiptEmailHtml(order.slot_start_time ? new Date(order.slot_start_time).toISOString() : null),
          });
        } catch (err) {
          console.error("[force-callback] email failed:", err);
        }
        return res.redirect(302, `/booking/confirmed?order=${order.id}`);
      }
      await pool.query(`UPDATE orders SET status='failed' WHERE id=$1`, [order.id]);
      recordActivity(order.client_email, "consultation_failed", {
        user_id: order.user_id,
        order_id: order.id,
        response_code: "dev-forced",
      });
      return res.redirect(302, "/booking/failed");
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Google Calendar — one-time owner authorization (I-025-v2)
  // ════════════════════════════════════════════════════════════════════════
  // The studio owner grants this app offline write access to her calendar ONCE.
  // We capture the resulting refresh_token and SHOW it on screen (admin-gated) so
  // she can paste it into GOOGLE_CALENDAR_REFRESH_TOKEN (Railway prod + local
  // .env). Reuses the same GOOGLE_CLIENT_ID/SECRET as customer sign-in — the only
  // Google-Cloud change is adding the calendar.events scope + this redirect URI:
  //   ${APP_URL}/api/admin/google-calendar/callback
  const calendarSetupPage = (bodyHtml: string): string =>
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Google Calendar setup — Designature Studio</title></head>
<body style="margin:0;background:#f4f2ee;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1C1C1C;">
<div style="max-width:640px;margin:48px auto;background:#fff;border:1px solid #E7E3DB;padding:36px 40px;">
<p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0047AB;font-weight:700;margin:0 0 16px;">Designature Studio · Admin</p>
${bodyHtml}
</div></body></html>`;

  // GET /api/admin/google-calendar/authorize — kick off the consent flow.
  app.get("/api/admin/google-calendar/authorize", (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res
        .status(500)
        .type("html")
        .send(
          calendarSetupPage(
            `<h1 style="font-family:Georgia,serif;font-weight:400;">Not configured</h1><p>GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are missing from the server environment.</p>`,
          ),
        );
    }
    return res.redirect(302, buildConsentUrl());
  });

  // GET /api/admin/google-calendar/callback — Google returns here with a code.
  app.get("/api/admin/google-calendar/callback", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const err = (req.query.error ?? "").toString();
    const code = (req.query.code ?? "").toString();
    if (err) {
      return res
        .status(400)
        .type("html")
        .send(calendarSetupPage(`<h1 style="font-family:Georgia,serif;font-weight:400;">Authorization cancelled</h1><p>Google returned: <code>${err}</code>. You can close this tab and try again from <code>/api/admin/google-calendar/authorize</code>.</p>`));
    }
    if (!code) {
      return res.status(400).type("html").send(calendarSetupPage(`<h1 style="font-family:Georgia,serif;font-weight:400;">Missing code</h1><p>No authorization code was returned.</p>`));
    }
    try {
      const { refreshToken } = await exchangeCodeForTokens(code);
      if (!refreshToken) {
        return res
          .status(400)
          .type("html")
          .send(
            calendarSetupPage(
              `<h1 style="font-family:Georgia,serif;font-weight:400;">No refresh token</h1>
<p>Google didn't return a refresh token — this happens when the app was already authorized. Remove Designature Studio at
<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">myaccount.google.com/permissions</a>, then run
<code>/api/admin/google-calendar/authorize</code> again.</p>`,
            ),
          );
      }
      const redirectUri = getCalendarRedirectUri();
      return res.type("html").send(
        calendarSetupPage(
          `<h1 style="font-family:Georgia,serif;font-weight:400;margin:0 0 12px;">Calendar connected ✓</h1>
<p style="margin:0 0 16px;color:#404040;">Copy this refresh token into your environment as <code>GOOGLE_CALENDAR_REFRESH_TOKEN</code> — in Railway's Variables tab (production) and, if you're testing locally, in <code>E:/Secrets/Website/.env</code>. It's shown once.</p>
<pre style="background:#0B0F16;color:#e6edf3;padding:16px;border-radius:4px;overflow-x:auto;font-size:13px;user-select:all;">${refreshToken}</pre>
<p style="margin:16px 0 0;font-size:13px;color:#6B6B6B;">Redirect URI in use: <code>${redirectUri}</code><br>After saving it in Railway, redeploy (or restart) so the server picks it up. Then run one real booking end-to-end to confirm the calendar event + Meet link.</p>`,
        ),
      );
    } catch (e) {
      console.error("[google-calendar/callback] token exchange failed:", e);
      return res
        .status(502)
        .type("html")
        .send(calendarSetupPage(`<h1 style="font-family:Georgia,serif;font-weight:400;">Token exchange failed</h1><p>Check the server logs. Confirm the redirect URI <code>${getCalendarRedirectUri()}</code> is registered in the Google Cloud OAuth client.</p>`));
    }
  });

  // ─── Legacy WordPress redirects (GSC unindexed-pages fix, 2026-07-10) ────
  // Maps dead pre-rebuild WP URLs to their canonical modern equivalents (301)
  // and returns 410 Gone for old WP assets. MUST run before robots/sitemap and
  // the SPA fallback so legacy paths never reach the client router. See
  // server/redirects.ts + _Memory/2026-07-10-website-gsc-unindexed-fix-handoff.md.
  app.use(legacyRedirects);

  // ─── GEO / SEO: robots.txt + sitemap.xml ────────────────────────────────
  // Registered before the dev/prod SPA branch so they resolve identically in
  // both. robots.txt is generated from the single bot allowlist in
  // server/config/bots.ts (no separate static file to drift out of sync).
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(buildRobotsTxt(absUrl("/sitemap.xml")));
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const xml = await buildSitemap();
      res.type("application/xml").send(xml);
    } catch (err) {
      console.error("[seo] sitemap build failed:", err);
      res.status(500).type("text/plain").send("sitemap unavailable");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    // Vite default HMR WebSocket port 24678 often conflicts.
    // If the configured port is already taken (e.g. you ran another dev server), auto-pick a free one.
    const desiredPort = Number(process.env.VITE_HMR_PORT) || 24778;
    const isPortAvailable = (port: number) =>
      new Promise<boolean>((resolve) => {
        const srv = net.createServer();
        srv.unref();
        srv.on("error", (err: any) => {
          if (err && err.code === "EADDRINUSE") return resolve(false);
          resolve(false);
        });
        // Listen on all interfaces so we detect conflicts on IPv4/IPv6/localhost.
        srv.listen(port, () => {
          srv.close(() => resolve(true));
        });
      });

    let hmrPort = desiredPort;
    // Try up to 25 ports: desiredPort..desiredPort+24
    for (let i = 0; i < 25; i++) {
      const candidate = desiredPort + i;
      // eslint-disable-next-line no-await-in-loop
      if (await isPortAvailable(candidate)) {
        hmrPort = candidate;
        break;
      }
    }
    if (hmrPort !== desiredPort) {
      console.warn(`HMR port ${desiredPort} was busy; using ${hmrPort} instead.`);
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Force IPv4 loopback to avoid Windows localhost (IPv6) port collisions.
        hmr: { port: hmrPort, clientPort: hmrPort, host: "127.0.0.1" },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // `index: false` so a request for "/" is NOT short-circuited to the raw
    // dist/index.html by the static handler — it must fall through to the SEO
    // renderer below. Static still serves hashed JS/CSS, favicon, etc.
    app.use(express.static("dist", { index: false }));
    // Read the built shell once at startup so per-request injection is cheap.
    try {
      loadTemplate();
    } catch (err) {
      console.error("[seo] could not preload dist/index.html:", err);
    }
    // SPA catch-all: serve the SAME HTML to bots and humans, enriched per route
    // with <title>, meta description, canonical, OG/Twitter, and JSON-LD. The
    // SPA still boots and takes over on mount.
    app.get("*all", async (req, res) => {
      try {
        const html = await renderRoute(req.path);
        res.status(200).type("html").send(html);
      } catch (err) {
        console.error("[seo] route render failed, serving raw shell:", err);
        res.sendFile("dist/index.html", { root: "." });
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`✅ Shopping quota protection: ACTIVE (owner = ${CONCEPT_TEST_ACCOUNT_EMAIL})`);
  });
}

startServer();