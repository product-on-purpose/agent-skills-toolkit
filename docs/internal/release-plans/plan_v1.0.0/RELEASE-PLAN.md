# agent-skills-toolkit - v1 Release Plan

> **Master phased program plan** (v0.2, 2026-05-30; re-baselined from v0.1 of 2026-05-25 against execution reality and the 2026-05-30 audit). Canonical inputs: repo-root [`STANDARD.md`](../../../STANDARD.md) (v0.8, normative) + [`docs/internal/DESIGN.md`](../../DESIGN.md) (consolidated design + D1-D19). Live state: [`docs/internal/STATUS.md`](../../STATUS.md). Decisions: [`DECISIONS-OPEN.md`](./DECISIONS-OPEN.md) + [`audit/`](./audit/).
> This is the *program* plan: phases, gates, sequencing, the milestone-validity model, scope, risks, and decisions. It is **not** a per-file TDD plan; each slice gets its own implementation plan when it starts.

**Goal:** Ship `agent-skills-toolkit` v1.0.0 - a public Claude (Code and Cowork) + Codex plugin that lets people author, govern, and scale a plugin into a Gold-tier skill library, and that is itself a Gold-tier, CI-self-validating example of its own Standard. Gemini and other agents are a named v1.x roadmap, not v1.

**Architecture:** One self-hosting plugin organized around a versioned Standard. Deterministic Node scripts do objective checks (conformance/portability/security); LLM skills + subagents do authoring and judgment. The plugin is built to its own Standard and its CI validates it against that Standard.

**Tech stack:** Node (single runtime, baseline >=20 LTS) for scripts/generators/CI; agentskills.io `SKILL.md` for skills (portable to Claude, Codex, Gemini, and ~32 agentskills.io agents); markdown for all authored components; GitHub Actions that only shell out to the portable scripts.

---

## What changed in v0.2 (read this if you knew v0.1)

1. **Re-baselined to reality.** v0.1 showed one coarse "Phase 3." Execution subdivided it into **3A / 3B / 3C-1 / 3C-2a / 3C-2b** (all shipped) with **3C-2c** designed and **3C-2d+** pending. The phase table (Section 3) now reflects this. See [`STATUS.md`](../../STATUS.md) for live status.
2. **Canonical inputs corrected.** v0.1 cited `STANDARD.draft.md` v0.7 (a stale duplicate) and DESIGN as canonical. The canonical normative document is repo-root `STANDARD.md` v0.8; the draft in this bundle is superseded (see [`STANDARD.draft.md`](./STANDARD.draft.md) header).
3. **Scope decided (2026-05-30).** v1 agents = **Claude (Code and Cowork) + Codex**; **Gemini = v1.x roadmap**. v1 components = **the full builder catalog** (all 27 functional areas), consolidated under the `build-<type>` taxonomy. Beginner on-ramp pulled forward to the Silver preview.
4. **New workstreams added** that v0.1 lacked: update-ingestion / spec-sync, CI + supply-chain hardening, docs/visuals/samples, an agentic-execution task layer, and a behavioral eval layer.
5. **R6 (scope/burnout) is now the dominant risk** because of the full-catalog decision. Section 5 details the mitigations (delivery waves + the always-shippable monotonic-tier model + the early Silver preview).

---

## 0. How this plan works

A sequenced, gated program plan. Each phase has a goal, scope, the conformance tier the toolkit self-validates at on exit, an exit gate, risks, and decisions. It is not a step-by-step write-test/implement plan: skills, subagents, commands, hooks, and AGENTS.md are authored markdown validated against the Standard; only the Node script suite (Phase 1) is classic TDD code. Each slice gets a focused implementation plan when it starts (`writing-plans`), now expressed as **agent-executable task specs** (Section 6).

---

## 1. The self-hosting bootstrap (unchanged from v0.1, retained)

The toolkit's credibility proof is "it validates itself against its own Standard in CI," but the validators are components of the toolkit being built. Resolution: freeze the Standard, hand-author a Bronze seed (Phase 0), build the validation spine (Phase 1) as plain Node with its own tests, then every later component is born validated. Phases 0-1 were the only window where the toolkit was not self-validating; `docs/internal/BOOTSTRAP.md` documents that bounded exemption, now ended.

## 2. The milestone-validity model (unchanged from v0.1, retained)

