---
title: "v1.16.0 - what is implemented, and what the release still owes"
---

# v1.16.0 - the packet

> **This packet is titled differently from its predecessors on purpose.** The convention is *"what actually shipped"*, written last, from the code. **v1.16.0 has not shipped.** All four version manifests still read `1.15.0`, no tag exists, and nothing has been published. Titling this "what actually shipped" would put a false statement on line one of a packet whose release spent two review waves hunting exactly that.
>
> So it records **what is implemented and verified**, and states plainly what remains. It will be rewritten as the shipped record at cut time, when the numbers below are re-measured.

**Written 2026-08-22 at `c9aafdb`.** Fifteen commits since `v1.15.0`; **50 files changed, 2150 insertions, 73 deletions.**

## Numbers, measured at `c9aafdb` and not inherited

| | |
| --- | --- |
| Version manifests | **`1.16.0`** across all four, bumped 2026-08-22. **Still not cut**: no tag, nothing published, registry still pins 1.15.0 |
| Standard | **0.15**, unchanged. No Standard revision in this release |
| Spine | **34**, unchanged. **No check added, none removed** |
| Skills | **26**, unchanged |
| Suite | **1376 tests, 0 failures**, 1 skipped. It read **1359** at the `v1.15.0` tag; the seventeen added are the capability-matrix drift guard: eleven at W4, three when adversarial wave 1 found gaps in it, and three when a direct probe of the review's own fixes found three more |
| Gate on this repository | **Advanced, 0 errors, 0 warnings** |
| `foundation/` | **14 tracked files** across three layers plus `surveys.md` |

**No plugin's verdict moves.** All six registry members were graded before W2 and again after W2, W3, W4 and the review waves: **byte-identical every time.** That is acceptance criterion 1, measured rather than argued.

## What this release is for

**The tier ladder is defined in terms of vendor capability.** `STANDARD.md` sec 2.2 defines Convergent as *"concepts both CC and CX support, but in different formats"*; sec 2.3 defines Advanced as *"deep, lifecycle, and often agent-specific"*. Both are claims about software this project does not control.

So the tier boundaries are a **synthesis of vendor capability** - and before this release that synthesis lived inside one skill's `references/` folder, guarded by nothing, with no artifact recording which vendor fact any boundary actually rested on.

## The four workstreams

### W1 - the ADR, ratified

[ADR 0055](../../decisions/0055-the-evidence-gets-an-address-and-gate-readership-is-recorded-not-inferred.md) fixes the layout, the per-source record format with `method` as a first-class field, `tier-basis.md`'s contract, and what is deliberately **not** promoted.

**ADR-first paid immediately.** The W1 spec defined `claims/` membership by readership, on the stated basis that all three files are read by path from release-blocking code. **Measurement falsified the premise before any file moved:** `surveyed-pin.json` has **no gate reader at all**. Membership is now defined by machine-checkable **format**, with each file's gate readers **named** in `claims/README.md` and `none` a legal value.

### W2 - the migration, six commits with the gate green at each

Six artifacts moved. **Three traps it found, all generalisable:**

1. **A path assembled from `path.join` segments is invisible to a path-string grep.** `scripts/check-parity.mjs:529` was a third gate reader the ADR's own "complete list" missed.
2. **And it would have failed silently** - `check-parity.mjs` falls back to *"pin-skew comparison skipped"* and **exits 0**. The move is proved by what the tool **prints**, never by its exit code.
3. **A moving file's own outbound links break**, relative to where it used to be. One broke twice: fixed at the old depth in step 1, wrong again after step 4 moved the file.

**The monthly `vendor-watch` workflow was proved by dispatch, twice** (runs `32544911914` and `32544939627`), because it is cron-and-dispatch only and **no pull-request check ever executes it.**

### W3 - `tier-basis.md`, and what it found

The artifact that did not exist: one row per tier boundary, naming the vendor fact it depends on and whether that fact is pinned.

**The finding was not the one the plan predicted.** All eight pinned claims source from **Claude Code** pages. **There is no pinned claim for any Codex fact, and none for any Cowork fact** - so the Convergent tier, whose definition is a statement about *both* agents, has pinned evidence for one of them.

**9 pinned boundaries, 11 not pinned, 3 house conventions.** Filed as findings rather than fixed, per the plan: `E48` (the Codex hook subset, pinned nowhere while the Advanced tier *requires* hooks), `E49` (the Codex subagent absence, already quotable and never landed), `E50` (`U6` and `U11` accommodating undocumented Cowork behaviour).

`askit-capability-gap-analysis` gained its fourth gate question: **does this touch a component type any tier requires?**

### W4 - one guard, and it is a test rather than a check

`tests/unit/capability-matrix-drift.test.mjs`. **Deliberately not in `scripts/checks/`**: it grades this repository's own evidence, carries no `reqId`, and is not part of the shipped gate.

**Its own first false positive was caught before it shipped.** The section boundary matched `A <Tier>-tier plugin MUST`; sec 2.3 reads **"An Advanced-tier plugin MUST"**, so the extractor swallowed four requirement bullets as component types. Pinned by a regression test.

