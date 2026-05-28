# Explanation: conformance and tiers

The toolkit grades a plugin against the Advanced Skill Library Standard. Checks emit
`error` or `warn` findings keyed to requirement ids (for example `U5` is the
description-quality rule). `evaluate` composes those checks into a report;
`tier-report` rolls them into the highest tier a plugin satisfies, capped at the
tier it declares in `library.json` so it cannot over-claim.

A description scoring below 0.7 is a warning, never an error - quality is judgment,
so the heuristic guides rather than gates. The tiers (Universal / Convergent /
Advanced, or Bronze / Silver / Gold) are cumulative: each includes the last. That is
why a Bronze plugin can grow into Silver and Gold without rework - the bar rises,
the earlier work still counts.

The toolkit is itself built to this Standard and validates itself in CI: it declares
`tier: universal` and passes its own Universal checks. See
[`STANDARD.md`](../../STANDARD.md) for the normative rules.
