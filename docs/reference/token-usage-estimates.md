---
title: "Token usage estimates (model and effort)"
description: "What an evaluation costs in tokens, split by the deterministic core (zero model tokens) and the optional model-assisted layer, with explicit model and effort tradeoffs, assumptions, and caveats."
audience: both
level: intermediate
tags: [tokens, cost, model, effort, evaluate, advisory, budgeting]
---

# Token usage estimates (model and effort)

This page tells you what running the toolkit costs in **model tokens**, so you can budget a run before you start - especially at scale (grading a whole marketplace). It is deliberately explicit about how the **model** you pick and the **effort** (thinking budget) you allow trade off against output **quality** and token cost.

The single most important thing to understand first is that the toolkit has **two regimes**, and they could not be more different in cost.

## The two regimes

### 1. The deterministic core - zero model tokens, reproducible

The grade itself is produced by a deterministic, model-free gate. `scripts/check.mjs` (the gate), `scripts/tier-report.mjs` (the tier and burndown), and `scripts/evaluate.mjs` in its `--format=html|md`, `--report=migration`, `--report=release`, terminal, and `--json` modes run **no model at all**. They are plain Node over the plugin's files.

- **Model tokens: 0.** There is nothing to estimate. A run costs the same whether you have a token budget of zero or infinite.
- **Reproducible.** The same plugin at the same commit produces a byte-identical report every time.
- **Fast.** As a real anchor, grading `wshobson/agents` (82 plugins) took about 16 seconds and 0 model tokens.

If all you want is the conformance grade and a rendered report, **your token budget is zero**. This is the regime you will use most, and it is free.

### 2. The model-assisted layer - real model and effort variance

Two surfaces use a model, and only these:

- **The advisory reports.** `evaluate.mjs --report=review` and `--report=behavioral` render advice produced by the `askit-reviewer` and `askit-quality-grader` subagents. The advice is decorated onto the deterministic report by an allowlisting `applyAdvisory()`.
- **The authoring skills.** The `askit-build-*` family drafts components (a skill, a subagent, an MCP wiring) with a model.

A load-bearing property bounds your risk here: **the advisory layer structurally cannot move the deterministic grade or the gate exit code.** A cheaper or lower-effort model on the advisory path degrades the **quality of the advice**, never the pass/fail verdict. So "go cheap on advice" is a safe lever, not a correctness risk.

## Operation catalog

| Operation | Command | Regime | Model tokens |
| --- | --- | --- | --- |
| Gate (grade) | `check.mjs <path> [--profile ...]` | deterministic | **0** |
| Tier + burndown | `tier-report.mjs <path>` | deterministic | **0** |
| Render report | `evaluate.mjs <path> --format=html\|md` | deterministic | **0** |
| Migration plan | `evaluate.mjs <path> --report=migration` | deterministic | **0** |
| Release readiness | `evaluate.mjs <path> --report=release` | deterministic | **0** |
| Review advisory | `evaluate.mjs <path> --report=review --advisory <f>` | model-assisted | model + effort dependent |
| Behavioral advisory | `evaluate.mjs <path> --report=behavioral --advisory <f>` | model-assisted | model + effort dependent |
| Author a component | the `askit-build-*` skills | model-assisted | model + effort dependent |
| Adversarial review | N review agents over a diff | model-assisted | model + effort dependent |

The advisory `--advisory <file.json>` itself is produced by a subagent run (the model-assisted cost); `evaluate.mjs` then renders it deterministically. The render of an existing advisory file is free; producing the advisory is the cost.

## Model and effort vs quality - the explicit tradeoff

For the model-assisted layer, two dials drive both quality and token cost: which **model** you run, and how much **effort** (extended-thinking budget) you allow. Match them to the task; do not pay for depth a task does not need, and do not starve a task that needs it.

### Model

| Model | Judgment quality | Relative token cost | Best for |
| --- | --- | --- | --- |
| **Opus 4.8** (`claude-opus-4-8`) | Highest - catches subtle, cross-cutting issues; strongest adversarial reasoning | Highest per equivalent task (more thorough, more output) | Adversarial review, behavioral grading on nuanced skills, authoring a complex component, anything where a missed issue is costly |
| **Sonnet 4.6** (`claude-sonnet-4-6`) | Strong - a good default; occasionally misses the deepest cross-cutting cases | Middle | Most advisory reviews and authoring; the sensible default when you have many targets and want quality without Opus cost |
| **Haiku 4.5** (`claude-haiku-4-5-...`) | Solid on bounded, well-specified tasks; weakest on open-ended judgment | Lowest, fastest | Mechanical or bounded passes, first-draft authoring, large-scale runs where you accept shallower advice |

