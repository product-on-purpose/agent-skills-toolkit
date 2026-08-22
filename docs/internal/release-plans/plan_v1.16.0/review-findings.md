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

**The first correction of this finding was itself wrong**, and adversarial wave 2 caught it - see `W2-3`. It claimed the counts differ because "several boundaries cite the same claim, and one cites `upstream-pin.json`". **No claim is shared between rows at all**, and **two** rows rest on the upstream pin. The real arithmetic is **7 vendor-claim-backed rows** (covering all 8 claims, because the commands row cites two) **plus 2 upstream-pin-backed rows**.

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

> **CLOSED 2026-08-22.** The link now targets `../../../../foundation/claims/vendor-claims.json`; the sentence around it is untouched. Re-measured after the fix: **47 broken at `v1.15.0`, 47 in the WORKING TREE, difference zero.**
>
> **AMENDED 2026-08-22.** This note originally read "47 at `HEAD`". When it was written the fix was uncommitted, so the figure described the working tree and `HEAD` still carried the broken target - adversarial wave 2 caught the overclaim. It became true of `HEAD` at commit `9759d8a`. **A closure note that says `HEAD` when it means the working tree is the same defect class as the finding it closes**: a record asserting something it had not checked.

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

**Ran 2026-08-22**, after wave 1 finished, alone and with stdin closed. **Seven findings: three HIGH, three MEDIUM, one LOW.** Every one reproduced here before being acted on.

**Pointing the second wave away from the first worked, and the evidence is that the overlap is zero.** Wave 1 found broken mechanics; wave 2 found false sentences. **Not one finding appears in both lists.** Two of wave 2's three HIGHs are defects wave 1 could not have found, because they are wrong statements in documents whose code is fine.

**Three of the seven are defects in wave 1's own fixes, or in the self-review that preceded it.** That is the standing lesson of this repository stated again: **the code written in RESPONSE to a review is itself unreviewed.**

### W2-1 - HIGH. Every probe blocking date in the repository was one day early

**The false statements:** `Blocks from 2026-09-18` and `Blocks from 2026-09-19`, in `foundation/sources/claude-code.md`, `foundation/synthesis/tier-basis.md`, `docs/internal/vendor-watch/probes/README.md`, the `components-share-one-namespace` `EXPECTED.md`, the v1.15.0 packet, and the project memory.

**What is actually true.** `scripts/lib/vendor-watch.mjs` marks a probe stale on `age > FRESHNESS_DAYS`, so **day 30 is still fresh and blocking begins on day 31.** Every date in the repository was computed as `verifiedOn` + 30.

**Settled by running the real gate at each candidate boundary**, not by re-reading the arithmetic:

| `--today` | result |
| --- | --- |
| 2026-09-18 | `8 claims: 6 hold, 0 MISSING, **0 stale**` |
| 2026-09-19 | `... **1 stale**` |
| 2026-09-20 | `... **2 stale**` |

So `agents-dir-registers-every-md` blocks from **2026-09-19**, and `components-share-one-namespace` from **2026-09-20**.

**The error was pre-existing and this session PROPAGATED it.** `2026-09-18` was already in the repository. When `components-share-one-namespace` was discharged on 2026-08-20, its new blocking date was computed the same way - by adding 30 - and written down as `2026-09-19`. **An existing wrong answer supplied the method for producing a new one.**

**Why nothing caught it.** These dates are prose. No check reads them, and the gate that enforces the real threshold never states a date. A number that only ever appears in documentation is only ever as good as the arithmetic of whoever last wrote it.

> **CLOSED 2026-08-22.** Both dates corrected everywhere they appear, in the correct order so the shift is not applied twice. The v1.15.0 packet keeps its original figures with a **dated correction note** rather than an overwrite, because what it recorded on the day is itself the record. `probes/README.md` gains the rule in a blockquote: **the blocking date is `verifiedOn` + 31, and it should be obtained by running the gate with `--today`, never by adding 30 in your head.**

### W2-2 - HIGH. A row labelled `unverified` had an exact first-party citation

**The false framing.** `tier-basis.md`'s summary row read *"Boundaries resting on **nothing first-party** (`unverified`): 11"*, and the subagent row's citation cell read simply `nothing`.

**What is actually true.** The repository holds a **verbatim quote of the Codex plugins page**, read 2026-08-18 and recorded in `askit-capability-whats-new`'s golden example 2:

> *"A plugin can contain one or more of these parts: Skills, Connectors, MCP servers, Browser extensions, Hooks, [and] Scheduled task templates."*

