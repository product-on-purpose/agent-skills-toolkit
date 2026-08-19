# 0052 - A catalogue manifest no scope can read is a defect, and mixing entry kinds is one of them

## TL;DR
- **Decision:** a new Universal check, **`U17` (`catalogue-manifest-shape`)**, over `.claude-plugin/marketplace.json` where it is present. Three branches: the file is present but does not **parse**; it parses but carries no `plugins` array; or it **MIXES** entry kinds, some resolving under `skills/` and some not. E36 asks whether a mixed manifest is legal, and the answer is **(c) - it is itself a defect.**
- **It ships WARN-ONLY at Standard 0.14 and gates at 0.15**, because a census found it is a **preventive** check rather than a corrective one (below). Mechanically this makes it the first check to carry `since` and `until` **simultaneously**: `since: "0.14"` plus finding-level `migration: { capAt: "warn", until: "0.15" }`, so the finding emits `error` and is held at `warn` at every pin below 0.15.
- **Why:** both cases reproduce exactly as filed. A present-but-unparseable manifest produces **zero findings from anybody**: marketplace scope declines it (it cannot read it), `U13` swallows the parse error by design (R-REG-5), and the directory grades as a plugin with nothing said about the broken file. A mixed manifest is claimed **entirely** by `U13`, because `looksLikeMarketplaceOfSkills` returns true if **any** entry resolves under `skills/` - so its plugin entries are never collection-graded. Measured on a fixture: `scope: plugin, members analysed: 0`, with a real sibling plugin catalogued and invisible.
- **Blast radius: zero on the family, measured.** `pm-skills` carries the embedded marketplace the code documents as a live instance; its manifest parses and is not mixed, so nothing moves.
- **A census of every real manifest says this check is preventive, and that is why it does not gate at 0.14.** Across the seven pinned corpora, all six family members and `agent-plugins`: **7 manifests, 6 of-plugins, 1 of-skills, 0 mixed, 0 malformed.** Both branches have zero observed instances. They were found by adversarial review of the routing logic, not by observing a target.
- **This passes ADR 0051's unilateral-remedy test**, which is why it is eligible for the spine at all: the manifest is the graded directory's own file, and its owner can fix it alone.
- **Status:** Accepted (ratified 2026-08-14).

- **Date:** 2026-08-14
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- **ADR 0051 (no cross-member finding graduates to the spine)** - supplies the eligibility test this check passes. E34 and E36 look like the same subject and are opposites: E34's findings are about a catalogue's relationship to OTHER repositories, and this one is about a file in the graded directory itself.
- **ADR 0039 (marketplace-scope evaluation)** - established the disjointness between marketplace scope and `U13`. E36's root cause, in the backlog's own words: *"the disjointness rule between marketplace scope and `U13` is a clean partition of the WELL-FORMED cases and says nothing about the rest."*
- **ADR 0044 (one post-resolution Standard ceiling)** - `since: "0.14"` is the migration.
- **ADR 0027 (Standard versioning and compatibility policy)** - a new numbered check, so the Standard minor moves.
- **Standard sec 12** (distribution and marketplaces) - the separation rule, and the source of the "one manifest, one kind" reading.
- **E36** (`backlog/enhancements.md`), recorded 2026-08-12 from the v1.12.0 pre-release adversarial review.

## Context and problem statement

Two scopes can claim a `.claude-plugin/marketplace.json`. `detectMarketplaceScope` claims it when it parses, has a `plugins` array, **no** entry resolves under `skills/`, and the directory ships no components of its own. `U13`'s `resolveRegistrationSource` claims it, at rung 2, exactly when at least one source resolves under `skills/`. The code says so explicitly: *"One rule, expressed once, so the two can never both claim one manifest."*

That is a clean partition of the well-formed cases. Neither scope claims the rest.

**Case 1 - malformed, reproduced.** A plugin-shaped directory carrying an unparseable `.claude-plugin/marketplace.json`:

