# v1.15.0 - what actually shipped

> Written **last, from the code**, after every gate passed. [`RELEASE-PLAN.md`](RELEASE-PLAN.md) states
> what this release set out to do and is not edited into a status report. This file is the state.

## Final numbers

| | Baseline (`v1.14.0`) | Prepared (`v1.15.0`) |
| --- | --- | --- |
| Standard | 0.14 | **0.15** |
| Spine | 34 checks | 34 checks |
| Skills | 24 | **26** |
| Evaluation scopes | 3 | 3 |
| Release-blocking gates | 4 | **5** |
| Declared tier | Advanced (Gold) | Advanced (Gold), self-validated 0 errors / 0 warnings **at its own new 0.15 pin** |
| Suite | 1252 | **1292**, 0 failures |

Six PRs on `main` since `v1.14.0`, three of them landing after this packet was written (see the scope note above): **#242** (the graduations), **#243** (`action-pin-watch`
plus the wave-1 fixes), and this packet's own records PR. Two records PRs preceded them: **#239** and
**#241**.

## The scope grew while the tag was withheld, and this section says so

This packet was written for two graduations and one new gate. The tag was then held for sign-off, and two
further bodies of work merged to `main` before it was cut: the documentation-hygiene fixes, and the
three-skill capability family (`askit-capability-whats-new`, `askit-capability-gap-analysis`, plus
[ADR 0054](../../decisions/0054-a-component-records-what-agent-version-it-was-checked-against.md)).

**Both are folded into this release rather than deferred**, following the v1.14.0 precedent where the
withheld window's own findings shipped in that release instead of a follow-up patch. The decisive reason
against deferring was ordering rather than preference: the next release relocates `vendor-claims.json`,
which `release-ready` reads as one of its five gates, and rebuilding the machine that certifies releases
underneath a release already certified and waiting is the wrong sequence.

[`RELEASE-PLAN.md`](RELEASE-PLAN.md) keeps its original, narrower statement of intent and carries a dated
note. **It is not rewritten to look as though this was always the plan.**

## The two graduations, and why each closed

**Neither required a code change.** `until: "0.15"` was already committed in both check modules and the
ADR 0044 post-resolution ceiling resolves it against the consumer's own pin. That was ADR 0052's explicit
promise - *"it fires when a consumer reaches 0.15 with nobody editing anything; the only human obligation
is the 0.15 version note"* - and this release is that obligation discharged.

| Graduation | ADR | Why it closed on schedule |
| --- | --- | --- |
| the workflow half of the components mirror (`S3`, sec 3.4) | [0047](../../decisions/0047-workflows-are-a-loaded-component.md) | **its subject already did the work** (below) |
| `U17` `catalogue-manifest-shape` (sec 12) | [0052](../../decisions/0052-a-catalogue-manifest-no-scope-can-read-is-a-defect.md) | census unchanged; extending would have been "never gates", decided quietly |

### The best evidence in this release is that a window worked

ADR 0047 created the workflow-mirror window for one measured reason: graduating it unwindowed cost
`thinking-framework-skills` a tier, on nine workflows it shipped and did not declare.

| | At the registry's graded sha (`dbe71d8`) | At its HEAD (`60aa2a0`) |
| --- | --- | --- |
| `_workflows/*.md` on disk | 9 | 9 |
| `components.workflows` declared | **absent** | **9, names matching disk exactly** |
| `S3` workflow-mirror findings | 9 | **0** |

The commit is **`fd343dd`, 2026-08-15**: *"feat(workflows): declare the nine recipes, and gate the mirror
locally"* - **one day after ADR 0047 was ratified, inside the window that ADR created.** A warning was
raised, understood and discharged before its deadline. That is the entire designed behaviour of a
warn-first migration under sec 7.7, observed end to end for the first time in this repository.

ADR 0047's forward-looking cost statement is therefore **falsified** and carries a dated correction.
`STATUS.md`'s v1.14.0 ADR-pack row is deliberately **not** touched: it is a correctly-dated historical
measurement of what was true on 2026-08-14.

### `U17` graduated against a census that argued the other way

ADR 0052 did not book this graduation, it **reserved the decision**: *"gating a check nothing has ever
tripped is worth re-examining rather than doing by default."* The census was re-run and is **unchanged in
every cell**: 7 manifests `U17` inspects, 6 of-plugins, 1 of-skills, **0 mixed, 0 malformed, 0 unroutable**.

It graduates anyway, and ADR 0052's dated addendum argues it rather than defaulting: nothing in any plan
schedules corpus growth, so the census reads the same at 0.16 and the same evidence defeats graduation
again, and again. **"Extend the window" is not a deferral with a terminating condition; it is deciding
`U17` never gates, without saying so.**

## What this release added that is not a check

**`npm run action-pin-watch`** ([ADR 0053](../../decisions/0053-a-pin-label-is-a-claim-and-behind-is-not-a-defect.md)),
the fifth gate inside `release-ready`. It resolves every `uses:` pin across the workflows and `action.yml`
against the GitHub registry and reports where a pin's human-readable LABEL disagrees with what its
machine-readable REF resolves to. Write-incapable by construction; the deterministic half **imports nothing
at all**, so its entire verdict table is testable offline.

**The exit codes split, and that is the decision:**

| Condition | Exit | Blocks | Overridable |
| --- | --- | --- | --- |
| label disagrees, missing, or contradicts its ref | **1** | yes | **never** |
| lookup could not be performed | **2** | yes | for a stated outage |
| pin merely **BEHIND** its action's current release | **0** | no | n/a |

