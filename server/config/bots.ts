/**
 * Single source of truth for the AI + search crawlers we explicitly welcome.
 *
 * Reused by:
 *   - the dynamic /robots.txt route (server.ts) — emits an Allow block per bot
 *   - the prerender path (server/seo/render.ts) — decides whether a request is a
 *     crawler. NOTE: we serve the SAME enriched HTML to bots and humans (no
 *     user-agent cloaking); `isCrawler()` exists only for optional logging /
 *     future tuning, never to branch the response body.
 *
 * When a new crawler needs allowing, add it here and BOTH robots.txt and any
 * detection logic pick it up automatically.
 */

/** User-agent tokens (case-insensitive substring match) we want indexing us. */
export const ALLOWED_BOTS = [
  // ── AI answer engines / model crawlers ──────────────────────────────────
  "GPTBot", // OpenAI training crawler
  "OAI-SearchBot", // OpenAI ChatGPT search index
  "ChatGPT-User", // OpenAI on-demand fetch (user asked ChatGPT to browse)
  "PerplexityBot", // Perplexity index
  "Perplexity-User", // Perplexity on-demand fetch
  "ClaudeBot", // Anthropic crawler
  "Claude-User", // Anthropic on-demand fetch
  "anthropic-ai", // legacy Anthropic token
  "Google-Extended", // Google Gemini / Vertex training + grounding
  "Applebot-Extended", // Apple AI training
  // ── Classic search engines ──────────────────────────────────────────────
  "Googlebot",
  "Bingbot",
  "Applebot",
  "DuckDuckBot",
  "Slurp", // Yahoo
  "YandexBot",
] as const;

export type AllowedBot = (typeof ALLOWED_BOTS)[number];

/** Paths no crawler should index (private / transactional / API surface). */
export const DISALLOWED_PATHS = ["/admin", "/api"] as const;

/**
 * True when the request User-Agent looks like one of our allowed crawlers.
 * Case-insensitive substring match — UA strings embed the bot token alongside
 * version/URL noise (e.g. "Mozilla/5.0 ... GPTBot/1.2; +https://...").
 *
 * This is intentionally NOT used to change the response body — both bots and
 * humans receive the identical prerendered HTML.
 */
export function isCrawler(userAgent: string | undefined | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return ALLOWED_BOTS.some((bot) => ua.includes(bot.toLowerCase()));
}

/**
 * Build the robots.txt body from the bot list above.
 * @param sitemapUrl absolute URL of the sitemap to advertise.
 */
export function buildRobotsTxt(sitemapUrl: string): string {
  const lines: string[] = [];

  // Explicitly welcome each allowed crawler, but still keep private areas out.
  for (const bot of ALLOWED_BOTS) {
    lines.push(`User-agent: ${bot}`);
    lines.push("Allow: /");
    for (const path of DISALLOWED_PATHS) lines.push(`Disallow: ${path}`);
    lines.push("");
  }

  // Everyone else: allowed to crawl public pages, blocked from private areas.
  lines.push("User-agent: *");
  lines.push("Allow: /");
  for (const path of DISALLOWED_PATHS) lines.push(`Disallow: ${path}`);
  lines.push("");

  lines.push(`Sitemap: ${sitemapUrl}`);
  lines.push("");

  return lines.join("\n");
}
