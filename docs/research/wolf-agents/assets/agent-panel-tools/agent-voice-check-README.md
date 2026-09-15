# agent-voice-check

Measures whether a fleet of AI agents actually writes in different voices, or whether they are one voice wearing many badges.

Point it at your Claude Code history and it prints, per language: how often a classifier can tell which agent wrote a held-out message, how that compares to guessing, how similar each pair of agents is, how much each agent repeats itself, and which openers they share.

It is deterministic, makes no model calls, and needs no network. Nothing leaves your machine: the output is aggregate numbers, never message text.

## Why

[Artificial Hivemind](https://arxiv.org/abs/2510.22954) (NeurIPS 2025) measured homogeneity *inside and across models*. This measures the layer above it, the one practitioners assume solves the problem: separate agents with separate system prompts, separate memory and separate projects. If those agents still write alike, cross-agent review adds no signal, and a "panel of agents" is one opinion counted several times.

Run on a live 19-agent fleet, the answer was no: agents were identified 30.5% of the time against 72.7% for the human working in the same rooms. Write-up: *Nineteen Agents, One Voice*.

## Run

```
node agent-voice-check.mjs --days=30 --human=ME
```

Requires Node 18+. No dependencies.

| flag | default | meaning |
|---|---|---|
| `--days` | `30` | how far back to read |
| `--dir` | `~/.claude/projects` | where session transcripts live |
| `--max-per-agent` | `400` | cap per agent, newest sessions first |
| `--min-msgs` | `25` | drop agents below this many messages |
| `--human` | `HUMAN` | label for the human control |
| `--json` | off | machine-readable output |

## Method

- **Corpus.** Assistant text blocks from the main thread only (subagent output is excluded), 200 characters or longer, one project directory per agent. Your own turns are collected separately as the human control.
- **Features.** Function-word frequencies plus structural markers: sentence length, bullet and numbering use, bold, dashes, opener shape. Content words are excluded on purpose, since topics differ per project and topic is not voice.
- **Score.** Leave-one-out nearest-centroid authorship attribution. High accuracy means distinct voices. Accuracy near the majority-class baseline means interchangeable writers. Both chance and majority baselines are printed, because a raw accuracy number means nothing without them.
- **Languages are scored separately.** A mixed corpus lets the classifier win by detecting language instead of voice.
- **Controls.** The human writer, and a per-model grouping that tests whether swapping model families buys any voice diversity.

## Reading the result

The human control is the point. It is the same classifier, the same features and the same rooms, so it tells you what a distinct voice scores under your own conditions. Compare agents against that, not against 100%.

Two caveats worth stating up front. The score depends on the language: in a writer's second language their own voice flattens, and the human ceiling drops with it. And an agent that talks to you in one narrow register (status reports, say) will look more homogeneous than the same agent across varied work.

## License

MIT.
