/**
 * Legacy WordPress → React/Vite redirect map (GSC unindexed-pages fix, 2026-07-10).
 *
 * Background: Google Search Console flagged 23 legacy WordPress URLs as
 * "Crawled — currently not indexed" (first seen 2023-09-26, all predate the SPA
 * rebuild). They waste crawl budget and drag the indexation ratio down. This
 * module maps every dead legacy path to its canonical modern equivalent with a
 * 301, and returns 410 Gone for old WP assets (Google drops a 410 from the index
 * faster than a 404). See _Memory/2026-07-10-website-gsc-unindexed-fix-handoff.md.
 *
 * Mounted in server.ts BEFORE the robots/sitemap block and the SPA fallback, so
 * legacy paths resolve identically in dev and prod and never reach the SPA.
 *
 * Matching notes:
 *  - `req.path` excludes the query string / hash, so we only match the pathname.
 *  - Matching is case-insensitive and tolerant of a single trailing slash, so
 *    both `/blog` and `/blog/` (and `/BLOG/`) hit the same rule.
 *  - Prefix rules match the base path itself AND any child under it
 *    (`/hy` and `/hy/contacts/` both → `/`).
 *  - None of these legacy paths collide with a live SPA route: real portfolio
 *    detail routes use numeric IDs (`/portfolio/0022`), not the old WP slugs.
 */

import type { Request, Response, NextFunction } from "express";

export interface RedirectResult {
  /** 301 for a permanent move, 410 for a permanently-gone asset. */
  status: 301 | 410;
  /** Canonical target path for a 301. Absent for a 410. */
  target?: string;
}

/**
 * Prefix rules: the base path OR any descendant under it redirects to `target`.
 * Bases are stored WITHOUT a trailing slash. `/hy` covers `/hy` and `/hy/*`.
 */
const PREFIX_REDIRECTS: ReadonlyArray<{ base: string; target: string }> = [
  { base: "/blog", target: "/journal" }, // old WP blog (incl. /blog/page/N)
  { base: "/category", target: "/journal" }, // old WP category archives
  { base: "/portfolio-category", target: "/portfolio" }, // old WP portfolio archives
];

/** Exact-path rules: one legacy URL → one canonical target. */
const EXACT_REDIRECTS: Readonly<Record<string, string>> = {
  // Retired 2026-09-08: the standalone AI Vision marketing page was superseded
  // by the AI Studio, which carries the live tool. The URL was in the sitemap at
  // priority 0.8 and linked from every journal article, so it redirects rather
  // than 404s — bookmarks and any indexed result land on the working page.
  "/ai-vision": "/ai-concepts",
  "/free-consultation": "/consultation",
  "/contact-us-arm": "/studio", // no /contact route exists; /studio carries brand + contact
  "/portfolio/family-fun-center": "/portfolio",
  "/portfolio/wine-cellar-home": "/portfolio",
  "/portfolio/roundhill-contemporary-house": "/portfolio",
  "/alternative-home-designs-atriums": "/journal",
  "/interior-photography": "/journal",
  // Armenian locale root. The site is EN-only; the root has a true equivalent
  // (the English home page). Every CHILD of /hy is 410 — see GONE_CHILD_PREFIXES.
  "/hy": "/",
  // Old WordPress pages that have a genuine modern equivalent (2026-10-19 GSC audit).
  "/about-us": "/studio",
  "/contacts": "/studio",
  "/faqs": "/faq",
  "/privacy-policy": "/privacy",
  "/projects": "/portfolio",
  // Old WP portfolio slugs. Real portfolio URLs are numeric ids (/portfolio/14),
  // so none of these resolve to a project; send them to the index.
  "/portfolio/coffee-cafe-design": "/portfolio",
  "/portfolio/nyc-apartment-design": "/portfolio",
  "/portfolio/small-apartment-design": "/portfolio",
  "/portfolio/traditional-home": "/portfolio",
  "/portfolio/industrial-loft-office": "/portfolio",
  "/portfolio/mountain-ski-house": "/portfolio",
};

