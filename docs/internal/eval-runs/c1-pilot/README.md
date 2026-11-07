# c1-pilot - the material for experiment B

This folder holds the fixed inputs for experiment B, the pilot that measures criterion C1 of [ADR 0066 (the goal is the builder whose libraries are proven to work, and "best" is measured, not claimed)](../../decisions/0066-the-goal-is-the-builder-whose-libraries-are-proven-and-best-is-measured.md). The rules live in [the pre-registration](../prereg_experiment-b-c1-pilot-20261105.md).

| Path | What it is |
|---|---|
| `held-out/` | The 30 test cases that score the built skills. They are not components of this plugin, and no builder may see them |
| `case-author-prompt.md` | The instructions given to the subagent that wrote the cases |
| `threshold-simulation.mjs` | The toy simulation behind the 0.25 threshold. Its probabilities are assumed, and it reads no real data |
| `harness/` | The container image, the run driver, the scorer and the setup record. See [its README](harness/README.md) |

The pre-registration adds two folders when their steps run: `calibration/` and `results/`.
