# Samples and eval-set format (reference)

What a skill carries as evidence, and how it stays honest (Standard sec 7.2 samples, sec 8.3 eval coverage).

## Samples (examples/)

- **Golden:** at least 3 realistic input/output pairs that demonstrate the skill working. Each is a small, self-contained `{input, output}` (or a short transcript) showing the expected behavior.
- **Anti-example:** at least 1 case the skill should NOT handle (a near-miss query that should not trigger it, or an input it should refuse), so the boundary is explicit.

## Eval sets (evals/*.eval.json)

The same format the G3 `library-regression` check validates and the behavioral runner executes:

```json
{
  "covers": { "skill": "<name>" },
  "description": "Triggering eval set for <name>.",
  "cases": [
    { "query": "a user utterance that SHOULD fire the skill", "should_trigger": true },
    { "query": "a near-miss that should NOT fire it", "should_trigger": false }
  ]
}
```

- **Triggering set:** at least 20 `{query, should_trigger}` cases (sec 8.3) - balanced positives and negatives so the description neither under- nor over-fires.
- **Behavior / chain cases:** for a chain the skill participates in, a `{ "covers": { "chain": ["caller", "callee"] }, "cases": [ { "given", "expect" } ] }` set (this is what makes the G3 check find coverage for the edge).

## Drift is an error

`validate` mode re-runs samples and evals against current behavior. A golden whose output changed, an anti-example that now triggers, or an eval whose expectation no longer holds is an error - stale evidence is worse than none because it claims a guarantee that no longer holds.

## Example-threads (the validation triad)

Per ADR 0021, samples anchor to three bounded end-to-end threads rather than isolated snippets: a greenfield Bronze plugin built from scratch, the `pm-skills` adopt-and-grade thread (an existing repo brought to conformance via `askit-migrate`), and the toolkit itself as the Gold reference. Each thread exercises the skills in a realistic arc, so samples demonstrate composition, not just unit behavior.
