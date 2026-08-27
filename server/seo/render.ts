/**
 * Per-request HTML enrichment for the SPA shell.
 *
 * Reads dist/index.html ONCE at startup (cached string), then for each request:
 *   1. strips the build's placeholder <title>/description/OG/Twitter/canonical,
 *   2. injects the route-resolved head tags + JSON-LD before </head>,
 *   3. injects a minimal text prerender inside #root for /, /services, /faq,
 *      /listing-photos, and the journal routes.
 *
 * The SAME enriched HTML goes to bots and humans (no cloaking). React mounts with
 * createRoot().render() (not hydrate), so it cleanly replaces the prerender
 * markup on boot — no hydration-mismatch risk. Existing preload/hero <link> tags
 * are left untouched.
 */
import { readFileSync } from "fs";
import {
  classifyRoute,
  buildMeta,
  resolveProject,
  resolvePost,
  resolveCategory,
  resolveCategoryPosts,
  type RouteInfo,
  type RouteMeta,
  type JournalData,
} from "./meta.js";
import { buildJsonLd } from "./jsonld.js";
import { escapeAttr, escapeHtml, jsonLdScriptBody } from "./escape.js";
import { BUSINESS } from "./config.js";
import {
  HOME_COPY,
  SERVICES_COPY,
  FAQ_COPY,
  JOURNAL_COPY,
  LISTING_PHOTOS_COPY,
  type PrerenderCopy,
} from "./content.js";
import { FAQ_SECTIONS } from "../../src/data/faqs.js";
import { LISTING_PHOTOS_FAQ } from "../../src/data/listingPhotosFaq.js";

// ── Template loading (read once, cache) ────────────────────────────────────
let templateCache: string | null = null;

export function loadTemplate(distPath = "dist/index.html"): string {
  if (templateCache == null) {
    templateCache = readFileSync(distPath, "utf8");
  }
  return templateCache;
}

/** Test hook: inject a template string and bypass disk reads. */
export function __setTemplateForTest(html: string | null): void {
  templateCache = html;
}

// ── Head tag construction ──────────────────────────────────────────────────
function metaTag(attrName: "name" | "property", key: string, value: string): string {
  return `    <meta ${attrName}="${key}" content="${escapeAttr(value)}" />`;
}

function buildHeadTags(meta: RouteMeta, ogType: string): string {
  const lines: string[] = [];
  lines.push(`    <title>${escapeHtml(meta.title)}</title>`);
  lines.push(metaTag("name", "description", meta.description));
  lines.push(`    <link rel="canonical" href="${escapeAttr(meta.canonical)}" />`);
  if (meta.noindex) {
    lines.push(metaTag("name", "robots", "noindex,nofollow"));
  }
  // Open Graph
  lines.push(metaTag("property", "og:type", ogType));
  lines.push(metaTag("property", "og:site_name", BUSINESS.name));
  lines.push(metaTag("property", "og:url", meta.canonical));
  lines.push(metaTag("property", "og:title", meta.ogTitle));
  lines.push(metaTag("property", "og:description", meta.ogDescription));
  lines.push(metaTag("property", "og:image", meta.ogImage));
  // Twitter
  lines.push(metaTag("name", "twitter:card", "summary_large_image"));
  lines.push(metaTag("name", "twitter:url", meta.canonical));
  lines.push(metaTag("name", "twitter:title", meta.ogTitle));
  lines.push(metaTag("name", "twitter:description", meta.ogDescription));
  lines.push(metaTag("name", "twitter:image", meta.ogImage));
  return lines.join("\n");
}

function buildJsonLdScripts(nodes: Record<string, unknown>[]): string {
  return nodes
    .map(
      (node) =>
        `    <script type="application/ld+json">${jsonLdScriptBody(node)}</script>`
    )
    .join("\n");
}

// ── Prerender (minimal, text-first) ────────────────────────────────────────
function prerenderCopyBlock(copy: PrerenderCopy): string {
  const parts: string[] = [];
  if (copy.eyebrow) parts.push(`<p>${escapeHtml(copy.eyebrow)}</p>`);
  parts.push(`<h1>${escapeHtml(copy.headline)}</h1>`);
  parts.push(`<p>${escapeHtml(copy.intro)}</p>`);
  return parts.join("");
}

function prerenderFaq(): string {
  const items = FAQ_SECTIONS.flatMap((section) =>
    section.items.map(
      (item) =>
        `<div><h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p></div>`
    )
  ).join("");
  return `<h2>Frequently Asked Questions</h2>${items}`;
}

/**
 * M-001 — /listing-photos Q&As for JS-less crawlers, from the same source the
 * page's accordion and the FAQPage schema use. The accordion collapses all but
 * one answer in the DOM, so without this a crawler would see one answer.
 */
function prerenderListingPhotosFaq(): string {
  const items = LISTING_PHOTOS_FAQ.map(
    (item) => `<div><h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p></div>`
  ).join("");
  return `<h2>Questions we get from hosts and agents</h2>${items}`;
}

/**
 * Reduce markdown to plain-text paragraphs for the crawler prerender. Strips
 * fences, headings, list/quote markers, emphasis, and link/image syntax (keeping
 * the visible text). Not a full parser — just enough that a JS-less crawler reads
 * the article's actual words.
 */
