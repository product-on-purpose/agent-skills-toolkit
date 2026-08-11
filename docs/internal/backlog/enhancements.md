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

## Dogfooding intake: critique-skills v0.1.x pass (2026-08-06)

Raised while critique-skills was being graded by this toolkit. Full record with reproduction
details and dispositions in `_local/dogfooding/critique-skills/2026-08-06-v0.1.x-verification-pass.md`.
Two findings from the same pass were fixed directly rather than recorded (PR #189: the `SKIP_DIRS`
ecosystem gap and the `gen-index` boilerplate). These three were not.

### E21 - `covers` has no shape for a cross-component eval  [design, effort S]

- **Target:** `scripts/checks/library-regression.mjs` (G3), `templates/eval-set.json`, STANDARD.md sec 8.3.
- **Change:** accept a plural or relational form in an eval set's `covers` declaration, alongside today's `{ "skill": "<name>" }`, `{ "chain": [caller, callee] }`, `{ "hook": "<event>" }`.
- **Why:** every documented shape is singular, so there is no way to declare an eval that exercises the **relationship between** components rather than one component. critique-skills hit this with a joint-routing eval that tests whether the right skill is selected when all six descriptions are in context at once. No single skill owns that eval. It currently declares `{ "skill": [six names] }`, an array where a string is documented, and passes only because G3 checks that the key exists without checking its type. A future tightening breaks it, and in the meantime the declaration is dishonest in shape.
- **Why it will recur:** cross-component evals get more likely, not less, as a library grows past a handful of skills. Sibling skills in one namespace collide on triggering, and testing that collision is inherently multi-component.
- **Status:** backlog (recorded 2026-08-06). Design first: decide whether this is `{ "skills": [...] }`, a `{ "relation": ... }` form, or something else, before touching the check.

### E22 - `frontmatter-valid` (U3) never validates `agents/`  [correctness, effort S]

- **Target:** `scripts/checks/frontmatter-valid.mjs`.
- **Change:** validate subagent frontmatter, not only `ctx.skills`.
- **Why:** U3 is one of only four `vendor-cited` checks, so a plugin author reasonably reads a clean U3 as "my components' frontmatter is valid." It iterates skills only. In critique-skills the `critique-critic` subagent, which all six skills delegate to for clean-context critique, is entirely unchecked by the toolkit grading the plugin.
- **Status:** backlog. The `agents/` half is **resolved** (see below); the U3 gap itself is still open.

**Update 2026-08-06, the G8 half is fixed and the scan behavior is now established, not guessed.** A probe plugin was loaded with `claude --plugin-dir` and asked to enumerate its subagents. Result: a directory holding `real-agent.md`, `README.md`, `_README.md`, and `README.txt` registered **three** subagents, `real-agent`, `README`, and `_README`. Claude Code loads every `.md` in `agents/`. The underscore prefix does not protect a file; only the non-`.md` extension was skipped. There is no warning and no error, so it fails silently.

That made G8's requirement of a folder README in `agents/` actively harmful: both plugins that followed it (this toolkit and critique-skills) shipped a phantom subagent with no name and no description. `agents/` is removed from G8's `FIXED_ROOTS`, joining the repo root and `templates/seed-plugin` as a documented exclusion, and both `agents/README.md` files are deleted.

**Worth reading for the lesson:** `docs/internal/release-plans/plan_v1.1.0/P4-folder-readme/SPEC.md` line 194 records that this toolkit already hit this bug once. "Adding `agents/README.md` exposed that the subagent/command enumeration ... treated every `agents/*.md` as a component, so a folder README became a bogus 'README' subagent." It was fixed "at the single enumeration point: `README.md` is excluded from component discovery everywhere." That fixed the **toolkit's** idea of what an agent is and left the **runtime's** untouched, which is the one that ships. **The `commands/` half is now probed and closed, 2026-08-07.** A probe plugin holding `real-command.md`, `README.md` and `_README.md` in `commands/` was loaded with `claude --plugin-dir` and asked to enumerate its slash commands. It returned **`real-command` only**. Same prompt shape that made the `agents/` probe return all three files, so this is a real behavioral difference and not the model self-filtering: **Claude Code excludes `README.md` from command discovery but not from agent discovery.** `commands/` is safe, `agents/` was not, and the enumeration mismatch in `listCommandFiles` is therefore harmless rather than latent. No action needed. Recorded so nobody re-opens this as a theoretical risk.

