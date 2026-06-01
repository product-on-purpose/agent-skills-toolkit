# STATUS - agent-skills-toolkit

> The single live source of truth for "where are we / what is next." Keep this current; treat session logs as history, not roadmap.
> Last updated: 2026-05-31. Strategic context: [`release-plans/plan_v1.0.0/RELEASE-PLAN.md`](release-plans/plan_v1.0.0/RELEASE-PLAN.md) (v0.2). Decisions: [`release-plans/plan_v1.0.0/DECISIONS-OPEN.md`](release-plans/plan_v1.0.0/DECISIONS-OPEN.md) + the 2026-05-30 audit (`release-plans/plan_v1.0.0/audit/`).

## Current state

- **Declared tier:** Convergent (Silver). `library.json` `tier: convergent`, `standard: 0.8`, version `0.2.0`.
- **Self-validating:** yes. `node scripts/check.mjs` exits 0 (0 errors, 0 warnings); `tier-report` prints Convergent with an empty burndown; `npm test` = 173/173 (verified 2026-06-01).
- **Installable:** not yet. Public `0.x` Silver preview is the next external milestone (Q-A); marketplace registration is reserved for the Gold `v1.0.0` tag (D8).
- **On disk:** 23 skills (the full v1 catalog: `askit-evaluate`; the `askit-build-*` family - skill, subagent, command, mcp, hook, chain-contract, agents-md, output-style, workflow, docs, samples, statusline, settings; governance/lifecycle - `askit-backlog`, `askit-decision`, `askit-release`, `askit-deprecate`; lifecycle/onboarding - `askit-migrate`, `askit-init-plugin`, `askit-init-marketplace`, `askit-template-manager`; advise - `askit-capability-advisor`), 7 subagents (Claude-only: `askit-skill-author`, `askit-evaluator`, `askit-quality-grader` (behavioral judge), `askit-reviewer`, `askit-explorer`, `askit-file-search`, `askit-file-ops`), 2 commands, a 21-check validation spine (Bronze U1-U11, Silver S1-S8 incl. S8 `components-mirror`, Gold G3 `library-regression` + G6 `deprecation`) + generators + `tier-report`/`evaluate`/`check`, 173 tests with golden/anti fixtures + a Codex ingestion round-trip.

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
| 4 | Governance + lifecycle + advise + init-* + judgment subagents + full-catalog tail | DONE (catalog) | `v1-build`: full v1 catalog built (23 skills + 7 subagents). ADR 0023; Sub-phase A eval engine (G3 + Layer 2 + `askit-quality-grader`); B (build-docs + build-samples); C (init-plugin + init-marketplace); tail (statusline, settings, deprecate + G6, template-manager). Remaining: the live Astro site build + a Phase-4-close adversarial gate. |
| 5 | Gold G1-G7 + self-conformance + docs/visuals complete + v1.0.0 | PENDING | the toolkit declares `advanced` and closes G1/G2/G4/G5; G3/G6 checks already exist |

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
| 13 | `askit-build-statusline` | skill | claude-only | done |
| 14 | `askit-build-settings` + permission advice | skill | both(subset) | done |
| 11 | references/assets (a build-skill / build-samples concern) | mode | both | done (covered by build-skill + build-samples) |
| 1 | `askit-init-marketplace` | skill | both | done |
| 2 | plugin scaffolding (folded into init-plugin) | skill | both | done (folded into `askit-init-plugin`) |
| 23 | `askit-init-plugin` (interview/questionnaire/hybrid) | skill | both | done |
| 18 | `askit-backlog` (intake/triage/prune) | skill | both | done |
| 24 | `askit-decision` (ADR/RFC) | skill | both | done |
| 16/20/26 | `askit-release` (gate/version/changelog/release-notes) | skill | both | done |
| 0 | `askit-migrate` (adopt foreign repo) | skill | both | done |
| X | `askit-capability-advisor` (resolved to a skill, not a subagent) | skill | both | done |
| 15 | `askit-build-docs` (readme/quickstart/tutorial/how-to/reference/glossary/faq/troubleshooting/architecture/site modes) | skill | both | done (site mode = the pinned Astro Starlight recipe; live site is a build-verified slice) |
| 19 | `askit-build-samples` (threads-aware golden/anti generator + drift validate) | skill | both | done |
| - | `askit-reviewer` | subagent | claude | done |
| - | `askit-quality-grader` | subagent | claude | done (rebuilt as the behavioral judge in eval engine Layer 2; ADR 0023 closed backlog N1) |
| - | `askit-explorer`, `askit-file-search`, `askit-file-ops` | subagents | claude | done |
| 17 | eval-harness + library-regression (behavioral eval layer) | spine+skill | both | done (Layer 1 G3 `library-regression` check + `evals/` format; Layer 2 `askit-evaluate` behavioral/review modes + `askit-quality-grader` judge) |
| 19 | (folded into `askit-build-samples`, above) | - | - | - |
| 21 | deprecation policy + status handling | skill+check | both | done (`askit-deprecate` + the G6 `deprecation` check) |
| 25 | template-manager | skill | both | done (`askit-template-manager`) |
| 15 | docs + docs-site -> `askit-build-docs` (above); changelog/notes -> `askit-release` modes | skill/mode | both | done |

