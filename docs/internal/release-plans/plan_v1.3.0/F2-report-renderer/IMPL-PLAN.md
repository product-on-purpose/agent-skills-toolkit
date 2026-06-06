# F2 - the designed evaluation-report renderer (E1) - implementation plan

> The execution plan for **F2**, the shared HTML / Markdown report renderer over the single `evaluate.mjs` report object, realizing backlog item [E1](../../../backlog/enhancements.md). F2 is the **v1.4.0** feature: it ships as its own release, AFTER the v1.3.0 gate-evolution release (F1 standard-versioning + F3 per-rule config + F4 housekeeping). See the [program plan](../PROGRAM-PLAN.md) sec "Two releases" for why F2 is split out: it is a large user-facing surface with no coupling to the deterministic gate, so it does not belong in the gate-evolution cut.
> Per-feature cadence: one PR per phase vs protected `main`, gate + CI green, a 4-lens adversarial Workflow before each significant merge (Codex `/codex:review` is unreliable on this Windows setup), admin squash, then the v1.4.0 version-bump PR + tag + marketplace re-pin.
> Packet: [`SPEC.md`](./SPEC.md) | [`IMPL-PLAN.md`](./IMPL-PLAN.md) (this file). Sample IA the renderer targets: [`docs/internal/template/evaluation-report--plugin--editorial.md`](../../../template/evaluation-report--plugin--editorial.md) and the `--dashboard-v2.html` sibling.

## 0. What F2 is and is not

**Is:** a deterministic, model-free **renderer** over the report object `evaluate.mjs` already produces. The renderer adds zero new judgment. It takes the frozen `{ scope, target, findings, byRule, summary, tier?, satisfies?, blocked? }` object and emits Markdown or self-contained HTML that matches the designed information architecture in the sample templates. No new runtime, no binary assets, no web fonts (the "CI only shells out to portable Node scripts" principle, ADR 0023 / Design Principle 3).

