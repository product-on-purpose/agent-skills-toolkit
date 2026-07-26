# Dispatch template - behavioral mode (`askit-quality-grader`)

The reusable role prompt for the **behavioral** advisory pass of an eval run (F2 / backlog E11, R-PIPE-3). Copy the prompt below, fill the parameters, and dispatch it as a subagent carrying the `askit-quality-grader` contract ([`agents/askit-quality-grader.md`](../../../agents/askit-quality-grader.md)). The review counterpart, and the shared conventions this file does not repeat, are in [dispatch-reviewer.md](dispatch-reviewer.md).

The deterministic half of the run comes first and costs zero model tokens: `node scripts/eval-run.mjs <target-id>` verifies the pin, grades the target, and renders the conformance report. This template is the only part of a run that involves a model.

## Parameters

Same set as the review template (`{{MODEL}}`, `{{EFFORT}}`, `{{TARGET}}`, `{{SCOPE}}`, `{{PIN}}`, `{{PROFILE}}`, `{{BASELINE}}`, `{{OUT}}`), all read from the run skeleton the runner wrote.

## Effort wording (instruction-directed)

- **high** - derive a large case set including adversarial near-misses against sibling components, and judge each case against the artifact rather than against the description's promise.
- **medium** - derive a balanced case set (should-fire, should-not-fire, and behavior cases), judge each with evidence.
- **low** - a small bounded case set, judged quickly. Say plainly that it is a smoke pass.

Measured caution from the record (reading 5 and the R5 all-pass): a low-effort behavioral run produced an all-pass verdict whose only no-fire case was an easy one. Never act on a low-effort behavioral grade, at any tier.

## The `evals/` fallback (documented, not improvised)

The `evals/` eval-set convention has zero on-disk instances anywhere in the corpus so far, so almost every behavioral run derives its own cases. That fallback is legitimate and must be **declared in the evidence**:

1. Derive should-fire queries from the description's trigger clause.
2. Derive should-not-fire near-misses by reading **sibling** components, so the near-miss is genuinely competitive rather than a straw query.
3. Derive behavior cases from the documented workflow, one per step that makes a checkable claim.
4. State in the output that the cases were derived, and from what.

## Case-count and coverage bounds

At collection scale, bound the case set deliberately and say so: how many components were graded, how many cases each, and which components were not graded at all. The runner writes the deterministic coverage bound into the skeleton and the aggregator carries it into the record; add the advisory-side bound to your own output so the pair is complete. A bound that is not stated is the failure the methodology's "no silent caps" rule forbids.

## Output rules

- **Plain ASCII only.** No em dashes, no en dashes, no smart quotes.
- **Summary counter semantics** (do not improvise them): `fired` = should-fire cases that fire; `missed` = should-fire cases that do not; a false fire (a should-not-fire case that fires) counts as `behaviorFail`.
- **Say when a case was judged statically.** If live execution was not possible, judge by static analysis of the artifact and mark the case as such. A statically judged pass is weaker evidence and must not read as a runtime pass.

## The invariant a dispatch cannot break

The behavioral result is **rendered beside the deterministic verdict and never moves it**. `applyAdvisory()` in `scripts/evaluate.mjs` merges only the advisory's own namespaced key (`behavioral`), so a case set cannot change the tier, the findings ledger, the counts, or the gate exit code. Behavioral mode is evidence, never a CI pass or fail (Design Principle 3).

## The prompt

```text
You are the askit-quality-grader delegate for an evaluation run of the agent-skills-toolkit
improvement program. You are read-only: never edit, create, or delete anything in the target.

Target:            {{TARGET}}
Pinned at:         {{PIN}}
Evaluation scope:  {{SCOPE}}
Gate profile:      {{PROFILE}}
Deterministic baseline (already computed, free, authoritative): {{BASELINE}}
Instructed effort: {{EFFORT}}

Judge whether this skill (or each skill in this plugin) triggers when it should, stays silent when
it should not, and does what it documents. If an evals/ eval-set exists, use it. If it does not -
the common case - derive the case set and declare the derivation: should-fire queries from the
trigger clause, adversarial near-miss no-fire queries built by reading sibling components, and
behavior cases from the documented workflow.

Depth for effort {{EFFORT}}: <paste the effort wording for this level, verbatim>

Rules:
- Evidence per case: what you exercised or read, and why the verdict follows.
- If live execution is not possible, judge statically and mark the case as statically judged.
- Counter semantics: fired = should-fire cases that fire; missed = should-fire cases that do not;
  a false fire counts as behaviorFail.
- Plain ASCII only: no em dashes, no en dashes, no smart quotes.
- Your result is advisory evidence. It renders beside the deterministic verdict, cannot change it,
  and is never a CI pass or fail.

Write your result as JSON to {{OUT}} in exactly this shape:

{
  "behavioral": {
    "model": "{{MODEL}}",
    "effort": "{{EFFORT}}",
    "date": "<YYYY-MM-DD>",
    "cases": [
      { "kind": "trigger|behavior", "id": "...", "expected": "...", "observed": "...",
        "verdict": "pass|fail", "evidence": "..." }
    ],
    "summary": { "fired": 0, "missed": 0, "behaviorPass": 0, "behaviorFail": 0 }
  }
}

Then report back: the case counts and pass rate, every failing case in one line each, the
derivation you used, any coverage bound you applied, and your own token usage and wall-clock if
the harness reports them.
```

## After the dispatch

1. Render the advisory beside the verdict: `npm run evaluate -- {{TARGET}} --report=behavioral --advisory {{OUT}} --format=html --out <report>.html` (and `--format=md` for the Markdown twin).
2. Fill the run skeleton's `advisory` fields in `_local/audit/eval-runs/<date>/<run>-record.json`.
3. Aggregate: `node scripts/eval-run.mjs --aggregate <date>`.
4. File the engine-side readings with dispositions per [METHODOLOGY.md](METHODOLOGY.md).
