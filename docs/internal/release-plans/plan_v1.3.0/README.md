# plan_v1.3.0 - the gate-evolution program (then v1.4.0, the designed report)

> The planning packet for the next two milestones, run as one program: **v1.3.0 (gate evolution)** makes the deterministic gate legitimate to point at third-party libraries and configurable like a real linter ([F1](./F1-standard-versioning/) standard-aware grading per [ADR 0027](../../decisions/0027-standard-versioning-and-compatibility-policy.md) + [F3](./F3-gate-config/) per-rule config / profiles / suppressions + F4 housekeeping), and **v1.4.0 (the designed report)** ships the HTML / Markdown report renderer the assessment skills have been waiting for ([F2](./F2-report-renderer/), backlog E1).
> Created 2026-06-06. Status: **draft for review, not yet committed** (shape it before any of it ships). Source of truth: ADR 0027 (Standard versioning, Proposed), [ADR 0028 (retire U10 from the spine)](../../decisions/0028-retire-u10-no-dashes-from-the-spine.md), and the linter-vs-judge note (`_local/notes/evaluator-linter-vs-judge-and-consistency.md`). Live status: [`docs/internal/STATUS.md`](../../STATUS.md). Baseline: `main` at **v1.2.0**, Gold, 29-check spine, Standard v0.11.

## Read order

1. **[`PROGRAM-PLAN.md`](./PROGRAM-PLAN.md)** - the whole program: the goal, the two-release split and why it is pinned, the per-feature one-paragraph contracts, the sequencing graph, how it executes the recorded decisions, the F4 folded items, the **SPEC-vs-IMPL reconciliation (sec 7) that fixes the canonical v1.3.0 scope and records the two settled maintainer calls**, release mechanics, risks, and Definition of Done. **Start here.**
2. The **F1** packet: [`F1-standard-versioning/SPEC.md`](./F1-standard-versioning/SPEC.md) (the contract: `since` on every check, the pinned-Standard downgrade, the new STANDARD.md sec 7.7) then [`IMPL-PLAN.md`](./F1-standard-versioning/IMPL-PLAN.md) (the file-by-file build, the two-module helper split, the fixtures and tests). **The IMPL-PLAN is the canonical buildable scope** where it and the SPEC diverge (PROGRAM-PLAN sec 7.1).
3. The **F3** packet: [`F3-gate-config/SPEC.md`](./F3-gate-config/SPEC.md) (the fuller vision: config, profiles, suppressions, provenance, an `info` level, a `config-valid` check, the published-verdict clamp) then [`IMPL-PLAN.md`](./F3-gate-config/IMPL-PLAN.md) (the canonical v1.3.0 scope: `askit.config.json`, `error|warn|off`, the `askit-library`/`plain-plugin` profiles, the suppressions matcher, provenance, the report split). The two diverge by design; PROGRAM-PLAN sec 7.2 reconciles them.
4. The **F2** packet (v1.4.0): [`F2-report-renderer/SPEC.md`](./F2-report-renderer/SPEC.md) (the report information architecture and the hard UX constraints) then [`IMPL-PLAN.md`](./F2-report-renderer/IMPL-PLAN.md) (the phased A/B/C build over the one `evaluate.mjs` report object).

## Per-feature detail packets

Each feature has a verbose SPEC (the requirement-level contract with testable acceptance criteria) and an IMPL-PLAN (the from-cold, file-by-file execution plan with fixtures, tests, verification, and the adversarial-review lenses):

- **[`F1-standard-versioning/`](./F1-standard-versioning/)** (v1.3.0) - the standard-aware gate: each check declares the Standard version it was introduced at (`since`), the gate reads `library.json.standard` and downgrades a post-pin requirement to `warn`, and STANDARD.md gains the normative versioning-and-compatibility section. Implements ADR 0027. **Coupled with F3.**
- **[`F3-gate-config/`](./F3-gate-config/)** (v1.3.0) - the configurable linter: an optional config file for per-rule severity, named profiles (the library ladder vs a portable-plugin subset, plus the opt-in `house-style` slot ADR 0028 named), a durable suppressions baseline, and a `provenance` tag per check that splits "real issues" from "profile conformance." **Coupled with F1**; builds on its version resolution.
- **[`F2-report-renderer/`](./F2-report-renderer/)** (v1.4.0) - the designed report: one shared `report-render` lib adds `--format=md|html` beside terminal and `--json` over the single report object, with a self-contained HTML page (left-docked scroll-spy TOC, print affordance, on-brand palette, no tabs/expanders) and a Markdown twin. A thin, model-free projection that adds no judgment and never moves the verdict.
- **F4 housekeeping** (v1.3.0, no packet) - folded into the F1/F3 PRs and detailed in [`PROGRAM-PLAN.md` sec 6](./PROGRAM-PLAN.md): ratify ADR 0027 in the F1 PR, re-grep for any stale "30-check / G1-G7 / pre-0.11" wording, fold the linter-vs-judge note's now-decided conclusions into tracked docs, and (only if it fits) the E2 deeper-MCP-secret-scan.

