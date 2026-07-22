/**
 * Subscription pricing — defaults + types (Rail A, Ameriabank bindings).
 *
 * Prices are owner-editable in Sanity (`pricingPlan` docs — see
 * sanity/pricingPlan.schema.ts). This module is the OFFLINE FALLBACK + the
 * source of the shared types, exactly like src/data/retailers.ts is the fallback
 * for the Sanity `retailer` list. If Sanity has no published pricingPlan docs (or
 * is unreachable), the site still renders correct prices from here.
 *
 * IMPORTANT (grandfathering): the price a customer PAYS is locked into their
 * `subscriptions.amount_usd` row at signup. This module / Sanity only set the
 * STOREFRONT price for the pricing page + NEW subscribers. Never read live
 * pricing to charge an existing subscriber. See
 * _Plan\Website\Website-Subscriptions-Plan.md.
 */

/** The three access tiers. Only 'design' + 'studio' are paid subscriptions. */
export type Plan = 'free' | 'design' | 'studio';
/** Paid plan keys (what a `pricingPlan` Sanity doc / subscription references). */
export type PaidPlanKey = 'design' | 'studio';
export type BillingInterval = 'monthly' | 'annual';

/** Per-period allowances that drive plan gating (on-read quota reset, S2). */
export interface PlanQuotas {
  /** AI Vision / concept generations per billing period. */
  generations: number;
  /** Room Audits per billing period. */
  audits: number;
  /** Shopping List searches per billing period. */
  shopping: number;
}

/** A storefront plan (one paid tier). Shape returned by the Sanity fetcher. */
export interface PricingPlan {
  key: PaidPlanKey;
  name: string;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  currency: 'USD';
  /** Marketing bullets shown on the pricing card. */
  features: string[];
  quotas: PlanQuotas;
  active: boolean;
  order: number;
}

/**
 * Free-tier allowances. Free is NOT a subscription and has no `pricingPlan` doc,
 * so its quotas live here as code constants (the paid tiers' quotas come from
 * Sanity, falling back to PRICING_PLANS_FALLBACK below).
 */
export const FREE_QUOTAS: PlanQuotas = { generations: 3, audits: 0, shopping: 3 };

/**
 * Offline fallback for the paid plans. Kept in sync with the pricing page.
 * Annual = 10× monthly (two months free). Quotas are the launch defaults; once
 * the owner publishes `pricingPlan` docs in Sanity, those override these.
 */
export const PRICING_PLANS_FALLBACK: PricingPlan[] = [
  {
    key: 'design',
    name: 'Design',
    monthlyPriceUsd: 19,
    annualPriceUsd: 190,
    currency: 'USD',
    features: [
      'AI Vision room redesigns',
      'AI Style Quiz',
      'Shopping List with real retailers',
      '3 Room Audits / month',
      'Save your styles & concepts',
    ],
    quotas: { generations: 50, audits: 3, shopping: 50 },
    active: true,
    order: 1,
  },
  {
    key: 'studio',
    name: 'Studio',
    monthlyPriceUsd: 49,
    annualPriceUsd: 490,
    currency: 'USD',
    features: [
      'Everything in Design',
      'High-volume AI generations',
      'Unlimited Room Audits',
      'Priority processing',
      'Everything saved & organized',
    ],
    quotas: { generations: 500, audits: 999, shopping: 500 },
    active: true,
    order: 2,
  },
];

/** The price for a plan + interval (storefront / new-subscriber price). */
export function priceFor(plan: PricingPlan, interval: BillingInterval): number {
  return interval === 'annual' ? plan.annualPriceUsd : plan.monthlyPriceUsd;
}

/**
 * Resolve a tier's per-period quotas from the storefront plans (+ the free
 * constant). Used by plan gating. Falls back to FREE_QUOTAS for an unknown tier.
 */
export function quotasForPlan(tier: Plan, plans: PricingPlan[]): PlanQuotas {
  if (tier === 'free') return FREE_QUOTAS;
  const p = plans.find((pl) => pl.key === tier);
  return p ? p.quotas : FREE_QUOTAS;
}
