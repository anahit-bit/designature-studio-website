/**
 * Per-request HTML enrichment for the SPA shell.
 *
 * Reads dist/index.html ONCE at startup (cached string), then for each request:
 *   1. strips the build's placeholder <title>/description/OG/Twitter/canonical,
 *   2. injects the route-resolved head tags + JSON-LD before </head>,
 *   3. injects a minimal text prerender inside #root for /, /services, /faq.
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
  type RouteInfo,
  type RouteMeta,
} from "./meta.js";
import { buildJsonLd } from "./jsonld.js";
import { escapeAttr, escapeHtml, jsonLdScriptBody } from "./escape.js";
import { BUSINESS } from "./config.js";
import { HOME_COPY, SERVICES_COPY, FAQ_COPY, type PrerenderCopy } from "./content.js";
import { FAQ_SECTIONS } from "../../src/data/faqs.js";

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

/** Inner HTML injected into #root for JS-less crawlers ('' = no prerender). */
function buildPrerender(info: RouteInfo): string {
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
    default:
      return "";
  }
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
  precomputed?: { meta?: RouteMeta; nodes?: Record<string, unknown>[] }
): string {
  const meta = precomputed?.meta ?? buildMeta(info, project);
  const nodes = precomputed?.nodes ?? buildJsonLd(info, project);
  const ogType = info.key === "portfolioDetail" ? "article" : "website";

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

  const prerender = buildPrerender(info);
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
  const template = loadTemplate(distPath);
  return renderHtmlFromTemplate(template, info, project);
}