### E28 - `clampNotice` never reaches the designed reports  [correctness, effort XS]

- **Target:** `scripts/lib/report-render.mjs` (`deriveModel`, `renderMarkdown` section 05, `htmlLedger`).
- **The defect:** the published-verdict clamp attaches a `clampNotice` to a finding explaining why its severity is not the one the consumer configured. The terminal path surfaces it. The Markdown and HTML renderers **never have**: a grep for `clampNotice` across `report-render.mjs` returned zero matches both before and after the v1.10.1 work. So a consumer running in `published-verdict` mode opens the shareable report and sees a severity that silently disagrees with their configuration, with no explanation anywhere on the page.
- **How it was found, which is the interesting part:** round 3 of the v1.10.1 adversarial review found the identical gap for the **new** `migrationNotice` field. Fixing that required studying how `clampNotice` was rendered, and the answer turned out to be that it never was. The pre-existing instance was found only because a new instance of the same mistake was made and reviewed. It was deliberately **not** fixed in the same change: it is a pre-existing defect in an untouched code path, and folding it into a release already three review rounds deep would have put an unreviewed behavior change into the tag.
- **Change:** project `clampNotice` into the report model and render it in both Markdown and HTML, beside `migrationNotice`, which now has the treatment to copy. Regression test for both formats.
- **Status:** backlog (recorded 2026-08-11, during the v1.10.1 cut).

### E27 - the test count is quoted by hand in two places and nothing checks it  [correctness, effort S]

- **Target:** `docs/internal/RELEASE.md` (the checklist), `scripts/check-readme-version.mjs` or a sibling release-time script, `CHANGELOG.md` and `docs/internal/STATUS.md` as the consumers.
- **The defect, found in the release that exists to prevent it:** v1.10.1's changelog was written early and published **`647 tests`** while three rounds of pre-release adversarial review pushed the real number to **667**, and `docs/internal/STATUS.md` still carried the pre-release **613**. The trust patch was one commit away from publishing false verification evidence in its own primary technical record. Caught by round 3 of the adversarial review, not by any check.
- **Why it is the same failure the release documents:** a number typed into prose that nothing verifies drifts from true to false without anyone deciding to lie. That sentence is the thesis of the `STATUS.md` rewrite shipped in the same release, and it applied to the release notes describing it.
- **What already mitigates it, and what does not:** the skill count and spine size in the README `## Status` section **are** now checked against `library.json` and the live check registry. The test count is not, because knowing it requires running the suite. As an interim measure `STATUS.md` states the date its count was measured, so a stale figure reads as stale rather than as current, and `docs/internal/RELEASE.md` now carries "volatile counts written LAST" as an explicit process step. Both are honest, neither is enforced.
- **Change:** a release-time script that runs the suite, captures the reported total, and fails when it disagrees with the count in `CHANGELOG.md`'s newest section and in `STATUS.md`. It belongs in the release gate rather than in `npm test`, since running the suite from inside the suite is circular and doubling test time on every push to guard a once-per-release number is the wrong trade.
- **Watch out for:** the pass count is **not** platform-independent and must not be compared. The argv coverage deliberately skips its Windows-only half on POSIX and its POSIX-only half on Windows, so v1.10.1 reports the same 667 total with 1 skip on Windows and 4 on Linux. Compare totals and failures, never passes.
- **Status:** backlog (recorded 2026-08-11, during the v1.10.1 cut).

### E25 - `emitPin` inherited provenance it did not verify  [correctness, effort XS]

**Status: FIXED in v1.10.1 for both fields, with one residual noted at the end.**

The defect had two instances, and the second was found only by adversarial review after the first was
fixed, which is the part worth remembering: the same wrong rule was applied to two adjacent fields and
patching one did not prompt a look at the other.

