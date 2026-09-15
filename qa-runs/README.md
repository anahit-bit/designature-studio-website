# QA agent (Designature Studio)

A manual QA pass for designature.studio, driven by Claude Code with the Playwright MCP server. It visits the routes in `qa-config.yml`, interacts with key features, watches console and network, and writes a findings report. Adapted from Wolf Alexanyan's KeepSimple QA agent (MIT), see `docs/research/wolf-agents/`.

This is separate from the vitest unit tests in `src/test/`.

## How to run

In a fresh Claude Code session at the repo root, with the Playwright MCP server connected, type a slash command:

| Command | What it runs | Time |
| --- | --- | --- |
| `/qa-init` | Wizard to rewrite `qa-config.yml` | 5 min |
| `/qa-smoke` | Home section, desktop. Fast post deploy check | 15 min |
| `/qa-canonical` | All sections, desktop. Source of truth for desktop findings | 60 to 90 min |
| `/qa-mobile-followup` | All sections, mobile. Pairs with canonical | 60 min |
| `/qa-full-matrix` | Everything in one pass | 2 to 3 hours |
| `/qa-deploy-check` | Only routes that changed since the last run or have open findings | 30 min |
| `/qa-retest` | Verify specific finding IDs after a fix | 5 min per ID |

`/qa-locale-smoke` exists but is a no op while the site has one locale.

Always start in a fresh session. Open chat memory pollutes results.

To run against the local dev server instead of production, start `npm run dev` and tell the agent "environment: local", or set `QA_ENV=local` for the helper CLI.

## What the system is made of

| File | Role |
| --- | --- |
| `.claude/skills/designature-qa/SKILL.md` | The method: pre flight, fixed pass, exploratory pass, severity rubric, finding schema |
| `.claude/designature-qa/PROFILES.md` | Scope of each profile |
| `.claude/designature-qa/helper.mjs` | CLI: route fingerprints, axe, web vitals, screenshots, pixel diff |
| `.claude/designature-qa/render-report.cjs` | Markdown report to HTML |
| `.claude/commands/qa-*.md` | One slash command per profile |
| `qa-config.yml` | Sections, routes, viewports, `auth_required`, `primary_interaction`, the never do rules for this site |
| `known-issues.md` | Suppressions |
| `qa-runs/findings-register.md` | Living index of open findings, updated by a human after each run |
| `qa-runs/reports/` | Per run reports, `.md` source plus `.html` rendered |
| `qa-runs/state/`, `baselines/`, `screenshots/`, `auth/` | Helper managed, gitignored |

## Helper CLI examples

```
node .claude/designature-qa/helper.mjs batch-fingerprint designature --save
node .claude/designature-qa/helper.mjs axe https://www.designature.studio/pricing
node .claude/designature-qa/helper.mjs vitals https://www.designature.studio/ --viewport mobile
node .claude/designature-qa/helper.mjs screenshot https://www.designature.studio/ --viewport mobile --out qa-runs/screenshots/home-mobile.png
node .claude/designature-qa/render-report.cjs qa-runs/reports/2026-09-15-smoke.md
```

## After a run

The agent does not update the findings register. You do: decide if each new finding is real, add a row with an `F#` id, reference the report. Fix flow: open, fixed locally, fixed deployed, verified fixed (after `/qa-retest`), archive after one more clean run.

## Site specific rules

Never trigger an AI generation, never confirm a slot hold or a payment, never submit contact, feedback, newsletter or comment forms on production. These are written in `qa-config.yml` and the agent reads them every run.
