# CLAUDE.md

Instructions for any Claude session working in this repository.

## The plan lives in Google Drive

The single source of truth for planning is this file, and nothing else:

**Website-plan.xlsx**
https://docs.google.com/spreadsheets/d/1DsVUWdeq79PDgoPPuQT5EvJx57_lpjcV/edit
Drive file id: `1DsVUWdeq79PDgoPPuQT5EvJx57_lpjcV`

Owner rule, set 2026-09-07: **every session reads the plan from this file and writes its updates back
into this file.** Never work from a local folder such as `E:\Business\Claude\_Plan\Website`, never from
a copy a previous session left behind, and never create a new plan file anywhere.

### Reading it

Use the Google Drive connector: `download_file_content` with that file id, decode the base64, open it
with openpyxl. It is an `.xlsx` stored in Drive, not a native Google Sheet, so it round trips cleanly.

### Writing to it

**The Drive connector cannot overwrite the contents of an existing file.** It can create, rename, copy
and trash, and nothing else. So a session cannot save into that file by itself. The loop that works:

1. Download the current file and edit that exact copy. Never rebuild the workbook from scratch, and
   never edit a copy that predates the download.
2. Run the export (below) so the change is reviewable.
3. Hand the edited `.xlsx` back to the owner and say plainly what changed.
4. The owner uploads it as a new version of the same file: open the file in Drive, File information,
   Manage versions, Upload new version. That keeps the id, the link and the revision history intact.

Do not create a second Drive file as a workaround. A new file means a new id, which breaks the link
above and starts the copy drift this rule exists to end.

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

Two conventions the tooling cannot enforce. The Roadmap sheet is a derived view that does not
regenerate itself, so when a Backlog row changes status, update Roadmap by hand. And a row whose
status starts with Done gets its whole row filled green (C6EFCE); green means Done and nothing else.

## The copy in this repo is a mirror

`docs/plan/Website-plan.xlsx` is a snapshot of the Drive file, kept so that changes are diffable. It is
**not** the master and must never be edited on its own. After the owner uploads a new version to Drive,
refresh the mirror from Drive and run:

```
python3 docs/plan/scripts/export_plan.py
```

That rewrites `docs/plan/export/*.csv`, one per sheet, so the commit shows which cells changed. Commit
the workbook and the CSVs together. `export_plan.py --check` reports whether the export is stale.

If the mirror and the Drive file disagree, the Drive file wins.

## The weekly board

`docs/action-plan.html` renders the Weekly Plan sheet as a page that highlights the current week.
It is a view, not a second plan. Change one and change the other in the same commit.
