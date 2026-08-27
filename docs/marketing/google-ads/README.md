# US Google Ads — "Listing Photos" campaign

*Designature Studio · drafted Aug 2026 · owner: anahit@designature.studio*

A US-targeted Google **Search** campaign aimed at short-term-rental hosts and
real-estate agents/sellers, built on one argument:

> **Your listing isn't the problem. The photos are.**
> Upload one photo of the room → see it restyled photorealistically → get the
> shopping list of real products, at real prices, that gets it there.

Everything in this folder is import-ready. The landing page it points at ships
with it: **`/listing-photos`** (`src/components/ListingPhotosPage.tsx`).

---

## 1. Why a dedicated landing page, not `/ai-concepts`

Ad-to-page message match is most of Quality Score, and Quality Score is what
decides whether we pay $1.40 or $3.10 for the same click. `/ai-concepts` speaks
to a homeowner redesigning a room they live in. A host whose calendar is empty
and an agent prepping a seller are a different job, a different vocabulary, and
a different proof requirement.

The page also earns its keep when the ads are off — see §10.

| | |
|---|---|
| **Final URL (hosts)** | `https://www.designature.studio/listing-photos#hosts` |
| **Final URL (agents)** | `https://www.designature.studio/listing-photos#agents` |
| **Free-tool CTA** | `/ai-concepts` (3 concepts + 3 shopping lists, no card) |
| **Paid path** | `/consultation` ($99) → `/services` (full studio project) |

The `#hosts` / `#agents` anchors are ad-group-level deep links. Renaming those
element ids breaks message match on every ad in `04-responsive-search-ads.csv`;
`src/test/listingPhotosPage.test.tsx` guards them.

---

## 2. Campaign structure

**Campaign:** `US | Search | Listing Photos` — Search network only.

| Ad group | Intent | Launch status | Max CPC |
|---|---|---|---|
| `Hosts \| Not Getting Booked` | Problem-aware: the calendar is empty and they're about to cut the rate | **Enabled** | $2.00 |
| `Hosts \| Furnish & Style` | Solution-aware: they've decided to restyle and are shopping for how | **Enabled** | $2.00 |
| `Agents \| Pre-Listing Prep` | Agents/sellers prepping a property before the shoot | **Enabled** | $2.50 |
| `Virtual Staging Intercept` | People searching virtual staging tools | **Paused** | $2.50 |

Each ad group carries one responsive search ad with the full 15 headlines and 4
descriptions, written for that intent only — no shared copy pool.

**On the paused ad group.** "Virtual staging" is the highest-volume commercial
term in this space, and it is also the one query where our answer is *not* what
the searcher asked for: they want a furnished-looking photo of a vacant house,
and we sell a room you buy and build for real. The RSA is written honestly
around that difference rather than pretending to be a staging tool. Turn it on
only once the other three have a CPA to compare it against — or once the parked
fal staging engine (`services/aiVision/virtualStaging.ts`, spec in
`docs/product/virtual-staging-spec.md`) is actually switched on, at which point
the copy should be rewritten to sell the real thing.

---

## 3. Settings that actually matter

Most of a Search campaign's waste comes from four defaults. Set these by hand:

1. **Locations: United States — and set "Presence: people in your targeted
   locations".** The default is *presence **or interest***, which serves ads to
   anyone anywhere in the world who searched about the US. For an advertiser
   operating from Armenia this is the single largest source of junk spend. It's
   under Settings → Locations → Location options.
2. **Networks: Google Search only.** Turn **Search Partners off** and **Display
   Network expansion off** at launch. Revisit only when the search-only CPA is known.
3. **Language: English.**
4. **"Also show ads for similar/broad matches"** — do not add broad match at
   launch. Everything ships as phrase or exact. Broad match with no conversion
   history and a $25/day budget is a donation.

Also set:

- **Ad rotation:** Optimize (default) — needed for RSA asset learning.
- **Ad schedule:** all week at launch, but note the timezone gap. The studio is
  UTC+4; US evening (peak host-browsing time) is Armenian early morning. Nothing
  in the funnel needs a live human — the free tool runs itself — but any
  "book a chat" click landing at 3am local should be answered next morning, not
  next week.
