# 02. Agent catalogue

Two layers exist. The **Atlas layer** is his private production harness; only its map is public. The **repo layer** is what you can actually download: skills, workflows, specs and scripts in public repositories.

## A. The Atlas: every node

Source: `assets/ai-atlas/data.json` (the file the page renders from) plus the Atlas guide and Wolf's prose (`guide.json`, `features.ts`). Ring numbering is his.

### Humans (3)

| Node | Ring | Role |
| --- | --- | --- |
| Wolf | 0, apex | Sole direction and final judgment. "I am the only human in the loop, and the loop is built so that one human is enough." |
| Engineering lead, KeepSimple (human) | III | Human custodian of the open source wing, pairs with the AI lead |
| Orchestrator (human) | III, Multimove | Human coordinator inside the content and PR territory |

### AI agents (12)

| Node | Ring | Role | Authority | Reports to | CLAUDE.md |
| --- | --- | --- | --- | --- | --- |
| The Order | I, orchestrators | Chief of staff, server owner | Full: secrets, infra, ingress. Executes restarts and rebuilds itself. The only agent that reaches Wolf on its own, by Telegram, or by phone call when it cannot wait | Wolf | |
| Receptionist | outside all rings | Public Telegram front desk (t.me/WolfsReceptionist_bot). Greets, verifies identity, opens doors to agents or a guided Atlas tour. "Nothing spends or escalates without Wolf" | Verify, route | Wolf | 84 lines |
| Voice Agent | II, dev environment | Voice gateway: Whisper transcription, ElevenLabs synthesis, hardened against impersonation | Read host, binary confirmations | The Order | |
| QA | II | Shared QA brain: change aware fingerprint memory, accessibility, web vitals, visual regression. "Reads every product as a user would, files reports" | Browse, test, report | The Order | |
| Researcher | II | Drives a real browser, deep research, research tasks for other agents | Web, social, digest only | The Order | |
| Engineering lead, Terminal | III | Owns the Terminal codebase | Codebase, escalates infra | Wolf | |
| Engineering lead, Multimove | III | Owns Multimove | Codebase, channel orchestration | Wolf | |
| Engineering lead, AgentsForge | III | Owns AgentsForge | Codebase, escalates infra | Wolf | |
| Engineering lead, elea | III | Owns elea | Codebase, escalates infra | Wolf | |
| Engineering lead, SeoGeoSolver | III | Owns SeoGeoSolver | Codebase, search and GEO experiments | Wolf | 142 lines |
| Engineering lead, KeepSimple | III | Owns keepsimple.io, UX Core, AI Atlas | Codebase | Wolf | 34 lines |
| EMBER | III, AgentsForge | Stealth mode AgentsForge agent, "in forge" | | AgentsForge | |

### AI subagents (5)

| Node | Ring | Role | Authority | Reports to |
| --- | --- | --- | --- | --- |
| DevOps | II | Container hygiene: builds, restarts, healthchecks. "Touches images, never secrets" | Containers, builds, logs | The Order |
| Telegram | IV, impact | Multimove distribution channel | Post, reply, ingest | Orchestrator (human) |
| LinkedIn | IV | Multimove professional surface | Post, reply, ingest | Orchestrator |
| Twitter | IV | Multimove X outpost | Post, reply, ingest | Orchestrator |
| Medium | IV | Multimove long form channel | Publish, update | Orchestrator |

### Products and channels (16)

Tools and Tweaks, Terminal, Multimove, AgentsForge, elea, SeoGeoSolver, KeepSimple wing, Whisper, Echo (stealth), Choir (stealth), keepsimple.io, UX Core, NASA, Arc of Self, Vibecode Group, KeepSimple Channel. Details in `01-profile-and-products.md`.

### Shared infrastructure named on the Atlas

- **Apex Launcher**: live Docker dashboard, read only proxy, forced command SSH gate.
- **Wolf's Terminal**: the agent shell (see B).
- **MemPalace**: project keyed long term memory "wings"; agents file decisions with a PREP command and a session start hook hands recent entries back. His own audit: 41% of sessions end with a save; most auto mined entries were noise, so search now skips them.
- **context-mode**: context compression, quoted as 98 KB to 1.3 KB.
- **CodeGraph**: symbol index MCP; "doors" redirect whole file reads into it.
- **CLAUDE.md cascade**: global rules, project rules, sub project rules. Target budget about 300 lines total per agent.
- **QA Officer**: the shared QA brain above.
- **gitops wrapper**: one personal access token, one locked git identity, every agent's git and GitHub operation routes through it.
- **Cloudflare Tunnel and Access**: nothing on the server listens to the internet directly.
- **Tailscale mesh, own VPN and proxy pool** for research work.
- **Telegram** as the human channel: alerts, voice tasks, Reception.