Count: the full v1 catalog is on disk - 23 skills and all 7 planned subagents. The build areas above are all `done`; what remains for Phase 5 (Gold) is conformance work on the toolkit itself (declare `advanced`, close G1/G2/G4/G5) plus the live Astro site build, not new catalog components.

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

**The full v1 catalog is built and adversarially gated (Phase 4 complete): 23 skills + 7 subagents, 21-check spine, gate green at Convergent, 173 tests.** Sub-phase A (eval engine: G3 `library-regression` + Layer 2 behavioral/review + `askit-quality-grader`), B (`askit-build-docs` incl. the Astro Starlight `site` recipe + `askit-build-samples`), C (`askit-init-plugin` with the asserted anatomy test + `askit-init-marketplace`), and the tail (`askit-build-statusline`, `askit-build-settings`, `askit-deprecate` + the G6 `deprecation` check, `askit-template-manager`) are all on `v1-build`. The Phase-4-close adversarial gate ran and its confirmed findings were fixed: the S8 `components-mirror` check (closing a sec-5.1 status-mirroring gap that opened a G6 escape hatch), the Codex marketplace command, a broken references/ link (+ U6 extended to scan references docs), and minors.

**PUBLIC as of 2026-06-01 (maintainer go):** the repo is public at Silver (the planned 0.x preview) at https://github.com/product-on-purpose/agent-skills-toolkit. `v1-build` was merged to `main` (now the default); `main` is branch-protected (PR required, the `validate` CI check required and strict, no force-push or deletion, linear history, conversation resolution; `enforce_admins: false` keeps an owner escape hatch). The repo description, homepage, and topics are set. The Astro Starlight docs site (`site/`) deploys to GitHub Pages (Actions source enabled) at https://product-on-purpose.github.io/agent-skills-toolkit/. Session logs were moved to gitignored `_agent-context/` and purged from history before the flip; `docs/internal/` is intentionally the tracked public-internal folder.

Remaining to reach Gold (Phase 5):
1. **Phase 5 (Gold):** flip the toolkit to declare `tier: advanced` and close the remaining Gold requirements - G1 (hooks documented; the toolkit ships none yet), G2 (self-hosting CI green at advanced), G4 (generated INDEX + manifest drift), G5 (RELEASE-NOTES). G3 and G6 checks already exist; the toolkit already satisfies G3 (chains covered) and G6 (all components active). Then the `v1.0.0` Gold tag.
2. **Docs-site depth:** mount the full Diataxis `docs/` tree into the site in-place (needs frontmatter titles added to the reference/how-to docs); the v1 site is a curated public surface that links out to the full docs on GitHub.
