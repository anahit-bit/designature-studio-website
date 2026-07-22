import { describe, it, expect } from 'vitest';
import {
  PRICING_PLANS_FALLBACK,
  FREE_QUOTAS,
  priceFor,
  quotasForPlan,
  type PricingPlan,
} from '../data/pricingPlans';

describe('PRICING_PLANS_FALLBACK — offline-safe defaults', () => {
  it('has exactly the two paid tiers with the locked prices', () => {
    const byKey = Object.fromEntries(PRICING_PLANS_FALLBACK.map((p) => [p.key, p]));
    expect(Object.keys(byKey).sort()).toEqual(['design', 'studio']);
    expect(byKey.design.monthlyPriceUsd).toBe(19);
    expect(byKey.design.annualPriceUsd).toBe(190);
    expect(byKey.studio.monthlyPriceUsd).toBe(49);
    expect(byKey.studio.annualPriceUsd).toBe(490);
  });

  it('annual is 10× monthly (two months free) and USD', () => {
    for (const p of PRICING_PLANS_FALLBACK) {
      expect(p.annualPriceUsd).toBe(p.monthlyPriceUsd * 10);
      expect(p.currency).toBe('USD');
      expect(p.active).toBe(true);
      expect(p.features.length).toBeGreaterThan(0);
    }
  });

  it('every plan carries complete quotas', () => {
    for (const p of PRICING_PLANS_FALLBACK) {
      expect(p.quotas.generations).toBeGreaterThan(0);
      expect(p.quotas.shopping).toBeGreaterThan(0);
      expect(typeof p.quotas.audits).toBe('number');
    }
  });
});

describe('priceFor', () => {
  const plan = PRICING_PLANS_FALLBACK[0]; // design
  it('returns the monthly price for monthly', () => {
    expect(priceFor(plan, 'monthly')).toBe(19);
  });
  it('returns the annual price for annual', () => {
    expect(priceFor(plan, 'annual')).toBe(190);
  });
});

describe('quotasForPlan', () => {
  it('free returns the free constant', () => {
    expect(quotasForPlan('free', PRICING_PLANS_FALLBACK)).toEqual(FREE_QUOTAS);
  });
  it('design/studio resolve from the plans', () => {
    expect(quotasForPlan('design', PRICING_PLANS_FALLBACK).generations).toBe(50);
    expect(quotasForPlan('studio', PRICING_PLANS_FALLBACK).generations).toBe(500);
  });
  it('an unknown/missing tier falls back to free quotas (fail-closed)', () => {
    const empty: PricingPlan[] = [];
    expect(quotasForPlan('design', empty)).toEqual(FREE_QUOTAS);
  });
});