## B. The Terminal harness: how one task moves

The Atlas page is organised as six stages of one task with fifteen "tiles" (features) around them. Summarised from Wolf's own prose in `assets/ai-atlas/features.ts.txt`.

| Stage | Where | What happens |
| --- | --- | --- |
| 1 Project | Terminal | Pick a project. A project is a folder with its own rules, memory, backlog, activated Keys and exactly one owning agent |
| 2 Task | Browser, voice or Telegram | Brief the agent like a colleague. Choose recipient, model, effort, reply length. One task or fifteen queued |
| 3 Dispatch | Server | Terminal puts the message into that project's session on the chosen engine (Claude or Codex) and subscription track. Mid turn steering allowed |
| 4 Prepare | Agent session | Loads global rules, project rules, memory index, saved decisions, and the nightly discipline notice about itself |
| 5 Work | Server plus model provider | Tools run on his server, thinking at the provider. Doors check the work while it happens. SEND TO asks a colleague agent or a human |
| 6 Result | Browser | Streams back. Work stays as files, commits, deployments. Backlog task closes only on Wolf's confirmation |

The fifteen tiles:

1. **Composite Keys.** Reusable capability bundles: where a thing goes, git checks that fail loudly, a credential holding agent, interface behaviour, data it may not touch, sometimes a skeleton. Activating keys gives "40 to 80% of the work done upfront with a single prompt". Keys ask calibration questions once and remember the answers.
2. **Backlog.** Ideas per project; also how Key updates propagate as questions, never silent rewrites.
3. **Message.** Typed, spoken, or from Telegram, with attachments; DEF or SIM reply mode.
4. **Smart Queuing.** Server owned queue, each command with its own model, PREP and CLEAR as queue items, delayed start, runs with the laptop closed.
5. **Engine switch.** Claude or Codex per project, three to five subscription "tracks" per engine, soft handover with context carried.
6. **Live Steering.** A message to a busy agent goes into the running turn.
7. **Global CLAUDE.md.** How agents talk to him, where authority ends, what counts as done. The evidence rule: an agent may not certify its own work; done needs an exit code, a probe, a test that ran, or another agent with a clean context. The logging law: every mechanism leaves one line per run. Audited monthly against what broke.
8. **Local CLAUDE.md.** Three layers: laws left by activated Keys (UI passport with type scale and contrast floor, security passport), the project template (purpose, vendor credits, a shutdown checklist "a project knows how to die from the day it is born"), and dated lines of what went wrong here.
9. **Session start.** A hook hands the agent recent decisions and the nightly notice before the first word.
10. **Doors.** Runtime checks that cannot be skipped: echo your understanding before building; file reads go to the symbol index; after every edit check type sizes and colours against the passport, reduced motion, layout jumps, and AI filler words ("after I found the word seamless in one of my own modals"); at turn end, no "done" without evidence in the same turn.
11. **AI Collaboration (SEND TO).** One agent asks another project's owner in one line; two hops maximum; Auto Mode lets an armed pair work unattended until the hop limit or a repeated message.
12. **Human Collaboration.** People are on the same roster as agents with handles; a line to a person leaves for Telegram; granted people can hand tasks in from their own chat.
13. **Conversation history.** Every session archived past CLI retention, full text search, monthly read back that produces rule change proposals with evidence.
14. **Saved decisions.** "A reply saying noted is not a save."
15. **Discipline.** Nightly scan with no model over each agent's transcripts: charter breaks, rulings, hand edits. Becomes a notice the agent reads next morning; monthly, repeat offences become global rules or doors.

Other named mechanisms: LOOP (agent offers three candidates with metric, baseline, gain, cost, risk), Arena (outcomes reported to Telegram), watchers (monitor after delivery, never repair), turn measurements (latency per engine and slot, no prompt text stored), 14 day trash for killed sessions, one line epitaph for scheduled ends.

## C. Wolf's Basement (open source predecessor of Terminal)

MIT, Windows 11, Node plus Express plus Phaser 3. Four pixel art agents, each an independent Claude Code session: Igor (fearful servant), Elon (bitter ex noble), Misa (amnesiac gothic lolita), The Void (an orange cat). Personas are injected with `--append-system-prompt-file` and written to each workspace CLAUDE.md, capped at two lines of roleplay before real work. Features that survived into Terminal: SEND TO between agents, INIT (compact context and update CLAUDE.md), PUSH, CLEAR, per agent model and permission mode, dev server manager, git status bar, permission prompts, 249 built in UI tests. Files: `assets/wolfs-basement/`.

