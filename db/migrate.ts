/**
 * Payments — idempotent schema migration (I-024 / B0).
 *
 * Runs at server boot. Every statement is CREATE ... IF NOT EXISTS, so it is
 * safe to run on every start (no versioning table needed at this scale). The
 * payment + billing rails build on these three foundation tables:
 *   - `orders`        — Rail B (Ameriabank VPOS $99 consultation, guest checkout)
 *   - `subscriptions` — Rail A (Lemon Squeezy AI Studio subscriptions)
 *   - `usage_events`  — plan gating / on-read quota counting (consumed by Rail A
 *                       A1 task 8, but a foundation concern so it lives here)
 */
import { getPool } from "./pgPool.js";

const ORDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS orders (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           text,                                  -- nullable: guest checkout
    product_type      text        NOT NULL DEFAULT 'consultation',
    amount            numeric     NOT NULL,
    currency          text        NOT NULL DEFAULT 'USD',
    status            text        NOT NULL DEFAULT 'pending',
    ameria_payment_id text,                                  -- UUID returned by InitPayment
    ameria_order_id   bigserial   NOT NULL UNIQUE,           -- INTEGER sent to Ameria as OrderID
    booking_slot      text,
    client_email      text        NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    paid_at           timestamptz
  );
`;

// NOTE: "interval" is a reserved SQL word — it MUST stay double-quoted in every
// statement that references this column (here and in the Rail A / A1 queries).
const SUBSCRIPTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id                            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                       text        NOT NULL,        -- googleId from users.json
    lemonsqueezy_subscription_id  text        NOT NULL UNIQUE,
    lemonsqueezy_customer_id      text        NOT NULL,
    lemonsqueezy_variant_id       text        NOT NULL,        -- maps to tier + interval
    tier                          text        NOT NULL,        -- 'design' | 'studio'
    "interval"                    text        NOT NULL,        -- 'monthly' | 'annual'
    status                        text        NOT NULL,        -- active | paused | cancelled | expired
    current_period_start          timestamptz NOT NULL,
    current_period_end            timestamptz NOT NULL,
    created_at                    timestamptz NOT NULL DEFAULT now(),
    updated_at                    timestamptz NOT NULL DEFAULT now()
  );
`;

const SUBSCRIPTIONS_USER_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
`;

const USAGE_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS usage_events (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     text        NOT NULL,
    feature     text        NOT NULL,   -- 'generation' | 'audit' | 'shopping'
    created_at  timestamptz NOT NULL DEFAULT now()
  );
`;

// ── Book-first consultation (I-025-v2) — orders columns + slot uniqueness ──────
// The consultation flow changed from pay-first (private Calendly link emailed
// post-payment) to BOOK-first (customer picks a slot, we hold it 20min, then
// pay; on success Google Calendar creates the event + Meet link). That needs
// three new columns on `orders` and a partial unique index that guarantees no
// two live (pending/paid) orders claim the same slot start. All idempotent.
const ORDERS_BOOKFIRST_COLUMNS = `
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS slot_start_time          timestamptz;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS slot_hold_expires_at     timestamptz;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS google_calendar_event_id text;
`;

// Partial unique index: at most one live (pending OR paid) order per slot start.
// Concurrent holds on the same slot → the second INSERT fails with 23505, which
// the /hold route maps to a clean 409 "just taken, pick another". (Overlap
// between DIFFERENT half-hour starts is prevented separately by an advisory-lock
// overlap check in the hold route — this index is the exact-match backstop.)
const ORDERS_SLOT_UNIQUE_INDEX = `
  CREATE UNIQUE INDEX IF NOT EXISTS orders_slot_start_unique
    ON orders (slot_start_time)
    WHERE status IN ('pending', 'paid');
`;

// booking_slot was a pay-first-era placeholder that was never populated. The
// book-first flow stores the real slot in slot_start_time, so drop the dead col.
const ORDERS_DROP_BOOKING_SLOT = `
  ALTER TABLE orders DROP COLUMN IF EXISTS booking_slot;
`;

