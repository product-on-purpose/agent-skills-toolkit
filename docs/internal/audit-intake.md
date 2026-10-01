---
title: "Audit intake - every audit-origin item, by generation"
description: "The cross-audit ledger: what each audit asked for, what happened to it, and which tracked surface carries it now"
status: live
last-updated: "2026-09-30"
---

# Audit intake

Every item an audit of this repository has raised, by generation, with what became of it.

## Why this page exists

Three audit generations asked for it before it was built, and the failure it prevents has been measured twice.

**Measured failure 1 - the false-record class.** E4 (SARIF output), E9 (provenance output contract) and E23 read "backlog" in tracked records while their binaries had already shipped. Caught by hand on 2026-08-18. The 2026-08-28 audit then found six execution files still calling E4 and E9 "stretch riders" seventeen days after both had shipped as headline features - a ninth file was found during the repair, because the audit's own count was low.

**Measured failure 2 - the zero-trace drop.** Six recommendations from the 2026-08-10 generation had no trace anywhere in the repository by 2026-08-28: not done, not declined, not deferred, not mentioned. Two of them (PSR-8 and PSR-9, authoring automation) had been dropped silently in two consecutive generations. A recommendation nobody wrote down is indistinguishable from one nobody made.

Both failures share a shape: the audits live in gitignored `_local/audit/`, and nothing tracked pointed back at them. This page is the tracked pointer.

## The convention

1. **Every audit APPENDS a generation section as part of its delivery.** Writing the section is part of finishing the audit, not a follow-up task.
2. **Every release that resolves an intake row updates that row in the same change.** The record moves with the work, not after it - the E52 lesson.
3. **A row is never deleted.** Its `Status` becomes RESOLVED with a date and a pointer, SUPERSEDED with the reasoning, or DECLINED with the reasoning. An item that turned out to be a bad idea is a useful record; a missing row is not.
4. **`Carried by` names the tracked surface that owns the item now** - a backlog E-number, an ADR, a workstream ID. If nothing tracked carries it, that is the finding, and the cell says `nothing (zero-trace)`.

The audits themselves are gitignored working material under `_local/audit/<date>_<agent>/` and are deliberately not linked from here, because a tracked page must not depend on untracked files. The generation date is the address.

## This page is the INTAKE; the PLAN is [`roadmap.md`](roadmap.md)

**Added 2026-09-17.** This page answers "what did each audit ask for, and what happened to it". It does not answer "what is open, what does it depend on, and what does done mean". [`roadmap.md`](roadmap.md) answers that, carries the eight still-open `RS-xx` items with their acceptance criteria quoted verbatim, and triages the 2026-09-04 generation's fifteen roadmap items and five rejections.

**Both audits' own planning documents are SUPERSEDED as planning, and still depended on as evidence.** `_local/audit/2026-08-28_fable/08-resolution-plan.md` with its `specs/`, and `_local/audit/2026-09-04_fable-5-1-max/`, are no longer where the work is steered from - `roadmap.md` is. Nothing is deleted, and both remain the only home of evidence that has not been extracted into the tree: the 46-item adversarial corpus, the `01-potemkin-gold` and `09-pin-abuse` fixtures, `findings.jsonl`, the eight proposal ADRs, and the full text of the seventeen discharged `RS-xx` items. That split is stated rather than glossed, because retiring a document whose fixtures nobody can rebuild is not the same as retiring one whose claims are all reproducible here.

## 2026-08-28 generation

Twenty-five recommendations. The resolution plan mapping all of them was ratified 2026-08-31; cut 1 ("the records patch") is the first execution.

