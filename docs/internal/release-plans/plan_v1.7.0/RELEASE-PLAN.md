---
title: "v1.7.0 release plan - trust and craft"
description: "What R1 of the uplift program actually shipped versus what it planned, including the one item rejected on evidence"
status: shipped
last-updated: "2026-07-26"
---

# v1.7.0 "trust and craft" - shipped vs planned

The history artifact for R1 of the [askit uplift program](../../execution/README.md). The plan of record is [R1-v1.7.0-trust-and-craft.md](../../execution/04-releases/R1-v1.7.0-trust-and-craft.md); this page records what actually happened.

**Authorized** 2026-07-26 by maintainer instruction ("complete 1.7.0"). R2-R4 remain pending.

## Shipped

| Bundle | Planned | Shipped | PR |
|---|---|---|---|
| PR-0 CI hardening | changes 1-8 of the CI plan | all 8 | #149 |
| PR-1 H1 docs | H1.2, H1.3, H1.4, H1.5, H1.7, H1.10, H1.11 | all 7 | #156 |
| PR-2 H1 code | H1.1, H1.8, H1.9 | H1.1, H1.8; **H1.9 rejected** | #158 |
| H1.6 branch prune | prune stale merged branches | 20 pruned | orchestrator, no PR |
| PR-3 SP1 craft pass | the full bundle + ADR | all, plus an eval the spec missed | #157 |
| PR-4 F2 eval pipeline | R-PIPE-1..5 + 3 deltas | all, with one honest caveat | #160 |
| Security fixes | not planned | 2 CodeQL high, found and fixed | #161, #162 |

Spine **30**, Standard **0.12**, both unchanged. 442 -> **516 tests**. Gate Advanced 0/0 at every merge.

## The one rejected item

**H1.9 was rejected because its premise was false.** It described `site/src/content/docs/catalog.md` as "a gitignored build artifact left on disk". It is matched by no gitignore rule, never touched by the generator, tracked since the v1.0.0 marketplace launch, a published route with a named sidebar section, and guarded by a test whose header says it is hand-authored editorial prose. Executed as written it deleted a public docs page, its route, its sidebar entry, and its drift guard, taking the site 77 -> 75 pages. Reverted; the evidence table is in the plan's H1.9 section so it cannot be re-executed.

This fired exactly the stop-and-flag condition [03-execution-plan.md](../../execution/03-execution-plan.md) section 5 defines. Worth keeping: **a confidently-worded plan makes this failure more likely, not less**, because a premise stated as fact gets executed rather than re-derived.

## What review caught that the agents did not

Recorded because it is the evidence for how much orchestrator review is worth on delegated work.

1. **A new reference page invented a chain permission** and asserted two parent relationships absent from `_chain-permitted.yaml`. Corrected to the verifiable facts; the page now states the real split (4 of 7 subagents have a declared edge).
2. **A whole "What we are not claiming" section was deleted** when only one sentence in it was stale. Restored with the caveat corrected.
3. **H1.11 shipped with zero test coverage.** Its acceptance criterion says to regenerate the golden snapshot for a U6 finding; no such snapshot exists, because every render fixture is a clean plugin. A direct assertion was added instead, and the unsatisfiable criterion is recorded.
4. **Branch protection would have broken on every future PR.** The Node matrix renames `validate` to `validate (22.12.0)` / `validate (24)`, so the required context would never report. The CI plan specifies the matrix in detail and never mentions protection.
5. **SP1 staled three doc surfaces** the moment its chain edge landed, including a reference page shipped the day before.
6. **A cross-platform path bug** invisible on Windows: separators were normalized after `path.resolve` instead of before. Caught by the new Linux matrix leg, which is the first thing that matrix paid for.

## Honest caveats carried forward

- **R-PIPE-4 has never run against the tracked record.** It is proven on `--dry-run` against the real files and on byte-copies. The first real batch will be its first live append, deliberately, because the record's charter says the deterministic gate is never logged there and a deterministic-only smoke run would have put non-runs in the history.
- **The 4-lens adversarial panel ran as orchestrator review**, not as a separate multi-agent panel. Every substantive PR was reviewed against all four lenses and the findings are listed above, but the mechanism differed from the packet's description.
- **`askit-build-skill` did not get a component version bump** despite gaining a phase, to avoid a `library.json` conflict with the release bump. Worth doing next release.
- **Two copies of the Markdown cell escape now exist** with different contracts. Left separate deliberately; extract if a third appears.
- **Seven Dependabot PRs are open** and deliberately not merged into this release, including two major action bumps. They want maintainer review, not an unreviewed pre-release merge.

## Re-pin

[repin-instructions.md](repin-instructions.md).
