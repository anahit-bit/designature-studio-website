# Product specs — index

One file per feature. Each spec holds the reasoning, the scope, the build tasks and the risks;
this page is just the map, plus where each one stands.

| Ticket | Feature | Spec | Status | Branch |
|---|---|---|---|---|
| **AI-044** | **Signature Looks** — 15 designer-grade looks beside the 13 AI Vision styles | `signature-styles-spec.md` | Specced · look 01 written · mockup done · **not built** | `claude/designer-style-ai-vision-a3u9jh` |
| **AI-038** (+ AI-040) | **Designer Checkpoints** / "Designer Check" — the studio's phase → meeting → confirm process inside the AI product | `designer-checkpoints-spec.md` | Specced · **not built** | `claude/designer-style-ai-vision-a3u9jh` |
| **AI-043** | **Virtual Staging** (real-estate mode) | `virtual-staging-spec.md` | Specced · V1 greenlit in the action plan | — |

**The plan is `docs/plan/Website-plan.xlsx`** — one workbook, in this repo, on the branch that carries
it (`claude/mobile-app-notifications-plan-3pu6u6` at the time of writing). Never keep a second copy.
Add a row there, run `python3 docs/plan/scripts/export_plan.py`, and commit the workbook and the CSVs
together. `docs/action-plan.html` on that branch is a *view* of the Weekly Plan sheet, not a second
plan — do not edit it here.

Note on AI-038: the human-review idea already had a row before this spec was written, with owner
decisions that override parts of it. The spec's header says which.

## Related material

- `looks/01-bright-modern-farmhouse.md` — the first Signature Look brief, with its render test.
- `../marketing/journal-drafts/HANDOFF-signature-looks.md` — the article series brief for the Journal
  session (keyword research and priority order).
- `../action-plan.html` — the one-page plan; Signature Looks + Checkpoints are workstream 4.
- Screens: <https://claude.ai/code/artifact/d2b5dae6-e127-4294-b737-61196ce21713> —
  today's AI Vision setup beside the proposed one, plus the entry surfaces.
- Plan write-up: <https://claude.ai/code/artifact/4838041f-7ffd-4247-87af-591ae36349cf>
