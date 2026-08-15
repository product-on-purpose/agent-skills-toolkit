# 0051 - No cross-member finding graduates to the spine, and the test that decides it

## TL;DR
- **Decision:** **None of the marketplace scope's remaining seven finding classes graduates to a numbered spine check.** They keep `reqId: null`. This is a decision, not another deferral - but it is a decision about the runtimes **as they behave today**, and the one vendor change that would reopen it is named below rather than left implicit. The decision rests on a stated test - the **unilateral-remedy test** - which any future marketplace finding must also pass before it can be proposed for the spine.
- **The test:** a finding may become a numbered requirement only if the member named in it **can resolve it by editing its own repository alone, without reference to any other member and without editing the catalogue.** The spine is a contract each PLUGIN is held to individually; a requirement it cannot discharge on its own is not a requirement, it is a hostage.
- **Applied to all eight classes, exactly one passes - and it already graduated.** `A6` (restricted fields on a plugin-shipped agent) became `U14` in v1.13.0 under ADR 0045. The other seven fail: three are properties of the CATALOGUE's own manifest (`manifest`, `duplicate-name`, `rename-collision`), one is a property of the catalogue's ENTRY (`entry-resolvability`), two are properties of a PAIR of members (`skill-collision`, `command-collision`), and one is a two-party disagreement between a catalogue pin and a member's manifest (`version-agreement`).
- **The code already agrees, and nobody had noticed.** Six of the seven attribute their finding to `.claude-plugin/marketplace.json` or to a path spanning two members. A check that cannot name a single member's file as the site of the defect is telling you whose defect it is.
- **This CLOSES E34** rather than deferring it a fourth time.
- **Status:** Accepted (ratified 2026-08-14).

- **Date:** 2026-08-14
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- **ADR 0039 (marketplace-scope evaluation)** - question 3 established `reqId: null` for every marketplace finding, framed as the right call *for the release that introduces the capability*. This ADR converts that from a release-scoped decision into a principled one, and narrows it: for seven of the eight it is permanent, not provisional.
- **ADR 0034 (rooted-per-member marketplace evaluation)** - each member is graded through `runGate` rooted at that member's own directory, which is the structural expression of the same principle: the plugin contract is evaluated against one plugin at a time.
- **ADR 0045 (restricted fields on plugin-shipped agents)** - the single graduation, and the worked example of what a passing case looks like: a property of one member's own files, fixable by that member alone, backed by a vendor citation.
- **ADR 0027 (Standard versioning and compatibility policy)** - the cost this ADR declines to pay seven times.
- **E34** (`backlog/enhancements.md`), recorded 2026-08-12, retargeted to v1.14.0 on 2026-08-13 by rounds 14 and 15 of the v1.13.0 pre-implementation review after three documents disagreed about which release owned it.

## Context and problem statement

The marketplace scope emits eight finding classes, listed in `MARKETPLACE_CHECKS`, and every one carries `reqId: null`. E34 asks which should become numbered spine checks. Its own entry names the prior question and declines to answer it:

> *"'Two members collide on a skill name' is a property of a COLLECTION, and the spine is a contract each PLUGIN is held to individually; a plugin cannot fix a collision unilaterally without knowing who it is catalogued beside."*

That sentence is the answer. It has been sitting in the backlog since 2026-08-12 as a reason to defer, and it is in fact a decision procedure. What was missing was applying it to all eight and saying so.

**The scale is not the argument, but it should be on the record.** Grading the family catalogue today produces **zero** cross-member findings: `findings: []`, summary 0 errors and 0 warnings. The catalogue grades red entirely on per-member self-consistency. So the question is not "should we act on the seven findings we have"; it is "what would these classes mean if a catalogue ever produced them", and that is a question about the contract rather than about a number.

## Decision drivers

- The spine is the set of requirements a plugin is graded against **on its own**. `check.mjs <dir>` is the primary way anyone runs this gate, and it has exactly one plugin in scope.
- A requirement a subject cannot discharge is unusable. It converts the gate from a thing an author can pass into a thing an author's neighbours decide.
- Every graduation costs a Standard minor and a migration window for every consumer, so seven of them is seven bumps for findings the family has never once produced.
- ADR 0044's trust step assumes a subject can be held responsible for its own verdict. A finding a subject cannot influence sits badly with that whole apparatus.

