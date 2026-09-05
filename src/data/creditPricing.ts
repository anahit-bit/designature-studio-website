/**
 * AI-041 — the canonical credit price of every tool, and the plans that buy credits.
 *
 * Pricing model v4 (set 2026-09-04). One credit currency; plans differ by CREDIT COUNT
 * ONLY — never by which tools are unlocked, never by room scope. Full rationale and the
 * seven binding rules live in the `Tier Matrix` sheet of `_Plan/Website/Website-plan.xlsx`.
 *
 * ⚠️ `estCostUsd` figures are MODELLED, not billed (rule R6). They come from list prices
 * and expected call counts, not from an invoice. I-032 reconciles them against a real
 * month of Gemini + Serper billing; until it does, treat them as the best guess we have
 * and re-run `creditPricing.test.ts` after changing any of them.
 */

/** A tool's price in credits, plus what we think one run costs us. */
export interface CreditPrice {
  /** Credits debited per successful run. 0 = free forever, never metered. */
  credits: number;
  /** Modelled provider cost of one run, in USD. See the R6 warning above. */
  estCostUsd: number;
  /** Why this number is what it is — kept next to the number so it survives edits. */
  note?: string;
}

/**
 * Card → credits. Keyed by `ExplorerTool.id`, and the test asserts this map and the
 * roster stay in exact bijection: add a tool without pricing it (or price a tool that
 * does not exist) and CI fails rather than the gap reaching production.
 *
 * Not yet in the roster — these ship on the AI-032 v2 branch and must be priced when
 * they land: `heat-room` (15), `plumb-room` (15), `finishes` (15).
 */
export const CREDIT_PRICES: Record<string, CreditPrice> = {
  // ── Discover ──────────────────────────────────────────────────────────────
  'find-style': {
    credits: 0,
    estCostUsd: 0.002,
    note: 'Free forever and unlimited on every plan — it is the door. Charging at the entrance loses people.',
  },
  'score-room': { credits: 5, estCostUsd: 0.01 },
  localize: { credits: 5, estCostUsd: 0.008 },

  // ── Plan ──────────────────────────────────────────────────────────────────
  'plan-room': { credits: 15, estCostUsd: 0.03 },
  'plan-home': {
    credits: 40,
    estCostUsd: 0.08,
    note: 'Priced well above cost on purpose — bought rarely, worth a lot. Charging above the floor is fine; below it is the only error.',
  },
  'light-room': { credits: 15, estCostUsd: 0.025 },
  'wire-room': { credits: 15, estCostUsd: 0.025 },

  // ── Visualize ─────────────────────────────────────────────────────────────
  redesign: {
    credits: 10,
    estCostUsd: 0.035,
    note: 'SETS THE CEILING. The dearest card per credit, so the worst a customer can do to margin is use the flagship as intended.',
  },
  palette: {
    credits: 3,
    estCostUsd: 0.008,
    note: 'The floor. At 2 credits it overtakes redesign as the dearest per credit and breaks R1 — 3 is derived, not chosen.',
  },
  moodboard: { credits: 8, estCostUsd: 0.02 },

  // ── Specify ───────────────────────────────────────────────────────────────
  shop: {
    credits: 25,
    estCostUsd: 0.08,
    note: 'Was 12 — repriced 2026-09-04. The only card spending hard cash (Serper), and at 12 it was ~2x a render per credit.',
  },
  cost: { credits: 5, estCostUsd: 0.01, note: 'Kept cheap so budget-led visitors reach it.' },

  // ── Realize ───────────────────────────────────────────────────────────────
  'phase-reno': { credits: 20, estCostUsd: 0.03 },
  'guide-install': { credits: 8, estCostUsd: 0.015 },
  'walk-room': {
    credits: 250,
    estCostUsd: 0.75,
    note: 'Was 150. Video — the only card costing dollars, and the shakiest estimate here. Measure before selling; if a clip exceeds ~$1.20, keep it out of pay-once entirely.',
  },

  // ── Anytime ───────────────────────────────────────────────────────────────
  'write-brief': { credits: 10, estCostUsd: 0.02 },
};

