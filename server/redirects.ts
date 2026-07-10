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
  { base: "/hy", target: "/" }, // Armenian locale — site is EN-only now
  { base: "/blog", target: "/journal" }, // old WP blog (incl. /blog/page/N)
  { base: "/category", target: "/journal" }, // old WP category archives
];

/** Exact-path rules: one legacy URL → one canonical target. */
const EXACT_REDIRECTS: Readonly<Record<string, string>> = {
  "/free-consultation": "/consultation",
  "/contact-us-arm": "/studio", // no /contact route exists; /studio carries brand + contact
  "/portfolio/family-fun-center": "/portfolio",
  "/portfolio/wine-cellar-home": "/portfolio",
  "/portfolio/roundhill-contemporary-house": "/portfolio",
  "/alternative-home-designs-atriums": "/journal",
  "/interior-photography": "/journal",
};

/** Prefixes served as 410 Gone (permanently removed assets, not redirected). */
const GONE_PREFIXES: ReadonlyArray<string> = ["/wp-content"];

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
