# Product spec — Virtual Staging (real-estate mode)

*Designature Studio · Aug 2026 · derived from the REimagine Home / Styldod teardown.*

## Why

US agents, sellers, and Airbnb hosts stage listings constantly; physical staging runs **$75–$400/image
or $1,500–$5,000/room**. AI virtual staging is a fast, cheap alternative, and it's REimagine/Styldod's
entire business — grown not by ads but by a **distribution deal** (CRMLS → 103k agents, free credits).
We can enter this with three advantages they lack: **a human-designer review option, a curated (not
auto-matched) shoppable list, and honest billing** (their Trustpilot is 2.4 on billing dark patterns).

**This is largely a productization job, not a new build** — see "What already exists."

## UX architecture decision (CONFIRMED) — same engine, two doorways

The staging engine and the "Redesign my room" engine are **the same tech**. The difference between them
is **audience and intent**, not capability — so we segment by *doorway*, not by adding options to the
consumer flow. Guiding principle: **keep the homeowner path dead simple; give realtors their own entrance.**

```
Homeowner  →  "Redesign your room" card (AI Vision)   ← UNCHANGED. No new toggles/steps.
                 └─ restyles a furnished room as today
                 └─ also handles an empty room automatically (engine just adds furniture) — no new UI

Realtor /   →  /virtual-staging landing page  →  "Virtual Staging" tool
seller/host       └─ same engine under the hood, but framed + tuned for listings:
                     staging presets · "Virtually staged" label + MLS disclosure ·
                     (V2) batch upload + agent pricing · optional human-review upsell
```

**Why two doorways, not one unified tool with a mode switch:**
- **Simplicity for homeowners.** They don't know the term "virtual staging" and shouldn't have to choose
  "redesign vs stage." Their card is untouched — zero added cognitive load.
- **Different customer, different framing.** Realtors want listing-speak, agent pricing, batch, and the
  compliance label — none of which belongs in the consumer flow.
- **SEO.** "Virtual staging" is a large *separate* search term realtors use and homeowners don't; a
  dedicated `/virtual-staging` page wins that traffic (a non-brand lane REimagine leaves open).
- Analogy: one editor, separate "Instagram post" vs "Presentation" starting points — the doorway matches intent.

**Net effect on the existing Redesign card: none.** We add a new realtor entrance; we do not complicate
the homeowner experience.

## What already exists in our codebase (important)

- **A virtual-staging engine is already written:** `services/aiVision/virtualStaging.ts`
  (fal.ai · FLUX Apartment Staging, img2img — keeps the real room, only adds furniture). It's
  **parked/opt-in** today (`AI_VISION_ENGINE=staging`; default routes to Gemini). See
  `services/aiVision/generateConcept.ts` and `buildStagingPrompt()` in `promptTemplates.ts`.
- **Architecture preservation already exists:** `/api/ai-vision/analyze-structure` +
  `analyzeRoomStructure()` measure walls/windows/doors so generation doesn't invent openings — the
  basis for a named "True-Room Lock" (their "Structural Lock" equivalent).
- **Shopping pipeline exists:** `/api/shopping/identify|search|alternate` already turns a render into a
  real-product list. Reuse it for the shoppable-staging upsell.
- **Quota/credits exist:** `generationsLeft` / `UNLIMITED_QUOTA` in `/api/ai-vision/generate`.

