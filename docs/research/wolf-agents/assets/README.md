# Assets copied from Wolf Alexanyan's public repositories

All files here come from repositories that carry an MIT licence (copies in `licenses/`). Attribution: Wolf Alexanyan, KeepSimple (keepsimpleio/KeepSimpleOSS, keepsimpleio/UXCoreOSS, manager/agent-quorum-check, manager/agent-voice-check, manager/wolfs-basement). Snapshot taken 15 September 2026.

| Folder | Contents | Origin |
| --- | --- | --- |
| `bob-skill/` | `SKILL.md` plus `references/` (bias index, 105 biases, question index, 63 questions with answers, 89 demo recipes). Ready to copy to `.claude/skills/bob/` | KeepSimpleOSS `public/.../tools/bob.skill`, UXCoreOSS `.claude/skills/bias-advisor` |
| `qa-agent/` | QA method skill, profiles, 8 slash commands, helper CLI, report renderer, example config and known issues | KeepSimpleOSS `.claude/keepsimple-qa`, `.claude/commands`, `qa-runs` |
| `github-workflows/` | Claude PR review, @claude mention with author gate, llms.txt generation | KeepSimpleOSS `.github/workflows` |
| `ai-atlas/` | `data.json` (every node), `guide.json` (harness guide), `features.ts` (Wolf's prose per feature), `copy.json` (page copy) | KeepSimpleOSS `public/ai-atlas`, `src/lib/aiAtlas` |
| `concierge-copilot/` | Widget architecture, analytics spec, safety layer, LLM client, helpers, 51 question eval, article draft, Library MCP README | KeepSimpleOSS `docs`, `src/lib`, `eval`, `mcp/library` |
| `agent-panel-tools/` | `agent-quorum-score.mjs`, `agent-voice-check.mjs`, READMEs, the 2026-08-24 pilot (methodology, tasks, 27 answers, concept map, results) | manager/agent-quorum-check, manager/agent-voice-check |
| `wolfs-basement/` | README and AGENTS.md (persona system, SEND TO, lifecycle) | manager/wolfs-basement |
| `design-system-skills/` | `keepsimple-style` and `uxcore-style` skills as templates for a Designature style skill | KeepSimpleOSS, UXCoreOSS |
| `governance-examples/` | KeepSimpleOSS `AGENTS.md`, `CLAUDE.md` (font passport, release lessons, ownership rulings), `LIBRARY_AGENT.md`, the no internal data guard script | KeepSimpleOSS |
| `licenses/` | MIT licence texts for each source | |

Source files (`.ts`, `.js`, `.mjs`) carry a `.txt` suffix so this repository's typecheck (`tsc` with no include filter) ignores them. Remove the suffix when you copy a file into place.

Not copied on purpose: vibesuite, glider-docs-copilot and Biases-interactive-UI-guide (no licence file), the RAG handoff document (contains a personal email), `qa-runs/state` and reports (Wolf's own findings).
