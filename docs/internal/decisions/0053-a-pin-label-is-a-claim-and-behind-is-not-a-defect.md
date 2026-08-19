# 0053 - A pin's label is a claim this repository makes, and being behind is not a defect

## TL;DR

- **E45 ships as `action-pin-watch`**, a maintainer-only script beside `vendor-watch` and `release-ready`, resolving every `uses:` pin across the workflows and `action.yml` against the GitHub registry.
- **The rule: a SHA ref MUST carry a comment naming the version it resolves to; a major-tag ref needs none.** This codifies existing practice exactly rather than inventing a convention: all 8 SHA pins already carry comments and all 21 tag pins already do not.
- **The exit codes SPLIT, and that is this ADR's central decision.** A **label problem** exits 1 and **blocks a release**, and nothing can override it. A **lookup that could not be performed** exits 2, blocks, and is overridable for an outage. A pin merely **BEHIND** its action's current release exits 0 and blocks nothing.
- **A known defect outranks uncertainty: exit 1 beats exit 2.** This was inverted in the first draft and **review wave 1 proved the inversion reachable** - see "What review wave 1 corrected" below. It is not a detail; it is the difference between this ADR's central safety claim being true and being false.
- **Why the split:** a wrong label is a defect in THIS repository, fixable unilaterally, and shipping it means every reviewer reads a false line. A pin being behind is news about somebody else's release cadence, and blocking on it would let an upstream release stop a tag here for a fact that is only worth knowing. `vendor-watch` does not carry that failure mode and this must not import it.
- **Measured before ratification, and one of those measurements was wrong.** The sketch was probed on 2026-08-18 across 29 pins and 8 actions. It reported one label disagreement; **that was a FALSE POSITIVE and the check, not the repository, was at fault.** Corrected: **this repository has zero label defects.** Both the failing path (exit 1) and the refusal path (exit 2) are nevertheless demonstrated against live registry data, using the real historical `codeql-action` defect this item was filed from.
- **The zero-code alternative is dispositioned, not ignored:** stop closing Dependabot PRs. It is cheaper and it is kept as standing guidance; it does not replace the check, because it depends on a human choosing correctly every time and that is what failed three times.
- **Status:** Accepted (ratified 2026-08-18).

- **Date:** 2026-08-18
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on

- **ADR 0022** (the release-readiness gate) - this adds the fifth gate to `release-ready`.
- **The `vendor-watch` design, v1.14.0** - write-incapable by construction, refusal outranks a clean result, and the report never amends what it watches. Every one of those properties is inherited here. What is *not* inherited is the blocking posture, and the reason is the whole of decision 2 below.
- **E45**, filed 2026-08-17 while triaging Dependabot PRs #224 to #228, with both halves and the design sketch this ADR implements.

## Context and problem statement

Seven workflows and one published composite action pin GitHub Actions. Eight of those pins are 40-character SHAs, and a SHA is opaque: the only thing a reviewer can actually read is the trailing `# vX.Y.Z pinned <date>` comment beside it.

**Dependabot advances the SHA and leaves that comment untouched**, because it rewrites a bare `# vX.Y.Z` and this repository's comments carry trailing prose that falls outside the pattern it matches. So the machine-readable half and the human-readable half drift apart, and **the human-readable half is the only one anybody reads.**

| Occurrence | Superseded by | State of the comment afterwards |
| --- | --- | --- |
| #187 | #188 | stale |
| #198 | #199 | stale |
| #225 | #234 | stale |

**Three occurrences, three catches, every one by a human reading a diff.** #199's own commit message diagnosed the cause on 2026-08-09 and the fourth occurrence still arrived. A defect caught three times by eye and zero times by a machine is this repository's standing definition of something that needs a guard.

**And the remedy for that defect caused a second one.** Superseding a Dependabot PR means closing it, and closing a Dependabot PR stops it proposing that dependency version. The repository's history contains the natural experiment: #150 (`setup-node`) was merged and kept being reported; #159 (`checkout`) was closed for the hand-written #179, and `actions/checkout@v4` then sat unreported in `vendor-watch.yml` for a full release. Closing #225 on 2026-08-17 did the same to `codeql-action`, so **`codeql.yml`'s three pins are currently watched by nothing.**

One lookup answers both halves. Resolving a pin against the registry it came from tells you whether the label names the version the ref resolves to, and whether the pin is behind - and the second answer does not care whether Dependabot is willing to say so.

## Decision drivers

