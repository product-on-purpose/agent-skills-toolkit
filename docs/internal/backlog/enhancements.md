# Enhancement backlog

> Features, fixes, and refinements to existing components (Standard sec 7.1). Each item references the target component and describes the change. When `askit-backlog` (Phase 4) ships, it manages this file; until then, items are recorded by hand.

## E1 - Designed evaluation report (HTML + Markdown), shared across the assessment skills

- **Target:** `askit-evaluate` first, then the broader assessment / advisory family (see "Which skills" below).
- **Change:** over the ONE structured report object `scripts/evaluate.mjs` already produces, add `--format=md|html` renderers (alongside terminal + `--json`), so MD / HTML / JSON never diverge. The HTML is a **self-contained** page (inline CSS; a small amount of inline JS for the TOC scroll-spy and the copy-prompt buttons is allowed; no external assets, no binaries).
- **Information architecture (designed thoughtfully):**
  1. **Masthead / verdict** - subject, report type, date, the headline grade (tier earned), a climb indicator, and key stats (checks passed, blockers, warnings, gate exit code).
  2. **Executive summary** - for a non-engineer: what was evaluated, the verdict, the top findings, the recommended next move.
  3. **What was evaluated / component breakdown** - the subject's identity (declared tier, version, agent-targets, prefix), its components and functionality, anatomy.
  4. **Methodology & scope** - the three layers (deterministic conformance decides the tier; behavioral and review sit beside it), the legend, and a confidence / limitations note (which findings are exact vs judgment; vacuous passes such as `G1`/`G6`).
  5. **Tier compliance - evidence ledger** - per tier (Bronze / Silver / Gold) a verdict bar plus a row per requirement: status, the evidence (what was found, file:line and check module), and for every non-compliance a short **why it matters** explanation with impact.
  6. **The climb / burndown** - exactly what blocks the next tier, ordered, with effort estimates.
  7. **Improvement path** - a card per gap: the issue, the fix, a **copy-paste prompt** that executes it with the toolkit's own skills, plus priority and effort.
  8. **Insights** - qualitative observations and strategic notes beyond pass / fail.
  9. **Evidence & sources** - citations grounding each finding (check module, Standard clause, file).
  10. **Report metadata** - subject and Standard versions, evaluator, gate exit, timestamp, and the status / severity legend.
- **Hard UX constraints (maintainer, 2026-06-03):** **no content hidden behind tabs or expanders** (everything visible, linear scroll); a **left-docked TOC** (sticky, with a scroll-spy active state); a print / Save-PDF affordance; on-brand (the family `#5C7CFA` plus the Bronze / Silver / Gold palette). This supersedes the earlier "collapsible per-rule sections" sketch.
- **Sample templates:** `docs/internal/template/evaluation-report--plugin.html` (and siblings) demonstrate the IA and visual language the renderer should target.
- **Which skills could / should have a report (the report is a shared pattern, not a one-off):**
  - `askit-evaluate` - the conformance + behavioral + review report (this item).
  - `askit-migrate` - a **migration assessment**: current state, gap-by-tier, and the staged Bronze-to-Gold roadmap (same IA; the "improvement path" becomes the staged plan).
  - `askit-capability-advisor` - a **readiness report**: the per-agent capability matrix and the recommended target tier before building.
  - `askit-release` - a **release-readiness** report: the gate result, the changelog / notes summary, and a go / no-go.
  - `askit-reviewer` - a **review report**: qualitative findings with severity (the judgment layer rendered).
  - the behavioral mode (`askit-quality-grader`) - a **behavioral report**: per-case fire / no-fire and output-quality verdicts.
  Recommend ONE shared report renderer (a `report-render` lib over the report object, plus the IA above) parameterized by report type, not per-skill bespoke HTML - matching the toolkit's generation-over-duplication ethos.
