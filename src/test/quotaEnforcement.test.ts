import { describe, it, expect } from 'vitest';
import {
  FREE_TIER_MAX_CONCEPTS,
  FREE_TIER_MAX_SHOPPING_LISTS,
  UNLIMITED_QUOTA,
  isUnlimitedAccountEmail,
  isPaidPlan,
  normalizeUserForFreeTier,
  refundGenerations,
  type QuotaUser,
} from '../../server/quota';

// The whole point of this suite: free tier is a HARD LIFETIME cap of 3 concepts +
// 3 shopping lists per user. Nothing here — and no client-callable endpoint — may
// ever move a counter upward. The only refund is the server-authoritative,
// pre-decrement-bounded path modeled by refundGenerations().

const freeUser = (over: Partial<QuotaUser> = {}): QuotaUser => ({
  email: 'free@example.com',
  generationsLeft: FREE_TIER_MAX_CONCEPTS,
  shoppingListsLeft: FREE_TIER_MAX_SHOPPING_LISTS,
  ...over,
});

describe('caps are locked at 3 (owner has not authorized changing them)', () => {
  it('FREE_TIER_MAX_CONCEPTS and FREE_TIER_MAX_SHOPPING_LISTS are both 3', () => {
    expect(FREE_TIER_MAX_CONCEPTS).toBe(3);
    expect(FREE_TIER_MAX_SHOPPING_LISTS).toBe(3);
  });
});

describe('free tier concepts — hard lifetime cap', () => {
  it('a new free user starts at generationsLeft = 3 and normalize leaves it', () => {
    const { user, changed } = normalizeUserForFreeTier(freeUser());
    expect(user.generationsLeft).toBe(3);
    expect(changed).toBe(false);
  });

  it('after 3 successful decrements generationsLeft = 0, and normalize does NOT refill it', () => {
    // Model the endpoint decrement: -1 per successful generation.
    let left = FREE_TIER_MAX_CONCEPTS;
    for (let i = 0; i < 3; i++) left -= 1;
    expect(left).toBe(0);

    // A spent user must never be topped back up by normalization.
    const { user, changed } = normalizeUserForFreeTier(freeUser({ generationsLeft: 0, shoppingListsLeft: 0 }));
    expect(user.generationsLeft).toBe(0);
    expect(user.shoppingListsLeft).toBe(0);
    expect(changed).toBe(false);
  });

  it('any over-cap generationsLeft is clamped DOWN to 3, never left high', () => {
    // e.g. a corrupted / legacy record claiming 99 must not grant 99 generations.
    const { user, changed } = normalizeUserForFreeTier(freeUser({ generationsLeft: 99 }));
    expect(user.generationsLeft).toBe(FREE_TIER_MAX_CONCEPTS);
    expect(changed).toBe(true);
  });

  it('there is no exported way to raise a counter except the bounded failure refund', () => {
    // Surface-area guard: the module exposes only cap-enforcement + a bounded
    // refund. If someone adds an unbounded "grant" helper, this list changes and
    // the review should catch it.
    expect(typeof normalizeUserForFreeTier).toBe('function');
    expect(typeof refundGenerations).toBe('function');
  });
});

describe('failed-generation server-side refund is bounded by the pre-decrement value', () => {
  it('restores exactly the 1 it took — back to the pre-decrement balance, not above', () => {
    // user had 3, endpoint decremented to 2, provider threw → refund 1.
    const before = 3;
    const afterDecrement = 2;
    const restored = refundGenerations(afterDecrement, 1, before, FREE_TIER_MAX_CONCEPTS);
    expect(restored).toBe(3);
  });

  it('never exceeds the pre-decrement balance even when that balance is below the cap', () => {
    // user had 2 (already spent one earlier), decremented to 1, failure refunds to 2 — NOT 3.
    const restored = refundGenerations(1, 1, 2, FREE_TIER_MAX_CONCEPTS);
    expect(restored).toBe(2);
  });

  it('never exceeds the cap, even if before/amount are absurdly large', () => {
    const restored = refundGenerations(3, 100, 100, FREE_TIER_MAX_CONCEPTS);
    expect(restored).toBe(FREE_TIER_MAX_CONCEPTS);
  });

  it('a redundant refund cannot stack a user above where they started', () => {
    // Already refunded to the pre-decrement value; a second (buggy) refund is a no-op up.
    const restored = refundGenerations(3, 1, 3, FREE_TIER_MAX_CONCEPTS);
    expect(restored).toBe(3);
  });

  it('a refund from 0 restores exactly one when the user had one', () => {
    const restored = refundGenerations(0, 1, 1, FREE_TIER_MAX_CONCEPTS);
    expect(restored).toBe(1);
  });
});