function markdownToParagraphs(md: string): string[] {
  const noCode = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    // Journal "[studio]…[/studio]" note markers: keep the quote text, drop the tags
    // so JS-less crawlers never see the literal markers.
    .replace(/\[\/?studio\]/g, " ");
  return noCode
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+\.\s+/gm, "")
        .replace(/^\s*>\s?/gm, "")
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

/** Prerender for a single article: title, excerpt, body text, FAQ. */
function prerenderJournalDetail(journal?: JournalData): string {
  const post = journal?.post;
  if (!post) return "";
  const parts: string[] = [`<h1>${escapeHtml(post.title)}</h1>`];
  if (post.excerpt) parts.push(`<p>${escapeHtml(post.excerpt)}</p>`);
  if (post.body) {
    const body = markdownToParagraphs(post.body)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("");
    if (body) parts.push(`<div>${body}</div>`);
  }
  const faq = post.seo?.faq ?? [];
  if (faq.length) {
    const items = faq
      .map((f) => `<div><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></div>`)
      .join("");
    parts.push(`<h2>Frequently asked questions</h2>${items}`);
  }
  return parts.join("");
}

/** Prerender for a category page: title, description, list of post titles. */
function prerenderJournalCategory(journal?: JournalData): string {
  const category = journal?.category;
  if (!category) return "";
  const parts: string[] = [`<h1>${escapeHtml(category.title)}</h1>`];
  if (category.description) parts.push(`<p>${escapeHtml(category.description)}</p>`);
  const posts = journal?.categoryPosts ?? [];
  if (posts.length) {
    const items = posts
      .map(
        (p) =>
          `<li><a href="/journal/${escapeAttr(encodeURIComponent(p.slug))}">${escapeHtml(
            p.title
          )}</a></li>`
      )
      .join("");
    parts.push(`<ul>${items}</ul>`);
  }
  return parts.join("");
}

/** Inner HTML injected into #root for JS-less crawlers ('' = no prerender). */
function buildPrerender(info: RouteInfo, journal?: JournalData): string {
  let body = "";
  switch (info.key) {
    case "home":
      body = prerenderCopyBlock(HOME_COPY);
      break;
    case "services":
      body = prerenderCopyBlock(SERVICES_COPY);
      break;
    case "faq":
      body = prerenderCopyBlock(FAQ_COPY) + prerenderFaq();
      break;
    case "listingPhotos":
      body = prerenderCopyBlock(LISTING_PHOTOS_COPY) + prerenderListingPhotosFaq();
      break;
    case "journalIndex":
      body = prerenderCopyBlock(JOURNAL_COPY);
      break;
    case "journalDetail":
      body = prerenderJournalDetail(journal);
      break;
    case "journalCategory":
      body = prerenderJournalCategory(journal);
      break;
    default:
      return "";
  }
  if (!body) return "";
  // Wrapped so it's obvious in view-source that the SPA replaces this on mount.
  return `<div data-seo-prerender="true">${body}</div>`;
}

// ── Injection ──────────────────────────────────────────────────────────────
/** Remove the build's static SEO tags so ours are the only ones. */
function stripExistingSeo(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+(?:property|name)=["'](?:og:|twitter:)[^"']*["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");
}

const ROOT_DIV = '<div id="root"></div>';

/**
 * Enrich a template string for a route. `meta`/`nodes` are injectable so tests
 * (and the request path) don't recompute them. Pure + synchronous.
 */
export function renderHtmlFromTemplate(
  template: string,
  info: RouteInfo,
  project?: import("../../src/constants").ProjectData | null,
  precomputed?: { meta?: RouteMeta; nodes?: Record<string, unknown>[] },
  journal?: JournalData
): string {
  const meta = precomputed?.meta ?? buildMeta(info, project, journal);
  const nodes = precomputed?.nodes ?? buildJsonLd(info, project, journal);
  const ogType =
    info.key === "portfolioDetail" || info.key === "journalDetail" ? "article" : "website";

  const head = [buildHeadTags(meta, ogType), buildJsonLdScripts(nodes)]
    .filter(Boolean)
    .join("\n");

  let html = stripExistingSeo(template);
  const injection = `\n    <!-- SEO (server-injected) -->\n${head}\n  </head>`;
  if (html.includes("</head>")) {
    html = html.replace("</head>", injection);
  } else {
    // Extremely defensive: no </head> found — prepend so tags still ship.
    html = head + html;
  }

  const prerender = buildPrerender(info, journal);
  if (prerender && html.includes(ROOT_DIV)) {
    html = html.replace(ROOT_DIV, `<div id="root">${prerender}</div>`);
  }

  return html;
}

/** Resolve a pathname to fully enriched HTML (reads cached template + Sanity). */
export async function renderRoute(
  pathname: string,
  distPath?: string
): Promise<string> {
  const info = classifyRoute(pathname);

  const project =
    info.key === "portfolioDetail" && info.projectId
      ? await resolveProject(info.projectId)
      : null;

  // Resolve journal data (post / category + its posts) for the blog routes.
  let journal: JournalData | undefined;
  if (info.key === "journalDetail" && info.slug) {
    journal = { post: await resolvePost(info.slug) };
  } else if (info.key === "journalCategory" && info.slug) {
    const [category, categoryPosts] = await Promise.all([
      resolveCategory(info.slug),
      resolveCategoryPosts(info.slug),
    ]);
    journal = { category, categoryPosts };
  }

  const template = loadTemplate(distPath);
  return renderHtmlFromTemplate(template, info, project, undefined, journal);
}
