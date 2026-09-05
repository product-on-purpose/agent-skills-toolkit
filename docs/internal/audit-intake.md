---
title: "Audit intake - every audit-origin item, by generation"
description: "The cross-audit ledger: what each audit asked for, what happened to it, and which tracked surface carries it now"
status: live
last-updated: "2026-09-01"
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
| The graded cohort | RULED 2026-08-31 (notify before publish), OPEN | RS-E2 |
| Tier-scope routing line on every tier surface | **SHIPPED cut 2** - five placements (README status, report index, family-registry header, SARIF `helpUri`, release-notes standing header), all inheriting one exported constant. The sixth, the cohort page header, ships at cut 5 with the page | RS-E3 |
| E6 - prompt-injection and curl-pipe-bash scan | OPEN - Standard 0.16 train if its catalog is ready | RS-E4 |
| npm package ownership | RULED 2026-08-31 (grant the org team), OPEN | RS-E5 |
| Schedule standards-watch | **SHIPPED cut 2** (cron `0 7 15 * *`, no gate; the no-gate deferral is E58). First SCHEDULED run 2026-09-15 - AC1 open until then | RS-F3 |

## 2026-09-04 generation

A max-effort external audit of the toolkit at `main` `3ad4b11` (v1.18.0, Standard 0.15), run on Linux against a purpose-built 46-item adversarial corpus. It is the first generation to arrive **with its own patches**: eight fix commits, each closing one numbered finding, each carrying a test.

Its working material is gitignored under `_local/audits/2026-09-04_fable-5-1-max/` per the convention above, so **the `F-0xx` and `B-xx` identifiers it uses resolve nowhere outside this machine.** That is a known cost, recorded rather than hidden: the rows below state the CONTENT of each item, so a reader who cannot open the audit is not stranded on a bare id.

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
| The tier certifies file SHAPE: 33 placeholder files earn Gold with 0 errors and 0 warnings | OPEN - the audit's headline finding, and the one a badge reader pays for | nothing tracked yet (**zero-trace risk**); the audit proposes a health score beside the tier |
| A plugin pinned to Standard 0.9 keeps Gold while violating nine later checks | OPEN - the pin has no floor and no expiry | nothing tracked yet (**zero-trace risk**) |
| `U5` is a template matcher: precision 0.20 and recall 0.20 over a 20-description labelled set | OPEN | overlaps [E44](backlog/enhancements.md), which is ADR-gated on a different question about the same check |
| Moving `U5`'s threshold from 0.7 to 0.1 fails no test; six checks hang on one test each | OPEN | nothing tracked yet (**zero-trace risk**). `U18` was written against this finding: its boundary test derives both sizes from the exported constant | 
| `G2` is a regex over workflow text: a swallowed exit code, `if: false`, `continue-on-error` and grading a different directory all pass | **PARTIALLY RESOLVED cut 4** (PR #314) - `G2` now credits an EXECUTED gate rather than a mention, closing the mention half. The trigger, `if: false`, `continue-on-error` and graded-path halves stay OPEN | RS-B3 for the shipped half; the remainder is unfiled |
| The audit assigns forward version numbers (1.19, 1.20, 2.0) to unshipped work | **CONTRADICTS a ratified decision.** [ADR 0057 (unshipped work carries a name, never a version number)](decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md) was accepted 2026-09-01 and was in the tree the audit read. Its migration tables must be read with those numbers treated as sequence placeholders, never as commitments | this row |
| The audit's wave 2 claims Standard 0.16 for its own strengthening set | **SUPERSEDED 2026-09-05.** Cut 4 shipped 0.16 first (`U18` plus the `G1` and `G2` tightenings), and 0.17 is already spoken for as those three items' cap-expiry. The audit's set needs a later revision | this row |
| The audit's ADRs are numbered 0001-0008 | **RENUMBER ON ADOPTION.** This repository's sequence reached 0057 before the audit and 0058 during it, so the next free number is **0059**. No live collision, because the audit's ADRs are proposals in gitignored material | this row |
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