| Item | Status | Carried by |
|---|---|---|
| `command` source kind falsely reds a valid marketplace | RESOLVED 2026-09-01, cut 1 | RS-A1; `scripts/lib/marketplace/manifest.mjs` |
| Four surfaces cite a claim id that never existed in the ledger | RESOLVED 2026-09-01, cut 1 | RS-A2; guarded by `scripts/check-claim-citations.mjs` |
| E52's first `Status:` bullet contradicts its own RESOLVED heading | RESOLVED 2026-09-01, cut 1 | RS-A2; [`backlog/enhancements.md`](backlog/enhancements.md) |
| Claim-id reference check | RESOLVED 2026-09-01, cut 1 | RS-B4; `scripts/check-claim-citations.mjs` |
| Six (in fact nine) execution files call E4 and E9 "stretch" | RESOLVED 2026-09-01, cut 1 | RS-A4; [`execution/`](execution/) |
| No forward version numbers on unshipped phases | RESOLVED 2026-09-01, cut 1 | RS-F1; [ADR 0057](decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md) |
| Adopt the audit-intake index | RESOLVED 2026-09-01, cut 1 | RS-F2; this page |
| family-registry regeneration (manual) | RESOLVED 2026-09-01, cut 1 - **verified on the LIVE deployed page**, which shows `Measured 2026-09-01`, the registry sha `81dbbde`, all six rows `in sync`, and names its own staleness episode | RS-A3; [`../reference/family-registry.md`](../reference/family-registry.md) |
| family-registry regeneration (scheduled or CI-produced) | **SHIPPED cut 2** - generated on every Pages deploy, at the catalogue's pins; the committed page keeps the meaning and the episode record | RS-D3 |
| Rule on E16 (multi-entry credit gap), then E17 / E20 / E15 | RULED 2026-08-31 (option a'), implementation OPEN | RS-B1; [`backlog/enhancements.md`](backlog/enhancements.md) |
| Mutation-proof the check spine | OPEN | RS-B2 |
| E56 - G2 credits a mention rather than an executed gate | **SHIPPED cut 4** (PR #314). The FIRST version of the fix was a false positive, caught by the six-member blast radius rather than by review | RS-B3; `scripts/checks/self-hosting.mjs` |
| STANDARD.md Codex anchors refresh | **SHIPPED cut 4** (PR #314). The record was stale three ways: the page had MOVED to learn.chatgpt.com, the event count went 10 to 12, the CLI anchor was 18 releases old | RS-C1; [`../../foundation/sources/codex.md`](../../foundation/sources/codex.md) |
| Codex-rejected hook handler types; model `mcp_tool` | **SHIPPED cut 4** (PR #314). Landed the ledger's FIRST live Codex claim, `cx-hook-handler-support` | RS-C2; `scripts/checks/hook-documentation.mjs` |
| E49 plus the command-migration size cap | **SPLIT.** E49 REFUSED 2026-09-04 - its spec said to verify the plugin-parts enumeration is prose before landing a quote claim, and it is a bullet list whose relevant fact is an ABSENCE, so it stays a dated read and enters no ledger. The size cap **SHIPPED cut 4** (PR #317) as `U18`, and the spec's stated consequence was WRONG: the vendor SKIPS an oversized command rather than truncating it | RS-C3; [ADR 0058](decisions/0058-a-vendor-that-drops-a-component-is-a-finding-and-the-proxy-is-declared.md); `scripts/checks/command-size-cap.mjs` |
| Claude Code re-survey; relevance-block decision | **SHIPPED cut 4** (PR #317). Surveyed 2.1.235 to **2.1.261** - a 26-version gap, wider than the item estimated. Relevance block ruled a DATED NO, on a better reason than the item set out with: the block is inert until an administrator allowlists the marketplace | RS-C4; [E59](backlog/enhancements.md); [`../../foundation/sources/claude-code.md`](../../foundation/sources/claude-code.md) |
| ADR: stance on the vendor's plugin eval | RULED 2026-08-31 (adopt, with a scope tripwire), ADR OPEN | RS-C5 |
| ADR: Agent Plugins root manifest | RULED 2026-08-31 (spike first), spike OPEN | RS-C6 |
| Consume the published Action in this repo's own CI | **SHIPPED cut 2** (two jobs, not one; spec amended by measurement 2026-09-02) | RS-D1 |
| GitHub Marketplace listing for the Action | **SHIPPED 2026-09-03** on v1.18.0's release screen, with RS-D1 green as the ruling required. Listed under Code quality + Continuous integration. Two constraints learned by being refused: a 125-char description limit (now tested) and validation against the default branch, not the tag | RS-D2 |
| Auto-publish the full verdict beside the badge | **SHIPPED cut 2** - tier-report.json, report.html and an index carrying the sha, date and tier-scope sentence. Live-site check is post-merge | RS-D3 |
| Cross-tool corroboration run | OPEN - out-of-band research | RS-E1 |
| The graded cohort | RULED 2026-08-31 (notify before publish), **OPEN and NOT SCHEDULED.** [Issue #300](https://github.com/product-on-purpose/agent-skills-toolkit/issues/300) was closed NOT_PLANNED on 2026-09-04 and explicitly deferred to cut 5 planning rather than decided; the member list is unpicked and nobody has been contacted. A dry run on 2026-09-04 graded five candidates with the portable profile and found **four of five pass every portable check**, which moves the page's framing question before its cohort question | RS-E2; [#300](https://github.com/product-on-purpose/agent-skills-toolkit/issues/300); [`roadmap.md`](roadmap.md) |
| Tier-scope routing line on every tier surface | **SHIPPED cut 2** - five placements (README status, report index, family-registry header, SARIF `helpUri`, release-notes standing header), all inheriting one exported constant. The sixth, the cohort page header, ships at cut 5 with the page | RS-E3 |
| E6 - prompt-injection and curl-pipe-bash scan | **OPEN, and it MISSED the train.** Standard 0.16 shipped in v1.19.0 without it, and its spec's `since: "0.16"` / `until: "0.17"` is therefore unlandable: 0.17 is ruled graduations-only and 0.18 is named for a five-item set this check is not in. The catalogue itself is unblocked - only the check's introduction needs a revision number, and choosing it is an open maintainer decision recorded in [`roadmap.md`](roadmap.md) | RS-E4; [E6](backlog/enhancements.md); [`roadmap.md`](roadmap.md) |
| npm package ownership | **THE MECHANISM IS DONE; THE RISK IS NOT.** Verified live 2026-09-04 ([issue #313](https://github.com/product-on-purpose/agent-skills-toolkit/issues/313)): `agent-skills-toolkit` is granted read-write to `product-on-purpose:developers`, so AC1 is met and the 2026-08-31 ruling was correct - an npm organization CAN govern an unscoped package, and the doubt raised in issue #301 is settled. AC2 is met by `publish-npm.yml` run `35289925723`, the tag-triggered v1.19.0 publish, completing through the approval gate. **AC3 was not met and was worse than unmet**: `STATUS.md` said the transfer "must be done in the npmjs.com web UI" when it had been done from the CLI; corrected 2026-09-17. **What is still open is the bus factor** - one package owner, one org owner, one team member, zero maintainers - which needs a second trusted human, not a command | RS-E5; [#313](https://github.com/product-on-purpose/agent-skills-toolkit/issues/313); [`roadmap.md`](roadmap.md) |
| Schedule standards-watch | **RESOLVED 2026-09-15.** Shipped cut 2 (cron `0 7 15 * *`, no gate; the no-gate deferral is E58), and **AC1 - the criterion that cannot be faked - is now CLOSED**: the first SCHEDULED run fired on 2026-09-15 (`event: schedule`, run `34969288827`, conclusion `success`) and opened [issue #323](https://github.com/product-on-purpose/agent-skills-toolkit/issues/323) twelve seconds later. **That run did not find drift, although this row said so until 2026-09-27: it crashed on a missing dependency before reading the upstream (the #323 false alarm). A crashed run is not a clean one, so E58's revisit count still restarts** - three clean scheduled runs are now no earlier than 2026-12-15, not the 2026-11-15 E58 recorded | RS-F3; [E58](backlog/enhancements.md) |

## 2026-09-04 generation

A max-effort external audit of the toolkit at `main` `3ad4b11` (v1.18.0, Standard 0.15), run on Linux against a purpose-built 46-item adversarial corpus. It is the first generation to arrive **with its own patches**: eight fix commits, each closing one numbered finding, each carrying a test.

Its working material is gitignored under `_local/audit/2026-09-04_fable-5-1-max/` per the convention above, so **the `F-0xx` and `B-xx` identifiers it uses resolve nowhere outside this machine.** That is a known cost, recorded rather than hidden: the rows below state the CONTENT of each item, so a reader who cannot open the audit is not stranded on a bare id.

| Item | Status | Carried by |
| --- | --- | --- |
| Piped `--json` / `--sarif` / `--gha` silently truncated at 64 KB | **RESOLVED 2026-09-05** (PR #315). `process.exit()` ran before stdout drained. The published Action was never exposed - it redirects to files under `$RUNNER_TEMP` | `scripts/check.mjs`, `scripts/evaluate.mjs` |
| `G2`'s npx matcher backtracks exponentially and hangs the gate | **RESOLVED 2026-09-05** (PR #315). 0.1 ms on 400 flags, from unbounded. It also wrongly refused a real URL-valued invocation | `scripts/checks/self-hosting.mjs` |
| `G9`'s label matcher is quadratic on trailing whitespace and hangs the gate | **RESOLVED 2026-09-05** (PR #315) | `scripts/checks/source-doc.mjs` |
| Every directory walker follows symlinks out of the plugin root | **RESOLVED 2026-09-05** (PR #315). A link to a system directory produced 178 findings from outside the plugin; a link to the parent recursed to `ENAMETOOLONG` | `scripts/lib/fs-utils.mjs` (`isInsideRoot`) |
| An unknown `--flag` is dropped silently and the gate exits 0 | **RESOLVED 2026-09-05** (PR #315), so a typo in a gating flag no longer returns a green answer to a different question | `scripts/check.mjs` |
| The anatomy no-skills warning is filed under `U8` rather than `U2` | **RESOLVED 2026-09-05** (PR #315). Suppressing one check silently suppressed a finding in the other | `scripts/checks/anatomy.mjs` |
| `--help` omits the subcommand two remediation messages name | **RESOLVED 2026-09-05** (PR #315). The test now reads the dispatch table from the bin's own source, so the next subcommand cannot be added to one and not the other | `bin/agent-skills-toolkit.mjs` |
| A UTF-8 byte-order mark reads as missing frontmatter, dropping a plugin to Tier: None | **RESOLVED 2026-09-05** (PR #315) | `scripts/lib/frontmatter.mjs` |
| The tier certifies file SHAPE: 33 placeholder files earn Gold with 0 errors and 0 warnings | OPEN - the audit's headline finding, and the one a badge reader pays for. **Re-verified 2026-09-09 at the CURRENT 35-check spine**, not taken from the audit at the commit it read | **The zero-trace risk is CLOSED as of 2026-09-09**: [E61](backlog/enhancements.md) carries it, and [`roadmap.md`](roadmap.md) records it as parked on decision D-01 (a health number beside the tier), which is DEFERRED |
| A plugin pinned to Standard 0.9 keeps Gold while violating nine later checks | OPEN - the pin has no floor and no expiry | **The zero-trace risk is CLOSED as of 2026-09-09**: [E62](backlog/enhancements.md) carries it, blocked on decision D-02 (the pin floor's deprecation window), which is downstream of D-01. The audit's nine-waived-checks figure stays recorded as THEIRS - the `09-pin-abuse` fixture is not rebuildable here |
| `U5` is a template matcher: precision 0.20 and recall 0.20 over a 20-description labelled set | OPEN, and **now reproducible here**: the twenty labelled descriptions were extracted on 2026-09-09 to `tests/fixtures/u5-calibration/` and run on every `npm test` | [E63](backlog/enhancements.md), blocked on decision D-03 (U5's warning text). Overlaps [E44](backlog/enhancements.md), which is ADR-gated on a different question about the same check |
| Moving `U5`'s threshold from 0.7 to 0.1 fails no test; six checks hang on one test each | **SPLIT.** The threshold half is **RESOLVED 2026-09-09**: five tests now cover it and two independently go red under that edit, so the check is tamper-evident. **That did not make it correct** - the correctness half is [E63](backlog/enhancements.md). The "six checks hang on one test each" half is the same gap RS-B2 counts from the other end and is OPEN | `U18` was written against this finding: its boundary test derives both sizes from the exported constant. The remaining half is RS-B2 (mutation-proof the check spine) in [`roadmap.md`](roadmap.md) | 
| `G2` is a regex over workflow text: a swallowed exit code, `if: false`, `continue-on-error` and grading a different directory all pass | **PARTIALLY RESOLVED cut 4** (PR #314) - `G2` now credits an EXECUTED gate rather than a mention, closing the mention half. The trigger, `if: false`, `continue-on-error` and graded-path halves stay OPEN | RS-B3 for the shipped half; **the remaining four halves are [E64](backlog/enhancements.md) as of 2026-09-09** - no longer unfiled. ADR 0061 names them part of the Standard 0.18 strengthening set |
| The audit assigns forward version numbers (1.19, 1.20, 2.0) to unshipped work | **CONTRADICTS a ratified decision.** [ADR 0057 (unshipped work carries a name, never a version number)](decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md) was accepted 2026-09-01 and was in the tree the audit read. Its migration tables must be read with those numbers treated as sequence placeholders, never as commitments | this row |
| The audit's wave 2 claims Standard 0.16 for its own strengthening set | **SUPERSEDED 2026-09-05.** Cut 4 shipped 0.16 first (`U18` plus the `G1` and `G2` tightenings), and 0.17 is already spoken for as those items' cap-expiry. **The later revision now has a name, as of 2026-09-17: Standard 0.18**, ruled by ADR 0061 (U18 never gated, and the strengthening set gets Standard 0.18). The set is B-13 (an unparseable subagent frontmatter produces no finding), B-17 (`S4` never reads chain file bodies), B-19 (`G3` verifies only that an eval file exists), B-20 / E64 (`G2` reads workflow text rather than parsing what runs) and B-21 (the drift checks compare only name and version). **Naming it is not scheduling it** - no date is attached and no cut is promised | this row; ADR 0061; [`roadmap.md`](roadmap.md) |
| The audit's ADRs are numbered 0001-0008 | **RENUMBER ON ADOPTION.** This repository's sequence reached 0057 before the audit and 0058 during it. **Updated 2026-09-17: 0059 (every MUST maps to a check) and 0060 (a runtime that refuses a collision downgrades the check) are taken on `main`, 0061 (U18 never gated) is claimed on branch `fix/u18-does-not-gate`, so the next free number is 0062.** No live collision, because the audit's ADRs are proposals in gitignored material | this row |
| **D-04** - seven `MUST`s in the Standard have no check, and this repo violates one of them 35 times | **RULED 2026-09-08.** Three become checks (sec 5.1 via `S3`/`S8`, sec 3.10 link resolution via `U2`, sec 8.2 a new cross-type collision check), two demote to `SHOULD` (sec 7.3 `HISTORY.md`, sec 3.10 count agreement), two are marked stated-unchecked (sec 7.2, sec 7.4). A generated coverage table makes it mechanical and is a test. **TABLE SHIPPED 2026-09-18** (`scripts/gen-standard-coverage.mjs` -> [`../reference/standard-coverage.md`](../reference/standard-coverage.md), drift-guarded in `npm test`). **One disposition is applied:** Standard 0.17, which ships in 1.20.0, demoted the sec 7.3 `HISTORY.md` clause to SHOULD. The other six still read `MUST` in `STANDARD.md`, so the table renders them `ruled`. Applying them is a Standard revision and is not scheduled. The generated pass over every `MUST` token found **25 further clauses that nothing checks and no ADR has ruled**, which is the discovery the ADR asked a generated table for | [ADR 0059](decisions/0059-every-must-maps-to-a-check-a-should-or-a-stated-gap.md); [`roadmap.md`](roadmap.md) |
| **B-09** - wording corrections so each check says what it measures (`G3`, `G1`, `G2`, `S6`, the `U8`/`G4` pair, and the evaluate report's N/A label for `G1`) | **RESOLVED 2026-09-18; SHIPPED in 1.20.0.** Five overclaims corrected, each reproduced first: `U8` claimed to compare what `gen-manifest` produces and compares `name` and `version` only; `manifest.generated.json` was drift-checked by nothing at the time of this reading, not by `U8` as `G4`'s docblock said - the house guard `check-self-consistency` closed that on 2026-09-19; `S6` claimed per-component per-target emission and checks the native manifest file; `G2` claimed the plugin "passes its own validators in CI" and reads workflow text offline; and a fifth not in the item, `S3`, claimed to compare `path`, `version` and `status` and matches by name. `G1` and `G3`'s own check text were tested and found ACCURATE; their overclaims live in `STANDARD.md`'s clauses, reported unruled as HC-07 (`G3`'s clause promises CI execution the check never looks for) and HC-08 (`G1`'s clause requires hook scope and failure behaviour the check never reads), opened as questions in [`backlog/enhancements.md`](backlog/enhancements.md) rather than acted on | `scripts/checks/{manifest-drift,per-target-presence,self-hosting,index-drift,components-index}.mjs`; [`../reference/`](../reference/) |
| **F-007** - the evaluate report labels `G1` N/A "nothing to validate" on a repository that ships a hook `G1` graded | **RESOLVED 2026-09-18; SHIPPED in 1.20.0.** `buildConditional` carried a fixed base set of `G1`, `G6`, `U11`; every entry is now derived from the subject on disk and APPROXIMATES the check's not-applicable case, which is not always the module's own early-return expression - measured 2026-09-18, a library.json carrying `"components": {}` makes `G6` N/A here while `deprecation.mjs` does NOT early-return, and a `.mcp.json` declaring no servers keeps `U11` off the set while `mcp-valid.mjs` returns early on `servers.length === 0`. `G6`'s condition here is "no component entry in any list", not "a deprecated entry exists" as the audit framed it, because `G6` validates the `status` of every entry | `scripts/evaluate.mjs`; `tests/unit/evaluate-conditional.test.mjs` |
| **D-05** - above-tier findings surface as red errors on machine surfaces while the text output says `0 error(s)` | **RESOLVED 2026-09-08** (PR #319); **SHIPPED in 1.20.0.** An above-tier finding is `::notice` / SARIF `note` and carries the rung that makes it non-gating. Measured: `writing-style-catalog` declares `universal`, exits 0, and its Security tab carried 46 error-level results | `scripts/lib/tier.mjs` (`isAboveDeclaredTier`) |
| **F-011** - a malformed `askit.config.json` counts as a Universal error and demotes the plugin to Tier: none | **RESOLVED 2026-09-18** (PR #331); **SHIPPED in 1.20.0.** The config loader's findings are now operator findings: outside the tier, the error count and the warning count, printed in their own block, and the run exits `2` | `scripts/check.mjs`; `scripts/lib/findings.mjs` (`isOperatorFinding`) |
| **F-037** - grading a folder of loose skills prints Gold-requirement errors and never names the profile built for that case | **RESOLVED 2026-09-18** (PR #331); **SHIPPED in 1.20.0.** One hint line names `--profile plain-plugin` when no `library.json` exists; it changes no finding, severity or verdict | `scripts/check.mjs` |
| **F-010** - the two honesty pages were stale, saying there was no marketplace scope and no SARIF | **RESOLVED 2026-09-18** (PR #320); **SHIPPED in 1.20.0** | `docs/explanation/limitations.md`; `docs/explanation/comparison.md` |
| **F-033** - the Action writes no `GITHUB_STEP_SUMMARY`, although the job summary is listed among its surfaces | OPEN. **First recorded here 2026-09-30**; on that date neither `action.yml` nor `scripts/` mentions it | nothing (zero-trace until this row) |
| **F-014** - SARIF carries no `partialFingerprints`, one `helpUri` for every rule, and no `security-severity` | OPEN. **First recorded here 2026-09-30**; on that date `scripts/` contains no `partialFingerprints` | in part, the deferred schema-first report object in [`roadmap.md`](roadmap.md) section 4, item 1, which names fingerprints |
| **F-008** - `U7`'s instruction budget counts lines, not tokens or instructions | OPEN. **First recorded here 2026-09-30** | nothing (zero-trace until this row) |
| **F-030** - `G9` rejects a Python module docstring and accepts only `#` comments | OPEN. **First recorded here 2026-09-30**; the audit filed it as its own wave-2 item B-14, a change to a house check's semantics | nothing (zero-trace until this row) |
| A fix for every finding | DECLINED by the audit itself - patches were limited to unambiguous, low-risk items, and contested changes went to its own ADR folder instead | the audit's `GAPS.md` |
## 2026-08-10 generation

With its 2026-08-18 annotation. The six zero-trace rows below are why this page exists.

| Item | Status | Carried by |
|---|---|---|
| E16 / E17 / E20 / E15 - the eval-instrument batch | OPEN, byte-identical since 2026-08-04 | E16, E17, E20, E15; now RS-B1 |
| E6 - security scan | OPEN, urgency raised by the ToxicSkills findings | E6; now RS-E4 |
| E8 - published conformance suite | OPEN | E8 |
| PSR-8 / PSR-9 - authoring automation | ZERO-TRACE, dropped in two consecutive generations | nothing (zero-trace) - needs a disposition |
| The audit-intake index | RESOLVED 2026-09-01 | this page |
| Agent Plugins root-manifest ADR | ZERO-TRACE, revived by the 2026-08-28 generation | RS-C6 |
| Codex command size-cap check | ZERO-TRACE, revived by the 2026-08-28 generation | RS-C3 |
| G1 vocabulary refresh | ZERO-TRACE, revived by the 2026-08-28 generation | RS-C1 / RS-C2 |
| The graded cohort | OPEN, slipped six releases | RS-E2 |
| Quarterly competitive refresh | OPEN | RS-E1 / the comparison page |
| standards-watch scheduling | **SHIPPED cut 2** - see the 2026-08-28 row | RS-F3 |
| EXEC-SUMMARY "stretch" labels | RESOLVED 2026-09-01 | RS-A4 |

## 2026-07-19 generation

Two parallel audits on the same date (an agent-facing one and a product-facing one, the latter carrying the sensor readings).

| Item | Status | Carried by |
|---|---|---|
| The marketplace-scope design | RESOLVED - shipped as the marketplace scope | [ADR 0039](decisions/) and the marketplace scope |
| The sensor-reading dispositions | **BACK-FILL OWED** - the generation's individual rows have not been transcribed here | nothing yet |

**This section is deliberately incomplete, and says so rather than looking finished.** Seeding it accurately means reading that generation's findings and sensor readings and transcribing each disposition, which is a task rather than a recollection. Inventing plausible rows here would reproduce, on the page built to stop false records, exactly the failure it exists to stop. The back-fill is the next audit's first job, or an earlier one if someone gets to it.

## 2026-07-10 generation

| Item | Status | Carried by |
|---|---|---|
| D-01 - behavioral-eval residue | OPEN, folded into E7 | E7 |

**Also incomplete.** As with 2026-07-19, only the row the 2026-08-28 audit explicitly carried forward is transcribed. The rest awaits the same back-fill.

## Earlier generations

`2026-05-29` and `2026-06-09` are archived. No rows are transcribed; if an item from either is still live, it should have surfaced in a later generation and be recorded above.