Subagents are absent from that list. **That is a first-party citation, and the file said there was none.**

**The distinction this exposes is the column's whole purpose.** A quote sitting in an example file establishes the fact **today**. A **pinned claim** re-reads it on every `vendor-watch` run, or expires and blocks a release. `unverified` should mean *the second thing is missing, so nothing will notice if the vendor changes it* - **not** *nobody ever looked*. The stronger phrasing overclaimed the gap, which in a file whose job is honest gaps is the same defect as understating one.

> **CLOSED 2026-08-22.** The summary row now reads **"Boundaries not pinned (`unverified`, so no expiry)"**. The subagent row names the citation and its location. A blockquote states the unpinned-versus-uncited distinction so the next reader does not collapse them.

### W2-3 - HIGH. The correction to `S1` was itself wrong

**The false statement**, added while closing `S1`:

> *"They differ because several boundaries cite the same claim ... and one cites `upstream-pin.json` rather than `vendor-claims.json` at all."*

**Both halves are false.** Checked row by row against `vendor-claims.json`:

- **No claim id is shared between rows.** Each of the eight is cited exactly once.
- **Two rows, not one, rest on `upstream-pin.json`** - skills-are-portable and references-and-assets - and neither cites a vendor claim id.
- **Seven rows are backed by `vendor-claims.json`**, covering all eight claims because the commands row cites **two**.

So the arithmetic is **7 + 2 = 9 boundaries over 8 claims.** It also falsified a second sentence in the same file, *"every `pinned` row cites a live claim"*, which is untrue of the two upstream-pin rows.

**This is the finding worth reading twice.** `S1` was a wrong number. Its correction explained the wrong number **with a wrong reason**, and the explanation was more confident than the original because it had just been "verified". **A correction carries the authority of having been checked, so a wrong one is worse than the error it replaces.**

> **CLOSED 2026-08-22.** The blockquote states the real arithmetic per row. The "every pinned row cites a live claim" sentence now reads "a live claim **or** the upstream pin". `S1`'s entry above carries a dated amendment pointing here, and its original wrong text is left standing rather than rewritten.

### W2-4 - MEDIUM. ADR 0055 still asserted a "complete" reader list that was not complete

**The false statements**, in a ratified ADR: *"Every site"*, *"the complete list of them"*, and the blast radius *"two constants and two test files"*.

**What is actually true.** Two readers are missing, **each invisible to a different search**: `scripts/check-parity.mjs:529` assembles the path from segments, and `tests/unit/standards-watch.test.mjs:297` reaches it through the exported `PIN_REL` constant, naming no path at all. The committed migration touched **three script files and three test files.**

> **CLOSED 2026-08-22.** The ADR gains a dated correction section rather than an edit, per its own immutability convention, naming both omissions and restating the blast radius. It also records the generalisable rule - **a reader reaches a file by literal, by assembled segments, or by an exported constant, and only the third is invisible to both greps** - and points at `foundation/claims/README.md` as the authoritative inventory, with the ADR to be read as reasoning rather than as a list.

### W2-5 - MEDIUM. A closure note said `HEAD` when it meant the working tree

**The false statement**, in `S2`'s own closure: *"Re-measured after the fix: 47 broken at `v1.15.0`, 47 at `HEAD`, difference zero."* When it was written the fix was **uncommitted**; `HEAD` still carried the broken target.

**A closure note that asserts something it has not checked is the same defect class as the finding it closes.** The v1.15.0 packet's fifth review round spent two of its five findings on exactly this, and it recurred here.

> **CLOSED 2026-08-22.** The note reads "in the WORKING TREE" and carries a dated amendment recording the overclaim and naming the commit (`9759d8a`) at which it became true of `HEAD`.

### W2-6 - MEDIUM. `STATUS.md` still assigned the onboarding work to v1.16.0

**The false statements.** `STATUS.md` said the onboarding plan and the Astro site *"join this release"* (v1.16.0), and listed **v1.17.0 as "graded cohort"**. Both were true when written and became false when the onboarding scope moved to v1.17.0 on 2026-08-20.

**The v1.16.0 packet was annotated at the time; `STATUS.md` was not.** A superseding note that reaches one of two live documents leaves the other asserting the old world, and `STATUS.md` is the one a reader checks first.

