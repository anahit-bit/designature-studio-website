# Mariam: onboarding brief and first week plan

*Designature Studio · prepared 15 Sep 2026 · owner: Anahit*

Role: product UI/UX, plus part of the Journal (blog) pipeline. First week goal: get oriented, start the Medium and Substack syndication, and begin the persona and UI concept work.

---

## 1. What the website is and how it works

**Site:** https://www.designature.studio

Designature Studio is an interior design studio based in Yerevan that sells two things on one site:

1. **Designer led services.** Residential and commercial interior design, renovation guidance, and a paid $99 virtual consultation booked and paid through the site (Ameriabank card payment, then a private Calendly link).
2. **AI Design Studio.** A set of self serve AI tools at `/ai-concepts` (marketed as "AI Studio"). A visitor uploads a room photo, gets a redesign, a shopping list of real products, a room audit, or a style profile. Free tier gives a small number of uses. Paid access runs on a credit model: one off credit packs plus a monthly subscription. Balance and receipts live at `/account`.

**How it is built, in plain terms**

| Layer | What it is |
|---|---|
| Frontend | A React single page app (Vite, Tailwind, React Router). Trilingual: EN, AM, RU. |
| Backend | One Express server (`server.ts`) that serves the app, runs the AI endpoints, handles payments and email. |
| AI engines | Redesign My Room runs on GPT Image with a Gemini fallback. Room structure is measured first so walls, windows and doors stay where they are. Shopping List uses Serper search plus Gemini to turn a render into real products from curated retailers. |
| Content | Sanity CMS holds portfolio projects, Journal posts, categories, retailers. Images on Cloudinary. |
| Data | Postgres on Railway for users, orders, credits, subscriptions. Resend for transactional email. |
| SEO / GEO | The server injects real metadata, structured data (JSON LD) and prerendered copy into every page so Google and AI answer engines can read a JavaScript app. Sitemap and robots are generated. |
| Hosting | Railway. |

**Public pages:** Home, Portfolio, Services, Studio, AI Studio, Pricing, FAQ, Retail (Armenian retailer directory), Journal, Consultation, Deliverables, Account, plus legal pages. Admin pages sit behind `/admin`.

---

## 2. The tools: built, in progress, planned

The AI Studio is organised as a five phase journey: **Discover → Plan → Visualize → Specify → Realize**, plus an "Anytime" group. Every tool below is a card on that rail. Card names are the locked verb names. The header, home page and Library still use the older functional names in brackets; that is deliberate, do not rename those surfaces.

### Live in production (4)

| Card | Phase | Tier | Notes |
|---|---|---|---|
| **Find My Style** (Style Quiz) | Discover | Free, unlimited | Image based quiz that outputs a style DNA. |
| **Redesign My Room** (AI Vision) | Visualize | Free 3 per month, then credits | The flagship. Photo in, redesigned room out. Structure preserved. Virtual staging mode for empty rooms is on by default. Trend 2026 editorial entry point. |
| **Shop My Room** (Shopping List) | Specify | Free 3 per month, then credits | Turns any interior photo into a list of real, buyable products by country. Affiliate links via Skimlinks, disclosed. |
| **Score My Room** (Room Audit) | Discover | Design tier / credits | Vision model audits a room and returns a scored report with a redesign path. |

### Also done, outside the AI Studio

- Credit packs and monthly subscription, with refunds from the admin panel.
- $99 consultation booking with payment and Calendly hand off.
- Journal with categories, FAQ schema, and server side SEO.
- Portfolio publishing pipeline from Sanity, with optional walkthrough video.
- Armenian retail directory at `/retail`.
- Admin: users, orders, credits, comments, waitlist, feedback, consultations, insights.

### Planned, spec locked or in build

| Card | Phase | Ticket | State |
|---|---|---|---|
| **Plan My Room** (single room floorplan) | Plan | AI-016 | Spec locked, rulebook written. Next big build. |
| **Virtual Staging V1** as a named product | Visualize | product spec | Engine is live inside Redesign My Room. Remaining: MLS "virtually staged" label, landing page, agent packaging. |
| AI Studio onboarding flow and scenario router | all | AI-032 v2 | Shipped in code, still being tuned. |

### Planned, idea stage (roadmap cards, shown as "soon" or "later" on the rail)

| Card | Phase | Ticket |
|---|---|---|
| Localize My Style (cultural advisor, Studio tier) | Discover | AI-002 |
| Plan My Home (whole floor, Studio tier) | Plan | AI-017 |
| Light My Room | Plan | AI-011 |
| Plumb My Room | Plan | AI-035 |
| Heat My Room | Plan | AI-034 |
| Wire My Room (electrical) | Plan | AI-018 |
| Pick My Palette | Visualize | AI-013 |
| Build My Moodboard | Visualize | AI-014 |
| Schedule My Finishes | Specify | AI-036 |
| Cost My Project (budget estimator) | Specify | AI-012 |
| Phase My Reno (renovation sequencer) | Realize | AI-010 |
| Guide My Install | Realize | AI-019 |
| Walk My Room (3D walkthrough, later) | Realize | AI-020 |
| Write My Brief | Anytime | AI-001 |

Total vision: 19 cards. 4 live, 15 to build.

