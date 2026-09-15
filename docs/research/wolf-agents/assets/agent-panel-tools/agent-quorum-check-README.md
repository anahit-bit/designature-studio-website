# agent-quorum-check

Scores whether a panel of AI agents actually disagrees, or whether it is one opinion counted N times.

You give several agents the same decision, blind, and collect their answers. This scores them: how often they picked the same option, how much their stated worries overlap, how many distinct worries the panel produced in total, and what the second and third agent actually added.

Deterministic, no model calls, no network, no dependencies.

## Run

```
node agent-quorum-score.mjs                        # scores the bundled pilot
node agent-quorum-score.mjs --answers=mine.json    # scores yours
node agent-quorum-score.mjs --json                 # machine-readable
```

Requires Node 18+.

## Input shape

```json
{
  "run": "my experiment",
  "conditionNames": {"A": "copies", "B": "charters"},
  "answers": [
    {"task": "T1", "cond": "A", "agent": "clone1", "choice": "a",
     "concerns": ["worry one", "worry two", "worry three"]}
  ]
}
```

`task` is the decision, `cond` is whatever you varied between agents (each condition is scored separately), `choice` is the option that agent picked, `concerns` are the worries it raised in its own words. Every agent must answer every task in its condition.

Worries are matched as concepts rather than strings, using a keyword map (`--concepts`, default `pilot-2026-08-24/concept-map.json`). Write your own for your domain; anything unmatched still counts toward the union, so a missing entry undercounts overlap rather than inventing it.

## Metrics

- **Choice agreement** — share of within-task agent pairs picking the same option. Compare against 1/k for k options: that is what independent choosers would score.
- **Concern overlap** — mean pairwise Jaccard over concept sets. High means the agents worry about the same things.
- **Union size** — distinct concepts the whole condition produced. This is the coverage you actually bought.
- **Marginal value of the Nth agent** — expected new concepts contributed by the first, second, third agent, averaged over every ordering. If the last number is near zero, the last agent is decoration.

## The pilot

`pilot-2026-08-24/` holds a complete run: the methodology fixed before any agent ran, the three decision tasks, all 27 raw answers, the concept map and the scored result.

Headline: three identical agents (Claude Opus 5) agreed on **100%** of pairs and the third one contributed **0.33** of a new worry out of the three it named. Three different written charters on the same model dropped agreement to **78%**. Three different models (Claude Sonnet 5, Claude Haiku 4.5, Claude Fable 5) dropped it to **56%** and roughly doubled the distinct worries. Across all 108 pairs, 80% agreement where independent choosers would sit at 33%.

Caveats are in `pilot-2026-08-24/methodology.md` and stated in the write-up: three tasks, three agents per cell, one vendor, and models that differ in capability as well as character.

Companion tool: [agent-voice-check](https://github.com/manager/agent-voice-check), which measures whether a fleet of agents *writes* alike.

## License

MIT.