- `detectMarketplaceScope` returns false at `m.data == null`. Marketplace scope declines.
- `U13` rung 2 wraps `JSON.parse` in `try {} catch { /* absent or malformed -> fall through (R-REG-5: never throw) */ }`. It falls through.
- The directory grades as a plugin. Measured: **0 findings mention the manifest**, `errorCount` 0.

Both behaviours are individually correct and deliberate. `U13` must not throw on a broken file, and marketplace scope must not grade a catalogue it cannot read. Their conjunction is the hole.

**Case 2 - mixed, reproduced.** A manifest with two entries, one `./skills/local-helper` and one `../member-a`:

- `looksLikeMarketplaceOfSkills` returns **true**, because ANY entry resolving under `skills/` is sufficient.
- `detectMarketplaceScope` therefore returns **false**. The whole directory routes to plugin scope.
- `U13` claims the manifest and does its job correctly, reporting the on-disk skill the catalogue does not list.
- `member-a`, a real sibling plugin the author deliberately catalogued, is **never collection-graded**. Measured: `scope: plugin, members analysed: 0`.

The author wrote a catalogue entry and nothing ever looks at it. That is the `U14` defect class again - a declaration made, and no signal that nothing reads it - which is now the third instance in this pack.

## Decision drivers

- A present file that no scope can read is worse than an absent one, because the author believes it is doing something.
- The two scopes' disjointness rule is correct and must not be weakened. A fix that makes both scopes claim one manifest trades a hole for an ambiguity.
- Whatever ships must not move an existing verdict, and `pm-skills` carries a live embedded marketplace that the code already goes out of its way not to disturb.
- E36 names three candidate answers for the mixed case, and picking one is the prerequisite. It cannot be patched around.

## Considered options

**For the mixed case, E36's own three:**

**(a) Legal and gradeable by both.** Rejected. It requires running marketplace scope and plugin scope over one directory, which contradicts the rooted-per-member design of ADR 0034 and destroys the disjointness invariant `detectMarketplaceScope` and `resolveRegistrationSource` were written as a matched pair to preserve. It also has no defined aggregation: a directory would have two verdicts and no rule for combining them.

**(b) Legal and owned by exactly one.** This is the status quo, and the measurement is the argument against it. It IS owned by exactly one - `U13` - and the consequence is that half the manifest is silently ignored. "Owned by one" only works when the one owner can see the whole file.

**(c) Itself a defect (chosen).** Sec 12's separation rule is the ground: a marketplace catalogues plugins and a catalogue of a directory's own skills is a different artifact serving a different reader. A file trying to be both cannot be served by tooling that has one reading per file, and the remediation is concrete and cheap - split it, or make every entry one kind.

**For the malformed case:**

**Option A - have `U13` report the parse error instead of falling through.** Rejected: R-REG-5 exists so a broken read never throws inside a registration check, and `U13`'s subject is registration completeness, not file validity. It would also mean `U13` reports on a file it has decided it cannot use.

**Option B - have marketplace scope report it.** Rejected: marketplace scope has already declined the directory, so it is not running. Making it run in order to report that it cannot run is a scope that claims everything.

**Option C - a subrule under `U8` (manifest-drift).** Rejected on subject: `U8` asserts that the **generated** native manifests agree with `library.json`, and `marketplace.json` is neither generated from `library.json` nor compared against it. Filing this under `U8` would make its name false.

**Option D (chosen) - a new Universal check that owns the catalogue manifest's SHAPE**, independent of which scope goes on to read it. Both the malformed and the mixed branch are questions about the file itself, they have the same remediation shape, and neither belongs to a scope that is by definition not running.

## Decision outcome

**1. A new Universal check, `U17` (`catalogue-manifest-shape`).** It runs where `.claude-plugin/marketplace.json` exists and is vacuous otherwise.

