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

xlsx is a zip of XML, so `git diff` shows a binary blob rather than the changed cells. Version history
still works: every commit is a full restorable copy, and the commit message carries the intent. If
readable per cell diffs become useful, a small export script can write one CSV per sheet alongside the
workbook, the same pattern `docs/competitor-intel/` already uses.