**Is not:** a judge. F2 does not run a model, does not add findings, does not change the tier. The deterministic gate decides pass / fail (the editorial sample's section 04 "Methodology" wording is the contract the renderer must honor: "the verdict is decided by one layer only: the deterministic conformance gate"). The behavioral / review report objects in Phase C carry advisory layers, but they are rendered, never gated, and they only enter a report when the caller opts into those modes.

**Spine baseline:** `main` is **v1.2.0**, Gold, a **29-check spine** (`U1-U9`, `U11-U12`, `S1-S8`, `G1-G10`), Standard **v0.11**. U10 (no-dashes) was retired from the spine per [ADR 0028](../../../decisions/0028-retire-u10-no-dashes-from-the-spine.md); author-time no-dash enforcement remains via the shipped `hooks/no-dashes.mjs` hook, so this plan and every artifact it produces still carries no em-dash or en-dash. **The sample templates in `docs/internal/template/` still say "30-check spine, Standard v0.10, U1-U12"** because they predate ADR 0028. The renderer must NOT hard-code a check count or a Standard version; it derives both from the report object and `library.json` at render time (sec 4, F2-RENDER-DATA-DRIVEN). When F2 lands, the IA is correct for any spine the report object expresses.

## 1. Phasing

F2 is phased so the high-value slice (the conformance report) ships and is testable before the migration / release / review surfaces are added. Each phase is one PR. The report-render lib and report-meta table are built once in Phase A and reused by every later phase (the "one shared renderer parameterized by report type, not per-skill bespoke HTML" decision in E1).

| Phase | Lands | New report types rendered | PR |
|---|---|---|---|
| **A** | `report-render.mjs` (`renderMarkdown` / `renderHtml`) + `report-meta.mjs` (reqId table) + `evaluate.mjs --format=md\|html --out` + `askit-evaluate` wiring + `report-format.md` update + golden snapshot tests | conformance (plugin + component) | PR-F2A |
| **B** | the `askit-migrate` (gap-by-tier) and `askit-release` (readiness) report objects + their render paths | migration, release-readiness | PR-F2B |
| **C** | the `askit-reviewer` (review) and behavioral (`askit-quality-grader`) report objects + their render paths | review, behavioral | PR-F2C |
| **bump** | the v1.4.0 version-bump PR (library.json + package.json + native manifests + manifest.generated.json + INDEX.md + CHANGELOG + RELEASE-NOTES + STATUS), tag, marketplace re-pin | - | PR-F2-bump |

Phase A is the must-ship slice. B and C extend the same lib. The version bump is its own PR after C is merged, following the proven release flow.

---

## Phase A - the conformance report (the high-value slice)

The whole renderer engine lands here. B and C only add report-type branches and meta rows. The deliverables, file by file.

### A.1 - the meta table: `scripts/lib/report-meta.mjs`

A pure data module: a frozen map keyed by `reqId`, each value `{ why, fixPrompt, effort }`. This is the durable home for the "why it matters" prose, the copy-paste fix prompt, and the effort estimate that the editorial sample shows per finding (sections 05, 06, 07). Keeping it out of the check modules preserves the deterministic gate's single responsibility (decide pass / fail) and ADR 0028's principle that the gate stays a thin linter; the human-facing explanation lives in the render layer.

Shape:

```js
// what-it-is:   the per-requirement explanation table for the evaluation report renderer
// what-it-does: maps each reqId to its "why it matters", a copy-paste fix prompt, and an effort estimate
// why:          keeps human-facing remediation prose out of the deterministic check modules (the gate stays a thin linter, ADR 0028); one table the MD and HTML renderers share so they never diverge
// used-by:      scripts/lib/report-render.mjs
export const REPORT_META = Object.freeze({
  U1: {
    why: "Without a valid library.json a tool cannot identify the library, its version, or the Standard it pins, so nothing downstream can grade or install it.",
    fixPrompt: "Use askit-build-settings to add or repair library.json with name, version, description, standard, and tier.",
    effort: "~10 min",
  },
  U5: {
    why: "A description below the clarity bar makes a skill hard for an agent to select for the right job; it may fail to fire when it should, or fire when it should not.",
    fixPrompt: "Use askit-build-skill (improve mode) on <component>: rewrite the description to state the concrete action and the use-when trigger with real keywords, no colon-space, under 1024 chars. Then run node scripts/check.mjs and confirm U5 scores at or above the bar.",
    effort: "~10 min",
  },
  // ...one entry per reqId currently in the spine (U1-U9, U11-U12, S1-S8, G1-G10)
});

/** Safe lookup: a reqId with no entry falls back to a generic shape so the renderer never throws. */
export function metaFor(reqId) {
  return REPORT_META[reqId] ?? { why: "See STANDARD.md for the requirement this check enforces.", fixPrompt: "", effort: "" };
}
```

Requirements for the table:
- **One entry per reqId currently registered.** The set is derived from `CHECKS` in `registry.mjs` at authoring time (29 entries today). A test asserts every registered `meta.reqId` has a `REPORT_META` entry (sec A.6, test 7), so a future spine addition that forgets its row fails CI rather than rendering a blank "why".
- The `why` strings are lifted from the editorial sample's "> Why X matters" blockquotes where they already exist (U5, U7, G2, G3, G5) and authored for the rest from the check's own `meta` / Standard clause. No em-dash or en-dash.
- `fixPrompt` mirrors the sample's section-07 prompts: it names the matching `askit-*` builder and ends with "run node scripts/check.mjs and confirm <reqId> passes". `<component>` is a placeholder the renderer fills from the finding's `file` where available.
- `effort` is the sample's "~N min" string. It is a coarse human hint, not computed.

### A.2 - the renderer: `scripts/lib/report-render.mjs`

Two exported pure functions over the report object, plus shared internals. No I/O (the caller writes the file), synchronous, model-free.

```js
// what-it-is:   the evaluation-report renderer
// what-it-does: turns the one evaluate.mjs report object into Markdown or a self-contained HTML page, matching the designed IA
// why:          MD (PR review / agents), HTML (non-engineers), JSON, and terminal all derive from one object so they never diverge (E1)
// used-by:      scripts/evaluate.mjs (--format), the askit-evaluate / askit-migrate / askit-release / askit-reviewer skills
export function renderMarkdown(report, opts = {}) { /* ... */ }
export function renderHtml(report, opts = {}) { /* ... */ }
```

Internal structure (one section-builder per IA section, each returning a string; `renderMarkdown` joins them, `renderHtml` wraps each in the page chrome):

- `mastheadSection(report)` - IA 01: subject (`report.target` basename), report type, date (`opts.date ?? new Date().toISOString().slice(0,10)`), the headline grade (`report.tier` or "component, no tier"), a climb indicator from `report.blocked`, and key stats from `report.summary` plus a derived pass count.
- `execSummarySection(report)` - IA 02: a short, fully **derived** narrative. It does NOT invent prose; it composes from counts and the blocked map. For a clean gate it states the tier and that the spine passed; for blockers it lists the blocking tier and the count. (This is template assembly, not judgment, the legitimacy line from the linter-vs-judge note: "decide deterministically, render thinly over frozen facts.")
- `breakdownSection(report)` - IA 03: subject identity (declared tier, version, agent-targets, prefix) read from `opts.library` (the caller passes the loaded `library.json`); component inventory from `opts.components` when present, else omitted.
- `methodologySection()` - IA 04: the fixed three-layer text and the status legend (PASS / FAIL / WARN / N/A). Static prose, identical in every report, asserting "the verdict is decided by one layer only: the deterministic conformance gate."
- `ledgerSection(report)` - IA 05: the per-tier evidence ledger. Iterate the spine in `reqId` order (the order is taken from `report.byRule` keys sorted by the registry order passed in `opts.order`, so the ledger lists every requirement, not only the ones that fired). For each reqId: status (PASS if no error finding; FAIL if an error; WARN if only warns; N/A for a vacuous conditional check that produced nothing AND is in the known-conditional set `opts.conditional`), the evidence message, the check module, and for any non-PASS the `metaFor(reqId).why`.
- `climbSection(report)` - IA 06: the burndown. Built from `report.blocked` (the tier-report output), ordered, each row carries `metaFor(reqId).effort`.
- `improvementSection(report)` - IA 07: one card per non-PASS finding, each with the issue (the finding message), the fix, priority (High for a gold / gate blocker, Medium for a warn), effort, and the **copy-paste prompt** from `metaFor(reqId).fixPrompt` with `<component>` substituted from `finding.file`.
- `insightsSection(report)` - IA 08: rendered only when `report.insights` is present (Phase C review mode populates it); omitted for a pure conformance report rather than fabricated.
- `sourcesSection(report)` - IA 09: a citation list, one line per distinct check module that fired, plus the Standard version line and the subject files. All derivable.
- `metadataSection(report)` - IA 10: subject + Standard versions, evaluator string, gate exit (recompute via the same `gateExitFromFindings` semantics, or accept `opts.exitCode`), timestamp, the legend.

Shared internals:
- `statusFor(reqId, report, conditional)` - returns `"PASS" | "FAIL" | "WARN" | "N/A"`. Single source of the status decision so MD and HTML never disagree.
- `escapeHtml(s)` and `escapeMd(s)` - so a finding message containing `<`, `&`, or a pipe `|` cannot break the HTML or a Markdown table.
- `mdTable(headers, rows)` - one Markdown-table builder (the editorial sample uses tables throughout).

**HTML page chrome (`renderHtml` only):**
- A single self-contained `<!DOCTYPE html>` document: inline `<style>`, no external assets, no web fonts (system sans stack, mono for ids), per the E1 hard constraints and the `--dashboard-v2.html` sample. The palette is the family `#5C7CFA` brand plus the Bronze / Silver / Gold and PASS / FAIL / WARN / N/A CSS variables copied from the sample's `:root`.
- **No tabs, no accordions, no content hidden behind expanders** (E1 maintainer constraint, 2026-06-03). Everything is a linear scroll.
- A **left-docked sticky TOC** with a scroll-spy active state (the only inline JS, plus the copy-prompt button handler and a print affordance). The JS is small, inline, and degrades gracefully (the page is fully readable with JS off; scroll-spy is progressive enhancement).
- A print / Save-PDF affordance (a button that calls `window.print()`, plus a `@media print` block).
- The chrome is lifted structurally from `docs/internal/template/evaluation-report--plugin--dashboard-v2.html` so the renderer's output matches the design that was already reviewed and approved. The renderer does NOT copy the hard-coded acme- sample data; it injects the section strings the builders produced.

**`opts` contract** (everything the renderer needs that is not on the bare report object, passed by the caller so the renderer stays pure):

```
{
  library,      // the loaded library.json data (for identity: version, tier, agent-targets, prefix); optional
  components,   // component inventory for IA 03; optional
  order,        // reqId order for the ledger (the registry order); defaults to byRule key order
  conditional,  // Set of reqIds that pass vacuously when absent (G1, G6, U11), so the ledger shows N/A not PASS
  date,         // ISO date string; defaults to today
  exitCode,     // the gate exit code for IA 10; optional, recomputed if absent
  reportType,   // "conformance" | "migration" | "release" | "review" | "behavioral"; defaults "conformance"
}
```

### A.3 - the CLI: `evaluate.mjs --format=md|html --out <file>`

Extend the bottom-of-file CLI block in `scripts/evaluate.mjs` (currently lines 82-91). The change is additive; terminal and `--json` behavior are unchanged.

- Parse `--format=<md|html|json|text>` (default `text`) and `--out <file>` (optional; when absent, write to stdout).
- After computing `r = evaluate(target)`, branch:
  - `--json` (existing), unchanged, kept for compatibility.
  - `--format=md`, `out = renderMarkdown(r, optsFromTarget(target, r))`.
  - `--format=html`, `out = renderHtml(r, optsFromTarget(target, r))`.
  - default / `--format=text`, existing `formatReport(r)`.
- `optsFromTarget(target, r)` loads `library.json` (via `readJsonSafe`) for `opts.library`, computes `opts.order` from `registry.mjs`'s `CHECKS` (`CHECKS.map(m => m.meta.reqId)`), sets `opts.conditional = new Set(["G1","G6","U11"])`, and sets `opts.exitCode` from the existing `gateExitFromFindings` call.
- If `--out <file>` is given, `writeFileSync(file, out)` and print a one-line confirmation to stderr (`Wrote <file>`); else `console.log(out)`. **Write the confirmation to stderr** so `--out` plus stdout redirection stays clean.
- The process exit code stays governed by the existing `gateExitFromFindings` so the CLI's pass / fail contract does not change (a report render must not mask a failing gate). Document this: rendering a report is orthogonal to the gate verdict.

Add a guarded import so the renderer is only loaded when a format that needs it is requested (keeps the hot `--json` / terminal path free of the larger module):

```js
let renderMarkdown, renderHtml;
async function loadRenderer() {
  ({ renderMarkdown, renderHtml } = await import("./lib/report-render.mjs"));
}
```

Since the CLI block is already at the module bottom and `evaluate.mjs` is invoked as a script, a top-level `await import` inside the `if (process.argv[1]?.endsWith("evaluate.mjs"))` block is acceptable (Node ESM supports top-level await). The exported `evaluate` / `formatReport` functions are untouched, so `evaluate.test.mjs` keeps passing.

### A.4 - skill wiring: `askit-evaluate` SKILL + `references/report-format.md`

- **`skills/askit-evaluate/SKILL.md`** - in `conformance mode`, add a step after the existing step 2: the user may request a designed report with `node scripts/evaluate.mjs <path> --format=html --out report.html` (or `--format=md`). Note that the report is a render of the same deterministic object the terminal shows; it adds no judgment and does not change the verdict. Keep the description shape (no colon-space) and the no-dash rule. Do NOT bump the skill `metadata.version` here; the version bump PR owns versions.
- **`skills/askit-evaluate/references/report-format.md`** - extend the existing reference (currently 14 lines, documenting only `--json`). Add a "Designed report formats" section documenting `--format=md|html` and `--out`, the IA (the 10 sections, named), the hard UX constraints (no tabs, left TOC, print, on-brand), and the explicit statement that MD / HTML / JSON / terminal all derive from one object so they never diverge. Cross-link the sample templates in `docs/internal/template/`. State that the report is a renderer over the deterministic object and never adds a judgment in conformance mode.

### A.5 - golden snapshot fixtures

Use an existing rich golden fixture as the snapshot subject so the renderer is exercised against a real loaded plugin, not a hand-built object. **`tests/fixtures/golden/silver-fixture`** is the right choice: it is Convergent-shaped (`tier: convergent`, prefix `sf-`, agent-targets claude+codex, one skill), so its report has a non-trivial tier, a populated blocked map (the Gold checks it does not satisfy), and identity fields for IA 03. The fixture is already committed and stable.

Store the expected output as committed golden files next to the test:
- `tests/fixtures/golden/report-render/silver-fixture.expected.md`
- `tests/fixtures/golden/report-render/silver-fixture.expected.html`

These are generated once with an `UPDATE_SNAPSHOTS` env affordance in the test (the standard "regenerate snapshot" pattern), reviewed by a human, then committed. The test compares byte-for-byte against them. To keep the snapshot deterministic, the renderer's date is injected (`opts.date = "2026-01-01"` in the test) so a real `new Date()` never makes the snapshot flap.

**The expected files must NOT trip a repo-wide check.** The expected `.md` / `.html` live under `tests/fixtures/golden/`, which the content checks (G8 folder-readme, the docs scans) already exclude, so a committed expected HTML page is safe. Confirm the expected files do not trip U12 (mermaid-valid scans `.md`/`.mdx` repo-wide and does not exclude `tests/fixtures`): the expected `.md` must contain no fenced ` ```mermaid ` block, which it will not (the report IA uses tables and prose, no diagrams).

### A.6 - the test: `tests/unit/report-render.test.mjs`

Modeled on `tests/unit/evaluate.test.mjs` (it imports `evaluate` and a fixture path) and `tests/unit/docs-frontmatter.test.mjs` (fixture-based). Import `evaluate` from `../../scripts/evaluate.mjs`, `renderMarkdown, renderHtml` from `../../scripts/lib/report-render.mjs`, `REPORT_META` from `../../scripts/lib/report-meta.mjs`, and `CHECKS` from `../../scripts/lib/registry.mjs`. The opts use a fixed date.

Cases:

1. **`renderMarkdown produces the committed golden snapshot`** - `evaluate(silver-fixture)` then `renderMarkdown(r, fixedOpts)` equals the committed `silver-fixture.expected.md` byte-for-byte. (Honor `process.env.UPDATE_SNAPSHOTS` to rewrite the expected file; off in CI.)
2. **`renderHtml produces the committed golden snapshot`** - same, against `silver-fixture.expected.html`.
3. **the no-dash assertion** - the rendered MD and HTML contain neither U+2014 nor U+2013 (built from code points in the test, like the retired no-dashes test built its bytes). This guards the renderer's own prose and the meta table.
4. **the self-contained assertion (HTML)** - the rendered HTML contains no `<link `, no `<script src=`, no `src="http`, no `@import`, and no web-font URL; it DOES contain `<style>` and exactly one inline `<script>` block (the TOC / copy / print JS). This proves the E1 "self-contained, no external assets" constraint mechanically.
5. **every IA section is present (HTML)** - the HTML contains an anchor / heading for each of the 10 IA sections (assert each section id is present), proving the no-content-hidden / linear-scroll IA is fully rendered.
6. **the left TOC and print affordance exist** - the HTML contains the sticky TOC nav element and a print control, and a `@media print` block.
7. **meta-table coverage** - every `m.meta.reqId` in `CHECKS` has a `REPORT_META[reqId]` entry (`assert.ok(CHECKS.every(m => REPORT_META[m.meta.reqId]))`). This is the test that makes a future spine addition that forgets its row fail CI.
8. **component scope renders without a tier** - `evaluate(golden/lone-skill)` then `renderMarkdown` contains no "Tier:" / no climb section and does not throw (mirrors the `formatReport` component case in `evaluate.test.mjs`).
9. **a finding message with HTML-special chars is escaped** - construct a small report object with a finding message containing `<script>` and a `|`, render HTML and MD, assert the raw `<script>` is escaped in HTML and the `|` does not break the MD table.
10. **the renderer adds no findings and no tier change** - assert `renderMarkdown(r)` reports the same tier and the same error / warn counts as the source report object (the renderer is a pure projection; this is the legitimacy guard from the linter-vs-judge note).

### A.7 - Phase A verification

Run from the repo root:

| Command | Expected |
|---|---|
| `node scripts/check.mjs` | Advanced, 0 errors / 0 warnings, 29-check spine; exit 0 (the new lib files carry `source-doc` docblocks so G9 stays green; see the A.1 / A.2 docblock headers). |
| `npm test` | All green, including `report-render.test.mjs` (10 cases) and `evaluate.test.mjs` (unchanged). |
| `node scripts/evaluate.mjs tests/fixtures/golden/silver-fixture --format=html --out E:/tmp/sf.html` | Writes `sf.html`; `Wrote E:/tmp/sf.html` on stderr; exit code matches the gate verdict for the fixture. |
| Open `E:/tmp/sf.html` in a browser (optional manual) | Linear scroll, left TOC scroll-spy active, copy buttons work, print affordance works, on-brand `#5C7CFA`. |
| `node scripts/evaluate.mjs tests/fixtures/golden/silver-fixture --format=md` | Markdown to stdout, the 10 IA sections, no em / en dash. |
| `node scripts/evaluate.mjs tests/fixtures/golden/silver-fixture --json` | Unchanged from today (compatibility preserved). |
| `git diff --name-only` | Only: `scripts/lib/report-render.mjs`, `scripts/lib/report-meta.mjs`, `scripts/evaluate.mjs`, `skills/askit-evaluate/SKILL.md`, `skills/askit-evaluate/references/report-format.md`, `tests/unit/report-render.test.mjs`, `tests/fixtures/golden/report-render/**`, and any regenerated `INDEX.md` / `manifest.generated.json` if a skill body changed. |

Run the generators defensively and confirm only intended diff:

```
node scripts/generators/gen-manifest.mjs . --write --target=all
node scripts/generators/gen-index.mjs . --write
git diff --name-only
```

### A.8 - Phase A adversarial review (4-lens, before merge)

Own multi-agent read-only review (not `/codex:review`). Lenses:

- **Soundness (the renderer never decides):** confirm `renderMarkdown` / `renderHtml` add no finding, change no tier, and recompute no verdict; the rendered grade equals the source report's grade (test 10). Confirm the methodology section's "the gate decides" claim is literally true in the code path.
- **Determinism:** confirm both render functions are synchronous and pure (no I/O, no `Date.now()` except via injectable `opts.date`); the snapshot cannot flap.
- **Injection / escaping:** confirm a hostile finding message (HTML tags, pipes, backticks) cannot break the HTML page or the MD table (test 9); confirm the HTML has no `javascript:` URL and the inline JS does not `eval`.
- **Self-containment:** confirm no external asset, no web font, no network reference (test 4), the report opens offline.
- **Scope correctness:** confirm the committed expected `.md` has no mermaid block (U12 repo-wide) and the expected files live under `tests/fixtures/` (excluded from G8 / docs scans).
- **No spec violations:** no version bump, no Standard bump, no new gating; no em / en dash in the diff; the renderer derives the spine and Standard from data, never hard-codes 29 or v0.11.

### A.9 - the Phase A PR

- **Title:** `feat(evaluate): designed conformance report renderer (HTML + Markdown) over the report object [E1]`
- **Body:** What (the shared `report-render` lib + `report-meta` table + `--format=md|html --out`, the 10-section IA, self-contained HTML, MD twin); Why (E1; serves the summary-and-detailed + non-engineer consumability requirement; one object so MD / HTML / JSON / terminal never diverge); How it stays in its lane (a pure projection over the deterministic object, adds no judgment, never gates, the linter-vs-judge legitimacy line); Scope guard (no version bump, no Standard bump, no gate change; the v1.4.0 bump is a later PR); Verification (gate Advanced 0/0, suite green, golden snapshots, self-contained + no-dash assertions, the adversarial review ran). Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Phase B - migration and release-readiness report objects

Phase A built the engine; Phase B defines two new report objects and routes them through the same renderer with a `reportType` branch. No new render engine.

### B.1 - the `askit-migrate` report object (gap-by-tier)

`askit-migrate` produces a **migration assessment**: current state, gap-by-tier, and the staged Bronze-to-Gold roadmap (E1, "Which skills"). Define its object as the conformance report object PLUS a `migration` block:

```
{
  ...baseReport,            // scope, target, findings, byRule, summary, tier, satisfies, blocked
  reportType: "migration",
  migration: {
    currentTier,            // = report.tier
    targetTier,             // requested target (e.g. "advanced")
    stages: [               // ordered current -> target, each a worklist
      { tier, blockers: [ { reqId, message, fixPrompt, effort } ] }
    ],
  },
}
```

- The `stages` array is derived deterministically from `blocked` and the tier order in `scripts/lib/tier.mjs` (`TIER_ORDER`): for each tier from current+1 up to target, list the error findings whose `tierForReq(reqId)` equals that tier, with `metaFor(reqId)`.
- Build this in `scripts/lib/migrate-report.mjs` (a new small module that calls `evaluate` and decorates), or extend the `askit-migrate` skill's existing script if one exists; the renderer change is the same either way.

### B.2 - the `askit-release` report object (release-readiness)

`askit-release` produces a **release-readiness** report: the gate result, the changelog / notes summary, and a go / no-go (E1). Object:

```
{
  ...baseReport,
  reportType: "release",
  release: {
    goNoGo: "go" | "no-go",     // "go" iff gate exit 0 AND release-notes present AND version consistent
    gateExit,                    // the deterministic gate exit
    versionConsistency: { ok, detail },  // library.json vs package.json vs manifests (mirrors the release.yml guard)
    notesPresent: boolean,       // RELEASE-NOTES.md distinct from CHANGELOG.md (the G5 contract)
    summary,                     // the changelog / notes headline lines
  },
}
```

- `goNoGo` is a pure function of deterministic facts (gate exit, the G5 / version-consistency invariants). No judgment.
- Mirror the version-consistency check the existing `release.yml` guard enforces so the report agrees with the release tag guard.

### B.3 - renderer routing

In `report-render.mjs`, the section builders branch on `report.reportType`:
- **migration:** the IA-07 "Improvement path" section becomes the **staged plan** (one card per stage, then per blocker); IA-06 "climb" renders the full current-to-target ladder. The other sections are unchanged (same masthead, ledger, methodology).
- **release:** the masthead headline becomes the **go / no-go**; a new "Release readiness" section (between IA-01 and IA-02) renders the gate exit, version consistency, notes presence, and the summary. The ledger still renders (the gate is the basis for go / no-go).

Each branch is a few conditionals inside the existing builders, not a parallel renderer.

### B.4 - Phase B tests and fixtures

`tests/unit/report-render-migration.test.mjs` and `tests/unit/report-render-release.test.mjs`:
- Golden MD + HTML snapshots for each, over a fixture (silver-fixture for migration targeting advanced; a fixture lacking RELEASE-NOTES for a "no-go", and one with notes for a "go").
- The no-dash and self-contained assertions reused (extract them into a shared `tests/unit/_report-asserts.mjs` helper in Phase B so all three phases share one assertion set).
- A `goNoGo` determinism assertion: same fixture, two renders, identical verdict.
- A meta coverage assertion for any new fixPrompt rows migration / release introduce.

### B.5 - Phase B verification + review + PR

Same verification table as A.7 (gate Advanced 0/0, suite green, snapshots, no-dash, self-contained), plus the migration and release CLIs render. Same 4-lens review focused on the new derivations (stages, go / no-go) being pure functions of deterministic facts. PR title: `feat(evaluate): migration and release-readiness report objects + renderer routing [E1]`.

---

## Phase C - review and behavioral report objects (the advisory layers)

Phase C renders the two **advisory** report types. These are the only F2 reports that carry model-judged content; the renderer keeps them clearly labeled as advisory and never lets them move a gate verdict (Design Principle 3 / ADR 0023, and the linter-vs-judge note's "provenance per layer" guidance).

### C.1 - the `askit-reviewer` report object (review)

`askit-reviewer` forms a qualitative judgment (correctness, altitude, naming, whether a component is warranted). Object:

```
{
  ...baseReport,            // the deterministic facts are still present and still decide any tier shown
  reportType: "review",
  review: {
    model, effort, date,    // provenance stamp (linter-vs-judge note sec 5: name the model)
    findings: [ { area, severity, message, file, provenance } ],  // provenance: "objective" | "vendor-cited" | "house-preference"
  },
  insights: [ ... ],        // qualitative notes -> IA-08
}
```

- The review `findings` are advisory and are rendered in a clearly-labeled "Review (advisory)" block plus IA-08 Insights. They carry a `provenance` tag (objective / vendor-cited / house-preference) per the linter-vs-judge analysis, so a reader knows which survive a re-run.
- The masthead grade and the ledger remain the deterministic gate's; the review block never overrides them. The methodology section gains the provenance / model stamp.

### C.2 - the behavioral report object (`askit-quality-grader`)

The behavioral mode runs a skill against its eval-set and judges fire / no-fire and output quality. Object:

```
{
  ...baseReport,
  reportType: "behavioral",
  behavioral: {
    model, effort, date,    // provenance stamp
    cases: [ { kind: "trigger" | "behavior", id, expected, observed, verdict, evidence } ],
    summary: { fired, missed, behaviorPass, behaviorFail },
  },
}
```

- Rendered as a "Behavioral evidence (advisory)" section: a per-case fire / no-fire and output-quality table, with the provenance / model stamp. Never gates (the SKILL already states "this is evidence, not a gate result; it never fails CI").

### C.3 - renderer routing

Add `review` and `behavioral` branches: each adds its labeled advisory section and (for review) populates IA-08 Insights. The deterministic sections (masthead grade, ledger, methodology) are unchanged; the methodology section gains a provenance / model-stamp paragraph when an advisory layer is present (per the linter-vs-judge note: stamp the model and the date for the judgment layer).

### C.4 - Phase C tests

`tests/unit/report-render-review.test.mjs` and `tests/unit/report-render-behavioral.test.mjs`:
- Golden snapshots over a hand-built report object with a fixed model / effort / date stamp (these objects come from an LLM layer at runtime, so the test injects a frozen object; the renderer is still a pure projection and that is what is under test).
- Assert the advisory section is labeled "advisory" and the masthead grade still equals the deterministic source grade (the advisory layer did not move the verdict).
- Assert the provenance tags render and the model stamp is present.
- Reuse the shared no-dash and self-contained assertions.

### C.5 - Phase C verification + review + PR

Verification table as before. The 4-lens review's key lens here: **confirm the advisory layers cannot move the gate verdict** (the masthead grade equals the deterministic grade in every review / behavioral snapshot) and that every advisory finding carries a provenance tag and a model stamp. PR title: `feat(evaluate): review and behavioral advisory report objects + renderer routing [E1]`.

---

## The v1.4.0 version-bump PR (after Phase C merges)

F2 is the **v1.4.0** feature and ships as its own release. After Phases A-C are merged and `main` is green, cut the version bump as a single PR following the proven release flow.

### Bump steps

1. Branch from `main`.
2. Bump `library.json` `version` `1.3.0 -> 1.4.0` (the v1.3.0 gate-evolution release precedes this). The Standard `standard` field does NOT change: F2 adds no check and no tier requirement, so the spine stays 29 and the Standard stays at whatever v1.3.0 left it (v0.12 if F1 bumped it; confirm against `main` at bump time). F2 is a tooling feature, not a Standard change.
3. Bump `package.json` `version` to `1.4.0`.
4. Regenerate native manifests and `manifest.generated.json`:
   ```
   node scripts/generators/gen-manifest.mjs . --write --target=all
   ```
5. Regenerate `INDEX.md`:
   ```
   node scripts/generators/gen-index.mjs . --write
   ```
6. Update `CHANGELOG.md` (the `--format=md|html` renderer, the report-render lib, the migration / release / review / behavioral report types) and `RELEASE-NOTES.md` (the curated user-facing summary: a designed, shareable, copy-paste-actionable evaluation report in HTML and Markdown).
7. Update `docs/internal/STATUS.md` to v1.4.0, note F2 shipped.
8. Run `node scripts/check.mjs` (Advanced 0/0, 29-check spine) and `npm test` (all green).
9. 4-lens adversarial review of the bump diff (version consistency across library.json / package.json / manifests / INDEX; CHANGELOG and RELEASE-NOTES accurate; no stale check-count claim re-introduced).
10. PR title: `release: v1.4.0 the designed evaluation-report renderer (E1 / F2)`. Squash-merge.

### Tag + release + re-pin

11. Tag `v1.4.0`; `release.yml` mints the GitHub release behind the version-consistency guard.
12. Re-pin the `product-on-purpose/agent-plugins` marketplace entry to the new tag (new sha, registry `metadata` minor bump), then smoke-verify the install. Use a git worktree for the agent-plugins change (MEMORY: beware shared-worktree branch switches by parallel sessions).

---

## Cross-phase verification checklist (Definition of Done)

- [ ] Phases A, B, C each merged as their own PR; `main` green at every phase exit.
- [ ] `node scripts/check.mjs` is Advanced, 0/0, 29-check spine (`U1-U9`, `U11-U12`, `S1-S8`, `G1-G10`), Standard unchanged by F2.
- [ ] `npm test` green: `report-render.test.mjs` (+ migration / release / review / behavioral variants); `evaluate.test.mjs` unchanged and passing.
- [ ] `report-render.mjs` and `report-meta.mjs` carry four-field source docblocks (G9 stays green).
- [ ] `renderMarkdown` / `renderHtml` are synchronous, pure, model-free; they add no finding and never change the tier (test 10, and the review / behavioral snapshots prove the advisory layers do not move the verdict).
- [ ] Every rendered report (MD and HTML) contains no em-dash (U+2014) or en-dash (U+2013).
- [ ] The HTML is self-contained: no external asset, no web font, no network reference; one inline `<style>` and one inline `<script>`; no tabs / accordions; a left-docked sticky TOC with scroll-spy; a print / Save-PDF affordance; on-brand `#5C7CFA` plus the tier and status palettes.
- [ ] All 10 IA sections render for the conformance report; migration adds the staged plan; release adds the go / no-go and readiness; review and behavioral add their labeled advisory sections with a provenance / model stamp.
- [ ] The renderer derives the spine and the Standard version from the report object / `library.json` at render time; no hard-coded check count or Standard version anywhere in the renderer.
- [ ] `REPORT_META` has one entry per registered `reqId`; the coverage test guards future spine additions.
- [ ] `--json` and terminal output are byte-for-byte unchanged from v1.2.0 (compatibility preserved).
- [ ] `askit-evaluate` SKILL and `references/report-format.md` document the new formats; the SKILL description shape and the no-dash rule hold.
- [ ] Each significant merge passed a 4-lens adversarial review (Codex `/codex:review` not used; own multi-agent read-only review).
- [ ] v1.4.0 tagged + released; the marketplace entry re-pinned and the install smoke-verified.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| **The renderer drifts into deciding the verdict** (the exact antipattern the linter-vs-judge note warns against) | The renderer is a pure projection; test 10 and the review / behavioral snapshots assert the rendered grade equals the deterministic source grade. The methodology section literally states "the gate decides." Reviewed under the soundness lens every phase. |
| **Sample templates say "30-check / v0.10 / U1-U12"** (pre-ADR-0028) and the renderer copies a stale count | The renderer derives the spine and Standard from the live report object and `library.json`, never from the templates; the templates are a visual reference only. A test asserts no hard-coded `30` / `v0.10` in the renderer. |
| **Snapshot tests flap** on date or environment | The date is injected via `opts.date`; the renderer does no I/O and no `Date.now()`; snapshots are byte-for-byte over a committed, stable fixture (silver-fixture). |
| **A committed expected HTML / MD trips a repo-wide check** (U12 mermaid scans `tests/fixtures` too) | The expected files contain no mermaid block; they live under `tests/fixtures/golden/`, excluded from G8 / docs scans; the no-dash assertion guards content hygiene in the rendered prose. |
| **HTML injection from a hostile finding message** | `escapeHtml` / `escapeMd` on every interpolated string; test 9 asserts `<script>` and `|` are neutralized; the review lens checks for `javascript:` URLs and `eval`. |
| **Advisory (review / behavioral) content leaks into a CI-gating path** | The advisory objects are only built when the caller opts into those modes; the renderer labels them "advisory" and never feeds them to `gateExitFromFindings`; the SKILL already states they never fail CI. |
| **Scope creep into v1.3.0** | F2 is sequenced as its own v1.4.0 release AFTER the v1.3.0 gate-evolution cut; it touches no check module and no Standard requirement, so it cannot couple to F1 / F3. The version bump is a separate PR. |

## Out of scope

- Any change to a check module, the spine count, or the Standard version (F2 is a renderer; the gate-evolution work is F1 / F3 in v1.3.0).
- Per-rule config, profiles, or suppressions (F3, v1.3.0); the renderer reads whatever the report object expresses, it does not add configurability.
- A new runtime dependency, a binary asset, or a web font (the portable-Node / self-contained constraint).
- The Gemini emitter (a named v1.x deferral, not built here; scope note only).
- An interactive calibration loop or eval-the-grader reliability runs (the judge-mode ambition in the linter-vs-judge note sec 2 / sec 5; a later, separate effort).
- `askit-capability-advisor` readiness report; E1 lists it, but it is deferred past F2's three phases unless the maintainer pulls it forward; the renderer's `reportType` branch makes adding it cheap later.
