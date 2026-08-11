# plan_v1.10.1 - the trust patch

A patch release with no new capability and no Standard movement. Its whole job is to make the
repository's own claims true again, and to convert several of them from things somebody has to
remember into things a machine checks.

Spine stays **30 checks**, Standard stays **v0.12**, tier stays **Advanced**. **673 tests, 0 failures.**

> **This document was rebaselined against HEAD on 2026-08-11, and the reason is on-topic.** Its first
> draft was written before the work settled and then never re-read, so by the time the branch was
> ready it described `metadata.chain` as a nested list, ADR 0040 as Proposed, the upstream pin as
> deliberately unmoved, and the review as two rounds. All four were false. Round 4 of the adversarial
> review caught it. That is the **third** instance of the same mechanism inside the release that exists
> to document it: a document describing the plan, the plan moving underneath it, and nothing re-reading
> the document. See [adversarial-review-resolutions.md](adversarial-review-resolutions.md).

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
| `metadata.chain` migrated to a delimited **string** | conformance defect | The reference implementation silently mangles a nested list |
| `S4` reads string, array and legacy shapes, warn-first | conformance + compatibility | Reading a declaration is a tightening; a patch may not tighten |
| Finding-level migration cap in severity resolution | compatibility mechanism | A warn-first guarantee that config can override is not a guarantee |
| `docs/internal/STATUS.md` rewritten | trust surface | 151 lines of accretive log wearing the label "single live source of truth" |
| `docs/internal/RELEASE-HISTORY.md` footer | trust surface | "Where we are now" frozen at 1.9.0; no v1.10.0 entry |
| `docs/internal/execution/EXEC-SUMMARY.md` labels | trust surface | Pre-renumbering release labels |
| Windows argv path normalization + `windows-latest` CI | defect + durable CI | A documented caveat became a fixed defect |
| Component-version drift: 5 instances + a repo-local guard | records vs reality | An ungated field drifted five ways |
| README front-door guard extended to Status version, tier, counts | durable CI | The release checklist promised a check that was half built |
| Validator-parity baseline recorded | evidence | The parity claim had one-off audit evidence and no record |
| standards-watch re-run, **pin moved**, ADR 0040 **Accepted** | freshness | Pin 15 days stale; the run found an editorial delta |
| ADR 0041 (warn-first string-shaped chain declarations), Accepted | compatibility policy | The one behavior change, scheduled rather than unversioned |

## The three that are more than housekeeping

**The chain fix from PR #204 was incomplete, and the incomplete state was worse.** Moving `chain`
under `metadata` cleared the vocabulary rejection. It did not clear the problem: the specification
defines `metadata` values as strings, and `skills-ref` enforces that by **coercion rather than
rejection**, running `str()` over every value. A YAML list survives as a string containing a Python
list repr, and `agentskills validate` reported "Valid skill" for all 24 skills throughout because the
validator never inspects `metadata` contents. A loud failure had become a silent corruption. The
declaration is now a comma-separated string that round-trips unchanged, and `S4` reads all three
shapes.

**Reading a declaration is a tightening, and this is a patch.** Teaching `S4` to see the string form
makes it newly able to fire, so a plugin with a scalar `chain: some-agent` and no contract file would
have gone from passing to erroring on a patch upgrade. ADR 0041 ships string-derived findings
warn-first, graduating at Standard 0.13. Round 2 then found that warn-first did not hold, because
`askit.config.json` per-rule overrides are applied after a check emits severity. That is now closed by
a finding-level migration cap, a ceiling and never a floor, which is the mechanism the next two
scheduled warn-first migrations will reuse.

**standards-watch found something pointed at yesterday's work.** The upstream `metadata` constraint
appeared to tighten. Reading the actual diff showed the added parenthetical already existed verbatim
in the pinned revision's own field subsection, byte-identical, and upstream's own commit is titled
`issue-474-clarify-metadata`. Editorial, so ADR 0040 is **Accepted as re-pin only**, no requirement
changed, and the pin **has moved**. `npm run standards-watch` now reports `VERDICT: unchanged`.

## What is deliberately not here

- **No `S8` change.** Whether the components-mirror check should require version agreement from
  everyone moves third-party verdicts. Filed as E24, ADR-gated.
- **No `U13` change.** The migration cap fixes the new case; `U13` (skill-registration) has the same
  config-escalation exposure and is filed as E26. Lowering a severity is always safe under ADR 0027,
  so that work is scope-bound, not policy-bound.
- **No `clampNotice` fix.** It has never reached the Markdown or HTML renderers, found while fixing the
  same gap for `migrationNotice`. Filed as E28: an untouched code path is the wrong thing to change in
  a release four review rounds deep.
- **No seed-plugin manifest fix.** `templates/seed-plugin` fails `claude plugin validate --strict`
  because the Standard puts native manifests at Silver while the README claims Bronze installability.
  One of those has to move, and that is a Standard question scoped to v1.11.0.
- **No new spine check and no Standard bump.** A patch that moves a third-party tier is not a patch.

## Contents

- [RELEASE-PLAN.md](RELEASE-PLAN.md) - the item-by-item plan with acceptance criteria and verification.
- [validator-parity-baseline.md](validator-parity-baseline.md) - the recorded first-party validator
  results at this tag, and the manual precursor to the automated parity harness targeted at v1.11.0.
- [adversarial-review-resolutions.md](adversarial-review-resolutions.md) - **read this one first.** Four
  rounds, twelve findings. Most were introduced by this release, several were seen by a human and
  waved through, and by round 3 the code was essentially correct while the documentation was still
  wrong in four places.
