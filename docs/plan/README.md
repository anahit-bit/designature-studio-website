# Website plan workbook

`Website-plan.xlsx` is the master planning document for designature.studio. It moved into the repo
on 2026-09-06 so it gets version history, so changes arrive with the code change that caused them,
and so it can be edited in a session without a manual download and re upload.

## Sheets

| Sheet | What it holds |
|---|---|
| README | How to use the workbook, and what every Backlog column means |
| Strategy & Positioning | The anchor. Option 3 today, Option 2 readiness |
| AI Studio Map | The card roster |
| Backlog | The master list of work. One row per item, stable ID |
| Roadmap | Derived view of the Backlog, open items only, grouped by phase |
| Customer Feedback | Real user notes, verbatim |
| Visual & Feel | Design polish notes |
| Tier Matrix | Free, Design, Studio boundaries and the credit price map |
| Regression Tests | Manual test log, run before each meaningful release |
| Current State | Snapshot of what is live, locked or in progress |

Backlog ID prefixes: S strategy, A architecture, AI AI Studio, SL Shopping List, I infra and CMS,
AC account and dashboard, C consultation, M mobile, P performance and SEO, B brand, VF visual and feel.

## How to work with it

1. Edit `docs/plan/Website-plan.xlsx` in place, in Excel or Numbers or Sheets.
2. Commit it on the branch that carries the related code change, or on its own if it is planning only.
3. When a Backlog row changes status, update the Roadmap sheet too. Roadmap is a derived view and
   openpyxl will not regenerate it for you.
4. A row whose status starts with Done gets its whole row filled green (C6EFCE). Green means Done and
   nothing else. Dropped, Folded, Partial and Idea stay unfilled.

## The Drive copy

The Drive folder keeps the dated `Website-plan.BACKUP-YYYY-MM-DD.xlsx` history from before the move.
Those stay where they are. From 2026-09-06 the repo copy is the one to edit, and the Drive copy is a
convenience export for reading on a phone. If they ever disagree, git wins.

The Google Drive connector can create and rename files but cannot overwrite the content of an existing
one, so pushing a new copy to Drive is a manual upload.

## Diffs

xlsx is a zip of XML, so `git diff` on the workbook shows a binary blob rather than the changed cells.
`export/` solves that: one CSV per sheet, regenerated from the workbook, so every commit shows which
cells actually moved. The CSVs are an export and never the master. Editing one changes nothing.

```
pip install openpyxl                                  # once
python3 docs/plan/scripts/export_plan.py              # rewrite the CSVs
python3 docs/plan/scripts/export_plan.py --check      # exit 1 if they are stale
```

Run it after every workbook edit and commit the workbook and the CSVs together, or the diff lies about
what changed. `--check` is there if you ever want it wired into a hook or a CI step.

What the export does not carry: cell fills, so the green Done rule is invisible in CSV. The Status
column already says Done in words, so nothing is lost that matters. Dates are normalised to
YYYY-MM-DD, since some cells hold a real date and most hold a string, and without that the export
would churn on every run.