- **Why:** serves the "summary AND detailed" plus visuals requirement (ADR 0021 / 0024); makes results consumable by non-engineers (HTML) and agents / PR review (Markdown), not only in the terminal or as JSON; a designed, shareable, copy-paste-actionable report is part of the best-in-class differentiator.
- **How to apply (sketch):** one renderer over `evaluate.mjs`'s report object; portable Node, no new runtime, no binary assets (preserves the "CI only shells out to portable scripts" principle). The MD format reuses the summary-plus-detailed convention; the HTML matches the sample templates.
- **Tier / phase:** enhancement; v1.x. Strong candidate to pair with the docs / visuals build-out.
- **Status:** backlog (recorded 2026-05-31; expanded 2026-06-03 with the full IA, the no-tabs / left-TOC constraints, the shared-pattern skill list, and a sample template in `docs/internal/template/`).

## E2 - Deeper MCP secret scanning

- **Target:** the `mcp-valid` check (U11) and `askit-build-mcp`.
- **Change:** broaden inline-secret detection beyond `env` values, `bearer_token`, and url userinfo / secretish query params: recursively scan server definitions (args, headers, nested objects) and recognize more credential shapes (JWTs, base64-ish tokens containing `.`/`/`/`+`/`=`). Use field-aware allowlists to avoid false positives.
- **Why:** the Codex adversarial review (2026-05-31) flagged that the current heuristic misses credentials in args, headers, and non-secretish keys. A bounded improvement (url userinfo + secretish query params) shipped immediately; the recursive scan is deferred so the heuristic can be tuned against golden/anti fixtures before it risks over-eager false positives.
- **Status:** backlog (recorded 2026-05-31).

## E3 - Gate config follow-ups (autofix, user-authored profiles, fingerprint suppressions)

- **Target:** the F3 gate-config layer (`scripts/lib/config.mjs`, `profiles.mjs`, `resolve-config.mjs`, `suppressions.mjs`).
- **Change:** the deferrals named out of F3 scope, recorded so they are not lost: (a) **autofix** for mechanical rules (apply the obvious repair rather than only reporting it); (b) **user-authored custom profiles** in `askit.config.json` (a `profiles` block defining new `reqId -> severity` maps, beyond the built-in `askit-library` / `plain-plugin` / `house-style`); (c) a **content-addressed fingerprint** suppression model with `expires` and stale/expired tracking (richer than the current `reqId` + glob + message-substring matcher), paired with an `askit suppress` helper; (d) an `info` severity level for advisory house findings that should surface without counting as a warning; (e) per-component (skill-scope) config.
- **Why:** F3 shipped the high-leverage core (per-rule severity, the built-in profiles, the suppressions baseline, provenance, the report split, and the published-verdict clamp); these refinements wait until the core proves out. The `house-style` profile slot and the `{ "severity": ... }` rule object form were built to accommodate them without a breaking change.
- **Status:** backlog (recorded 2026-06-06, alongside the v1.3.0 F3 ship).

## Competitive gap-analysis intake (2026-06-10)

The actionable output of the verified competitive comparison (`docs/internal/research/gap-analysis.md`), which graded agent-skills-toolkit against the field from primary sources. Each item cites the gap-analysis and the competitor profile(s) that motivate it; effort estimates (S/M/L) carry from the gap-analysis. Two existing items here are CORROBORATED by this evidence rather than duplicated: **E3(a) autofix** (gap-analysis Adopt 4 - `skill-check` `--fix` and `skills-check` `lint --fix` / `doctor` both ship it, so the competitive case for autofix is now externally evidenced), and **E2 MCP secret scanning** (complemented, not replaced, by E6 below). The **U5 description-scorer recalibration** (a gap-analysis honesty note) is an ADR 0029 follow-up already queued by the v1.5.0 corpus-run workstream; not duplicated here.

### E4 - SARIF + GitHub-annotation output  [adopt, effort S]

- **Target:** the shipped report renderer / evaluate output (`scripts/lib/report-render.mjs`, `scripts/evaluate.mjs`); extends the E1 renderer with CI-machine formats.
- **Change:** add a SARIF 2.1.0 emitter and GitHub Actions `::error` / `::warning` annotations alongside the human / HTML / Markdown outputs, so findings land in the GitHub Security tab and inline on the PR diff. The provenance class (ADR 0029) rides along as a SARIF rule property (see E9).
- **Why / source:** `gap-analysis.md` Adopt 1; askit is "no SARIF" (matrix dim 12) while `skill-check` and `skills-check` both emit it (dim 12). Pure serialization of data the gate already computes; deterministic, no verdict change.
- **Status:** backlog.

