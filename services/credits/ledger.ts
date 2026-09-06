/**
 * The credit ledger — server-authoritative balance for the credit pricing model.
 *
 * Replaces the tier quotas (`users.generationsLeft` / `shoppingListsLeft`). Two buckets,
 * because the model needs both "monthly credits do not roll over" and "pack credits never
 * expire", which one balance cannot express:
 *
 *   monthly    — granted by a subscription renewal, reset (not added) each cycle
 *   permanent  — the free signup grant + purchased packs, never expires
 *
 * **Spend order is monthly-first.** Burning the expiring bucket before the permanent one
 * is the only order that does not quietly destroy value the customer paid for.
 *
 * ── The invariant this file exists to protect ──────────────────────────────────────────
 * Carried over from the free-tier lockdown (PR #62): the ONLY way a balance goes UP
 * outside a grant is the server-authoritative failure path. A tool endpoint must
 * `spend()` BEFORE calling the provider and, if the provider fails, `refund()` the
 * receipt it was given. Because a receipt records exactly which buckets were debited,
 * a refund can never return more than was taken — it is bounded by construction, not
 * by a range check that someone can get wrong later.
 *
 * There is deliberately NO client-callable mutation path. Every export here is
 * server-side and takes a userId the caller has already authenticated.
 */

import { getPool } from '../../db/pgPool.js';
import { creditsFor } from '../../src/data/creditPricing.js';

export interface CreditBalance {
  monthly: number;
  permanent: number;
  total: number;
}

/**
 * Proof of exactly what a spend debited. Hand this back to `refundCredits` to undo it.
 * Splitting the two buckets matters: a spend that took 6 monthly + 4 permanent must
 * refund to the same buckets, or the customer silently loses expiring-vs-permanent value.
 */
export interface SpendReceipt {
  userId: string;
  toolId: string;
  fromMonthly: number;
  fromPermanent: number;
  total: number;
  transactionId: string;
}

export type GrantReason = 'signup_grant' | 'pack_purchase' | 'sub_refill' | 'admin_adjust';

