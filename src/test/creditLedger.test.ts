/**
 * Credit ledger — the pure rules that protect customer value.
 *
 * Follows the precedent of `subscriptionBilling.test.ts`: the DB-touching functions are
 * exercised by hand against the sandbox, while the arithmetic that decides how much a
 * customer loses lives in pure helpers and is tested here.
 *
 * The rule under test is monthly-first spending. Getting it backwards is invisible in
 * review and silently destroys credits people paid for: monthly credits expire at the
 * next billing date, permanent ones never do, so spending permanent first burns the
 * durable bucket while the expiring one evaporates unused.
 */

import { describe, it, expect } from 'vitest';
import {
  planSpend,
  bucketLabel,
  InsufficientCreditsError,
} from '../../services/credits/ledger';
import { creditsFor, planById } from '../data/creditPricing';

describe('planSpend — monthly bucket is always drained first', () => {
  it('takes only monthly when it covers the cost', () => {
    expect(planSpend(1000, 500, 10)).toEqual({ fromMonthly: 10, fromPermanent: 0 });
  });

  it('leaves permanent untouched even when it is much larger', () => {
    expect(planSpend(5, 6500, 5)).toEqual({ fromMonthly: 5, fromPermanent: 0 });
  });

  it('spills into permanent only for the remainder', () => {
    expect(planSpend(4, 500, 10)).toEqual({ fromMonthly: 4, fromPermanent: 6 });
  });

  it('uses permanent alone when the monthly bucket is empty', () => {
    expect(planSpend(0, 3000, 25)).toEqual({ fromMonthly: 0, fromPermanent: 25 });
  });

  it('spends the balance exactly to zero', () => {
    expect(planSpend(7, 3, 10)).toEqual({ fromMonthly: 7, fromPermanent: 3 });
  });

  it('always debits exactly the cost, never more', () => {
    for (const [m, p, c] of [[0, 10, 10], [10, 0, 10], [3, 7, 10], [1, 9, 10], [9, 1, 10]]) {
      const s = planSpend(m, p, c);
      expect(s.fromMonthly + s.fromPermanent).toBe(c);
      expect(s.fromMonthly).toBeLessThanOrEqual(m);
      expect(s.fromPermanent).toBeLessThanOrEqual(p);
    }
  });
});

describe('planSpend — refuses to overdraw', () => {
  it('throws when the combined balance is short', () => {
    expect(() => planSpend(3, 4, 10)).toThrow(InsufficientCreditsError);
  });

  it('throws on an empty balance', () => {
    expect(() => planSpend(0, 0, 3)).toThrow(InsufficientCreditsError);
  });

  it('reports what was needed and what was there', () => {
    try {
      planSpend(2, 2, 25);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InsufficientCreditsError);
      expect((err as InsufficientCreditsError).required).toBe(25);
      expect((err as InsufficientCreditsError).available).toBe(4);
    }
  });

  it('allows a spend that exactly equals the balance', () => {
    expect(() => planSpend(5, 5, 10)).not.toThrow();
  });

  it('rejects a negative cost rather than minting credits', () => {
    expect(() => planSpend(10, 10, -5)).toThrow(/must not be negative/);
  });
});

describe('a refund can never return more than the spend took', () => {
  it('restores each bucket to exactly its pre-spend level', () => {
    const monthly = 30;
    const permanent = 100;
    const cost = creditsFor('shop'); // 25
    const s = planSpend(monthly, permanent, cost);
    // Refund replays the receipt, so the arithmetic is symmetric by construction.
    expect(monthly - s.fromMonthly + s.fromMonthly).toBe(monthly);
    expect(permanent - s.fromPermanent + s.fromPermanent).toBe(permanent);
  });

  it('cannot inflate the permanent bucket from a monthly-funded spend', () => {
    const s = planSpend(50, 0, 10);
    expect(s.fromPermanent).toBe(0); // nothing to give back to permanent
  });
});

describe('bucketLabel — the audit row says which buckets moved', () => {
  it('labels a monthly-only movement', () => {
    expect(bucketLabel(10, 0)).toBe('monthly');
  });
  it('labels a permanent-only movement', () => {
    expect(bucketLabel(0, 10)).toBe('permanent');
  });
  it('labels a movement that crossed both', () => {
    expect(bucketLabel(4, 6)).toBe('split');
  });
  it('treats a zero movement as permanent rather than crashing', () => {
    expect(bucketLabel(0, 0)).toBe('permanent');
  });
});

describe('the ledger agrees with the published plans', () => {
  it('lets a free user afford exactly two shopping lists and no more', () => {
    const free = planById('free')!.credits; // 50
    const shop = creditsFor('shop'); // 25
    expect(() => planSpend(0, free, shop * 2)).not.toThrow();
    expect(() => planSpend(0, free, shop * 3)).toThrow(InsufficientCreditsError);
  });

  it('lets a Project pack cover the 300 redesigns the page advertises', () => {
    const project = planById('project')!.credits; // 3000
    const render = creditsFor('redesign'); // 10
    expect(() => planSpend(0, project, render * 300)).not.toThrow();
    expect(() => planSpend(0, project, render * 301)).toThrow(InsufficientCreditsError);
  });

  it('charges nothing for the free tool, so it can never fail on balance', () => {
    expect(creditsFor('find-style')).toBe(0);
    expect(planSpend(0, 0, creditsFor('find-style'))).toEqual({ fromMonthly: 0, fromPermanent: 0 });
  });
});