### E5 - semver-bump-vs-content-diff verification  [adopt, effort M]

- **Target:** the gate (`scripts/check.mjs` plus a new check module, or an `evaluate` verify mode).
- **Change:** given a declared version bump and the content diff against the prior version, verify the change magnitude justifies the bump. Keep it deterministic (structural + content-similarity heuristics; no LLM in the verdict).
- **Why / source:** `gap-analysis.md` Adopt 2; `skills-check` `verify` (dim 9) is the standout, with a `--skip-llm` deterministic path. askit is semver-enforced but does not check the bump against the diff (matrix dim 9).
- **Status:** backlog.

### E6 - prompt-injection + curl-pipe-bash content scan  [adopt, effort M]

- **Target:** the security checks (complements E2's MCP-secret scan; this one operates on skill content, not MCP config).
- **Change:** deterministic pattern checks for pipe-to-shell installers (`curl|bash`, `wget|sh`, `bash <(curl ...)`) in prose and code blocks, plus a curated prompt-injection / dangerous-command pattern list, on the objective tier. Bundle the patterns; do not shell out.
- **Why / source:** `gap-analysis.md` Adopt 3; `skills-validator` dim 11 (pipe-to-shell + semgrep), `skills-check` dim 11 (audit). askit has secret-scan only (matrix dim 11). `skill-check`'s external-`mcp-scan` adapter (defaults off because the dependency is unbundled) is the anti-pattern to avoid.
- **Status:** backlog.

### E7 - eval / regression harness hardening (selective borrow)  [adopt, effort M]

- **Target:** `askit-evaluate` behavioral mode plus the `G3` regression check.
- **Change:** borrow identity-safe deterministic scaffolding: held-out train/test split to prevent overfitting (skill-creator), baseline-diff regression with explicit accept / update, multi-trial with a pass threshold, cost caps. Keep the LLM as opt-in evidence beside the gate, never the verdict; do not adopt unsandboxed shell execution.
- **Why / source:** `gap-analysis.md` Adopt 5; `skill-creator` dim 10 (train/test eval loop), `skills-check` dim 10 (eval suites). askit already has the spine (matrix dim 10).
- **Status:** backlog.

### E8 - published conformance suite  [build, effort M]

- **Target:** the objective-tier check spine, packaged as a standalone runnable suite (may graduate to a new-component proposal when scoped).
- **Change:** package askit's objective-tier checks plus a pass/fail fixture corpus as a portable conformance suite any author or competing tool can run to get the same deterministic verdict - the standard made executable and externally reproducible.
- **Why / source:** `gap-analysis.md` Build 1; only askit is both deterministic AND self-proving (matrix dims 3, 6), so only askit can credibly publish reproducible conformance; competitors are not confirmed self-checked (dim 6).
- **Status:** backlog.

### E9 - provenance split as a consumable output contract  [build, effort S]

- **Target:** the findings / output schema (ADR 0029 follow-up; pairs with E4).
- **Change:** expose the objective / vendor-cited / house classification as first-class machine-readable output on every finding (JSON, and a SARIF rule property once E4 lands), documented as a stable contract so a consumer can filter to "portable objective failures only."
- **Why / source:** `gap-analysis.md` Build 2; provenance taxonomy is the sole dimension where askit stands alone (matrix dim 16: askit "yes" vs the field's "no" / "partial" / "n/a"). The third-party-grading use case ADR 0029 was written for.
- **Status:** backlog.

### E10 - MCP-served-skill validation  [build, effort L, speculative]

- **Target:** the gate (forward-looking; no committed target yet).
- **Change:** validation for skills delivered over MCP (served, not on-disk) - schema, provenance, and budget checks when the "library" is a set of MCP-exposed capabilities.
- **Why / source:** `gap-analysis.md` Build 3 (flagged speculative). No profiled tool validates MCP-served skills; askit's whole-library framing (matrix dim 1) is the closest start. Watch-and-prototype; revisit when the corpus surfaces a real MCP-served library.
- **Status:** watch (do not start until there is a concrete target).