- A guard must be **demonstrable failing**, not merely observed passing. This repository has shipped two that could never fail: two vendor claims pinned as bare tokens, and a README drift guard that covered four of five front-door claims.
- **A refusal is never a pass.** A rate limit, a 403, a 503 is not a verdict.
- The gate must not acquire a **failure mode nobody here controls**. `release-ready` is what stands between a defect and an irreversible npm publish; every gate added to it is a new way for a release to be blocked, and each one must be worth that.
- Nothing may **write**. Deciding whether the comment or the pin is the wrong half is a human's call.

## Considered options

**1. Do nothing; rely on review.** Rejected on the record above. Three catches by eye, and the fourth occurrence arrived anyway after the cause had been written down.

**2. The zero-code mitigation alone: stop closing Dependabot PRs.** Merge the bump, then follow it with a comment-only correction commit. It costs one extra commit per bump and it keeps the dependency visible to Dependabot, which closes half two directly and at zero engineering cost.

**Rejected as the complete answer, and adopted as standing guidance alongside the check.** It is strictly better than the supersede-by-hand habit and it should be the default from now on. But it closes half one only by a human remembering to write the correction commit, which is the same dependency on human diligence that failed three times, and it leaves the label unchecked between bumps. **It is a better process, not a guard.**

**3. Ship the check, blocking on everything, mirroring `vendor-watch` exactly.** Simplest to reason about and hardest to ignore. **Rejected**, and this is the substantive call: it makes an upstream release able to block a tag here. `actions/checkout` shipping a v8 would fail `release-ready` on a repository whose own files are all correct, with the remedy being "review and adopt a new major", which is not a release-blocking task. `vendor-watch` blocks on a vanished claim because that means this repository is publishing a falsehood; a behind pin means nothing of the kind.

**4. Ship it advisory-only.** Rejected: an advisory nobody is required to read is how this got caught by eye three times.

**5. Ship it with SPLIT exit codes.** Chosen. Below.

## Decision outcome

**Chosen: option 5.** `action-pin-watch` ships as a maintainer-only script with three exit codes and a deliberate asymmetry between them.

**1. The label rule, which codifies practice rather than inventing it.**

| Ref shape | Comment | Rule |
| --- | --- | --- |
| 40-hex **SHA** | **required** | must name the version the ref resolves to (`LABEL_DISAGREES` / `LABEL_MISSING`) |
| **major tag** (`v7`) | not required | if present, must not contradict the ref's major (`LABEL_CONTRADICTS_REF`) |
| full tag or branch | not required | no label contract applies |

Measured before choosing: all 8 SHA pins already carry comments and all 21 tag pins already do not, so this rule describes what the repository already does. **The strict form was chosen over "the label must merely not be false"** on one live instance: `# v3` against a SHA resolving to `v3.0.2` is not false, and it names nothing a reviewer can check, which is exactly how the next bump becomes invisible.

**2. The exit-code split, and it is the reason this is not a copy of `vendor-watch`.**

| Condition | Exit | Blocks a release | Overridable |
| --- | --- | --- | --- |
| a label disagrees, is missing, or contradicts its ref | **1** | **yes** | **never** |
| a lookup could not be performed | **2** | **yes** | yes, for a stated outage |
| a pin is BEHIND its action's current release | **0** | **no**, reported and advisory | n/a |

**Exit 1 outranks exit 2 when both are present**, which is the opposite of `vendor-watch`'s "a refusal is never a pass" ordering, and the difference is deliberate rather than an oversight. That rule is right about a run which proved NOTHING and wrong about a run which proved a DEFECT. A run holding one confirmed bad label and one unrelated timeout has not failed to establish anything: it established a defect, and reporting the weaker, overridable code would let an outage excuse the defect.

A wrong label is **a defect in this repository's own file**, remediable by its owner alone, and shipping it means a reviewer reads something untrue about this repository's supply chain. A behind pin is **a fact about somebody else's release**. Blocking on the second would import a failure mode `vendor-watch` does not have.

**3. The override is the existing `--allow-vendor-unreachable <reason>`, reused deliberately.** A GitHub API outage is the same category as a documentation-host outage: somebody else's downtime, for which a release with no remedy is a trap. It excuses **code 2 only**, so no reason string can wave through a disagreeing label, and `release-ready`'s summary names which gate an override actually applied to, so one flag cannot hide which refusal was excused. A second near-identical flag was considered and rejected as proliferation.