It introduces **no spine number and no finding on any graded plugin.** It grades this repository's own
workflows and nobody else's.

## Review wave 1: ten findings, five HIGH, all fixed before merge

**Two of them falsified claims ADR 0053 made about itself**, and both are recorded in that ADR rather than
quietly corrected.

1. **The safety property the check is named for did not hold.** With a refusal outranking a label problem,
   one wrong label plus one unrelated `503` collapsed the run to the *overridable* exit code, so
   `--allow-vendor-unreachable` marked a release **releasable with a proven bad label in it**. Fixed by
   inverting the precedence: a known defect outranks uncertainty. The watch's own unit test passed
   throughout; only an integration test through the real gate table catches it.

2. **The one defect the check reported was a FALSE POSITIVE, against this repository's own file.** One
   commit routinely carries several tags - `softprops/action-gh-release` carries `v3.0.2` **and** `v3` on
   the same commit - and the check read only whichever the registry happened to list first, so a correct
   label was reported as a release blocker on response ordering nobody controls.

   **That is the failure mode this repository grades other tools on**, in the v1.14.0 thesis' own words:
   the worst failure is not missing a defect, it is reporting one that is not there, because the author who
   trusts it changes correct code. It did exactly that, and the correct code it changed was ours.

   Corrected: **this repository has zero label defects.** The failing path is demonstrated against the real
   historical `codeql-action` case instead (`# v4.37.6` on a SHA resolving to `v4.37.7`), which is the
   defect `E45` was actually filed from.

**The other eight, one line each:** a `uses:` inside a `run: |` block scalar parsed as a pin; a quoted
`uses:` value silently missed; an UPPERCASE 40-hex ref bypassing the label contract entirely; a failed tag
lookup printing *"is self-describing and current"*; a SHA pin that could never be reported `BEHIND`; an
unreadable root reporting `0 pins, exit 0`; a sha past the page cap reported as *"the registry does not
report this tag"*; and stale four-gate text in four places.

**And one about the tests, which is the sharpest.** The purity assertion matched only static imports, so
`await import("node:os")` would have left it green. Twice more, a guard in that same file fired on the
**prose explaining it**. Comments are now stripped before scanning, which closes the class rather than
deleting the sentences. **The suite reported 1,281 passing and zero failures while every defect above was
live.**

## Deferred deliberately, and said out loud rather than left absent

**The two new skills ship without trigger eval sets.** `STANDARD.md` sec 8.3 makes a >= 20-case
`{query, should_trigger}` set a **SHOULD** at Universal, not a MUST, so their absence is conformant and
the gate is green - but silence would read as an oversight rather than a decision.

The reason to defer: a trigger eval measures whether a description fires when it should, and these two
descriptions are brand new with no observed mis-triggering to calibrate against. Writing 40 cases against
a guess produces a set that passes by construction and proves nothing. **The trigger condition is the
first observed mis-trigger, or the first time either skill is invoked for the other one's job** - which is
a real risk, since they are adjacent by design.

## Verification recorded at cut time

- `node scripts/release-ready.mjs` exits **0** on all **five** gates: conformance, readme-drift,
  release-counts, vendor-watch, action-pins.
- Conformance gate: **Advanced, 0 errors, 0 warnings**, at the repository's own **new 0.15 pin**.
- Suite: **1314 tests, 0 failures**, 1 skipped. **This read 1292 at cut time**; the twenty-two added are the `F1` to `F8`
  regression tests from the post-cut review, which is the only reason this line moved after the cut.
- **Criterion 1**, no family verdict moves: all six members at their own pins produce **zero**
  `S3`-workflow and **zero** `U17` findings, before and after.
- **Criterion 2**, severity across pins **0.14 / 0.15 / 0.16**: `warn` at 0.14 (unchanged, which is what
  proves the graduation did not reach backwards), `error` at 0.15 and 0.16, and `error` immediately for a
  plugin with no pin at all.
- **Criterion 4**, the new gate demonstrated **failing**: exit 1 against live registry data.
- **Criterion 5**, demonstrated **refusing**: exit 2 against a real 404.
- The seed plugin's own grade measured **unmoved** across the pin bump: 0E/1W, identical finding set.

## NOT discharged, and it must not be quoted as if it were

**Adversarial review wave 2 did not run.** The Codex runtime returned a usage-limit error before the
reviewer started; the run produced no output at all. Per the standing rule that **a killed run is
UNMEASURED and never a result**, [`RELEASE-PLAN.md`](RELEASE-PLAN.md) **acceptance criterion 6 is open**,
and no wave-2 finding count exists to quote.

A stopgap self-review covered wave 2's target areas - the release's own records, the drift machinery,
forward-in-time date bombs, and the consumer re-pin path - and found no defect. **A self-review is not an
independent wave.** It does not discharge the criterion, and the criterion exists precisely because
v1.12.0 merged on one round and round 2 then found four findings, three HIGH, all inside round 1's own fix
code.

## Withheld at cut time

The tag, the GitHub release, the npm publish and the registry re-pin are **all withheld pending maintainer
sign-off**, by prior agreement. That repeats the v1.14.0 pattern deliberately: its withheld window is where
two defects were found that neither adversarial review wave could have caught - a tarball shipping 16.5 kB
of unreachable code, and a release gate that would have jammed on a future date.

## Live operational horizon

**2026-09-05** and **2026-09-11**: the two PROBE claims age past the freshness window and block every
release until a human re-runs their reproductions. Unchanged by this release. Headroom at cut time was 17
and 23 days.
