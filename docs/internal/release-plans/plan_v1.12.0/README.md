# v1.12.0 "marketplace scope" - what actually shipped

> Written **last, from the code**, per the convention `RELEASE-PLAN.md` in this folder states. That
> file is intent; this file is state. Where they disagree, this one is right and the difference is
> called out rather than smoothed over.

## Verification, run on this branch

| Check | Result |
|---|---|
| `node scripts/check.mjs .` | **Tier: Advanced, 0 errors, 0 warnings** |
| `npm test` | **1004 tests, 1003 pass, 0 fail, 1 skipped**, exit 0 |
| `npm run release-counts` | green |
| `node scripts/check-parity.mjs .` (now **gating**) | exit 0; 1 documented exception (ADR 0043), metadata-parity clean |
| `node scripts/generators/gen-index.mjs .` | byte-identical to the committed `INDEX.md` |
| Existing golden report snapshots | unchanged; only the two new marketplace snapshots are added |
| Site build + route parity | 85 routes built, every baseline route still present, 2 added |

The one skipped test is the platform-conditional argv coverage that skips its opposite-platform half, as
it has every release.

## What shipped, against what was planned

Every workstream in `RELEASE-PLAN.md` shipped. Three things are worth stating precisely because they are
narrower, wider, or different from the plan.

### W1 - the parity flip: shipped as planned, plus a wording correction the plan did not anticipate

`PARITY_MODE` is `"gating"`. The evidence ADR 0042 named as its release condition is discharged and
recorded at the constant itself rather than only in the ADR.

**Not anticipated by the plan:** flipping the constant left the harness *describing* itself wrongly. Its
summary lines were written in the conditional future ("WOULD block once gating starts") and its banner
called gating an "override", which was true only while report-only was the default. Both now read from
the live mode. A gating job that tells every reader of a CI log that enforcement is still pending is a
smaller version of the same defect the harness exists to catch, so it was fixed rather than filed.

### W5 - A6 shipped NARROWER than `STATUS.md` and the divergence plan assigned

Both documents assigned A6 to this release as a **check**. It ships as a **catalogue-level reading**.
The reason is in `RELEASE-PLAN.md` under "A deliberate narrowing" and is unchanged by anything that
happened during implementation: a numbered check is a Standard 0.13 bump under ADR 0027, Standard 0.13
also graduates `U13` and ADR 0041's cap, and that cut belongs to v1.13.0.

Implementation confirmed the constraint is structural rather than a matter of care:
`tests/unit/registry-sync.test.mjs` asserts `CHECKS.length === 30` **and** that `provenanceByReq()`
covers every registered check, so a null-`reqId` module in the registry fails CI by construction. There
was no version of this that quietly worked.

Filed as **E33** (graduate A6 to a numbered plugin-scope check) and **E34** (decide which, if any,
cross-member findings belong on the spine at all - a plugin cannot unilaterally fix a collision with a
sibling it does not know about).

### W6 - the registry page shipped as TWO pages, not one

The roadmap item was "the collection report rendered to the docs site". That splits cleanly into a
durable half and a perishable half, and merging them would have made the durable half rot:

- `docs/reference/marketplace-scope.md` - the rules, the columns, the source kinds, how to run it. No
  measured numbers, so nothing in it goes stale.
- `docs/reference/family-registry.md` - the dated snapshot, with every graded sha and the reproduction
  command, explicitly stamped as a snapshot of local checkouts rather than a live registry.

## The two predicted reds, both confirmed

`RELEASE-PLAN.md` predicted the family marketplace would go red on first run. It does, and the
prediction was one member short of the reason.

```
Collection verdict: RED - graded 6 of 6 member(s).
0 collection error(s), 0 collection warning(s).
Members failing their own declared claim: pm-skills, thinking-framework-skills
```