The quality gap between models is **widest on open-ended judgment** (is this skill's description actually good? does this review find the non-obvious bug?) and **narrowest on bounded, well-specified work** (summarize these deterministic findings; draft a skeleton from a clear spec). Spend the model budget where judgment is open-ended.

### Effort (extended-thinking budget)

| Effort | Output tokens | Quality effect | Use when |
| --- | --- | --- | --- |
| **Low / none** | Fewest | Fine for mechanical tasks; shallow on hard reasoning | Summaries, format conversions, bounded drafts |
| **Medium** | Moderate | A balanced default | Most advisory reviews and authoring |
| **High** | Most | Real gains on hard reasoning (adversarial verification, behavioral nuance); **diminishing returns on easy tasks** | A correctness-critical review, a subtle behavioral grade, a hard design call |

Effort multiplies **output** tokens (the model thinks more before answering). On an easy task that multiplication buys little; on a genuinely hard one it is where the quality comes from. The classic waste is high effort on a mechanical task; the classic false economy is low effort on a nuanced judgment.

### The combined rule of thumb

- **Scale, bounded advice you will skim:** Sonnet (or Haiku) at low-medium effort. The grade is already deterministic and free; the advice is a bonus.
- **One target, decision-critical advice:** Opus at high effort. You are paying for the catch you would otherwise miss.
- **Never:** Opus + high effort to render a summary, or Haiku + low effort for a behavioral grade you will act on.

## Measured data points

These are **MEASURED** from this repository (not estimates):

| What | Model | Effort | Tokens | Notes |
| --- | --- | --- | --- | --- |
| Gate, one plugin | n/a | n/a | **0** | deterministic |
| Gate, 82-plugin marketplace | n/a | n/a | **0** | ~16s wall-clock, deterministic |
| Render HTML or MD report | n/a | n/a | **0** | deterministic projection |
| 4-lens adversarial review of a ~160-line diff | Opus 4.8 | high | **~232k total** | 4 agents, ~51k-65k each (a useful anchor for "a thorough pre-merge review") |

The per-target **advisory** ranges (`--report=review` / `--report=behavioral`) and the **authoring** ranges (`askit-build-*`) are **not yet measured**. Filling them is an active task: see [How to keep this current](#how-to-keep-this-current).

## How to estimate your run

1. **The grade and any rendered report: budget 0 tokens.** This covers `check.mjs`, `tier-report.mjs`, and every `evaluate.mjs` format except the two advisory reports. At any scale.
2. **Advisory reports: budget `N targets x (one advisory run)`** at your chosen model and effort. Until the measured ranges below are filled, treat one advisory run as roughly the scale of one focused review agent (the 4-lens anchor above is ~58k tokens per agent at Opus/high; a single Sonnet/medium advisory will be materially less).
3. **Authoring: budget per component**, dominated by the component's size and how many revision rounds you allow.

Worked example: grading a 200-plugin marketplace for conformance and rendering an HTML report for each costs **0 model tokens** (deterministic, a few minutes of compute). Adding an Opus/high-effort review advisory for the 10 plugins that failed is `10 x (one advisory run)` - a small, opt-in, bounded spend on top of a free grade.

## Assumptions

These are the assumptions behind every number on this page. They are valid only while they hold; check them against your run.

- **"Tokens" means total model tokens** (input + output) for the operation, unless a row says otherwise. The 4-lens anchor is the sum of all four agents' reported usage.
- **"Effort" means the extended-thinking budget**, the reasoning the model does before it answers. More effort means more output tokens.
- **The deterministic regime is genuinely zero model tokens**, not "near zero". It runs no model. This is a structural property of the gate (Design Principle 3), not a measurement that could drift.
- **The advisory layer is bounded by the deterministic findings it decorates.** It explains, prioritizes, and adds behavioral or review judgment, but it cannot invent a pass or a fail. So its worst case degrades advice quality, never the grade.
- **Model judgment quality is ranked Opus > Sonnet > Haiku** on open-ended tasks, narrowing to near-parity on bounded, well-specified tasks. This reflects the model family's general capability ordering, not a per-task guarantee.

## Caveats

- **Ranges, not point estimates.** Model-assisted cost is workload-dependent: the number of findings, the size of the skill, the depth of advice requested, and the number of revision rounds all move it. A single number would mislead; budget with a range and a ceiling.
- **This page tracks tokens, not dollars.** Per-model pricing changes; convert tokens to cost with current pricing at run time.
- **Re-measure when models change.** The capability and cost ordering above is current as of this page's date; a new model generation can shift both. Treat the measured table as the source of truth and the unmeasured ranges as provisional.
- **The anchor is one data point.** The ~232k 4-lens figure is a single review of a small diff at Opus/high effort. A larger diff, more lenses, or more verification rounds scale it up; a cheaper model or lower effort scales it down. Use it to calibrate, not to predict exactly.
- **Guidance, not a guarantee.** These estimates help you plan; they are not a service-level promise.

## How to keep this current

The honest way to fill the unmeasured ranges is to record real runs. The companion practice is a **historical evaluation-run record**: for each advisory or authoring run, log the context (what was evaluated), the skill or plugin name and version, the date, the model and effort, the measured token usage, and a pointer to the output. A handful of recorded runs across models and effort levels turns the provisional ranges above into measured ones.

When you add measured rows, mark them **MEASURED** and cite the run, and move the corresponding range out of "not yet measured". Keep the deterministic rows at **0** - that does not change.
