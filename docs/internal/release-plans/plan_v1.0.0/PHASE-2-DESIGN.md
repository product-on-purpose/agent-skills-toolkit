# Phase 2 Design - Authoring + Assessment Proof Loop

> Design doc (2026-05-27). Canonical inputs: `agent-skills-toolkit-DESIGN.md` (v0.8, B3/§7.5), `RELEASE-PLAN.md` (Phase 2), repo-root `STANDARD.md` (v0.7). Feeds: `PHASE-2-PLAN.md` (generated next via writing-plans).
> Status: approved by maintainer 2026-05-27. Gitignored working doc (promotion to a committed phase record happens at the phase's first commit, like Phase 1).

## Goal

Prove the core lifecycle **`build-skill` (create) -> `evaluate` -> `build-skill` (improve)** end to end, with the toolkit's own conformance engine (built in Phase 1) doing the assessment. This is the project's "internal alpha": if the loop feels good here, the product thesis is de-risked.

## Locked decisions (maintainer, 2026-05-27)

1. **Validation bar:** structural-in-CI + one recorded manual dogfood. The new skills must pass the toolkit's OWN Bronze checks in CI (dogfooding); the behavioral loop is demonstrated once by hand and recorded. No agent-in-CI harness this phase.
2. **Name prefix:** `askit-` adopted from skill #1 (`askit-build-skill`, `askit-evaluate`). Avoids the `ast-`/abstract-syntax-tree collision; consistent from the first component; no Phase 3 rename. (Resolves the deferred D17.)
3. **Subagents deferred to Phase 3:** Phase 2 ships skills only. `skill-author` and `evaluator` are Convergent (Silver) components; shipping them while the toolkit declares `universal` would put components above its declared tier. So authoring/scanning logic runs **inline** in the skills this phase. The toolkit stays genuinely universal (no "passes because the check does not exist yet" gap). Subagents arrive in Phase 3 where they are validated as Convergent.
4. **Q2.1:** `build-skill --improve` consumes `evaluate`'s `--json` machine report (DRY; dogfoods evaluate). **Q2.2:** `build-skill --create` does a brief inline interview (name, what, when, trigger keywords); no separate authoring subagent this phase.
5. **Target:** Claude only. Multi-agent (Codex) emission is Phase 3.
6. **Declared tier at exit:** still `universal` (Bronze), per the monotonic milestone model. The toolkit now has real skills; its gate runs the skill-level checks (U3-U7) against them.

## Architecture

```
scripts/evaluate.mjs          NEW. Deterministic conformance-core report aggregator (the one new code unit).
                              Reuses Phase 1 runAllChecks + computeTierReport. Scope detection. CLI + --json.
skills/askit-evaluate/        NEW skill. NL assessment front-door; calls scripts/evaluate.mjs.
skills/askit-build-skill/     NEW skill. create + improve modes; scaffolds from templates/SKILL.md; calls askit-evaluate.
templates/SKILL.md            NEW. The SKILL.md skeleton build-skill scaffolds from.
```

### scripts/evaluate.mjs (the only new code unit - TDD)

Composes the existing engine into one structured report. Reuses `loadPlugin`, `runAllChecks` (registry), and `computeTierReport` - no new check logic.

- **Report shape:** `{ scope: "plugin"|"component", target: <path>, findings: Finding[], byRule: { <reqId|check>: Finding[] }, tier, satisfies, blocked, summary: { errors, warns } }`.
- **Scope detection:**
  - path has `library.json` -> **plugin scope**: full `runAllChecks` + `computeTierReport` (as today).
  - path has `SKILL.md` and no `library.json` -> **component scope**: build a single-skill context and run only the skill-applicable checks (U3 frontmatter-valid, U4 name-matches-dir, U5 description-score, U6 reference-links, U7 instruction-budget). Skip plugin-level checks (U1 library-json, U2 anatomy, U8 manifest-drift). Tier is not reported for a lone component (it has no manifest); report per-rule + a component-level pass/warn summary instead.
  - neither -> an actionable error finding ("not a plugin or skill: expected library.json or SKILL.md").
- **CLI:** `node scripts/evaluate.mjs <path> [--json]`. Human form groups findings by rule with remediation; `--json` emits the report object. CLI guard via `process.argv[1]?.endsWith("evaluate.mjs")` (Phase 1 convention).
- **Tests (node:test, golden/anti fixtures):** plugin scope on the golden fixture (clean report, tier universal); plugin scope on an anti fixture (errors grouped by rule); component scope on a single golden skill dir (skill-level rules only, no U1/U2/U8); component scope on a weak-description skill (U5 warn, no error); the neither-case error. Reuse Phase 1 fixtures; add a bare-skill-dir fixture if needed.

### skills/askit-evaluate (authored skill)

`SKILL.md` (agent-canonical): description meeting the 8.1 bar with trigger keywords ("evaluate", "audit", "conformance", "tier", "check my skill/plugin against the Standard"). Instructions: detect scope, run `node scripts/evaluate.mjs <path> --json`, present the per-rule report + tier + remediation in readable form, point the user at `askit-build-skill --improve` to fix warns. Behavioral mode (quality-grader) and review mode (reviewer) are explicitly **out of scope** with a one-line "Phase 4" pointer - not stubbed code, just a documented boundary so `evaluate` stays conformance-core (guards the recurring scope-creep risk R3).

### skills/askit-build-skill (authored skill)

`SKILL.md` with two modes:
- **create:** brief inline interview (name, what it does, when to use it, trigger keywords) -> scaffold `skills/<name>/` from `templates/SKILL.md` -> fill frontmatter (name == dir; description drafted to clear 0.7) -> scaffold `references/` and `examples/` stubs -> run `askit-evaluate` on the new skill and report the result. A la carte: works inside any existing plugin; MUST NOT assume the full anatomy exists (Principle 7) - it creates the skill and offers, never imposes, surrounding scaffold.
- **improve:** run `askit-evaluate <skill> --json`, consume the machine report (Q2.1), and address findings - add the missing samples for a samples warn, rewrite the description to raise the 8.1 score above 0.7, move over-budget content into `references/`. Re-run evaluate to confirm.
- Authoring expertise (the 8.1 description rubric in author-facing terms, the per-component layout, good vs bad examples) lives in `references/` to respect the instruction budget (Principle 2/3).
- Claude target only; the multi-agent `--agent-target` emission is a Phase 3 addition noted in the skill.

### templates/SKILL.md

A minimal, conformant SKILL.md skeleton: frontmatter (`name`, `description`, `metadata.version`) with inline guidance comments, a body outline (purpose, when to use, steps, references pointer). It must itself be a valid starting point that, once filled, passes Bronze.

## Documentation (dual representation, per Standard §10.3) - first-class for this phase

The maintainer requirement: documentation optimized for humans AND agents, separately where that serves each better. The Standard already prescribes the dual-view model; Phase 2 implements it for the new surface. Structured facts live in exactly one canonical place; the other view is generated from or linked to it, never duplicated.

**Agent-facing (canonical):**
- `skills/askit-*/SKILL.md` - terse, instruction-budget-aware, trigger-keyword-rich. The agent's source of truth.
- `skills/askit-*/references/` - lazy-loaded depth (authoring rubric, examples) so SKILL.md stays lean (progressive disclosure).
- `AGENTS.md` - updated: the new skills listed, with a one-line pointer to the build/evaluate loop. Its component references stay in sync with disk (drift is an error, §3.10).

**Human-facing (generated or linked, never duplicating the canonical facts):**
- `skills/askit-*/README.md` - human overview per skill: what it is, when to use it, a short worked example, and a link to the SKILL.md. (Per-component human view, §10.2.)
- `INDEX.md` - regenerated via `gen-index` to list the new skills with their descriptions (the human map; drift-checked against frontmatter).
- Public Diataxis docs under `docs/`:
  - `docs/how-to/build-and-evaluate-a-skill.md` - the end-to-end walkthrough (create -> evaluate -> improve), human-oriented, with copy-paste commands.
  - `docs/reference/askit-build-skill.md` and `docs/reference/askit-evaluate.md` - precise interface reference: modes, inputs, the `evaluate` report shape, exit semantics.
  - `docs/explanation/conformance-and-tiers.md` - why the report maps to the Standard's tiers and the 8.1 description bar (the "why", for humans building mental models).
- `manifest.generated.json` - regenerated via `gen-manifest` to reflect the new skills (the agent-readable resolved index; drift-checked).

**Single-source-of-truth discipline:** frontmatter `description` is authored once in SKILL.md; INDEX.md and manifest.generated.json derive from it (generators); README/docs link to or quote it but the canonical copy is the frontmatter. The drift checks (manifest-drift now; INDEX/AGENTS drift at Gold) keep the views honest.

## Self-validation impact

Adding real skills makes the toolkit's own gate meaningful: U3-U7 now run against `askit-build-skill` and `askit-evaluate`. They MUST pass (name==dir, description >= 0.7, valid frontmatter, resolving reference links, within instruction budget) for the repo to stay green - this is the dogfood. The Phase 1 `seed-bronze` test gains teeth (the U8 "no skills" warning disappears; real skill checks fire). The toolkit remains declared `universal` and passes its Universal checks against itself - the monotonic model holds.

## Testing strategy

- **Deterministic (CI):** `scripts/evaluate.mjs` unit tests (scope detection, report shape, plugin + component scope, golden/anti). The authored skills + template are validated by the toolkit's OWN gate (`node scripts/check.mjs`) - they are dogfood fixtures, and `tests/unit/seed-bronze.test.mjs` already asserts the repo passes Bronze, so it now transitively asserts the new skills conform.
- **Behavioral (manual, recorded):** one dogfood session - run `askit-build-skill` create to author a throwaway sample skill, `askit-evaluate` it, `askit-build-skill` improve it; capture the transcript/result into `dogfood/` (gitignored) and summarize in the phase session log. This satisfies the release plan's "build-skill produces a skill that passes Bronze on first run" + "at least one of the toolkit's own skills is (re)built via build-skill" gate, by hand, honestly labeled as manual.
- **Docs:** reference-link checks (U6) already validate intra-skill links; the new public docs get a light internal-link check in the manual review (a docs link-checker is a later/Gold concern).

## Exit gate (Phase 2)

- `scripts/evaluate.mjs` unit-tested; produces correct plugin- and component-scope reports.
- `askit-build-skill` and `askit-evaluate` authored, and the toolkit's gate (`node scripts/check.mjs`) is green with them present (they pass U3-U7).
- `templates/SKILL.md` present and yields a Bronze-passing skill when filled.
- Dual documentation shipped: per-skill SKILL.md + README, regenerated INDEX/manifest, and the Diataxis how-to/reference/explanation docs.
- One recorded manual dogfood of create -> evaluate -> improve.
- Toolkit still declares `universal` and `tier-report` is clean.
- CI green.

## Explicitly deferred to Phase 3 (scope honesty)

- `skill-author` and `evaluator` subagents (Convergent) - the inline logic refactors into delegated subagents when the toolkit goes Silver.
- Multi-agent (Codex) emission (`--agent-target`).
- `evaluate` behavioral mode (`quality-grader`) and review mode (`reviewer`).
- The prefix becoming a *required* validated convention (a Convergent check), vs the adopted-now convention.
- A docs-site and an automated docs link-checker.

## Risks

- **R3 (evaluate scope creep):** mitigated by keeping `evaluate` conformance-core only, with behavioral/review explicitly out of scope and documented as Phase 4.
- **Authored-skill conformance:** the new skills must clear the 0.7 description bar and budget - if an authored description scores low, fix the description, not the threshold (same discipline as Phase 1's golden fixture).
- **Doc drift:** human docs that restate frontmatter can drift; mitigation is the single-source-of-truth rule (generate/link, do not duplicate) plus the existing drift checks.
