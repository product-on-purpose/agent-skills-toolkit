# 0057 - Unshipped work carries a name, never a version number

## TL;DR

- **Decision: unshipped work is identified by a phase NAME and its workstream or backlog IDs, never by a version number.** A version number is assigned at cut time by the release process, and before tagging it appears in exactly one place: the release packet being cut.
- **This is a rule the repository had already reached twice, case by case, without writing down.** The graded cohort was left unversioned on 2026-08-22; the onboarding-funnel packet was left unversioned on 2026-08-28 and renamed `plan_onboarding-funnel/`. Converging on the same answer twice and still having to re-derive it a third time is what makes it a policy rather than a preference.
- **Three consecutive falsifications, all git-dated.** The original `v1.13.0` label landed on what became `v1.14.0`'s contents; the 2026-08-18 annotation had to re-slot `v1.16.0`; and `STATUS.md`'s cohort sequencing assigned `v1.17.0` to work that did not ship under it. In the last case one number had been promised to three different bodies of work and only the third took it.
- **The cost is not tidiness, it is a false record.** A forward version number reads as a commitment that the release process never made. Every reader who acts on it - a roadmap reader, a future audit, the maintainer six weeks later - is acting on a fact the repository invented about its own future.
- **What this does NOT forbid.** Naming a version that has SHIPPED, obviously; stating a semver CLASS for planned work (patch, minor, major), which is a property of the change rather than a claim about sequence; and a packet folder taking its `plan_vX.Y.Z/` name once cutting begins, which is the moment the number becomes real.
- **Enforcement is a convention plus review, not a check, for now.** A mechanical guard was considered and deferred: the obvious grep fires on retrospective prose explaining why a number was NOT assigned, which is the policy being obeyed. A guard that reds on compliance teaches people to scrub correct history or to wave the guard off. Revisit if the convention is breached again.
- **Status:** **Accepted (2026-09-01).** Adopted from the 2026-08-28 audit's standing recommendation, ratified with the resolution plan on 2026-08-31.

- **Date:** 2026-09-01
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on

- **[ADR 0053 (a pin label is a claim, and behind is not a defect)](0053-a-pin-label-is-a-claim-and-behind-is-not-a-defect.md)** - the same underlying idea one layer down. A label that states a fact is making a claim, and a claim that nothing verifies drifts. A forward version number is a label of exactly that kind, with the release process as the thing that would have to verify it and cannot, because the release has not happened.
- **[ADR 0022 (release readiness and doc discipline)](0022-release-readiness-and-doc-discipline.md)** - establishes that release facts are gated rather than remembered. This extends the same posture backwards in time: a number that is not yet a fact does not get written as one.

## Context and problem statement

The project plans in phases and ships in tags, and for most of its life it wrote the tag number onto the phase while the phase was still being planned. That is a natural thing to do and it was wrong every time it was tested.

Three instances, in order:

1. **`v1.13.0` to `v1.14.0`.** Work scoped and labelled as `v1.13.0` shipped under `v1.14.0` after the sequence changed. The label had to be rewritten wherever it had been copied.
2. **The 2026-08-18 annotation's `v1.16.0` re-slot.** A planned `v1.16.0` body of work was displaced; the number went to different contents.
3. **`v1.17.0`, promised three times.** `STATUS.md`'s cohort sequencing, the onboarding-funnel packet, and the release that actually shipped all carried the number at some point. Only the third kept it, and the funnel packet had to be renamed to `plan_onboarding-funnel/` on 2026-08-28 to stop asserting a number it had lost.

The pattern is not that the maintainer sequences badly. It is that **sequence is genuinely unknown until the moment of cutting**, because releases are shaped by what is ready, what a decision unblocked, and what a defect forced forward. Writing the number early converts an unknown into a written fact, and the written fact is the thing that later has to be hunted down and corrected across however many surfaces copied it.

The 2026-08-28 audit found this a third consecutive time and recommended it as standing policy, noting that the repository had itself ruled this way twice without generalising.

## Decision

Unshipped work carries:

- a **phase or workstream NAME** (`the records patch`, `reach, second act`, `the graded cohort`);
- its **backlog or workstream IDs** (`E16`, `RS-A2`), which are stable and do not move with sequence;
- optionally a **semver class** (patch, minor, major), which describes the change rather than its position in a queue.

It does not carry a version number. The number is assigned at cut time, by the release process, and lands first in the release packet being cut.

## The compliance run, dated and classified

The acceptance criterion for this ADR is not "the grep returns nothing" - that criterion was tried and
rejected, because the obvious grep fires on prose that EXPLAINS a number was deliberately not assigned,
which is the policy being obeyed. The criterion is: run the grep, classify every hit, and record the
classification here.

**Run 2026-09-01**, verbatim:

```bash
grep -nE "v1\.1[89]|v1\.2[0-9]" docs/internal/STATUS.md docs/internal/backlog/enhancements.md
```

**One hit, zero assignments.**

| Hit | Text | Classification |
|---|---|---|
| `docs/internal/STATUS.md:604` | "Left unversioned deliberately rather than pushed to v1.18.0: assigning a line..." | **Prose ABOUT an assignment that was declined.** The policy being obeyed and explained, not breached. No action. |
| `docs/internal/backlog/enhancements.md` | no hits | - |

The tree complies. This table is the record the criterion asks for, and the next run appends to it rather
than re-deriving the classification.

## Implementation sites

- **[`../RELEASE.md`](../RELEASE.md)** - the process statement, in "How releases work here": the number is assigned at cut time.
- **[`../STATUS.md`](../STATUS.md)** - the "Where this is going" section header states the convention, so roadmap lines written later inherit it.
- **[`../release-plans/README.md`](../release-plans/README.md)** - the packet-naming convention: a packet folder is named `plan_vX.Y.Z/` only once cutting begins, with `plan_onboarding-funnel/` as the worked precedent for a packet that has a name and no number.
- **This ADR** - cited by the audit-intake index at [`../audit-intake.md`](../audit-intake.md) as the disposition of the 2026-08-28 generation's standing recommendation on forward numbering.
