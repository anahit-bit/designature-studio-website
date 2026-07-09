/**
 * Durable app-state persistence (admin durability fix, 2026-07-09).
 *
 * The server keeps its "database" (users + activityLog + apiCounters +
 * serperUsage/serperLog) as one in-memory object and write-throughs it to a
 * single JSONB row in Postgres. This replaces the old flat `users.json` file,
 * which lived on Railway's ephemeral container disk and was wiped on every
 * redeploy — the root cause of /admin resetting to 0 and never matching the
 * Google Sheet.
 *
 * One row per environment (`id` = 'main' for prod, 'dev' for local) because dev
 * and prod share a single Railway Postgres instance. See `app_state` in
 * db/migrate.ts. Keep these functions dumb: server.ts owns the caching,
 * coalescing, and fallback logic.
 */
import { getPool } from "./pgPool.js";

/** Read the stored state blob for an environment row. Returns null if absent. */
export async function loadState(id: string): Promise<Record<string, unknown> | null> {
  const r = await getPool().query(`SELECT data FROM app_state WHERE id = $1`, [id]);
  return (r.rows[0]?.data as Record<string, unknown>) ?? null;
}

/** Upsert the whole state blob for an environment row. */
export async function saveState(id: string, data: unknown): Promise<void> {
  await getPool().query(
    `INSERT INTO app_state (id, data, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [id, JSON.stringify(data)],
  );
}