## D. Agents, skills and workflows that exist as files (reusable layer)

### D1. Bob, cognitive bias advisor (Claude skill)

- Files: `assets/bob-skill/SKILL.md` (11 KB) plus references: `bias-index.md` (105 biases, one line each), `biases.md` (136 KB full entries), `question-index.md` (63 questions), `questions.md` (188 KB curated answers with mapped biases), `demo-recipes.md` (89 before/after UI scenarios). Also shipped as a downloadable zip `bob.skill` on keepsimple.io/tools and as `.claude/skills/bias-advisor/` in UXCoreOSS.
- Method: problem first (match the user's problem to one of 63 questions, pull the mapped biases) or bias first (scan the index, pick 3 to 5). Always a "Watch out" section. Renders ASCII before/after in the CLI, HTML artefacts in chat.
- Voice rules and gotchas learned from testing: do not default to Von Restorff and Bandwagon; do not pad to five; no loss framing on welcome screens; escalation of commitment feels manipulative in wellness products; aggressive "watch out" wording triggers reactance.
- History: Bob first appeared as a custom GPT in early 2024 ("Introducing Bob, a GPT expert" on LinkedIn), then became a Claude skill in 2026.
- Also on the tools page: **Tom**, a longevity protocol skill (food photo checks, workouts, sleep, supplements). Not in any public repo (only a branch `feat/import-tom` and an icon).

### D2. QA agent (keepsimple-qa)

- Files: `assets/qa-agent/SKILL.md` (method), `PROFILES.md` (scope per profile), 8 slash commands (`qa-init`, `qa-smoke`, `qa-locale-smoke`, `qa-canonical`, `qa-mobile-followup`, `qa-full-matrix`, `qa-deploy-check`, `qa-retest`), `helper.mjs` (batch fingerprints, axe, web vitals, screenshots, pixelmatch), `render-report.js` (markdown to HTML), example `qa-config.yml` and `known-issues.md`.
- Method: pre flight (MCP connected, build ID captured), fixed pass (must work flows per section, locale routing, 404, mobile), exploratory pass with hard coverage rules (every route, both viewports, at least two locales, ten interactions per route including one "weird" one), per page checklist (console, network, broken images, layout, SEO basics), JSON findings with a severity rubric, coverage table, diff against the prior run with fixed status words.
- Constraints: never logs in or submits real data; never trims viewport coverage to save time; never auto updates the findings register.

### D3. GitHub workflows

- `claude-pr-review.yml`: Claude reviews every non draft, non fork PR with a repo specific prompt (hooks, SSR safety, conventions, accessibility, security, styling), inline comments only through a scoped tool, 120 turn cap, 15 minute timeout, cancel in progress per PR.
- `claude-mention.yml`: @claude on issues and PRs. Gated on `author_association` in OWNER, MEMBER, COLLABORATOR after they found that matching on the text alone let any GitHub user run the job with the OAuth token in the environment.
- `generate-llms.yml`: regenerates llms.txt, llms-full.txt and per page markdown for AI crawlers.

### D4. Ask UX Core concierge copilot

- Architecture (`assets/concierge-copilot/widget-architecture.md`): host page, widget UI (pill, panel, cards with "why this", host element highlight, hover prefetch), widget brain (page identity from URL slug, history, last card clicked), concierge API (identity resolution, intent tag GLOBAL vs SPATIAL without an LLM, candidate pool, one LLM call, streamed answer), LightRAG retrieval, curated knowledge.
- Models: Claude Sonnet 4.6 for answers, OpenAI gpt-4.1 as the alternative, gpt-4o-mini inside LightRAG for graph extraction.
- Safety layer (`copilotSafety.ts.txt`): daily budget cap (5 dollars default at 0.04 per call), OpenAI moderation that fails open, XML fences for injected content, PII scrub before analytics.
- Analytics (`copilot-analytics-spec.md`): a sibling Postgres service with an HTTP ingest, events for question, answer, clear, card click, nav, page view, dwell, outbound click, auth link; fire and forget; the widget never sees the write token.
- Evaluation: `widget_eval_v1.jsonl`, 51 questions with expected citations and keywords, plus a corrections log where 8 wrong bias IDs were caught.
- Homepage starters are hand written and served without an LLM call.
- Article draft explains the criteria: high fidelity, friendly, dirt cheap, unique; "if I mess up with LLM APIs, thousands of users will bankrupt me in a week".

### D5. Library MCP

Five tools an agent can hold on one user library through one key: list books, create or edit a tag, tag books, order a tag's books, edit a book's note, rating or difficulty. Nothing deletes. The key is exchanged for a two hour owner session; only a SHA256 digest is stored in the CMS; every call is journaled with the client's own name, arguments, outcome and duration. File: `assets/concierge-copilot/library-mcp-README.md`.

### D6. Library AI shelf

A book recommendation "roll" run as a background job with client polling, because the model call exceeded the 60 second edge timeout. Includes an "AI accuracy ledger". An agent living inside a product feature rather than a dev tool.

### D7. UX Core Persona builder (UXCP)

In UXCoreOSS. Persona is a name plus selected biases. The system intersects the persona's biases with the 63 questions and scores relevance as the share of selected biases pointing at each question (high, medium, low). Five product stages filter the questions: Team forming, Development, Pre signup (marketing), Post signup (product use), Analytics. "Analyze as a team member" mode surfaces the biases to watch when working with that person. Suggested questions are ones that appear too often among persona relevant questions to ignore. Sharing is a URL. Example personas on the site: Steve Jobs, Warren Buffett, Uber user Middle East, iPhone user Somali, Twitter crypto influencer.

### D8. Repo governance for agents

- `AGENTS.md` (human readable conventions) and `CLAUDE.md` (machine facing, imports AGENTS.md, adds rulings). Includes a **font passport** comment block: allowed font sizes, floor 8 px, contrast 4.5:1, "if text does not fit, fix the layout".
- `keepsimple-style` and `uxcore-style` skills: complete design system specs so an agent never invents colours or spacing.
- `LIBRARY_AGENT.md`: feature level agent guidance with a definition of done.
- The **A to Z ownership** ruling: the KeepSimple lead runs keepsimple.io solo through a `keepsimple-ctl` lever; only host level asks go to The Order; production writes require Wolf's quoted, dated go.
- The **public repo** ruling after an internal data leak: exports are stripped by a script before entering the tree, a `no-internal-data` guard runs in lint staged with no bypass.
- Release lessons dated 2026-09-07: batch features on one branch, announce every rebuild, reuse AI reviews only when the diff is unchanged, measure review, build, transfer and rollout separately.

### D9. Research instruments (personal repos, MIT)

- **agent-quorum-check**: give several agents the same decision blind, collect choice plus three concerns, score choice agreement, concern overlap (Jaccard over a concept map), union size and the marginal value of the Nth agent. Pilot 2026-08-24: three tasks, nine agents. Clones (same model, same prompt) agreed 100%, third agent added 0.33 of a new concern. Three charters on one model: 78%. Three models (Claude Sonnet 5, Haiku 4.5, Fable 5): 56% and roughly double the distinct concerns. Independent choosers would sit at 33%.
- **agent-voice-check**: reads Claude Code transcripts and runs leave one out authorship attribution on function words and structure. On his 19 agent fleet the classifier identified the agent 30.5% of the time versus 72.7% for the human in the same rooms. Conclusion: separate prompts, memory and projects did not produce separate voices.

### D10. Other personal repos

- **vibesuite** (vibesuite.vercel.app): a skill map for vibe coders, 10 categories, 45 skills, each generating a first person instruction to paste into an AI assistant, with a local recommendation engine. Blunt editorial voice ("Most knowledge workers are becoming irrelevant. Not next year. Right now."). No licence file.
- **glider-docs-copilot**: local first docs assistant, browser side embeddings with Xenova MiniLM, no server LLM. No licence file.
- **lightshot-we-deserve** (Tauri screenshot app), **MotionEase** (motion sickness overlay), **simple-jsx-viewer** (Chrome extension), **eliza** fork.
- **Biases-interactive-UI-guide**: 89 interactive before/after bias demos as React components, data with scenario, withoutBias, withBias, whyItWorks. No licence file; the same 89 recipes are in Bob's `demo-recipes.md` under MIT.

## E. Not available anywhere public

Terminal source, The Order, Receptionist, Voice Agent, Researcher, QA Officer's own code, DevOps subagent, Multimove and its channel subagents, SeoGeoSolver, AgentsForge and EMBER, elea's Whisper, Echo, Choir, Composite Keys, Doors, MemPalace configuration, the uxcore-rag backend, Tom. For these the only reusable material is the design described in section B.
