# STATUS - agent-skills-toolkit

> The single live source of truth for "where are we / what is next." Keep this current; treat session logs as history, not roadmap.
> Last updated: 2026-05-31. Strategic context: [`release-plans/plan_v1.0.0/RELEASE-PLAN.md`](release-plans/plan_v1.0.0/RELEASE-PLAN.md) (v0.2). Decisions: [`release-plans/plan_v1.0.0/DECISIONS-OPEN.md`](release-plans/plan_v1.0.0/DECISIONS-OPEN.md) + the 2026-05-30 audit (`release-plans/plan_v1.0.0/audit/`).

## Current state

- **Declared tier:** Convergent (Silver). `library.json` `tier: convergent`, `standard: 0.8`, version `0.2.0`.
- **Self-validating:** yes. `node scripts/check.mjs` exits 0 (0 errors, 0 warnings); `tier-report` prints Convergent with an empty burndown; `npm test` = 154/154 (verified 2026-05-31).
- **Installable:** not yet. Public `0.x` Silver preview is the next external milestone (Q-A); marketplace registration is reserved for the Gold `v1.0.0` tag (D8).
- **On disk:** 15 skills (`askit-evaluate` + the `askit-build-*` family: skill, subagent, command, mcp, hook, chain-contract, agents-md, output-style, workflow + the Phase 4 governance/lifecycle set: `askit-backlog`, `askit-decision`, `askit-release`, `askit-migrate`, `askit-capability-advisor`), 6 subagents (Claude-only: `askit-skill-author`, `askit-evaluator`, and the judgment roster `askit-explorer`, `askit-file-search`, `askit-file-ops`, `askit-reviewer`), 2 commands, an 18-check validation spine + generators + `tier-report`/`evaluate`/`check`, 154 tests with golden/anti fixtures + a Codex ingestion round-trip.

## Scope decision (2026-05-30, maintainer)

- **Agents:** v1.0.0 targets **Claude (Code and Cowork, one plugin format) + Codex** at Gold. **Gemini is a named v1.x roadmap** target (additive emitter), not v1. (Audit decision 1.)
- **Components:** v1 covers the **full builder catalog** (all 27 functional areas), using the consolidated v1 verb taxonomy (`build-<type>` with `create`/`improve` modes + the generic `evaluate`), not 60 discrete skills. (Audit decision 2.) This is the maximal-scope choice; see R6 below.
- **Beginner UX:** a minimal on-ramp (install path + one tutorial + visuals) is pulled forward to the Silver preview. (Audit decision 3.)
- **Truly everything in v1 (ADR 0020 O-1):** the previously-deferred docs-site, full eval engine, benchmark, statusline, and deprecate are all in v1. Docs strategy is ADR 0021: +2 net-new consolidated skills (`askit-build-docs`, `askit-build-samples`) collapsing the catalog's 6-7 docs/sample micro-skills; an Astro Starlight site deployed to GitHub Pages (copied from pm-skills); a bounded example-threads pattern; a summary+detailed architecture/ADR convention.
- **Subagents (ADR 0020 O-2):** all `askit-` prefixed for future-proofing (Gemini v1.x ships subagents). Rename the 2 shipped subagents + add a per-component prefix check.

> **R6 (scope / burnout) is now the dominant risk.** Full-catalog v1 is large. Mitigations: the monotonic-tier model keeps the toolkit shippable at every phase exit; the public Silver preview ships early as a release valve; delivery is sequenced into waves (below); independent builders are parallelizable via worktree-isolated subagents.