**Source of truth for status:** `_Plan/Website/Website-plan.xlsx`, sheets *AI Studio Map*, *Backlog*, *Roadmap*. In code: `src/components/studio/explorerRoster.ts`.

---

## 3. Where things live in Google Drive

All paths are under **My Drive › My laptop › Claude**.

| What | Path |
|---|---|
| **GEO Journal schedule (the Excel you will work from)** | `My laptop/Claude/_Plan/Website/GEO-Blog-Schedule-2mo.xlsx` |
| Direct link | https://drive.google.com/file/d/1E6N-XFO2w8Ws1HT0rLDTgUMpANCJ8UY2/view |
| Journal post markdown drafts and mockups | `My laptop/Claude/_Plan/Website/journal-content/` |
| Journal workflow (how a post goes from draft to live) | `_Plan/Website/GEO-Blog-Workflow.md` |
| Journal roadmap and pillar plan | `_Plan/Website/GEO-Blog-Roadmap.md`, `GEO-Pillar-Cluster-Plan.md` |
| Website plan, backlog, roadmap, AI Studio map | `_Plan/Website/Website-plan.xlsx` |
| Product documentation for UI/UX (screens, flows, screenshots) | `_Plan/Website/Product-Documentation-UIUX-Handoff.pdf` (also .docx and .md) and folder `Product-Documentation-screenshots/` |
| Design system: tokens and components | `_Plan/Website/Design-System-Tokens-Components.pdf` (also .html and .md) |
| AI Studio onboarding flow | `_Plan/Website/AI-032-AI-Studio-Onboarding-Flow.md` |
| Competitor study (MeltFlex, REimagine Home) | Repo folder `docs/competitor-intel/` (teardowns, action plan, `DesignatureStudio-Competitors-2026-Q3.xlsx`). Copies of the xlsx also sit in Drive. |
| Mockups | `My laptop/Claude/_Mockups/` |

The Excel has four sheets: **Schedule** (every post in publish order with status), **Keywords** (target query and Bing volume per post), **Inputs from you**, and **How it works**.

**Journal status today:** 15 posts live, 7 more planned through end of September, then a 6 post "Signature Looks" series in October. Cadence is 2 posts per week, Tuesday and Friday. Anahit reviews every post before it publishes.

---

## 4. Medium and Substack: the rules

Both are syndication channels. The website is always the original.

- Publish on the site first. Medium and Substack go up after, never before.
- On Medium use **Import story** with the live URL so Medium sets the canonical link to designature.studio. If you paste instead, set the canonical manually in story settings. This protects our search ranking.
- On Substack paste the post and add one line at the top: "Originally published on designature.studio" with the link.
- Every post ends with one call to action back to the site: the matching AI Studio tool or the consultation page.
- Add the three tags that match the post's category and target keyword.
- Log the Medium and Substack URLs in a new column in the Schedule sheet so we can track what is syndicated.

---

## 5. First week plan

Start date: Wednesday 16 Sep 2026. Five working days, Wed 16 to Tue 22. Each day has one main deliverable. Post pairs come from the 15 live posts, oldest first, so the back catalogue is on both platforms within about eight working days. The complete shareable version of this brief is `docs/onboarding/Mariam-Onboarding-Guide.docx`.

| Day | Main work | Journal syndication |
|---|---|---|
| **Wed 16** | Access and orientation. Get Drive, Sanity, Medium, Substack and site admin access. Read this brief, the Product Documentation handoff, and the Design System doc. Click through every live tool on the site as a first time user and write down every point of confusion. | Set up the Medium publication and the Substack. Agree names, bios, header images with Anahit. |
| **Thu 17** | Product walkthrough with Anahit (60 min). Then start the persona draft: list who we think buys, from the Journal analytics, consultation bookings and competitor research. Aim for 4 to 5 candidate personas. | Publish Post 1 and Post 2 on Medium and Substack. |
| **Fri 18** | UI/UX research: audit the AI Studio flow against MeltFlex and REimagine Home (competitor teardowns are in the repo `docs/competitor-intel/`). Record friction points with screenshots. | Publish Post 3 and Post 4. |
| **Mon 21** | Persona work: turn the candidates into one page persona cards (goal, trigger, fear, device, which tool they need first). Review with Anahit, cut to the three we design for. | Publish Post 5 and Post 6. |
| **Tue 22** | UI concept kickoff: from the three personas, sketch the ideal first session for each in the AI Studio (entry, first tool, first result, upgrade moment). Present as a short deck or Figma board. Wrap up: week summary and next week's plan. | Publish Post 7 and Post 8. Add the syndication URL column to the Schedule sheet. |

**Week 1 deliverables**

1. Medium and Substack live with 10 posts syndicated.
2. Friction log of the current AI Studio with screenshots.
3. Three persona cards, reviewed.
4. First UI concept sketch: one ideal first session per persona.

**Week 2 preview:** finish syndicating the remaining posts, take over the Tuesday and Friday post preparation from the schedule, and turn the concept sketch into wireframes for the AI Studio entry flow.

---

## 6. Working rules

- Nothing publishes to the website without Anahit's review. The schedule sheet is the queue.
- Do not rename tools or surfaces. Names are locked.
- Never lead with "free" in copy. Only the Free tier is free.
- Affiliate links stay disclosed.
- Keep questions in one running doc and bring them to the daily check in rather than sending them one at a time.