**2. Three branches, all emitting `error`:**
- **Unparseable.** The parser's own message is quoted (truncated), because "does not parse" without a position is unactionable on a large file.
- **No `plugins` array.** A catalogue with no entry list is read by no scope, for the same reason.
- **Mixed.** Reported with both counts - how many entries resolve under `skills/` and how many do not - and the remediation is to split it into one manifest per kind. The message names why: a catalogue of skills is read by `U13`, a catalogue of plugins by marketplace scope, and a mixed one is claimed entirely by the first.

**3. Provenance is `objective`.** Whether a file parses is the most objective property in the codebase, and the mixed condition is a string comparison over declared sources. Under ADR 0044's trust step, a subject-owned setting cannot weaken it in `published-verdict` mode, which is right for a fact about a file.

**4. `since: "0.14"` AND finding-level `migration: { capAt: "warn", until: "0.15" }`, both at once.** This is the mechanical expression of "warn-only at 0.14, gates at 0.15", and it is the first check in the spine to carry both constraints. `since` alone would gate the moment a consumer adopts 0.14, which is wrong for a preventive check; `until` alone would leave a plugin pinned below 0.14 exposed to a check that did not exist at its pin.

**Verified across three pins on a fixture rather than reasoned about:**

| pin | emitted | resolved | ceiling `due` | gate errors |
|---|---|---|---|---|
| 0.13 | `error` | `warn` | 0.15 | 0 |
| 0.14 | `error` | `warn` | 0.15 | 0 |
| 0.15 | `error` | `error` | none | 1 |

Note the reported `due` is **0.15 at pin 0.13**, where both constraints are active at once. That is ADR 0044 point 2's stated behaviour - *"the reported `due` is the maximum across it"* - and this is its first live case. A singular cause would have reported the finding due at 0.14 while it is in fact capped until 0.15.

**4a. Why warn-first rather than gating, stated as the decision it is.** The census below found zero instances of either branch in seven real manifests. `U15` and `U16` are corrective: they name defects that exist in the family today. `U17` is preventive: it pays back only if someone later writes a manifest nobody has written yet. That is a worthwhile bet - the routing hole is real and silent - but it is a different bet, and it does not warrant spending gate-failing severity in the minor that introduces it. ADR 0027's warn-first burndown is the default for a new requirement, and this is the case that default was written for.

**5. Neither `detectMarketplaceScope` nor `resolveRegistrationSource` changes.** The disjointness rule stays exactly as written. `U17` reports the cases the partition does not cover; it does not extend the partition to cover them. This is deliberate and is the difference between this design and Option (a).

**6. `U17` does NOT decide whether a marketplace-of-skills is legal.** `resolveRegistrationSource` rung 2 exists to support that shape, `deanpeters/Product-Manager-Skills` is a live corpus instance of it, and sec 12's "a plugin MUST NOT embed a marketplace that lists itself" arguably bears on it. That is a larger question with a real population and it is deliberately left open, so this ADR is not read as having settled it in passing.

**7. `pm-skills`' embedded marketplace is untouched, and this is checked rather than assumed.** Its manifest parses and its single self-pointing entry does not resolve under `skills/`, so it is not mixed. `detectMarketplaceScope`'s third condition keeps it in plugin scope, as ADR 0039 intended. `U17` adds nothing to it.

## Consequences

