---
title: "Out-of-program backlog"
description: "Everything deliberately not in the four-release program, indexed with source and natural future home so nothing is silently lost"
status: draft
last-updated: "2026-07-06"
---

# Out-of-program backlog

> This document is an index into - not a replacement for - the canonical backlog files at
> [docs/internal/backlog/enhancements.md](../backlog/enhancements.md) and
> [docs/internal/backlog/new-components.md](../backlog/new-components.md).
> Those files hold the full rationale and detail for each item.
> This document adds program context: why each item was placed outside the four-release
> window, and where it belongs when the program ends and re-triage happens.

## What this document is for (plain language)

When a program is planned, a long list of good ideas gets set aside to keep the work
focused. Setting them aside is not the same as forgetting them. This document is the
explicit record of everything the maintainer and the orchestrator looked at, decided was
genuinely valuable, and deliberately chose NOT to include in releases v1.7.0 through
v1.10.0. Every item here has a source (where the idea came from), a reason it is out of
scope now, and a suggested future home so re-triage is fast. Nothing should fall through
the cracks just because it did not make the current cut.

One important conditional: E4 (SARIF output) and E9 (provenance contract) are listed
here only as fallback entries. Both are earmarked as Release 4 (v1.10.0) stretch riders.
If they land in R4, their entries here become stale and should be struck at the
post-program re-triage.

## Carried items

