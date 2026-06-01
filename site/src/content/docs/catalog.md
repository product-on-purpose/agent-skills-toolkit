---
title: The catalog
description: The builder skills, the judgment subagents, and the validation spine the toolkit ships.
---

The toolkit ships the full v1 catalog: builder skills for every component type, governance and lifecycle skills, onboarding skills, a delegate-subagent roster, and a deterministic validation spine.

## Builder skills

`askit-build-skill`, `askit-build-subagent`, `askit-build-command`, `askit-build-mcp`, `askit-build-hook`, `askit-build-chain-contract`, `askit-build-agents-md`, `askit-build-output-style`, `askit-build-workflow`, `askit-build-docs` (including an Astro Starlight site mode), `askit-build-samples`, `askit-build-statusline`, `askit-build-settings`. Each follows one builder pattern with create and improve modes.

## Assess, govern, onboard

- **Assess:** `askit-evaluate` (conformance, plus opt-in behavioral and review modes).
- **Govern and lifecycle:** `askit-backlog`, `askit-decision` (ADRs and RFCs), `askit-release` (version, changelog, release-notes, gate), `askit-deprecate`.
- **Onboard and adopt:** `askit-init-plugin` (interview, questionnaire, hybrid), `askit-init-marketplace`, `askit-migrate` (adopt an existing repo), `askit-template-manager`.
- **Advise:** `askit-capability-advisor` (what a target agent supports, and which tier to aim for).

## The judgment subagents

A reusable Claude-only delegate roster: `askit-skill-author`, `askit-evaluator` (deterministic conformance), `askit-quality-grader` (behavioral judge), `askit-reviewer` (qualitative review), and the `askit-explorer` / `askit-file-search` / `askit-file-ops` primitives.

## The validation spine

A zero-dependency Node spine grades a plugin against the Standard: Bronze checks `U1`-`U11`, Silver `S1`-`S8`, and Gold `G3` (eval/regression coverage) and `G6` (deprecation contract). The aggregate gate (`node scripts/check.mjs`) reports the tier and the burndown, runs in CI, and needs no model.

See the full reference and how-to docs in the [GitHub repository](https://github.com/product-on-purpose/agent-skills-toolkit/tree/main/docs).