## Considered options

**Option A - graduate the set wholesale, since a Standard minor is being bumped anyway.** This is the reasoning the backlog explicitly warns against: *"graduating the set wholesale to extract a Standard bump's worth of value from one release is exactly the reasoning that should not decide it."* Rejected, and named here so it stays rejected.

**Option B - graduate the two collision classes, since collisions are the most objective of the eight.** Objectivity is real and it is not the criterion. `skill-collision` is perfectly deterministic and perfectly unfixable by either party alone: two members ship `skills/review/`, neither is wrong, and the Standard has no rule for which of them must yield. A numbered requirement would fail both members for a condition created by a third party's catalogue. **Rejected on the unilateral-remedy test**, and it is the case that makes the test worth stating, because it is the one where "it is objective, so it should be a check" is most tempting.

**Option C - graduate `version-agreement`, since a member controls its own version.** The closest call of the seven, and still rejected. The disagreement is between the catalogue's `declaredVersion` and the member's `library.json` version. A member bumping its version to match the pin does not resolve the defect; it moves it, because the pin is a claim the catalogue made about a release. The finding's own message says so: *"either the member released without its registry pin moving, or the pin moved past a release that never shipped"* - two causes, one of them wholly the catalogue's. **The code already attributes the finding to `.claude-plugin/marketplace.json`.**

**Option D - defer again pending more evidence.** Rejected. E34 has been deferred three times and the deferral has twice caused documents to disagree about which release owns it. There is no measurement that would change the answer: the argument is about what the spine IS, not about how often these findings occur.

**Option E (chosen) - state the test, apply it to all eight, and close the entry.**

## Decision outcome

**1. The unilateral-remedy test is ratified as the criterion for spine membership of any marketplace-scope finding.**

> A marketplace-scope finding may be proposed as a numbered spine check only if the member named in it can resolve it by editing its own repository alone, without reference to any other member and without editing the catalogue.

**2. Applied to all eight classes:**

| Class | Whose defect | Can the named member fix it alone? | Verdict |
|---|---|---|---|
| `marketplace-manifest` | the catalogue's manifest shape | no - it is not a member's file | **stays scope-local** |
| `marketplace-entry-resolvability` | the catalogue's entry | no - the entry is the catalogue's | **stays scope-local** |
| `marketplace-duplicate-name` | two catalogue entries | no - the catalogue wrote both | **stays scope-local** |
| `marketplace-rename-collision` | the catalogue's `renames` | no - `renames` is a catalogue field | **stays scope-local** |
| `marketplace-skill-collision` | a PAIR of members | no - neither is wrong; the Standard names no yielder | **stays scope-local** |
| `marketplace-command-collision` | a PAIR of members | no - same | **stays scope-local** |
| `marketplace-version-agreement` | a catalogue pin vs a member manifest | no - two parties, one of them the catalogue | **stays scope-local** |
| `marketplace-agent-restricted-fields` (`A6`) | one member's own agent file | **yes** | **graduated, v1.13.0, ADR 0045** |

**3. The seven keep `reqId: null`.** They remain real, gate-affecting findings **within** marketplace scope, where the subject being graded is the catalogue. Nothing about their severity, their detection or their effect on the collection verdict changes. What is decided is that they are not a requirement laid on an individual plugin.

**3a. The one thing that would reopen this, named so nobody has to derive it.** Two of the seven - `skill-collision` and `command-collision` - fail the test because component names enter a **shared pool** on any agent that does not namespace by plugin. That is a **runtime behaviour**, not a law. `collisionsOver`'s own comment says so: *"on any agent that does not namespace components by plugin they occupy one name in a shared pool, and which one wins is undefined."*

- **If a runtime starts namespacing components by plugin**, the collision stops being a defect at all and these two classes should be **retired**, not graduated.
- **If a runtime flattens harder** - or if the Standard ever gains a rule naming which member must yield - a member could resolve a collision unilaterally, and these two would then **pass the test** and become eligible.

