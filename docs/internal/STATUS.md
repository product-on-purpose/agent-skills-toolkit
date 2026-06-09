# STATUS - agent-skills-toolkit

> The single live source of truth for "where are we / what is next." Keep this current; treat session logs as history, not roadmap.
> Last updated: 2026-06-06. Strategic context: [`release-plans/plan_v1.0.0/RELEASE-PLAN.md`](release-plans/plan_v1.0.0/RELEASE-PLAN.md) (v0.2). Decisions: [`release-plans/plan_v1.0.0/DECISIONS-OPEN.md`](release-plans/plan_v1.0.0/DECISIONS-OPEN.md) + the 2026-05-30 audit (`release-plans/plan_v1.0.0/audit/`).

## Current state

- **Declared tier:** Advanced (Gold). `library.json` `tier: advanced`, `standard: 0.11`, version `1.4.1`. Self-proving: the toolkit passes its own Gold gate.
- **Self-validating:** yes. `node scripts/check.mjs` exits 0 (0 errors, 0 warnings); `tier-report` prints Advanced with an empty burndown (satisfies universal + convergent + advanced); `npm test` = 345/345 (verified 2026-06-09).
- **v1.4.0 (the designed evaluation report, F2 / E1):** the `report-render` library renders the one `evaluate.mjs` object as a self-contained HTML page or a Markdown twin in five report types (conformance, migration, release, review, behavioral) via `--format=md|html` and `--report`. A pure presentation layer: no new spine check, no Standard change (spine stays 29, Standard 0.11). Phases A (#111), B (#112), C (#113) all merged to `main` behind clean 4-lens adversarial reviews (the Phase C review caught and the fix closed a critical advisory-merge hole). Public reference: `docs/reference/evaluation-reports.md`. **SHIPPED `v1.4.0` (2026-06-09):** version-bump PR #114; tag `v1.4.0` at commit `da6eded` (`release.yml` minted the GitHub release behind the version-consistency guard; live + Latest), and the marketplace re-pinned to it (`agent-plugins` PR #20, registry `metadata 1.12.0`, entry version 1.4.0); install resolution smoke-verified (marketplace.json -> `da6eded` -> `plugin.json` 1.4.0). No new spine check and no Standard bump: spine stays 29, Standard stays 0.11. Supersedes `v1.3.0`.
- **v1.4.1 (hardening patch over v1.4.0):** a Codex adversarial review of the report renderer surfaced three edge cases on the advisory + migration paths, all fixed: a malformed advisory (missing `findings`/`cases`/`summary`) renders instead of throwing; the Markdown twin HTML-escapes advisory stamps and finding text so an untrusted advisory file cannot inject markup into a `.md`; an invalid `--target-tier` is rejected (CLI exit 2 + `migrateReport` throws) instead of producing an empty plan. Defensive hardening only - the advisory layer still cannot move the deterministic grade or the gate exit code. 345 tests (was 341, +4 regression); gate Advanced 0/0; no spine or Standard change (spine 29, Standard 0.11). **Release in progress** (this bump PR; tag + release + marketplace re-pin + STATUS finalize to follow).
- **Installable:** yes - **SHIPPED `v1.2.0` (2026-06-06).** Tag `v1.2.0` at commit `c1ecd26` (`release.yml` minted the GitHub release behind the version-consistency guard; live + Latest), and the `product-on-purpose` marketplace re-pinned to it (`agent-plugins` PR #16, `metadata 1.8.0`, entry version 1.2.0); install resolution smoke-verified (marketplace.json -> `c1ecd26` -> `plugin.json` 1.2.0). v1.2.0 retires `U10` (no-dashes) for Standard `v0.11` and a 29-check spine. Supersedes `v1.1.0` (2026-06-03, tag `f3250c0`, registry PR #14) and `v1.0.0` (2026-06-02, registry PR #9). Install: `/plugin marketplace add product-on-purpose/agent-plugins` then `/plugin install agent-skills-toolkit@product-on-purpose`; an existing install updates from the marketplace. **SHIPPED `v1.3.0` (2026-06-06): the gate-evolution release (F1 standard-aware gate, ADR 0027, PR #107; F3 configurable gate, PR #108; version-bump PR #109). Tag `v1.3.0` at commit `d8279c2` (`release.yml` minted the GitHub release behind the version-consistency guard; live + Latest), and the marketplace re-pinned to it (`agent-plugins` PR #18, registry `metadata 1.10.0`, entry version 1.3.0); install resolution smoke-verified (marketplace.json -> `d8279c2` -> `plugin.json` 1.3.0). No new spine check and no Standard bump: spine stays 29, Standard stays 0.11. Supersedes `v1.2.0`.**
- **On disk:** 23 skills (the full v1 catalog: `askit-evaluate`; the `askit-build-*` family - skill, subagent, command, mcp, hook, chain-contract, agents-md, output-style, workflow, docs, samples, statusline, settings; governance/lifecycle - `askit-backlog`, `askit-decision`, `askit-release`, `askit-deprecate`; lifecycle/onboarding - `askit-migrate`, `askit-init-plugin`, `askit-init-marketplace`, `askit-template-manager`; advise - `askit-capability-advisor`), 7 subagents (Claude-only: `askit-skill-author`, `askit-evaluator`, `askit-quality-grader` (behavioral judge), `askit-reviewer`, `askit-explorer`, `askit-file-search`, `askit-file-ops`), 2 commands, a 29-check validation spine (Bronze U1-U9, U11-U12, Silver S1-S8, Gold G1-G10: `hook-documentation` G1, `self-hosting` G2, `library-regression` G3, `index-drift` G4, `release-notes` G5, `deprecation` G6, `docs-frontmatter` G7, `folder-readme` G8, `source-doc` G9, `docs-presence` G10; `mermaid-valid` is U12; tier inclusion is an unnumbered structural property, not a numbered check) + generators + `tier-report`/`evaluate`/`check`, 308 tests with golden/anti fixtures + a Codex ingestion round-trip. **v1.3.0 (gate evolution) adds: the standard-aware gate (`meta.since` on every check + a pinned-Standard error->warn downgrade, ADR 0027) and the configurable gate (an opt-in `askit.config.json` for per-rule severity, the `askit-library`/`plain-plugin`/`house-style` profiles, a suppressions baseline, a `provenance` tag per check + the real-issues/profile-conformance report split, and a published-verdict trust clamp). No new spine check: the spine stays 29 and the Standard stays 0.11.**
- **Docs site:** full family Astro site standard conformance (clauses 14.1-14.11; ADR 0026) landed on `main`, and the site is now the **generated Pattern S view** of public `docs/**` (ADR 0024 D2): `site/scripts/gen-docs-site.mjs` emits link-rewritten pages into the gitignored quadrant dirs read by the stock `docsLoader()`, generated at `astro.config.mjs` load, with `check-generated-untracked.mjs` (gitignore-invariant + untracked) and the two 14.11 guards run in CI.

- **ADR 0024 v1.1.0 docs build-out (P0-P6 COMPLETE on `main`):** the staged author-before-enforce program (`release-plans/plan_v1.1.0/`) took the spine 25 -> **30** (U12 + G7-G10) and the Standard to v0.10. All merged: P0 (no-dash hook, G1 non-vacuous; #88), P1 (Diataxis content + frontmatter taxonomy; #89), P2a (`docs-frontmatter` G7 + Standard v0.10; #90), P2b (generated Pattern S site; #91), the HTML evaluation-report templates + E1 (#92), the post-merge reconcile (#93), the P3-P6 spec packets (#94), P3 (`mermaid-valid` U12 + README diagrams; #95), P4 (`folder-readme` G8 + 37 folder READMEs; #96), P5 (`source-doc` G9 + docblocks; #97), and P6 (`docs-presence` G10 + STANDARD v0.10 completion + the `1.0.0 -> 1.1.0` bump). Each phase shipped one PR vs protected `main` with a recorded adversarial review. **Pre-tag adversarial-review fixes (MERGED, PR #99):** a whole-build-out 4-lens adversarial review (`v1.0.0...HEAD`) found one release blocker - `U12` mermaid-valid false-rejecting validly branded diagrams (a `%%{init}%%` directive / `%%` comment / `---` config block before the keyword) - plus seven confirmed lower defects (CRLF reference-style links, G8 fenced-example parsing, U8 version drift only WARN, G10 readdir-order dependence, the RELEASE-NOTES full-file fallback). All fixed with +10 regression tests (280 total, gate 0/0), adversarially re-verified (0 blocking), and merged before the tag; deferred items (the Standard-versioning policy, house-style configurability) are recorded in ADR 0027 (Proposed) + `release-plans/plan_v1.1.0/adversarial-review-resolutions.md`. **v1.1.0 is now FULLY SHIPPED (2026-06-03):** tag `v1.1.0` -> commit `f3250c0`, GitHub release live (Latest), marketplace re-pinned (`agent-plugins` PR #14, metadata 1.7.0), install resolution smoke-verified end to end. The ADR 0024 build-out is complete and released; no maintainer-gated steps remain. **Next (post-1.1.0, maintainer-gated):** ratify or revise ADR 0027 (Standard-versioning/compatibility policy) before any third party grades against the Standard.

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
| 5 | Gold G1-G7 + self-conformance + v1.0.0 | DONE (self-conformance) | toolkit declares `tier: advanced`; full Gold gate G1-G7 green (0/0), 188 tests; PR #75. Remaining: the `v1.0.0` release tag (maintainer-gated) |

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

**Gold self-conformance ACHIEVED (2026-06-01):** the toolkit declares `tier: advanced` and passes the full Gold gate (G1-G7) - built the missing Gold checks (G1 `hook-documentation`, G2 `self-hosting`, G4 `index-drift`, G5 `release-notes`; G3 + G6 already existed) so the claim is non-vacuous, then flipped the tier and bumped to `0.3.0`. Gate green at Advanced, 188/188. On branch `phase-5-gold` / PR #75.

Remaining (maintainer-gated):
1. **DONE 2026-06-02 (the v1.0.0 marketplace launch):** PR #84 merged, `v1.0.0` tagged + released, and the `agent-plugins` registry PR #9 merged (`metadata 1.4.0`, pinned to the tag). The toolkit is live and installable from the marketplace. The marketplace-launch packet (`release-plans/plan_v1.0.0/marketplace-launch/`) drove it; the install smoke (`/plugin install`) is the only step left, run interactively.
2. **DONE (ADR 0024 P1/P2b):** the full Diataxis `docs/` tree is now the generated Pattern S site (frontmatter added on every page; `gen-docs-site.mjs` emits it), superseding the earlier "curated surface linking to GitHub" approach.
3. **DONE (ADR 0024 P0):** the demonstrative no-dash `PreToolUse` hook shipped (`hooks/no-dashes.mjs`), so G1 now grades a real hook instead of passing vacuously.
