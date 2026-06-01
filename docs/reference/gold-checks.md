# Reference: Gold (Advanced) conformance checks

The Gold tier adds requirements G1-G7 (Standard sec 2.6) on top of Bronze + Silver. Each fires findings tagged `reqId: "G<n>"`; `tier-report` buckets them into the `advanced` tier and lists unmet ones in `blocked.advanced`. Because they are advanced-tier, they do NOT fail the gate for a plugin that declares `universal` or `convergent` - they appear as the burndown to Gold until the plugin declares `advanced` and addresses them. The checks are built incrementally as the toolkit climbs to Gold; this reference documents the ones implemented so far.

| reqId | Module | What it checks | Standard | Conditional? | Example fix |
|---|---|---|---|---|---|
| G1 | `scripts/checks/hook-documentation.mjs` | Every hook in `hooks/hooks.json` documents its structure: a `type` per action, and a `matcher` for tool-matched events (PreToolUse/PostToolUse) | sec 2.6 (G1), sec 3.5 | yes (hooks exist) | Add the missing `type` (command/http/mcp_tool/prompt/agent) to each hook action and a `matcher` to each PreToolUse/PostToolUse entry. |
| G2 | `scripts/checks/self-hosting.mjs` | A CI workflow under `.github/workflows/` runs the conformance gate (`node scripts/check.mjs`) - the plugin passes its own validators | sec 2.6 (G2), sec 4 | no | Add a CI workflow that runs `node scripts/check.mjs` (and `npm test`). |
| G3 | `scripts/checks/library-regression.mjs` | Each chain edge (in `agents/_chain-permitted.yaml`) and each hook event (in `hooks/hooks.json`) carries at least one eval/regression case under `evals/`; an eval covering an edge the contract no longer permits is a stale case (the regression signal) | sec 2.6 (G3), sec 8.3 | yes (a chain contract or hooks exist) | Add `evals/<name>.eval.json` with `"covers": { "chain": ["<caller>", "<callee>"] }` for each uncovered chain (or `{ "hook": "<event>" }` for a hook). Remove or update a stale eval whose covered edge is gone. |
| G5 | `scripts/checks/release-notes.mjs` | A curated, user-facing `RELEASE-NOTES.md` exists at the root, distinct from `CHANGELOG.md` | sec 2.6 (G5), sec 10.6 | no | Add `RELEASE-NOTES.md` (highlights-first, user-facing); `askit-release` notes mode curates it. |
| G6 | `scripts/checks/deprecation.mjs` | Every `library.json` component `status` is valid, and a `deprecated` component declares `deprecated-by` (its replacement) and `remove-in` (its removal version) | sec 2.6 (G6), sec 3.7, 7.5 | yes (a deprecated/invalid status exists) | On the deprecated component's `library.json` entry add `"deprecated-by": "<replacement>"` and `"remove-in": "<version>"`, or correct an invalid `status` (active/deprecated/experimental). Manage it with `askit-deprecate`. |

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