- **`thinking-framework-skills`** declares `advanced`, earns `convergent`, one error (`G4` index drift
  caused by this toolkit's own v1.10.0 generator fix). Predicted.
- **`pm-skills`** declares no tier and carries 235 errors, so it fails the undeclared default. **Not
  predicted** - the plan named only the first. Both are legitimate reds under the same rule.

The catalogue also has **six** members, not the five ADR 0039's evidence table lists;
`product-lifecycle-templates` joined since that table was written and grades clean at its declared
Advanced. That is the third time in five days that table has moved, which is the argument its own
question 1 makes for unconditional pin columns.

**Zero collection-level errors.** Both reds come from member verdicts, not from the catalogue being
malformed - which is exactly the case ADR 0039's consequences section warned would be misread, so the
report states the source of the red on its own front page.

## The defect this release found in itself, and then did not ship

`gen-index` emits `Self-validating: node scripts/check.mjs` into **every** plugin it generates an index
for, including plugins that consume this toolkit and have no such path. Unlike a wrong instruction in
our own documentation, this one ships inside the consumer's own repository, over their signature.

It was found by running this repository's own published instruction from a consumer's position:
`npm i -D agent-skills-toolkit` into a clean temporary directory outside this checkout, against the
**live registry** (1.11.1), then regenerating a scaffolded plugin's index. The instruction worked; its
output was wrong. Same class as the `G4` remediation failure recorded on 2026-08-10, one layer deeper.

**The one-line fix was written, tested, and reverted in this same cut. That sequence is the finding.**

The argument for shipping it was recorded in the code comment at the time: *"the only plugins whose
output changes are exactly the ones with no `scripts/check.mjs`, and every one of them is already in
`G4` drift from the v1.10.0 generator fix, so one regeneration closes both."* It is a plausible
argument. It is also false, and one command falsified it:

| Member | Before the fix | After the fix |
|---|---|---|
| `product-lifecycle-templates` | Advanced, **0 errors, 0 warnings** | Convergent, **1 error** (`G4`) |

It has no `scripts/check.mjs`, its committed `INDEX.md` carries the old line, and the expected output
moved underneath it. This release's governing invariant is that **no existing verdict moves**, and that
moved one from green to red on a live marketplace member.

Reverted, filed as **E35**, and carried to a release that schedules a migration - the Standard 0.13 cut
already carries `U13`'s graduation and ADR 0041's cap, so it can ship the `### Upgrade` section this
needs, the way v1.10.1 did for the previous `G4` wave. A test now asserts the **current, known-wrong**
behavior on purpose, so it cannot be silently re-fixed without meeting E35 first.

**The generalizable part:** the release plan's own verification protocol says to measure rather than
reason. The reasoning here was careful, written down, and wrong; the measurement took one command. Every
claim about who a generator change affects should be produced by running it against the members, not by
arguing about them.

## Pre-release adversarial review: six findings, four fixed, one filed, one already fixed

Run against the pushed branch before merge. Verdict `needs-attention`. Two of its six findings had
already been found and fixed independently during the cut, which is corroboration rather than
duplication. Recorded per finding, including the two that were not fixed as recommended.

| # | Finding | Disposition |
|---|---|---|
| 1 | Zero-coverage collections report GREEN | **Fixed.** New third verdict `unknown` (exit 1) |
| 2 | Basename discovery shadows valid candidates and accepts wrong ones | **Fixed.** Candidates exhausted; explicit-vs-guessed split; git-remote identity check |
| 3 | Marketplace routing changes existing plugin verdicts | **Already fixed** during the cut (the `pm-skills` guard) |
| 4 | Malformed and mixed manifests are owned by nobody | **Filed as E36.** Fixing it moves verdicts and needs a prior decision |
| 5 | A parity exception suppresses every failure for its target | **Fixed.** Exceptions now fingerprint their authorized diagnostic |
| 6 | The index conditional moves existing Gold verdicts | **Already fixed** during the cut (reverted, filed as E35) |

**Finding 5 was the most valuable, because the flip I had just shipped depended on it.** `findException`
matched on target and tool only, so ANY failure of `templates/seed-plugin` under `claude plugin validate
--strict` was annotated as the known missing-author exception and excluded from gating. Report-only made
that survivable; gating did not. An unrelated schema regression would have exited 0 on a required check.
Exceptions now carry a `matches` RegExp fingerprinting the one diagnostic they authorize, an entry
without one can never apply and is reported as broken (fail closed), and the shipped list is asserted
well-formed.

**Finding 1 needed care not to overturn a ratified decision.** ADR 0039 settled that an absent member
does not red the collection. The reviewer's scenario was different in kind: a catalogue where *no*
member resolves reported GREEN at coverage 0 of N. The fix does not touch the ratified rule - a
partially covered run still passes on what it saw - it adds a third state for the case the ADR's
reasoning does not reach, on the ground that a verdict computed over an empty set is not a verdict. RED
outranks UNKNOWN, because a collection error is evidence.

**Finding 2's fix is an asymmetry worth naming.** A location the catalogue or the operator *named* is a
claim, and its failure is a catalogue defect. A location this code *guessed* from a repository basename
is a hypothesis, and a failed hypothesis is absence, not evidence of a defect. The original single rule
was wrong in both directions at once.

**Finding 4 was not fixed, and the reason is the release's own invariant.** Both halves change which
scope claims a directory, which changes what an existing target is graded by. The mixed-manifest half
also needs a decision nobody has made: whether a catalogue mixing skill entries and plugin entries is
legal at all. E36 carries it with that question first.

## Records brought current

- `docs/internal/RELEASE-HISTORY.md` was **two releases stale**: v1.11.0 and v1.11.1 shipped with no
  entry, so the narrative record stopped at v1.10.1 while the repository was at v1.11.1. Both are
  backfilled here, and the "Where we are now" line now names the drift it is itself prone to.
- `docs/internal/RELEASE.md` gained the **npm publish step**, missing since v1.11.0 made the package
  real, along with the two constraints that are not negotiable (2FA on the account, no `--provenance`
  from a laptop).
- `docs/internal/execution/relocation-addendum.md` carries a delta row per new file, with the four
  check-spine imports the marketplace module makes and the two repoints that would land on the
  askit-retained side if the runner relocates.

## Deliberately not done

- **Remote fetch-at-sha.** Deferred by ADR 0039; the pin columns disclose the limit rather than closing it.
- **Any spine movement.** 30 checks, Standard 0.12, no existing verdict moves.
- **Any edit to a family member repository.** The `thinking-framework-skills` findings report in this
  folder is a deliverable to its maintainer; that working tree was verified untouched after measurement.
