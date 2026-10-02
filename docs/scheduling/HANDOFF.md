# Handoff: Designature Studio project schedule

Paste this into the session that can see the real project list.

## Task for that session

Replace the six placeholder projects (Example 01 to 06) in the schedule workbook with the real current projects, rebuild the file, and report anything that looks off.

## Where things are

Repo: `anahit-bit/designature-studio-website`, branch `ccr-2fab1a06-6ovtv0`.

- Generator: `scripts/project-schedule/build_schedule.py`
- Output: `docs/scheduling/DesignatureStudio-Project-Schedule.xlsx`
- Rebuild: `python3 scripts/project-schedule/build_schedule.py` (needs `openpyxl`)

Edit the `PROJECTS` list near the top of the script, then rerun. Each entry is:
`(name, client, area m2, complexity, share of Lara's time, start date, status, note)`

## What to collect for each real project

1. Name and client
2. Area in m2
3. Current phase and the date it started or will start. Set the project start so the bars line up with where it really is.
4. Whether Lara is on it alone or splitting time with another project. Share of her time: 100% means full pace, 50% means two projects at half pace each.
5. Complexity: 1.0 normal, above 1.0 for heavy custom joinery or a tricky layout, below 1.0 for simple.
6. Status: Planned, Active, On hold or Done.

If a project is already past the early phases, tell Anahit that the workbook computes every phase from the project start date. It has no per phase override yet, so a mid flight project needs either a back dated start or a small addition to the script. Ask which she prefers before building it.

## Rules that must stay true

- Designer: Lara, the only one at the moment. Works 6 hours a day, Monday to Friday.
- Reference durations for a 50 m2 apartment, one project at a time: floor planning 1 week, 3D modeling 2 weeks, technical drawings 1 week, furniture drawings 2 weeks. Total 6 weeks, 30 days, 180 hours. Anahit confirmed these.
- Projects run in parallel. Each has its own start date and a share of Lara's time. Do not queue them one after another. The "Lara load" row flags weeks above 100%.
- Durations do not scale linearly with area. Working days = reference weeks x 5 x (area / 50) ^ exponent x complexity / share. Exponents are my judgement, not data: floor planning 0.5, 3D modeling 0.9, technical drawings 0.8, furniture drawings 0.7.
- Four extra phases exist for tracking only and belong to Anahit, not Lara: brief and concept (1 week), client approval (1 week), procurement (3 weeks), site supervision (6 weeks, exponent 0.5). Their durations are invented placeholders. Ask Anahit for real ones. They are excluded from Lara's hours and load.
- A phase with 0 reference weeks on the Settings sheet is skipped.

## Known gaps

- LibreOffice hung in the cloud container, so the workbook was never recalculated or rendered. Formulas were verified by recomputing in Python only. Open it in Excel and look at the Gantt bars and the Lara load row before trusting it. Recalculation is set to run on open.
- The scaling exponents have no real data behind them. Once 3 or 4 projects are finished, compare actual durations against the model and adjust the exponents on the Settings sheet.
- The Gantt shows 60 weeks from the earliest start. Larger projects can run past that.
- Days off are an empty list on the Settings sheet. Armenian public holidays and Lara's leave are not entered.

## Preferences for working with Anahit

Anahit is an interior designer with a microelectronics engineering background and founder of Designature Studio. Ask clarifying questions before generating, and ask before writing code. Be direct, tell her when something is wrong or inefficient, and avoid em dashes and hyphens in prose.
