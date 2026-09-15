# Agent quorum study — methodology (fixed 2026-08-24, before any run)

Follow-up to the voice-homogeneity result (`reports/hivemind/2026-08-23.md`), which showed our agents
write alike. This asks the harder question: do they *conclude* alike. If they do, a panel of N agents
is one opinion counted N times, and every "independent agent review" is theatre.

This file is written BEFORE the first run and is not edited after results are seen. Deviations get
appended under "Deviations", dated, with the reason.

## Retrospective arm: dropped, with evidence

Probed 120 days of session history (`scripts/quorum-probe.mjs`, 657 files, 194,150 lines): 161 subagent
dispatches carried a real prompt, of which the same prompt was dispatched more than once exactly
**once**, and never across two project dirs. There is no natural experiment in our history where one
task went to several independent agents. The study is prospective only. Nothing is inferred from the
one case.

## Design

Between-conditions, blind, single shot.

**Tasks.** 3 open-ended decision tasks, each with no single correct answer, each self-contained (no repo
or tool access needed) and each shaped like real product work: choose one option from a small set, then
justify. Tasks are fixed in `tasks.json` before the run. A task qualifies only if a competent human
panel would plausibly split on it.

**Conditions**, all answering the identical task text:
- **A — clones.** Same model, same neutral operator prompt, N replicas. Measures the floor: how much
  variety you get from sampling alone.
- **B — charters.** Same model, N different written charters (persona, priorities, tone), the diversity
  lever every multi-agent framework sells.
- **C — models.** Neutral prompt, N different models. The diversity lever people buy with money.

N = 3 per condition per task in the pilot (27 agents), extended to N = 5 if the pilot separates the
conditions at all.

**Blindness.** Every agent runs in a fresh context and never sees another agent's answer. No shared
scratchpad, no sequencing.

**Output.** Each agent returns a fixed structure: chosen option, exactly three ranked concerns in its
own words, one-line rationale. Free prose is not scored.

## Metrics

1. **Choice agreement** — share of agent pairs picking the same option, per task per condition.
   Reference points: 1/k for independent random choice among k options; 1.0 for total collapse.
2. **Concern overlap** — mean pairwise Jaccard over the concern sets, after lemma-level normalisation
   (concerns are matched as concepts, not strings, by a fixed keyword map built before scoring).
3. **Union size** — number of distinct concerns the whole condition produced. This is the number that
   matters operationally: it is what you actually gain by adding the Nth agent.
4. **Marginal value of agent N** — expected new concerns contributed by the Nth agent, averaged over
   all orderings. A panel is worth its cost only if this stays above zero.

## Pre-registered predictions

Written before the run so they can be wrong in public:
- Condition A will show high choice agreement (> 0.7). Sampling alone buys little.
- Condition B will not beat A by more than 0.1 on concern overlap. Charters change tone, not conclusions.
- Condition C will separate more than B, but less than the marketing implies.
- Marginal value of the 3rd agent will be near zero in A and B.

If B clearly beats A, the "give each agent its own charter" advice is vindicated and I say so.

## Threats to validity, stated up front

- Small N. This is a pilot on 3 tasks; it can show a large effect, not a small one.
- Task selection is mine, and tasks that split humans may not split models. Tasks are published with
  the results so the selection can be criticised.
- All models come from one vendor family. Cross-vendor diversity is out of scope and the write-up will
  not claim otherwise.
- Concern matching uses a keyword map I wrote; it is published with the results.

## Publication

Same standard as the voice study: article with charts, methodology and the script public, no transcripts.
Tasks, raw structured answers and the scoring code are published; nothing from real chat history is used,
so there is no corpus to withhold.

## Deviations

(none yet)
