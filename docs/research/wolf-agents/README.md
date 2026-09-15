# Wolf Alexanyan: agents research for Designature Studio

Research date: 15 September 2026.
Subject: Wolf Alexanyan (LinkedIn `alexanyan`, GitHub `manager`), founder of KeepSimple (keepsimple.io), author of UX Core (uxcore.io), umbrella site elea.co.
Question asked: what agents did he build, which of them can Designature reuse, and can they be used to research or test target personas (including the cognitive biases each persona carries).

## Read in this order

| File | What it answers |
| --- | --- |
| `01-profile-and-products.md` | Who he is, every product and publication found, evidence that the work is vibe coded |
| `02-agent-catalogue.md` | Every human, agent, subagent and product on his AI Atlas, the Terminal harness, and every agent, skill and workflow that exists as files in his public repos |
| `03-reuse-assessment.md` | Per asset: licence, what it needs, whether it fits the Designature stack, effort, verdict |
| `04-persona-bias-testing.md` | His persona method (UX Core Persona, Bob, 105 biases, 63 questions), six Designature personas with candidate bias profiles, and a test protocol |
| `05-integration-options.md` | Four integration options with scope and cost. No code was written; the questions to answer before code are listed there |
| `06-sources-and-method.md` | Every URL, repo, branch and file consulted, and what the network blocked |
| `designature-persona-bias-matrix.csv` | The persona × bias matrix as data, ready for a spreadsheet or a script |
| `assets/` | Copies of the open source material worth keeping (Bob skill, QA agent, workflows, Atlas data, copilot architecture, panel scoring tools), with licences |

## Headline findings

1. **The visible "20 agent harness" is private.** The AI Atlas at keepsimple.io/ai-atlas describes 36 nodes: 3 humans, 12 AI agents, 5 AI subagents, 16 products and channels. The orchestration product ("Terminal", successor of the open source Wolf's Basement), the chief of staff agent ("The Order"), the Telegram Receptionist, the Voice, Researcher, QA and DevOps agents, MemPalace memory, Composite Keys and Doors are described in prose and JSON but none of their code is public. What can be reused from that layer is the design: ownership per project, evidence before "done", rules budget, runtime checks, nightly discipline audit.

2. **Five things are genuinely reusable today, all MIT licensed.**
   - **Bob**, a Claude skill: cognitive bias advisor over 105 UX Core biases, 63 curated business questions and 89 before/after demo recipes. Drop in and use during design and copy reviews. Copied to `assets/bob-skill/`.
   - **The QA agent**: a Playwright driven manual QA method with 8 profiles (smoke, canonical, mobile, deploy check, retest and so on), a helper for fingerprints, axe, web vitals and pixel diffs, and a report renderer. Designature has unit tests but no browser QA. Copied to `assets/qa-agent/`.
   - **Claude PR review and @claude mention GitHub workflows**, including a security gate he added after a public repo incident. Copied to `assets/github-workflows/`.
   - **agent-quorum-check and agent-voice-check**: scripts that measure whether a panel of AI agents actually disagrees. This is the instrument you need if you run synthetic persona panels. His own pilot: identical agents agree 100% of the time, three written charters drop that to 78%, three different models to 56%. Copied to `assets/agent-panel-tools/`.
   - **The Ask UX Core copilot architecture**: widget, concierge API, RAG, Postgres event log, safety layer (daily budget cap, moderation, prompt injection fences, PII scrub) and a 51 question eval set. The RAG backend is private; the design and the safety code are public. Copied to `assets/concierge-copilot/`.

3. **Persona testing is his home turf and it maps well onto Designature.** UX Core Persona (keepsimple.io/uxcp) builds a persona as a named set of biases and derives which of 63 product questions matter for that persona, per product stage. Bob is the agent form of the same data. Section 04 builds six Designature personas (renter, homeowner renovator, realtor, short stay host, Yerevan local client, free tier tinkerer) with bias profiles drawn from the 105, tied to concrete Designature surfaces (style quiz, AI Vision, shopping list, pricing, consultation).

4. **The honest limits.** Synthetic personas generate hypotheses, they do not replace users. His pilot shows that a panel of clones is one opinion counted N times, so a persona panel only means something if the charters and models differ and the quorum score says so. Bias 33 in his own library (Bias Blind Spot) says never cite psychology to users; use the biases in design, never in copy.

## Verdict at a glance

| Asset | Available | Verdict for Designature |
| --- | --- | --- |
| Bob bias advisor skill | Yes, MIT | Reuse as is, immediately |
| QA agent (skill, profiles, helper, renderer) | Yes, MIT | Adapt config, high value |
| Claude PR review + mention workflows | Yes, MIT | Adapt prompt, needs a Claude OAuth token secret |
| agent-quorum-check, agent-voice-check | Yes, MIT | Reuse as is for persona panel research |
| Concierge copilot (widget + API + safety) | Partly (backend private) | Pattern for a future "Ask Designature", not now |
| Library MCP (scoped agent write access) | Yes, MIT | Pattern only, later |
| llms.txt generator workflow | Yes, MIT | Small, worth doing |
| AGENTS.md / CLAUDE.md governance, font passport, style skill | Yes, MIT | Adopt selected rules |
| Wolf's Basement (4 agent multiplexer) | Yes, MIT, Windows | Not needed |
| Terminal, The Order, Receptionist, Voice, Researcher, DevOps, Multimove, SeoGeoSolver, AgentsForge, elea products, Composite Keys, Doors, MemPalace | No | Design lessons only |
| Tom longevity skill, UXCAT test | Not in repos | Irrelevant to Designature |
| vibesuite skill map, glider docs copilot | Public, no licence file | Reference only |

## What I did not do

No integration code was written and nothing outside this folder was changed, in line with your standing instruction to ask before generating code. Section 05 lists the options and the questions that decide between them.
