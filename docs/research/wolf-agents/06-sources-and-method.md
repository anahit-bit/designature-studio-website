# 06. Sources and method

Research run on 15 September 2026 from a sandboxed environment. Only GitHub was reachable through the network proxy; the domains below were blocked and were reconstructed from search engine snippets. Everything quoted from a blocked page is therefore second hand and marked so.

## Blocked (read via search snippets only)

- linkedin.com/in/alexanyan and all LinkedIn posts
- elea.co
- keepsimple.io (including /ai-atlas, /tools, /uxcp, /uxcore, /uxcg, /articles)
- uxcore.io
- medium.com (all articles)
- arc-of-self.com, x.com, web.archive.org, freedium mirrors

## Read in full (GitHub)

Organisation `keepsimpleio`:
- `KeepSimpleOSS` (full clone, all 151 remote branches, default branch `dev`, last commit 2026-09-11). Files read: `AGENTS.md`, `CLAUDE.md`, `README.md`, `LIBRARY.md` (head), `UXCORE_RAG_HANDOFF.md`, `UXCORE_RAG_PLACEMENT_BRIEF.md`, `known-issues.md`, `qa-config.yml`, `.claude/skills/keepsimple/SKILL.md`, `.claude/skills/keepsimple-style/SKILL.md`, `.claude/keepsimple-qa/*`, `.claude/commands/qa-*.md`, `.github/workflows/*`, `mcp/library/*`, `docs/widget-architecture.md`, `docs/copilot-analytics-spec.md`, `docs/article-drafts/copilot-not-search.md`, `docs/delta-indexing-proposal.md` (title only), `eval/*`, `qa-runs/README.md`, `src/lib/aiAtlas/*`, `public/ai-atlas/data.json` and `data-ru.json`, `src/lib/widget/*`, `src/lib/copilotSafety.ts`, `src/components/library/LIBRARY_AGENT.md`, `public/keepsimple_/assets/tools/bob.skill` (from branch `add-claude-github-actions-1777213374385`, unpacked).
- `UXCoreOSS` (shallow clone). Files read: `README.md`, `AGENTS.md`, `.claude/skills/bias-advisor/*`, `.claude/skills/uxcore-style/SKILL.md`, `src/data/uxcp/en.ts`, `src/data/uxcgQuestions/en.ts` (head), `src/api/personas.ts`, `src/api/biases.ts`, component tree under `src/components/_uxcp/`.
- `Biases-interactive-UI-guide` (shallow clone). `src/data/biases.ts`, demo component list (89), `AGENTS.md`, `CLAUDE.md`.
- `.github` profile repo.

User `manager` (Wolf Alexanyan):
- `agent-quorum-check` (README, script, full pilot folder), `agent-voice-check` (README, script), `wolfs-basement` (README, AGENTS.md, CLAUDE.md, server.js persona block), `vibesuite` (README, AGENTS.md, CLAUDE.md, source tree), `glider-docs-copilot` (README), `MotionEase`, `simple-jsx-viewer`, `something` (empty). Not cloned: `lightshot-we-deserve`, `eliza`, `dev`.

Pull requests read: KeepSimpleOSS #227 (AI Atlas finished, AI shelf async), list of #227 to #236.

## Search queries that produced the snippets

"Wolf Alexanyan elea.co founder"; "keepsimple.io Wolf Alexanyan agents"; "keepsimple.io AI Atlas agents map humans products"; "The map of AI agents I promised"; "One agent is a tool. Ten agents is a career"; "The Vibecoding Ladder"; "elea.co Wolf Alexanyan products list"; "uxcore.io cognitive biases UX Core personas persuasion tool"; "keepsimple.io uxcp UX Core Persona 105 biases 63 questions"; "keepsimple.io/tools AI skills GPTs thinking frameworks"; "keepsimple.io Bob cognitive bias advisor Claude skill Tom"; "Arc of Self Wolf Alexanyan"; "Introducing Bob GPT expert"; "Nineteen Agents, One Voice" (no result).

## Method notes

- Branch sweep: every remote branch of KeepSimpleOSS was diffed against `dev` for files matching atlas, agent, persona, uxcp, skill, mcp, copilot, widget, bob, tom, claude, llms, gpt, rag, eval, prompt. The agent material is concentrated on `dev`, `feat/QA-Agent`, `feat/agent-review-handoff`, `feat/ai-atlas*`, `feat/global-widget*`, `feat/library-mcp`, `feat/copilot-*`, `feat/tools-page`, `feat/import-tom`, `feat/import-vibesuite`, `chore/claude-pr-review`, `chore/gate-claude-mention-workflow`, `chore/llms-files`, `order/free-runner-disk-2026-05-26`.
- Commit authorship counts come from `git log` on the full clone.
- The Atlas node counts (3 humans, 12 agents, 5 subagents, 16 products and channels) are counted from the `kind` field in `data.json`. The Russian data file has the same keys.
- Copied assets are limited to repositories with an MIT licence file. Repos without one (vibesuite, glider-docs-copilot, Biases-interactive-UI-guide) are described, not copied.
- A personal email address present in one handoff document was not copied into this folder.