| Item and handle | Source | Why out of this program | Natural future home |
|---|---|---|---|
| Gemini emitter (Create-pillar reach) | 2026-05-30 scope decision, STATUS.md | Large and orthogonal; adds a new agent-target family, which is a major pillar expansion unrelated to the four program themes | Standalone initiative after v1.10.0; pair with an ADR on multi-agent-target architecture |
| E2 (deeper MCP secret scanning) | [enhancements.md](../backlog/enhancements.md) | The bounded improvement shipped in v1.x; the recursive scan needs golden/anti fixtures before it can avoid false positives, and that fixture work belongs in R2 (SP2) territory at earliest | Post-R2; pair with the SP2 (deepen complex builders) golden-examples work |
| E3-a (autofix) | [enhancements.md](../backlog/enhancements.md), gap-analysis Adopt 4 | The F3 (gate-config) core must prove out before autofix layering; no gap in the four releases creates urgency | Post-R1 once F3 feedback accumulates; a future validator-enhancement release |
| E3-b (user-authored custom profiles) | [enhancements.md](../backlog/enhancements.md) | The built-in profiles are not yet battle-tested; adding user profiles before they are would expand surface prematurely | Post-R2 at earliest, behind a usage signal |
| E3-c (fingerprint suppressions) | [enhancements.md](../backlog/enhancements.md) | The `reqId`+glob+message-substring suppression works for all known use cases; content-addressed fingerprints are a refinement, not a gap | Post-program; pair with an `askit suppress` helper command |
| E3-d (info severity level) | [enhancements.md](../backlog/enhancements.md) | No current finding class warrants info-only; add when a concrete use case arrives | Future validator release; trivial once E3-b lands |
| E3-e (per-component config authoring) | [enhancements.md](../backlog/enhancements.md) | ADR 0034 (component-scope profiles) shipped the plumbing; authoring UX is a polish item | Post-R1; fold into a component-authoring pass |
| E5 (semver-bump-vs-content-diff) | [enhancements.md](../backlog/enhancements.md) | Valuable but structural; needs a new check module and fixture corpus | Future validator-hardening release |
| E6 (prompt-injection + curl-pipe-bash scan) | [enhancements.md](../backlog/enhancements.md), gap-analysis Adopt 3 | Security check content work; no release in this program adds skill-content analysis, so there is no natural rider | Standalone PR post-R1; pair with E2 |
| E7 (eval-harness hardening borrow) | [enhancements.md](../backlog/enhancements.md), gap-analysis Adopt 5 | Release 2 (v1.8.0) ships real evals/ fixtures for 2-3 skills and the F3 (advisory quality measurement) runner; E7's held-out split and multi-trial scaffolding are the next layer, not the first | Post-R2 once R2's real fixtures exist to test the split against |
| E8 (published conformance suite) | [enhancements.md](../backlog/enhancements.md), gap-analysis Build 1 | Large scope: packaging, a fixture corpus, external-reproducibility testing; deserves its own initiative | Post-R3; may share infrastructure with the E11 (dependable eval-run pipeline) runner |
| E10 (MCP-served skill validation) | [enhancements.md](../backlog/enhancements.md), gap-analysis Build 3 | Explicitly watch-only until a concrete MCP-served library is a real target | Revisit post-program when a corpus target surfaces |
| E4 (SARIF output) | [enhancements.md](../backlog/enhancements.md), gap-analysis Adopt 1 | Earmarked as an R4 (v1.10.0) optional rider; **SHIPPED in v1.11.0, 2026-08-11** | n/a - landed |
| E9 (provenance output contract) | [enhancements.md](../backlog/enhancements.md), gap-analysis Build 2 | Earmarked as an R4 (v1.10.0) optional rider; **SHIPPED in v1.11.0, 2026-08-11** | n/a - landed |
| Conformance badges | DESIGN.md sec 12 | Host/serve infrastructure decision still with the maintainer; the badge is meaningless without a stable verification URL | Revisit alongside the E8 (published conformance suite) initiative |
| Long-tail component builders (LSP, monitors, channels, themes) | DESIGN.md, STATUS.md | Each is a full Create-pillar builder; the program deepens the four complex builders (SP1-SP4) but does not add new builder types | Future Create-pillar expansion; sequence behind SP4 |
| evals/ fixtures for the remaining ~20 skills | Session notes, METHODOLOGY.md | Release 2 ships 2-3 seeded fixtures as proof of practice; the full 20-skill set is a long-tail authoring project, not a feature | Incremental across post-R2 releases; track in enhancements.md |
| Finding-5 residual (12 remaining U6 / U12 corpus findings class) | ADR 0032 (U6 inline-code + U12 template mermaid), eval-run batches | The 43-to-12 improvement shipped in v1.5.1; the 12 survivors are edge cases requiring per-case fixture work to safely close without false-positive risk | Future validator-hardening release; tracked in STATUS.md |
| Sensor reading 9 (S7 one-to-many uses lists) | eval-runs/eval-runs.md reading 9 | Standard-evolution note only; no urgency and no decision gate yet | Re-raise at the next Standard-versioning cycle (ADR 0027 ratified) |
| Section 14 (Astro site conformance) as a real numbered STANDARD.md section (audit H-10) | 01-audit-2026-07-06.md H-10; CHANGELOG and ADR 0026 (Astro site conformance) cite clauses 14.1-14.11 that no numbered section defines | Deliberately deferred: the maintainer's standards program stages Section 14 graduation as its own package (its B5), and a unilateral askit-side edit would collide with that staged work | The standards program's Section 14 landing; askit re-adopts the numbered clauses when they exist |
| Tier vocabulary reconciliation, Universal=Bronze / Convergent=Silver / Advanced=Gold (audit H-11) | 01-audit-2026-07-06.md H-11 | Doc-consistency polish across generated docs and CLI output; not scheduled against the four releases | Post-program doc-fix batch, or rides any release that touches tier-report output strings |
| U13 (skill-registration) warn-to-error flip, if the program never bumps Standard to 0.13 | ADR 0027 (Standard versioning policy) burndown; R4's Standard 0.13 ownership rule | Conditional carry: owned in-program by whichever ADR first takes the Standard to 0.13 (R3 marketplace-scope or SP4-B); listed here only for the case where both choose non-spine routes | The next Standard bump, whenever it occurs; the flip must ride that bump's sweep |
| Public /evaluation-reports/ showcase | research IMPL-PLAN Task 18, eval-run batches | Host/framing decision still with the maintainer; the reports themselves render correctly | Re-raise post-R2 once the F3 (advisory quality measurement) reports are polished enough to showcase |
| .gitattributes eol=lf renormalization | Session notes, commit churn on generated files | Housekeeping; the CRLF churn is contained to known generated files and is handled via the checkout workaround | Next hygiene pass (H1 in R1 handles the current known surfaces; add here if new files surface) |
| House-style token configurability (G8 / G9 / G10 / U12 tokens) | STATUS.md, backlog notes | Opt-in customization; no current user has expressed a need | Future gate-config enhancement; fold into E3-b (user profiles) |
| G8 link-target refinement | Session notes | Minor precision improvement in the folder-readme check; no false positive or false negative has been filed | Next validator-hardening batch |
| astro-docs-preset shared package (family-level) | STATUS.md, agent-plugins scope | Mostly the other program's concern (the standards program in agent-plugins); this program's docs site is a consumer, not a producer | Coordinate with the agent-plugins standards program; do not initiate from this repo |
| ccpm trial (Q-G curiosity from 2026-05-25) | Session notes | A methodology experiment for the project management layer; no concrete hook into the four releases | Revisit as a process experiment if the program's release pacing shows a critical-chain pattern |
| @claude GitHub-mention wiring | Session notes | Requires maintainer-interactive setup outside CI; not automatable by an agent run | Maintainer-direct setup; not a code change |
| /codex:cancel upstream bug | Session notes | Never filed upstream; blocked Codex sessions can be worked around by restarting | File a GitHub issue against the Codex CLI repo when the maintainer has a reproducible repro; not a code change in this repo |