/** Credits for one run of a tool. Unknown ids are a programming error, not a free pass. */
export function creditsFor(toolId: string): number {
  const price = CREDIT_PRICES[toolId];
  if (!price) throw new Error(`creditPricing: no credit price for tool "${toolId}"`);
  return price.credits;
}

/** True when a tool never costs credits (currently only the style quiz). */
export const isFreeTool = (toolId: string): boolean => creditsFor(toolId) === 0;

/**
 * The worst cost-per-credit across all metered tools — rule R1's ceiling. Every card must
 * sit at or under this, which is what makes a plan's worst case equal to `credits * CEILING`
 * regardless of how the customer spends. Derived, never hardcoded, so repricing a card
 * moves the ceiling and the test re-checks everything against it.
 */
export const COST_PER_CREDIT_CEILING: number = Object.values(CREDIT_PRICES)
  .filter((p) => p.credits > 0)
  .reduce((max, p) => Math.max(max, p.estCostUsd / p.credits), 0);

/** A realistic single-space pass — the yardstick used to size packs. Never an allowance. */
export const CREDITS_PER_SPACE = 140;

export type PlanId = 'free' | 'starter' | 'project' | 'project-plus' | 'monthly';

export interface CreditPlan {
  id: PlanId;
  /** Card title — names the BILLING SHAPE, never the audience (see R4 and the mockup). */
  card: string;
  /** Rung label inside the card, when the card holds more than one size. */
  rung?: string;
  priceUsd: number;
  /**
   * Recurring plans only — the yearly price. This is what makes the subscription worth
   * taking for a volume user: on credits alone a pack is always better value than paying
   * monthly (R2 forces a month to be worse per credit than Project), so the annual price
   * is the rung that beats buying packs outright. Paying month-to-month is a deliberate
   * premium for flexibility, defended by the commercial licence, clean exports,
   * white-label PDF and a business invoice — none of which a pack carries.
   */
  annualPriceUsd?: number;
  credits: number;
  /** Pay-once credits never expire; monthly refills and does not roll over. */
  recurring: boolean;
  /** Personal, non-commercial use vs use in the course of business — rule R7. */
  commercialUse: boolean;
}

export const CREDIT_PLANS: CreditPlan[] = [
  { id: 'free', card: 'Free', priceUsd: 0, credits: 50, recurring: false, commercialUse: false },
  { id: 'starter', card: 'One-time payment', rung: 'Starter', priceUsd: 39, credits: 400, recurring: false, commercialUse: false },
  { id: 'project', card: 'One-time payment', rung: 'Project', priceUsd: 129, credits: 3000, recurring: false, commercialUse: false },
  { id: 'project-plus', card: 'One-time payment', rung: 'Project Plus', priceUsd: 249, credits: 6500, recurring: false, commercialUse: false },
  { id: 'monthly', card: 'Monthly subscription', priceUsd: 49, annualPriceUsd: 470, credits: 1000, recurring: true, commercialUse: true },
];

export const planById = (id: PlanId): CreditPlan | undefined =>
  CREDIT_PLANS.find((p) => p.id === id);

/** Credits per dollar — the number rules R2 and R3 are expressed in. Free has no rate. */
export function creditsPerDollar(plan: CreditPlan): number {
  return plan.priceUsd === 0 ? Infinity : plan.credits / plan.priceUsd;
}

/**
 * The most a plan's credits can cost us, whatever the customer spends them on. Because
 * every card sits under the ceiling (R1), this single number bounds the entire downside.
 */
export function worstCaseCostUsd(plan: CreditPlan): number {
  return plan.credits * COST_PER_CREDIT_CEILING;
}

/**
 * What a year on a plan costs, taking the annual price when the plan has one. Used by the
 * R2 guard: the annual subscription must beat buying the equivalent credits as packs, or
 * a volume user has no reason to subscribe at all.
 */
export function annualCostUsd(plan: CreditPlan): number {
  if (!plan.recurring) return plan.priceUsd;
  return plan.annualPriceUsd ?? plan.priceUsd * 12;
}
