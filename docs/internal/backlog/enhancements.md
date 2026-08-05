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

## Eval-run practice intake (2026-06-10)

### E11 - dependable eval-run pipeline (inputs, dispatch, capture, record)  [build, effort M]

- **Target:** the eval-run practice (`docs/internal/eval-runs/`), `askit-evaluate` review/behavioral modes, and a small new runner script for the deterministic half.
- **Change:** make the run lifecycle dependable end to end instead of hand-orchestrated: (a) a **tracked target manifest** (repo URL + pinned sha + shape + chosen profile per target - the missing piece the corpus runs also named); (b) a **deterministic runner** (portable Node) that clones/verifies the pin, runs the gate, renders the free conformance report, and emits the record-row skeleton with the artifact paths laid out under `_local/audit/eval-runs/<date>/` - zero model tokens, fully scriptable; (c) a **dispatch contract** for the advisory half: the askit-reviewer / askit-quality-grader role-prompt templates (including the effort-level wording, the sampling protocol for collection-scale targets, and the plain-ASCII output rule), the advisory JSON schema, and the token/wall-clock capture convention (`subagent_tokens` per dispatch) - documented so any session reproduces the same shape without re-deriving it; (d) **record + aggregate automation**: append the completed row to `eval-runs.md` and recompute the dossier's measured ranges from the record rather than by hand.
- **Why:** batches 2026-06-10 and 2026-06-10b proved the loop's value (8 runs -> 13 sensor readings -> a measured dossier) but every step was manual; the marginal cost of a batch should be picking targets and reading results, not re-assembling the harness. Pairs with the `METHODOLOGY.md` rigor items (seeded-defect advisory fixtures, same-target A/B) which need exactly this reproducibility to be meaningful, and with E8 (published conformance suite), whose fixture corpus overlaps the target manifest.
- **Status:** DONE. Shipped in v1.7.0 as F2 (the eval-run pipeline): `scripts/eval-run.mjs` plus `scripts/lib/eval-run.mjs` and `scripts/lib/eval-run-aggregate.mjs`, with the tracked target manifest at `docs/internal/eval-runs/corpus.json` (8 pinned-sha targets) and the dispatch contract at `docs/internal/eval-runs/dispatch-reviewer.md` / `dispatch-grader.md`. Corpus batch 3 (2026-07-27) was its first real shakedown and surfaced the three runner defects now filed as E15. This status line said "backlog" until the 2026-07-27 roadmap reconciliation; the work had been shipped for weeks.

### E12 - report template: full responsive pass + per-check explanation glossary  [adopt, effort S-M]

