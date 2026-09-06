// ─── Free-tier quota logic (pure, unit-tested) ─────────────────────────────────
//
// Free tier is a HARD LIFETIME cap: FREE_TIER_MAX_CONCEPTS concepts +
// FREE_TIER_MAX_SHOPPING_LISTS shopping lists per user — no refills, ever.
//
// The ONLY way a counter goes back up for a free user is the server-authoritative
// failure path: a generation endpoint decrements BEFORE calling the AI provider,
// and if the provider throws, the SAME endpoint credits back exactly what it
// decremented (bounded by the pre-decrement balance). There is intentionally no
// client-callable "restore" endpoint — the client can never move a quota upward.
//
// Extracted from server.ts so the exact production logic is unit-testable.

/** Free tier caps (UI + API). Paid tier can be added later with an `isPaid` flag. */
export const FREE_TIER_MAX_CONCEPTS = 3;
export const FREE_TIER_MAX_SHOPPING_LISTS = 3;

/** Sentinel quota value for unlimited (owner/demo) accounts — never clamped or decremented. */
export const UNLIMITED_QUOTA = 999;

/** Accounts that get unlimited quotas — never clamped or decremented. */
export const UNLIMITED_ACCOUNT_EMAILS = [
  "anahit@designature.studio",
  "anahit.ghasabyan@gmail.com",
];

/** True for the owner/demo accounts that bypass all free-tier quota limits. */
export function isUnlimitedAccountEmail(email: string): boolean {
  return UNLIMITED_ACCOUNT_EMAILS.includes((email || "").trim().toLowerCase());
}

/** Minimal shape the quota helpers read/write. server.ts's `User` is a superset. */
export interface QuotaUser {
  email: string;
  generationsLeft: number;
  /** Optional in older `users.json` — a MISSING field means the user already
   *  burned their lifetime quota (never a signal to refill). */
  shoppingListsLeft?: number;
  /** Paid subscription tier, set server-side on subscription activation
   *  (Rail A). 'design' | 'studio' = paid → NOT clamped to the free cap.
   *  undefined / 'free' = free tier (the hard lifetime cap below). */
  plan?: "free" | "design" | "studio";
}

/** True for a paid subscription tier (design/studio). */
export function isPaidPlan(plan: QuotaUser["plan"]): boolean {
  return plan === "design" || plan === "studio";
}

/**
 * Enforce free-tier caps on a user record in place of trusting whatever the DB holds.
 *
 * NOTE — free tier is a LIFETIME cap of {@link FREE_TIER_MAX_CONCEPTS} concepts +
 * {@link FREE_TIER_MAX_SHOPPING_LISTS} shopping lists. This function NEVER refills a
 * user toward the cap: missing/corrupt counters default to 0 (the user has already
 * spent their quota), and existing counters are only ever clamped DOWN to the cap.
 * The sole legitimate refund path is the server-authoritative failure handler in the
 * generation endpoints (see {@link refundGenerations}); nothing here grants credit.
 * Unlimited accounts (owner/demo) are the only exception — forced to
 * {@link UNLIMITED_QUOTA}.
 */
export function normalizeUserForFreeTier<T extends QuotaUser>(
  user: T,
): { user: T; changed: boolean } {
  let changed = false;
  const u = { ...user };
  const isUnlimited = isUnlimitedAccountEmail(u.email);

  if (isUnlimited) {
    // Unlimited accounts (owner/demo) — force UNLIMITED_QUOTA, never clamp
    if (u.generationsLeft !== UNLIMITED_QUOTA) { u.generationsLeft = UNLIMITED_QUOTA; changed = true; }
    if (u.shoppingListsLeft !== UNLIMITED_QUOTA) { u.shoppingListsLeft = UNLIMITED_QUOTA; changed = true; }
  } else if (isPaidPlan(u.plan)) {
    // Paid subscribers (Rail A) keep their server-granted quota — NEVER clamped
    // to the free cap. Their quota is set at subscription activation and refilled
    // at renewal, both server-authoritative; the client still can't move it up.
    // A missing/NaN counter defaults to 0 (spent), same as free — never a refill.
    if (typeof u.generationsLeft !== "number" || Number.isNaN(u.generationsLeft)) {
      u.generationsLeft = 0;
      changed = true;
    }
    if (typeof u.shoppingListsLeft !== "number" || Number.isNaN(u.shoppingListsLeft)) {
      u.shoppingListsLeft = 0;
      changed = true;
    }
  } else {
    // Everyone else — enforce free-tier caps regardless of isPaid flag.
    // (No paid tier exists yet; isPaid on the user record is only used for
    //  audit access in the API response, not for quota bypass.)

    // Missing/NaN generations → 0. A missing field means the record predates the
    // counter or was corrupted — treat it as "quota already spent", NEVER as a
    // reason to hand out the cap. (Historically there was no check here at all.)
    if (typeof u.generationsLeft !== "number" || Number.isNaN(u.generationsLeft)) {
      u.generationsLeft = 0;
      changed = true;
    } else if (u.generationsLeft > FREE_TIER_MAX_CONCEPTS) {
      u.generationsLeft = FREE_TIER_MAX_CONCEPTS;
      changed = true;
    }

    // Missing/NaN shopping → 0 (NOT the cap). This used to refill to the cap,
    // which meant any DB corruption or migration gap silently reset free users
    // back to 3 shopping lists. A missing field means the quota is already spent.
    if (typeof u.shoppingListsLeft !== "number" || Number.isNaN(u.shoppingListsLeft)) {
      u.shoppingListsLeft = 0;
      changed = true;
    } else if (u.shoppingListsLeft > FREE_TIER_MAX_SHOPPING_LISTS) {
      u.shoppingListsLeft = FREE_TIER_MAX_SHOPPING_LISTS;
      changed = true;
    }
  }
  return { user: u, changed };
}

/**
 * Server-authoritative refund after a FAILED generation.
 *
 * Restores `amount` credits to `currentLeft`, but the result can never exceed
 * either the pre-decrement balance (`before`) or `cap`. This guarantees a failure
 * can only ever undo the decrement this same request made — it can never grant a
 * free user more credit than they started the request with.
 *
 * @param currentLeft the balance now (already decremented)
 * @param amount      how much was decremented for this call (refund exactly this)
 * @param before      the balance BEFORE the decrement (hard ceiling)
 * @param cap         the tier cap (secondary ceiling)
 */
export function refundGenerations(
  currentLeft: number,
  amount: number,
  before: number,
  cap: number,
): number {
  return Math.min(before, cap, currentLeft + amount);
}