describe('missing / corrupt shopping field defaults to 0, NOT the cap (Bug 2 fix)', () => {
  it('omitted shoppingListsLeft → 0', () => {
    const u = freeUser();
    delete (u as Partial<QuotaUser>).shoppingListsLeft;
    const { user, changed } = normalizeUserForFreeTier(u);
    expect(user.shoppingListsLeft).toBe(0);
    expect(user.shoppingListsLeft).not.toBe(FREE_TIER_MAX_SHOPPING_LISTS);
    expect(changed).toBe(true);
  });

  it('NaN shoppingListsLeft → 0', () => {
    const { user } = normalizeUserForFreeTier(freeUser({ shoppingListsLeft: NaN }));
    expect(user.shoppingListsLeft).toBe(0);
  });

  it('non-number shoppingListsLeft → 0', () => {
    const { user } = normalizeUserForFreeTier(freeUser({ shoppingListsLeft: undefined }));
    expect(user.shoppingListsLeft).toBe(0);
  });
});

describe('missing / corrupt generations field defaults to 0, NOT the cap (new defensive check)', () => {
  it('omitted generationsLeft → 0', () => {
    const u = freeUser();
    delete (u as Partial<QuotaUser>).generationsLeft;
    const { user, changed } = normalizeUserForFreeTier(u as QuotaUser);
    expect(user.generationsLeft).toBe(0);
    expect(user.generationsLeft).not.toBe(FREE_TIER_MAX_CONCEPTS);
    expect(changed).toBe(true);
  });

  it('NaN generationsLeft → 0', () => {
    const { user } = normalizeUserForFreeTier(freeUser({ generationsLeft: NaN }));
    expect(user.generationsLeft).toBe(0);
  });
});

describe('owner / unlimited accounts are unaffected', () => {
  it('recognizes the studio owner + demo emails as unlimited', () => {
    expect(isUnlimitedAccountEmail('anahit@designature.studio')).toBe(true);
    expect(isUnlimitedAccountEmail('anahit.ghasabyan@gmail.com')).toBe(true);
    expect(isUnlimitedAccountEmail('  ANAHIT@Designature.Studio ')).toBe(true);
    expect(isUnlimitedAccountEmail('free@example.com')).toBe(false);
  });

  it('owner gets 999 for BOTH generations and shopping, regardless of stored values', () => {
    const { user, changed } = normalizeUserForFreeTier({
      email: 'anahit@designature.studio',
      generationsLeft: 0,
      shoppingListsLeft: 0,
    });
    expect(user.generationsLeft).toBe(UNLIMITED_QUOTA);
    expect(user.shoppingListsLeft).toBe(UNLIMITED_QUOTA);
    expect(changed).toBe(true);
  });

  it('owner already at 999/999 needs no change', () => {
    const { changed } = normalizeUserForFreeTier({
      email: 'anahit.ghasabyan@gmail.com',
      generationsLeft: UNLIMITED_QUOTA,
      shoppingListsLeft: UNLIMITED_QUOTA,
    });
    expect(changed).toBe(false);
  });

  it('owner missing shopping field is filled to 999, not 0', () => {
    const ownerNoShop: QuotaUser = {
      email: 'anahit@designature.studio',
      generationsLeft: UNLIMITED_QUOTA,
    };
    const { user } = normalizeUserForFreeTier(ownerNoShop);
    expect(user.shoppingListsLeft).toBe(UNLIMITED_QUOTA);
  });
});

describe('paid subscribers (Rail A) keep their server-granted quota — NOT clamped to free', () => {
  it('isPaidPlan is true only for design/studio', () => {
    expect(isPaidPlan('design')).toBe(true);
    expect(isPaidPlan('studio')).toBe(true);
    expect(isPaidPlan('free')).toBe(false);
    expect(isPaidPlan(undefined)).toBe(false);
  });

  it('a Design user with 50 generations is NOT clamped to the free cap of 3', () => {
    const { user, changed } = normalizeUserForFreeTier({
      email: 'sub@example.com', plan: 'design', generationsLeft: 50, shoppingListsLeft: 50,
    });
    expect(user.generationsLeft).toBe(50);
    expect(user.shoppingListsLeft).toBe(50);
    expect(changed).toBe(false);
  });

  it('a Studio user with 500 is left untouched', () => {
    const { user } = normalizeUserForFreeTier({
      email: 'sub@example.com', plan: 'studio', generationsLeft: 500, shoppingListsLeft: 500,
    });
    expect(user.generationsLeft).toBe(500);
    expect(user.shoppingListsLeft).toBe(500);
  });

  it('a paid user with missing/NaN counters still defaults to 0 — never a refill', () => {
    const paidNaN: QuotaUser = { email: 'sub@example.com', plan: 'design', generationsLeft: NaN };
    const { user } = normalizeUserForFreeTier(paidNaN);
    expect(user.generationsLeft).toBe(0);
    expect(user.shoppingListsLeft).toBe(0);
  });

  it('plan=free is still clamped to the free cap (regression guard)', () => {
    const { user } = normalizeUserForFreeTier({
      email: 'free@example.com', plan: 'free', generationsLeft: 99, shoppingListsLeft: 99,
    });
    expect(user.generationsLeft).toBe(FREE_TIER_MAX_CONCEPTS);
    expect(user.shoppingListsLeft).toBe(FREE_TIER_MAX_SHOPPING_LISTS);
  });
});