- **Target:** `scripts/lib/standards-watch.mjs` (`emitPin`), `scripts/standards-watch.mjs` (the `--emit-pin` CLI path).
- **The defect:** `emitPin(pin, observed, { date, by = "unrecorded", repoHeadSha = null })` spreads `repoHeadSha` into the emitted `verified` block **only when it is supplied**, and the CLI never supplies it. The previous pin's value therefore survives into a document whose blob SHAs have all been refreshed around it. The `verified` block ends up asserting a verification at a commit nobody checked.
- **The reproduction (2026-08-11, during the v1.10.1 re-pin):** `npm run standards-watch -- --emit-pin` proposed `verified.repoHeadSha` of `38a2ff82958afee88dadf4831509e6f7e9d8ef4e`, the value pinned on 2026-07-27, while `gh api repos/agentskills/agentskills/commits/main --jq .sha` returned `69ef37e9424c0a7ea9dd2293b559e43ec8176379`. The emitted `verified.by` was the literal string `"unrecorded"` beside it, which is the honest default doing its job while the field next to it quietly lied.
- **Why it matters more than its size suggests:** `upstream-pin.json` exists so that a reviewer can verify every pinned value **by hand, offline, without trusting this tool**. A stale fact inside the `verified` block undermines exactly the property the file is for. It was caught by the documented human-review step, which is the process working; the repository's standing position is that a correct outcome depending on someone remembering to look is not yet a fix.
- **The second instance, found by adversarial review after the first was fixed:** `lastUpstreamCommit` behaved identically, and worse. `emitPin` clones each artifact and refreshes `blobSha` and `surface` while leaving `lastUpstreamCommit` untouched, so a re-pinned artifact names the commit that produced the **previous** bytes. The committed pin demonstrated it: `docs/specification.mdx` carried blob `d9a2db099d90` beside `lastUpstreamCommit` `6868401b` dated 2026-05-16, while ADR 0040 (re-pin after an editorial metadata clarification), written in the same change, states the observed change arrived in `217be548` on 2026-08-04. An offline reviewer following the pin would have been sent to the wrong commit and the wrong diff, which defeats the file's entire reason for existing.
- **The change, shipped:** both fields now follow one rule. `emitPin` **drops** a fact this run did not establish rather than inheriting it: `repoHeadSha` is omitted unless supplied, and `lastUpstreamCommit` is dropped whenever an artifact's `blobSha` moves unless the caller supplies replacement provenance via the new `artifactCommits` option. An artifact whose bytes did **not** move keeps its provenance, because that fact is still true. Three regression tests cover it, including the converse case, so a future refactor cannot quietly restore inheritance.
- **Residual, deliberately not closed:** the `--emit-pin` CLI does not yet look up per-artifact commit metadata, so a re-pin **drops** `lastUpstreamCommit` for any changed artifact and a human restores it during review. That is the correct default (a missing field is honest, a wrong one is not), but it does leave a manual step. Teaching the CLI to fetch and supply the commit is a separate, larger change: it adds a network lookup to a tool that is deliberately minimal and write-incapable by construction, so it wants its own decision rather than riding a patch.
- **Status:** FIXED in v1.10.1 (recorded 2026-08-11). Raised by ADR 0040 (re-pin after an editorial metadata clarification) for the first field and by the pre-release adversarial review for the second.

### E24 - `S8` (components-mirror) mirrors status and tier but not `version`, and the field drifts silently  [correctness, effort S, ADR-gated]

- **Target:** `scripts/checks/components-mirror.mjs` (`S8`), `STANDARD.md` sec 5.1.
- **The measurement (2026-08-11, during the v1.10.1 cut):** every one of this repo's 33 registered components was compared against its own frontmatter. **Five had drifted**, in two independent directions and from two separate causes:

  | Component | Kind | `library.json` | frontmatter |
  |---|---|---|---|
  | `askit-build-skill` | skill | 0.1.0 | 0.1.2 |
  | `askit-evaluate` | skill | 0.1.0 | 0.1.2 |
  | `askit-skill-author` | subagent | 0.1.0 | 0.1.1 |
  | `askit-reviewer` | subagent | 0.1.0 | 0.1.1 |
  | `askit-quality-grader` | subagent | 0.1.0 | 0.1.1 |

