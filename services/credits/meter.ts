/**
 * The metering seam between a tool endpoint and the credit ledger.
 *
 * ── Why this is behind a flag ─────────────────────────────────────────────────────────
 * The tier system stores quota on the user record (`generationsLeft` / `shoppingListsLeft`
 * in app_state); the credit model stores it in Postgres. Every existing user therefore has
 * tier quota and NO credit balance. A hard cutover would lock all of them out at once.
 *
 * So `creditsEnabled()` (env, default OFF) decides which system meters a run:
 *   off — `meterSpend` returns null and the caller keeps its existing tier logic untouched
 *   on  — the ledger meters the run, and a user with no balance row is lazily granted the
 *         free tier's credits so nobody arrives at a locked door
 *
 * That lets the whole credit path be exercised on localhost against the real database
 * while production keeps running the tier logic until the switch is deliberately thrown.
 *
 * ── The invariant ─────────────────────────────────────────────────────────────────────
 * Callers MUST follow spend-before-provider / refund-on-failure:
 *
 *     const receipt = await meterSpend(userId, 'redesign');
 *     try   { ...provider call... }
 *     catch { await meterRefund(receipt); throw; }
 *
 * `meterRefund` accepts null, so the call site reads the same whether the flag is on or off.
 */

import {
  spendCredits,
  refundCredits,
  grantCredits,
  getBalance,
  InsufficientCreditsError,
  type SpendReceipt,
  type CreditBalance,
} from './ledger.js';
import { creditsFor, planById } from '../../src/data/creditPricing.js';

/**
 * Off unless explicitly enabled — production keeps the tier path until the switch is thrown.
 *
 * A FUNCTION, not a const: `server.ts` imports this module at the top of the file but calls
 * `dotenv.config()` further down, and ESM evaluates every import before any module-body
 * statement. A module-level const would therefore latch `false` before the .env is loaded —
 * the same ordering trap that forced `getPool()` to be lazy.
 */
export function creditsEnabled(): boolean {
  return process.env.CREDITS_ENABLED === 'true';
}

/** The free tier's one-time grant (50). Read from the model so the page and the DB agree. */
export const FREE_GRANT_CREDITS = planById('free')!.credits;

export { InsufficientCreditsError };

/**
 * Give a user their free credits the first time we see them, once.
 *
 * Idempotent by the ledger row's existence, not by a flag on the user — so it cannot
 * re-grant after a spend, which is exactly the refill hole the free-tier lockdown closed.
 * A user who has spent down to 0 has a row, so they get nothing more.
 */
export async function ensureSignupGrant(userId: string): Promise<CreditBalance> {
  const balance = await getBalance(userId);
  if (balance.total > 0) return balance;

  const { rows } = await import('../../db/pgPool.js').then((m) =>
    m.getPool().query(`SELECT 1 FROM credit_balances WHERE user_id = $1`, [userId]),
  );
  if (rows.length) return balance; // row exists, legitimately spent to zero — no re-grant

  return grantCredits(userId, FREE_GRANT_CREDITS, 'signup_grant');
}

/**
 * Debit one run of `toolId`, or return null when credits are not the active meter.
 *
 * Throws `InsufficientCreditsError` when the balance will not cover it — the caller should
 * translate that to HTTP 402 and must NOT fall through to the provider.
 */
export async function meterSpend(
  userId: string,
  toolId: string,
  opts: { ref?: string; unlimited?: boolean } = {},
): Promise<SpendReceipt | null> {
  if (!creditsEnabled()) return null;
  if (opts.unlimited) return null; // owner / unlimited accounts are never metered
  if (creditsFor(toolId) === 0) return null; // free tools never touch the ledger

  await ensureSignupGrant(userId);
  return spendCredits(userId, toolId, { ref: opts.ref });
}

/** Give back exactly what a spend took. No-ops on null so call sites stay uniform. */
export async function meterRefund(receipt: SpendReceipt | null): Promise<void> {
  if (!receipt) return;
  try {
    await refundCredits(receipt);
  } catch (err) {
    // A failed refund must never mask the provider error the caller is handling.
    console.error('[credits] refund failed for', receipt.userId, receipt.toolId, err);
  }
}

/** Balance for `/account` and the studio header. Zeroed when credits are not active. */
export async function meterBalance(userId: string): Promise<CreditBalance | null> {
  if (!creditsEnabled()) return null;
  return getBalance(userId);
}