> **CLOSED 2026-08-22.** The scope note is annotated as superseded and points at the v1.17.0 packet. v1.17.0 is renamed to its real identity. **The graded-cohort work now carries NO version**, deliberately, rather than being pushed to v1.18.0 - assigning a line a version it will not get is how it goes stale unnoticed, which is the call already made for the eval-instrument batch.

### W2-7 - LOW. `STATUS.md` dated a test count to before those tests existed

**The false statement.** The suite row read `1373 ... local suite run 2026-08-20`, and the file's header read `Last updated: 2026-08-20`. **Three of those 1373 tests were written on 2026-08-22**, in response to wave 1.

> **CLOSED 2026-08-22.** Both dates corrected, and the suite row now says the count grew by three when wave 1 found gaps in the guard.

## The 4-lens adversarial panel - the pre-cut gate that had NOT been run

**Found 2026-08-22 while checking the release preconditions**, not while reviewing code. `docs/internal/execution/06-release-choreography.md` Step 1 lists six preconditions and says **"None is skippable."** One of them is:

> *"A **4-lens Claude adversarial panel (false-PASS, false-FAIL, determinism, contract-fidelity)** has been run on every substantive PR merged since the last release, and every finding has been answered."*

**The two waves above are not that panel.** They were good, they found fifteen real defects, and **not one of their lenses is any of these four.** A different review that felt thorough does not satisfy a named gate. This is the failure the release spent two waves hunting, pointed at the release process itself: **a precondition treated as met by something that was not it.**

Run 2026-08-22 as four independent headless Claude sessions, with the model routing `10-agent-operations.md` specifies: Opus for the two hunter lenses, Sonnet for determinism and contract-fidelity. **Parallel `claude -p` is safe**, unlike the Codex harness, which fails quietly under concurrency.

### Panel result

| Lens | Model | Findings |
| --- | --- | --- |
| **1 - false-PASS** | Opus | **12: four HIGH** |
| **2 - false-FAIL** | Opus | **12: one CRITICAL, three HIGH** |
| 3 - determinism | Sonnet | 1 LOW; four categories explicitly clean |
| 4 - contract-fidelity | Sonnet | 1 MINOR; all seven checks match |

### P-CRITICAL - three quote claims pinned markdown TABLE SYNTAX, and would have blocked a future release

**Landed and removed the same day.** Resolving `E48` added three `quote` claims quoting rows of the Codex hook event table, pipes included.

**A pipe is rendering, not vendor prose.** If that page starts serving HTML, gains a column, or becomes a bullet list, **all three go MISSING at once** - and MISSING is deliberately exit 1 with no soft path. This vendor has already 308-redirected one of its pages. The blast radius is one page, one source, three of eleven claims, failing together, **on a future release with no warning.**

**It also broke the claims file's own stated convention**, which reads: *"A quote claim MUST be a COMPLETE SEMANTIC SENTENCE, not an identifier or a noun phrase."* The file says that **because a previous review wave already caught two claims violating it.** I violated it again, three times, an hour after writing about meaning-bearing guards.

**The reversal test could not catch this.** It proves a claim is semantically load-bearing, which these were, and says nothing about whether the pinned string survives re-rendering.

> **CLOSED 2026-08-22.** The three table-row claims are removed. **One event is pinned in prose instead** - "SessionEnd uses 1 second by default and supports up to 3 seconds" - which is a complete sentence, pipe-free, and disappears if the event does. The eleven-event enumeration is recorded as a dated `read` in `foundation/sources/codex.md`: real evidence, without an automatic re-check. **An enumeration that exists only as a table is not quotable by this mechanism**, which is the same shape as `E49`, found twice in one day.

### P-HIGH - three assertions pinned the repository instead of the invariant

The false-FAIL lens named the root cause better than the individual findings: **three of eleven assertions were equality pins against the live repository**, converting the guard from *"the matrix agrees with the Standard"* into *"the matrix and the Standard are exactly as they were on 2026-08-22."*

**That is the shape most likely to make a maintainer distrust a guard, because it fails loudest on the edits it was built to support.**

| | Was | Now |
| --- | --- | --- |
| `SYNTHETIC_MATRIX` | a hand-copied duplicate of the live matrix | **derived** from it |
| sec 2.3 token list | a deep-equality over the whole extraction | asserts only the regression it pins |
| agent columns | a deep-equality on two exact names | a floor plus membership |

**Measured, not argued.** Simulating exactly what the lens described - a maintainer adding a component type correctly to `STANDARD.md`, the alias table and the matrix - produced **seven red tests**, each reporting a bare count mismatch under a name about agent columns or ISO dates or boundary regexes, **none saying what to add.** After the fix, the same simulation passes **14/14**.

