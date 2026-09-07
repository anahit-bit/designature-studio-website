# CLAUDE.md

Instructions for any Claude session working in this repository.

## The plan lives here, and only here

The single source of truth for planning is the workbook in this repo:

```
docs/plan/Website-plan.xlsx
```

Rules, in order of importance:

1. **Read the plan from this repo.** Never from Google Drive, never from a local folder such as
   `E:\Business\Claude\_Plan\Website`, never from a file a previous session left behind. Every copy
   outside this repo is stale by definition, and acting on one produces work the owner has to undo.
2. **If you cannot reach this repo, ask the owner for the current file.** Do not fall back to an
   older copy you happen to have.
3. **Never create a second copy.** Do not export the plan to Drive, to a scratch folder, or to a
   second path in the repo, even temporarily. One file, one place.

## Where things are in the workbook

| Sheet | Use it for |
|---|---|
| Weekly Plan | The dated schedule. One row per task, with Owner, Hours and a Backlog ID |
| Backlog | The master list of work. One row per item, stable ID, the columns are documented on the README sheet |
| Roadmap | A derived view of the Backlog, open items only, grouped by phase |
| Tier Matrix | Free, Design and Studio boundaries, and the per tool credit price map |
| Current State | What is live, locked or in progress today |

Backlog ID prefixes: S strategy, A architecture, AI AI Studio, SL Shopping List, I infra and CMS,
AC account and dashboard, C consultation, M mobile, P performance and SEO, B brand, VF visual and feel.

## After you edit the workbook

```
python3 docs/plan/scripts/export_plan.py
```

That rewrites `docs/plan/export/*.csv`, one per sheet, so the commit shows which cells changed.
Commit the workbook and the CSVs together, or the diff describes the wrong state. Run
`export_plan.py --check` to find out whether the export is stale.

Two things the script cannot do for you. The Roadmap sheet is a derived view that does not
regenerate itself, so when a Backlog row changes status, update Roadmap by hand. And a row whose
status starts with Done gets its whole row filled green (C6EFCE); green means Done and nothing else.

## The weekly board

`docs/action-plan.html` renders the Weekly Plan sheet as a page that highlights the current week.
It is a view, not a second plan. Change one and change the other in the same commit.
