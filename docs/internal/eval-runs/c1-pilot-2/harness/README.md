# c1-pilot-2 harness

Scripts for experiment B2's preparation. They reuse experiment B's container image (`localhost/c1-pilot:1`), its scoring token at `~/.c1-pilot.env`, and its leak matcher in [`../../c1-pilot/harness/`](../../c1-pilot/harness/README.md). Working data goes in the gitignored `_local/c1-pilot-2/`, with the held-out cases in `_local/c1-pilot-2/cases/` (design section 3.2).

| File | What it does |
|---|---|
| `screen.mjs` | `run` starts fresh no-plugin Sonnet sessions that see only one brief and write practice prompts, which is the convergence screen in design section 3.5. `match` is the first, lexical pass, kept for the record and no longer used to decide |
| `split.mjs` | Splits one screen session into its numbered practice prompts |
| `rule-testbed.mjs` | Lists experiment B's practice prompts and their same-brief cases, so the convergence rule could be chosen on closed material |
| `calibrate.mjs` | The no-skill calibration of the 30 real cases, with experiment B's stub plugin and command |
| `judge.mjs` | The convergence judge: `testbed` proves it on experiment B's labelled pairs, and `screen` judges each B2 case against its candidate screen prompts |
| `*.test.mjs` | Tests for the above. Run them with `node --test docs/internal/eval-runs/c1-pilot-2/harness/*.test.mjs` |

Set `C1_LOCAL` to experiment B's `_local/c1-pilot` folder and `C1_LOCAL2` to `_local/c1-pilot-2` when running from a worktree.
