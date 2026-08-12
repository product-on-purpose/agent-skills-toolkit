# v1.12.0 "marketplace scope" - what actually shipped

> Written **last, from the code**, per the convention `RELEASE-PLAN.md` in this folder states. That
> file is intent; this file is state. Where they disagree, this one is right and the difference is
> called out rather than smoothed over.

## Verification, run on this branch

| Check | Result |
|---|---|
| `node scripts/check.mjs .` | **Tier: Advanced, 0 errors, 0 warnings** |
| `npm test` | **993 tests, 992 pass, 0 fail, 1 skipped**, exit 0 |
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

## The defect this release found in itself

`gen-index` emitted `Self-validating: node scripts/check.mjs` into **every** plugin it generates an
index for, including plugins that consume this toolkit and have no such path. The line ships inside the
consumer's own repository, over their signature.

It was found by running this repository's own published instruction from a consumer's position:
`npm i -D agent-skills-toolkit` into a clean temporary directory outside this checkout, against the
**live registry** (1.11.1), then regenerating a scaffolded plugin's index. The instruction worked; its
output was wrong.

Same class as the `G4` remediation failure recorded on 2026-08-10, one layer deeper. Fixed, with the
condition stated at exactly its real strength: it tests whether the target *has* a `scripts/check.mjs`,
not whether that file is this toolkit's gate, so a plugin with its own differently-purposed check script
keeps the original line. This repository's own `INDEX.md` is byte-identical under the change.

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
