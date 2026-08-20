/**
 * Dynamic sitemap.xml builder.
 *
 * Includes every public static route plus portfolio project detail pages fetched
 * from Sanity. Cached ~1h in memory. If Sanity is unreachable the sitemap still
 * returns with the static routes (never 500s).
 *
 * EXTENDING (e.g. Phase-2 blog): add one entry to `getDynamicEntries()` that
 * pushes `{ path, lastmod }` for each slug — see the marked spot below.
 */
import { fetchProjects, fetchPosts, fetchCategories } from "../../src/lib/sanity.js";
import { absUrl } from "./config.js";
import { escapeXml } from "./escape.js";

export interface SitemapEntry {
  path: string;
  lastmod?: string; // ISO date (YYYY-MM-DD)
  changefreq?: string;
  priority?: number;
}

/** Public static routes in sitemap scope (private/transactional excluded). */
export const STATIC_SITEMAP_ROUTES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/portfolio", changefreq: "weekly", priority: 0.9 },
  { path: "/services", changefreq: "monthly", priority: 0.9 },
  { path: "/studio", changefreq: "monthly", priority: 0.7 },
  { path: "/deliverables", changefreq: "weekly", priority: 0.8 },
  { path: "/ai-concepts", changefreq: "weekly", priority: 0.9 },
  { path: "/ai-vision", changefreq: "weekly", priority: 0.8 },
  { path: "/pricing", changefreq: "monthly", priority: 0.8 },
  { path: "/faq", changefreq: "monthly", priority: 0.6 },
  { path: "/journal", changefreq: "weekly", priority: 0.8 },
  { path: "/consultation", changefreq: "monthly", priority: 0.6 },
  { path: "/terms", changefreq: "yearly", priority: 0.2 },
  { path: "/privacy", changefreq: "yearly", priority: 0.2 },
  { path: "/refund", changefreq: "yearly", priority: 0.2 },
];

/** Convert an arbitrary date-ish string to `YYYY-MM-DD`, or undefined. */
function toLastmod(date?: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/** Fetch dynamic (CMS-backed) entries. Tolerant of Sanity being down. */
async function getDynamicEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  // ── Portfolio projects ────────────────────────────────────────────────
  try {
    const projects = await fetchProjects();
    for (const p of projects) {
      entries.push({
        path: `/portfolio/${encodeURIComponent(p.id)}`,
        lastmod: toLastmod(p.date),
        changefreq: "monthly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn(
      "[seo] sitemap: Sanity fetch failed, serving static routes only:",
      (err as Error)?.message
    );
  }

  // ── Journal posts (Phase 2) ───────────────────────────────────────────
  try {
    const posts = await fetchPosts();
    for (const post of posts) {
      if (!post.slug) continue;
      entries.push({
        path: `/journal/${encodeURIComponent(post.slug)}`,
        lastmod: toLastmod(post.publishedAt),
        changefreq: "monthly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn(
      "[seo] sitemap: journal posts fetch failed, skipping:",
      (err as Error)?.message
    );
  }

  // ── Journal categories (Phase 2) ──────────────────────────────────────
  try {
    const categories = await fetchCategories();
    for (const cat of categories) {
      if (!cat.slug) continue;
      entries.push({
        path: `/journal/category/${encodeURIComponent(cat.slug)}`,
        changefreq: "weekly",
        priority: 0.5,
      });
    }
  } catch (err) {
    console.warn(
      "[seo] sitemap: journal categories fetch failed, skipping:",
      (err as Error)?.message
    );
  }

  return entries;
}

function renderXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${escapeXml(absUrl(e.path))}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (typeof e.priority === "number")
        parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// ── In-memory cache (~1h) ─────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000;
let cached: { xml: string; at: number } | null = null;

/** Build (or serve cached) sitemap XML. `now` is injectable for tests. */
export async function buildSitemap(now: number = Date.now()): Promise<string> {
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.xml;
  const dynamic = await getDynamicEntries();
  const xml = renderXml([...STATIC_SITEMAP_ROUTES, ...dynamic]);
  cached = { xml, at: now };
  return xml;
}

/** Test/ops helper — drop the cache so the next build refetches. */
export function clearSitemapCache(): void {
  cached = null;
}

/** Pure renderer exposed for unit tests. */
export { renderXml as renderSitemapXml };