The toolkit declares a target tier in `library.json` that rises phase by phase. At every phase exit it MUST pass its own checks at its currently declared tier (no higher, no lower), so it is never "failing by design" and never "claiming Gold prematurely." "Self-valid at every milestone" means `tier-report` prints the declared tier with an empty `blocked` list at every phase exit. The Gold claim (`tier: advanced`) is earned only at Phase 5.

| Phase exit | Declared tier | Why honest here |
|---|---|---|
| 0 | none (seed) | no validators exist yet (bootstrap exemption) |
| 1 | universal (Bronze) | only skills + scripts + manifest + AGENTS.md exist |
| 2 | universal (Bronze) | subagents exist; Silver contract incomplete |
| 3 | convergent (Silver) | multi-agent emission + chain contracts real |
| 4 | convergent (Silver) | governance/lifecycle/init added; Gold pieces pending |
| 5 | advanced (Gold) | G1-G7 genuinely met |

**Current actual position: end of Phase 3C-2b, declared Silver, gate green.**

---

## 3. The phases (re-baselined)

Phases 0-2 are complete and unchanged from v0.1; summarized here, detailed in the per-phase plan docs.

- **Phase 0 - Repo + Standard seed.** DONE (tag v0.1.0). Hand-authored Bronze seed + promoted Standard.
- **Phase 1 - Validation spine.** DONE (v0.2.0). Node checks + generators + `tier-report` + CI parity; first self-validation at Bronze.
- **Phase 2 - Authoring/assessment core.** DONE (v0.2.0). `build-skill` + `evaluate` + `skill-author`/`evaluator` subagents; the build -> evaluate -> improve proof loop.

### Phase 3 - Multi-agent emission + the build-* creators (Silver) [re-baselined into sub-phases]

**Goal:** Every Convergent component type can be created and validated, emitted per `--agent-target` for Claude and Codex. The toolkit reaches and holds Silver.

