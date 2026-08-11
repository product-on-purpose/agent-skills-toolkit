# plan_v1.10.1 - the trust patch

A patch release with no new capability and no Standard movement. Its whole job is to make the
repository's own claims true again, and to convert three of them from things somebody has to
remember into things a machine checks.

Spine stays **30 checks**, Standard stays **v0.12**, tier stays **Advanced**. Nothing a third
party is graded by moves.

## Why a patch, and why now

Four changes had been sitting in `CHANGELOG.md` `[Unreleased]` since 2026-08-07, and main was nine
commits ahead of the `v1.10.0` tag. Two of the four repair promises that affect consumers **today**:

- v1.10.0's `gen-index` fix put every consuming plugin with a previously-generated `INDEX.md` into
  `G4` (generated-docs drift), and nothing told them. The release that caused it shipped without an
  `### Upgrade` section, the only recent release missing one.
- The `G4` remediation instruction told consumers to run a command they do not have. Nothing installs
  the generators into a consuming plugin, and the marketplace member currently failing over `G4` has
  no `scripts/generators/` at all.

A fix that is merged but unreleased helps nobody. That is the entire argument for cutting this now
rather than folding it into v1.11.0.

## What is in it

| Item | Kind | Why it is here |
|---|---|---|
| Promote the four held `[Unreleased]` entries | release hygiene | Merged fixes reach consumers only when tagged |
| `docs/internal/STATUS.md` rewritten | trust surface | 151 lines of accretive log wearing the label "single live source of truth" |
| `docs/internal/RELEASE-HISTORY.md` footer | trust surface | "Where we are now" frozen at 1.9.0; no v1.10.0 entry |
| `docs/internal/execution/EXEC-SUMMARY.md` labels | trust surface | Pre-renumbering release labels |
| Windows argv path normalization + `windows-latest` CI | defect + durable CI | A documented caveat became a fixed defect |
| Component-version drift: 5 instances + a repo-local guard | records vs reality | An ungated field drifted five ways |
| Validator-parity baseline recorded | evidence | The first-party parity claim had one-off audit evidence and no record |
| standards-watch re-run + ADR 0040 (upstream metadata tightening) Proposed | freshness | Pin 15 days stale; the run found a material delta |

## The three that are more than housekeeping

**The Windows path trap was documented rather than fixed.** `docs/how-to/troubleshoot-the-gate.md`
told readers "on Windows use forward slashes; a backslash path is silently read as a different
directory," and `tests/unit/eval-run.test.mjs` carried a comment reading "a backslash path once
graded nothing and printed a clean pass." The repository knew the shape of the defect, wrote it down
in two places, and left the cause in place. Argv paths are now normalized at every CLI entry point,
guarded so that POSIX systems (where a backslash is a legal filename character) are not broken in the
opposite direction, and a `windows-latest` CI job keeps it honest.

**The component-version drift was five, not two.** It entered this release as a two-component
finding, because two components were what PR #204 happened to touch. Comparing all 33 registered
components against their own frontmatter found five, in two directions from two causes. The
instances are fixed and a repo-local test now fails the build on any disagreement. Whether `S8`
(components-mirror) should mirror `version` for **everyone** is a Standard question that moves
third-party verdicts, so it is routed to the backlog why-gate as E24 rather than decided here.

**standards-watch found something pointed at yesterday's work.** The upstream `metadata` field
constraint tightened to "a map from string keys to string values" while the three `skills-ref`
reference-implementation blobs did not move. The `metadata.chain` field that PR #204 introduced one
day earlier is a nested list. All 24 skills were re-run through the reference validator live and all
24 pass, so this repository conforms to the implementation that sec 6 names as definitive, and the
prose is a leading indicator rather than a live break. Recorded as ADR 0040, **Proposed**, and the
pin is deliberately **not** moved: the watcher proposes, and a re-pin lands beside the ADR that
motivated it.

## What is deliberately not here

- **No re-pin.** See above. Accepting ADR 0040 is what moves the pin, and that decision belongs with
  the vendor-alignment batch where the U3 vocabulary-strictness work already lives.
- **No `S8` change.** E24 is filed, not implemented.
- **No new checks and no Standard bump.** A patch that moves a third-party verdict is not a patch.

## Contents

- [RELEASE-PLAN.md](RELEASE-PLAN.md) - the item-by-item plan with acceptance criteria and verification.
- [validator-parity-baseline.md](validator-parity-baseline.md) - the recorded first-party validator
  results at this tag, and the manual precursor to the automated parity harness targeted at v1.11.0.
- [adversarial-review-resolutions.md](adversarial-review-resolutions.md) - the pre-release review, two
  rounds, four findings and their dispositions. Worth reading before the plan: three of the four
  findings were introduced by this release, two of them were seen by a human and waved through, and
  the highest-severity one contradicted an invariant stated in `RELEASE-PLAN.md` itself.
