/**
 * Client side credit rules shared by the redesign, shopping and audit tools.
 *
 * When CREDITS_ENABLED is on the server meters runs through the credit ledger and
 * ignores the legacy generationsLeft / shoppingListsLeft / auditsLeft counters. The
 * UI has to stop gating on those counters too, or anyone who spent their old free
 * quota is blocked by a button that never reaches the server.
 */
import { creditsFor } from '../data/creditPricing';

/** Counter value the server pins owner / unlimited accounts to (server/quota.ts). */
export const UNLIMITED_QUOTA = 999;

interface QuotaUserShape {
  creditsEnabled?: boolean;
  generationsLeft?: number;
}

/**
 * Owner / unlimited accounts are never metered, so they are never blocked. The server
 * pins both counters to 999 for them; generationsLeft alone is the signal because a
 * plan can legitimately grant shoppingListsLeft 999 without making redesigns unlimited.
 */
export function isUnlimitedUser(user: QuotaUserShape | null | undefined): boolean {
  return (user?.generationsLeft ?? 0) >= UNLIMITED_QUOTA;
}

/**
 * True when the credit ledger is the live meter for this user and their known balance
 * cannot cover one run of `toolId`. An unknown balance (null / undefined, still loading
 * or the fetch failed) never blocks: the click reaches the server, which decides.
 */
export function cannotAffordRun(
  user: QuotaUserShape | null | undefined,
  balance: number | null | undefined,
  toolId: string,
): boolean {
  if (!user?.creditsEnabled || isUnlimitedUser(user)) return false;
  return typeof balance === 'number' && balance < creditsFor(toolId);
}

/** "1,250 credits". */
export const formatCredits = (n: number): string => `${n.toLocaleString('en-US')} credits`;

/** The message shown when the server answers 402 for a run. */
export function notEnoughCreditsMessage(what: string, toolId: string, available: unknown): string {
  const have = typeof available === 'number' ? available : 0;
  return `Not enough credits. ${what} costs ${creditsFor(toolId)} credits and you have ${have}.`;
}
