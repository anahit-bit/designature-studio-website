// ─── Subscription billing — pure, unit-tested decision logic (Rail A, S3) ──────
//
// The daily billing sweep in server.ts does the I/O (query due subs, call
// MakeBindingPayment, advance periods). This module holds the pure decisions so
// they are testable without a DB or the bank.

export type BillingInterval = "monthly" | "annual";

/**
 * How many failed renewal attempts (this billing period) before we give up and
 * expire the subscription. The sweep runs daily, so this is ~N days of retries.
 */
export const MAX_DUNNING_ATTEMPTS = 3;

/**
 * After a FAILED renewal charge, decide whether to expire the subscription
 * (downgrade to free) or keep retrying (past_due). `failedAttemptsThisPeriod`
 * INCLUDES the attempt that just failed.
 */
export function shouldExpireAfterFailure(
  failedAttemptsThisPeriod: number,
  max: number = MAX_DUNNING_ATTEMPTS,
): boolean {
  return failedAttemptsThisPeriod >= max;
}

/**
 * Advance an ISO timestamp by one billing interval, in UTC. Used for reference /
 * tests; the production sweep advances the period in SQL (calendar-correct
 * `make_interval`) so month-length rollover matches Postgres exactly.
 */
export function addInterval(iso: string, interval: BillingInterval): string {
  const d = new Date(iso);
  if (interval === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

/** A subscription is due for a renewal charge once its period end is in the past. */
export function isRenewalDue(currentPeriodEndIso: string, nowIso: string): boolean {
  return new Date(currentPeriodEndIso).getTime() <= new Date(nowIso).getTime();
}