## What this delivers

| Release | Theme | Deliverable |
|---|---|---|
| **v1.3.0** | gate legitimacy | the gate honors a plugin's pinned `standard` (post-pin requirements surface as `warn`, never gate-failing) so the Standard is safe to evolve under downstream consumers (ADR 0027) |
| **v1.3.0** | linter ergonomics | per-rule severity + enable/disable, named profiles (library ladder vs portable subset), a durable suppressions baseline, and per-check provenance so "real issues" read apart from "profile conformance" |
| **v1.3.0** | the spine, unchanged | no new spine check, no tier requirement, Standard stays **0.11** (the decided canonical scope); the toolkit's own gate is byte-identical, Advanced 0/0 |
| **v1.3.0** | normative | STANDARD.md sec 7.7 "Standard versioning and compatibility"; a note that gate config is consumer-side and non-normative for conformance |
| **v1.4.0** | consumable output | a designed, shareable, copy-paste-actionable evaluation report in HTML (non-engineers) and Markdown (reviewers/agents), one renderer parameterized by report type across the assessment skills (E1) |

## Key decisions captured here (so the build does not re-litigate them)

- **Two releases, pinned split.** F1 + F3 are coupled (same gate-grading surface, the finding/meta shape) and ship together as v1.3.0; F2 is a large standalone user-facing surface and earns its own v1.4.0 cut. The Gemini emitter is a named deferral, not built in this program.
- **The IMPL-PLAN is canonical where SPEC and IMPL diverge.** The SPECs carry the fuller vision; the IMPL-PLANs carry the buildable v1.3.0 scope. PROGRAM-PLAN sec 7 reconciles every divergence. The two maintainer calls are settled (2026-06-06): the **config filename** is the visible `askit.config.json`, and a **minimal published-verdict trust clamp ships in v1.3.0** (it closes the "profile as a backdoor" gameability hole the risks table names; folded into F3 IMPL-PLAN sec 5).
- **No new spine check in v1.3.0 (decided canonical scope).** A consumer's local grading config is not part of the plugin conformance contract, so config validation is a non-spine validator (`reqId:null`), not a `U13`. This keeps the spine at 29 and the Standard at 0.11, and avoids a 0.12 bump + a burndown in the same release that introduces the burndown machinery.
- **The deterministic gate stays model-free across both releases.** F1 is pure version arithmetic; F3 is pure config resolution with a fixed precedence; F2 is a thin presentation skin over frozen, gate-derived facts. No model decides a tier (Design Principle 3 / ADR 0023).
- **`house-style` is the home ADR 0028 promised.** F3 creates the opt-in `house-style` profile slot (empty for now, since U10/no-dashes was retired to a hook), so a future preference is a toggle a consumer selects, never a universal law.

## Relationship to other packets

- Executes [ADR 0027](../../decisions/0027-standard-versioning-and-compatibility-policy.md) (Proposed; F4 ratifies it in the F1 PR) and generalizes [ADR 0028](../../decisions/0028-retire-u10-no-dashes-from-the-spine.md)'s "house preference belongs in an opt-in surface" into the F3 profile mechanism.
- Sits beside [`plan_v1.1.0/`](../plan_v1.1.0/) (the ADR 0024 docs/checks build-out that took the spine to 30, before ADR 0028 relaxed it to 29) and the shipped [`plan_v1.0.0/`](../plan_v1.0.0/) launch; the v1.3.0 / v1.4.0 marketplace re-pins reuse that launch's registry mechanics.
- Companion working note: the **evaluation-target anchor list** (`_local/notes/eval-target-anchor-list.md`), the corpus of well-known plugins (Anthropic's own, superpowers, and others) to grade against as a calibration anchor once the gate is legitimate to point outward. It is a working note, not part of this release's buildable scope.
- Out of scope (named here so the next pass owns them): the Gemini emitter, autofix, a judge / calibration loop (eval-the-grader, panels, learned preferences), per-component config, and `askit-capability-advisor` report rendering.
