# SEO / GEO — Phase 1 (Crawlability Foundation)

This documents the server-side SEO layer added so AI + search crawlers (which
don't run JS) get real content, metadata, and structured data from the
client-rendered React SPA — **without** migrating frameworks and **without**
user-agent cloaking (bots and humans receive the identical enriched HTML).

## What was added

| File | Role |
|---|---|
| `server/config/bots.ts` | **Single source of truth** for the allowed bot list + `robots.txt` generator + `isCrawler()` |
| `server/seo/config.ts` | Business/NAP facts + canonical base + core-services catalog |
| `server/seo/escape.ts` | HTML / attribute / XML / JSON-LD escaping |
| `server/seo/meta.ts` | Route → `{title, description, canonical, og*}` resolver (+ noindex) |
| `server/seo/jsonld.ts` | JSON-LD builders (Organization, LocalBusiness, WebSite, BreadcrumbList, FAQPage) |
| `server/seo/sitemap.ts` | Dynamic `sitemap.xml` (static routes + Sanity slugs, 1h cache) |
| `server/seo/content.ts` | Prerender copy for `/`, `/services`, `/faq` |
| `server/seo/render.ts` | Reads `dist/index.html` once, injects head tags + JSON-LD + prerender per request |
| `src/data/faqs.ts` | FAQ content extracted so `FAQPage.tsx` **and** the FAQ JSON-LD/prerender share one source |

Wiring in `server.ts`: `GET /robots.txt` + `GET /sitemap.xml` are registered
before the dev/prod branch (work in both); in production the SPA catch-all now
calls `renderRoute()` instead of a raw `sendFile`.

## Routes covered

**Indexed (in sitemap + JSON-LD as applicable):**
`/`, `/portfolio`, `/portfolio/:id`, `/services`, `/studio`, `/ai-concepts`,
`/ai-vision`, `/pricing`, `/faq`, `/journal`, `/journal/:slug`,
`/journal/category/:slug`, `/consultation`, `/terms`, `/privacy`, `/refund`.

**`noindex` (excluded from sitemap):** `/admin*`, `/booking/*`, `/deliverables`
— plus any unknown path. These still serve the SPA normally.

## JSON-LD by route

- `/` → `Organization` + `LocalBusiness` (with `hasOfferCatalog` of core
  services) + `WebSite`.
- `/portfolio` → `BreadcrumbList`.
- `/portfolio/:id` → `BreadcrumbList` (Home › Portfolio › Project).
- `/faq` → `FAQPage`, generated from `src/data/faqs.ts` (matches the page 1:1).
- `/journal` → `Blog` + `BreadcrumbList`.
- `/journal/:slug` → `BlogPosting` (headline, author, datePublished/dateModified,
  image, articleSection, keywords) + `BreadcrumbList` (Home › Journal › [Category] ›
  Post) + `FAQPage` when the post has `seo.faq[]`.
- `/journal/category/:slug` → `CollectionPage` (with an `ItemList` of its posts) +
  `BreadcrumbList` (Home › Journal › Category).

## ⚠ Business data to confirm

`server/seo/config.ts` is populated from the live site (Footer phones/email/
socials, founding year, OG image). **Left intentionally omitted** (schema is
valid without them — do not invent): **street address**, **geo coordinates**,
**opening hours**. Add them to `BUSINESS` in `config.ts` when confirmed for a
richer `LocalBusiness`. Primary phone is the US line; the Armenian line
(`+374 93 86 03 64`) can be added as an additional `ContactPoint` if desired.

> The original task's "BUSINESS DATA" block was a blank placeholder, so these
> values were derived from the codebase rather than supplied.

## Journal / blog (Phase 2 — DONE)

The Journal (user-facing "Journal" at `/journal`; Sanity types stay `post` +
`category`) is now wired into every layer of this SEO stack. The data comes from
Sanity via `src/lib/sanity.ts` (`fetchPosts` / `fetchPost` / `fetchCategories`,
same cached/deduped pattern as `fetchProjects`), resolved server-side in
`meta.ts` (`resolvePost` / `resolveCategory` / `resolveCategoryPosts`). All CMS
reads are failure-tolerant — a Sanity outage degrades to a valid empty page /
sitemap, never a 500.

What's covered:

1. **Sitemap** — `server/seo/sitemap.ts` `getDynamicEntries()` pushes every
   published post (`/journal/:slug`, `lastmod = publishedAt`) and every category
   (`/journal/category/:slug`). `/journal` is a static route.
2. **Metadata** — `server/seo/meta.ts` `classifyRoute()` returns
   `journalIndex` / `journalDetail` / `journalCategory` (the last two carry a
   `slug`). `buildMeta()` resolves title/description/OG from the post or category,
   preferring `post.seo.metaTitle` / `metaDescription` when authored, and marks an
   unknown slug `noindex` (no soft-404). `/journal` copy lives in `STATIC_META`.
3. **JSON-LD** — `server/seo/jsonld.ts` emits `BlogPosting` + breadcrumb + optional
   `FAQPage` for an article, and `CollectionPage` + breadcrumb for a category
   (see "JSON-LD by route"). `buildMeta`/`buildJsonLd` take an optional third
   `JournalData` arg (`{ post?, category?, categoryPosts? }`).
4. **Prerender** — `server/seo/content.ts` holds `JOURNAL_COPY` (index) and
   `render.ts` prerenders the article title + excerpt + markdown-reduced body text
   + FAQ, and the category title + description + post-title list, into `#root`.
5. **robots.txt** — no change needed (journal is under the allowed `/`).

**To author a new indexed route in the journal family**, follow the same four
touch-points above; posts + categories flow automatically once published in Sanity
(`status == "published"`).

Comments (own, moderated) are a separate concern from SEO: `blog_comments` table
in `db/migrate.ts`, public `GET`/`POST /api/journal/:slug/comments`, and admin
moderation at `/admin/comments` (`GET /api/admin/comments` +
`POST /api/admin/comments/moderate`, gated by the admin session).

## How to extend the metadata map

Every public route's copy lives in `STATIC_META` in `server/seo/meta.ts`. To add
a route: add a `RouteKey`, a `classifyRoute()` case, and a `STATIC_META` entry
with a hand-written unique `title` + `description` + OG fields. There is **no**
generic fallback for known routes — each is authored by hand.

Prerender copy for `/`, `/services`, `/faq` lives in `server/seo/content.ts`. The
home/services strings mirror the English values in `src/LanguageContext.tsx`
(keys noted inline) — if you edit that copy, update `content.ts` to match. FAQ
prerender reads `src/data/faqs.ts` directly, so it never drifts.

## How to test locally

The per-route HTML injection runs in the **production** branch (dev uses Vite's
middleware). `robots.txt` + `sitemap.xml` work in both.

```bash
# Build the SPA shell, then run the server in production mode.
npm run build
NODE_ENV=production npm start        # serves http://localhost:3000

# robots.txt — allowed bots, disallow /admin + /api, sitemap line
curl -s http://localhost:3000/robots.txt

# sitemap.xml — static routes + portfolio project slugs
curl -s http://localhost:3000/sitemap.xml

# Home: unique <title>, canonical, OG/Twitter, Organization/LocalBusiness/WebSite
curl -s http://localhost:3000/ | grep -iE '<title>|canonical|og:title|application/ld\+json'

# FAQ: FAQPage JSON-LD + prerendered Q/A text inside #root
curl -s http://localhost:3000/faq | grep -iE 'FAQPage|data-seo-prerender'

# Portfolio detail: title/description/OG resolved from Sanity, BreadcrumbList
curl -s http://localhost:3000/portfolio/<projectId> | grep -iE '<title>|BreadcrumbList'

# Private route stays out of the index
curl -s http://localhost:3000/admin | grep -i 'noindex'
```

Unit tests: `npm test` (`src/test/seo.test.ts`) covers the bot matcher,
`robots.txt`, route classification, metadata uniqueness, JSON-LD, sitemap XML,
and the HTML injection (Sanity mocked, no network).

## Design notes / decisions

- **`robots.txt` is a dynamic route, not a static `public/robots.txt`** — so the
  bot list has a single source of truth (`server/config/bots.ts`, requirement
  #2). It's registered before the static handler and serves in dev + prod.
- **No index.html markers.** `render.ts` strips the build's placeholder
  `<title>`/description/OG/Twitter/canonical via targeted regex and injects fresh
  tags before `</head>`. Preload/hero `<link>` tags are untouched. This is robust
  to HTML minification and needs no changes to `index.html`.
- **No cloaking.** `isCrawler()` exists only for optional logging; the response
  body never branches on user-agent.
- **Graceful Sanity failure.** `sitemap.xml` and portfolio metadata fall back to
  static content if Sanity is unreachable (never 500 the sitemap on CMS outage).