**4. Placement: `scripts/`, not `scripts/checks/`.** That directory is the closed spine registry `registry.mjs` imports by name; this is not a Standard requirement laid on any graded plugin and introduces no `reqId`. It grades this repository's own workflows and nobody else's. Same reasoning as `release-ready.mjs`, and the new file needs an entry in the folder README or `G8` fails.

**5. Write-incapable, and the deterministic half is pure.** The lib imports **nothing at all** - no `node:fs`, no `node:child_process`, no network - so the entire verdict table is testable offline. `node:child_process` is banned outright rather than merely unused, which is why the check calls the GitHub API with `fetch` instead of shelling out to `gh` as the throwaway probe did.

## Consequences

- **`release-ready` grows from four gates to five.** Every one of them can now block a tag, and this is the first that depends on a third-party API being reachable at release time. That is what the code-2 override exists for.
- **One real defect was fixed to make the gate green**: `release.yml:91`'s label corrected from `# v3` to `# v3.0.2`. The SHA was not touched, which is the remediation the report itself insists on.
- **The check does not close half two by itself.** It reports a behind pin without blocking, and it cannot make Dependabot resume proposing a dependency it was told to stop proposing. **Option 2 is therefore adopted as standing guidance in parallel:** prefer merging a Dependabot PR and correcting the comment in a follow-up commit over closing it.
- **Both failure paths are demonstrated, not asserted.** Exit 1 against the real repository on 2026-08-18 (29 pins, 28 ok, 1 label disagreement); exit 2 against a real 404 on a nonexistent action. The second matters because `vendor-watch`'s own refusal branch is still the one half its 2026-08-17 drill never reached.
- **No monthly schedule is added here, deliberately.** The check runs at release time. Putting it on the monthly watcher is real and separate work.
- **A `BEHIND` finding is only as good as somebody reading it.** The split buys safety at the price of a signal that gates nothing, and that is the recognised trade. **The reopening condition:** if a pin is ever found to have sat behind long enough to matter, and the advisory line was printed and ignored on every release in between, that is the evidence for promoting `BEHIND` to blocking, and it should be taken as such rather than argued about again from first principles.
- **Found while implementing, and fixed here because the file was being edited anyway:** `scripts/README.md` and `scripts/lib/README.md` both listed `standards-watch.mjs` with **no description at all**, its text having been appended to the neighbouring `vendor-watch.mjs` entry. `G8` passed both, correctly, because it checks that every child is LISTED and not that it is described. **This is the second and third instance of that exact defect**, after `.github/workflows/README.md` in #238. Tightening `G8` remains out of scope (it moves verdicts for every plugin that has ever passed it, so it is an ADR with a migration window under ADR 0044), but three instances is now the evidence for opening that ADR rather than a hypothetical.

## What review wave 1 corrected, 2026-08-19

Ten findings, five HIGH, all fixed before this ADR was merged. **The decision above is unchanged in its
shape; two of its factual claims were false and one of its rules was inverted.** Recorded in full because a
decision record that hides what its own review caught is worth less than one that does not.

**The two claims that were false when written.**

1. **"No reason string can ever wave through a label that disagrees" was FALSE**, and reachably so. With the
   first draft's ordering (a refusal outranking a label problem), one wrong label plus one unrelated `503`
   collapsed the run to exit 2 - and `release-ready` makes exit 2 overridable. So
   `--allow-vendor-unreachable "GitHub API outage"` marked the gate `overridden` and the release
   `releasable` with a proven bad label in it. **The safety property this ADR is named for did not hold.**
   Fixed by inverting the precedence, with an integration test that drives the real gate table rather than
   the watch alone, because the watch's own unit test passed throughout.

2. **"One real label disagreement" was a FALSE POSITIVE, and it was this repository's own file.** A single
   commit routinely carries more than one tag; measured live, `softprops/action-gh-release` carries
   `v3.0.2` and `v3` on one commit, `v2.6.2` and `v2` on another, and `v1` and `v0.1.15` on a third. The
   check read only the FIRST tag the registry happened to list, so `release.yml`'s `# v3` was reported as
   disagreeing with a ref that resolves to `v3.0.2` - **when `v3` is also a tag on that exact commit and
   the label was correct all along.** The verdict depended on GitHub's response ordering, which nobody
   controls.

   **This is the failure mode this repository grades other tools on**, stated in the v1.14.0 thesis: a
   grading tool's worst failure is not missing a defect, it is reporting one that is not there, because the
   author who trusts it changes correct code. It did exactly that, and the correct code it changed was
   ours. `release.yml`'s label was nevertheless left at the more specific `v3.0.2` - **as hardening, not as
   a fix**: `v3` is a MOVING tag that can migrate off this commit and silently make the label false,
   whereas `v3.0.2` cannot.

   Corrected result: **this repository has zero label defects**, and the failing path is demonstrated
   against the real historical `codeql-action` case instead (`# v4.37.6` on a SHA resolving to `v4.37.7`),
   which is the defect E45 was actually filed from.

