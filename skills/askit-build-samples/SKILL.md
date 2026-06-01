---
name: askit-build-samples
description: Creates and validates a skill's sample sets and eval sets (golden examples, anti-examples, and triggering cases) and detects drift against current behavior. Use when generating samples for a skill, building an eval set, or checking samples for drift.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-build-samples

## Purpose
Author and validate the evidence a skill carries, following the builder pattern ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)). `create` generates a skill's samples (at least 3 golden examples plus at least 1 anti-example, Standard sec 7.2) under `examples/`, and its triggering eval set (at least 20 `{query, should_trigger}` cases, sec 8.3) plus any chain/hook behavior cases under `evals/` in the eval-set format the G3 `library-regression` check and the `askit-evaluate` behavioral mode consume. `validate` detects drift: a sample or eval that no longer matches the skill's current behavior is an error, not a silent staleness. Format and the example-threads convention are in [references/samples-format.md](references/samples-format.md).

## When to use
When generating samples or an eval set for a skill, or checking existing samples and evals for drift after a behavior change.

## create mode
1. Read the target skill (its description, triggers, and behavior).
2. Generate `examples/` golden samples (>= 3 realistic input/output pairs) and an anti-example (>= 1 case the skill should NOT handle), per sec 7.2.
3. Generate `evals/<name>.eval.json`: a triggering set of >= 20 `{query, should_trigger}` cases (fires when it should, silent when it should not, sec 8.3), plus `{given, expect}` behavior cases for any chain the skill participates in (so the G3 check finds coverage).

## validate mode
1. Re-run the samples and evals against the skill's current behavior.
2. Flag drift: a golden sample whose output changed, an anti-example that now triggers, or an eval whose expectation no longer holds. Drift is an error so samples stay honest (sec 7.2, 8.3).

## Scope
Samples and eval sets are the evidence layer. The deterministic G3 baseline (presence + the regression signal) is enforced by `library-regression`; behavioral judging of the cases is the opt-in `askit-evaluate` behavioral mode (delegated to `askit-quality-grader`), never the CI gate (Design Principle 3). Example-threads (the bounded validation triad of ADR 0021: a greenfield Bronze plugin, the pm-skills adopt-and-grade thread, and the toolkit itself as Gold) anchor samples to real end-to-end arcs rather than isolated snippets.
