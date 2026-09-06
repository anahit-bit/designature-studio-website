/**
 * AI-041 — guards for the credit pricing model.
 *
 * These encode the seven binding rules from the `Tier Matrix` sheet. R1 is the one that
 * actually caught a bug: Shop My Room shipped into the model priced at 12 credits while
 * costing ~$0.08 a run — nearly twice a render per credit — which made a pack's worst-case
 * cost roughly double what we believed. A test is the only thing that catches that class
 * of error, because it is invisible in review.
 */

import { describe, it, expect } from 'vitest';
import {
  CREDIT_PRICES,
  CREDIT_PLANS,
  COST_PER_CREDIT_CEILING,
  CREDITS_PER_SPACE,
  creditsFor,
  creditsPerDollar,
  isFreeTool,
  planById,
  worstCaseCostUsd,
  annualCostUsd,
} from '../data/creditPricing';
import { EXPLORER_TOOLS } from '../components/studio/explorerRoster';

const metered = Object.entries(CREDIT_PRICES).filter(([, p]) => p.credits > 0);
const costPerCredit = (id: string) => CREDIT_PRICES[id].estCostUsd / CREDIT_PRICES[id].credits;

describe('credit prices ↔ roster stay in bijection', () => {
  it('prices every tool in the roster', () => {
    const unpriced = EXPLORER_TOOLS.filter((t) => !(t.id in CREDIT_PRICES)).map((t) => t.id);
    expect(unpriced).toEqual([]);
  });

  it('prices no tool that is not in the roster', () => {
    const ids = new Set(EXPLORER_TOOLS.map((t) => t.id));
    const orphans = Object.keys(CREDIT_PRICES).filter((id) => !ids.has(id));
    expect(orphans).toEqual([]);
  });

  it('gives every tool a non-negative integer credit price', () => {
    for (const [id, p] of Object.entries(CREDIT_PRICES)) {
      expect(Number.isInteger(p.credits), `${id} credits must be an integer`).toBe(true);
      expect(p.credits, `${id} credits must not be negative`).toBeGreaterThanOrEqual(0);
      expect(p.estCostUsd, `${id} must carry a positive cost estimate`).toBeGreaterThan(0);
    }
  });
});

describe('R1 — cost floor: no card may cost more per credit than the ceiling', () => {
  it('keeps every metered tool at or under the ceiling', () => {
    const over = metered
      .filter(([id]) => costPerCredit(id) > COST_PER_CREDIT_CEILING + 1e-9)
      .map(([id]) => `${id} @ $${costPerCredit(id).toFixed(5)}/credit`);
    expect(over).toEqual([]);
  });

  it('has the flagship setting the ceiling, so the worst case is the product used as intended', () => {
    const dearest = metered.reduce((a, b) => (costPerCredit(a[0]) >= costPerCredit(b[0]) ? a : b))[0];
    expect(dearest).toBe('redesign');
    expect(COST_PER_CREDIT_CEILING).toBeCloseTo(0.0035, 6);
  });

  it('would fail if Shop My Room went back to its old 12-credit price', () => {
    // The actual regression this file exists for: $0.08 / 12 = $0.0067, ~2x a render.
    expect(0.08 / 12).toBeGreaterThan(COST_PER_CREDIT_CEILING);
    expect(costPerCredit('shop')).toBeLessThanOrEqual(COST_PER_CREDIT_CEILING + 1e-9);
  });

  it('would fail if Pick My Palette dropped to 2 credits', () => {
    // Why the floor is 3 and not 1 — at 2 it overtakes redesign as dearest per credit.
    expect(0.008 / 2).toBeGreaterThan(COST_PER_CREDIT_CEILING);
    expect(CREDIT_PRICES.palette.credits).toBe(3);
  });
});

