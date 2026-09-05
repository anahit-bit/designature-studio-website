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

// Subscriptions — Rail A, rebuilt on Ameriabank vPOS card BINDINGS (the Lemon
// Squeezy / Merchant-of-Record path was rejected and is obsolete; see
// _Plan\Website\Website-Subscriptions-Plan.md). One row per subscriber. The
// billing engine charges the bound card each period via MakeBindingPayment.
//
// NOTE: "interval" is a reserved SQL word — it MUST stay double-quoted in every
// statement that references this column.
//
// Grandfathering: `amount_usd` is LOCKED at signup and is what the scheduler
// charges — NEVER the live Sanity price (raising Sanity's price must not silently
// re-price existing subscribers).
const SUBSCRIPTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               text        NOT NULL,        -- googleId from users.json
    tier                  text        NOT NULL,        -- 'design' | 'studio'
    "interval"            text        NOT NULL,        -- 'monthly' | 'annual'
    amount_usd            numeric     NOT NULL,        -- LOCKED at signup (grandfathering)
    status                text        NOT NULL,        -- pending | active | past_due | cancelled | expired
    card_holder_id        text        NOT NULL,        -- the per-user binding id WE generate + reuse
    binding_id            text,                        -- the bank's per-card binding id (reference)
    binding_card_pan      text,                        -- masked PAN, for the "update card" prompt
    binding_exp_date      text,                        -- card expiry (MMYY), for proactive warnings
    current_period_start  timestamptz NOT NULL,
    current_period_end    timestamptz NOT NULL,        -- = the next charge date
    cancel_at_period_end  boolean     NOT NULL DEFAULT false,
    cancelled_at          timestamptz,
    pending_change        jsonb,                       -- scheduled downgrade: {tier, interval, amount_usd}
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
  );
`;

// Migrate an EXISTING (B0-era, Lemon-Squeezy-shaped) subscriptions table to the
// binding shape. The table has never held a real subscription (Rail A never
// shipped), so this is safe: add the binding columns, drop the LS columns. All
// idempotent. On a fresh DB the CREATE above already has the right shape and
// these ALTERs are effectively no-ops.
const SUBSCRIPTIONS_MIGRATE_TO_BINDING = `
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_usd           numeric;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS card_holder_id       text;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS binding_id           text;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS binding_card_pan     text;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS binding_exp_date     text;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at         timestamptz;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pending_change       jsonb;
  ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemonsqueezy_subscription_id;
  ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemonsqueezy_customer_id;
  ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemonsqueezy_variant_id;
`;

const SUBSCRIPTIONS_USER_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
`;

// Active-subscription lookup for the renewal scheduler (find rows due to charge).
const SUBSCRIPTIONS_DUE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status_period_end
    ON subscriptions (status, current_period_end);
`;

// One row per charge ATTEMPT — the invoice/receipt source AND the idempotency +
// dunning ledger. `ameria_order_id` is the integer OrderID we send the bank
// (bigserial, its own sequence). `kind` distinguishes the first charge, renewals,
// mid-cycle prorations, and refunds. Never delete rows — history is the audit trail.
const SUBSCRIPTION_PAYMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS subscription_payments (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id   uuid        NOT NULL REFERENCES subscriptions(id),
    user_id           text        NOT NULL,
    ameria_order_id   bigserial   NOT NULL UNIQUE,     -- integer OrderID sent to the bank
    ameria_payment_id text,                            -- PaymentID returned by the bank
    kind              text        NOT NULL,            -- 'initial'|'renewal'|'proration'|'refund'
    amount_usd        numeric     NOT NULL,
    status            text        NOT NULL DEFAULT 'pending',  -- pending|paid|failed|refunded
    response_code     text,                            -- bank RC, for diagnostics
    attempt           integer     NOT NULL DEFAULT 1,  -- dunning attempt number
    created_at        timestamptz NOT NULL DEFAULT now(),
    paid_at           timestamptz
  );
`;

// NOTE (sandbox testing, S3): like orders.ameria_order_id, in the sandbox the
// OrderID must fall in 4423001..4424000. When binding charges are testable, the
// dev DB's `subscription_payments_ameria_order_id_seq` will need a one-off
// restart into a non-overlapping slice of that range (orders uses the low end).

const SUBSCRIPTION_PAYMENTS_SUB_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription
    ON subscription_payments (subscription_id, created_at);
`;

// Dunning queue: find the failed/pending charges that need a retry.
const SUBSCRIPTION_PAYMENTS_STATUS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subscription_payments_status
    ON subscription_payments (status);
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
// ── Credit model (2026-09-05) ────────────────────────────────────────────────
// Replaces the tier quotas (users.generationsLeft / shoppingListsLeft) with one
// server-authoritative credit ledger. TWO BUCKETS, because the model needs both
// "monthly credits do not roll over" and "pack credits never expire" — a single
// balance cannot express that. Spend order is monthly-first (burn the expiring
// ones before the permanent ones), which is the only order that does not quietly
// destroy value the customer paid for.
const CREDIT_BALANCES_TABLE = `
  CREATE TABLE IF NOT EXISTS credit_balances (
    user_id           text        PRIMARY KEY,
    monthly_credits   integer     NOT NULL DEFAULT 0,   -- reset each billing cycle
    permanent_credits integer     NOT NULL DEFAULT 0,   -- free grant + packs, never expire
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT credit_balances_non_negative
      CHECK (monthly_credits >= 0 AND permanent_credits >= 0)
  );
