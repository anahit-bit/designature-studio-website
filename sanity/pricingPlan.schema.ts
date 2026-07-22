/**
 * Sanity schema — `pricingPlan` (subscription storefront pricing).
 *
 * ⚠️ REFERENCE ARTIFACT FOR THE SANITY STUDIO — NOT WEBSITE RUNTIME CODE.
 * The Studio lives in a SEPARATE repo (Portfolio entity, projectId 305mgeeu).
 * To activate: copy this object into the studio's `schemas/` folder, wrap it in
 * `defineType(...)` (import from 'sanity'), and register it in the schema `types`
 * array, then deploy the studio. It is exported as a plain object here on purpose
 * so it type-checks inside THIS repo without the studio-only `sanity` dependency.
 *
 * The website reads these docs via fetchPricingPlans() in src/lib/sanity.ts;
 * until docs are published it uses the offline fallback in
 * src/data/pricingPlans.ts.
 *
 * IMPORTANT (grandfathering): editing a price here changes the STOREFRONT price
 * and what NEW subscribers pay. It must NEVER change what an existing subscriber
 * is charged — their amount is locked in the `subscriptions` DB row at signup.
 *
 * Anonymous-read rule: the website reads the public CDN with no token, so each
 * doc's `_id` must be hyphenated (e.g. `pricingPlan-design`), never dotted.
 */

export const pricingPlanSchema = {
  name: 'pricingPlan',
  title: 'Pricing Plan',
  type: 'document',
  fields: [
    {
      name: 'key',
      title: 'Plan key (stable — do not change)',
      type: 'string',
      description: 'Referenced by code + stored on subscriptions. Never edit after launch.',
      options: { list: [{ title: 'Design', value: 'design' }, { title: 'Studio', value: 'studio' }] },
      validation: (r: any) => r.required(),
    },
    { name: 'name', title: 'Display name', type: 'string', validation: (r: any) => r.required() },
    {
      name: 'monthlyPriceUsd',
      title: 'Monthly price (USD)',
      type: 'number',
      validation: (r: any) => r.required().positive(),
    },
    {
      name: 'annualPriceUsd',
      title: 'Annual price (USD)',
      type: 'number',
      description: 'Typically 10× monthly (two months free).',
      validation: (r: any) => r.required().positive(),
    },
    { name: 'features', title: 'Feature bullets', type: 'array', of: [{ type: 'string' }] },
    {
      name: 'quotas',
      title: 'Per-period quotas',
      type: 'object',
      description: 'Allowances per billing period (drives plan gating).',
      fields: [
        { name: 'generations', title: 'AI generations', type: 'number', validation: (r: any) => r.required().min(0) },
        { name: 'audits', title: 'Room audits', type: 'number', validation: (r: any) => r.required().min(0) },
        { name: 'shopping', title: 'Shopping searches', type: 'number', validation: (r: any) => r.required().min(0) },
      ],
    },
    { name: 'active', title: 'Active (show on site)', type: 'boolean', initialValue: true },
    { name: 'order', title: 'Sort order', type: 'number', initialValue: 1 },
  ],
  orderings: [{ title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', monthly: 'monthlyPriceUsd', active: 'active' },
    prepare({ title, monthly, active }: { title?: string; monthly?: number; active?: boolean }) {
      return { title: `${title}${active ? '' : ' (hidden)'}`, subtitle: monthly ? `$${monthly}/mo` : '' }
    },
  },
}

export default pricingPlanSchema