// Composite index for the on-read quota lookup: count a user's events in the
// current billing period (WHERE user_id = $1 AND created_at >= period_start).
const USAGE_EVENTS_USER_TIME_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
    ON usage_events (user_id, created_at);
`;

// Journal comments (Phase 2 — own, moderated). Public submissions land as
// 'pending' and only surface once an admin approves them. 'rejected' is kept
// (not deleted) so a spammer can't resubmit into a fresh row unnoticed.
const BLOG_COMMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS blog_comments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    post_slug   text        NOT NULL,
    author_name text        NOT NULL,
    body        text        NOT NULL,
    status      text        NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
    created_at  timestamptz NOT NULL DEFAULT now()
  );
`;

// Public read path filters by (post_slug, status='approved'); moderation lists by status.
const BLOG_COMMENTS_SLUG_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_blog_comments_slug_status
    ON blog_comments (post_slug, status);
`;

// Durable app state (admin durability fix, 2026-07-09). The server historically
// kept users + activityLog + apiCounters + serperUsage in a flat `users.json`
// file. On Railway that file lives on the container's EPHEMERAL disk, so every
// redeploy wiped it → /admin reset to 0 and prod never matched the Google Sheet.
// This table is the durable home: one JSONB blob per environment row (id='main'
// for prod, 'dev' for local — they share one Railway Postgres). The server keeps
// the object in memory and write-throughs to this row on every writeDB().
const APP_STATE_TABLE = `
  CREATE TABLE IF NOT EXISTS app_state (
    id         text        PRIMARY KEY,
    data       jsonb       NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`;

// AC-001/AC-002 — the user's saved Library. Every generated output a user chooses
// to keep (AI Vision concept, Shopping list, Room Audit, Style Quiz result) becomes
// one row. Images are uploaded to Cloudinary first, so `full_url`/`thumbnail_url`
// are durable links; list-type outputs (shopping) carry their data in `metadata`.
// Keyed by googleId (user_id) to match users.json; `user_email` is denormalized
// for admin/debug visibility.
const SAVED_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS saved_items (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       text        NOT NULL,                         -- googleId
    user_email    text,
    tool          text        NOT NULL,   -- 'ai_vision' | 'shopping' | 'room_audit' | 'style_quiz' | 'design_brief' | 'cultural'
    title         text        NOT NULL,
    thumbnail_url text,
    full_url      text,                                         -- Cloudinary secure_url for image outputs
    metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,     -- shopping items, style DNA, audit scores, etc.
    created_at    timestamptz NOT NULL DEFAULT now()
  );
`;

// Library reads are always "this user's items, newest first" (optionally filtered by tool).
const SAVED_ITEMS_USER_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_saved_items_user_created
    ON saved_items (user_id, created_at DESC);
`;

// Expiring shareable links: a random token minted on demand + an expiry. The public
// /shared/:token viewer resolves items by token and rejects expired ones.
const SAVED_ITEMS_SHARE_COLUMNS = `
  ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS share_token      text;
  ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;
`;
const SAVED_ITEMS_SHARE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_saved_items_share_token ON saved_items (share_token);
`;

// Dedup: a content fingerprint so the same generated output can't be saved twice
// by the same user (idempotent Save). Partial-unique on (user_id, content_hash).
const SAVED_ITEMS_HASH_COLUMN = `
  ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS content_hash text;
`;
const SAVED_ITEMS_HASH_INDEX = `
  CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_items_user_hash
    ON saved_items (user_id, content_hash)
    WHERE content_hash IS NOT NULL;
`;

/**
 * Create the payments tables if they don't exist. Logs a "ready" line per table.
 * Throws if the DB is unreachable — the caller (server boot) decides whether to
 * hard-fail or continue degraded.
 */

// ─── AI-038 · Designer Check ────────────────────────────────────────────────
// A written review of ONE artifact, requested at a join between two cards.
// v1 is notes, not a call (owner decision 2026-08-30) — so there is no slot,
// no calendar, and nothing here models a meeting. What the designer returns is
// a verdict plus a short note, and that note is the deliverable.
const REVIEW_REQUESTS_TABLE = `
  CREATE TABLE IF NOT EXISTS review_requests (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        text        NOT NULL,                      -- googleId
    user_email     text,
    item_id        uuid        REFERENCES saved_items(id) ON DELETE CASCADE,
    tool           text        NOT NULL,   -- the card the artifact came from
    next_tool      text,                   -- the card they are heading to (the join)
    scenario       text,                   -- studioRouter scenario id, when they have one
    ask            text,                   -- what the visitor wants looked at
    status         text        NOT NULL DEFAULT 'requested',  -- requested | in_review | answered
    assignee       text,                   -- present from day one so this is delegable
    verdict        text,                   -- go | fix | wont_work
    note           text,                   -- the deliverable
    created_at     timestamptz NOT NULL DEFAULT now(),
    answered_at    timestamptz
  );
`;

// The visitor's own checks, newest first.
const REVIEW_REQUESTS_USER_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_review_requests_user_created
    ON review_requests (user_id, created_at DESC);
`;

// The studio queue: oldest-waiting first, so nothing rots at the bottom.
const REVIEW_REQUESTS_QUEUE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_review_requests_status_created
    ON review_requests (status, created_at ASC);
`;

// One OPEN check per artifact. Re-requesting the same item while one is already
// waiting is almost always a double-click, and each request costs a real person
// real time. Answered ones are excluded, so a second opinion later is still fine.
const REVIEW_REQUESTS_ONE_OPEN = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_review_requests_one_open
    ON review_requests (item_id)
    WHERE status <> 'answered' AND item_id IS NOT NULL;
`;

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  // gen_random_uuid() is core since Postgres 13, but enable pgcrypto defensively
  // so older targets work too. Idempotent and a no-op where it's already core.
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

  await pool.query(ORDERS_TABLE);
  console.log("✅ orders table ready");

  await pool.query(SUBSCRIPTIONS_TABLE);
  await pool.query(SUBSCRIPTIONS_USER_INDEX);
  console.log("✅ subscriptions table ready");

  await pool.query(USAGE_EVENTS_TABLE);
  await pool.query(USAGE_EVENTS_USER_TIME_INDEX);
  console.log("✅ usage_events table ready");

  // Book-first consultation additions (I-025-v2). Multi-statement strings are
  // fine — node-postgres runs them as a simple query batch.
  await pool.query(ORDERS_BOOKFIRST_COLUMNS);
  await pool.query(ORDERS_SLOT_UNIQUE_INDEX);
  await pool.query(ORDERS_DROP_BOOKING_SLOT);
  console.log("✅ orders book-first columns + slot unique index ready");

  await pool.query(BLOG_COMMENTS_TABLE);
  await pool.query(BLOG_COMMENTS_SLUG_INDEX);
  console.log("✅ blog_comments table ready");

  await pool.query(APP_STATE_TABLE);
  console.log("✅ app_state table ready");

  await pool.query(SAVED_ITEMS_TABLE);
  await pool.query(SAVED_ITEMS_USER_INDEX);
  await pool.query(SAVED_ITEMS_SHARE_COLUMNS);
  await pool.query(SAVED_ITEMS_SHARE_INDEX);
  await pool.query(SAVED_ITEMS_HASH_COLUMN);
  await pool.query(SAVED_ITEMS_HASH_INDEX);
  console.log("✅ saved_items table ready");

  await pool.query(REVIEW_REQUESTS_TABLE);
  await pool.query(REVIEW_REQUESTS_USER_INDEX);
  await pool.query(REVIEW_REQUESTS_QUEUE_INDEX);
  await pool.query(REVIEW_REQUESTS_ONE_OPEN);
  console.log("✅ review_requests table ready");
}