The other five do not depend on runtime behaviour: `manifest`, `entry-resolvability`, `duplicate-name` and `rename-collision` are properties of a file the member does not own, and `version-agreement` is a two-party disagreement. No vendor change makes a member the owner of a catalogue's file. **For those five the decision is unconditional.**

`askit-standards-watch` should carry component-namespacing as a watched behaviour, because it is the trigger for revisiting this and nothing else in the repository is looking for it.

**4. The file each finding names is ratified as evidence of ownership, not a formatting detail.** `versionAgreement` reports on `.claude-plugin/marketplace.json`; `collisionsOver` reports on a bare `skills/<name>` path that belongs to no single member; `agentRestrictedFields` reports on `agents/<name>.md` **inside a named member**, which is the one that graduated. A future finding whose `file` cannot be a path inside exactly one member's tree has already failed the test.

**5. The advisory analyses are out of scope and stay out.** `triggerSurfaceOverlap`, `commandSkillDivergence` and `contentLineage` are advisory by construction - each encodes a judgment about intent - and the deterministic spine does not take judgments. This is stated so "advisory" is not later read as "not graduated yet".

**6. E34 is CLOSED, not deferred.**

## Consequences

- **The Standard does not grow for this, in 0.14 or later.** Seven graduations avoided is seven migration windows every consumer does not have to absorb for findings the family has produced zero of.
- **A real gap is accepted and named.** No plugin is *required* to be free of a cross-member collision, and that stays true for as long as the runtimes share one component pool. A catalogue owner who cares learns it from the collection report. An author cannot be told "your skill name collides" as a conformance failure, because at the moment they are graded there is nothing to collide with.
- **E34 is closed with a stated reopening condition, which is the difference between a decision and a deferral.** A deferral is "not yet, and we do not know what would change it." This is "no, and here is exactly what would change it." The distinction matters because E34 has been deferred three times and twice caused documents to disagree about which release owned it; a condition someone can check is what stops a fourth round.
- **The test constrains future work, which is its main value.** Anyone adding a ninth marketplace finding now has to answer the ownership question before the severity question. The eight existing classes are the worked examples.
- **`A6`'s graduation reads differently in hindsight, and better.** It was not "the first of eight"; it was the only one that was ever eligible. The backlog entry for E33 framed it as narrow-because-of-release-timing, and this ADR says it was narrow because it was the only member-owned reading in the set.
- **The advisory analyses gain a permanent status rather than an implied waiting room.**
- **One thing this ADR does NOT decide** is whether the marketplace scope should gain more findings of the catalogue-owned kind. It should, probably - `E36` is one - and the test is silent on that, because the test is about spine membership, not about scope coverage.

## Implementation sites
- `scripts/lib/marketplace/analyze.mjs` - the `MARKETPLACE_CHECKS` block gains the test and the table above as its governing comment, and `mkFinding`'s hard-coded `reqId: null` gains the sentence that makes it a decision rather than a default. It is the single place a future contributor would try to change.
- `STANDARD.md` sec 12 (marketplace) - a paragraph stating that catalogue-level findings are not plugin requirements, and why. This is the reader-facing half: today a consumer reading sec 12 cannot tell whether a collision is something they will one day be graded on.
- `docs/reference/marketplace-scope.md` - the same statement for the reference audience, beside the existing description of the eight classes.
- `docs/internal/backlog/enhancements.md` - E34 marked RESOLVED with the test recorded, and the correction that its own prior question was the answer rather than a blocker.
- `tests/unit/marketplace-scope.test.mjs` - a test asserting **every** finding from `analyze.mjs` carries `reqId: null`, iterating the emitters rather than a hard-coded list, so adding a ninth class with a reqId fails CI and forces the author to meet this ADR.
- `tests/unit/registry-sync.test.mjs` - unchanged, and that is the point: the spine count does not move.

Grep anchor: `MARKETPLACE_CHECKS` in `scripts/lib/marketplace/analyze.mjs`.
