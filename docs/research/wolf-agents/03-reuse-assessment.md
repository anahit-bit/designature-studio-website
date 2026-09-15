# 03. Reuse assessment for Designature Studio

## The Designature stack the assessment is measured against

- Vite + React 19 single page app, React Router, Tailwind 4, framer motion. English only today (`Language = 'en'`).
- One Express 5 server (`server.ts`, about 6,300 lines) with routes for auth, AI Vision (Gemini image models, OpenAI GPT Image, fal staging engine parked), shopping identify and search (Serper), credits and subscriptions (Ameria payments), consultation slots (Calendly, Google Calendar), journal comments, admin analytics (GA4, Search Console, Bing), server side SEO rendering with JSON LD.
- Postgres, Sanity CMS for journal and pricing, Cloudinary, Resend email, HubSpot CRM, Railway deploy.
- Tests: vitest, about 30 test files, CI runs tests, typecheck and build on every push. No browser end to end tests.
- Routes indexed: 16 public plus admin pages. Existing tracking endpoints for quiz start and complete, vision start, shopping start, audit start, Calendly.
- Claude Code is already used for development (`.claude/settings.local.json`, worktrees).

## Summary table

| # | Asset | Licence | Needs | Stack fit | Effort | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Bob bias advisor skill | MIT | Claude Code or Claude chat | Independent of stack | Minutes | **Reuse as is** |
| 2 | QA agent | MIT | Playwright MCP, a `qa-config.yml` for Designature routes | Independent of stack | Half a day to configure, then 15 min to 2 h per run | **Adapt** |
| 3 | Claude PR review workflow | MIT | `CLAUDE_CODE_OAUTH_TOKEN` secret, prompt rewritten for Vite and Express conventions | Fits existing GitHub CI | One hour | **Adapt** |
| 4 | @claude mention workflow | MIT | Same token, keep the author gate | Fits | One hour | **Adapt, optional** |
| 5 | agent-quorum-check, agent-voice-check | MIT | Node 18, JSON answers | Independent | None | **Reuse as is** for persona research |
| 6 | Concierge copilot | MIT (code), backend private | RAG over Designature content, LLM key, budget cap, Postgres events | Server already has Express and Postgres; would replace LightRAG | 1 to 2 weeks | **Pattern, later** |
| 7 | Copilot safety layer | MIT | None | Drops into any LLM route | Hours | **Reuse when an LLM chat route exists** |
| 8 | Library MCP pattern | MIT | Scoped keys, journal | Sanity has tokens; pattern for agent write access to journal drafts | Days | **Pattern, later** |
| 9 | llms.txt generator | MIT | Adapt to Express routes and Sanity | Fits the SEO layer in `server/seo` | Half a day | **Adapt** |
| 10 | Governance: AGENTS.md, CLAUDE.md rulings, font passport, style skill | MIT | Writing | Independent | Hours | **Adopt selectively** |
| 11 | UXCP persona builder | MIT (UXCoreOSS) | Next.js Pages Router, Strapi, NextAuth | Poor fit as code | Days to port | **Use the method, not the code** |
| 12 | UX Core public API `/uxcore-api` | Public | HTTP | Any | None | **Use as data source** |
| 13 | Wolf's Basement | MIT | Windows, local Claude CLI | Not needed | | **Skip** |
| 14 | Terminal, The Order, Doors, Keys, MemPalace and the rest of the Atlas | Not public | | | | **Design lessons only** |
| 15 | vibesuite, glider copilot, bias demos repo | No licence file | | | | **Reference only** |

## Detail per asset

### 1. Bob, bias advisor skill

- **What it gives Designature.** A colleague in Claude Code that reviews any Designature screen, copy, email, pricing table or flow against 105 documented biases and says which lever to pull and which to avoid. It is the fastest way to turn Wolf's persona thinking into daily practice.
- **Fit.** Bob's examples are SaaS flavoured (dashboards, subscriptions, notifications). Designature is a visual, emotional purchase. Section 04 maps the relevant biases onto interior design surfaces so Bob is not left to guess.
- **How to activate.** Copy `assets/bob-skill/` to `.claude/skills/bob/` in this repo. The skill is user invocable with `/bob`. No runtime change to the website.
- **Risk.** None to the product. One caution from Bob's own rules: bias 33, never cite psychology publicly. The biases shape design decisions, they never appear in copy.

### 2. QA agent

- **What it gives.** Designature has no browser level QA. The site has payment, booking and AI generation flows where a broken button costs money. Wolf's method is a repeatable manual QA pass with hard coverage rules and a report that diffs against the last run.
- **Adaptation.** Write `qa-config.yml` for Designature: sections (home, portfolio, services, AI concepts and Vision, pricing, consultation, journal, FAQ, legal), one locale, desktop and mobile viewports, `auth_required` for `/account` and `/admin*`, `primary_interaction` per section (open style quiz, upload a room photo, open a pricing plan, pick a consultation slot without submitting). Keep the rule that the agent never submits real data; the payment and booking flows need a staging environment or explicit stop points.
- **Requirements.** Playwright MCP in Claude Code (Chromium is already present in this environment), `helper.mjs` needs `pixelmatch` and `axe` packages when those checks are used.
- **Where the value is highest.** `qa-deploy-check` after each Railway deploy, and `qa-retest` for specific findings. The `keepsimple-qa` build ID capture assumes Next.js; for the Vite build use the hashed asset name in `dist/index.html`.