**The rest, in one line each.** A `uses:` line inside a `run: |` block scalar was parsed as a pin, producing
a false finding against a structurally correct workflow; a quoted `uses: "owner/repo@ref"` was silently
missed, so a repository whose only wrong label was quoted exited 0; an UPPERCASE 40-hex ref fell through to
the branch where no label contract applies, so a real SHA pin with a wrong label passed; a failed lookup on
a tag ref printed *"is self-describing and current"*, asserting the exact fact it had just failed to
establish; a SHA pin could never be reported `BEHIND` at all, which is precisely where staleness matters
most; an unreadable or mistyped root reported `0 pins, exit 0`, a clean bill of health for a tree nothing
had looked at; and a sha whose tag sat past the page cap was reported as *"the registry does not report
this tag"*, a false statement about the registry.

**And one about the tests themselves, which is the sharpest.** The purity assertion matched only static
`import` statements, so adding `await import("node:os")` would have left it green - a guard for a claim that
could not fail. Twice more, a guard in that same file fired on the PROSE EXPLAINING IT: first a
`child_process` scan matching both modules' own docblocks saying they do not import it, then the repaired
purity scan matching the words `import(` in its own comment. Comments are now stripped before scanning,
which closes the class rather than deleting the sentences. **The full suite reported 1,281 passing and zero
failures while every defect above was live.**

## Implementation sites

- `scripts/lib/action-pin-watch.mjs` - **new**, the deterministic half. Exports `VERDICT`, `parsePins`, `classifyRef`, `versionInComment`, `majorOf`, `evaluatePin`, `buildReport`, `exitCodeFor` and `renderReport`. It imports **nothing**, which a test asserts directly rather than by listing banned APIs. `buildReport` takes a **function** from pin to resolution rather than a by-action map, because currency is a fact about an action while a SHA resolves per ref, and a map cannot express both without the pure module learning how the caller batched its lookups.
- `scripts/action-pin-watch.mjs` - **new**, the CLI, which owns all I/O. `pinSourceFiles` collects the workflow YAML plus `action.yml`. One registry lookup per distinct action, carrying every SHA that action is pinned at, so a three-step CodeQL job costs one call rather than three. Reads `GITHUB_TOKEN` or `GH_TOKEN` when present; an unauthenticated 60-per-hour rate limit surfaces as an error string, becomes `UNRESOLVED`, and exits 2, because **a rate limit is not a verdict**.
- `scripts/lib/release-ready.mjs` - the `action-pins` entry in `GATES`, with `blocksOn: [1, 2]` and `overridableCodes: [2]`. No change to `gateBlocks` or `overrideApplies`; the split is expressed in the watch's own exit codes, so the gate list needed no new concept.
- `.github/workflows/release.yml` - the one real label corrected, SHA untouched.
- `package.json` - the `action-pin-watch` script, and `!scripts/lib/action-pin-watch.mjs` in `files`, because the lib is maintainer-only and `scripts/lib/` ships wholesale. Omitting that negation ships bytes the tarball cannot reach, which is the defect the v1.14.0 withheld window caught and `tests/unit/package-files-reachable.test.mjs` now guards. **That guard caught this one before a human did.**
- `scripts/README.md`, `scripts/lib/README.md` - the new entries, plus the two garbled `standards-watch.mjs` inventory lines repaired.
- `tests/unit/action-pin-watch.test.mjs` - **new**: every verdict demonstrated individually, the write-incapability and purity assertions, and the split proved in four directions - `BEHIND` alone exits 0, a label problem exits 1, a missing label exits 1, and a refusal exits 2 **even when a label also disagrees**. The exit-code split is mutation-proved: making `BEHIND` blocking turns exactly two tests red.

Grep anchor: `exitCodeFor` in `scripts/lib/action-pin-watch.mjs`, and `pinSourceFiles` in `scripts/action-pin-watch.mjs`.
