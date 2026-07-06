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
`/ai-vision`, `/pricing`, `/faq`, `/consultation`, `/terms`, `/privacy`,
`/refund`.

**`noindex` (excluded from sitemap):** `/admin*`, `/booking/*`, `/deliverables`
— plus any unknown path. These still serve the SPA normally.

## JSON-LD by route

- `/` → `Organization` + `LocalBusiness` (with `hasOfferCatalog` of core
  services) + `WebSite`.
- `/portfolio` → `BreadcrumbList`.
- `/portfolio/:id` → `BreadcrumbList` (Home › Portfolio › Project).
- `/faq` → `FAQPage`, generated from `src/data/faqs.ts` (matches the page 1:1).

## ⚠ Business data to confirm

`server/seo/config.ts` is populated from the live site (Footer phones/email/
socials, founding year, OG image). **Left intentionally omitted** (schema is
valid without them — do not invent): **street address**, **geo coordinates**,
**opening hours**. Add them to `BUSINESS` in `config.ts` when confirmed for a
richer `LocalBusiness`. Primary phone is the Armenian WhatsApp Business line
(`+37477901991`, canonical 2026-07-05).

> The original task's "BUSINESS DATA" block was a blank placeholder, so these
> values were derived from the codebase rather than supplied.

## How to add blog slugs later (Phase 2)

1. **Sitemap** — in `server/seo/sitemap.ts`, `getDynamicEntries()`, uncomment the
   marked block and push one `{ path: '/blog/'+slug, lastmod }` per post.
2. **Metadata** — add a `blogDetail` case in `server/seo/meta.ts`
   (`classifyRoute` + `buildMeta`) resolving title/description/OG from the post.
3. **JSON-LD** — add an `Article`/`BlogPosting` + `BreadcrumbList` case in
   `server/seo/jsonld.ts`.
4. **robots.txt** — no change needed (blog is under the allowed `/`).

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