**Gap to build:** an explicit "remove existing furniture / declutter" step for *occupied* listings
(the staging engine adds to a room; it doesn't empty one). Everything else is exposing + packaging.

## Scope

### V1 (productize what exists)
0. **Leave the "Redesign my room" card untouched** (per the UX decision above). All V1 work is a *new,
   separate* realtor doorway; the homeowner flow gets no new steps or toggles.
1. **Vacant → Furnished staging mode.** A separate "Virtual Staging" entry (its own doorway, reached via
   the `/virtual-staging` page) that routes to the fal staging engine (turn the parked engine on for this
   mode via a `mode:"staging"` param — no change to the redesign path). Style presets tuned for staging
   (broad-appeal: Modern, Scandinavian, Transitional, Coastal, Farmhouse).
2. **"True-Room Lock"** — surface the existing structure-preservation as a named, on-by-default toggle
   with a one-line trust explainer ("we never move your walls, windows, or doors").
3. **MLS-compliance labeling** — auto-stamp a corner label **"Virtually staged"** on staging outputs,
   and provide ready-to-paste disclosure text for listing remarks. (US MLS rules — e.g. CA AB 723 —
   require disclosure; this is a *feature*, not a nuisance.) Make the label non-removable on the free
   tier; keep it on paid but allow a compliant caption instead.
4. **"Shop this room" shoppable upsell** — after a staging render, a button generates the curated
   Shopping List. Price it as a **premium action** (mirror REimagine's 1-credit design / 2-credit
   shoppable split): costs more credits, or is Studio-tier/consult only.
5. **`/virtual-staging` landing page** (see Wiring) targeting agents/sellers/hosts.

### V2 (close the gap + go B2B)
6. **Occupied → Vacant → Restage ("Empty the room")** — add a furniture-removal/inpaint step so
   agents can restage lived-in listings. This is the one real engineering add.
7. **Batch upload** (agents stage whole listings) — accept N photos, queue, return a set. Cap by tier.
8. **B2B intake + agent packages** — a simple "For real-estate teams" form (name, brokerage, volume)
   → admin queue. Per-image or monthly agent pricing; **human-reviewed staging** as the premium SKU.
9. **Human-review upsell** — a designer checks/relights a staging render before delivery (our wedge;
   ties to the existing $99 consult and studio services).

### V3 (distribution — the real moat)
10. **"Free credits for your members" partnership kit** — a pitch + a coupon/credit-grant mechanism to
    offer **regional MLSs, brokerages, RE-photography franchises, and Armenian/CIS developers** bundled
    free staging credits (the CRMLS playbook, our scale). This is where the growth actually is.
11. **API/white-label** for a brokerage or portal to embed staging — only after B2B demand is proven.

## Pricing recommendation (benchmarked)

- Benchmarks: physical staging $75–$400/image; **Styldod human** $16–$23/image; **REimagine SaaS**
  $14/$49/$99 (credit-metered), iOS $5.99/wk.
- **Consumer/host:** fold staging into existing tiers (Explore free trial → $19/$49 include N staging
  renders); "shop this room" is the premium action.
- **Agents (B2B):** a simple, honest, **flat** offer beats their disliked credit maze — e.g.
  **$X/image self-serve** or **$Y/mo for Z listings**, with a **human-reviewed** image at a premium.
  Undercut physical staging by an order of magnitude; **advertise no weekly-sub, no dark patterns.**
- **Partnership tier:** free/discounted member credits to MLS/brokerage/developer partners (CAC play).

## Landing page wiring (`/virtual-staging`)

Follow the existing static-page pattern so SEO/GEO plumbing is automatic:
- Route in `App.tsx`; component like `StudioPage`/`AIVisionPage`.
- **Bilingual copy** (EN + AM) in `src/LanguageContext.tsx` (the site is EN/AM — don't hardcode English).
- `STATIC_META` entry + `classifyRoute()` case in `server/seo/meta.ts` (hand-written title/description).
- Add to `server/seo/sitemap.ts` static routes; add prerender copy in `server/seo/content.ts`.
- Content: hero (before/after agent example), "how it works," compliance/True-Room Lock trust block,
  pricing, FAQ (feeds FAQPage schema), B2B CTA. Target keywords: *AI virtual staging, virtual staging
  for realtors, MLS-compliant staging, virtual staging vs physical staging.* (These are the non-brand
  terms REimagine does NOT own — open lane.)

## Technical build tasks

- [ ] Add a `mode: "staging"` param to `/api/ai-vision/generate`; route mode=staging → fal engine
      (`generateConcept` with `forcedEngine:"staging"`), keep Gemini for redesign. Verify
      `isStagingAvailable()` / fal key in platform config.
- [ ] Staging-tuned style presets + prompts (extend `buildStagingPrompt`).
- [ ] "Virtually staged" watermark/label compositing on staging outputs + disclosure-text snippet.
- [ ] "True-Room Lock" UI toggle wired to existing structure analysis.
- [ ] "Shop this room" button → existing shopping pipeline; gate/price as premium.
- [ ] V2: furniture-removal/inpaint step ("Empty the room").
- [ ] V2: batch upload + queue; tier caps.
- [ ] V2: `/virtual-staging` page + B2B intake form → `/admin` queue.
- [ ] V3: credit-grant/coupon mechanism for partnership bundles.

## Risks / watch-outs

- **fal cost:** staging engine ≈ $0.02/MP (per `server.ts` cost table) — model tier quotas so unit
  economics hold (the mistake that killed Modsy was render cost).
- **Quality/consistency:** REimagine's own complaints are weak prompt adherence — our human-review SKU
  is the answer; don't over-promise autonomous quality.
- **Legal/disclosure:** always label virtually staged photos; never stage in a way that hides defects
  (misrepresentation risk). Bake disclosure in, don't bolt on.
- **Focus:** don't build V3 API before V1 proves demand.

## Success metrics
- V1: staging renders/user, free→paid conversion on staging, "shop this room" attach rate.
- V2/V3: agent signups, images/agent, partnership pipeline (MLS/brokerage/developer conversations),
  human-review attach rate, staging-driven revenue.

*Next competitor to study after this series: MyRoomDesigner.ai (closest feature clone) or Havenly (the hybrid consolidator).*