/** Prefixes served as 410 Gone (permanently removed assets, not redirected). */
const GONE_PREFIXES: ReadonlyArray<string> = [
  "/wp-content",
  "/wp-includes",
  "/wp-admin",
  "/wp-json",
];

/**
 * Prefixes whose CHILDREN are 410 Gone (the base path itself is handled by an
 * exact rule). `/hy/*` is the retired Armenian locale: there is no Armenian site
 * and none of its pages has an equivalent, so redirecting them all to the home
 * page would be read by Google as a soft-404 and keep them on its re-check list.
 */
const GONE_CHILD_PREFIXES: ReadonlyArray<string> = ["/hy"];

/**
 * Exact paths served as 410 Gone: old WordPress articles with no modern
 * equivalent (a redirect to a generic page would be a soft-404).
 */
const GONE_EXACT: ReadonlySet<string> = new Set([
  "/kitchen-planning",
  "/atriums-in-homes",
  "/accessory-dwelling-unit",
  "/thoughtful-floor-planning",
  "/mountian-house", // sic — the original WP slug was misspelled
  "/how-to-measure-room",
  "/how-to-organize-bookshelf",
  "/stylish-single-family-home",
  "/apartment-with-brick-wall-charm",
]);

/**
 * Resolve a legacy path to its redirect action, or null if nothing matches
 * (the request should fall through to the normal SPA/SEO pipeline).
 * Pure + side-effect free so it can be unit-tested per rule.
 */
export function matchLegacyRedirect(rawPath: string): RedirectResult | null {
  if (!rawPath || typeof rawPath !== "string") return null;

  // Normalize: lowercase + strip a single trailing slash (but keep root "/").
  let p = rawPath.toLowerCase();
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);

  // 1) 410 Gone — legacy WordPress assets.
  for (const base of GONE_PREFIXES) {
    if (p === base || p.startsWith(base + "/")) return { status: 410 };
  }

  // 1b) 410 Gone — WP feeds, retired locale children, retired WP articles.
  if (p.endsWith("/feed") || GONE_EXACT.has(p)) return { status: 410 };
  for (const base of GONE_CHILD_PREFIXES) {
    if (p.startsWith(base + "/")) return { status: 410 };
  }

  // 2) Exact legacy → canonical 301s.
  const exact = EXACT_REDIRECTS[p];
  if (exact) return { status: 301, target: exact };

  // 3) Prefix (wildcard) legacy → canonical 301s.
  for (const { base, target } of PREFIX_REDIRECTS) {
    if (p === base || p.startsWith(base + "/")) return { status: 301, target };
  }

  return null;
}

/**
 * Express middleware applying the legacy redirect map. Mount BEFORE robots.txt,
 * the static handler, and the SPA catch-all.
 */
export function legacyRedirects(req: Request, res: Response, next: NextFunction): void {
  // WordPress site-search URLs (`/?s=…`). The site has no search endpoint; Google
  // remembers the old WP SearchAction template `/?s={search_term_string}`.
  if (req.path === "/" && req.query && "s" in req.query) {
    res.status(410).type("text/plain").send("Gone");
    return;
  }
  const hit = matchLegacyRedirect(req.path);
  if (!hit) {
    next();
    return;
  }
  if (hit.status === 410) {
    res.status(410).type("text/plain").send("Gone");
    return;
  }
  res.redirect(301, hit.target as string);
}

/**
 * Canonicalize trailing slashes: `/portfolio/` → `/portfolio` (301), preserving
 * the query string. Kills duplicate slash/non-slash URLs at the source so Google
 * sees one canonical path per page (stronger than relying on the canonical tag).
 *
 * Skips the root `/`, anything already without a trailing slash, and `/api/*`
 * (API routes are matched exactly and must not be rewritten). Mount AFTER
 * legacyRedirects (so `/blog/` hits the legacy rule directly) and before the SPA.
 */
export function trailingSlashRedirect(req: Request, res: Response, next: NextFunction): void {
  const p = req.path;
  if (p.length > 1 && p.endsWith("/") && !p.startsWith("/api/")) {
    const q = req.url.slice(p.length); // preserve ?query / #hash
    res.redirect(301, p.replace(/\/+$/, "") + q);
    return;
  }
  next();
}
