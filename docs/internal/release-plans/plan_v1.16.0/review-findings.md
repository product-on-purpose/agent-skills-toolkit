---
title: "v1.16.0 review findings - the ledger, and what each wave was pointed at"
---

# v1.16.0 review findings

Findings against the v1.16.0 implementation (`v1.15.0..HEAD`, 49 files, ~1677 insertions). Acceptance criterion 7 requires **two adversarial review waves, the second pointed away from the first.**

**Findings are ANNOTATED, never rewritten.** A finding is the evidence of what was wrong; a finding edited to describe its own fix stops being that. A closed finding keeps its original text and gains a dated closure note underneath.

## What each wave was pointed at, and why they differ

The criterion's phrase is "the second pointed away from the first", so the two waves were given **different failure classes** rather than the same brief twice.

| Wave | Lens | Hunts |
| --- | --- | --- |
| **1** | **Mechanical breakage** | a reader the migration missed; a check that now passes without checking; drift the new guard would not catch; whether the `G8` change can touch a graded plugin |
| **2** | **False statements in the records** | every document in the range makes claims; find one that is FALSE, and show it |

**They are run as separate processes with no shared context**, so neither can inherit the other's blind spots.

## The instrument, and what had to be fixed before it would run at all

**Both waves run through the Codex harness, which could not execute anything until 2026-08-22.**

`~/.codex/config.toml` carried `[windows] sandbox = "elevated"`. That mode runs every command as a separate local Windows user (`CodexSandboxOffline` / `CodexSandboxOnline`) against an explicit allowlist of readable and writable folders - and **every setup on this machine logged `processed 0 write roots`.** So reads passed and writes failed. On 2026-08-20 that produced **15 failures in 78 spawns**, all of them writers (`npm test`, `node --test`, the evaluate and check scripts), while `Get-Location` and `echo hi` succeeded.

**The failure lied about its cause.** A refused write surfaces as `pwsh.exe ... (exit code 1)`, indistinguishable from a test suite that genuinely failed. Codex then fell back to reviewing the **pushed** copy over its GitHub connector rather than the working tree, and a dead job reported `status: running` for 67 minutes.

**Fixed 2026-08-22 by the maintainer's decision:** `sandbox = "unelevated"`, one line, backup at `config.toml.bak-2026-08-22-before-sandbox-flip`. Proved by writing and reading back a file through `codex exec` before either wave was launched - the exact operation that failed before.

**A second harness defect surfaced during the waves and is recorded because it will recur.** Two waves launched concurrently both died: one with `code-mode host exited during handshake` on four attempts, the other hanging on `Reading additional input from stdin...`. A minimal single probe in the same directory succeeded in 1327ms immediately afterward. **The harness fails quietly under concurrency and under a detached stdin**, so waves must be run **one at a time with stdin closed** (`< /dev/null`). Neither failure mode produces an error that names its own cause.

## Findings

### S1 - `tier-basis.md` states the wrong count of pinned boundaries

**Found by self-review on 2026-08-22, before either wave reported.** Recorded here rather than quietly corrected, because a false number in a file whose entire job is holding true ones is exactly the defect class this release exists to surface.

**The false statement**, `foundation/synthesis/tier-basis.md` summary table:

> `| Boundaries resting on a **pinned** claim | **8** |`

