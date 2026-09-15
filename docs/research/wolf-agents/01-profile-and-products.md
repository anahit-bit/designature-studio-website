# 01. Profile, products and publications

## Who

- **Name:** Wolf Alexanyan. Handles: LinkedIn `alexanyan`, GitHub `manager` (also org `keepsimpleio`), X `AlexanyanWolf`, Medium `@alexanyanwolf`.
- **Day job:** COO and CPO at Hexens (crypto security). His profile credits him with a finding that put more than 70 billion dollars of crypto at risk, covered by CoinDesk.
- **Background claimed on elea.co:** 16+ years in IT, lawful cyber intelligence systems, digital forensics labs, data warehousing, cognitive and behavioural science.
- **KeepSimple:** founded 2019 as a free public initiative at the intersection of management, IT and cognitive science. Claims 300,000+ users worldwide.
- **UX Core:** launched 2020. 105 cognitive biases, 1,000+ practical examples for product, engineering and HR. Recognised by Dan Ariely publicly (he reposted the persona article on LinkedIn). Claims use at Duke, Harvard Business School, MIT, Google, Yandex, Amazon.
- **Arc of Self:** a recursive theory of identity, attention and choice, 17 years of personal research, 14 node re-entrant architecture in four phases (Hardware, OS Install, Engine, Loop). Published on Zenodo, DOI 10.5281/zenodo.21991757, site arc-of-self.com.

## The elea.co product list

elea.co is his umbrella page ("elea by Wolf Alexanyan"). It describes every product as built solo, end to end, on a personal harness of 20 agents that he says runs three to four months ahead of what Anthropic and OpenAI ship to retail users. The page itself was blocked by the network proxy; the list below is reconstructed from search engine snippets of the page.

| Product | Category | One line |
| --- | --- | --- |
| KeepSimple | Cognitive science, public good | Free open source management frameworks and behavioural science tools for IT leaders |
| VIBECODE.SPACE | Internet of things | A countryside house turned into one big IoT project |
| INDAGARO | Market intelligence | Market intelligence for investors, analysts and founders |
| ORBIS FELIX | AI token sharing, public good | Share a slice of your AI limits with those who cannot afford their own |
| ARC OF SELF | Cognitive science, public good | The identity theory above |
| ELEA ROBOTICS | Robotics, embodied AI | Experiments including a hijacked Vector robot |
| AEVUM | Health intelligence | Every wearable pooled into one model that says what to fix next |

## Products on the AI Atlas (September 2026 build)

These come from the Atlas data file shipped in the KeepSimpleOSS repo (`assets/ai-atlas/data.json`).

| Product | Territory | Lead | Notes |
| --- | --- | --- | --- |
| Terminal | Everything builder | AI engineering agent | Successor of Wolf's Basement. CLI multiplexer running 6+ agents (Claude, ChatGPT, any). Features: init audit, access table, auto warm, bring your own auth, send to |
| Multimove | Content and PR | AI engineering agent, human Orchestrator | Automates KeepSimple social assets. Subagents: Telegram, LinkedIn, Twitter, Medium |
| AgentsForge | B2C, B2B2C | AI engineering agent | "Agentic AI personalities grounded in behavioural science". agentsforge.com. One stealth agent, EMBER |
| elea | B2B SaaS, intelligence | AI engineering agent | Lawful cyber intelligence. Products: Whisper (quiet listening tier), Echo and Choir (stealth) |
| SeoGeoSolver | SEO + GEO | AI engineering agent (142 line CLAUDE.md) | Search engine plus generative engine optimisation workshop, "does the model cite this" |
| KeepSimple wing | Education | AI engineering agent (34 lines) plus a human lead | keepsimple.io, UX Core (uxcore.io), NASA (nasa.am, flash vibecoding hackathons), Arc of Self, Vibecode Group (t.me/vibecodearmenia), KeepSimple channel (t.me/keepsimple) |
| Tools and Tweaks | Dev environment | The Order | Apex Launcher dashboard, Wolf's Terminal shell, MemPalace memory, context-mode compression, CLAUDE.md cascade, QA Officer, gitops wrapper |

## keepsimple.io surfaces