`;

// Append-only audit trail. Every grant, spend and refund writes a row — this is
// both the ledger's proof and the metering data I-032 needs to validate prices.
const CREDIT_TRANSACTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS credit_transactions (
    id             bigserial   PRIMARY KEY,
    user_id        text        NOT NULL,
    delta          integer     NOT NULL,          -- negative = spend
    bucket         text        NOT NULL,          -- 'monthly' | 'permanent' | 'split'
    reason         text        NOT NULL,          -- signup_grant|pack_purchase|sub_refill|spend|refund|admin_adjust
    tool           text,                          -- explorerRoster id, for spend/refund
    ref            text,                          -- credit_purchases.id | subscriptions.id | payment id
    balance_after  integer     NOT NULL,          -- monthly+permanent after this row
    created_at     timestamptz NOT NULL DEFAULT now()
  );
`;

const CREDIT_TRANSACTIONS_USER_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_time
    ON credit_transactions (user_id, created_at DESC);
`;

// ⚠️ OrderID collision fix. `orders` and `subscription_payments` each own a
// SEPARATE bigserial, both starting at 1 — so the two streams hand the bank the
// same integer OrderID, which Ameria requires to be unique per merchant. One
// shared sequence fixes it for all three streams. Bumped past the current max of
// both existing sequences so it can never collide with a row already sent.
const AMERIA_ORDER_ID_SEQUENCE = `
  CREATE SEQUENCE IF NOT EXISTS ameria_order_id_seq AS bigint START 1;
  SELECT setval(
    'ameria_order_id_seq',
    GREATEST(
      (SELECT COALESCE(MAX(ameria_order_id), 0) FROM orders),
      (SELECT COALESCE(MAX(ameria_order_id), 0) FROM subscription_payments),
      (SELECT last_value FROM ameria_order_id_seq)
    ) + 1000
  );
`;

// Point the existing streams at the shared sequence. Only affects NEW inserts —
// existing rows keep the ids already sent to the bank.
const AMERIA_ORDER_ID_ADOPT = `
  ALTER TABLE orders               ALTER COLUMN ameria_order_id SET DEFAULT nextval('ameria_order_id_seq');
  ALTER TABLE subscription_payments ALTER COLUMN ameria_order_id SET DEFAULT nextval('ameria_order_id_seq');
`;

// One-time credit packs. Mirrors `orders` (the proven $99 consultation shape)
// but grants credits instead of booking a slot. No card binding — a pack is a
// single charge, which is why it is the one paid product billable today.
const CREDIT_PURCHASES_TABLE = `
  CREATE TABLE IF NOT EXISTS credit_purchases (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           text        NOT NULL,
    pack_id           text        NOT NULL,      -- 'starter' | 'project' | 'project-plus'
    credits           integer     NOT NULL,
    amount_usd        numeric     NOT NULL,
    ameria_order_id   bigint      NOT NULL UNIQUE DEFAULT nextval('ameria_order_id_seq'),
    ameria_payment_id text,
    status            text        NOT NULL DEFAULT 'pending',  -- pending|paid|failed|refunded
    client_email      text,
    failure_reason    text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    paid_at           timestamptz
  );
`;

const CREDIT_PURCHASES_USER_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_time
    ON credit_purchases (user_id, created_at DESC);
`;

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  // gen_random_uuid() is core since Postgres 13, but enable pgcrypto defensively
  // so older targets work too. Idempotent and a no-op where it's already core.
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

  await pool.query(ORDERS_TABLE);
  console.log("✅ orders table ready");

  await pool.query(SUBSCRIPTIONS_TABLE);
  await pool.query(SUBSCRIPTIONS_MIGRATE_TO_BINDING);
  await pool.query(SUBSCRIPTIONS_USER_INDEX);
  await pool.query(SUBSCRIPTIONS_DUE_INDEX);
  console.log("✅ subscriptions table ready (binding shape)");

  await pool.query(SUBSCRIPTION_PAYMENTS_TABLE);
  await pool.query(SUBSCRIPTION_PAYMENTS_SUB_INDEX);
  await pool.query(SUBSCRIPTION_PAYMENTS_STATUS_INDEX);
  console.log("✅ subscription_payments table ready");

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

  // Credit model. The shared OrderID sequence must exist BEFORE credit_purchases,
  // whose default calls nextval() on it.
  await pool.query(CREDIT_BALANCES_TABLE);
  await pool.query(CREDIT_TRANSACTIONS_TABLE);
  await pool.query(CREDIT_TRANSACTIONS_USER_INDEX);
  console.log("✅ credit ledger tables ready");

  await pool.query(AMERIA_ORDER_ID_SEQUENCE);
  await pool.query(AMERIA_ORDER_ID_ADOPT);
  await pool.query(CREDIT_PURCHASES_TABLE);
  await pool.query(CREDIT_PURCHASES_USER_INDEX);
  console.log("✅ credit purchases + shared Ameria OrderID sequence ready");
}