describe('R2 — arbitrage gate: one subscription month must be worse value than Project', () => {
  it('makes subscribe-burn-cancel a bad deal against buying the pack', () => {
    const monthly = planById('monthly')!;
    const project = planById('project')!;
    expect(creditsPerDollar(monthly)).toBeLessThan(creditsPerDollar(project));
  });

  it('leaves the ANNUAL subscription cheaper than buying the same credits as packs', () => {
    // R2 forces one month to be worse per credit than Project, which means packs always
    // win against month-to-month billing on credits alone. The annual price is what gives
    // a volume user a reason to subscribe at all — so this is the comparison that matters.
    const monthly = planById('monthly')!;
    const project = planById('project')!;
    const viaPacks = project.priceUsd * Math.ceil((monthly.credits * 12) / project.credits);
    expect(annualCostUsd(monthly)).toBeLessThan(viaPacks); // $470 < $516
  });

  it('prices month-to-month as a flexibility premium over the annual plan', () => {
    // Paying monthly for a year costs more than the annual price AND more than packs.
    // That is intended: what the month-to-month pro is buying is the commercial licence,
    // clean exports, white-label PDF and a business invoice — none of which a pack carries.
    const monthly = planById('monthly')!;
    expect(monthly.priceUsd * 12).toBeGreaterThan(annualCostUsd(monthly));
    expect(monthly.annualPriceUsd).toBe(470);
  });
});

describe('R3 — ladder: credits per dollar rises with price', () => {
  it('makes each paid rung better value than the one below', () => {
    const rungs = ['starter', 'project', 'project-plus'].map((id) => planById(id as never)!);
    const rates = rungs.map(creditsPerDollar);
    expect(rates[0]).toBeLessThan(rates[1]);
    expect(rates[1]).toBeLessThan(rates[2]);
  });

  it('keeps Starter deliberately the worst value, so the middle rung is the obvious pick', () => {
    const paid = CREDIT_PLANS.filter((p) => p.priceUsd > 0);
    const worst = paid.reduce((a, b) => (creditsPerDollar(a) <= creditsPerDollar(b) ? a : b));
    expect(worst.id).toBe('starter');
  });
});

describe('R7 — licence boundary is business use, never whose home it is', () => {
  it('grants commercial use only on the recurring plan', () => {
    for (const plan of CREDIT_PLANS) {
      expect(plan.commercialUse, `${plan.id}`).toBe(plan.recurring);
    }
  });

  it('keeps every pay-once plan personal-use and non-expiring', () => {
    const payOnce = CREDIT_PLANS.filter((p) => !p.recurring);
    expect(payOnce.map((p) => p.id)).toEqual(['free', 'starter', 'project', 'project-plus']);
    expect(payOnce.every((p) => !p.commercialUse)).toBe(true);
  });
});

describe('plan shape', () => {
  it('names cards by billing shape, with the pay-once rungs inside one card', () => {
    expect(new Set(CREDIT_PLANS.map((p) => p.card))).toEqual(
      new Set(['Free', 'One-time payment', 'Monthly subscription']),
    );
    const oneTime = CREDIT_PLANS.filter((p) => p.card === 'One-time payment');
    expect(oneTime.map((p) => p.rung)).toEqual(['Starter', 'Project', 'Project Plus']);
  });

  it('bounds the worst case of every plan by the ceiling', () => {
    // The numbers quoted to the owner: a $129 pack cannot cost us more than ~$10.50.
    expect(worstCaseCostUsd(planById('project')!)).toBeCloseTo(10.5, 2);
    for (const plan of CREDIT_PLANS.filter((p) => p.priceUsd > 0)) {
      const margin = 1 - worstCaseCostUsd(plan) / plan.priceUsd;
      expect(margin, `${plan.id} worst-case margin`).toBeGreaterThan(0.85);
    }
  });

  it('gives free 50 credits — enough for two shopping lists', () => {
    const free = planById('free')!;
    expect(free.credits).toBe(50);
    expect(Math.floor(free.credits / creditsFor('shop'))).toBe(2);
  });

  it('sizes the packs in whole single-space passes', () => {
    expect(Math.floor(planById('project')!.credits / CREDITS_PER_SPACE)).toBe(21);
  });
});

describe('creditsFor', () => {
  it('returns the mapped price', () => {
    expect(creditsFor('redesign')).toBe(10);
    expect(creditsFor('shop')).toBe(25);
  });

  it('treats only the style quiz as free', () => {
    const free = EXPLORER_TOOLS.filter((t) => isFreeTool(t.id)).map((t) => t.id);
    expect(free).toEqual(['find-style']);
  });

  it('throws on an unknown tool rather than silently charging nothing', () => {
    expect(() => creditsFor('no-such-tool')).toThrow(/no credit price/);
  });
});
