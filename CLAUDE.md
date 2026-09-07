# CLAUDE.md

Instructions for any Claude session working in this repository.

## The plan: one file, two views

The single source of truth for planning is **Website-plan.xlsx**. It exists in one place, reachable two
ways, because the folder is synced by Google Drive for Desktop:

| View | Address |
|---|---|
| On the owner's machine | `E:\Business\Claude\_Plan\Website\Website-plan.xlsx` |
| In Google Drive | https://docs.google.com/spreadsheets/d/1DsVUWdeq79PDgoPPuQT5EvJx57_lpjcV/edit · file id `1DsVUWdeq79PDgoPPuQT5EvJx57_lpjcV` |

The Drive folder chain is `Claude / _Plan / Website`, mirrored to that local folder. A save on the
machine uploads itself; a change made in Drive comes down to the folder. Same file. No copies.

Owner rule, set 2026-09-07: **whenever the owner asks a session to read, review or update the website
plan, they mean this file.** There is deliberately no copy in this repository and none anywhere else.
If you find one, it is stale, and it is not the plan.

### If you are running on the owner's machine

Open, edit and save `E:\Business\Claude\_Plan\Website\Website-plan.xlsx` in place. Drive for Desktop
uploads it. Nothing else is needed, and no copy is made anywhere.

### If you are running in the cloud

A remote session (claude.ai/code, a web session, a run triggered from GitHub) has no E: drive. Read the
Drive file with the Google Drive connector: `download_file_content` with the file id above, decode the
base64, open it with openpyxl. It is an `.xlsx` stored in Drive, not a native Google Sheet, so it round
trips without losing formatting.

**A remote session cannot write to it.** The connector can create, rename, copy and trash files, but it
has no call that replaces the contents of an existing file, and there is no Sheets connector. So:

1. Edit the copy you just downloaded, never an older one.
2. Hand the edited `.xlsx` back to the owner and say plainly which rows and cells changed.
3. The owner saves it over `E:\Business\Claude\_Plan\Website\Website-plan.xlsx`, and the sync carries
   it back up to the same Drive file.

Do not create a second Drive file as a workaround, and do not commit the workbook to this repository as
a convenience mirror. Both were tried on 2026-09-06. A second copy means a new link, and within an hour
two sessions were editing two different files.

### House rules for editing it

- **One editor at a time.** Close Excel before asking a session to edit the file, and let the sync
  finish before another session reads it, or Drive writes a conflict copy and the plan forks.
- **One name.** `Website-plan.xlsx`, always. Never save a variant, a dated copy or a `Website_Plan`.
- **Edit what you opened.** Never rebuild the workbook from scratch and never edit a download that
  predates someone else's change, or you will silently drop their work.

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