- **Devices:** start even. Expect mobile to dominate impressions for host
  queries and desktop for agent queries; adjust after two weeks of data, not before.
- **Audience segments: Observation only, never Targeting.** Add In-market →
  *Real Estate* and *Home & Garden / Home Decor*, plus Detailed demographics →
  *Homeowners*. Observation collects the data without narrowing reach.

---

## 4. Budget and bidding

**Recommended budget: $25/day (~$760/month).** Allocation is handled by ad-group
bids, not separate campaigns — one campaign keeps the conversion signal pooled,
which matters enormously at this volume.

**Bidding, in two phases:**

| Phase | Strategy | Why |
|---|---|---|
| Weeks 1–3 (or until ~30 conversions) | **Maximize clicks**, max CPC cap $2.00–$2.50 | No conversion history exists yet. Smart bidding with no data spends the budget learning nothing. The cap is the safety rail. |
| Week 4+ | **Maximize conversions** (add a target CPA only after ~50 conversions) | Once the imported GA4 conversions have volume, hand over bidding. |

**What $25/day buys, as arithmetic — not a forecast.** At a blended $2.00 CPC
that's ~12 clicks/day, ~375 clicks/month. What share of those start a free
concept is exactly what week 1–2 is for measuring; do not budget against a
guess. Recheck this table against real CPCs after the first week — if the
average CPC lands above $3.00 the phrase list is too broad and the fix is
negatives, not a bigger budget.

**If the budget is smaller than $25/day:** run `Hosts | Not Getting Booked` and
`Agents | Pre-Listing Prep` only, and pause `Hosts | Furnish & Style` until
there is room. Three ad groups sharing $10/day means none of them gets enough
impressions to learn anything.

---

## 5. Conversions

The site already fires the events this needs — the work is linking, not
building. See the GA4 event registry at the top of `src/lib/analytics.ts`.

**Setup:** GA4 → mark as key events → link the GA4 property to Google Ads →
Google Ads → Goals → Import → GA4.

| GA4 event | Where it fires | Role in Ads | Suggested value |
|---|---|---|---|
| `purchase` | Paid consultation confirmed | **Primary** | $99 (actual) |
| `consultation_initiated` | "Book & Pay $99" clicked | **Primary** | $25 |
| `calendly_open` | "Let's chat" / book-a-call click | **Primary** | $15 |
| `signup` | New account via Google auth | **Primary** | $5 |
| `ai_vision_completed` | A restyle actually rendered | **Primary** | $2 |
| `ai_shopping_completed` | A shopping list resolved | Secondary | $2 |
| `listing_photos_cta` | Any CTA on `/listing-photos` (new, `{ cta }` param) | Secondary | $0.50 |

Two things to get right:

- **Only "Primary" conversions drive bidding.** Everything else should be
  imported as *Secondary* so it reports without distorting the algorithm.
  Early on, `ai_vision_completed` is the workhorse — it is the first event with
  enough volume to bid on and it means the visitor got real value.
- **Leave auto-tagging ON and do not add manual UTMs.** The `gclid` carries
  campaign/ad-group/keyword into GA4 automatically; a manual `utm_source` on
  the final URL overwrites it and you lose keyword-level attribution. The
  landing page needs no tracking parameters at all.

`listing_photos_cta` fires with a `cta` parameter naming the surface
(`hero_primary`, `audience_hosts`, `designer_consultation`, `closing_pricing`,
…). Register it as a custom dimension in GA4 if you want to see which block on
the page is doing the work.

---

## 6. Compliance — read before uploading

Three things here are not style preferences.

**1. "Airbnb" appears in keywords, never in ad text.** Google's trademark policy
permits *bidding* on a trademarked term, and the keyword lists use it freely.
Using it in a headline or description is what draws a complaint from the brand
owner and gets ads disapproved. Every RSA in `04-responsive-search-ads.csv` says
"short-term rental" or "vacation rental" instead. `node
scripts/validate-google-ads-assets.mjs` enforces this.