### P-MEDIUM and below, all closed

- **The folder-guide check dropped G8's skip list**, so a `.DS_Store` from opening the folder in Finder - gitignored, invisible to `git status` - turned the suite red and advised adding it to the inventory. Now mirrors G8's twelve-name list.
- **The token normaliser stripped backticks but not bold markers**, so bolding a component name in a tier bullet produced a token nothing could alias, and a false finding. The asymmetry with `parseMatrix` made it look deliberate.
- **The section boundary matched one exact phrasing.** A lowercase "must", or "Convergent-tier plugins MUST", would have re-run the guard's original false positive through a different door. Widened by shape rather than patched per instance.
- **The inventory parse read raw text and accepted only one heading spelling.** A fenced example inside the section read as a phantom child, and "Contents" - which G8 blesses - was rejected **and then silently skipped that folder's set-equality**, a false fail that also dropped the real check.
- **A guide listing its own README was told that file is not on disk** - false, and factually wrong on its face. G8's existence clause restored.
- **Directory-read order leaked into finding-message order** (determinism lens), so the same defect produced differently-ordered diagnostics on Linux and Windows. Sorted. **Not a regression this release created**: G8 carries the identical unsorted pattern, which is a separate, spine-scoped fix.
- **ADR 0055's D1 diagram omits `synthesis/README.md`** while the same ADR's prose requires a README in all four folders (contract-fidelity lens). The code followed the prose. Recorded in the ADR's correction section, because a literal file-for-file audit against the diagram alone would flag that file as EXTRA - **a false finding lying in wait for whoever runs that audit next.**
- **`foundation/claims/README.md` stated a stale claim count** within an hour of the count changing, and the prose-count guard does not scan that file. Corrected, with the gap noted in the line itself.

### Lens 1 - false-PASS: 12 findings, four HIGH, and the composite is the point

**It had to be run twice.** The first run's final message referred to "the ten findings" from its own earlier reasoning, and `claude -p` captures **only the final message**, so they were lost. **A headless prompt must demand the complete result IN the final message**; the re-run carried that as an explicit output contract.

**The composite finding, stated by the lens better than any of its parts:**

> **The SessionEnd evidence added in v1.16.0 is asserted in three artifacts and enforced in none of them.**

`vendor-claims.json` pinned a sentence about a **timeout budget**, the drift guard checked that a row *named* `Hook` exists, and the honest table needed only a date-shaped string. Every guard green; the proposition *"Codex supports SessionEnd as one of eleven hook events, and it does not run for subagents"* had **no guard at all.**

It also named the two shapes behind most of the list: **identity-only verification** (confirm a name exists, never read the payload it introduces) and **fail-open on the null branch** (three places return "nothing to check" and let that reach a success exit).

### L1-HIGH-1 - the guard never read a component row's agent cells

`parseMatrix` reduced every row to its first cell, so `yes` / `no` / `subset` / `differs` - **the matrix's entire product** - was structurally unreachable by the guard named after it. Blank every agent answer in the matrix and all tests passed.

> **CLOSED.** Rows are kept whole and keyed by name; `verify()` reports an empty cell for any agent column. Proved on the real matrix: blanking `Output style`'s answers now yields *"matrix row Output style has an EMPTY Claude Code cell. A row whose capability answer is blank agrees with nothing."*

### L1-HIGH-2 - no row-arity check, and the dropped cell was this release's own evidence

`cells()` returned however many cells it found; nothing compared row width to header width. A row truncated after its second cell parsed cleanly - **and the cell it silently dropped is the Codex answer, which is exactly what v1.16.0 added.**

> **CLOSED.** Arity is checked against the header. Proved: a three-cell row under a five-column header now yields *"matrix row Output style has 3 cells under a 5-column header."*

### L1-HIGH-3 - "carries a confirmed-against ISO date" was a shape test, not a currency test

`!rec.against` rejected only the empty string, and the regex checked only digit grouping. **`Confirmed against: none` with `On: 1999-01-01` passed**, in a section titled "Keeping the matrix honest" whose own prose says it exists because the file once made *"a currency claim with no currency evidence."* The guard certified the very defect the section was written against.

> **CLOSED.** Placeholder values are rejected, the date must be a real calendar date, and a future date is a finding. **Deliberately NOT a staleness window**: a window would make this test fail on a future date with no code change, which is the calendar-bomb `vendor-watch` already had to remove from its own verdict logic.

