---
title: "Roadmap - what is open, what it depends on, and what done means"
description: "The tracked PLAN counterpart to STATUS.md's STATE: every open item with its acceptance criteria verbatim, every deferral with a reopening condition, every decline with a reason"
status: live
last-updated: "2026-10-25"
---

# Roadmap

The PLAN counterpart to [`STATUS.md`](STATUS.md), which is the STATE. STATUS says where the tree is;
this page says what is open, what each open thing depends on, and what "done" means for it.

## The test this page has to pass

> **Someone who has never opened `_local/` can pick up any open item and know what "done" means.**

Until 2026-09-17, the work was steered by two documents that live only on one machine: the 2026-08-28
audit's resolution plan (the six-cut sequence and its 25 `RS-xx` items) and the 2026-09-04 audit's
fifteen-item roadmap. Every `RS-xx` in a commit message pointed at a file the repository could not
read. If that machine died, the repository would not know what it was building. This page is the fix.

## How to read it

**Four rules, and they are why the page looks the way it does.**

1. **Open acceptance criteria are quoted VERBATIM, never summarised.** They appear in blockquotes and
   are marked as quotes. A summary would have dropped the conditional in `RS-C3` that caused
   [E49 (the Codex subagent absence is quotable)](backlog/enhancements.md) to be correctly REFUSED
   rather than landed, and a bad claim would have shipped.
2. **Reference IDs carry a handle everywhere except inside a quote.** The handle is in the heading;
   inside a quoted criterion the original text stands unedited, bare ids and all. Where a criterion
   has since become impossible or was satisfied, a **dated annotation** sits *under* the quote. The
   criterion itself is never edited.
3. **Status and sequence only.** Reasoning lives in ADRs, which are immutable by convention and cannot
   drift. A tracked plan that goes stale is worse than an untracked one; this project has already been
   bitten once, by a hand-run registry page that drifted twenty days carrying two wrong facts.
4. **A decline is a result and is recorded like any other**, and **a deferral with no trigger is a
   permanent no wearing a deferral's clothes.** Every deferral below names a reopening condition.

## What the two source documents are now

**SUPERSEDED as PLANNING documents. Still depended on as EVIDENCE. Nothing is deleted.**

| Source | Superseded as | Still good for |
|---|---|---|
| `_local/audit/2026-08-28_fable/08-resolution-plan.md` and its `specs/` | planning - this page carries every open item and every cut | the ratification record, the thirteen-agent amendment pass, and the full text of the seventeen discharged `RS-xx` items |
| `_local/audit/2026-09-04_fable-5-1-max/` | planning - this page carries the triage of its roadmap and its five rejections | the 46-item adversarial corpus, the `01-potemkin-gold` and `09-pin-abuse` fixtures, `findings.jsonl`, and the eight proposal ADRs |

