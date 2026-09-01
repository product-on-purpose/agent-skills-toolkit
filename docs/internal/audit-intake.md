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
| family-registry regeneration (manual) | OPEN - cut 1 | RS-A3 |
| family-registry regeneration (scheduled or CI-produced) | OPEN | RS-D3 |
| Rule on E16 (multi-entry credit gap), then E17 / E20 / E15 | RULED 2026-08-31 (option a'), implementation OPEN | RS-B1; [`backlog/enhancements.md`](backlog/enhancements.md) |
| Mutation-proof the check spine | OPEN | RS-B2 |
| E56 - G2 credits a mention rather than an executed gate | OPEN - Standard 0.16 train | RS-B3 |
| STANDARD.md Codex anchors refresh | OPEN - Standard 0.16 train | RS-C1 |
| Codex-rejected hook handler types; model `mcp_tool` | OPEN - Standard 0.16 train | RS-C2 |
| E49 plus the command-migration size cap | OPEN - Standard 0.16 train | RS-C3 |
| Claude Code re-survey; relevance-block decision | OPEN - Standard 0.16 train | RS-C4 |
| ADR: stance on the vendor's plugin eval | RULED 2026-08-31 (adopt, with a scope tripwire), ADR OPEN | RS-C5 |
| ADR: Agent Plugins root manifest | RULED 2026-08-31 (spike first), spike OPEN | RS-C6 |
| Consume the published Action in this repo's own CI | OPEN - cut 2 | RS-D1 |
| GitHub Marketplace listing for the Action | OPEN - cut 2 (moved off cut 1 by ruling 2026-08-31) | RS-D2 |
| Auto-publish the full verdict beside the badge | OPEN - cut 2 | RS-D3 |
| Cross-tool corroboration run | OPEN - out-of-band research | RS-E1 |
| The graded cohort | RULED 2026-08-31 (notify before publish), OPEN | RS-E2 |
| Tier-scope routing line on every tier surface | OPEN - cut 2 | RS-E3 |
| E6 - prompt-injection and curl-pipe-bash scan | OPEN - Standard 0.16 train if its catalog is ready | RS-E4 |
| npm package ownership | RULED 2026-08-31 (grant the org team), OPEN | RS-E5 |
| Schedule standards-watch | RULED 2026-08-31 (cron, no gate), OPEN - cut 2 | RS-F3 |

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
| standards-watch scheduling | OPEN | RS-F3 |
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
