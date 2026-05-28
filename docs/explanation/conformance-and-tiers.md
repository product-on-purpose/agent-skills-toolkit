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

## Silver checks (added in Phase 3A)

Convergent (Silver) reqIds carry the `S` prefix. The current set:

| reqId | What | Standard | Conditional? |
|---|---|---|---|
| S1 | `library.json` `agent-targets` present + valid | sec 5.1, sec 2.2 | no |
| S2 | `library.json` `prefix` present + kebab-dash | sec 8.2 | no |
| S3 | `library.json` `components` index matches disk | sec 5.1, sec 10.3 | no |
| S4 | Chain-contract integrity (phantom; missing-when-chaining) | sec 3.6 | yes |
| S5 | Workflow skill-existence | sec 3.4 | yes |

S6 (per-target format presence) is added in Phase 3B alongside emission.

## Visible burndown - reading `blocked.convergent` as the climb to Silver

`tier-report` caps `satisfies` at the plugin's declared tier (so a Bronze plugin cannot accidentally claim Silver), and lists everything above the ceiling as `blocked.<next-tier>`. The gate-runner (`check.mjs`) follows the same model: only errors at-or-below the declared tier fail the gate. So a Bronze plugin that adds Silver requirements gradually sees its `blocked.convergent` list shrink, while CI stays green throughout the climb. The repository itself works this way - `node scripts/tier-report.mjs --json` prints the toolkit's remaining Silver gaps as a literal to-do list.
