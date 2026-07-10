/**
 * Internal / owner accounts excluded from /admin ANALYTICS aggregates so the
 * owner's own usage doesn't skew signups, funnels, activation, retention, and
 * user counts. Requested 2026-07-10 ("mostly there is me").
 *
 * Scope: the internal-tracking metrics computed from db.users + db.activityLog.
 * NOTE: this does NOT affect the GA4 / Search Console Acquisition tiles — that's
 * Google's own data; exclude owner traffic there via a GA4 "internal traffic"
 * filter (defined by IP in GA4 Admin), not here.
 */

/** Exact addresses treated as internal (case-insensitive). */
export const INTERNAL_EXACT_EMAILS = new Set<string>([
  "anahit.ghasabyan@gmail.com",
]);

/** Whole email domains treated as internal — every address @<domain>. */
export const INTERNAL_EMAIL_DOMAINS = ["designature.studio"];

/** True if `email` belongs to an internal/owner account. Anonymous / empty → false. */
export function isInternalAccount(email: string | undefined | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!e) return false;
  if (INTERNAL_EXACT_EMAILS.has(e)) return true;
  return INTERNAL_EMAIL_DOMAINS.some((d) => e.endsWith("@" + d));
}
