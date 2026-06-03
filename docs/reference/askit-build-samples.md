---
title: "askit-build-samples"
description: "Creates and validates a skill's samples and eval sets, following the builder pattern."
audience: engineer
level: intermediate
---

# askit-build-samples (reference)

Creates and validates a skill's samples and eval sets, following the builder pattern.

## Modes
- `create`: generate `examples/` (>= 3 golden + >= 1 anti, sec 7.2) and `evals/<name>.eval.json` (a >= 20-case triggering set, sec 8.3, plus chain behavior cases).
- `validate`: re-run samples and evals against current behavior; drift is an error.

## Format
The eval-set format is the one the G3 `library-regression` check validates and the behavioral runner executes (`covers` + `cases`). Full format + the example-threads convention: [samples-format](../../skills/askit-build-samples/references/samples-format.md).

## Boundaries
Deterministic eval presence + regression is enforced by `library-regression` (G3); behavioral judging is the opt-in `askit-evaluate` behavioral mode (via `askit-quality-grader`), never the CI gate. See the [build-samples how-to](../how-to/build-samples.md).
