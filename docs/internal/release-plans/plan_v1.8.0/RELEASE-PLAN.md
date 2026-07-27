---
title: "v1.8.0 release plan - deep builders, measured advisory"
description: "What R2 of the uplift program actually shipped versus what it planned, including the parts of the plan that turned out to be unbuildable as written"
status: shipped
last-updated: "2026-07-26"
---

# v1.8.0 "deep builders, measured advisory" - shipped vs planned

History artifact for R2. The plan of record is [R2-v1.8.0](../../execution/04-releases/R2-v1.8.0-deep-builders-measured-advisory.md).

## Shipped

| Workstream | Planned | Shipped | PR |
|---|---|---|---|
| SP2a craft docs | 4 craft-depth reference docs | all 4 (22-41 lines to 160-219) | #166 |
| SP2b examples | 3 golden + 1 anti per complex builder, 1 golden per remaining | all 13 builders, 25 examples, 7 runnables | #171 |
| F5 authoring tokens | rows to MEASURED | MEASURED, 6 runs, 4 caveats | this cut |
| F3 R-AQ-1 fixture | seeded defects + key | 9 defects, 3 bait entries, gate-clean | #169 |
| F3 R-AQ-2 harness | precision and recall, no model | shipped, no-dispatch proven three ways | #172 |
| Corpus batch 3 | 2-4 new targets, at least 1 marketplace-shaped | 4 targets, readings 18-25 | #167 |
| Evals fixtures | real `evals/` instances | 3 `covers.skill` sets, the form that never existed | #165 |
| U6 message wording | this release | **already shipped in v1.7.0** as H1.11 | n/a |

Plus two unplanned fixes: [ADR 0038](../../decisions/0038-report-never-invents-a-declared-tier.md) (#168) and the hook `additionalContext` craft-doc correction (#170).

516 to **561 tests**. Spine 30 / Standard 0.12 unchanged at every merge.

## Where the plan was wrong, and how

Four items could not be executed as written. All four are corrected in the plan document itself so they cannot be re-executed.

1. **"The `evals/` convention has zero on-disk instances."** Seven existed, covering all five chain edges and a hook. The real gap was `covers.skill`, of which there were zero. A stale premise, true when written.
2. **"and G3 grades them."** Unsatisfiable. `G3`'s skill branch sets a flag and returns, with the in-code comment "not gated by the G3 baseline". Nothing in the spine validates a triggering set's shape or case count. The sets were hand-verified instead, and shape validation is filed for a later release.
3. **F5 Delta 2, "record via the F2 record path."** Not expressible. `eval-run.mjs` requires a pinned corpus target with a repo and a sha, and emits a gate verdict *for that target*; an authoring run has neither, and `--report-type` accepts only `review` or `behavioral`. Records were hand-written in the skeleton's spirit. Teaching F2 an authoring scope is an unfiled F2 change.
4. **The named F5 effort cells (Sonnet/medium, Opus/high).** Not settable: the Agent tool exposes a model parameter but no effort parameter, so subagents inherit the parent session's effort. Measured Sonnet/high and Opus/xhigh instead - still two distinct cells, but not the named ones.

This is the second consecutive release in which an acceptance criterion asserted a capability a check does not have (H1.11's golden snapshot in R1, `G3` here). Both were written as confident statements about existing behavior. **An acceptance criterion that names a check should be verified against that check's source when the plan is written, not when it is executed.**

## What review caught in delegated work

1. **A false PASS in the report renderer**, found by batch 3, reproduced independently, fixed under ADR 0038. The highest-severity finding of the release: an undeclared plugin was told it "declares Gold".
2. **Two golden hook examples emitting output the runtime silently discards.** Caught by a peer agent, verified against vendor docs, and the ambiguity in the craft doc that caused it was closed separately in #170.
3. **An arithmetically unreachable score quoted in a craft doc** (0.20 claimed, 0.00 measured, and 0.20 not reachable by the weight table at all).
4. **A brief of mine cited a 1.00/0.89 measurement that exists nowhere in the repo.** The harness agent checked, said so, and explained that 0.89 is forced rather than earned, since one key entry is human-only and 8/9 is therefore the automatic ceiling. I had passed along a figure from another agent's report as though it were recorded. Worth stating: the orchestrator is a source of unverified claims too.

## Deferred deliberately

- **The defect-rich model triple (R-AQ-3).** The harness and fixture are in place; the three live dispatches are not run. Deferred rather than faked: it needs real model runs to mean anything, and a simulated triple would be a fabricated measurement on a public page.
- **`U5` is mathematically unpassable in French** (reading 18). An ADR candidate for a later release, and the ADR must answer a design question rather than add French regexes, or the same cliff sits one language over.
- **F2 runner defects** (readings 20, 22, 23): a component-scope verdict taken from a plugin-scope grading, an aggregator that would append rows its own charter forbids, and one refusal aborting a whole batch.
- **A latent key defect:** `matchText.join`'s JSON value decodes to a literal backslash and an `n` rather than a newline. No current pattern straddles a field boundary, so impact today is nil. Written down rather than silently patched.

## Re-pin

[repin-instructions.md](repin-instructions.md). Staged per the packet boundary unless the maintainer lifts it again.
