# 05. Integration options (no code written yet)

Your standing instruction is to ask before generating code, so this file scopes the options and lists the decisions that pick between them. Everything below can be started from the files in `assets/`.

## Option A. Zero code: use the agents in the development loop

What it is: copy the Bob skill and the QA agent into `.claude/` in this repo, write a `qa-config.yml` for Designature, and start running `/bob` in design reviews and `/qa-smoke` after deploys.

- Files touched: `.claude/skills/bob/`, `.claude/skills/designature-qa/`, `.claude/commands/qa-*.md`, `qa-config.yml`, `known-issues.md`, a `reports/` folder (gitignored or committed, your call).
- Website runtime: untouched.
- Cost: your time. Playwright MCP must be enabled in Claude Code for the QA runs.
- Risk: none to the product.
- Value: immediate. This is where I would start.

## Option B. Light code: automation around the repo

1. **Claude PR review workflow.** Adapt `assets/github-workflows/claude-pr-review.yml` with a Designature prompt (React and Tailwind conventions, Express route hygiene, no secrets in the bundle, vitest for changed services). Needs a `CLAUDE_CODE_OAUTH_TOKEN` repo secret.
2. **llms.txt and llms-full.txt** served from `server.ts`, generated from `server/seo/content.ts`, `src/data/faqs.ts` and Sanity journal posts. Complements the existing GEO work in `SEO-NOTES.md`.
3. **A CLAUDE.md for this repo** with a font passport, an incident log section, the evidence rule and the release rule. There is none today.

- Effort: a day in total.
- Risk: low. The PR review consumes subscription quota per PR; cap it as Wolf does.

## Option C. Research tool: persona panel

What it is: a script (not a website feature) that runs the six persona charters from `04-persona-bias-testing.md` against Designature surfaces, collects JSON answers, and scores them with `agent-quorum-score.mjs`. Output: a markdown report per run under `docs/research/persona-panels/`.

- Files: `scripts/persona-panel/` (charters as markdown, tasks as JSON, a runner that calls the model API, a concept map for the scorer).
- Model access: needs an API key for at least two different model families to satisfy the panel diversity finding. The repo already has `GEMINI_API_KEY` and `OPENAI_API_KEY`; an Anthropic key would add a third family.
- Effort: two to three days including the concept map and the first run.
- Value: hypotheses for the pricing page, the quiz and the AI Vision flow, ready for A/B tests on the tracking that already exists.
- Risk: reading synthetic answers as user evidence. The protocol in section 04 has stop conditions for that.

## Option D. Product feature: Ask Designature copilot

What it is: a site wide assistant in the spirit of Ask UX Core: a pill on every page, answers from FAQ, journal, services and pricing, two or three link cards with a one line "why this", streamed answers, safety layer, event log in the existing Postgres.

- Files: a new `services/copilot/` (retrieval, prompt, safety copied from `copilotSafety.ts.txt`), routes in `server.ts` (`/api/concierge`, `/api/copilot/event`), a widget component, an eval file with 40 to 50 questions.
- Retrieval: the corpus is small, so no graph RAG; an embedding index rebuilt from Sanity on a schedule, or Gemini's file search. No new container.
- Cost: LLM spend per turn with a daily cap, plus a week or two of build and a content owner to keep answers correct.
- Value: real once traffic and content justify it; today the marketing plan prioritises content and distribution.
- Recommendation: after the journal has 20+ posts and the FAQ is stable.

## Decisions I need from you before writing any code

1. **Start with A only, or A plus B?** A needs nothing from you except enabling Playwright MCP. B needs a Claude OAuth token in GitHub secrets.
2. **For the persona panel (C):** which two or three model families may it call, and is a small monthly spend on API calls acceptable for research runs?
3. **Do you want the six personas as written, or should some be merged or replaced?** The realtor and short stay host personas come from the virtual staging spec; if that product line is parked, drop them.
4. **Is the repository public or private?** It changes what may sit in `.claude/settings.local.json` and whether the mention workflow is worth enabling at all.
5. **Language.** The code is English only today while the marketing docs plan Armenian and Russian pages. The persona work for P5 assumes locale testing is coming; confirm.
6. **Copilot (D):** park until the content milestone above, or scope it now?

Answer these and I will generate the code for the options you pick, in this branch.