**What is actually true: 9.** Counting the rows: Universal contributes 7 (skills-are-portable, references-and-assets, `U14`, `U14`'s remediation list, `U15`, `U15`'s recursion invariant, `isRuntimeAgentFile`'s width), Convergent contributes 2 (commands-on-Claude-Code, the namespace probe), Advanced contributes 0. Nine. The `unverified` count (11) and the house count (3) are correct, and 9 + 11 + 3 = 23 rows, which matches.

**The cause is worth more than the correction.** There are exactly **8 pinned CLAIMS** in `vendor-claims.json` - a true statement, made three times in the same file. There are **9 pinned BOUNDARIES**, because several boundaries rest on the same claim and one rests on `upstream-pin.json` rather than `vendor-claims.json` at all. **Two counts of different things, both plausibly "8", and the summary asserted the wrong one.**

**How it was caught, and how it was not.** Re-reading the file does not surface it: the summary reads as a natural consequence of the prose above it. It was caught by **counting the rows programmatically** and comparing. This is the "verify, do not notice" rule applied to a document's own arithmetic.

> **CLOSED 2026-08-22.** The summary row reads **9**. Both files that stated the tally are corrected (`tier-basis.md`, `foundation/synthesis/README.md`), and `tier-basis.md` gains a dated blockquote stating the 8-claims / 9-boundaries distinction explicitly, so the next reader cannot repeat the conflation. The `unverified` and house counts were verified unchanged rather than assumed.

### S2 - the migration broke exactly one link, in a document it deliberately left alone

**Found by self-review on 2026-08-22**, by resolving every relative link in all 578 tracked markdown files **at `v1.15.0` and at `HEAD` and diffing the two sets.** 47 links were already broken at the tag; **48 are broken now; the difference is one.**

**The break**, `docs/internal/release-plans/plan_v1.15.0/RELEASE-PLAN.md`:

> `refreshing verifiedOn in [vendor-claims.json](../../vendor-watch/vendor-claims.json)`

`vendor-claims.json` moved to `foundation/claims/` in W2 step 1, so that target no longer exists.

**The reasoning that produced it was explicitly considered and was wrong.** During W2 step 1 this exact line was seen and skipped, on the grounds that the v1.15.0 packet is a dated record and the supersede convention forbids rewriting one. **That conflated two different things in one line.** The *sentence* is a dated record and must not change. The *link target* is navigation, and navigation should point at where the file actually is. Preserving a link to a path that no longer exists preserves nothing; it just breaks the reader's next click.

**The rule, stated so it is reusable:** when a record is superseded, its CLAIMS are frozen and its LINKS are not.

**Why the gate did not catch it.** `U6` (`reference-links`) does not evaluate `docs/internal/`, which is deliberate - that tree is maintainer working material. So nothing in the shipped gate resolves links there, and nothing will next time either.

**The measurement matters as much as the finding.** A naive run of the same checker reports **87** broken links, of which roughly one is actionable: the rest are placeholder text in prose (`(url)`, `(path)`, `(name)`), regex fragments inside ADRs about link-checking, and `tests/fixtures/anti/**` whose links are broken **on purpose**. Reporting 87 would have been a guard reporting defects that are not there. **The signal came from diffing before against after, not from the absolute count.**

> **CLOSED 2026-08-22.** The link now targets `../../../../foundation/claims/vendor-claims.json`; the sentence around it is untouched. Re-measured after the fix: **47 broken at `v1.15.0`, 47 at `HEAD`, difference zero.**

### S3 - a source record broke the rule its own folder states

**Found by self-review on 2026-08-22**, by cross-checking every `verifiedOn` in `vendor-claims.json` against the text of `foundation/sources/claude-code.md`. Three of the eight claim dates (**2026-08-16**) appeared nowhere in the record at all.

**The rule the record breaks is written one directory up**, in `foundation/sources/README.md`:

> Every source record carries **what was read, which version, when, and by what means**.

`claude-code.md`'s "Pages read" table carried the page, the `method`, and what depends on it. **It carried no date, and it named no claim id** - so "when" was absent for six of the eight claims, and a reader had no handle to go find it with. The two `probe` claims were fine; they carry full dated run logs further down. **It is the quiet, well-behaved rows that were missing their evidence.**

**Why this is not a nitpick.** The entire argument for the `method` field is that a reader deciding whether to trust a six-week-old entry needs to know its age and its instrument. A table giving the instrument and withholding the age answers half the question while looking complete.

> **CLOSED 2026-08-22.** The table gains a column naming each page's claims **with each claim's own `verifiedOn`**, and a sentence stating that these dates are copies which will go stale, that `vendor-claims.json` is authoritative, and that a disagreement means the table is wrong. Verified against the JSON after the edit: all eight claim dates now appear.

## Wave 1 - mechanical breakage

**Ran 2026-08-22** through `codex exec`, alone and with stdin closed, over `v1.15.0..HEAD`. **Seven findings: one HIGH, three MEDIUM, three LOW.** Every one was independently reproduced here before being acted on, per the rule that a review's first reported defect is a suspect rather than a result.

**Two of the seven independently corroborate `S1` and `S2` above** (`W1-5` and `W1-4`), which were found by self-review before the wave reported. That agreement is worth recording: two instruments, run separately, reached the same two findings.

### W1-1 - HIGH. `G8` was made to grade other people's plugins on this repository's private layout

**The defect.** W2 added `foundation`, `foundation/claims`, `foundation/sources` and `foundation/synthesis` to `FIXED_ROOTS` in `scripts/checks/folder-readme.mjs`. **`G8` is a SPINE check.** It runs against every plugin the gate grades, and `resolveFolders` scopes entries by directory existence alone, with no notion of repository identity. So **any third-party plugin that happens to use a folder named `foundation/` now takes a gate-failing error** demanding a README with an inventory - a requirement invented for this repository's evidence tree.

**Reproduced here**, with a throwaway plugin containing `.claude-plugin/plugin.json`, one skill, and an empty `foundation/`:

> `[error/house] folder-readme (G8): meaningful folder has no README.md (ADR 0024 D1.1)  -> foundation/README.md`

**It contradicts the release's own plan**, which states `no new spine check` and `no verdict movement for any plugin`, and **ADR 0055's own boundary**: *"W4 adds exactly one guard, and it guards the matrix rather than graded plugins."*

**The worst part is the evidence that was offered for it.** The W2 commit and PR both said:

> *"Entries apply only where the folder EXISTS, so no other plugin is affected. **Measured rather than argued**: all six registry members were graded before and after and no tier, error count or warning count moved."*

**The measurement is true and it does not support the claim.** None of the six members has a `foundation/` folder, so nothing could move; the run says nothing whatever about plugins that do. **A narrower question was answered than the one asked, and the word "measured" made it read as settled.** This is the same failure shape as a check that passes because it looked at nothing.

> **CLOSED 2026-08-22.** The `FIXED_ROOTS` addition is **reverted**; a third-party plugin with a `foundation/` folder now produces zero findings mentioning it, verified with the same throwaway plugin. The guard it provided is not lost: `G8`'s semantics (frontmatter title, an `## Inventory`, children set-equal to what is on disk) are reimplemented in `tests/unit/capability-matrix-drift.test.mjs`, which grades exactly one repository - this one. Shown failing: removing `sources/` from `foundation/README.md`'s inventory produces `child "sources" is on disk but not in the inventory`, green on restore. A negative test covering both an unlisted child and a phantom entry is now standing.

### W1-2 - MEDIUM. The new guard passed real matrix drift, in two different ways

**2a. The `Tier path` table omitted `statusline`.** `STANDARD.md` sec 2.3 names *"Hooks..., output styles, statusline, and full self-hosting CI"*; the matrix's `Tier path` row for Advanced read *"+ hooks, output styles, self-hosting CI"*. Real drift, and the guard cannot see it because it parses only the `By component type` table.

**2b. Deleting the `References / assets` row went entirely unnoticed.** Reproduced by removing that row from the real matrix: **all eleven tests passed.**

**The cause is a tradeoff taken deliberately, whose cost was not thought through.** The extractor strips parentheticals *before* splitting on commas, because sec 2.1 spells the bundle as `` `SKILL.md` + `references/`, `scripts/`, `assets/` `` and a naive split shreds it. That fix worked - and it made **everything inside parentheses invisible**, including `references/`, which is the only place the Standard names that component. So the row had no token pointing at it and could be deleted freely.

> **CLOSED 2026-08-22.** 2a is a content fix: the `Tier path` Advanced row now names `statusline`. For 2b, parenthetical contents are now extracted as **secondary tokens** rather than discarded, with one alias (`skill.md + references/` to `References / assets`) and five allowlist entries for the tokens that are not component types (`scripts/`, `assets/`, the MCP clarifying note, and the two hook categories). Verified against wave 1's own reproduction: deleting the real row now yields `STANDARD.md sec 2.1 names "skill.md + references/" (matrix row "References / assets"), but the matrix's "By component type" table has no such row`. A standing negative test covers it.

### W1-3 - MEDIUM. `G8` silently passes a README it cannot read. PRE-EXISTING, deferred with a reason

**The defect is real.** `scripts/checks/folder-readme.mjs` catches a `readFileSync` failure and `continue`s **without emitting a finding**, so a README that exists but cannot be read (a directory of that name, a permissions failure, a malformed checkout object) disables the guide and inventory checks for that folder while the gate reports success.

**It is not this release's defect.** `git show v1.15.0:scripts/checks/folder-readme.mjs` carries the identical `catch { continue; }`, and the line was last touched 2026-06-03.

> **DEFERRED 2026-08-22, filed as `E51`.** Fixing a pre-existing spine-check behaviour inside a release whose plan states *"no new spine check"* and *"no verdict movement for any plugin"* would move verdicts for any plugin currently benefiting from the silent pass, with no migration window. **That is an ADR-gated change, not a review fix.** Recorded rather than quietly patched, and recorded rather than quietly dropped.

### W1-4 - MEDIUM. The `plan_v1.15.0` link to the moved claims file

**Independently found as `S2` above and already closed.** The wave reproduced it against committed `HEAD` and correctly noted that the working tree already carried the correction. Recorded here as corroboration rather than as a second finding.

### W1-5 - LOW. `tier-basis.md` reported 8 pinned boundaries where its tables contain 9

**Independently found as `S1` above and already closed.** The wave named the exact rows (lines 31, 33, 36-40, 48, 54) and noted `foundation/synthesis/README.md` repeated the figure. Both were corrected before the wave reported. Corroboration.

### W1-6 - LOW. The floors were never exercised by any test

**The defect.** The renamed-heading negative test confirmed extraction goes empty and then asserted `verify()` stays silent. **It never invoked a floor.** Reproduced exactly as the wave described: setting `FLOORS.tokensPerTier` from `1` to `0` left **all eleven tests passing**, so nothing in the suite demonstrated the floors catching anything.

**This is the guard's own thesis turned on the guard.** The floors exist because a subset test over an empty set passes; a floor that no test exercises is the same defect one level up.

> **CLOSED 2026-08-22.** The floors are extracted into `floorViolations(tokens, matrix)`, returning a list. The live test asserts it is empty; **the renamed-heading negative test now asserts it is NOT empty and names sec 2.2.** Re-running the wave's reproduction with the floor set to 0 now fails that test.

### W1-7 - LOW. The reader inventory omitted a direct test reader

**The defect.** `foundation/claims/README.md` presents itself as the authoritative record of which code reads each claims file. Its `upstream-pin.json` row omitted `tests/unit/standards-watch.test.mjs:297`, which calls `readPin(REPO_ROOT, PIN_REL)` directly.

**Worth noting how it hid.** That call reaches the path through the exported `PIN_REL` constant rather than through a literal, so it is invisible to a search for the path string **and** to a search for `path.join` segments - the two techniques this release added specifically to stop missing readers. A third shape existed.

> **CLOSED 2026-08-22.** The row names it. The lesson is added to the same file's standing note: a reader can reach a path by literal, by assembled segments, **or by an exported constant**, and only the last of those is invisible to both greps.

## Wave 2 - false statements in the records

*Running. Recorded when the wave reports.*

## Wave 2 - false statements in the records

*Pending. Recorded when the wave reports.*