- **Blast radius: zero on the family, measured before and after.** No member's verdict, tier, error count, warning count, per-check census or Standard debt moved. The only diff entries were this repository's own `G8` and `G9` on the prototype file, which is the third time in this pack that adding a file under `scripts/checks/` has been the loudest thing in the measurement.
- **The spine moves again.** With `U15` (ADR 0046) and `U16` (ADR 0050), `U17` takes it to **34**, from 31. That is three new Universal checks in one Standard minor. **The maintainer decided on 2026-08-14 that all three land together in 0.14** rather than staging across 0.14 and 0.15, on the grounds that all three measured zero-or-windowed on the family and one migration is cheaper for consumers than two. Recorded here because the alternative was live and the reasoning should not have to be reconstructed.
- **An unpinned plugin gets no window here either**, and the fixtures show it: the malformed fixture pins 0.13 and its finding is held at `warn`, while the mixed fixture has no `library.json` and takes the error immediately. That is ADR 0044's stated and deliberate consequence, observed rather than restated.
- **The 0.15 graduation must be scheduled, not remembered.** The whole reason ADR 0044 exists is that `U13`'s graduation lived in a hand-edited constant *"whose own comment conceded the gap - a promise kept by someone remembering, in two files, with no test that failed if they did not."* `U17`'s graduation is data in the finding's `migration` metadata, so it fires when a consumer reaches 0.15 with nobody editing anything. The only human obligation is the 0.15 version note.
- **Whether the graduation should happen at all is a decision for 0.15, with evidence.** If the census still shows zero mixed and zero malformed manifests when 0.15 is cut, gating a check nothing has ever tripped is worth re-examining rather than doing by default. Re-run the manifest census before graduating.
- **A real gap stays open by decision:** the marketplace-of-skills shape's legality under sec 12. Named in outcome 6 so it is on the record as untouched rather than resolved.
- **The `U13` fall-through comment becomes load-bearing documentation.** `/* absent or malformed -> fall through (R-REG-5: never throw) */` is correct and now has a named partner; it should say which check owns the case it declines, or the next reviewer reads it as the hole rather than as half of the fix.
- **A mixed manifest that an author intended is now a failing gate.** If catalogues mixing kinds turn out to be a real pattern in the wild rather than a mistake, this decision is the thing to revisit; no corpus evidence of the pattern was found, but none was specifically sought either, and that is a limit of this measurement rather than a finding.

## Implementation sites
- `scripts/checks/catalogue-manifest-shape.mjs` - **new check**. `meta = { id: "catalogue-manifest-shape", tier: "universal", reqId: "U17", since: "0.14", provenance: "objective" }`, plus a module-level `CATALOGUE_SHAPE_MIGRATION = { capAt: "warn", until: "0.15", reason: ... }` carried on every finding. The `reason` MUST be **activation-neutral** - it states what the migration is about and never claims a cap is currently in force - because under `--strict` the pin is undefined, nothing binds, and the finding is a live error while this metadata is still visible in `--json`. That trap was caught by round 17 of the v1.13.0 review on `U1`'s `selfValidation` subrule and is recorded in E35. It reads and parses the file itself rather than taking it from `ctx`, because the loader does not carry `marketplace.json` and adding it there would put a catalogue artifact into the plugin context for one consumer.
- `scripts/lib/marketplace/manifest.mjs` - the `underSkills` predicate must be the SAME function `looksLikeMarketplaceOfSkills` uses, imported rather than reimplemented. Two copies of "does this source resolve under `skills/`" is how the mixed case became invisible in the first place, and a second copy would let `U17` and the router disagree about what mixed means.
- `scripts/lib/registry.mjs` - the import and the `CHECKS` entry.
- `scripts/checks/skill-registration.mjs` - the R-REG-5 fall-through comment names `U17` as the owner of the case it declines.
- `scripts/lib/marketplace/evaluate-marketplace.mjs` - `detectMarketplaceScope`'s docblock, whose closing paragraph currently reads *"A malformed or absent manifest is not this scope's target either... the JSON problem surfaces there"* - which was not true and now is.
- `STANDARD.md` sec 12 - the one-manifest-one-kind rule stated normatively, and the 0.14 version note.
- `docs/reference/marketplace-scope.md` - the reader-facing statement of which scope reads which manifest shape, and what a mixed one is.
- `tests/unit/catalogue-manifest-shape.test.mjs` - **new**: unparseable reports with the parser message; no `plugins` array reports; a pure marketplace-of-skills reports nothing; a pure marketplace-of-plugins reports nothing; mixed reports with both counts; an absent file reports nothing; `pm-skills`' self-pointing single entry shape reports nothing. **Plus the three-pin table above as three assertions** - resolved `warn` at 0.13, resolved `warn` at 0.14, resolved `error` at 0.15 - because "warn-only at 0.14" is the decision and a test that only checks the emitted severity would pass with either constraint missing.
- `tests/unit/registry-sync.test.mjs`, `tests/unit/compatibility-matrix.test.mjs` - the count, and a matrix row naming the wrong implementation it kills: reimplementing the `skills/` predicate instead of importing it, which lets `U17` and the scope router disagree about which manifests are mixed.