**Anti-vacuity floors, because every assertion is a subset test** and a subset test over an empty set passes. Wave 1 then found the floors themselves were never exercised - setting them to zero left every test green - so they are now asserted by a negative test.

## Review waves - fifteen findings across two waves and self-review

Full ledger: [`review-findings.md`](review-findings.md). Acceptance criterion 7 asked for two waves, **the second pointed away from the first.**

| Source | Findings | Shape |
| --- | --- | --- |
| Self-review | **3** | a wrong tally, one broken link, a record breaking its own folder's rule |
| **Wave 1** - mechanical breakage | **7** | 1 HIGH, 3 MEDIUM, 3 LOW |
| **Wave 2** - false statements in the records | **7** | 3 HIGH, 3 MEDIUM, 1 LOW |

**The overlap between the two waves is zero.** Not one finding appears in both lists, which is the evidence that pointing them at different failure classes worked rather than buying the same review twice.

**Three of wave 2's findings are defects in wave 1's fixes or in the self-review that preceded them**, including one where **the correction to a finding was itself wrong**. That is the repository's standing lesson restated: the code written in *response* to a review is unreviewed.

**Two findings are worth carrying out of this release as rules:**

- **`G8` was made to grade other people's plugins on this repository's private layout**, and the evidence offered for its safety was a measurement that did not support it. Six family members were graded before and after and nothing moved - true, and uninformative, since none of them *has* a `foundation/` folder. **A narrower question was answered than the one the claim rested on, and the word "measured" made it read as settled.** Reverted.
- **Every probe blocking date in the repository was one day early.** The gate marks stale on `age > 30`, so blocking begins at `verifiedOn` **+ 31**. The original date was wrong and this session **propagated** it by computing a new one the same way. **Compute a threshold date by running the gate with `--today`, never by adding 30 in your head.**

## Deferred deliberately, with the reason

- **`E51` - `G8` silently passes a README it cannot read.** Real, and **pre-existing**: identical code at `v1.15.0`, last touched 2026-06-03. Turning a silent pass into a finding **moves verdicts**, and this release's plan states `no new spine check` and `no verdict movement for any plugin`. It needs an ADR and a warn-first window, which is the migration this repository tells other people not to skip.
- **`E48`, `E49`, `E50`** - the three unevidenced tier boundaries `tier-basis.md` exposed. A boundary resting on nothing is a **finding to file**; moving a tier is its own ADR with a migration window.
- **The probe reproductions did not move into `foundation/`.** ADR 0055 ratified a layout without them, and a migration does not get to extend the layout it is executing. Whether they belong in `sources/` is a real question under D2, filed rather than decided.

## Verification recorded at 2026-08-22

What was actually run, and what it returned.

- `node scripts/check.mjs .` - **Advanced, 0 errors, 0 warnings**
- `npm test` - **1373 tests, 1372 pass, 0 fail, 1 skipped**
- `npm run release-ready` - **all five gates exit 0**: conformance, readme-drift, release-counts, vendor-watch, action-pins
- **All six registry members graded, byte-identical to the pre-W2 baseline**
- `vendor-watch` with `--today` at each probe boundary: **2026-09-18 → 0 stale, 2026-09-19 → 1, 2026-09-20 → 2**
- **Every relative link in all 578 tracked markdown files resolved at `v1.15.0` and again at `HEAD`**: 47 broken before, 47 after, **difference zero**
- Both new guards **shown failing** and then passing on restore, because a guard that cannot be shown failing is not a guard
- The monthly `vendor-watch` workflow **dispatched twice**, both green

## NOT discharged, and it must not be quoted as if it were

**The release is not cut.** Every item below is open.

1. **No version bump.** All four manifests read `1.15.0`. `CHANGELOG.md` and `RELEASE-NOTES.md` carry no v1.16.0 entry.
2. **No tag, no GitHub release, no npm publish, no registry re-pin.**
3. **These numbers are pre-cut.** Per the packet convention volatile counts are written **last**, after the final suite run at the tagged commit. The suite will move again if anything else lands.
4. **The review waves covered the implementation, not the release.** Nothing here reviews a tag, a tarball, or a published artifact. The v1.15.0 record is explicit that a chain must be smoke-verified **from published state only** - a leftover clone once reported `v1.5.1` and was nearly re-pinned from.
5. **`E51` is open in the spine.** A `G8` silent pass ships in this release because fixing it needs an ADR.

## Live operational horizon

**2026-09-19** and **2026-09-20**: the two `probe` claims age past the 30-day window and **block every release** until a human re-runs their reproductions.

| Probe | Verified | Blocks from |
| --- | --- | --- |
| `agents-dir-registers-every-md` | 2026-08-19 | **2026-09-19** |
| `components-share-one-namespace` | 2026-08-20 | **2026-09-20** |

**Both dates were one day earlier in every record until 2026-08-22**; see `W2-1`. Reproductions ship at [`../../vendor-watch/probes/`](../../vendor-watch/probes/), and the tested instrument is now headless `claude -p --output-format stream-json --verbose`, which records the actual tool calls so "the skill was invoked" is a receipt rather than a claim.

**A quote claim never blocks while it holds.** Only a probe's age does, deliberately: a probe's age **is** its verification.