### 3 and 4. Claude PR review and mention workflows

- **What they give.** Every PR gets a review against the repo's own conventions before a human looks. Designature already has CI; this adds a reviewer.
- **Adaptation.** Rewrite the prompt for this codebase: React 19 with Tailwind, Express route hygiene in `server.ts`, no secrets in the client bundle, Sanity query safety, SEO render path, vitest coverage for changed services. Keep the scoped inline comment tool, the turn cap and the timeout.
- **Cost.** Runs on a Claude subscription OAuth token stored as a repo secret. Wolf caps each run at 15 minutes for that reason.
- **Security.** Keep the `author_association` gate on the mention workflow even if the repo is private today. His comment in the workflow explains the incident that led to it.

### 5. agent-quorum-check and agent-voice-check

- **What they give.** The instrument that tells you whether a synthetic persona panel is real. Without it, five persona agents on one model with slightly different prompts will agree with each other and tell you nothing. Section 04 builds the protocol around these two scripts.
- **Use.** No changes needed. `agent-quorum-score.mjs --answers=<file>` with a concept map written for interior design concerns (budget, reversibility, trust in AI renders, delivery time, taste risk, landlord permission, resale value).

### 6 and 7. Concierge copilot and its safety layer

- **What it gives.** An "Ask Designature" assistant on every page that answers from the Journal, FAQ, services and pricing, and points to the right page with a one line reason. Wolf's numbers: one LLM call per turn, 5 dollars a day cap, moderation for free, PII scrubbed analytics.
- **Why later.** The retrieval backend (LightRAG in a separate container) is private and heavy. Designature's corpus is small (FAQ file, a handful of journal posts, services copy), so a simple embedding index or the Gemini File Search tool would do. The real cost is content maintenance and evaluation, and the site's current priorities per the marketing docs are content and distribution, not chat.
- **Reuse now.** `copilotSafety.ts.txt` (budget cap, moderation, fences, PII scrub) is worth lifting into any future LLM text route in `server.ts`. The 51 question eval format is worth copying for any assistant you ship.

### 8. Library MCP pattern

- **What it gives.** A model for letting an agent write to a user's content with a scoped key, an owner session, no delete, and a journal line per call. Relevant if you ever want an agent to draft journal posts into Sanity or maintain the retailer catalogue.
- **Verdict.** Not now. Note the design: key digest only in config, two hour session, journal with the caller's name.

### 9. llms.txt generation

- **What it gives.** AI crawlers get an index and a full markdown dump of the site. Designature's SEO notes already target AI answer engines (GEO). Wolf's workflow regenerates the files in CI from the content source.
- **Adaptation.** A script over `server/seo/content.ts`, `src/data/faqs.ts` and Sanity journal posts, served at `/llms.txt` and `/llms-full.txt` from `server.ts`.

### 10. Governance patterns worth adopting

From the KeepSimple CLAUDE.md and the Atlas doctrine:

- **Evidence before done.** An agent cannot report a task complete without a command it ran, a probe, or a test in the same turn. Designature's CI already enforces tests on push; the rule closes the gap for local work.
- **Dated lessons.** One dated line per incident in CLAUDE.md, in the project where it happened. The Designature repo has SEO notes and specs but no incident log for agents.
- **Font passport.** Allowed sizes, floor, contrast, "if text does not fit, fix the layout". Designature has a Tailwind design; a short passport stops agents inventing sizes.
- **Style skill.** A complete written design system for agents (`keepsimple-style` is the example). Designature's brand is visual; this is where a studio benefits most.
- **Rules budget.** About 300 lines of rules per agent, every line earning its place.
- **Public repo hygiene.** Strip exports before commit, no internal hostnames or paths, a guard script in lint staged. Designature's `.claude/settings.local.json` contains local Windows paths and drive letters; harmless locally, but it should never be committed to a public repo.
- **Release gates.** One batch branch, announce every rebuild, staging and production only on the owner's explicit word.

### 11 and 12. UXCP persona builder and the UX Core API

- The builder is Next.js Pages Router with Strapi and NextAuth; porting the code into a Vite SPA is more work than rewriting the logic. The logic is small: persona = set of bias IDs; for each of 63 questions, relevance = count of persona biases mapped to that question divided by persona size; filter by stage.
- The bias data should come from `/uxcore-api` (public JSON) or from Bob's `biases.md`, never from memory, per his own rule that UX Core data is canonical.

### 13 and 14. Basement, Terminal and the private harness

- Basement is Windows only and solves a problem (many local Claude CLI sessions in one window) that Claude Code on the web already solves for Designature.
- The private harness cannot be reused. What transfers is in section 02 B: one owner per project, SEND TO instead of walking into another project, doors instead of rules, nightly discipline, a queue with per command models, PREP to save decisions.

### 15. Unlicensed repos

vibesuite, glider-docs-copilot and Biases-interactive-UI-guide have no LICENSE file. Read them, do not copy code from them. The 89 demo scenarios exist under MIT inside Bob's references, which is the copy kept here.
