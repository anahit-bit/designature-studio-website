/**
 * FALLBACK ONLY — live data comes from Sanity (see src/lib/sanity.ts
 * fetchRetailers + RetailersContext). Update only if Sanity becomes
 * permanently unavailable or for v1 dev when Sanity isn't seeded yet.
 *
 * Retailer registry for the shopping list feature.
 *
 * For free tier we ship a fixed list of 10 designer-favorite US retailers,
 * announced upfront in the UI as a logo strip. Paid tiers will later route
 * through a richer Retail DB (E:/Business/Claude/Retail/inputs/) — see
 * project_shopping_list_strategy.md in memory.
 *
 * Logo source for v1: Google's favicon service. Lightweight, instant, no
 * asset management — sized at 64px so the rendered 32×32 stays sharp. To
 * upgrade quality later, drop SVGs into /public/retailers/<domain>.svg and
 * update getLogoUrl() to prefer those.
 */

export interface Retailer {
  /** Display name (used in alt text + tooltip). */
  name: string;
  /** Domain — drives the favicon URL and the Serper site filter. */
  domain: string;
}

export const FREE_TIER_RETAILERS: Retailer[] = [
  { name: 'West Elm',        domain: 'westelm.com' },
  { name: 'CB2',             domain: 'cb2.com' },
  { name: 'Crate & Barrel',  domain: 'crateandbarrel.com' },
  { name: 'Pottery Barn',    domain: 'potterybarn.com' },
  { name: 'Article',         domain: 'article.com' },
  { name: 'AllModern',       domain: 'allmodern.com' },
  { name: 'IKEA',            domain: 'ikea.com' },
  { name: 'Wayfair',         domain: 'wayfair.com' },
  { name: 'Desenio',         domain: 'desenio.com' },
  { name: 'Society6',        domain: 'society6.com' },
];

/**
 * Retailer logos are now SELF-HOSTED on Cloudinary (asset_folder "Retailers",
 * public_id `retailer-<slug>`, slug = first domain label). This drops the live
 * Google-favicon dependency (B5 audit). Uploaded via scripts/upload-shopping-assets.mjs.
 * Unknown domains fall back to the Google favicon so the strip never breaks;
 * RetailerLogoStrip additionally text-falls-back on <img> error.
 */
const CLOUDINARY_LOGO_BASE = 'https://res.cloudinary.com/dys2k5muv/image/upload';
/** Retailer slugs with a self-hosted Cloudinary logo. */
const SELF_HOSTED_LOGOS = new Set([
  'westelm', 'crateandbarrel', 'article', 'kavehome', 'bludot', 'allmodern',
  'cb2', 'potterybarn', 'ikea', 'wayfair', 'desenio', 'society6',
]);

export function getLogoUrl(domain: string): string {
  const slug = domain.split('.')[0];
  if (SELF_HOSTED_LOGOS.has(slug)) return `${CLOUDINARY_LOGO_BASE}/retailer-${slug}.png`;
  // Fallback for any retailer we haven't self-hosted yet.
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}
