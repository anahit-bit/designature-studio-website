# Known Issues

This file lists known issues, intentional behaviours and quirks that the QA agent should NOT report as findings. The agent reads this before every pass.

## How to add an entry

Each entry needs a short title, the route(s) it affects (or "global"), a one sentence reason (intentional, wontfix, third party, pending fix), and the date added.

### [Short title]

- **Routes:** `/path` or `global`
- **Reason:** intentional | wontfix | third-party | pending-fix
- **Note:** One sentence.
- **Added:** YYYY-MM-DD

---

## Entries

### Local runs have no Postgres

- **Routes:** global (local environment only)
- **Reason:** intentional
- **Note:** `npm run dev` without `DATABASE_URL` logs `ECONNREFUSED 127.0.0.1:5432` on the server and keeps state in memory; payments, credits and slot holds cannot be exercised locally.
- **Added:** 2026-09-15

### Third party embeds may be blocked in sandboxed runs

- **Routes:** global
- **Reason:** third-party
- **Note:** Cloudinary images, Google fonts, analytics and Skimlinks scripts can fail to load when the run has no outbound network; only report them when the run had network access.
- **Added:** 2026-09-15