From the repo's own content map (AGENTS.md):

| Surface | Path | What |
| --- | --- | --- |
| UX Core | `/uxcore/<n>-<slug>` | 105 biases with examples. Public JSON API at `/uxcore-api` |
| UXCG | `/uxcg/<slug>` | 63 business problem cases, each mapped to biases. PDFs in EN and RU |
| UXCP | `/uxcp` | Persona builder using biases (desktop only) |
| UXCAT | `/uxcat` | Self awareness test with leaderboard and certificates |
| Articles | `/articles/<slug>` | About 25 long form pieces |
| Company Management (Pyramids) | `/company-management` | Framework for remote first software teams |
| Tools | `/tools/<name>` | Bob (bias advisor skill), Tom (longevity skill), vibe coder skill tree, Longevity Protocol |
| AI Atlas | `/ai-atlas` | The agent map |
| Library | `/library` | User libraries of books, videos, music, with an AI shelf and an MCP |
| LLM dumps | `/keepsimple_/llms.txt`, `llms-full.txt` | Machine readable corpus |

## Publications found

| Title | Where | Date |
| --- | --- | --- |
| The map of AI agents I promised. An open Atlas of how KeepSimple runs | Medium, Bootcamp | May 2026 |
| One agent is a tool. Ten agents is a career | Medium | May 2026 |
| The Vibecoding Ladder: a simple step by step guide | Medium, Bootcamp | 4 June 2026 |
| Creating User Persona with Cognitive Biases and UX Core | Medium | 2022 (reposted by Dan Ariely) |
| UX Core: A Reintroduction to Cognitive Clarity | Medium, Bootcamp | undated |
| Cognitive Science and User Experience: A New Dimension of Abstract | Medium | undated |
| UX Core, The Science of User Experience | Medium | undated |
| How to Create Behavioral User Personas That Drive Better UX Decisions | keepsimple.io/articles | undated |
| Introducing Bob, a GPT expert | LinkedIn post | early 2024 |
| Cognitive Bias and Software Development (episode 51) | ITX podcast | undated |
| I set out to build a search bar, I ended up with a copilot | draft in repo `docs/article-drafts/` | 2026 |
| Nineteen Agents, One Voice | referenced by agent-voice-check README, not found online | 2026 |

Key lines from the articles (from snippets, the pages themselves were blocked):

- "You won't lose your job to AI, but to someone exactly like you who learned to manage agents."
- Vibecoding Ladder levels: 0 you use the chat app; 1 you switch on bypass mode and let it run commands; 2 you find CLAUDE.md but barely touch it. Higher levels were not visible in snippets.
- The Atlas has five rings; the size of an agent's CLAUDE.md is his proxy for how much trust the company placed there.

## Evidence that the products are vibe coded

- KeepSimpleOSS has 793 commits. 452 of them carry a Claude co-author trailer: Opus 4.7 (271), Fable 5.1 (75), Opus 5 (54), Fable 5 (30), Opus 4.7 1M context (11), Opus 4.6 (2), plus lowercase variants (9).
- Authors: `manager` 373, MaryWylde / Mary Khachatryan 364 (the human engineering lead on the Atlas), Wolf Alexanyan 51, Gor Saribekyan 3, github-actions 2.
- 151 remote branches. The branch names are a changelog of the agent work: `feat/QA-Agent`, `feat/agent-review-handoff`, `feat/ai-atlas`, `feat/global-widget`, `feat/library-mcp`, `feat/copilot-money-fix`, `feat/import-tom`, `feat/import-vibesuite`, `feat/script-for/vibecoded-website`, `order/free-runner-disk-2026-05-26` (a branch made by The Order agent), `openai-astra-disaster-fixing`, `library-fix-openai-astra-sucks`.
- The repo CLAUDE.md is addressed to agents by name ("KS Lead", "The Order") and records rulings dated by day, for example the 2026-09-09 rule that nothing reaches staging or production without Wolf's word in the conversation.
- His personal repos are small, fast, single purpose tools (screenshot app in Rust, motion sickness overlay in Python, Chrome JSX viewer, docs copilot), each with the marks of one person plus agents.
