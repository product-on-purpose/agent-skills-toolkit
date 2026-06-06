# F2 - the designed evaluation-report renderer (E1) - SPEC

> Realizes backlog item [E1](../../../backlog/enhancements.md), "Designed evaluation report (HTML + Markdown), shared across the assessment skills." This is the **v1.4.0** feature in the two-release program (see [`../PROGRAM-PLAN.md`](../PROGRAM-PLAN.md) for the v1.3.0 gate-evolution release that precedes it). F2 adds `--format=md|html` to the evaluator over the SAME one report object `scripts/evaluate.mjs` already produces, via a new pure renderer `scripts/lib/report-render.mjs`, plus a `report-meta` table that joins the why-it-matters / fix-prompt / effort copy at render time so `evaluate.mjs` stays lean.
> Source object: `scripts/evaluate.mjs` (`evaluate(target)` returns `{ scope, target, findings, byRule, summary, (tier, satisfies, blocked) }`; `formatReport` plus `--json` today). Designed IA and visual language: `docs/internal/template/evaluation-report--plugin--dashboard-v2.html` (the maintainer's favored variant) and its Markdown twin `docs/internal/template/evaluation-report--plugin--editorial.md`. Constraints: backlog E1 "Hard UX constraints (maintainer)" and the linter-vs-judge provenance principle in `_local/notes/evaluator-linter-vs-judge-and-consistency.md`.

## 0. Where F2 sits in the program

F2 is **v1.4.0**, a single larger user-facing feature, sequenced AFTER the v1.3.0 gate-evolution release (F1 standard-versioning plus F3 per-rule config / profiles / suppressions plus F4 housekeeping). It depends on nothing F1/F3 add at the schema level beyond what the report object already carries today, but it benefits from them: once F1 ships `since` on each `meta` and F3 ships profile/suppression state, those fields appear on the report object and the renderer surfaces them in sections 04 and 10 with no new wiring (see R-F2-12). F2 does not block on them; it renders whatever the report object contains.

The renderer is **advisory presentation only**. It renders the report object, it never decides anything. The deterministic gate (`scripts/check.mjs`) and the verdict it produces stay synchronous, model-free, and unchanged (Design Principle 3 / ADR 0023). `--format=html` and `--format=md` are output skins over frozen facts; they MUST NOT run a model, MUST NOT mutate findings, and MUST NOT alter the exit code.

## 1. Goal

Today the evaluator can print a terminal summary (`formatReport`) or dump `--json`. Neither is shareable with a non-engineer or readable in a PR. The designed report templates under `docs/internal/template/` show what "best in class" looks like: a 10-section information architecture, a left-docked TOC with scroll-spy, copy-paste fix prompts, a status matrix, an evidence ledger. But there is no renderer that emits them. F2 builds that renderer once, as a pure library over the existing report object, and wires `askit-evaluate` to it first.

The end state: `node scripts/evaluate.mjs <path> --format=html > report.html` produces a self-contained, on-brand HTML page matching the dashboard-v2 template; `--format=md` produces the Markdown twin; both carry exactly the same verdict, tier, counts, and evidence as the terminal and `--json` outputs, because all four render the one object.

## 2. Version reconciliation (read this first)

The committed sample templates (`docs/internal/template/*.html`, `*.md`) were authored at **Standard v0.10, 30-check spine, with U10 no-dashes present**. The spine has since changed: [ADR 0028](../../../decisions/0028-retire-u10-no-dashes-from-the-spine.md) (Accepted, shipped v1.2.0) retired U10, so `main` is **Standard v0.11, 29 checks** (`U1-U9`, `U11-U12`, `S1-S8`, `G1-G10`). Therefore:

- F2 MUST render whatever spine the live registry reports at render time, NOT a hardcoded "30 checks / Standard v0.10". The renderer reads the tier rollup and the spine from the report object and the registry, never from a literal.
- The sample templates remain the **visual and IA reference**, not the data reference: copy their markup, CSS, section order, and JS; ignore their hardcoded subject (`acme-content-skills`), their "30-check" labels, and the U10 row. A "do not hardcode the spine" acceptance criterion (R-F2-2 acceptance) guards this.
- This is a documentation/data reconciliation only; it changes no decision in E1. It is recorded here so the build does not re-bake a stale spine into the renderer.

## 3. Scope

**In:**

- A new pure module `scripts/lib/report-render.mjs` exporting `renderHtml(report, opts)` and `renderMarkdown(report, opts)`, each a pure function returning a string. No I/O, no `process.*`, no model.
- A new pure module `scripts/lib/report-meta.mjs` (a keyed table plus helpers) keyed by `reqId`, carrying the per-requirement **why-it-matters**, **fix-prompt** (the copy-paste prompt naming the matching `askit-*` builder), **effort** estimate, and the human label. Joined at render time so `evaluate.mjs` stays lean.
- Wiring `--format=md|html` into `evaluate.mjs`'s CLI block alongside the existing terminal default and `--json`.
- The 10-section information architecture from the templates, faithfully reproduced for both surfaces.
- Self-contained HTML: inline `<style>`, a small inline `<script>` for TOC scroll-spy plus copy-prompt buttons plus print, NO external assets, NO web fonts, NO binaries, NO dashes.
- A Markdown twin matching `evaluation-report--plugin--editorial.md`'s section order and "summary then detail" convention.
- Provenance honesty surfaced in the rendered output: the deterministic conformance layer is marked reproducible and model-independent; any advisory layer (behavioral/review) is marked judgment and stamped.
- `askit-evaluate` updated to offer the two new formats (the conformance report is the only report object defined today, so it is the only skill wired in F2).
- Unit tests for both renderers (golden-string or structural assertions) plus a self-contained-HTML invariant test.

**Out (deferred, named so the boundary is explicit):**

- Reports for `askit-migrate`, `askit-release`, `askit-reviewer`, `askit-capability-advisor`, and the behavioral `askit-quality-grader`. Each needs its own report object shape defined FIRST; F2 ships only the renderer and the one object that exists today. See sec 9 (phasing) and R-F2-11.
- Any behavioral or review LLM pass, or rendering of judgment findings the evaluator does not yet produce. The renderer renders what the object carries; it does not invent an insights section from a model.
- A PDF binary emitter. "Save as PDF" is the browser's `window.print()` affordance in the HTML (no server-side PDF generation, no new dependency).
- Per-rule config, profiles, suppressions, and `since`-aware grading (F1/F3, v1.3.0). F2 renders those fields if present but does not implement them.
- The Gemini emitter (a named v1.x deferral, not built here).
- A new runtime dependency or build step. The renderer is portable Node string templating, consistent with "CI only shells out to portable scripts."

## 4. The report object F2 renders (the contract, unchanged)

F2 adds renderers over the object `evaluate(target)` already returns. F2 MUST NOT change that shape. For reference, the fields the renderer consumes:

| Field | Present for | Renderer use |
|---|---|---|
| `scope` | always (`"plugin"` / `"component"` / `"unknown"`) | masthead report-type label; component scope omits the tier sections |
| `target` | always | masthead subject line, metadata |
| `findings` | always; each `{ check, severity, message, file, reqId }` | the evidence ledger rows, the status matrix cells, the burndown |
| `byRule` | always; findings grouped by `reqId ?? check` | per-requirement grouping in the ledger |
| `summary` | always; `{ errors, warns }` | masthead KPIs (blockers/warnings) |
| `tier`, `satisfies`, `blocked` | plugin scope only | the verdict seal, the per-tier meters, the climb/burndown section |

The renderer also derives a few presentation facts from the registry (not from the object), all read live so the spine is never hardcoded:

- The **full ordered spine** (`CHECKS` from `scripts/lib/registry.mjs`, each `meta.{id,reqId,tier}`), so the status matrix and ledger list EVERY requirement, not only the ones that produced a finding. A requirement with no finding is `PASS` (or `N/A` if its check is conditional/vacuous; see R-F2-7).
- The **tier ordering** (`TIER_ORDER` from `scripts/lib/tier.mjs`) and `tierForReq(reqId)`, to bucket rows into Bronze/Silver/Gold and compute per-tier `passed/total`.
- The **gate exit code** for this report, derived via `gateExitFromFindings(findings, declaredTier)` (already exported from `check.mjs`), so the rendered "gate exit code" matches what CI would return. The renderer MUST NOT recompute the verdict; it reads `tier`/`blocked` from the object and the exit code from the shared helper.

If a field the renderer wants is not yet on the object (for example `since` from F1, or a `provenance` tag from F3), the renderer degrades gracefully: it omits that cell rather than fabricating a value (R-F2-12).

## 5. Architecture

```
scripts/evaluate.mjs
  evaluate(target) -> report object         (unchanged)
  formatReport(report) -> terminal text      (unchanged)
  CLI: --json | --format=md | --format=html  (F2 adds the two formats)
         |                  |
         |                  v
         |        scripts/lib/report-render.mjs   (NEW, pure)
         |          renderMarkdown(report, opts) -> string
         |          renderHtml(report, opts)     -> string
         |                  |
         |                  v
         |        scripts/lib/report-meta.mjs     (NEW, pure data plus helpers)
         |          REPORT_META[reqId] = { label, whyItMatters, fixPrompt, effortMin, builder }
         |          metaFor(reqId) -> the row, with a safe default for an unknown reqId
         v
   JSON.stringify(report)                    (unchanged)
```

**Separation of concerns:**

- `evaluate.mjs` stays the orchestrator. It loads the plugin/skill, runs the checks, builds the object, and dispatches to a formatter. The only F2 addition to it is: import `renderHtml`/`renderMarkdown`, read `--format`, and `console.log` the chosen string. No copy, no per-rule prose, no CSS lives in `evaluate.mjs`.
- `report-render.mjs` is **pure**: `(report, opts) -> string`. No `fs`, no `process`, no network, no `Date.now()` except via an injected `opts.now` (so tests are deterministic; default to `new Date()` only in the CLI caller, never inside the pure function). This is what makes the renderer unit-testable with a frozen object and golden strings.
- `report-meta.mjs` holds the **editorial copy** the templates show (the "why X matters" blockquotes, the copy-paste prompts, the effort minutes). Keyed by `reqId` so adding a new check's copy is a one-entry edit, and so `evaluate.mjs` and the checks stay free of presentation prose. `metaFor(reqId)` returns a safe default (`{ label: reqId, whyItMatters: "", fixPrompt: "", effortMin: null }`) for any reqId without an entry, so an unmapped or future check renders without crashing.

**Why a shared lib, not per-skill HTML.** E1 is explicit: recommend ONE renderer over the report object, parameterized by report type, not per-skill bespoke HTML, matching the toolkit's generation-over-duplication ethos. `opts.reportType` (default `"conformance"`) selects the masthead label and which optional sections appear; the IA and CSS are shared. When `askit-migrate` and the others define their report objects (sec 9), they reuse `renderHtml`/`renderMarkdown` with a different `reportType`, not a new file.

## 6. `report-meta.mjs` - the keyed copy table

The sample Markdown twin shows the exact copy shape per requirement: a one-line **why it matters**, an **issue/fix/priority/effort** card, and a fenced **copy-paste prompt** that names the matching `askit-*` builder and ends by re-running the gate to confirm. F2 lifts that copy into a data table keyed by `reqId`.

Shape (one entry per spine requirement; `effortMin` is a rough integer estimate, `builder` is the `askit-*` skill the fix prompt drives):

```js
export const REPORT_META = {
  G2: {
    label: "self-hosting",
    whyItMatters: "Without CI running the gate, conformance is a claim, not a proof. Any change can silently regress the library, and a consumer cannot point to a green badge that says the standard held on the latest commit.",
    fixPrompt: "Use askit-build-settings (CI mode) on this plugin: add .github/workflows/ci.yml that checks out the repo, sets up Node from .nvmrc, runs npm ci, then runs node scripts/check.mjs as a required step. Then run node scripts/check.mjs and confirm G2 (self-hosting) now passes.",
    effortMin: 20,
    builder: "askit-build-settings",
  },
  // ... one entry per U#/S#/G# in the live spine
};
```

Rules for the table (acceptance-tested in R-F2-9):

- Every `reqId` in the live `CHECKS` spine MUST have an entry. A registry-vs-meta coverage test asserts there is exactly one `REPORT_META` key per spine `reqId` and no orphan keys (the same discipline `registry-sync` applies to the spine).
- The fix-prompt copy MUST name a real `askit-*` skill that exists in `skills/` and MUST end by re-running the gate (`node scripts/check.mjs`) to confirm the fix, matching the twin's convention.
- No em-dash (U+2014) or en-dash (U+2013) anywhere in the copy (the PreToolUse hook enforces this at author time; a renderer-output test re-checks).
- The copy is generic enough to render for ANY subject (it must not assume `acme-content-skills`). Subject-specific detail (the actual file, the actual score) comes from the finding `message`/`file`, joined at render time; the table supplies only the requirement-level "why" and "how."

This keeps `evaluate.mjs` lean (the checks emit terse machine messages; the table supplies the human framing) and keeps the framing in one auditable place.

## 7. Requirements

RFC 2119 language. Each requirement carries a testable acceptance criterion.

### R-F2-1 - `--format=md|html` over the one object

`evaluate.mjs`'s CLI block MUST accept `--format=md` and `--format=html` alongside the existing terminal default and `--json`. The selected format MUST render the SAME `report` object the other formats use (built once by `evaluate(target)`); no format may re-run the checks or build a different object.

- **Acceptance:** `node scripts/evaluate.mjs <plugin> --format=html` prints an HTML document to stdout; `--format=md` prints Markdown; with no format flag the terminal output is byte-identical to today's `formatReport`; `--json` is byte-identical to today's `JSON.stringify(r, null, 2)`. `--format=json` is accepted as an alias of `--json`. An unknown `--format=xyz` prints a one-line error to stderr and exits non-zero WITHOUT altering the gate exit semantics for valid runs. The exit code for a valid run is unchanged from today (driven by `gateExitFromFindings`, R-F2-13).

### R-F2-2 - a pure shared renderer, spine read live

The toolkit MUST ship `scripts/lib/report-render.mjs` exporting `renderHtml(report, opts)` and `renderMarkdown(report, opts)`, each a pure function `(object, options) -> string` with no `fs`/`process`/network access and no nondeterministic time read (time arrives via `opts.now`). Both MUST enumerate the FULL spine from the live registry (`CHECKS`), not a hardcoded list, so the status matrix and ledger list every current requirement.

- **Acceptance:** a unit test imports `renderHtml`/`renderMarkdown`, passes a hand-built frozen `report` object and `{ now: "2026-06-06" }`, and asserts the returned string is deterministic across runs; a grep of `report-render.mjs` finds no `"30"`/`"v0.10"`/`U10` literal and no `import` of `node:fs`/`node:process`; the matrix renders exactly `CHECKS.length` requirement cells (29 today); adding a check to the registry (in a test fixture registry) adds a matrix cell with no renderer edit.

### R-F2-3 - the 10-section information architecture (both surfaces)

Both `renderHtml` and `renderMarkdown` MUST emit the 10-section IA from E1 and the templates, in order: (1) Masthead / verdict, (2) Executive summary, (3) What was evaluated / component breakdown, (4) Methodology and scope, (5) Tier compliance evidence ledger, (6) The climb / burndown, (7) Improvement path, (8) Insights, (9) Evidence and sources, (10) Report metadata. The HTML MAY additionally render the signature "status matrix" band between sections 01 and 02 (as the dashboard-v2 template does); the Markdown MAY fold the matrix into section 05.

- **Acceptance:** both outputs contain all ten section headings in order; the HTML TOC (`#toc`) lists ten section anchors (`#s01` through `#s10`) plus the optional matrix anchor; the Markdown uses the `## 01` through `## 10` numbered headings matching `evaluation-report--plugin--editorial.md`; a section that has no data for a given subject (for example section 06 burndown when the verdict already matches the declared tier with no blockers) renders a "no blockers" state, not an empty heading.

### R-F2-4 - section 05 evidence ledger lists every requirement

Section 05 MUST render one row per spine requirement, grouped by tier (Bronze / Silver / Gold), each row carrying: the reqId plus check label, a status marker (PASS / FAIL / WARN / N/A), and the evidence (the finding `message` and repo-relative `file` when present, plus the check module name). For every non-`PASS` row the renderer MUST also emit the `whyItMatters` copy from `report-meta` (the blockquote in the twin).

- **Acceptance:** for the dashboard-v2-equivalent fixture object, section 05 shows every spine reqId exactly once; a `FAIL` row shows the finding message plus file plus module plus the why-it-matters blockquote; a `PASS` row shows the satisfied evidence; the per-tier sub-header shows the correct `N pass / M total` derived from the spine and the findings, not a literal.

### R-F2-5 - section 06 burndown is ordered and effort-tagged; section 07 carries copy-paste prompts

Section 06 MUST render the climb: exactly the requirements blocking the next tier (from `report.blocked`), ordered, each with an effort estimate from `report-meta.effortMin`, and a total. Section 07 MUST render one card per gap (every FAIL, and optionally every WARN as advisory) with the issue (from the finding), the fix and priority, the effort, and a **copy-paste prompt** (from `report-meta.fixPrompt`). In HTML each prompt MUST have a working copy-to-clipboard button (R-F2-8).

- **Acceptance:** section 06 lists exactly the `report.blocked[nextTier]` requirements, ordered by `effortMin` ascending (shortest-first, matching the twin), with a summed total; section 07 renders a card per FAIL whose prompt text equals the `report-meta` entry; a WARN renders as an advisory card flagged "does not block." A subject with zero blockers renders section 06 as "no blockers; the declared tier is satisfied" and section 07 with only advisory warnings (or "no action required").

### R-F2-6 - self-contained HTML, no external assets, no dashes

`renderHtml` MUST return a single self-contained HTML document: a `<!DOCTYPE html>`, inline `<style>`, and a single inline `<script>`; NO `<link>` / `<script src>` / `@import` / web-font / `url(...)` to any external or local asset, NO binary, NO embedded base64 image. It MUST contain no em-dash (U+2014) or en-dash (U+2013). It MUST be on-brand (the family `#5C7CFA` plus the Bronze/Silver/Gold palette from the templates) and MUST honor the maintainer UX constraints: no content hidden behind tabs or accordions (everything visible, linear scroll), a left-docked sticky TOC with a scroll-spy active state, and a print / Save-PDF affordance.

- **Acceptance:** the rendered HTML opens standalone in a browser with no network (a test asserts the string contains no `src=` / `href="http` / `<link` / `@import` / `url(http`); a test asserts no U+2014 / U+2013; a test asserts `#5c7cfa` (case-insensitive) and the three tier palette tokens are present; a test asserts there is no `display:none` toggling tied to tabs/`<details>` for primary content (the report is linear); the document validates as a single file (no second file referenced).

### R-F2-7 - status correctness, including vacuous N/A

The renderer MUST classify each requirement: `FAIL` when a finding of `severity: "error"` exists for that reqId; `WARN` when only `severity: "warn"` findings exist; `PASS` when no finding exists AND the check is non-conditional; `N/A` (vacuous pass) when no finding exists AND the check is conditional on an absent artifact (the templates mark G1 no-hooks, G6 no-deprecations, U11 no-MCP as N/A). The vacuous set MUST be derived honestly: the renderer marks a clean conditional check `N/A` only when it can determine the artifact is absent from the report context, otherwise `PASS`. The conditional/vacuous reqIds MUST be a single named constant (for example `CONDITIONAL_REQS`), not scattered literals.

- **Acceptance:** a fixture with no hooks/MCP/deprecations renders U11/G1/G6 as `N/A` with a "vacuous pass: nothing to validate" note; a fixture with an MCP server present and clean renders U11 as `PASS`; a fixture with an error finding renders that reqId `FAIL`; a warn-only fixture renders `WARN`; the legend in section 04/10 defines all four markers and states only FAIL blocks (at its tier).

### R-F2-8 - inline JS: scroll-spy plus copy plus print, degrades without JS

The HTML's single inline `<script>` MUST implement (a) TOC scroll-spy active state (IntersectionObserver with a scroll fallback), (b) copy-to-clipboard on the improvement-path prompt buttons (`navigator.clipboard` with a `document.execCommand` fallback), and (c) the print affordance via `window.print()`. The JS MUST be small, dependency-free, and MUST NOT be required for the content to be readable: with JS disabled, all ten sections, the ledger, and the prompt text are still fully visible and the TOC anchors still navigate.

- **Acceptance:** the inline script mirrors the dashboard-v2 template's three IIFEs (scroll-spy, copy, the `window.print()` toolbar button); a test (or a documented manual check) confirms that stripping the `<script>` leaves every section, every ledger row, and every prompt's text present in the DOM; the copy button copies the prompt text verbatim (the `.ptext` content), not the button label; no JS framework or external script is referenced.

### R-F2-9 - the `report-meta` table covers the spine and stays clean

`scripts/lib/report-meta.mjs` MUST export `REPORT_META` keyed by `reqId` with `{ label, whyItMatters, fixPrompt, effortMin, builder }` per entry, and `metaFor(reqId)` returning a safe default for an unmapped reqId. Every live spine `reqId` MUST have exactly one entry; no entry may key a reqId absent from the spine. Every `fixPrompt` MUST name a skill that exists under `skills/` and MUST end by re-running `node scripts/check.mjs`.

- **Acceptance:** a coverage test asserts `new Set(Object.keys(REPORT_META))` equals `new Set(spineReqIds)` (no missing, no orphan); `metaFor("U99")` returns the default without throwing; a test asserts each `fixPrompt`'s named `askit-*` skill resolves to a `skills/<name>/SKILL.md`; a no-dash test passes over the whole module.

### R-F2-10 - provenance honesty in the rendered output

The rendered report MUST distinguish the deterministic conformance layer from any advisory layer, per the linter-vs-judge principle. Section 04 (methodology) MUST state that the conformance gate is deterministic, reproducible, and model-independent (re-run to verify), that it alone decides the tier, and that behavioral/review layers (when present) are advisory and never move the grade. Section 10 (metadata) MUST stamp: subject version, the Standard version (read live, not hardcoded), the evaluator identity, the gate exit code, and the timestamp (`opts.now`). When the object carries advisory (behavioral/review) findings, the renderer MUST stamp the generating model/effort/date for that layer and tag those findings as judgment, not exact.

- **Acceptance:** section 04 contains the "deterministic, reproducible, model-independent" framing and the "only the gate decides the tier" sentence; section 10 shows the live Standard version (0.11 today) and the gate exit code from `gateExitFromFindings`; with a conformance-only object (no advisory findings, the only object F2 ships) no model stamp is emitted and nothing is tagged judgment (there is nothing advisory to stamp); the wording matches the provenance stance in the linter-vs-judge note (conformance is the anchor, advisory is opt-in and stamped).

### R-F2-11 - `askit-evaluate` wired; the rest phased behind their report objects

`askit-evaluate` MUST document and offer the two new formats for its conformance report (the only report object defined today). The SKILL.md conformance-mode steps MUST mention `--format=html` (shareable, non-engineer) and `--format=md` (PR review, agents) alongside `--json`. The skill MUST NOT claim a report for `askit-migrate` / `askit-release` / `askit-reviewer` / `askit-capability-advisor` / `askit-quality-grader`; those are out of scope until each defines its report object (sec 9).

- **Acceptance:** `skills/askit-evaluate/SKILL.md` conformance-mode lists the `--format=md|html` outputs and points at the renderer; `references/report-format.md` documents the four output surfaces (terminal, json, md, html) over the one object; no other skill's SKILL.md is changed by F2; a grep confirms F2 added no migration/release/review report claim.

### R-F2-12 - graceful degradation for fields not yet on the object

The renderer MUST render correctly against today's object shape and MUST surface F1/F3 fields when they later appear, without an F2 code change being required to avoid a crash. If `meta.since` (F1) is absent, the renderer omits the "introduced in" cell; if a `provenance` tag or profile/suppression state (F3) is absent, the renderer omits that column rather than printing `undefined`. No optional field's absence may throw or render `undefined`/`null`/`NaN` into the output.

- **Acceptance:** rendering a present-day object (no `since`, no provenance, no profile) produces a clean report with those cells omitted; injecting a `since`/`provenance` field into a fixture object surfaces it in the appropriate cell; a grep of both rendered outputs finds no literal `undefined`/`null`/`NaN`.

### R-F2-13 - the gate verdict and exit code are unchanged

F2 MUST NOT change the verdict, the tier computation, the findings, or the process exit code. The HTML/MD outputs are presentation only. The CLI exit code for a valid `--format=html|md` run MUST equal the exit code for the same target with no format flag (driven by `gateExitFromFindings(r.findings, declaredTier)` as today).

- **Acceptance:** for several fixtures, `evaluate.mjs <t>`, `evaluate.mjs <t> --json`, `evaluate.mjs <t> --format=md`, and `--format=html` all exit with the identical code; the rendered "gate exit code" stat equals that code; `node scripts/check.mjs <t>` and `evaluate.mjs <t> --format=html` agree on pass/fail (the existing parity invariant in `evaluate.mjs`).

### R-F2-14 - house style and the U5 shape on any authored prose

All prose F2 authors (the `report-meta` copy, section lead-ins, the methodology/legend text, the skill edits) MUST contain no em-dash (U+2014) or en-dash (U+2013), and any authored description in a changed SKILL.md MUST follow the U5 description shape (action verb plus use-when, no colon-space).

- **Acceptance:** the PreToolUse hook did not fire on any F2 write; a sweep of `report-render.mjs`, `report-meta.mjs`, and the changed `SKILL.md` finds no U+2014/U+2013; the `askit-evaluate` description (if touched) has no `": "` colon-space.

## 8. Acceptance criteria (the executor verifies before the PR and again before merge)

- [ ] `node scripts/check.mjs` reports Advanced, 0 errors / 0 warnings, with the live 29-check spine; F2 added no gating regression.
- [ ] `node scripts/evaluate.mjs <plugin> --format=html > report.html` produces a self-contained HTML page that opens with no network; `--format=md` produces the Markdown twin; both carry the same tier/counts/exit as `--json` and the terminal output.
- [ ] `npm test` green, including the new `tests/unit/report-render.test.mjs` (determinism, IA presence, status classification, self-contained/no-dash invariants) and `tests/unit/report-meta.test.mjs` (spine coverage, fix-prompt skill resolution).
- [ ] The renderer reads the spine and Standard version live; a grep finds no `"30"`/`"v0.10"`/`U10` literal baked into `report-render.mjs` or `report-meta.mjs`.
- [ ] The HTML matches the dashboard-v2 visual language: `#5c7cfa` brand, Bronze/Silver/Gold palette, left sticky TOC with scroll-spy, status matrix, no tabs/accordions for primary content, a `Print / Save PDF` button.
- [ ] Section 05 lists every spine requirement once; FAIL/WARN rows carry the why-it-matters copy; section 07 prompts copy verbatim and name a real `askit-*` skill ending in a gate re-run.
- [ ] Provenance: section 04 marks conformance deterministic/reproducible/model-independent and "only the gate decides the tier"; section 10 stamps the live Standard version, gate exit, and timestamp.
- [ ] `skills/askit-evaluate/SKILL.md` and `references/report-format.md` document the four output surfaces; no other skill changed.
- [ ] With JS disabled, all sections, ledger rows, and prompt text remain visible (R-F2-8 manual or DOM check).
- [ ] No em-dash (U+2014) or en-dash (U+2013) in any changed file or any rendered output.
- [ ] `git diff --name-only` shows only the intended files (the two new libs, `evaluate.mjs`, the two new tests, `askit-evaluate/SKILL.md` plus `references/report-format.md`, and any generator output that legitimately changed).

## 9. Phasing - which skills get a report, and when

E1 lists six candidate reports; they are not all buildable now because only `askit-evaluate`'s conformance object exists. The renderer is the shared asset; each additional report is gated on FIRST defining its object shape.

| Skill | Report | Report object status | When |
|---|---|---|---|
| `askit-evaluate` (conformance) | tier-compliance evaluation | exists (`evaluate.mjs`) | **F2 (this spec, v1.4.0)** |
| `askit-migrate` | migration assessment (gap-by-tier, staged Bronze-to-Gold roadmap) | not defined; needs a `{ current, gapsByTier, stagedPlan }` object | follow-up; reuses `renderHtml(obj, { reportType: "migration" })` |
| `askit-capability-advisor` | readiness report (per-agent capability matrix, recommended target tier) | not defined | follow-up |
| `askit-release` | release-readiness (gate result plus changelog/notes summary plus go/no-go) | not defined | follow-up |
| `askit-reviewer` | review report (qualitative findings with severity) | not defined; advisory/judgment layer | follow-up; renders with judgment provenance (R-F2-10) |
| `askit-quality-grader` (behavioral) | behavioral report (per-case fire/no-fire, output quality) | not defined; advisory layer | follow-up |

F2 builds the renderer to be `reportType`-parameterized so each follow-up is "define the object plus add a `report-meta`-style copy table plus pass a new `reportType`," not a new renderer. The advisory reports (reviewer, behavioral) MUST carry the judgment-layer provenance stamp (R-F2-10) when built; F2 lays that path but ships only the deterministic conformance report.

## 10. Out of scope (restated, for the boundary)

- The five non-conformance reports above (each needs its report object first).
- Any model invocation, behavioral run, or review pass inside the renderer or the evaluator's format path.
- A server-side PDF binary (the HTML's `window.print()` is the PDF affordance; no new dependency).
- F1 standard-aware grading and F3 per-rule config/profiles/suppressions (v1.3.0); F2 renders their fields if present (R-F2-12) but implements none.
- Any change to the report object shape, the verdict, or the gate exit code (R-F2-13).
- The Gemini emitter (named v1.x deferral).
- Re-baking the stale "30-check / Standard v0.10 / U10" data from the sample templates; the templates are the visual reference, the live registry is the data reference (sec 2).