- **Target:** the E1 report renderer (`scripts/lib/report-render.mjs`), both HTML and Markdown twins.
- **Change:** two maintainer-requested template improvements (2026-06-10). (a) **Responsive completeness:** the minimal fix shipped immediately - at <=900px the `.tablecard` wrappers scroll horizontally (`overflow-x:auto`) with a 560px table minimum instead of crushing columns; a full pass remains: audit every grid/table/ledger element at phone widths, consider stacked card layouts for the findings and behavioral-case tables below ~600px, and verify print at narrow paper sizes. (b) **Per-check explanation glossary:** a brief plain-language explanation per check - what it tests, what that property is, why it matters - rendered ONCE in a glossary/methodology section, with finding rows linking to their glossary entry by reqId rather than repeating prose. Source the text statically from per-check metadata (each check module already carries a G9-required docblock and `meta`; add a one-line `meta.plain` or derive from the docblock `why:` line) so it is templatized: written once in the repo, rendered deterministically into every report at **zero model tokens**, and costing reading-tokens only once per report (the MD twin is consumed by agents - a glossary section beats per-row repetition).
- **Why:** maintainer feedback from the 2026-06-10 eval-run batches: tables degrade poorly on narrow screens, and a reader of a report cannot tell what U6 or S7 actually examine without leaving the report. The zero-model-token property holds because the renderer is deterministic (Design Principle 3); the only token consideration is a reading agent's input, which the once-per-report glossary minimizes.
- **Status:** DONE. v1.6.0 (commit `5ecdd89`, PR #141) shipped all three remaining deliverables: (a) the sub-600px responsive pass (all grid/table/ledger elements below 600px, including stacked card layouts for findings), (b) the per-check explanation glossary (section 11 in the HTML report, sourced statically from `REPORT_META`, zero model tokens), and (c) the `docs/reference/universal-checks.md` Bronze reference page. No genuine residual remains; E12 is closed.

### E13 - run the defect-rich model triple (F3 R-AQ-3)  [measure, effort S, blocked on nothing]

- **Target:** `scripts/lib/advisory-score.mjs` and `tests/fixtures/anti/seeded-defects/privacy-notice-toolkit` (both shipped in v1.8.0).
- **Change:** dispatch the same review prompt at three model tiers against the seeded-defect fixture, score each with the harness, and record precision and recall per model-and-effort cell in `docs/internal/eval-runs/eval-runs.md`.
- **Why:** the harness and the fixture exist and are tested; what does not exist is a measured number. "The cheaper model seemed about as good" is currently an impression, and readings 16 and 17 already record that Haiku at high effort confabulated a statute. This is the run that turns that into evidence.
- **Why it was deferred rather than done:** a simulated triple would put a fabricated measurement on a public page, which is worse than an empty cell reading "not measured yet". It needs three real dispatches to mean anything.
- **Do not skip:** record the run even if the result is boring. A measured parity between tiers is as useful as a measured gap, and the existing parity claim rests on a single clean target, which METHODOLOGY.md already flags as its open caveat.
- **Status:** DONE (run 2026-08-04, recorded as batch 2026-08-04 runs 12-14 in [eval-runs.md](../eval-runs/eval-runs.md)). Three real dispatches at Haiku 4.5, Sonnet 5 and Opus 5, effort held at `high`. The measured pairs, against key **1.1.0**: Haiku 0.83 / 0.38, Sonnet 1.00 / 0.54, Opus 1.00 / 0.62, with zero confabulations at every tier. All three cells remain PROVISIONAL pending the multi-entry scoring rule (E16). **The run's headline is that it found a defect in its own measuring instrument:** under key 1.0.0 the same Opus advisory scored 0.42 precision, and every one of its apparent false positives proved to be either a real unplanted defect (four, now promoted as SD-10 through SD-13) or legitimately out of scope. Publishing the 1.0.0 numbers would have asserted a false model ranking. Follow-on items: E16, E17, E18, E19, E20.

### E14 - U5 assumes English, and is unpassable in any language it does not know  [calibrate, effort M, ADR-gated]

- **Target:** `scripts/checks/description-score.mjs` (`U5`).
- **The measurement (corpus batch 3, reading 18):** across 349 French skills, `U5`'s `WHEN` trigger pattern fired on **0 of 346** parseable descriptions, while **341 of them carried an explicit French trigger clause**. Same-batch English controls: 705 of 1016, and 134 of 136. Because `WHEN` is worth 0.35 of a 1.0 score against a 0.7 threshold, a description the pattern cannot match caps at **0.65**. No French description can pass, however good. The clearest case scored 0.30 while containing "A utiliser quand l'utilisateur veut relire, corriger ou ameliorer un texte francais", a word-for-word rendering of the exact construction the pattern rewards.
- **Scope, stated precisely so this is not over-read:** this is **one check of thirty**, and it carries `house` provenance, so `--profile plain-plugin` (the honest third-party grading mode) **drops it entirely**. A non-English library graded the way you would grade someone else's work never sees this. The defect bites only a library that adopts this Standard, declares a tier, and writes non-English descriptions. Every other check is language-neutral: a link resolves or it does not, a diagram parses or it does not, a manifest matches disk or it does not.
- **Change:** an ADR that answers a design question, not a patch that adds French patterns. Adding French vocabulary moves the same cliff one language over and leaves German, Japanese, and Portuguese exactly where French is now. The real options are (a) detect the description's language and score only where a lexicon exists, reporting "not scored" rather than a failing number elsewhere; (b) a pluggable per-language lexicon with English as one entry rather than the hardcoded default; (c) a language-independent structural signal for "states when to use it" (for example the presence of a conditional clause) with the lexical match as a bonus rather than a requirement; (d) scope `U5` explicitly to English in the Standard and say so, which is honest but caps the Standard's reach.
- **Recommendation:** (a) or (c). Option (d) is the cheap answer and should not be taken by default, because the limitation is one heuristic in one check, not a property of the Standard.
- **Related upstream constraint, not ours:** the agentskills.io spec requires `name` to be lowercase ASCII with hyphens, which independently constrains non-Latin-script naming. That is upstream's rule; `askit-standards-watch` now tracks that file.
- **Status:** OPEN, ADR-gated. Deferred from v1.8.0 (R2) per release risk R2-5: a batch finding files as a candidate rather than becoming a mid-release calibration.

### E15 - three F2 eval-run runner defects found by corpus batch 3  [fix, effort S each]

- **Target:** `scripts/lib/eval-run.mjs` and `scripts/lib/eval-run-aggregate.mjs`.
- **The three, each with a reproduction in `docs/internal/eval-runs/eval-runs.md` readings 20, 22 and 23:**
  1. **A component-scope verdict is taken from a plugin-scope grading.** The gate seam (`npm run check`) has no component scope while the render seam (`evaluate.mjs`) does, so a `--subpath` run records a gate verdict for the wrong subject and stores the disagreement without flagging it. Cheapest honest fix: refuse or flag when `gate.warns` and `gate.reportWarns` disagree.
  2. **The aggregator would append rows its own charter forbids.** `--aggregate --dry-run` reports "would append 12 rows" while simultaneously reporting no advisory tokens, and `docs/internal/eval-runs/README.md` states the deterministic gate is never logged there. Fix: skip or refuse skeletons whose `advisory.model` is null, with an explicit non-silent count.
  3. **One refusal aborts a whole multi-target batch.** `runOne` throws and the exception escapes `runBatch`, so a later target never runs. Fix: collect per-target refusals into a batch summary and continue.
- **Why:** batch 3 was explicitly a shakedown of the F2 runner as well as a pass on the targets, and these are what it shook out. None is urgent; all three make the next batch smoother and the record more trustworthy.
- **Status:** OPEN. Deferred from v1.8.0 (R2).

### E16 - advisory-score credits nothing when one finding engages two defect entries  [fix, effort M, blocks publishing any cell as final]

- **Target:** `scripts/lib/advisory-score.mjs` (`classifyFinding`, `scoreAdvisory`), and the `review-required` outcome in the seeded-defect scoring key.
- **Change:** define and implement a scoring rule for a finding whose `matchText` satisfies the `locate` clause of more than one defect entry. Today it becomes `review-required` and is credited to neither entry, which suppresses precision and recall together.
- **Why:** sensor reading 26 (2026-08-04). The E13 triple produced the proof. The same Opus advisory scored **0.42** precision against key 1.0.0 and **1.00** against key 1.1.0 with no change to the advisory at all, and seven of its twenty-three findings are still uncredited because each engages two entries at once. The effect is that the more granular a review is, the worse it scores: a model that writes exactly one finding per planted defect is rewarded, and one that describes the same reality in richer detail is penalised. `precision` therefore currently measures conformance to the key's granularity rather than correctness, and no cell can honestly be published as final until this is settled.
- **Options to weigh in the fix:** credit the first unsatisfied entry and mark the finding a partial for the rest; credit every entry it genuinely satisfies (changes the meaning of `recall`'s denominator); or require the key's `locate` clauses to be disjoint enough that this cannot arise (the integration test already enforces disjointness across *examples*, which is weaker).
- **Status:** OPEN. Raised by E13.

### E17 - the scoring harness cannot consume an adjudication  [build, effort S]

- **Target:** `scripts/lib/advisory-score.mjs` (`scoreAdvisory` opts, the CLI) and the adjudication steps in the seeded-defect key.
- **Change:** accept an adjudication document (resolutions keyed by run id and finding index) and fold it into the published partition, so a finalized cell is machine-computed rather than hand-computed.
- **Why:** sensor reading 27 (2026-08-04), verified against source: `scoreAdvisory(advisory, key, opts)` reads only `opts.model`, `opts.effort` and `opts.runId`. The harness emits a worklist and correctly refuses to finalize, but there is no path to feed the resolutions back. Every published pair is therefore hand-computed with nothing checking the arithmetic, which is the same shape as the gaps E13 was built to close. Promoting verified defects into the key was the E13 workaround; it works only for findings that turn out to be real.
- **Status:** OPEN. Raised by E13.

### E18 - U6 (reference-links) scans skills only, so link rot in a command or subagent is invisible  [fix, effort S, ADR-gated]

- **Target:** `scripts/checks/reference-links.mjs` (`check(ctx)`).
- **Change:** extend the existing `scanLinks` pass over `ctx.commands` and `ctx.subagents`, both of which `loadPlugin` already populates.
- **Why:** sensor reading 29 (2026-08-04), independently re-derived rather than taken from the advisory: `check(ctx)` is a single `for (const s of ctx.skills)` loop, and `grep -c "ctx\.(commands|subagents)"` over the file returns **0**. Demonstrated on the seeded-defect fixture, where a command links `../skills/privacy-notice-review/references/state-law-matrix.md` (the real file is `us-state-laws.md`) and the gate still reports 0E / 0W. This is new coverage rather than a calibration of how an existing check fires, so it is ADR-gated and needs the warn-first burndown of ADR 0027 (Standard versioning and compatibility policy).
- **Status:** OPEN. Raised by E13.

### E19 - nothing resolves the component paths declared in .claude-plugin/plugin.json  [build, effort M, ADR-gated]

- **Target:** a new check, or an extension of `U13` (`skill-registration`); `ctx.claudeManifest` in `scripts/lib/load-plugin.mjs`.
- **Change:** resolve the path arrays a Claude plugin manifest declares (`agents`, `commands`, `skills`, `hooks`) against the tree, and report a declaration that points at nothing.
- **Why:** sensor reading 29 (2026-08-04), verified: `ctx.claudeManifest` is consumed by exactly two modules, `manifest-drift` (U8, which early-returns without a `library.json`) and `per-target-presence` (S6, house provenance, dropped under `plain-plugin`). U13 covers the catalogued-but-undeliverable case for skills only, and only via `library.json` or `marketplace.json`. Demonstrated on the fixture: `agents: ["./agents/notice-reviewer.md"]` resolves to nothing on disk and the gate reports 0E / 0W. A manifest that names a file which does not exist is the same portable defect U13 exists to catch, in a component type nothing covers.
- **Status:** OPEN. Raised by E13.

### E20 - the seeded-defect scoring key is readable from inside the fixture tree  [fix, effort S]

- **Target:** `tests/fixtures/anti/seeded-defects/privacy-notice-toolkit.key.json` and the fixture README.
- **Change:** move the key out of the directory an evaluating agent is pointed at, or otherwise make reading it detectable in the run artifact.
- **Why:** raised by run 14 of the E13 batch, which stated that it deliberately did not open the key. The key sits one directory above the target, appears in any tree listing, and the fixture README advertises it as the authoritative answer. A run that reads it converts the measurement into a transcription, and nothing in the resulting artifact would reveal that it had. Every number this fixture produces rests on an honour system that no other part of the eval-run pipeline relies on.
- **Also worth folding in:** `tests/unit/advisory-score.test.mjs` hardcodes recall, ceiling and miss-list values against the tracked key, so a keyVersion bump breaks four scorer unit tests that are not testing the key. Pin them to a frozen key fixture so scorer tests stop coupling to key content.
- **Status:** OPEN. Raised by E13.