export class InsufficientCreditsError extends Error {
  constructor(readonly required: number, readonly available: number) {
    super(`Insufficient credits: need ${required}, have ${available}`);
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * How a spend splits across the two buckets — PURE, so the rule that actually protects
 * customer value (monthly-first) is unit-tested without a database, matching how
 * `services/subscriptions/billing.ts` is tested.
 *
 * Monthly-first is not an optimisation: monthly credits expire at the next billing date
 * and permanent ones never do, so spending permanent first would silently destroy credits
 * the customer paid for.
 */
export function planSpend(
  monthly: number,
  permanent: number,
  cost: number,
): { fromMonthly: number; fromPermanent: number } {
  if (cost < 0) throw new Error(`planSpend: cost must not be negative, got ${cost}`);
  if (monthly + permanent < cost) throw new InsufficientCreditsError(cost, monthly + permanent);
  const fromMonthly = Math.min(monthly, cost);
  return { fromMonthly, fromPermanent: cost - fromMonthly };
}

/** Which bucket label an audit row gets, given what a spend or refund touched. */
export function bucketLabel(fromMonthly: number, fromPermanent: number): 'monthly' | 'permanent' | 'split' {
  if (fromMonthly > 0 && fromPermanent > 0) return 'split';
  return fromMonthly > 0 ? 'monthly' : 'permanent';
}

const EMPTY: CreditBalance = { monthly: 0, permanent: 0, total: 0 };

/** Current balance. Absent row = a user who has never been granted anything. */
export async function getBalance(userId: string): Promise<CreditBalance> {
  const { rows } = await getPool().query(
    `SELECT monthly_credits, permanent_credits FROM credit_balances WHERE user_id = $1`,
    [userId],
  );
  if (!rows.length) return { ...EMPTY };
  const monthly = Number(rows[0].monthly_credits);
  const permanent = Number(rows[0].permanent_credits);
  return { monthly, permanent, total: monthly + permanent };
}

/**
 * Add credits to a bucket and write the audit row, atomically.
 *
 * `sub_refill` REPLACES the monthly bucket rather than adding to it — that is what
 * "credits refill each billing date and do not roll over" means. Every other reason adds.
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: GrantReason,
  opts: { ref?: string; bucket?: 'monthly' | 'permanent' } = {},
): Promise<CreditBalance> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`grantCredits: amount must be a positive integer, got ${amount}`);
  }
  const bucket = opts.bucket ?? (reason === 'sub_refill' ? 'monthly' : 'permanent');
  const replaces = reason === 'sub_refill' && bucket === 'monthly';

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO credit_balances (user_id, monthly_credits, permanent_credits)
         VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         monthly_credits = ${
           replaces ? '$2' : bucket === 'monthly' ? 'credit_balances.monthly_credits + $2' : 'credit_balances.monthly_credits'
         },
         permanent_credits = ${
           bucket === 'permanent' ? 'credit_balances.permanent_credits + $3' : 'credit_balances.permanent_credits'
         },
         updated_at = now()
       RETURNING monthly_credits, permanent_credits`,
      [userId, bucket === 'monthly' ? amount : 0, bucket === 'permanent' ? amount : 0],
    );

    const monthly = Number(rows[0].monthly_credits);
    const permanent = Number(rows[0].permanent_credits);

    await client.query(
      `INSERT INTO credit_transactions (user_id, delta, bucket, reason, ref, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, amount, bucket, reason, opts.ref ?? null, monthly + permanent],
    );

    await client.query('COMMIT');
    return { monthly, permanent, total: monthly + permanent };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Admin clawback: remove up to `amount` credits from the PERMANENT bucket — the
 * counterpart to refunding a one-time pack's money. Row-locked and floored at zero:
 * if the buyer already spent some of the pack, we reclaim only what remains (the
 * money refund still stands; the shortfall is the admin's discretion). Writes one
 * negative `admin_adjust` audit row. Returns how many were actually removed.
 */
export async function clawbackCredits(
  userId: string,
  amount: number,
  opts: { ref?: string } = {},
): Promise<{ removed: number; balance: CreditBalance }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`clawbackCredits: amount must be a positive integer, got ${amount}`);
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT monthly_credits, permanent_credits FROM credit_balances
        WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    const monthly = rows.length ? Number(rows[0].monthly_credits) : 0;
    const permanent = rows.length ? Number(rows[0].permanent_credits) : 0;
    const removed = Math.min(amount, permanent);
    if (removed === 0) {
      await client.query('COMMIT');
      return { removed: 0, balance: { monthly, permanent, total: monthly + permanent } };
    }
    const upd = await client.query(
      `UPDATE credit_balances
          SET permanent_credits = permanent_credits - $2, updated_at = now()
        WHERE user_id = $1
      RETURNING monthly_credits, permanent_credits`,
      [userId, removed],
    );
    const m = Number(upd.rows[0].monthly_credits);
    const p = Number(upd.rows[0].permanent_credits);
    await client.query(
      `INSERT INTO credit_transactions (user_id, delta, bucket, reason, ref, balance_after)
         VALUES ($1, $2, 'permanent', 'admin_adjust', $3, $4)`,
      [userId, -removed, opts.ref ?? null, m + p],
    );
    await client.query('COMMIT');
    return { removed, balance: { monthly: m, permanent: p, total: m + p } };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Debit the price of one tool run, monthly bucket first.
 *
 * Call this BEFORE the provider call. Row-locked (`FOR UPDATE`) so two concurrent
 * generations cannot both pass the balance check and overdraw. Throws
 * `InsufficientCreditsError` when the balance will not cover the tool — callers should
 * surface that as a 402, never as a silent free run.
 */
export async function spendCredits(
  userId: string,
  toolId: string,
  opts: { ref?: string } = {},
): Promise<SpendReceipt> {
  const cost = creditsFor(toolId);
  if (cost === 0) {
    return { userId, toolId, fromMonthly: 0, fromPermanent: 0, total: 0, transactionId: '' };
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT monthly_credits, permanent_credits FROM credit_balances
        WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );

    const monthly = rows.length ? Number(rows[0].monthly_credits) : 0;
    const permanent = rows.length ? Number(rows[0].permanent_credits) : 0;

    let fromMonthly: number;
    let fromPermanent: number;
    try {
      ({ fromMonthly, fromPermanent } = planSpend(monthly, permanent, cost));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    const upd = await client.query(
      `UPDATE credit_balances
          SET monthly_credits = monthly_credits - $2,
              permanent_credits = permanent_credits - $3,
              updated_at = now()
        WHERE user_id = $1
      RETURNING monthly_credits, permanent_credits`,
      [userId, fromMonthly, fromPermanent],
    );

    const after = Number(upd.rows[0].monthly_credits) + Number(upd.rows[0].permanent_credits);
    const tx = await client.query(
      `INSERT INTO credit_transactions (user_id, delta, bucket, reason, tool, ref, balance_after)
         VALUES ($1, $2, $3, 'spend', $4, $5, $6) RETURNING id`,
      [
        userId,
        -cost,
        bucketLabel(fromMonthly, fromPermanent),
        toolId,
        opts.ref ?? null,
        after,
      ],
    );

    await client.query('COMMIT');
    return {
      userId,
      toolId,
      fromMonthly,
      fromPermanent,
      total: cost,
      transactionId: String(tx.rows[0].id),
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Undo a spend after the provider call failed. Restores each bucket exactly as debited,
 * so it can never hand back more than was taken. Safe to call with a zero receipt.
 */
export async function refundCredits(receipt: SpendReceipt): Promise<CreditBalance> {
  if (receipt.total <= 0) return getBalance(receipt.userId);

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE credit_balances
          SET monthly_credits = monthly_credits + $2,
              permanent_credits = permanent_credits + $3,
              updated_at = now()
        WHERE user_id = $1
      RETURNING monthly_credits, permanent_credits`,
      [receipt.userId, receipt.fromMonthly, receipt.fromPermanent],
    );

    if (!rows.length) {
      // No balance row means the spend never landed — nothing to give back.
      await client.query('ROLLBACK');
      return getBalance(receipt.userId);
    }

    const monthly = Number(rows[0].monthly_credits);
    const permanent = Number(rows[0].permanent_credits);

    await client.query(
      `INSERT INTO credit_transactions (user_id, delta, bucket, reason, tool, ref, balance_after)
         VALUES ($1, $2, $3, 'refund', $4, $5, $6)`,
      [
        receipt.userId,
        receipt.total,
        bucketLabel(receipt.fromMonthly, receipt.fromPermanent),
        receipt.toolId,
        receipt.transactionId || null,
        monthly + permanent,
      ],
    );

    await client.query('COMMIT');
    return { monthly, permanent, total: monthly + permanent };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Recent ledger rows for `/account` and `/admin`. Newest first. */
export async function listTransactions(userId: string, limit = 50) {
  const { rows } = await getPool().query(
    `SELECT id, delta, bucket, reason, tool, ref, balance_after, created_at
       FROM credit_transactions WHERE user_id = $1
      ORDER BY created_at DESC, id DESC LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 200)],
  );
  return rows;
}