Grep anchor: `catalogue-manifest-shape` in `scripts/checks/`, and `looksLikeMarketplaceOfSkills` in `scripts/lib/marketplace/manifest.mjs`.

## Graduation decision, 2026-08-18: `U17` gates at 0.15, and the census still argues against it

**The decision above is unchanged.** This section discharges the obligation the Consequences section
reserved: *"Whether the graduation should happen at all is a decision for 0.15, with evidence. If the
census still shows zero mixed and zero malformed manifests when 0.15 is cut, gating a check nothing has
ever tripped is worth re-examining rather than doing by default. Re-run the manifest census before
graduating."*

**The census was re-run on 2026-08-18, across the same population: the seven pinned corpora, all six
family members, and the `agent-plugins` registry.**

| | 2026-08-14 | 2026-08-18 |
| --- | --- | --- |
| Manifests at `<root>/.claude-plugin/marketplace.json` | 7 | **7** |
| of-plugins | 6 | **6** |
| of-skills | 1 | **1** |
| **mixed** | **0** | **0** |
| **malformed** | **0** | **0** |
| entries with no usable source | not measured separately | **0** |

**Unchanged in every cell. `U17` is still preventive, not corrective, and the re-examination this ADR
asked for is therefore live rather than pro forma.**

**The decision: graduate at 0.15 anyway.** The reasoning is not that the census was ignored, but that the
alternative is worse than it appears once stated precisely.

**Nothing in any plan schedules corpus growth**, so the census will read the same at 0.16, and the same
evidence will defeat graduation again, and again. "Extend the window to 0.16" is therefore not a deferral
with a terminating condition; it is a decision that `U17` never gates, taken without saying so and without
the ADR such a decision would need. The two coherent options are **graduate at 0.15** or **demote `U17` to
permanently advisory**, and the second contradicts the warn-first design this ADR ratified.

Between those two:

- **Graduating costs zero on every measured subject.** Zero `U17` findings across all six family members
  at their own pins, and zero mixed or malformed manifests in the census population.
- **Extending protects zero subjects**, for the same reason. Nobody is currently holding the warn.
- **The only party either choice reaches is a future author of a manifest no tool will read**, and for
  that author `error` is the honest severity. The finding is not a style preference; it is "nothing will
  ever look at this file you wrote."
- **The maintainer's own reasoning from 2026-08-14 applies unchanged**: all three checks landed together
  in 0.14 rather than staging across two minors because **one migration is cheaper for consumers than
  two**. Creating a second graduation event for `U17` alone would spend exactly what that decision saved.

**One coverage fact the first census did not record, and it is not a defect.** An eighth `marketplace.json`
exists in the population, inside a release-plan skeleton directory in `pm-skills`. `U17` never sees it,
because the check reads exactly `<ctx.root>/.claude-plugin/marketplace.json` and nothing else. That is
correct and intended behaviour. It is recorded here so the number is read as *"7 manifests `U17`
inspects"* rather than *"7 manifests exist"*, which is a materially different claim.

**The graduation needs no code change, exactly as this ADR predicted.** `until: "0.15"` is already
committed in the check module and the ADR 0044 ceiling resolves it. Verified 2026-08-18 by building each
failing shape at four pins: `warn` at 0.13, `warn` at 0.14, **`error` at 0.15**, and `error` immediately
for a plugin carrying no pin at all. The human obligation was the 0.15 version note, and this section.

**The reopening condition stays exactly as this ADR wrote it**, and is worth restating because it is now
the only thing that would reverse this: *"If catalogues mixing kinds turn out to be a real pattern in the
wild rather than a mistake, this decision is the thing to revisit."*