- **Why the count matters more than the fact:** PR #204 surfaced this as a two-component problem, because two components were what that PR happened to touch. A systematic sweep found five. An ungated field does not drift where you looked; it drifts everywhere, and what gets noticed is a subset of what is true.
- **Change:** decide whether `S8` should mirror `version` alongside `status` and `tier`. This is deliberately routed through the why-gate rather than fixed in place, because `S8` grades third-party plugins: tightening it moves existing verdicts, which ADR 0027 (Standard versioning and compatibility policy) governs through a warn-first burndown and a Standard MINOR. The cheap in-repo half is already done (see below); this item is only about the Standard question.
- **What already shipped in v1.10.1, and what it deliberately does not do:** the five instances were bumped into agreement, and `tests/unit/component-version-mirror.test.mjs` now fails the build if any registered component's `version` disagrees with its frontmatter. That guard is **repo-local**, in the same family as `scripts/check-readme-version.mjs`: it protects this tree and carries **no Standard implication and no verdict movement for anyone else**. Fixing the instances and guarding our own tree is not the same as changing the rule, and only the third of those needs an ADR.
- **Open question for the ADR:** whether a version disagreement is an error, a warning, or advisory. A plugin mid-edit legitimately has a bumped frontmatter and an unbumped manifest for the length of one commit, so the strict reading has a real false-positive mode that `status` and `tier` do not share.
- **Status:** backlog (recorded 2026-08-11). Instances fixed and repo-local guard shipped in v1.10.1; the Standard question is open.

### E23 - Surface check provenance in the report output  [discoverability, effort S]

- **Target:** `scripts/check.mjs` and `scripts/tier-report.mjs` output; folds naturally into E1's evidence ledger.
- **Change:** show each check's declared `provenance` (`house` / `objective` / `vendor-cited`) alongside its result, and summarize the mix in the tier line.
- **Why:** every check already declares provenance in its `meta`, and the distribution is the single most clarifying fact about what a grade means: **21 house, 6 objective, 4 vendor-cited, with the entire Silver and Gold tiers house**. A plugin author reading "Tier: Convergent, 0 errors, 0 warnings" reasonably believes something stronger than "this repository follows our house conventions." That gap contributed directly to critique-skills shipping a release that crashed on a fresh install while its gate was clean. The information exists; it is just only discoverable by reading 31 source files.
- **Status:** backlog (recorded 2026-08-06).

### E26 - `applyStandardDowngrade` (ADR 0027) is equally overridable by config; `U13` is the live instance  [design, effort S]

- **Target:** `scripts/lib/standard-gate.mjs` (`applyStandardDowngrade`), `scripts/lib/resolve-config.mjs` (`resolveFindings`), `scripts/checks/skill-registration.mjs` (`U13`).
- **The observation:** the round-2 adversarial review of the v1.10.1 patch found that `runGate` (`scripts/check.mjs`) applies `askit.config.json` rule overrides with HIGHER precedence than the severity a check emits, and that this holes any warn-first migration whose warn is decided BEFORE `resolveFindings` runs. The fix shipped in this same patch closes the hole for `S4` (chain contracts) with a finding-level `migration` cap that `resolveFindings` enforces as a ceiling no override can cross. `applyStandardDowngrade` runs at that exact same pipeline position (before `resolveFindings`, inside `runGate`), and it is the SAME shape of hole: a plugin pinned to an older Standard gets its post-pin errors downgraded to warn, but nothing stops a consumer's own `rules.<reqId> = "error"` from promoting that downgraded warn straight back to a gate-failing error, from config alone, with zero change to the plugin.
- **The live instance:** `U13` (skill-registration, `scripts/checks/skill-registration.mjs`) ships `since: "0.12"` and graduates at Standard 0.13. A plugin pinned to Standard 0.12 that is missing an enumerating manifest gets its `U13` finding downgraded to `warn` by `applyStandardDowngrade`. An `askit.config.json` carrying `rules: { "U13": "error" }` overrides that downgrade back to `error` today, unnoticed, for exactly the reason the round-2 finding named for `S4`.
- **Why this is scoped out, not blocked:** lowering a severity is always safe under ADR 0027 (Standard versioning and compatibility policy) - a warn-first downgrade existing to protect a pinned plugin from a verdict move is the entire point of the policy, so applying the same migration-cap mechanism to `applyStandardDowngrade`'s output cannot itself move any verdict; it can only close a gap that already lets one move. This item is not waiting on a burndown or a decision about `U13`'s own graduation date. It is waiting on scope: the v1.10.1 patch fixes the finding as raised (`S4`), and generalizing the cap to every `applyStandardDowngrade` output is a second, separable change that touches a different module and a different, wider set of checks (every `since`-bearing reqId, not just one).
- **Candidate placement:** the vendor-alignment batch already queued for the frontmatter-vocabulary-strictness and validator-parity migrations (see ADR 0041's Implementation sites) is the natural home, since all three are the same shape of warn-first migration needing the same ceiling.
- **Status:** backlog (recorded 2026-08-11, round-2 adversarial review of the v1.10.1 patch).
