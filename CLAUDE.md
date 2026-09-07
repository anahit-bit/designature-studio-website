# CLAUDE.md

Instructions for any Claude session working in this repository.

## The plan is not in this repository

The single source of truth for planning is a file in Google Drive, and nothing else:

**Website-plan.xlsx**
https://docs.google.com/spreadsheets/d/1DsVUWdeq79PDgoPPuQT5EvJx57_lpjcV/edit
Drive file id: `1DsVUWdeq79PDgoPPuQT5EvJx57_lpjcV`

Owner rule, set 2026-09-07: **whenever the owner asks a session to read, review, or update the website
plan, they mean this file.** Read it from Drive at the start of the task and write the updates back
into it. There is deliberately no copy in this repository, none in `E:\Business\Claude\_Plan\Website`,
and none anywhere else. If you find one, it is stale, and it is not the plan.

### Reading it

Use the Google Drive connector: `download_file_content` with that file id, decode the base64, open the
result with openpyxl. It is an `.xlsx` stored in Drive, not a native Google Sheet, so it round trips
without losing formatting.

### Writing to it

**The Drive connector cannot overwrite the contents of an existing file.** It can create, rename, copy
and trash, and nothing else, and there is no Sheets connector. So a session cannot save into that file
by itself. The loop that works:

1. Download the current file and edit that exact copy. Never rebuild the workbook from scratch, and
   never edit a copy that predates the download, or you will silently drop someone else's change.
2. Hand the edited `.xlsx` back to the owner and say plainly which rows and cells changed.
3. The owner uploads it as a new version of the same file: open it in Drive, File information,
   Manage versions, Upload new version. That keeps the file id, the link and the revision history.

Do not create a second Drive file as a workaround, and do not commit the workbook here as a
convenience mirror. Both were tried. A second copy means a new link, and within an hour two sessions
were editing two different files.

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

Two conventions the file cannot enforce for you. The Roadmap sheet is a derived view that does not
regenerate itself, so when a Backlog row changes status, update Roadmap by hand. And a row whose
status starts with Done gets its whole row filled green (C6EFCE); green means Done and nothing else.

## The weekly board

`docs/action-plan.html` renders the Weekly Plan sheet as a page that highlights the current week. It is
a view, not a second plan, and it holds no backlog detail. When the Weekly Plan sheet changes, update
this page in the same session.