## Validator-hardening candidates (seven Codex-audit gaps)

The 2026-07-06 audit surfaced seven specific gaps in the validation spine that are candidates for a future "validator hardening" release. They are listed here rather than in the main table because they share a natural batch home and a common rationale: each gap was identified from Codex-audit observations, each is a legitimate improvement, and none is urgent enough to displace the program's four headlined workstreams.

1. Components-index entry validation - verify that `INDEX.md` entries resolve to real component directories.
2. Hooks-as-components decision - clarify and enforce (or formally defer) whether hooks count as indexable components (an ADR is the right gate).
3. Component `metadata.version` + `HISTORY.md` enforcement - currently advisory; a future check could make it objective.
4. Subagent frontmatter validation - extend the G7 (docs-frontmatter) check to subagent `.md` files.
5. G3 (structural vs behavioral contract) decision - the check is intentionally thin; an ADR should formally close or widen the behavioral scope.
6. `release-ready.mjs` implement-or-retire - the script stub is a dangling promise; either build it out or delete and record in a decision.
7. Deploy-workflow parity + U8 deep native-manifest compare - the CI workflow and the native manifest comparison both have documented shallow spots.

Natural future home: a "validator hardening" release (v1.11.x or similar) after the program ends, ideally behind a single ADR that ratifies the batch and any ADR-gated decisions among the seven.

## Boundary note: the standards relocation

The maintainer's separate standards program (in agent-plugins) may relocate
`STANDARD.md` and the checker (`scripts/check.mjs`, `scripts/lib/`, `scripts/checks/`,
`scripts/generators/`, `tier-report.mjs`) out of this repo into `agent-plugins/standards/`.
That move is NOT part of this program. The packing-list delta, if the relocation fires
mid-program, is documented in [relocation-addendum.md](relocation-addendum.md). None of
the backlog items above become unblocked or invalidated by the relocation; each item's
natural future home holds regardless of which repo owns the engine after the move. If
"PR-C askit re-adopt" fires mid-program, the session should stop, reconcile against
the then-current relocation-addendum, and only resume once the new module boundaries
are confirmed stable.

## Re-triage protocol

When the four-release program ends (after v1.10.0 ships), the maintainer and the orchestrator should run a single re-triage session: pull this file and the canonical backlog files ([enhancements.md](../backlog/enhancements.md) and [new-components.md](../backlog/new-components.md)), verify which conditional items (E4, E9) landed as R4 optional riders and strike them here (both did: SHIPPED in v1.11.0, 2026-08-11), assess each remaining item against the then-current repo state and any new sensor readings, assign or update a priority level, and commit the revised enhancements.md as the single source of truth going forward. This document does not need to be updated during the program unless a new item is explicitly placed out-of-scope mid-flight; it is a snapshot of the 2026-07-06 planning session's out-of-scope decisions, and its value is that it exists and is findable, not that it is continuously maintained.
