/**
 * Payments — shared Postgres connection pool (I-024 / B0).
 *
 * A single node-postgres Pool built from DATABASE_URL (Railway Postgres). This
 * is the ONE pool both payment rails share — Ameriabank `orders` (Rail B) and
 * Lemon Squeezy `subscriptions` (Rail A). Deliberately minimal, NO ORM, to match
 * the project's lightweight style (server.ts uses raw helpers, not frameworks).
 *
 * It lives ALONGSIDE the existing users.json store (readDB/writeDB) — it does not
 * replace it. Only payments/billing data goes here.
 *
 * IMPORTANT — lazy construction: the pool is built on first `getPool()` call,
 * NOT at import time. ESM evaluates imported modules BEFORE a module's top-level
 * statements, and server.ts loads env via a top-level `dotenv.config()`. Reading
 * DATABASE_URL at import time would therefore see it undefined. `getPool()` reads
 * env on first use, by which point dotenv has run. Always call `getPool()`; never
 * cache the pool across an env change.
 */
import pg from "pg";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

function buildPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Don't crash — payments routes will fail loudly on first query, but the
    // rest of the server (AI tools, auth, admin) must still boot in dev when a
    // developer hasn't set up Postgres.
    console.warn(
      "[db] DATABASE_URL is not set — the Postgres pool will fail on first query. " +
        "Payments features need it (see E:/Secrets/Website/.env).",
    );
  }

  // Railway's managed Postgres presents a cert that node-postgres won't validate
  // against the system CA store, so we relax verification (encrypted transport,
  // no chain validation) when the connection string points at Railway. A plain
  // local Postgres (no SSL) gets `ssl: undefined` and connects in the clear.
  const usesRailwaySsl =
    !!connectionString &&
    /\brailway\b|\.rlwy\.net\b|sslmode=require/i.test(connectionString);

  const pool = new Pool({
    connectionString,
    ssl: usesRailwaySsl ? { rejectUnauthorized: false } : undefined,
  });

  // A pooled client can be terminated by the DB out from under us (idle timeout,
  // server restart, network blip). Log and let the pool recover on next acquire
  // rather than letting an unhandled 'error' event crash the process.
  pool.on("error", (err) => {
    console.error("[db] unexpected idle client error:", err.message);
  });

  return pool;
}

/**
 * The shared payments pool, constructed lazily on first call (see the module
 * doc-comment for why). Subsequent calls return the same instance.
 */
export function getPool(): pg.Pool {
  if (!_pool) _pool = buildPool();
  return _pool;
}
