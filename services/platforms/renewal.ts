/**
 * Platform renewal date math — pure, testable helpers (I-012, 2026-08-27).
 *
 * Monthly/annual subscriptions have a static ANCHOR date in the inventory, but the
 * admin Platforms tab wants a renewal date that is ALWAYS current — never negative,
 * no manual bumping. `computeNextRenewal` rolls the anchor forward to the next
 * on-or-after-today occurrence for its cadence. One-time / no-cadence rows are left
 * exactly as anchored (they may legitimately sit in the past).
 *
 * All math is UTC. Inputs and outputs are `YYYY-MM-DD` strings.
 */

/** Billing cadence for a platform. `null`/undefined ⇒ static (pay-as-you-go / one-off). */
export type PlatformCadence = 'monthly' | 'annual' | 'once';

/** Days in `month0` (0-based) of `year`, UTC. */
function daysInUtcMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Format UTC calendar parts as `YYYY-MM-DD`. */
function fmtUtc(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Roll `anchor` forward to the next renewal on/after today (UTC midnight).
 *   - `!anchor` or unparseable → null.
 *   - `'once'` / null / undefined → the anchor unchanged (static; may be past).
 *   - `'monthly'` → next date matching the anchor's day-of-month (clamped to the
 *     target month's length, e.g. day 31 → 30 in a 30-day month), >= today.
 *   - `'annual'`  → next anniversary of the anchor's month+day (Feb-29 → Feb-28 in
 *     non-leap years), >= today.
 * If the anchor is already today/future, it is kept as-is.
 */
export function computeNextRenewal(
  anchor: string | null,
  cadence: PlatformCadence | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!anchor) return null;
  const ms = Date.parse(anchor);
  if (!Number.isFinite(ms)) return null;

  // Static (one-time / no cadence): the anchor is the answer, even if it's past.
  if (cadence !== 'monthly' && cadence !== 'annual') return anchor;

  const a = new Date(ms);
  const aYear = a.getUTCFullYear();
  const aMonth = a.getUTCMonth();
  const aDay = a.getUTCDate();

  // Today + the anchor's own day, both at UTC midnight.
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const anchorMs = Date.UTC(aYear, aMonth, aDay);
  if (anchorMs >= todayMs) return fmtUtc(aYear, aMonth, aDay); // already today/future — keep

  if (cadence === 'monthly') {
    // Walk forward month by month from the current month until the clamped
    // day-of-month lands on/after today (24-iteration safety bound).
    let y = now.getUTCFullYear();
    let m = now.getUTCMonth();
    for (let i = 0; i < 24; i++) {
      const day = Math.min(aDay, daysInUtcMonth(y, m));
      if (Date.UTC(y, m, day) >= todayMs) return fmtUtc(y, m, day);
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return fmtUtc(y, m, Math.min(aDay, daysInUtcMonth(y, m)));
  }

  // annual — next anniversary (month + day) on/after today, Feb-29 clamped.
  const anniversary = (year: number) => {
    let d = aDay;
    if (aMonth === 1 && aDay === 29) d = Math.min(29, daysInUtcMonth(year, 1)); // Feb-29 → 28 non-leap
    return { d, ms: Date.UTC(year, aMonth, d) };
  };
  const thisYear = now.getUTCFullYear();
  const cur = anniversary(thisYear);
  const pick = cur.ms >= todayMs ? { year: thisYear, d: cur.d } : { year: thisYear + 1, d: anniversary(thisYear + 1).d };
  return fmtUtc(pick.year, aMonth, pick.d);
}