**The split is honest rather than tidy, and it is the one real caveat.** The plan can carry every
DECISION. It cannot carry the CORPUS, and two of the most serious findings - the placeholder plugin
that earns Gold, and the pin with no floor - are only demonstrable with fixtures that are still
gitignored. See [Evidence still to extract](#6-evidence-still-to-extract). Both folders are gitignored
working material and are deliberately not hyperlinked, because a tracked page must not depend on
untracked files; the path is the address.

Every item either audit raised, and what became of it, is in
[`audit-intake.md`](audit-intake.md) - the cross-audit ledger. That page is the INTAKE; this page is
the PLAN. Seventeen of the 2026-08-28 generation's 25 items are discharged and recorded there. The
eight below are the ones still carrying live acceptance criteria.

---

# 1. The eight open items

## RS-B1 (the multi-entry credit gap): rule on E16, then let E17, E20, E15 follow

- **Status: RULED 2026-08-31, implementation OPEN.** Verified 2026-09-17: the four backlog entries
  [E16 (advisory-score credits nothing on a multi-entry engagement)](backlog/enhancements.md),
  E17 (the harness cannot consume an adjudication), E20 (the scoring key is readable from inside the
  fixture tree) and E15 (three eval-run runner defects) all still read `Status: OPEN`.
  **Annotated 2026-10-25:** criterion 1 is met by
  [ADR 0065 (a multi-entry finding earns credit only where its own correct clause verifies)](decisions/0065-a-multi-entry-finding-earns-credit-only-where-its-own-correct-clause-verifies.md),
  merged in [PR #378](https://github.com/product-on-purpose/agent-skills-toolkit/pull/378). Criteria 2
  to 5 (the scorer change, its regression tests, and the publication-gate grep) are still OPEN.
  **Annotated 2026-10-25, later the same day: criteria 2, 3 and 4 are MET; criterion 5 is NOT met.**
  [PR #383](https://github.com/product-on-purpose/agent-skills-toolkit/pull/383) implements rule (a')
  in `scripts/lib/advisory-score.mjs` (E16), accepts a multi-entry adjudication through
  `opts.adjudication` (E17, partly), moves the key out of the fixture tree behind a content-based
  mutation test (E20), and fixes the three runner defects (E15). The regression test asserts the ruled
  recall values above and fails on a revert to zero credit; a second test pins the ceiling invariant.
  **Criterion 5's grep is non-empty.** Two published pages, `docs/explanation/limitations.md` and
  `docs/reference/token-usage-estimates.md`, carry behavioural figures, and so do historical
  `CHANGELOG.md` entries. The criterion's literal `docs/**` also covers `docs/internal/**`. Both
  questions wait on the maintainer, in section 7. **The E13 cells stay PROVISIONAL**: their
  adjudications exist only as an agent-drafted document,
  [`adjudication-2026-08-04.md`](eval-runs/adjudication-2026-08-04.md), marked DRAFT - PENDING
  MAINTAINER SIGNATURE. The re-scored figures live in
  [`eval-runs.md`](eval-runs/eval-runs.md) under batch 2026-08-04, and are not repeated here.
- **Carried by:** those four entries plus this row. **Cut:** cut 3, "Evidence".
- **Why it gates everything behavioural:** no detection-rate, precision, recall or model-ranking
  figure may publish anywhere until this lands. That is the audit's one refuse-to-do.

> **Acceptance criteria.**
> 1. An ADR records the ruling. **Its worked example is the ceiling breach, NOT the 0.42/1.00 divergence** (amended 2026-08-31): under full credit Opus still scores 0.46 precision on key 1.0.0 against 1.00 on key 1.1.0 with the same advisory, so that swing is caused by key COMPLETENESS (the promotion of SD-10 through SD-13), not by the multi-entry rule - full credit closes only 4 of those 58 points. Building the ADR on the divergence case would rest the ruling on a case the ruling does not fix. The honest worked example is: rule (a) publishes Opus at 1.00 through an instrument that documents 0.92 as its maximum; rule (a') publishes 0.92.
> 2. **Proven able to fail, against the RULED numbers:** the regression test asserts rule (a')'s outputs (Haiku 0.46 / Sonnet 0.54 / Opus 0.92 recall on key 1.1.0) and fails on a revert to zero-credit-on-multi-engagement. (Amended 2026-08-31: asserting the RECORDED 0.42/1.00 figures would not work - those are zero-credit outputs, so a revert would RESTORE them and the test would stay green through the very regression it exists to catch.) A second assertion pins the ceiling invariant: no reported recall may exceed `recallAutoCeiling` for its key.
> 3. The same advisory scores identically across a re-run (determinism), and E17's adjudication demonstrably overrides one automatic engagement in a test.
> 4. E20's key-outside-fixture test fails when a key file is planted inside the fixture tree (mutation).
> 5. The publication gate (plan sec 8.4) is enforced against a NAMED surface list, not asserted: before this lands, `README.md`, `docs/**`, `RELEASE-NOTES.md`, `CHANGELOG.md` and the deployed site carry no detection-rate, precision, recall or model-ranking figure, verified by a recorded grep whose empty result is the evidence. (Amended 2026-08-31: the criterion previously read "No behavioral number publishes anywhere before this lands" - a project-wide negative over an unnamed surface set, with no grep and no check, so nothing could demonstrate it failing. It was a policy restated as a criterion.)

**The ruling, so nobody has to re-derive it.** Option (a') - full credit restricted to entries whose
own `correct` clause verifies, `mode: semantic` entries never auto-credited, and adjudication
MANDATORY on every multi-engagement. Option (a) was proposed and then falsified by measurement: it
publishes Opus at 1.00 through an instrument documenting 0.92 as its maximum. **Criterion 1 is met
as of 2026-10-25:** ADR 0065 records the ruling. ADR 0062 stays reserved for E75 (a marketplace cannot
require a minimum Standard edition of its members), so the next free ADR number is **0066**.

## RS-B2 (mutation-proof the check spine)

- **Status: DONE 2026-10-25, all four criteria met** by
  [PR #381](https://github.com/product-on-purpose/agent-skills-toolkit/pull/381), unreleased.
  (1) The inventory table is `tests/unit/spine-firing/README.md`. Its gap count is 0 of 35: every check
  already had a firing test somewhere. Six were thin, with exactly one: `U7`, `S5`, `S6`, `G5`, `G6`
  and `G7`. Each now has a second case. (2) The meta-test in
  `tests/unit/spine-firing/spine-firing.test.mjs` reads `REQ_IDS` from `scripts/lib/registry.mjs` and
  is green, so a check added without a firing case fails CI. (3) Deleting the `S5` case turns the
  meta-test red. Inverting the guard of `U7`, `S6` and `G6`, one per band, turned only that check's
  case red; so did moving `U5`'s threshold from 0.7 to 0.1. (4) The new file's five-run median is
  152 ms when run alone. `node --test` runs each file in its own process, so that bounds its cost at
  about 0.2 percent of a full run, far under the fifteen percent budget. Verified 2026-09-17, before
  this work: no inventory table existed, and no registry-driven meta-test asserted that every spine
  reqId has a firing case.
- **Carried by:** this row. **Cut:** none - a cross-cutting rider that lands incrementally on any cut.
- **Note on the count:** the criteria below say 34 checks. The spine is **35** at v1.19.0, and the
  criterion is deliberately written to READ the count from `scripts/lib/registry.mjs` rather than pin
  it, so it did not go stale when cut 4 added `U18` (the Codex command size cap).

> **Acceptance criteria.**
> 1. The inventory table exists and its gap count is stated in the increment's record.
> 2. Every spine check has a firing test; the meta-test is green.
> 3. **Proven able to fail, twice:** (a) the meta-test reds when one firing case is deleted (mutation); (b) one sampled check per band gets the full E51 treatment - the check's guard logic temporarily inverted locally to confirm the firing test actually depends on the check's behavior, not on fixture accidents.
> 4. Suite time impact measured against a **named budget**: the mutation corpus adds no more than 15 percent to `npm test` wall-clock, or the increment does not ship as-is and the overage is reported with a plan. (Amended 2026-08-31: the criterion previously read "measured and stated ... if not, say so", which has no threshold and no consequence - measuring and stating a catastrophic number satisfied it exactly as well as a good one.)

**Annotated 2026-09-17.** The suite at `ab0dc20` is **1588 tests, 0 failures**. Criterion 4's budget
cannot be set from a single baseline run on this workstation: three consecutive `npm test` runs
reported `duration_ms` of **49.8 s, 59.6 s and 62.3 s**, a 12.5 s spread, where fifteen percent of the
fastest is 7.5 s. **Two OTHER three-run samples on this same machine did NOT reproduce that spread**
(67.4 / 72.8 / 74.9 s, and 55.5 / 61.2 / 62.5 s - both spreads under the budget), so no general claim
about noise exceeding the budget is made here: three samples disagree and the honest reading is that a
single run cannot set this threshold either way. Whoever does this work has to establish the baseline
as a repeated median on the machine that judges it, and measure the corpus's cost the same way.
This item also absorbs the 2026-09-04 audit's companion finding that *six checks hang on one test
each* - that is the same gap counted from the other end.

## RS-C5 (the stance on the vendor's own plugin eval): the positioning ADR

- **Status: CLOSED 2026-10-25.** Ruled 2026-08-31 (adopt, with a scope tripwire); ADR 0064 accepted
  2026-10-25. See the closing annotation at the end of this section. The text below is kept as history.
  Verified 2026-09-17: `grep`
  for "plugin eval" across `docs/explanation/` and `foundation/` returns nothing, so the ADR is
  unwritten, the comparison page has no eval row, and the third probe has not been minted - the
  ledger holds exactly two `kind: "probe"` claims.
- **Carried by:** this row. **Cut:** rides whichever cut is next; touches no spine code.

> **Acceptance criteria.** ADR accepted with TL;DR; comparison page updated; the probe-class reproduction recorded with the fixtures the probe discipline requires.

**The ruling, and the tripwire.** The tier is structural, deterministic, library-scope; the vendor's
eval is behavioural, judged, single-plugin. They answer different questions, the posture is BESIDE
and not versus, and the recommended guidance is run both. The ADR stakes its positioning on the word
*single-plugin*, which is the one leg the vendor can take in a single release - so the probe's
`EXPECTED.md` pins the `--help` target line itself rather than waiting for documentation to appear.

**Annotated 2026-09-17 - this ADR carries a release-blocking cost.** It mints a THIRD probe-class
claim with its own 30-day clock (`FRESHNESS_DAYS = 30` in `scripts/lib/vendor-watch.mjs`). Whichever
change lands this ADR must update the probe budget in the same change, or the third clock becomes an
unbudgeted release blocker. See [Hard dates](#5-hard-dates).

**Annotated 2026-10-23 - the vendor side of the ruling is now confirmed in prose, the toolkit side is
still unwritten.** `cli-reference.md` documents `claude plugin eval`: it runs a plugin's eval cases
"and reports scored results," isolated per run, with a `--ablation with-without` arm against a
no-plugin baseline. That is the single-plugin, judged, behavioural shape the ADR's positioning rests
on, confirmed rather than inferred. `grep` for "plugin eval" across `docs/explanation/` and
`foundation/` still returns nothing: the ADR is still unwritten, the comparison page still has no eval
row, and the third probe is still unminted.

**Annotated 2026-10-25 - closed.**
[ADR 0064 (the vendor's `claude plugin eval` is beside askit's tier, not versus it)](decisions/0064-the-vendors-plugin-eval-is-beside-askits-tier-not-versus.md)
is accepted, merged in [PR #378](https://github.com/product-on-purpose/agent-skills-toolkit/pull/378).
All three acceptance criteria are met:

- The comparison page carries the eval paragraph in `docs/explanation/comparison.md`.
- The single-plugin scope sentence is pinned as the quote claim `plugin-eval-single-plugin-scope` in
  `foundation/claims/vendor-claims.json`, and `node scripts/vendor-watch.mjs .` confirms it holds.
- The probe-class reproduction was not needed. `cli-reference.md` states the single-plugin,
  isolated-session scope in a complete sentence, so the precondition for a probe in
  `docs/internal/vendor-watch/probes/README.md` did not hold. **No third probe was minted, and the
  probe budget stays at two.** The release-blocking cost the 2026-09-17 annotation above predicted
  therefore never arrived.

## RS-C6 (the Agent Plugins root manifest): spike, then ADR

- **Status: RULED 2026-08-31 (spike first, ADR follows the evidence), SPIKE OPEN.** Verified
  2026-09-17: no dated read about a root manifest exists under `foundation/sources/`; the only
  mention anywhere in the tree is the intake row.
- **Carried by:** this row and [`audit-intake.md`](audit-intake.md). This item has now been silently
  dropped twice in earlier generations, which is why its record is load-bearing.
- **The engineering risk that decides it:** Codex resolves the ROOT `plugin.json` before
  `.codex-plugin/plugin.json`. Emitting one could REPLACE the manifest Codex currently ingests skills
  from - the "listing is not ingestion" failure the round-trip harness exists to catch.

> **Acceptance criteria.** The spike's three-state measurement is recorded **together with the exact `codex --version` it was measured on** (added 2026-08-31: `tests/integration/codex-roundtrip.test.mjs` spawns whatever `codex` is on PATH and uses `--version` only as an availability boolean, discarding the output. Locally that is codex-cli 0.144.5, while the ADR would cite source at rust-v0.150.1 - six minors apart, and appendix B records Codex "actively extending support for [the root manifest] as late as rust-v0.150.0". An unpinned spike can therefore produce a dated no that is false at the commit it cites, which is ADR 0053's own class: a pin label is a claim); the ADR cites it; whichever way it rules, `grep` for the item in tracked surfaces finds a live record (the anti-zero-trace property).

**The three states the spike must measure:** root manifest alone; root beside `.codex-plugin`; and
`.codex-plugin` alone (the control).

**The dated-no branch's reopen triggers, replaced 2026-08-31.** The original trigger - "the spec
gaining a components/skills mechanism in 1.1.0" - cannot arm: the merged 1.1.0 draft is
property-identical to 1.0.0, with zero occurrences of skills, commands, agents, hooks, mcp_servers or
components. The two triggers that CAN fire: **a future spec revision introducing a components
mechanism**, or **a change in Codex's manifest resolution order**.

**Annotated 2026-10-23 - the first dated read of this spec now exists, and the trigger still has not
fired.** [`foundation/sources/agent-plugins.md`](../../foundation/sources/agent-plugins.md) records
Agent Plugins 1.0.0, read end to end for the first time: "Agent Plugins v1 defines exactly two
component types" - skills and MCP servers - the same property the 2026-08-31 reading already found in
the 1.1.0 draft. Governance was also read: no single vendor may hold a majority of Core Maintainer
seats, which is the fact [`docs/explanation/comparison.md`](../explanation/comparison.md) and the
positioning claim it carries should be checked against, not assumed. Neither of the two triggers above
has fired.

## RS-E1 (the cross-tool corroboration run)

- **Status: OPEN, nothing started.** Verified 2026-09-17: `docs/internal/research/` contains no
  `corroboration/` directory.
- **Carried by:** this row. **Cut:** out-of-band research; its one-paragraph public summary rides
  cut 5. **Hard predecessor of cut 5.**
- **Why it is out-of-band and still named:** an M-effort experiment that is a hard predecessor of a
  cut while belonging to no cut is the exact shape a zero-trace drop takes. The prior generation lost
  six rows that way.

> **Acceptance criteria.**
> 1. At least three instruments produced real output on both subjects (five attempted); versions and invocations recorded.
> 2. Every disagreement carries a classification with evidence.
> 3. No behavioral number is presented as corroboration, **and the gate's scope is stated in the method file**: plan sec 8.4 bans publishing behavioral numbers "anywhere", while this protocol REPORTS third-party LLM-judged scores. The reading this spec adopts (amended 2026-08-31): sec 8.4 governs the TOOLKIT's own behavioral numbers; a third-party instrument's score may be reported as that instrument's output, attributed and dated, and may never be presented as agreement with, or validation of, a toolkit verdict. Compliance is checked by a second reader against a committed forbidden-phrase list, not by the author's own declaration.
> 4. Reproducibility is DEMONSTRATED, not asserted: at least one instrument is replayed from the method file alone on a clean machine or by a second person, and the replay result is recorded beside the original. (Amended 2026-08-31: "reproducible by a stranger" named no stranger, required no attempt and defined no proxy, so it could not fail. The house standard for a reproducible experiment is the vendor-watch probes, which ship installable fixtures.)

**Two subjects, not one** - one tree the toolkit grades cleanly and one deliberately flawed tree - so
the matrix shows agreement on PASS and agreement on FAIL. A matrix built only on a passing subject
cannot distinguish corroboration from universal leniency. Output lands in
`docs/internal/research/corroboration/`.

## RS-E2 (the graded cohort)

- **Status: RULED 2026-08-31 (notify before publish), OPEN and NOT SCHEDULED.** Verified 2026-09-17:
  [issue #300 (pick the graded cohort)](https://github.com/product-on-purpose/agent-skills-toolkit/issues/300)
  was closed NOT_PLANNED on 2026-09-04 and explicitly *"deferred to cut 5 planning rather than
  decided"*. The member list is unpicked and nobody has been contacted.
- **Carried by:** this row and that issue. **Cut:** cut 5.

> **Acceptance criteria.**
> 1. The cohort page is live, deploy-generated alongside the family registry, portable-profile only, with reproduction commands per row.
> 2. Every published error finding was hand-verified and the verification recorded internally.
> 2b. **Every cohort member was notified before publication, with the notification link, date and reply window recorded, and every in-window correction applied** (added 2026-08-31 per the decision-queue 6 ruling). A member who objected is absent from the page.
> 3. The framing contains no ranking language (reviewed against the framing rules above, explicitly).

**Annotated 2026-09-17 - a dry run has already moved the framing question.** On 2026-09-04 five
candidates were graded with the portable profile (`--profile plain-plugin`, per
[ADR 0029 (U2 and U5 are house provenance)](decisions/0029-reclassify-u2-u5-as-house-provenance.md)).
**Four of the five pass every portable check.** That is a fair result and it is a problem for the
page's stated purpose: a cohort page where almost every row reads the same demonstrates that the
grader RUNS, not that it DISCRIMINATES. The recorded fix is framing - build the page around what a
pass means and what the tier-scope sentence says it does not certify - and explicitly NOT
cohort-hunting for a repository that fails. Per-repo verdicts are unpublished because governance
point 5 requires notification first; the run lives at `_local/cohort-dryrun/2026-09-04/`.

**The governance that is the actual blocker**, in one line each: portable checks only, house
conventions off by profile; snapshot framing with a graded sha and a reproduction command, never a
ranking; an EXPLICIT permissive licence is required and "no licence file" is an exclusion; every
error-level finding on a stranger's tree is hand-verified before publication; and every member is
contacted with its own snapshot and a stated reply window BEFORE the page goes live. A member who
objects is dropped without argument.

## RS-E4 (the prompt-injection and pipe-to-shell content scan), formerly E6

- **Status: RULED 2026-10-25, unimplemented. It ships as advisory finding ADV3 (security screen),
  outside the tier, and needs no Standard edition.** The ruling is recorded in
  [ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md).
  An advisory finding can never fail anything, so it needs no `since` and no warn cap. The three
  acceptance criteria below carry over unchanged. Verified 2026-09-17: no pattern catalogue existed in
  the tree and no content-scan check was registered in the spine.
- **Carried by:** [E6 (prompt-injection and curl-pipe-bash content scan)](backlog/enhancements.md)
  and this row.
- **Cut:** none assigned, per ADR 0057 (unshipped work carries a name, never a version number). It no
  longer needs a Standard revision.

> **Acceptance criteria.**
> 1. Seeded-malicious fixtures (one per pattern class) each fire; the family corpus fires zero or every fire is examined and either exempted-by-rule or genuine; **and the measured false-positive rate required by change item 3 is recorded as a NUMBER, with a stated ceiling above which the catalog does not ship.** (Amended 2026-08-31: the disjunction "fires zero OR every fire is examined" exhausts the outcome space and so cannot fail, and the measurement the change section demanded was required by no criterion at all - it could be skipped without failing the item.)
> 2. **Proven able to fail:** a pattern removed from the catalog stops its fixture firing (the catalog is load-bearing, mutation-tested).
> 3. The documentation-discusses-the-attack case is a committed negative fixture.

**Annotated 2026-09-17 - the migration metadata this item was specified with is now unlandable.** The
spec says the check ships with `since: "0.16"` and `until: "0.17"`. Standard 0.16 shipped in v1.19.0
WITHOUT it, and 0.17 is ruled graduations-only, so neither number is available. Standard 0.18 is
named but this item is not in the five-item set that names it. **A revision for this check is an open
question for the maintainer and is deliberately not answered here** - see
[Blocked and awaiting a ruling](#7-blocked-and-awaiting-a-ruling). Nothing about the catalogue itself
is blocked: it is data, it can be built and measured at any time, and only the check's introduction
needs a number.

**Design constraint that survives regardless:** deterministic only, no scoring, no judgment; every
pattern carries an id, a matcher, a class, a cited source and a known-limits note; it is explicitly a
screen and not a safety review, and its finding text says so. The negative case - documentation that
legitimately DISCUSSES pipe-to-shell - is a committed fixture, because this repository's own
troubleshooting docs are that case.

## RS-E5 (npm package ownership)

- **Status: the RULED mechanism is DONE; the record of it is WRONG; the risk it was filed about is
  UNCHANGED.** This is the row whose stated status did not survive checking.
- **Carried by:** [issue #313 (npm ownership resilience: the bus factor is still one)](https://github.com/product-on-purpose/agent-skills-toolkit/issues/313), **closed 2026-10-16 as an accepted risk.** The maintainer ruled on 2026-10-14 to accept the single owner and to keep the npm account's recovery codes somewhere safe. `STATUS.md` now records that decision and the recovery path, which is what AC3 asks for. This line read "open" until 2026-10-16.

> **Acceptance criteria.**
> 1. `npm access list collaborators agent-skills-toolkit` shows the org team with `read-write`, and the grant is exercised by a real publish (see AC2). (Amended 2026-08-31: the criterion previously read "`npm owner ls` shows two maintainers", which tested the superseded second-maintainer mechanism.)
> 2. Trusted publishing is confirmed unaffected **by the next real tag-triggered publish completing through the approval gate**, not by a dry run (amended 2026-08-31: `publish-npm.yml` lines 38-41 state that dry-run mode runs `npm pack --dry-run` only, that the literal string `npm publish` never appears in that path, and that the mode never runs in a job holding `id-token: write` - the permission that mints the OIDC token npm trusts. A dry run therefore cannot exercise the binding it claims to confirm).
> 3. The decision and recovery path are recorded in STATUS.md.

**Annotated 2026-09-17, each against evidence rather than recollection.**

| Criterion | Verified state |
|---|---|
| AC1 | **MET.** Issue #313 records the live 2026-09-04 reading: `agent-skills-toolkit` is granted read-write to `product-on-purpose:developers`. The 2026-08-31 ruling was correct and the doubt raised in issue #301 is settled - an npm organization CAN govern an unscoped package. |
| AC2 | **MET.** `publish-npm.yml` run `35289925723`, tag-triggered from the `v1.19.0` release merge, completed successfully through the approval gate. |
| AC3 | **NOT MET, and worse than not met.** `STATUS.md`'s "What is open" section said the transfer *"must be done in the npmjs.com web UI"*. It was done from the CLI on 2026-09-04. That sentence is corrected in the same change as this page. |

**What is genuinely still open is NOT the ruling - it is the bus factor.** Verified 2026-09-04:
`npm owner ls` returns one account, `npm access list collaborators` returns one, the org has one
owner, `product-on-purpose:developers` has one member and `product-on-purpose:maintainers` has zero.
**The organization is a layer of indirection over a single point of failure, not the removal of one.**
It needs a second trusted human with an npm account, which is why it is an issue and not a script.
The rename option stays REJECTED, on its true reasoning: it breaks `npx agent-skills-toolkit` and 37
documented commands.

---

# 2. Decisions that are open

A cut cannot start on top of an unruled decision. These are the ones that are actually open, each
with what it blocks.

| Decision | The question | Blocks | State |
|---|---|---|---|
| **D-01** (a health number beside the tier) | does the badge gain a second number, or does the tier stay alone on it | [E61 (the tier certifies file shape)](backlog/enhancements.md), and through it D-02 | **RULED IN PART 2026-10-25.** Reports gain a health number beside the tier; the tier and the badge stay unchanged in this pass. **The badge half stays OPEN** and must be re-measured before any pass puts a number on the badge. The deferral's reason - it changes what every badge in the wild means - was measured on 2026-10-24 and found no outside payer: 111 npm downloads in a month, 3 stars, 0 forks, no outside issue. Recorded in [ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md) |
| **D-02** (the pin floor's deprecation window) | how long may a pin reach back, and what happens to pins older than the floor | [E62 (the pin has no floor)](backlog/enhancements.md) | OPEN. D-01 is ruled in part, and the health number's currency category will report how far behind a pin is while enforcing nothing, so D-02 is still unanswered |
| **D-03** (U5's warning text) | does `U5` keep its current warning text, or change | [E63 (U5 rewards a template)](backlog/enhancements.md) | OPEN. Its cheap unblocked first step is DONE: the twenty labelled descriptions are now a tracked fixture |
| **D-08** (the behavioural rung's shape) | a fourth tier name, or a modifier on Gold | the behavioural rung, deferred below | OPEN, and not urgent while the rung is deferred |
| **E16's implementation** (the multi-entry credit rule) | none - it is RULED; the scorer change is unwritten | every behavioural claim this project publishes | RULED 2026-08-31; ADR 0065 (a multi-entry finding earns credit only where its own correct clause verifies) records it, meeting criterion 1 of RS-B1. **IMPLEMENTED 2026-10-25** in [PR #383](https://github.com/product-on-purpose/agent-skills-toolkit/pull/383), unreleased. Publishing a final cell now waits on the maintainer's adjudication signature and the criterion 5 ruling, both in section 7 |
| **RS-C6's spike** (the Agent Plugins root manifest) | does the root manifest carry components on the measured Codex version | the emit-or-dated-no ADR | evidence not gathered |

**Already ruled, recorded here so they are not reopened:** D-04 became
[ADR 0059 (every MUST maps to a check, a SHOULD or a stated gap)](decisions/0059-every-must-maps-to-a-check-a-should-or-a-stated-gap.md);
D-05 shipped in PR #319 (an above-tier finding is a notice carrying its rung);
D-06 put the audits in `_local/audit/`; D-07 is MOOT under
[ADR 0057 (unshipped work carries a name, never a version number)](decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md);
RS-C5's ADR became
[ADR 0064 (the vendor's `claude plugin eval` is beside askit's tier, not versus it)](decisions/0064-the-vendors-plugin-eval-is-beside-askits-tier-not-versus.md)
on 2026-10-25.

---

# 3. The cuts

**These are STATUS rows, not commitments.** Each names its blocker. No dates. Per
[ADR 0057 (unshipped work carries a name, never a version number)](decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md)
a cut takes its version number at cut time and nowhere earlier.

Cuts 1, 2, 4 and 6 are SHIPPED - see [`STATUS.md`](STATUS.md). Cut 4, "current with the vendors", is
v1.19.0, cut 2026-09-17. Cut 6, "Standard 0.17, the graduations", is v1.20.0, cut 2026-10-05, on npm
2026-10-14.

| Cut | Identity | Carries | Blocked on |
|---|---|---|---|
| **3. "Evidence"** | the eval instrument becomes trustworthy enough to publish a number from | RS-B1 complete - the E16 ruling implemented, E17's adjudication, E20's key relocation, E15's runner fixes - then the E13 model-triple readings publish | **Two maintainer rulings, no code.** The implementation merged 2026-10-25 in [PR #383](https://github.com/product-on-purpose/agent-skills-toolkit/pull/383): RS-B1's criteria 2 to 4 are met. (a) The E13 adjudication draft needs a human signature before any cell is FINAL. (b) RS-B1's criterion 5 grep is non-empty, and its scope needs a ruling. Both are in section 7. Until 2026-10-25 this cell read "the implementation itself" |
| **5. "The graded cohort"** | the toolkit grades trees that are not ours, in public | RS-E2 (the cohort page) plus RS-E1's one-paragraph public summary, plus the sixth and last placement of the tier-scope routing sentence, which ships with the page | **Four things, none of them code.** (a) RS-E1's internal corroboration run has not happened. (b) The member list is unpicked - issue #300 closed NOT_PLANNED, deferred to this cut's planning. (c) Every member must be notified and given a reply window before publication. (d) The 2026-09-04 dry run found four of five candidates pass every portable check, so the page's framing has to be settled before it is built |

**Cut 6, closed.** It shipped as v1.20.0, tagged 2026-10-05, on npm 2026-10-14. The content MERGED on
2026-09-21 ([PR #339](https://github.com/product-on-purpose/agent-skills-toolkit/pull/339)), and the
pre-cut audit of the CHANGELOG merged on 2026-09-28
([PR #349](https://github.com/product-on-purpose/agent-skills-toolkit/pull/349)). The source plan's
timing constraint, quoted whole: *"No sooner than a real migration window after cut 4 (Recommended: 2
to 3 weeks, the 0.13-to-0.15 cadence)"*. Cut 4 shipped 2026-09-17, and the maintainer approved the cut
on 2026-09-28 for a tag no earlier than 2026-10-01. Per ADR 0057 the version number was assigned at cut
time, not earlier.

**v1.21.0, "vendor currency and the adoption guard", cut 2026-10-23, is not one of the numbered cuts
in this table.** It is a toolkit patch inserted ahead of the own-plugins-first migration below, because
two of its items block that migration directly: [E72 (adopting a plugin can wipe its hand-written
manifest fields)](backlog/enhancements.md) was the named toolkit-side blocker in this migration's
`pm-skills` row, and [E81 (the vendor's colon rule now names the frontmatter `name`, not the
filename)](backlog/enhancements.md) was the separate `release-ready` blocker the probes table above
names. Packet at [`release-plans/plan_v1.21.0/`](release-plans/plan_v1.21.0/README.md).

**What cut 6 actually closed, measured rather than asserted.** At `ab0dc20` four checks carried
`until: "0.17"`: `U18` (the Codex command size cap), `G1` (hook documentation), `G2` (self-hosting)
and `G8` (folder README).
[ADR 0061 (U18 never gated; the strengthening set gets Standard 0.18)](decisions/0061-u18-is-permanently-warn-and-the-strengthening-set-is-standard-0-18.md)
deletes `U18`'s as inert - the check emits `warn` natively, so a `warn` cap over it never moved a
severity at any pin, proven with `G2` as a positive control in the same run. **Cut 6 therefore closes
THREE windows: `G1`, `G2` and `G8`.**

**Standard 0.18 is NAMED, not scheduled.** It is the revision the 2026-09-04 audit's five-item
strengthening set lands on. Naming it is what makes those backlog entries executable instead of
parked on a number that does not exist. No date is attached and no cut is promised.

**On 2026-10-04 the maintainer ruled that Standard rule changes ride together in 0.18** rather than each opening its own edition, because every new edition asks each family plugin to re-pin. Ruled into 0.18 so far: [E70 (`initialPrompt` joins `U14`)](backlog/enhancements.md), [E73 (`U9` exempts private packages)](backlog/enhancements.md), [E76 (a `selfValidation` value for wrapper scripts)](backlog/enhancements.md) and [HC-08 (`G1` finds hook scope and failure behaviour)](backlog/enhancements.md). HC-07 (`G3`'s CI-execution promise) stays "strengthen later" until a family plugin runs its evals in CI. 0.18 is still unscheduled and comes after own plugins first.

**The sequence after cut 6, ruled by the maintainer on 2026-09-30: own plugins first.** Before any
plugin outside this organisation is graded in public, every plugin in the
`product-on-purpose/agent-plugins` marketplace moves to Standard edition 0.17 - the `standard` field in
its own `library.json` - with the fixes that edition requires, and the catalogue is re-pointed to each new
commit as it lands. This comes ahead of cut 5 (the graded cohort), cut 3 (evidence) and Standard 0.18.
The basis, measured 2026-09-30: the six members pinned five different editions (0.8 to 0.16) and one
declared none, and the two members with the most subagents, commands and workflows were the least
governed. The toolkit changes the 2026-09-30 measurement found are
[E72 (adopting a plugin can wipe its manifest fields)](backlog/enhancements.md), which must land first,
[E73 (`U9` and private packages)](backlog/enhancements.md),
[E74 (`U12` and template placeholders)](backlog/enhancements.md) and
[E75 (a marketplace minimum edition)](backlog/enhancements.md). The maintainer first chose an external
cohort on 2026-09-28, then chose this after stating the project's goal as common standards across the
plugins of a marketplace.

**The migration order, per plugin, committed here because this page's own test - a reader who has
never opened `_local/` must be able to pick up any open item - does not allow the tactical order to
live only in a gitignored plan.** Facts below are each plugin's own `origin/HEAD`, measured 2026-10-23
unless marked otherwise; a plugin that keeps moving needs a re-measure before its row is actioned.

| # | Plugin | Standard today | What blocks the move to 0.17 | Done is measured by |
|---|---|---|---|---|
| 1 | agent-skills-toolkit (this repository) | 0.17 | Nothing - shipped in cut 6, v1.20.0 | Already true: `library.json` pins 0.17 and the gate is green |
| 2 | critique-skills | 0.17, Silver, v0.2.0 | Nothing - moved 2026-09-30 (its PR 56) | Already true, same test |
| 3 | product-lifecycle-templates | 0.12, now at v0.21.0 | Its `origin/HEAD` has moved past the commit the 2026-09-30 measurement pinned, so the small fix (change `standard`, regenerate `INDEX.md`) needs a re-measure against the current commit before it ships. *Confidence: medium - the fix is likely still that small, but unverified against v0.21.0*. **Re-measured 2026-10-25 and PR open** (product-lifecycle-templates#324, a draft): graded Advanced with 0 errors and 0 warnings by the toolkit at `main`. It stays a draft because its CI pins `TOOLKIT_REF: v1.10.0`, and moving that pin needs a toolkit release carrying [E90 (spine-size prose compared outside this toolkit)](backlog/enhancements.md) | `library.json.standard` reads `0.17`; the toolkit grades it Gold, 0 errors |
| 4 | writing-style-catalog | 0.11, v0.14.0 | A one-line `standard` change; expect Bronze, 3 `U5` warnings, which are [E63 (`U5` rewards a template)](backlog/enhancements.md) advice, not blockers. **PR open 2026-10-25** (writing-style-catalog#165, CI green): graded Universal (Bronze) with 0 errors and 3 warnings, as expected. Merge and release wait for the maintainer | `standard` reads `0.17`; the toolkit grades it Bronze, 0 errors |
| 5 | pm-skills | none - no `library.json` | **[E72](backlog/enhancements.md) SHIPPED in v1.21.0** (2026-10-23), so adoption no longer risks wiping the native manifests' hand-written fields. What remains: a new `library.json` declaring `tier: universal`, using the [E74](backlog/enhancements.md)-ruled workaround (a keyword line in its template) and the [E73](backlog/enhancements.md)-ruled workaround (a real version on its tooling `package.json`) until Standard 0.18 ships `U9`'s exemption properly, plus repointing the docs links its own restructuring broke. **PR open 2026-10-25** (pm-skills#326, CI green): graded Universal (Bronze) with 0 errors and 40 `U5` warnings. Merge and release wait for the maintainer | `library.json` exists, declares `0.17` and `universal`; the toolkit grades it Bronze, 0 errors |
| 6 | thinking-framework-skills | 0.8, v0.18.6 | **Ruled 2026-10-14: do the Gold work, not declare Silver.** Measured 2026-09-30 at its then-pinned commit, so re-measure at v0.18.6 before executing: 71 folder READMEs, frontmatter on 7 docs pages, and `G10`'s four Diataxis folders plus two architecture pages. **PR open 2026-10-25** (thinking-framework-skills#217, CI green): graded Advanced (Gold) with 0 errors and 7 `U5` warnings, after adding 74 folder READMEs that each describe that folder's actual contents. Merge and release wait for the maintainer | `library.json.standard` reads `0.17`, `tier` stays `advanced`; the toolkit grades it Gold, 0 errors |
| 7 | agent-plugins (the marketplace catalogue) | pins four different editions across the six members (two of them, agent-skills-toolkit and critique-skills, already at 0.17), and one member (pm-skills) declares none | Each member above releases its own move first | `.claude-plugin/marketplace.json` pins each member's post-migration commit; [E75](backlog/enhancements.md) gets ADR 0062 after the last one lands |

**Suggested order**, carried from the 2026-09-30 measurement: `product-lifecycle-templates`,
`writing-style-catalog` and `critique-skills` first, as the small, independent moves (critique-skills
is already done); the E72 toolkit fix is done too, shipped in v1.21.0 ahead of any plugin running
`gen-manifest` during adoption; then `pm-skills` to Bronze; then the `thinking-framework-skills` Gold
work; then the catalogue re-pins as each plugin releases.

**Rulings for the migration.** 2026-10-04: `pm-skills` uses the verified workarounds for
[E73](backlog/enhancements.md) (`U9` and private packages) and [E74](backlog/enhancements.md) (`U12`
and template placeholders) instead of waiting for 0.18; [E75](backlog/enhancements.md) (a marketplace
minimum edition) gets ADR 0062 after the migration finishes. 2026-10-14: `thinking-framework-skills`
does the Gold work rather than declaring Silver, with the counts in row 6 above.

---

# 4. Triage of the 2026-09-04 audit's roadmap

Fifteen ranked items and five explicit rejections. Every row lands in exactly one of four buckets:
**ADOPT** (a tracked surface already carries it), **ADOPT-RENAMED** (it is carried under a different
name and the rename is recorded so the original is findable), **DEFER** (with a reopening condition
that can actually fire), or **DECLINE** (with a reason). This page is the tracked surface for every
deferral and decline below, which is what stops them from being zero-trace drops.

| # | The audit's item | Disposition | Carried by, or the trigger that reopens it |
|---|---|---|---|
| 1 | Schema-first report object with fingerprints, outcomes and inventory | **REOPENED 2026-10-25** | **Reopened by D-01 (a health number beside the tier), ruled in part 2026-10-25.** [ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md) section 5 specifies it: `schemaVersion`, a `run` block, `checks[]` with an outcome enum, `components[]`, `blockedFindings[]`, the advisory fields, `health{}`, and `schemas/report.v1.json`. It is additive, so no existing field is removed. The fingerprint half already shipped for SARIF as F-014 ([PR #375](https://github.com/product-on-purpose/agent-skills-toolkit/pull/375)). The original deferral, kept as history: reopen when D-01 (a health number beside the tier) is ruled ADOPT - the score needs this object's inventory pass - **or** when the first consumer outside this organisation reports a problem with the current `--json` or `--sarif` shape. A versioned report is a compatibility promise, and the audit's own version plan (1.19 / 1.20 / 2.0) is void under ADR 0057 |
| 2 | Health score beside the tier | **ADOPT-RENAMED** | [E61 (the tier certifies file shape, so a plugin of placeholder files earns Gold)](backlog/enhancements.md). **REOPENED 2026-10-25:** D-01 is ruled in part, and ADR 0063 specifies five categories (substance, budget, portability, security, Standard currency), reported beside the tier and never on the badge in this pass |
| 3 | Security posture axis, reported as its own non-tier axis | **ADOPT-RENAMED** | RS-E4 (the prompt-injection and pipe-to-shell scan) above, and [E6](backlog/enhancements.md). **Ruled 2026-10-25:** it ships as advisory finding ADV3 (security screen) outside the tier, needing no Standard edition, per ADR 0063 |
| 4 | Behavioural rung - executable eval sets above Gold | **DEFER** | Reopen when RS-B1 (the multi-entry credit gap) completes. A rung that certifies behaviour publishes a behavioural claim, and no behavioural claim may publish until the scoring key is trustworthy. D-08 (a fourth tier name, or a modifier on Gold) is the design question waiting behind it |
| 5 | Autofix / codemod `--fix` for the mechanical set | **DEFER** | Reopen when [E47 (`askit-onboard`, the adoption funnel)](backlog/enhancements.md) ships and the mechanical-fix friction is still measured on a real adopter. The audit's own example - a scaffolded `G8` README that then fails `G7` - is a specific defect and reopens this on its own if anyone hits it. **E47 shipped 2026-10-25** ([PR #374](https://github.com/product-on-purpose/agent-skills-toolkit/pull/374)); the measurement half of the trigger is not yet met |
| 6 | Context and token budget profiler | **DEFER** | Reopen with item 1. It is inside that object, not beside it; the audit itself files it as "inside 1". Item 1 reopened 2026-10-25 (ADR 0063), and its specified `components[]` will carry budget use per component; building a profiler beyond that still needs its own decision |
| 7 | Standard-to-check coverage table, generated | **ADOPT - BUILT 2026-09-18; six of seven dispositions UNAPPLIED** | [ADR 0059 (every MUST maps to a check, a SHOULD or a stated gap)](decisions/0059-every-must-maps-to-a-check-a-should-or-a-stated-gap.md), accepted 2026-09-08. The table shipped in [PR #334](https://github.com/product-on-purpose/agent-skills-toolkit/pull/334) as `scripts/gen-standard-coverage.mjs` -> [`../reference/standard-coverage.md`](../reference/standard-coverage.md), drift-guarded in `npm test`. One disposition is applied: Standard 0.17 demoted the sec 7.3 `HISTORY.md` clause to SHOULD. The other six still read `MUST`, and applying them is a Standard revision with no date. **Corrected 2026-09-28:** this row said NOT BUILT for ten days after the table was built |
| 8 | Pin floor and staleness | **ADOPT-RENAMED** | [E62 (the Standard pin has no floor)](backlog/enhancements.md). PARKED on D-02 (the pin floor's deprecation window), which is still open. D-01 was ruled in part 2026-10-25, and the health number's currency category will show a pin's age without enforcing anything |
| 9 | Report diff and trend badge | **DEFER** | Reopen with item 1. It needs that object's fingerprints and cannot be built before them. Item 1 reopened 2026-10-25 (ADR 0063); building this item still needs its own decision |
| 10 | Published JSON Schema and a conformance suite | **ADOPT-RENAMED** | [E8 (published conformance suite)](backlog/enhancements.md), `backlog` since 2026-05-31. The JSON-Schema half rides item 1; the fixture-suite half does not and can start at any time |
| 11 | Corpus benchmarking / percentile | **DECLINE** | It publishes a distribution computed over other people's repositories - the graded cohort's governance problem without the cohort's consent step - and the audit itself notes the reference corpora are of uneven quality. **Reopens only if** cut 5 ships with notify-before-publish honoured and a member asks for a comparison figure |
| 12 | Marketplace rollup | **DEFER** | Marketplace scope already ships. The rollup needs item 1's per-member object, so it reopens with item 1. Item 1 reopened 2026-10-25 (ADR 0063); building this item still needs its own decision |
| 13 | One-command triage (`doctor`) | **SPLIT: ADOPT-RENAMED and DEFER** | The on-ramp problem - a beginner's first run is eight red lines - is carried by [E47 (`askit-onboard`)](backlog/enhancements.md)'s `assess` mode. The CLI subcommand is a different surface and is DEFERRED; **reopen when E47 has shipped and the same friction is measured for a user who is not inside an agent session**. E47 shipped 2026-10-25 ([PR #374](https://github.com/product-on-purpose/agent-skills-toolkit/pull/374)). The beginner's-first-run defect, F-037, was already fixed on 2026-09-17, so the measurement half of the trigger is not met |
| 14 | Prompt-injection surface analysis of skill bodies | **ADOPT-RENAMED, with one half deferred** | The catalogue half is RS-E4 above. The audit's preferred variant - integrate a third-party scanner's SARIF rather than compete - is DEFERRED; **reopen when one of those scanners publishes a versioned, pinnable SARIF contract**, because a deterministic gate cannot depend on an unpinned third party |
| 15 | Runtime-truth checks (vendor CLIs as parity oracles inside the gate) | **DEFER** | The vendor CLIs are external and unpinned, and `claude plugin eval` is documented only in prose, with no versioned output contract (ADR 0064, 2026-10-25). **Reopen when `claude plugin validate`'s output has a documented, versioned contract** - which is exactly the surface RS-C5's scope tripwire already watches, so the trigger has an instrument |

## The audit's five rejections

They migrate because *"we already considered and refused this"* is precisely the record that stops
rework. Each keeps the audit's reason and gains a reopening condition or an explicit statement that
it has none.

| Rejected | The reason | Reopening condition |
|---|---|---|
| **An LLM in the gate** (score-and-threshold with a model) | the category's own evidence says the same; a judged verdict is not reproducible and cannot be a gate | **None. This is a standing hold**, reaffirmed by RS-C5's ADR against exactly this temptation |
| **A fourth structural rung ("Platinum")** | another rung of file presence has the same ceiling problem as Gold, which is E61's whole finding | None as a structural rung. The behavioural rung (item 4) is the only rung with headroom |
| **Extending `U5`'s regex** (more verbs, more languages) | the calibration shows the SHAPE of the check is wrong, not its vocabulary | None. The replacement is [E63 (U5 rewards a template)](backlog/enhancements.md) |
| **Reimplementing a security scanner from scratch** | three well-funded scanners exist; build a small posture axis and integrate instead | None as a from-scratch build. Item 14's integration path is the live alternative |
| **A Gemini emitter** | not evaluated; the limitations page already says it does not exist, and no finding depends on it | Reopen if an adopter asks for it, or if a Gemini plugin format stabilises enough to pin a claim about |

---

# 5. Hard dates

**Re-verified 2026-09-17.** Three of the source plan's four dates did not survive checking and are
corrected here rather than carried.

| Date | What | State |
|---|---|---|
| 2026-09-15 | `standards-watch`'s first SCHEDULED run - the acceptance criterion that cannot be faked, because the `repin-watch` lesson was that both of its real runs were hand-dispatched | **DONE for the schedule; the watch itself never ran.** Run `34969288827`, `event: schedule`, conclusion `success`, opened [issue #323](https://github.com/product-on-purpose/agent-skills-toolkit/issues/323) twelve seconds later - the run was created at 12:30:52Z and the issue at 12:31:04Z. **Corrected 2026-09-27: it did not find drift.** The job never installed dependencies, so the CLI crashed on a missing `yaml` package before reading the upstream, and Node's exit 1 collided with the CLI's "a human must look" code. A local run on 2026-09-27 reported `VERDICT: unchanged` |
| ~~2026-09-18 to 09-20~~ | re-verify the two vendor probes | **SUPERSEDED.** Both probes were re-run and re-verified on **2026-09-17** (PR #327), with both `kind: "probe"` claims now reading `verifiedOn: 2026-09-17`. The window closed early and correctly |
| ~~2026-09-23/24~~ | the probes go stale and block every release | **SUPERSEDED by the re-run.** The 30-day clock restarts at 2026-09-17, so both probes go STALE on **2026-10-18** and block every release from that day. Measured, not reasoned: `npm run vendor-watch -- --today 2026-10-17` reports `9 claims: 7 hold, 0 MISSING, 0 stale, 2 unchecked` and exits 0, and `--today 2026-10-18` reports `2 stale` and exits 1. There is no boundary ambiguity to hedge: `scripts/lib/vendor-watch.mjs` parses both dates at `T00:00:00Z`, so the age is a whole number of days and `age > 30` flips on one date - a UTC date, because `scripts/vendor-watch.mjs` takes `today` from `new Date().toISOString()`, so a run in the Americas on the evening of 10-17 local already reports stale. **Do not plan a release against the last day of the window** - re-run the probes a week early, as was done this month |
| ~~2026-11-13~~ | the probes go stale and block every release | **SUPERSEDED by the re-run.** Both probes were re-run UNCHANGED on 2026-10-13 on Claude Code 2.1.296, so the 2026-10-18 date above no longer applied either. Measured then: `npm run vendor-watch -- --today 2026-11-12` reported 0 stale and `--today 2026-11-13` reported 2, but both probes were re-run UNCHANGED again on **2026-10-23** on Claude Code 2.1.310, before that date arrived, so the clock restarted and the row below is now the current one. **The separate blocker this row used to carry is CLEARED 2026-10-23:** the two-agent fixture ran, [E81 (the colon rule now names the frontmatter `name`, not the filename)](backlog/enhancements.md) SHIPPED in v1.21.0, and the retired quote claim `agent-filename-colon-excluded` is replaced by `plugin-agents-outside-skip-list`, which holds |
| ~~2026-11-23~~ | the probes go stale and block every release | **SUPERSEDED by the re-run.** Both probes were re-run UNCHANGED on 2026-10-23 on Claude Code 2.1.310, and measured then: `--today 2026-11-22` reported 0 stale and `--today 2026-11-23` reported 2. Both were re-run UNCHANGED again on **2026-10-25** ([PR #378](https://github.com/product-on-purpose/agent-skills-toolkit/pull/378)), so the clock restarted and the row below is now the current one |
| 2026-11-25 | the probes go stale and block every release | Both probes were re-run UNCHANGED on 2026-10-25 on Claude Code 2.1.310: `agents-dir-registers-every-md` via `claude plugin details`, `components-share-one-namespace` via the headless resolution reproduction in both install orders. Measured 2026-10-25: `node scripts/vendor-watch.mjs . --today 2026-11-24` reports `10 claims: 8 hold, 0 MISSING, 0 stale, 2 unchecked` and exits 0, and `--today 2026-11-25` reports 2 stale and exits 1 |
| ~~2026-11-15~~ | earliest revisit of the standards-watch gating question | **MOVED to 2026-12-15 at the earliest.** [E58 (should standards-watch gate release-ready)](backlog/enhancements.md) requires three clean SCHEDULED runs and says the count RESTARTS if any of them refuses or finds drift. The 2026-09-15 run was not clean: it crashed before reading the upstream, which proves nothing, the same as a refusal (recorded here as "found drift" until 2026-09-27). The next three scheduled runs are 10-15, 11-15 and 12-15. **The 10-15 run was clean:** run `38735137025`, `event: schedule`, `VERDICT: unchanged`. The count stands at one of three |

**A note on the probe clock, because it is the one date that can block a release with no warning.**
Until 2026-10-25 this note warned that RS-C5's ADR would mint a third probe with its own 30-day clock.
**It did not.** ADR 0064 pinned a `quote` claim, because the vendor page states the scope in a full
sentence, so the probe budget stays at two. **The next possible third probe** is the reserved-words
claim for ADV1 (portability) that ADR 0063's evidence section proposes. Minting it would start a third
independent clock, so it waits on a maintainer ruling rather than riding an implementation change.

---

# 6. Evidence still to extract

A finding whose reproduction lives only in a gitignored archive is an assertion, not a result. Two
extractions are done and two are not.

| Evidence | State |
|---|---|
| The twenty labelled `U5` descriptions behind the "passes 2 of 10 good, 8 of 10 useless" figure | **EXTRACTED.** `tests/fixtures/u5-calibration/`, running on every `npm test` |
| The `U18` boundary sizes | **EXTRACTED.** Derived from the exported constant, so the check and its test cannot disagree |
| `01-potemkin-gold` - the 33-file placeholder plugin that grades Advanced with 0 errors and 0 warnings | **EXTRACTED 2026-09-17.** `tests/fixtures/audit-corpus/potemkin-gold/`, three tests pinning the grade, running on every `npm test`. E61's headline claim is now re-run from a clean clone rather than re-verified by hand |
| `09-pin-abuse` - the fixture behind the nine-waived-checks figure | **EXTRACTED 2026-09-17.** `tests/fixtures/audit-corpus/pin-abuse/`, five tests pinning what a Standard pin buys: at pin `0.9` the tree is tier advanced, exit 0, 0 errors, 11 warnings all downgraded; re-pinned to `0.16`, `"banana"` or `"1.0"` it is tier none, exit 1, 12 errors, zero downgrades - so an unknown or malformed pin fails SAFE and only a valid-but-old pin waives anything. The audit's `build.mjs` was deliberately NOT repaired: it resolves paths against a hard-coded `audit/` root and lives in gitignored material, so repairing it produces a script nobody can run from a clean clone. Superseded detail, kept for the record: **it was NOT rebuildable.** The audit's `corpus/build.mjs` resolves paths against a hard-coded `audit/` directory at a repository root and fails after the folder was consolidated into `_local/audit/`. The nine is recorded in E62 as the AUDIT's measurement, never as one reproduced here. What WAS reproduced here on 2026-09-09: grading this repository at `"standard": "0.9"` gives 78 errors and 1 warning where its own pin gives 79 and 0 |

**CLOSED 2026-09-17.** Both fixtures are extracted and both are tested. Nothing in this table now
depends on the audit's path layout, which was the point: every figure above is re-runnable from a clean
clone with `npm test`.

---

# 7. Blocked and awaiting a ruling

**Nothing here is blocked on a Standard ruling as of 2026-10-25.** RS-E4 (the prompt-injection and
pipe-to-shell scan) was the one item, and the maintainer ruled on 2026-10-25 that it ships as an
advisory finding (ADV3) outside the tier. An advisory finding needs no `since`, no warn cap and no
Standard edition. The ruling is recorded in
[ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md).
The paragraph below is kept as history.

**One item awaits a maintainer ruling as of 2026-10-25: whether ADV1 (portability) mints a third
vendor probe.** ADR 0063's evidence section proposes a `probe` claim for the reserved name words
"anthropic" and "claude", because the platform.claude.com page states them as a bullet fragment that
cannot be quoted. A probe starts its own 30-day clock that blocks every release when it lapses, and
ADR 0064 kept the budget at two the same day. Until the maintainer rules, ADV1 pins only its two
`quote` claims, and the reserved-words screen is recorded as unverified.

**Three cut 3 items await a maintainer ruling as of 2026-10-25.** None blocks other work. Each blocks
publishing a final E13 cell.

1. **Sign or amend the E13 adjudication draft,**
   [`adjudication-2026-08-04.md`](eval-runs/adjudication-2026-08-04.md). Rule (a') makes adjudication
   mandatory on every multi-entry engagement, and a human must adjudicate. The draft covers all eleven
   worklist items. Two Opus findings need a ruling the key cannot give: index 8 (the response clock
   starts at verification rather than receipt), which the draft recommends promoting under key 1.2.0,
   and index 19 (checklist coverage of sale and sharing), which it drafts as out of scope. If either
   claim is judged false instead, it scores as a false positive. Three of the eleven items are
   single-entry, which the scorer cannot consume yet (E17 is partial), so their effect is computed by
   hand in `eval-runs.md`.
2. **Rule on RS-B1 criterion 5's scope.** The criterion names `docs/**`, which literally includes
   `docs/internal/**`, where the ruled figures already live. The published hits are
   `docs/explanation/limitations.md`, whose table still states the zero-credit figures, and
   `docs/reference/token-usage-estimates.md`. Historical `CHANGELOG.md` entries carry figures too. The
   ruling decides which surfaces count, and whether the published pages are emptied or updated once the
   cells are signed.
3. **Confirm the scope of ADR 0065's ceiling sentence.** Its Consequences say "No reported recall can
   exceed `recallAutoCeiling`", without the word "automatic". A signed human credit for the semantic
   entry `SD-06` legitimately puts a recall above the automatic ceiling. The test that pins the
   invariant is correct for automatic scores, and it should be scoped to them, rather than trimming an
   adjudication to satisfy it.

**Until 2026-10-25: RS-E4 had no Standard revision to land on.** Its spec
specifies `since: "0.16"` and `until: "0.17"`. Standard 0.16 shipped without it; 0.17 is ruled
graduations-only and opens no windows; and Standard 0.18 is named for the five-item strengthening set,
which does not include this check. A new check needs a `since` so that a plugin pinned below it is not
exposed to a rule that did not exist at its pin, and a warn cap so the revision introducing it is not
the one enforcing it. **Choosing that number is a Standard decision and is deliberately not made
here.** The catalogue - the data, the sources, the false-positive measurement - is unblocked and can
be built and measured before any number is chosen.