## Phase progress (real decomposition)

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 | Repo + Standard seed | DONE | tag v0.1.0 |
| 1 | Validation spine | DONE | v0.2.0 |
| 2 | Authoring/assessment core (build-skill, evaluate, subagents) | DONE | v0.2.0 |
| 3A | Codex contract v0.8 + Silver conformance core (S1-S5) | DONE | `c79be5c` |
| 3B | Multi-agent emission spine (Codex manifest + S6 + round-trip) | DONE | `65ba9a8` (#49) |
| 3C-1 | Silver self-claim (tier convergent, v0.2.0) | DONE | `a672485` (#53) |
| 3C-2a | build-subagent + dogfood subagents (Claude-only) | DONE | `c2dca9b` (#63) |
| 3C-2b | build-command + builder-pattern.md | DONE | `6b9d419` (#74) |
| 3C-2c | build-mcp + sec 3.9 correction + component-level S6 | DONE | `v1-build` |
| 3C-2d | build-hook, build-chain-contract, build-agents-md, build-output-style, build-workflow | DONE | `v1-build` (10 skills) |
| 3 gate | Phase 3 (Convergent) builder set complete; Codex hardening applied | DONE | `f35bfaf`; next: `0.3` Silver preview (go-public decision) |
| 4 | Governance + lifecycle + advise + init-* + judgment subagents + full-catalog tail | IN PROGRESS | `v1-build`: governance/lifecycle (`askit-backlog`/`decision`/`release`) + `askit-migrate` + `askit-capability-advisor` + the judgment roster (`explorer`/`file-search`/`file-ops`/`reviewer`) done; Phase-4 adversarial gate applied (migrate manifest fix; `quality-grader` deferred). PAUSED for 3 design calls before init-*/docs/eval-harness. |
| 5 | Gold G1-G7 + self-conformance + docs/visuals complete + v1.0.0 | PENDING | - |

## DoD burndown (full-catalog v1, consolidated taxonomy)

Status: `done` on disk | `designed` (design doc exists) | `pending`. Areas reference `builder-skills-catalog.md`.

| Area | v1 component (consolidated) | Type | Target | Status |
|---|---|---|---|---|
| 3 | `askit-build-skill` (create/improve) | skill | both | done |
| 3/16/17 | `askit-evaluate` (conformance core; behavioral/review modes pending) | skill | both | done (partial) |
| 5 | `askit-build-subagent` | skill | claude | done |
| 4 | `askit-build-command` | skill | claude | done |
| - | `askit-skill-author`, `askit-evaluator` (rename from unprefixed pending) | subagents | claude | done |
| 9 | `askit-build-mcp` (+ mcp-valid U11, component-level S6) | skill | both | done |
| 6 | `askit-build-hook` | skill | claude(+cx subset) | done |
| 7 | `askit-build-workflow` | skill | both | done |
| 8 | `askit-build-chain-contract` | skill | both | done |
| 10/24 | `askit-build-agents-md` | skill | both | done |
| 12 | `askit-build-output-style` | skill | claude-only | done |
| 13 | `askit-build-statusline` | skill | claude-only | pending (full-catalog) |
| 14 | `askit-build-settings` + permission advice | skill | both(subset) | pending (full-catalog) |
| 11 | references/assets (likely a build-skill mode) | mode | both | pending |
| 1 | `askit-init-marketplace` | skill | both | pending |
| 2 | plugin scaffolding (folded into init-plugin) | skill | both | pending |
| 23 | `askit-init-plugin` (interview/questionnaire/hybrid) | skill | both | pending |
| 18 | `askit-backlog` (intake/triage/prune) | skill | both | done |
| 24 | `askit-decision` (ADR/RFC) | skill | both | done |
| 16/20/26 | `askit-release` (gate/version/changelog/release-notes) | skill | both | done |
| 0 | `askit-migrate` (adopt foreign repo) | skill | both | done |
| X | `askit-capability-advisor` (resolved to a skill, not a subagent) | skill | both | done |
| 15 | `askit-build-docs` (readme/quickstart/tutorial/how-to/reference/glossary/faq/troubleshooting/architecture/site modes) | skill | both | pending |
| 19 | `askit-build-samples` (threads-aware golden/anti generator + drift validate) | skill | both | pending |
| - | `askit-reviewer` | subagent | claude | done |
| - | `askit-quality-grader` | subagent | claude | deferred (gate found it duplicated evaluate; behavioral role -> eval-harness design call; backlog N1) |
| - | `askit-explorer`, `askit-file-search`, `askit-file-ops` | subagents | claude | done |
| 17 | eval-harness + library-regression (behavioral eval layer) | spine+skill | both | pending |
| 19 | (folded into `askit-build-samples`, above) | - | - | - |
| 21 | deprecation policy + status handling | skill+check | both | pending |
| 25 | template-manager | skill | both | pending |
| 15 | docs + docs-site -> `askit-build-docs` (above); changelog/notes -> `askit-release` modes | skill/mode | both | pending |

Rough count: 15 of ~19-21 builder/governance skills (the +2 docs/samples skills bring the consolidated set to ~19) and 6 of the 7 planned subagents are on disk; the 7th (`askit-quality-grader`) is deferred to the eval-harness design call (backlog N1). The exact final count is fixed by RELEASE-PLAN v0.2 wave planning.

## Cross-cutting workstreams (added by the 2026-05-30 audit)

| Workstream | Status | Tracked in |
|---|---|---|
| Re-baseline plan (this file + RELEASE-PLAN v0.2) | in progress | audit/2026-05-30_audit-plan-v1.md |
| Repo hardening (LICENSE, version + dash checks, sec 3.9 fix, mermaid, governance files, CI matrix, security scanning, release automation) | in progress (P0 batch) | audit/2026-05-30_audit-repo.md |
| Update-ingestion / spec-sync (pinned upstream versions + scheduled drift check) | pending | RELEASE-PLAN v0.2 |
| Behavioral eval layer (triggering evals + LLM-judge) | pending | Phase 4/5 |
| Docs, examples, docs-site, beginner on-ramp (Diataxis incl. tutorials + QUICKSTART; Astro Starlight + Pages from pm-skills; `build-docs` + `build-samples`; example-threads; summary+detailed convention) | pending (on-ramp pulled to Silver) | ADR 0021 |
| Agentic execution layer (task specs keyed to reqIDs + @claude surface + worktree parallelism) | pending | RELEASE-PLAN v0.2 |

## Next action

PAUSED for three reserved maintainer design calls (the Phase 4 lighter queue + adversarial gate are done). Resolve before building: (a) `askit-init-plugin` seed-regeneration strictness (must regenerate the Phase 0 seed anatomy; an asserted test); (b) `askit-build-docs` type=site Astro Starlight scaffold (copied from `../pm-skills`) + `askit-build-samples` scope for v1; (c) the eval-harness / `evaluate` behavioral+review-mode shape (v1 vs v1.x) - this also governs the deferred `askit-quality-grader` (backlog N1). After the pause, the remaining full-catalog tail: `askit-build-statusline`, `askit-build-settings`, `askit-init-marketplace`, deprecation policy + check, `template-manager`. Note: the Phase-4 Codex adversarial pass was still running at the pause; reconcile its findings when it returns.
