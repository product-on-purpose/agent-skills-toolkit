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
