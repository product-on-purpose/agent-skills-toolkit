# c1-pilot-2 - the material for experiment B2

This folder holds the fixed inputs for experiment B2, the second pilot that measures criterion C1 of [ADR 0066 (the goal is the builder whose libraries are proven to work, and "best" is measured, not claimed)](../../decisions/0066-the-goal-is-the-builder-whose-libraries-are-proven-and-best-is-measured.md). The rules live in [the B2 design](../design_experiment-b2-c1-pilot-2-20261114.md), and later in its pre-registration.

| Path | What it is |
|---|---|
| `briefs.md` | The three real briefs and the dry-run brief, with the one edit made after authoring |
| `brief-author-prompt.md` | The instructions given to the subagent that wrote the briefs |
| `case-author-prompt.md` | The instructions given to the four subagents that wrote the cases and the decoys |

**The held-out cases are not here.** Design section 3.2 keeps them in the gitignored `_local/c1-pilot-2/cases/` until the last real build finishes. The pre-registration will commit a SHA-256 hash of each case file at the freeze, and the files themselves after the builds, so anyone can check them against the hashes.
