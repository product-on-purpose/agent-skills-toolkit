# Dispatch template - review mode (`askit-reviewer`)

The reusable role prompt for the **review** advisory pass of an eval run (F2 / backlog E11, R-PIPE-3). Copy the prompt below, fill the four parameters, and dispatch it as a subagent carrying the `askit-reviewer` contract ([`agents/askit-reviewer.md`](../../../agents/askit-reviewer.md)). The behavioral counterpart is [dispatch-grader.md](dispatch-grader.md).

The deterministic half of the run comes first and costs zero model tokens: `node scripts/eval-run.mjs <target-id>` verifies the pin, grades the target, and renders the conformance report. This template is the only part of a run that involves a model.

## Parameters

| Parameter | What it is | Where it comes from |
| --- | --- | --- |
| `{{MODEL}}` | the model tier the run is measuring (for example Opus 4.8, Sonnet 4.6, Haiku 4.5) | the matrix cell this run fills |
| `{{EFFORT}}` | instructed depth: `high`, `medium`, or `low` (see the wording below) | the matrix cell this run fills |
| `{{TARGET}}` | the absolute, forward-slash path the runner graded | the run skeleton's `target.path` |
| `{{SCOPE}}` | `plugin` or `component`, as the evaluator detected it | the run skeleton's `scope` |
| `{{PIN}}` | the target's pinned sha | the run skeleton's `target.sha` |
| `{{PROFILE}}` | the gate profile the deterministic baseline used | the run skeleton's `profile` |
| `{{BASELINE}}` | the deterministic verdict, for example `11E / 12W, Tier none (plain-plugin)` | the run skeleton's `gate.verdict` |
| `{{OUT}}` | where to write the advisory JSON | the run skeleton's output directory |

## Effort wording (instruction-directed, not a configured thinking budget)

Use these words verbatim, because the record's measured cells are only comparable if the instruction was the same:

- **high** - exhaustive, multi-pass. Verify claims against the files rather than trusting them; read sibling components to test cross-component consistency; spot-check factual, legal, and domain assertions against what you know and say when you cannot verify one.
- **medium** - one balanced, thorough pass. Read every component's entry point, sample deeper where something looks wrong, verify the claims that a finding would rest on.
- **low** - one quick bounded pass. Skim for obvious defects, do not chase; report only what you actually saw.

Measured caution from the record (readings 14, 16, 17): Haiku-tier output has confabulated a correction at BOTH medium and high effort. Never treat a Haiku-tier "verified" as verification. If the review must vouch for factual, legal, or domain claims, budget at least one frontier model, and two as a panel where the decision matters.

## Collection-scale sampling protocol (50+ skills)

The deterministic gate always covers every component. The advisory pass does not have to, and pretending otherwise is the failure the methodology's "no silent caps" rule forbids. At **50 or more skills**, instruct sampling explicitly (this held an 86-skill review to about 77k tokens):

1. Deep-read a **stratified sample**: the entry-point/README component, two or three of the largest, two or three of the smallest, and every **name-collision pair** (components whose descriptions could answer the same query).
2. Grep the remainder for claim consistency (version strings, cross-references, tool lists, statutory or numeric claims) rather than reading them.
3. State the sample in the advisory: how many components were deep-read, how many were grepped, and how they were chosen.

The runner already writes an `advisory-sampling` coverage bound into the run skeleton for a 50+ target, and the aggregator carries it into the tracked record, so a sampled run can never be read later as full coverage.

## Output rules

- **Plain ASCII only.** No em dashes, no en dashes, no smart quotes, no non-breaking spaces. Use " - " or restructure the sentence. This has needed hand-fixing on Haiku-tier output before, so check it before returning.
- **Findings carry evidence.** Every finding names a file and a concrete remediation, and says whether it was verified against the file or inferred.
- **Do not recommend a gate change without ground-truth proof.** A recommendation to weaken or strengthen a check is itself advisory and has been wrong: a high-effort run once mis-triaged eleven real link defects as checker false positives (reading 8). Show the semantic that proves the claim.

## The invariant a dispatch cannot break

The advisory result is **rendered beside the deterministic verdict and never moves it**. `applyAdvisory()` in `scripts/evaluate.mjs` merges only the advisory's own namespaced keys (`review`, `insights`), so an advisory block cannot change the tier, the findings ledger, the error and warning counts, or the gate exit code even if it tries. Write the advisory to judge the subject, not to grade it: the grade is already decided, for free, by the deterministic run.

## The prompt

```text
You are the askit-reviewer delegate for an evaluation run of the agent-skills-toolkit
improvement program. You are read-only: never edit, create, or delete anything in the target.

Target:            {{TARGET}}
Pinned at:         {{PIN}}
Evaluation scope:  {{SCOPE}}
Gate profile:      {{PROFILE}}
Deterministic baseline (already computed, free, authoritative): {{BASELINE}}
Instructed effort: {{EFFORT}}

The deterministic conformance gate has already graded this target and its verdict is final. Your
job is the layer the checks cannot reach: is this library correct, coherent, and honest? Look for
what only judgment can see - trigger-surface collisions between components, a command whose
content contradicts the skill it maps to, capability overclaims, stale or wrong knowledge content,
scope creep, cross-component coupling, and descriptions written at the wrong altitude.

Depth for effort {{EFFORT}}: <paste the effort wording for this level, verbatim>

If the target has 50 or more skills, apply the sampling protocol: deep-read a stratified sample
(entry point, largest, smallest, every name-collision pair), grep the rest for claim consistency,
and state the sample you took in the output.

Rules:
- Verify before you assert. Say which findings you verified against a file and which you inferred.
- Plain ASCII only: no em dashes, no en dashes, no smart quotes.
- A recommendation about the CHECKER itself must show the semantic that proves it, not just
  your confidence.
- Your result is advisory. It renders beside the deterministic verdict and cannot change it.

Write your result as JSON to {{OUT}} in exactly this shape:

{
  "review": {
    "model": "{{MODEL}}",
    "effort": "{{EFFORT}}",
    "date": "<YYYY-MM-DD>",
    "findings": [
      { "area": "...", "severity": "major|minor|info", "message": "...", "file": "...",
        "provenance": "verified|inferred" }
    ]
  },
  "insights": [ "..." ]
}

Then report back: the finding counts by severity, the two or three findings that matter most, the
sample you took if you sampled, and your own token usage and wall-clock if the harness reports them.
```

## After the dispatch

1. Render the advisory beside the verdict: `npm run evaluate -- {{TARGET}} --report=review --advisory {{OUT}} --format=html --out <report>.html` (and `--format=md` for the Markdown twin).
2. Fill the run skeleton's `advisory` fields (`model`, `effort`, `tokens`, `wallClockSeconds`, `toolUses`, `result`) in `_local/audit/eval-runs/<date>/<run>-record.json`.
3. Aggregate: `node scripts/eval-run.mjs --aggregate <date>`. That appends the row to [eval-runs.md](eval-runs.md) and widens the measured range in the public token dossier.
4. File what the run taught you about the ENGINE as a numbered sensor reading with a disposition, following [METHODOLOGY.md](METHODOLOGY.md). A reading is not a calibration until it is verified against ground truth.
