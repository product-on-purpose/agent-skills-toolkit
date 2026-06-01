# Reference: Gold (Advanced) conformance checks

The Gold tier adds requirements G1-G7 (Standard sec 2.6) on top of Bronze + Silver. Each fires findings tagged `reqId: "G<n>"`; `tier-report` buckets them into the `advanced` tier and lists unmet ones in `blocked.advanced`. Because they are advanced-tier, they do NOT fail the gate for a plugin that declares `universal` or `convergent` - they appear as the burndown to Gold until the plugin declares `advanced` and addresses them. The checks are built incrementally as the toolkit climbs to Gold; this reference documents the ones implemented so far.

| reqId | Module | What it checks | Standard | Conditional? | Example fix |
|---|---|---|---|---|---|
| G3 | `scripts/checks/library-regression.mjs` | Each chain edge (in `agents/_chain-permitted.yaml`) and each hook event (in `hooks/hooks.json`) carries at least one eval/regression case under `evals/`; an eval covering an edge the contract no longer permits is a stale case (the regression signal) | sec 2.6 (G3), sec 8.3 | yes (a chain contract or hooks exist) | Add `evals/<name>.eval.json` with `"covers": { "chain": ["<caller>", "<callee>"] }` for each uncovered chain (or `{ "hook": "<event>" }` for a hook). Remove or update a stale eval whose covered edge is gone. |

G3 is the **baseline** (presence + execution + the deterministic regression signal). The Standard explicitly defers the multi-tier eval **engine** (Static / LLM-Judge / Monte-Carlo) to roadmap; that judging layer ships beside the gate as opt-in evidence, never inside the deterministic CI gate (Design Principle 3, ADR 0023).

## Eval-set format (`evals/*.eval.json`)

Each file declares what it `covers` and (optionally) its `cases`. The deterministic check validates the `covers` declaration and references; the behavioral layer (opt-in) executes the `cases`.

```json
{
  "covers": { "chain": ["caller-component", "callee-component"] },
  "description": "One line: the chained behavior this set exercises.",
  "cases": [
    { "given": "the input or situation", "expect": "the behavior the chain should produce" }
  ]
}
```

`covers` is one of: `{ "chain": ["caller", "callee"] }` (a permitted chain edge), `{ "hook": "<event>" }` (a registered hook event), or `{ "skill": "<name>" }` (a triggering eval set; a Universal SHOULD per sec 8.3, not gated by G3). The `templates/eval-set.json` skeleton scaffolds one.

See the [add-eval-coverage how-to](../how-to/add-eval-coverage.md).