**2. No unsubstantiated performance claims — anywhere.** Not "get 40% more
bookings", not "sell faster", not "listings with better photos rent 2x". We
cannot substantiate any of it, Google Ads' misrepresentation policy prohibits
it, and the FTC's substantiation standard applies to the landing page as well
as the ad. The whole campaign is built on a *diagnosis* ("it's probably the
photos") and a *deliverable* ("a restyle and a shopping list"), never on a
promised outcome. `src/test/listingPhotosPage.test.tsx` fails the build if a
percentage or a "guaranteed" creeps into the page.

**3. The virtually-staged disclosure is a feature, not a footnote.** An AI
restyle must never be presented as the property's current state. Many US MLSs
require virtually-staged images to be labelled and some states legislate it.
The landing page says so in its own dark band, and the agent-facing ad copy
leads with it. Keep it that way — for agents it is a trust signal, and it is
the thing that separates us from the tools with 2.4-star billing reviews.

Also live on the page: the affiliate disclosure ("some links may earn us a small
commission, it never changes what we recommend"), consistent with the Skimlinks
disclosure already applied site-wide.

---

## 7. What's in this folder

| File | Contents |
|---|---|
| `01-campaign-and-ad-groups.csv` | The campaign, its budget/bid strategy, and 4 ad groups with statuses + max CPCs |
| `02-keywords.csv` | 40 keywords, phrase/exact, with per-ad-group final URLs |
| `03-negative-keywords.csv` | 43 campaign-level negatives |
| `04-responsive-search-ads.csv` | 4 RSAs — 15 headlines + 4 descriptions each |
| `05-assets-sitelinks.csv` | 6 sitelinks with both description lines |
| `06-assets-callouts-and-snippets.csv` | 8 callouts + a "Services" structured snippet |

Every asset is inside Google's character limits, verified by
`scripts/validate-google-ads-assets.mjs` — run it after any edit. That script
also checks that no final URL points at a path the site doesn't serve and that
the Airbnb trademark never appears in ad text.

Two claims in the copy are checked against the product itself by
`src/test/listingPhotosPage.test.tsx`: the number of selectable interior styles
(read from `VISION_STYLES_FULL`) and the free-tier quota. If either changes in
the product, the test fails and the ads must be edited before the next upload —
an ad making a stale claim is a policy problem, not just an inaccuracy.

### The negative list

The 43 negatives block four kinds of query that would otherwise eat the budget:
employment and education ("interior design jobs", "staging certification"),
Airbnb brand-navigational traffic ("airbnb login", "book an airbnb" — people
looking for the platform, not for us), adjacent services we don't sell
("photographer", "property management", "furniture rental"), and wrong-shape
demand ("hotel", "wikipedia", "apk").

**"free" is deliberately NOT a negative.** Our offer *is* free to start, and
"free ai interior design" is a query we want.

Add to this list weekly from the Search Terms report for the first month. That
report, not the keyword list, is where a small budget is won.

---

## 8. Importing (Google Ads Editor)

1. Open **Google Ads Editor** → download the account.
2. **Account → Import → From file…**, one CSV at a time, **in numbered order**
   (the campaign must exist before its keywords and ads).
3. Editor shows a column-mapping dialog — the headers are named to map
   automatically; check anything it flags as unmapped.
4. Review the proposed changes, then **Post**.
5. In the web UI afterwards, set the four §3 settings by hand — Editor does not
   round-trip location *options* reliably, and "Presence only" is the one that
   matters most.
6. Attach sitelinks/callouts/snippets at the campaign level if the import placed
   them at account level.

Before spending anything, click each ad's preview URL and confirm it lands on
`/listing-photos` with the right section in view.

---

## 9. Launch checklist

- [ ] Conversion tracking verified: GA4 linked, key events marked, imported into
      Ads, Primary/Secondary set as in §5. **Do not launch without this** — a
      campaign with no conversion data cannot be judged and cannot be optimized.
- [ ] `/listing-photos` deployed and returning its own `<title>` + JSON-LD
      (`curl -s https://www.designature.studio/listing-photos | grep -i '<title>\|FAQPage'`).
- [ ] Location option set to **Presence**, Search Partners **off**, Display
      expansion **off**.
- [ ] Budget $25/day, Maximize clicks with a $2.00–$2.50 CPC cap.
- [ ] Negative list imported at campaign level.
- [ ] `Virtual Staging Intercept` confirmed **paused**.
- [ ] Sitelinks, callouts and the structured snippet attached and showing in preview.
- [ ] `node scripts/validate-google-ads-assets.mjs` clean.

---

## 10. What this does for the site when the ads are off

The reason to build a real page rather than a throwaway lander: paid traffic
stops the day the card stops, and the page doesn't.

`/listing-photos` is wired through every layer of the existing SEO/GEO stack
(`SEO-NOTES.md`), so it is a genuine addition to the site's indexed surface, not
a hidden ad destination:

- **Indexed and sitemapped** — hand-written `<title>` and meta description in
  `server/seo/meta.ts`, canonical `https://www.designature.studio/listing-photos`,
  entry in `server/seo/sitemap.ts`.
- **Structured data**: a `Service` node with `areaServed: United States` — which
  is also how we tell crawlers that the *tools* serve the US while the studio's
  `LocalBusiness` node stays Yerevan — plus a `FAQPage` (7 Q&As) and a
  `BreadcrumbList`.
- **Prerendered for JS-less crawlers** — hero copy *and* all seven full answers
  land inside `#root` server-side (`server/seo/render.ts`), which matters
  because the visible accordion keeps six of them collapsed.
- **New non-brand query surface**: rental-listing conversion, short-term-rental
  interior design, pre-listing prep, MLS virtual-staging disclosure. These are
  Batch D of `docs/marketing/content-calendar.md` — this page is the hub those
  articles should link into, and it should link back out to them as they publish.
- **AI-answer (GEO) material**: the FAQ answers are written to be quotable
  standalone, especially the disclosure answer — "can I use an AI-restyled photo
  in my listing" is exactly the kind of question an assistant gets asked and
  currently has few honest sources for.

The FAQ copy lives once, in `src/data/listingPhotosFaq.ts`, and feeds the
rendered accordion, the `FAQPage` schema and the crawler prerender from that one
source — so the rich result can never drift from what a human reads.

---

## 11. Measurement and decision rules

Set the review points now, so the campaign is judged rather than watched.

- **Day 3** — approvals and delivery only. Any disapproved ad, any ad group with
  zero impressions. Do **not** touch bids or copy yet.
- **Week 1** — Search Terms report. Add negatives. Confirm average CPC is under
  $3.00 and that traffic is genuinely US (Locations report → "Matched location").
- **Week 2** — first CPA read on `ai_vision_completed`. Pause any keyword with
  >40 clicks and zero conversions of any kind. Compare host vs agent ad groups.
- **Week 4** — switch to Maximize conversions if there are ~30+ conversions.
  Add a second RSA to the best ad group. Decide on `Virtual Staging Intercept`.
- **Week 8** — the real question: does a click here become a `signup`,
  `calendly_open` or `purchase`, or only a free render? If it's only free
  renders, the fix is the funnel between `/ai-concepts` and `/consultation`,
  not the ads.

The honest kill criterion: if after $500 spent there are no conversions past
`ai_vision_completed` — nobody signing up, booking, or paying — pause and fix
the funnel before spending more. Paid search finds demand; it does not create it.

---

## 12. Known gaps / next

- **Occupied-room restyling.** The engine adds and replaces furnishings; it does
  not empty a lived-in room. Agents with occupied listings are the audience most
  likely to bounce. That's the V2 build in `docs/product/virtual-staging-spec.md`.
- **No US social proof yet.** Testimonials on the site are studio clients, not US
  hosts or agents. The first few US customers are worth asking for a line.
- **Remarketing.** Once `/listing-photos` has traffic, a Display remarketing list
  ("visited /listing-photos, did not complete a render") is the cheapest second
  touch available. Not at launch — build the audience first.
- **Bing.** The agent audience skews older and desktop; Microsoft Ads imports a
  Google campaign in a few clicks and CPCs are usually lower. Worth a test once
  the Google numbers are known.