### L1-HIGH-4 - the replacement claim pinned a timeout budget, not the proposition it named

The claim landed hours earlier to fix the panel's CRITICAL - `SessionEnd uses 1 second by default and supports up to 3 seconds` - asserts a default and a maximum. **It asserts nothing about SessionEnd being a hook event.** A page reading *"the SessionEnd hook event was removed in v0.9. SessionEnd uses 1 second by default..."* still **HOLDS**, while its `dependsOn` claims it backs the matrix's eleven-event Hook row.

**Both guards designed to catch this shape missed it.** The word-count backstop passes at 12 words. **The meaning-reversal entry reverses the NUMBERS** - the one proposition the sentence genuinely discriminates - so the reversal test passed while proving only that the timeout figures are pinned.

> **CLOSED by removing the claim.** The Codex hook event set is **not pinnable by this mechanism**: every expression of it on that page is a table, and the one prose sentence is about timeouts. The set is recorded as a dated `read` in `foundation/sources/codex.md` - real evidence, without an automatic re-check - and `cx-hooks` is kept as a source with its URL and reading date and **no claim pinned against it**, with the reason stated in the source note.
>
> **This is the same limitation as `E49`, met from the other direction and on the same day.** An ABSENCE cannot be pinned; an ENUMERATION THAT EXISTS ONLY AS A TABLE cannot be pinned. Both are real facts this repository depends on, and neither fits the quote mechanism.

### The rest, all closed

- **A fifth `foundation/` subfolder was never checked.** The folder-guide check iterated a fixed list of four, so `foundation/probes/` - the one ADR 0055 explicitly left open - could ship with no README and be examined by nothing. Subfolders are now **discovered**, recursively.
- **The phantom check's escape accepted any resolvable path.** Listing `synthesis/tier-basis.md` in the parent's inventory suppressed the finding while breaking the set-equality the docblock claims. Narrowed to `INVENTORY_SKIP` membership, which is the one case it was added for.
- **The folder half had no floor.** Deleting every record under `sources/` and its inventory bullets left the suite green on an evidence folder holding nothing but its own guide. A floor now fires.
- **`tokensPerTier` was 1 against live extractions of 7, 5 and 6**, so a tier could lose most of its bullets in silence. Raised to 3. **The remaining gap - losing a single component type - is only closable by the reverse-direction check this file's docblock declares out of scope**, so it is filed rather than half-built.
- **The honest table was read positionally**, so inserting a column re-pointed the date check at the wrong cell. Columns are now located **by name**, as the component table's already were.

### Filed rather than fixed, with reasons

- **A claim naming an undeclared source id is `UNCHECKABLE` and exits 0.** Real, and it is in `scripts/lib/vendor-watch.mjs` - shipped gate code whose exit-code contract is release-scoped. `E54`.
- **`check-parity`'s pin read fails open to a printed "skipped" line**, and its pin-skew section cannot influence the exit code under any input. Pre-existing, but this release moved the file and edited that line. **Two readers of the same moved artifact now behave oppositely**: `standards-watch` throws `no-pin`, this one prints and continues. `E55`.

### What the panel says about the two waves

**The waves were not wasted and they were not sufficient.** Fifteen findings from the waves, plus a CRITICAL and three HIGHs from a panel run afterwards on the same code - and **the panel's CRITICAL was created by the fix for a wave finding.**

**The lesson is one this repository already knows, relearned at the process level: the code written in RESPONSE to a review is unreviewed.** `E48`'s resolution went through no review at all before the panel caught it, because by then the reviewing was considered done.

## What was checked and found clean

Recorded because a review that reports only what it found is half a report.

- The raw tallies: **9 pinned rows, 11 `unverified`, 3 house**, and **8 claims in `vendor-claims.json`, all sourced from Claude Code pages.**
- The four source records' surveyed versions and dates against the claims JSON and the capability matrix. **All eight claim ids and their `verifiedOn` dates now appear in `claude-code.md`.**
- The working-tree `claims/README.md` reader inventory, row by row against the code.
- ADR 0055's physical `foundation/` layout against what is on disk.
- Every other closure note in this file, against code and tests.
- `CHANGELOG.md` and the packet READMEs, for current-state claims falsified by this work.
- A fresh run at the end: **suite 1373 / 0** (1 skipped), `check.mjs` **Advanced, 0 errors, 0 warnings.**

## Wave 2 - false statements in the records

*Pending. Recorded when the wave reports.*
