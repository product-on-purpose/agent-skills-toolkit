# Spike: skills-ref status + YAML approach (Task 0 / issue #8)

Date: 2026-05-26. Outcome: Q1.1 CONFIRMED (reimplement behind the seam); YAML dep kept.

## Investigation

| Probe | Result |
|---|---|
| `npm view skills` | `skills` v1.5.7 - "the open agent skills ecosystem"; an install/sync CLI (`list`, `install`, `experimental_sync`). Not a validator. |
| `npm view @agentskills/skills-ref` | 404 - does not exist. |
| `npm view skills-ref` | **Exists**, v0.1.5, MIT, "Reference library for Agent Skills". bin `skills-ref`. deps: commander + js-yaml. Maintainer: an individual (yc.ma); last published ~5 months ago. NOT the official Anthropic/agentskills org. |
| `skills-ref --help` | Commands: `validate <skill_path>`, `read-properties`, `to-prompt`. |
| `skills-ref validate <good>` | `Valid skill: ...`, exit 0. |
| `skills-ref validate <bad>` | `Validation failed for ...:` + ` - <message>` bullets, exit 1. |

`skills-ref validate` covers: name lowercase, name char set, name == directory, required-field presence (name/description). It does **not** cover: description scoring (our U5 rubric), reference-link resolution (U6), or instruction-budget (U7). Output is plain text (parseable line-by-line), no `--json`.

## Decision (Q1.1): reimplement behind `checkAgentskills`

Wrapping `skills-ref` was reconsidered with this evidence and rejected:
1. **Unofficial + stale.** It is one individual's package, not the official reference, last touched 5 months ago. Coupling the trust root to it is a maintenance and trust risk.
2. **Partial coverage.** It only does U3/U4 + required-field presence. We must build U5/U6/U7 ourselves regardless, so wrapping does not save the hard parts.
3. **Fragile interface.** Text output, no JSON; we would parse human strings. Our own checks emit structured `Finding`s with severity + file + remediation (Standard sec 4.5) directly.
4. **Standard already says "equivalent."** Sec 6 requires "skills-ref-*equivalent* validation," not the tool itself.

The `checks/agentskills.mjs` seam (`checkAgentskills(ctx)`) remains the single swap point if an official, JSON-emitting validator appears later.

## Carry-forward (not built now, YAGNI)

`skills-ref` is useful as a **test oracle**: optionally run `npx skills-ref validate` against our golden/anti fixtures in CI to confirm our reimplemented U3/U4 agree with the reference. Candidate enhancement for Phase 2+, behind an opt-in flag (it adds a dev dependency). Not part of Phase 1 scope.

## YAML

Decision unchanged: keep the `yaml` runtime dependency for frontmatter parsing (maintainer-approved). Note: `skills-ref` itself uses `js-yaml`, corroborating that even the reference tool does not hand-roll YAML.
