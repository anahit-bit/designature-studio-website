# Competitor Intelligence — AI Interior Design

A **quarterly** scan of the companies competing with the Designature Studio model
(AI redesign + shoppable list + human design). Kept in git so each quarter diffs
against the last: new entrants, price changes, and shutdowns show up as file changes.

## What's here each quarter

| File | What it is |
|---|---|
| `YYYY-QN-ai-interior-design-competitors.md` | The written report: thesis, white space, the 5 to watch, segment breakdown, recommendations |
| `competitors-YYYY-QN.csv` | **Source of truth** — every competitor, one row, all fields |
| `DesignatureStudio-Competitors-YYYY-QN.xlsx` | Sortable, heat-coded spreadsheet (Excel/Sheets) |
| `competitor-report.html` | Interactive filterable map (open in a browser; also published as an artifact) |

## The benchmark we measure against

Designature Studio — Yerevan + worldwide remote. AI Vision (photo → redesign), Style Quiz,
shoppable Shopping List, Project Folders, human design. Tiers **$0 / $19 / $49 + $99 consult**.

## Closeness score (0–5)

How directly a competitor overlaps the *full* Designature model (AI concept + shoppable list +
human designer) — **not** how big or good it is. A powerful pro-CAD tool can score 1; a tiny
shoppable-AI app can score 5.

- **5** direct competitor (same model) · **4** strong overlap · **3** partial
- **2** adjacent · **1** distant/substitute · **0** defunct/inactive precedent

## How to re-run it each quarter

Scan the same **six market segments** (this keeps quarters comparable):

1. **Pure AI redesign / render tools** (RoomGPT, Interior AI, Spacely, Collov, Remodel AI…)
2. **Hybrid human + AI e-design services** (Havenly, Decorilla, Spacejoy…)
3. **Pro / prosumer design & CAD software with AI** (Foyr, Planner 5D, Coohom, Homestyler…)
4. **Consumer AI design mobile apps** (DecorMatters, retailer AR: IKEA/Wayfair/Amazon…)
5. **AI virtual staging + shop-the-look / retailer commerce** (REimagine, MeltFlex, Wayfair Decorify…)
6. **Regional / emerging + local** (EU, MENA, India, CIS/Russia, Armenia/Georgia, new 2024–2026 launches)

For each competitor capture: **name, URL, HQ/region, category, closeness, status, what it is,
pricing, what it covers, what it does NOT cover / gaps.**

Then, each quarter:
1. Copy last quarter's CSV to the new quarter's filename and update it (add/remove/repricing).
2. Regenerate the spreadsheet + HTML with the build scripts (see below).
3. Rewrite the `.md` report's thesis, "5 to watch," and recommendations from what changed.
4. Commit — the git diff *is* the quarter-over-quarter change log.

### Regenerating the spreadsheet & HTML

The generator scripts live with the working files for this quarter. Given an updated CSV:
- Spreadsheet: `openpyxl` reads the CSV → styled `.xlsx` (heat-coded closeness, autofilter, legend sheet).
- HTML: normalizes categories into groups → single-file interactive page (search, group filters, sort,
  expandable rows), no external dependencies.

Ask Claude to "regenerate the competitor spreadsheet and HTML from the updated CSV" and it will
rebuild both from the same normalization rules.

## Cadence

**Quarterly** (Q1 Jan · Q2 Apr · Q3 Jul/Aug · Q4 Oct). A recurring reminder/automation can be set up
to trigger the refresh — see the studio's Claude Code Routines.

_First edition: Q3 2026 (96 competitors, 14 direct threats)._