| Sub-phase | Ships | Status |
|---|---|---|
| 3A | Codex contract v0.8 + Silver conformance core (S1-S5) | DONE `c79be5c` |
| 3B | Multi-agent emission spine (`gen-manifest` per target + S6 + Codex ingestion round-trip) | DONE `65ba9a8` (#49) |
| 3C-1 | Silver self-claim: `tier: convergent`, v0.2.0 | DONE `a672485` (#53) |
| 3C-2a | `build-subagent` + dogfood the toolkit's own subagents (Claude-only per Codex constraint) + S4 | DONE `c2dca9b` (#63) |
| 3C-2b | `build-command` + the shared `builder-pattern.md` contract + S7 | DONE `6b9d419` (#74) |
| 3C-2c | `build-mcp` + the **STANDARD sec 3.9/10.1 MCP correction** + component-level S6 + ingestion round-trip | DESIGNED |
| 3C-2d | `build-hook` (#16430 caveat), `build-workflow` (+ S4 step-orphans + S5), `build-chain-contract`, `build-agents-md`, `build-output-style` (Claude-only) | PENDING |

**Decisions recorded by execution (were absent from v0.1):**
- **Option A (subagents Claude-only):** Codex `plugin.json` has no `agents` field as of v0.135, so plugin-distributable subagents are Claude-only; subagents declare `agent-targets: [claude]`. Codex subagents are a user/project `config.toml` concern.
- **No render-harness (R4 dissolved):** `gen-manifest` does the per-target manifest-pointer wiring; builders share `builder-pattern.md` rather than a render engine. Risk R4 (builder sprawl) is retired.

**Exit gate (Phase 3 complete):** all Convergent component builders exist and validate; the toolkit emits and validates its own Codex artifacts; chain-contract check passes; a fixture plugin round-trips Claude+Codex; `tier-report` prints Silver. **The public Silver preview ships at this point (Q-A=C):** repo goes public, a labeled `0.x` tag, no marketplace yet.

### Phase 4 - Governance, lifecycle, advise, init-*, judgment subagents, and the full-catalog tail

**Goal:** The full operating surface plus the full-catalog components, so the toolkit is a governed library product that can scaffold itself.

**Ships (consolidated v1 taxonomy; see [`STATUS.md`](../../STATUS.md) burndown for the per-area list):**
- Govern: `backlog` (intake/triage/prune), `decision` (ADR/RFC).
- Lifecycle: `release` (gate/version/changelog/release-notes), `migrate` (foreign-repo onboarding), deprecation policy + status handling.
- Advise: `capability-advisor`.
- Judgment subagents: `reviewer`, `quality-grader`, `explorer`, `file-search`, `file-ops`.
- Bootstrappers: `init-plugin` (interview/questionnaire/hybrid) + `init-marketplace`.
- Full-catalog tail: `askit-build-docs` (dual-audience, multi-level docs incl. a Starlight `site` mode) and `askit-build-samples` (threads-aware golden/anti generator) - the +2 net-new skills per ADR 0021; `build-statusline`, `build-settings`, `template-manager`; the behavioral eval layer (eval-harness + library-regression); and `evaluate`'s behavioral/review modes wired to the judgment subagents. (`changelog`/`release-notes` are modes of `release`; the catalog's 6-7 docs/sample micro-skills collapse into `build-docs` + `build-samples`.)

**Counterintuitive placement (retained):** `init-plugin` is built late so it encodes a stable anatomy, and is proved by regenerating the Phase 0 seed (asserted test).

**Exit gate:** `init-plugin` regenerates the seed; `migrate` brings a messy fixture repo up a tier; `release` computes the version deterministically; behavioral eval modes return sane output; the full-catalog builders pass their own conformance + triggering evals; still Silver.

### Phase 5 - Gold self-hosting, hardening, and v1.0.0

**Goal:** Meet G1-G7 against itself, complete hardening + docs/visuals + self-conformance, declare Gold, ship v1.0.0.

**Ships (mapped to frozen Gold criteria + audit hardening):**
- G1 hooks documented (incl. the no-dashes hook as a real self-enforcement demo).
- G2 self-hosting CI runs the full tier-applicable suite (now including the OS x Node matrix + security scanning).
- G3 eval/regression coverage for the toolkit's own chains + hooks.
- G4 generated `INDEX.md` + manifests, drift-checked.
- G5 curated `RELEASE-NOTES.md` distinct from `CHANGELOG.md`.
- G6 deprecation policy + status handling.
- G7 all Bronze + Silver checks green.
- **Self-conformance:** the toolkit's own skills ship samples + triggering eval sets (closes the audit's self-conformance gap).
- **Docs/visuals complete:** Diataxis tutorials quadrant populated, mermaid diagrams at the key surfaces, governance files present.
- Flip `tier: advanced`; tag `v1.0.0`; register in the marketplace (D8).

**Exit gate:** CI green at Gold; `tier-report` prints advanced with empty blocked; `v1.0.0` tagged; marketplace entry live; a fresh clone walkthrough works end to end on Claude and Codex.

---

## 4. Scope (decided 2026-05-30) and the v1.x roadmap

**v1 agents: Claude (Code and Cowork) + Codex.** Research confirms Claude Cowork consumes the same plugin format as Claude Code (claude.com/plugins is "Plugins for Claude Code and Cowork"), so Cowork is one target with Claude Code; the only added work is a verify-it-loads-in-Cowork step plus Cowork positioning, not a new emitter.

**v1 components: the full builder catalog** (all 27 functional areas in `builder-skills-catalog.md`), consolidated under the `build-<type>` taxonomy (`create`/`improve` modes + the generic `evaluate`), not 60 discrete skills. The exact consolidated count is fixed by the wave plan (Section 5).

**v1.x roadmap (named, not v1):**
- **Gemini emitter.** Cheapest-feasible third target: Gemini CLI reads `SKILL.md` natively and the cross-tool `.agents/skills` path (Bronze ports nearly for free); the new work is the `gemini-extension.json` wrapper, `.toml` commands, and a Gemini subagent format. Add a third column to the per-target capability matrix (Gemini extensions DO ship subagents, unlike Codex).
- **AGENTS.md-everywhere positioning.** `AGENTS.md` is confirmed to work across Claude, Codex, Gemini, Copilot, and Cursor; elevate it as the cheapest credible cross-tool surface.
- **Docs-site versioning + video.** The Astro Starlight docs site itself is now IN v1 (Section 6 + ADR 0021); only `starlight-versions` (side-by-side STANDARD versions) and asciinema/video casts remain v1.x.

---

## 5. Risk register and the R6 wave plan

| # | Risk | Phase | Severity | Mitigation |
|---|---|---|---|---|
| R1 | Bootstrap seed silently non-conformant | 0-1 | (retired) | Auto-verified once the spine existed |
| R2 | Codex packaging/discovery layout differs from assumption | 3 | (mostly retired) | Spikes done; re-verify `codex --version` per build slice (this is the update-ingestion hook) |
| R3 | `evaluate` re-bloats into "does everything" | 2,4 | Med | Conformance-core only; behavioral/review delegated to judgment subagents |
| R4 | Builder sprawl / inconsistent UX | 3 | (retired) | `builder-pattern.md` shared contract; no render-harness |
| **R6** | **Scope/burnout on full-catalog v1 + Gold** | all | **High** | **The wave plan below + always-shippable monotonic tiers + early public Silver preview** |
| R7 | LLM judgment subagents produce flaky gates | 4 | Low-Med | Judgment outputs advisory, never release-gating |
| R8 | Gold "baseline eval" balloons | 5 | Med | Hold the frozen line: presence + execution + chain regression only |
| R9 | Standard drifts from upstream specs (sec 3.9 was the proof) | all | Med | The update-ingestion / spec-sync workstream (Section 6) |
| R10 | Plan goes stale again as slices subdivide | all | Med | `STATUS.md` is the live tracker; this plan is revised per wave |

**R6 wave plan (delivery order within the full-catalog v1):**
- **Wave A (re-baseline + harden, now):** RELEASE-PLAN v0.2 + STATUS.md; the cheap P0 fixes (sec 3.9, version + dash checks, LICENSE, first mermaid, governance files, link sweep). Clears credibility cracks before the public preview.
- **Wave B (finish Convergent builders, 3C-2c..2d):** build-mcp, build-hook, build-workflow, build-chain-contract, build-agents-md, build-output-style. -> **Public Silver preview (Q-A).**
- **Wave C (governance + lifecycle + init):** backlog, decision, release, migrate, init-plugin, init-marketplace, capability-advisor.
- **Wave D (full-catalog tail + judgment + eval):** build-statusline, build-settings, samples builder, template-manager, deprecation, the judgment subagents, and the behavioral eval layer.
- **Wave E (Gold + v1.0.0):** G1-G7, self-conformance, docs/visuals complete, CI/security hardening, tag + marketplace.

Each wave exits self-validating at its declared tier, so any wave boundary is a legitimate stop point if energy or priorities shift.

**Release cadence (DECIDED 2026-05-30, aggressive progression): ship a public `0.x` tag at every wave boundary.**

| Wave | Tag | Public action |
|---|---|---|
| A | (none) | internal re-baseline + hardening; no tag needed |
| B | `0.3` | repo goes public, labeled Silver preview (Q-A); no marketplace yet |
| C | `0.4` | governance + lifecycle + init landed |
| D | `0.5` | full-catalog tail + judgment + eval landed |
| E | `1.0.0` | Gold + dogfooding capstone + marketplace registration |

`v1.0.0` is the **destination reached through this cadence**, not the first public artifact. This reconciles "ship early and often" with "comprehensive, higher-quality-than-typical v1": the waves are the early-and-often, the accumulation is the comprehensiveness, the monotonic gate is the quality. Every tag is a real, working, gate-green release. Each tagged release MUST pass the release-readiness gate (ADR 0022): README, CHANGELOG, RELEASE-NOTES, and the architecture/decision docs are updated and present as a hard, automated precondition - the maintainer never has to ask.

---

## 6. New workstreams (added in v0.2)

**Update-ingestion / spec-sync (closes R9).** A committed `docs/internal/COMPATIBILITY.md` table pinning each upstream source (agentskills.io spec, Codex CLI, Claude plugin format, and later Gemini) with a last-verified version + date; a scheduled CI job that opens an issue when a pin moves; the `tests/fixtures/{golden,anti}` suite reframed as a conformance suite versioned in lockstep with the `standard` field; a Standard-amendment RFC path under `docs/internal/rfcs/`. The pending sec 3.9 fix is the first tracked item.

**CI + supply-chain hardening (audit R-05..R-11).** OS x Node matrix; CodeQL + dependency-review + secret scanning + OpenSSF Scorecard; npm provenance/SLSA at release; Release Please for changelog-driven releases + `RELEASE-NOTES.md`; branch protection + CODEOWNERS; the portable no-dashes check; a `STANDARD.md` sec 9 supply-chain clause.

**Docs, examples, docs-site, beginner on-ramp (audit R-12..R-16; ADR 0021).** The full dual-audience, multi-level Diataxis set incl. the missing tutorials quadrant + a root QUICKSTART (glossary / FAQ / troubleshooting; an architecture **overview + detailed** pair; a mandatory ADR **TL;DR** convention - the summary+detailed requirement); mermaid at the key surfaces, enforced by a `mermaid-valid` check; an **Astro Starlight docs site deployed to GitHub Pages**, copied near-verbatim from the proven pm-skills stack (in-place markdown mount so the site is a generated view, not a second store; a separate composable `deploy-pages.yml`; `ci.yml` stays the gate); two net-new consolidated skills - `askit-build-docs` (doc types incl. a `site` scaffold+deploy mode) and `askit-build-samples` (threads-aware) - so users author best-in-class docs + examples for their OWN plugins; a bounded **example-threads** pattern (2-3 recurring example plugins, the toolkit itself as the Gold thread, examples kept co-located per the Standard); CONTRIBUTING / CODE_OF_CONDUCT / SECURITY; a trimmed `AGENTS.md`. The toolkit dogfoods every one of these on itself. v1.x: starlight-versions, video casts, the showcase gallery, the threads machine-contract + consistency check, the docs-presence check.

**Agentic-execution layer (audit plan 4.5).** Each remaining slice expressed as task specs with a machine-checkable acceptance criterion (exact command + expected `tier-report` state, keyed to a requirement ID), an approval gate (criteria well-formed) and a verification gate (`check.mjs` exit 0 + the `blocked` list shrinks), worktree-isolated parallel subagents for independent builders, and a `@claude` issue-to-PR surface (budget for the 2026-06-15 programmatic-billing change). This makes "done" provable and the remaining build safely agent-driven.

---

## 7. Decisions (status)

The seven Q-A..Q-G decisions in [`DECISIONS-OPEN.md`](./DECISIONS-OPEN.md) stand. The 2026-05-30 audit added and resolved:
1. **Multi-tool scope:** Claude (incl. Cowork) + Codex in v1; Gemini v1.x. DECIDED.
2. **v1 component boundary:** full catalog, consolidated taxonomy. DECIDED (maximal; R6 dominant).
3. **Beginner UX:** minimal on-ramp pulled to the Silver preview. DECIDED.
4. **Re-baseline shape:** RELEASE-PLAN v0.2 + live STATUS.md + agentic task layer. DECIDED (this document).
5. **Bundle status:** open - commit a cleaned canonical subset vs working-only (audit plan-v1 decision 4). Pending maintainer.
6. **Update-ingestion:** lightweight standing spec-sync process. DECIDED (Section 6).
7. **License:** Apache-2.0 recommended (patent grant for a standard). Pending maintainer confirmation.

---

## 8. Definition of done - v1.0.0

- [ ] `tier-report` prints `advanced` (Gold) with an empty `blocked` list; CI green at Gold; local/CI parity.
- [ ] The full consolidated builder catalog (all 27 areas) present, each passing conformance + triggering evals.
- [ ] Multi-agent emission verified for Claude (incl. a Cowork load check) + Codex.
- [ ] `init-plugin` regenerates the Phase 0 seed (asserted test).
- [ ] Self-conformance: the toolkit's own skills ship samples + eval sets.
- [ ] Docs/visuals complete (tutorials quadrant + mermaid); governance files present; CI hardened (matrix + security).
- [ ] Update-ingestion process live (COMPATIBILITY.md + scheduled drift check).
- [ ] `v1.0.0` tagged; `RELEASE-NOTES.md` written; registered in the marketplace.
- [ ] Gemini recorded as a v1.x roadmap item with the per-target extension model sketched.

---

## Change log
- 2026-05-30 v0.2 (rev b): Folded in the docs/examples/docs-site strategy (ADR 0021): docs-site is IN v1 (Astro Starlight + GitHub Pages, copied from pm-skills); +2 net-new consolidated skills (`askit-build-docs`, `askit-build-samples`) that collapse the catalog's 6-7 docs/sample micro-skills; the summary+detailed architecture/ADR convention; the bounded example-threads pattern. Recorded the ADR 0020 decisions: full catalog ("truly everything") in v1, and all subagents `askit-` prefixed. Corrected the stale "defer docs site" wording.
- 2026-05-30 v0.2: Re-baselined to execution reality (real 3A-3C-2d decomposition + DONE/SHAs); corrected canonical inputs to STANDARD.md v0.8; recorded the 2026-05-30 scope decisions (full-catalog v1, Gemini v1.x, beginner on-ramp pulled forward); added the update-ingestion, CI/supply-chain hardening, docs/visuals/samples, and agentic-execution workstreams; promoted R6 to dominant with the wave plan; added R9 (upstream drift) and R10 (plan staleness). Added the Section 0 "what changed" guide and the live STATUS.md pointer.
- 2026-05-25 v0.1: Initial phased release plan. Resolved F-07 via the monotonic milestone-validity model; established the self-hosting bootstrap resolution and the late placement of init-plugin; surfaced six maintainer decisions.
