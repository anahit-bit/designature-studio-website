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

/**
 * Create the payments tables if they don't exist. Logs a "ready" line per table.
 * Throws if the DB is unreachable — the caller (server boot) decides whether to
 * hard-fail or continue degraded.
 */
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

  await pool.query(BLOG_COMMENTS_TABLE);
  await pool.query(BLOG_COMMENTS_SLUG_INDEX);
  console.log("✅ blog_comments table ready");
}
