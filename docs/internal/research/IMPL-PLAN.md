# Competitive Comparison Initiative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. One verification subagent per tool maps cleanly onto Phase 1.

**Goal:** Produce a verified, primary-source comparison of `agent-skills-toolkit` against the main skill/plugin builder tools, plus a best-in-class gap analysis, all distilled from one dated dataset.

**Architecture:** One schema, three views (DESIGN.md section 4). Each competitor gets a dated dossier in `docs/internal/research/tool-profiles/` whose fields map 1:1 to matrix columns; the matrix, gap-analysis, and public page are projections of those dossiers. Verification reads primary sources only, per the pre-registered protocol in `METHODOLOGY.md`. The proof axis (the eval-target corpus run) feeds seed evidence; this initiative does not duplicate it.

**Tech stack:** Markdown docs under `docs/internal/research/` (gate-invisible: `G8` excludes `docs/internal`); the `deep-research` skill for per-tool verification passes; `node scripts/check.mjs .` as the dogfood gate for the deferred public page; Astro Starlight (`npm --prefix site run build`) + the ADR 0026 guards for the deferred site route; git with frequent commits on branch `research/competitive-comparison`.

**Pre-reads for the executor:** `docs/internal/research/DESIGN.md` (the spec, especially sections 4, 6, 3b) and `docs/internal/research/METHODOLOGY.md` (the rules of evidence, the confidence rubric, the adjudication procedure). These are the source of truth for the schema and the verification rules; this plan operationalizes them.

---

## File Structure

| Path | Responsibility | Action |
|---|---|---|
| `docs/internal/research/tool-profiles/_TEMPLATE.md` | The schema made concrete: the exact 16 dimensions + header every profile fills | Create (Task 1) |
| `docs/internal/research/tool-profiles/<tool>.md` (x9) | One dated, sourced dossier per competitor; the source of truth | Create (Tasks 3-11) |
| `docs/internal/research/matrix.md` | The full sourced comparison table, distilled from the profiles | Create skeleton (Task 2), fill (Task 12) |
| `docs/internal/research/gap-analysis.md` | The build / adopt / deliberately-skip worklist (the prize) | Create (Task 13) |
| `docs/internal/research/REFRESH.md` | The refresh runbook + cadence | Create (Task 14) |
| `docs/internal/research/README.md` | Human navigation for the folder (NOT gate-required; `docs/internal` is G8-excluded) | Create (Task 15) |
| `METHODOLOGY.md` (adjudication log table) | Disputed-claim rulings (AAIF etc.) | Modify (Task 12) |
| `docs/explanation/comparison.md` | DEFERRED public page: neutral matrix + labelled take (G7 frontmatter) | Create (Task 16, deferred) |
| `docs/explanation/README.md` | DEFERRED: add `comparison.md` to its inventory (G8) | Modify (Task 16, deferred) |
| `site/scripts/route-manifest.txt` | DEFERRED: register the new `/explanation/comparison` route (ADR 0026) | Modify (Task 16, deferred) |
| `README.md` | DEFERRED: a 5-column mini-matrix + link, extending "What makes it different" | Modify (Task 17, deferred) |

**Corpus (9 profiles).** Direct comparators: `ccpi`, `plugin-eval`, `skill-check`, `skills-check`, `skills-validator`, `agent-skill-linter`. Baselines: `skills-ref`, `skill-creator`. Context: `vercel-skills-cli`.

---

## Phase 1 research procedure (shared; every Task 3-11 fills these parameters)

Each per-tool task runs ONE verification pass and writes ONE profile. The procedure is identical; only the inputs differ. Dispatch a `deep-research` subagent (or `Agent` with the `Explore`/general type) with this prompt skeleton, filling `{TOOL}`, `{REPO}`, `{SOURCES}`, `{SEED}`, `{DISPUTES}`:

```
Verify the tool {TOOL} for a competitive comparison. PRIMARY SOURCES ONLY - read
the actual repo and official docs below; do NOT trust secondary summaries.
Repo + sources: {REPO}; {SOURCES}
For EACH of the 16 dimensions in docs/internal/research/tool-profiles/_TEMPLATE.md,
return: the value, a primary-source URL, and a confidence label (High / High-dated-
snapshot / Medium / Low) per the rubric in METHODOLOGY.md. Volatile facts (stars,
releases, last-commit) are High-dated-snapshot with today's date. If a fact is only
in secondary sources, mark it Low/unverified and do NOT assert it.
Known seed evidence to confirm against the primary source (already observed by our
corpus run): {SEED}
Known disputes to adjudicate (name the conflicting hypotheses, rule from primary
sources, show the evidence): {DISPUTES}
Return the filled profile body (the dimension list + Notes + Open items), nothing else.
```

**Acceptance check (run after writing each profile):**

```powershell
$f = "docs/internal/research/tool-profiles/<tool>.md"
"last_verified present:"; Select-String -Path $f -Pattern "last_verified:\s*\d{4}-\d{2}-\d{2}" -Quiet
"dimension cells with a confidence label (expect >= 16):"; (Select-String -Path $f -Pattern "\(Confidence:").Count
"cells with a source link (expect >= 16):"; (Select-String -Path $f -Pattern "\]\(http").Count
```

Expected: `last_verified` True; both counts >= 16. A profile that fails this is incomplete - fix before commit.

---

## Task 1: Create the profile template (the schema, concrete)

**Files:**
- Create: `docs/internal/research/tool-profiles/_TEMPLATE.md`

- [ ] **Step 1: Write the template**

````markdown
---
tool: <name>
repo: <url>
author: <person/org>
license: <SPDX or "unknown">
last_verified: <YYYY-MM-DD>
primary_sources:
  - <url>
  - <url>
---

# <tool> - profile

One-paragraph summary of what the tool is and who makes it, sourced.

## Dimensions

1. **Unit of evaluation:** <per-skill | per-plugin | whole-library>. [source](url) (Confidence: High)
2. **Tiered and climbable:** <none | pass-fail | score | tiered-with-burndown>. [source](url) (Confidence: High)
3. **Verdict basis:** <deterministic | LLM-judge | hybrid>. [source](url) (Confidence: High)
4. **Lifecycle coverage:** <author/validate/version/release/deprecate/govern - which>. [source](url) (Confidence: High)
5. **Cross-agent emission:** <none | single-format | multi-format native>. [source](url) (Confidence: High)
6. **Self-proving / dogfooded:** <does it grade itself / run its own gate in CI>. [source](url) (Confidence: High)
7. **Target spec(s):** <agentskills.io base | Claude-extended | Codex | Gemini | multi>. [source](url) (Confidence: High)
8. **Validation depth:** <syntax | frontmatter-quality | refs+budget | strict-CI | manifest-vs-disk>. [source](url) (Confidence: High)
9. **Versioning support:** <none | metadata.version | semver-enforced | contract-lock | provenance>. [source](url) (Confidence: High)
10. **Eval / test scaffolding:** <none | evals.json | should-trigger | regression | adversarial>. [source](url) (Confidence: High)
11. **Security posture:** <none | secret-scan | prompt-injection | sandbox | curl-pipe-bash>. [source](url) (Confidence: High)
12. **Output formats:** <human | JSON | SARIF | GH-annotations | HTML>. [source](url) (Confidence: High)
13. **Packaging / install:** <manual | git | npx-CLI | marketplace | GH Action>. [source](url) (Confidence: High)
14. **Maturity signal:** <stars / releases / last-commit, dated>. [source](url) (Confidence: High-dated-snapshot)
15. **Governance / standing:** <first-party | community | foundation-track>. [source](url) (Confidence: High)
16. **Provenance taxonomy (separates portable-objective from house conventions?):** <yes/no, detail>. [source](url) (Confidence: High)

## Notes

Caveats, divergences, things checked and found absent.

## Open items

Claims not verifiable in a primary source, and what would close them.
````

- [ ] **Step 2: Verify the template has all 16 dimensions**

Run: `(Select-String -Path docs/internal/research/tool-profiles/_TEMPLATE.md -Pattern "^\d+\.\s\*\*").Count`
Expected: `16`

- [ ] **Step 3: Commit**

```powershell
git add docs/internal/research/tool-profiles/_TEMPLATE.md
git commit -m "docs(research): add tool-profile template (the 16-dimension schema)"
```

## Task 2: Create the matrix skeleton

**Files:**
- Create: `docs/internal/research/matrix.md`

- [ ] **Step 1: Write the skeleton** (header + the public-subset columns as the leading table; the full 16-column table follows). One row per tool, cells left as `_pending_` until Task 12.

```markdown
# Comparison matrix (sourced)

> Every cell is distilled from the dated profile in `tool-profiles/<tool>.md` and
> carries that profile's citation + confidence. This file is a PROJECTION of the
> profiles; regenerate it when a profile changes (see REFRESH.md). Do not hand-edit
> a cell without updating its profile first.

last_verified: _pending_

## At a glance (the differentiators)

| Tool | Unit of evaluation | Tiered & climbable | Verdict basis | Cross-agent emission | Self-proving |
|---|---|---|---|---|---|
| agent-skills-toolkit | whole-library | tiered-with-burndown | deterministic | multi-format native | yes (self-validates in CI) |
| ccpi | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| plugin-eval | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| skill-check | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| skills-check | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| skills-validator | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| agent-skill-linter | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| skills-ref | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| skill-creator | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| vercel-skills-cli | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |

## Full matrix

(Dimensions 1-16 as columns, one row per tool. Filled in Task 12.)
```

- [ ] **Step 2: Commit**

```powershell
git add docs/internal/research/matrix.md
git commit -m "docs(research): add comparison matrix skeleton"
```

---

## Phase 1: verify the corpus into dated profiles (Tasks 3-11)

Each task uses the **Phase 1 research procedure** above with the listed inputs, writes `tool-profiles/<tool>.md` from `_TEMPLATE.md`, runs the **acceptance check**, and commits. The variable inputs per task:

### Task 3: Profile `ccpi`

**Files:** Create `docs/internal/research/tool-profiles/ccpi.md`

- Inputs: `{REPO}` github.com/jeremylongshore/claude-code-plugins-plus-skills; `{SOURCES}` repo README + releases + npm `@intentsolutionsio/ccpi` + the published 100-point grading rubric + CI config + tonsofskills.com; `{SEED}` none; `{DISPUTES}` the "400+ plugins / ~2800 skills / ~200 agents" and star/release counts are volatile and reported by the author - record as dated snapshots, verify each against the live repo.
- This is the closest analog to askit (grader + package manager); pay attention to dimensions 1 (unit), 2 (is the 100-point rubric tiered/climbable or a flat score?), 3 (deterministic vs human-graded), 8.

- [ ] Step 1: Run the Phase 1 research procedure with these inputs.
- [ ] Step 2: Write `ccpi.md` from `_TEMPLATE.md` with the returned, sourced values.
- [ ] Step 3: Run the acceptance check (above). Expected: pass.
- [ ] Step 4: Commit: `git add docs/internal/research/tool-profiles/ccpi.md; git commit -m "docs(research): verified profile - ccpi"`

### Task 4: Profile `plugin-eval`

**Files:** Create `docs/internal/research/tool-profiles/plugin-eval.md`

- Inputs: `{REPO}` github.com/wshobson/agents (the `plugin-eval` skill/framework + the `make generate HARNESS=...` multi-harness pipeline); `{SOURCES}` repo, the plugin-eval source, the generation pipeline docs; `{SEED}` our corpus run graded `wshobson/agents` at 82-plugin scale and found broken `references/*.md` links in `javascript-typescript` (U6) - confirm those files/links in the live repo and cite; `{DISPUTES}` whether plugin-eval grades per-unit or whole-library (our positioning memory says per-unit) - verify from the source.
- Focus: dimensions 1 (per-unit vs library - load-bearing), 2 (the 3 layers: static/LLM-judge/Monte-Carlo - is it tiered?), 3 (hybrid: static + LLM-judge), 5 (multi-harness emission).

- [ ] Step 1: Run the procedure. Step 2: Write `plugin-eval.md`. Step 3: Acceptance check. Step 4: `git commit -m "docs(research): verified profile - plugin-eval"`

### Task 5: Profile `skill-check`

**Files:** Create `docs/internal/research/tool-profiles/skill-check.md`

- Inputs: `{REPO}` github.com/thedaviddias/skill-check; `{SOURCES}` repo, npm `skill-check`, releases, the rule list, the SARIF/HTML/GH-annotation output docs, the GH Action usage; `{SEED}` none; `{DISPUTES}` star/release counts are volatile - dated snapshot.
- Focus: dimensions 12 (SARIF/HTML/GH-annotations - a likely "adopt" gap for askit), 8 (0-100 score, description-quality), 11 (it bundles agent-scan - security), and the `--fix` auto-remediation (dimension 9/notes).

- [ ] Step 1: Run the procedure. Step 2: Write `skill-check.md`. Step 3: Acceptance check. Step 4: `git commit -m "docs(research): verified profile - skill-check"`

### Task 6: Profile `skills-check`

**Files:** Create `docs/internal/research/tool-profiles/skills-check.md`

- Inputs: `{REPO}` github.com/voodootikigod/skills-check (GH Action: "skills-check-ci"); `{SOURCES}` repo, the command docs (verify / lint / audit / budget / policy / test / health / doctor / fix / update), the semver-verify behavior, the `.skill-policy.yml` format; `{SEED}` none; `{DISPUTES}` the Claude report flagged its adoption metrics (stars/releases/last-commit) as NOT independently verified (low confidence) - find them in the live repo or mark Low/unverified; do not assert unverifiable counts.
- Focus: this is the broadest single CI tool and the closest "semver + CI gate + grader" - dimensions 9 (semver-bump-vs-diff verification, a likely "adopt"), 10 (eval-test), and 2/3.

- [ ] Step 1: Run the procedure. Step 2: Write `skills-check.md`. Step 3: Acceptance check. Step 4: `git commit -m "docs(research): verified profile - skills-check"`

### Task 7: Profile `skills-validator`

**Files:** Create `docs/internal/research/tool-profiles/skills-validator.md`

- Inputs: `{REPO}` github.com/moutons/skills-validator (crates.io `skills-validator`); `{SOURCES}` repo, the 5-pass pipeline (spec / content-quality / reference-integrity / security incl. curl-pipe-bash + optional semgrep / "sizeyness"), the severity-tier config; `{SEED}` none; `{DISPUTES}` near-zero stars but high engineering quality - keep the maturity snapshot honest (dimension 14) and do not let low adoption understate capability.
- Focus: dimension 11 (security: curl-pipe-bash detection, semgrep - a likely "adopt"/"consider"), 8 (5-pass depth), 15 (extends skills-ref).

- [ ] Step 1: Run the procedure. Step 2: Write `skills-validator.md`. Step 3: Acceptance check. Step 4: `git commit -m "docs(research): verified profile - skills-validator"`

### Task 8: Profile `agent-skill-linter`

**Files:** Create `docs/internal/research/tool-profiles/agent-skill-linter.md`

- Inputs: `{REPO}` github.com/William-Yeh/agent-skill-linter; `{SOURCES}` repo, the ~20 rules, the plugin-mode (validates plugin.json + per-skill deps), the `skills-ref` delegation; `{SEED}` none; `{DISPUTES}` very low stars - dated snapshot; confirm it delegates frontmatter to skills-ref (dimension 7/8) from the source.
- Focus: dimensions 8 (publishing-readiness), 7 (built on the open spec), and the skills-ref delegation pattern (relevant to askit's own relationship to the spec).

- [ ] Step 1: Run the procedure. Step 2: Write `agent-skill-linter.md`. Step 3: Acceptance check. Step 4: `git commit -m "docs(research): verified profile - agent-skill-linter"`

### Task 9: Profile `skills-ref` (baseline + THE adjudication)

**Files:** Create `docs/internal/research/tool-profiles/skills-ref.md`

- Inputs: `{REPO}` github.com/agentskills/agentskills (the `skills-ref/` reference validator; pip `skills-ref`); `{SOURCES}` the repo README + LICENSE, the spec at agentskills.io/specification, the `validate` / `read-properties` / `to-prompt` commands, and `aaif.io` (the hosted-project list); `{SEED}` none; `{DISPUTES}` **THE canonical adjudication - is the Agent Skills spec AAIF / Linux-Foundation-governed?** Our own positioning memory asserts "governance -> Linux Foundation"; the careful Claude report says NOT, as of June 2026. Rule it from primary sources: the `agentskills/agentskills` LICENSE (Copyright holder) and the `aaif.io` project list (does it name Agent Skills?). Record the ruling for the Task 12 adjudication log.
- Focus: this is the floor (base-spec only; "demonstration purposes only"); dimensions 1 (per-skill), 7 (base spec), 15 (governance/standing - the disputed one).

- [ ] Step 1: Run the procedure (give the AAIF dispute real weight; this is the worked example in METHODOLOGY.md).
- [ ] Step 2: Write `skills-ref.md`.
- [ ] Step 3: Acceptance check.
- [ ] Step 4: Commit: `git commit -m "docs(research): verified profile - skills-ref (+ AAIF adjudication evidence)"`

### Task 10: Profile `skill-creator` (baseline)

**Files:** Create `docs/internal/research/tool-profiles/skill-creator.md`

- Inputs: `{REPO}` github.com/anthropics/skills (the `skills/skill-creator` meta-skill); `{SOURCES}` the skill's SKILL.md, `init_skill.py` / `package_skill.py`, the eval-driven iteration + HTML eval viewer; `{SEED}` our corpus run found `anthropics/skills` `claude-api/SKILL.md` description is 1068 chars, over the 1024 Agent Skills cap (U3) - confirm in the live repo and cite as a primary-source observation about the parent repo (note: it is about a sibling skill, not skill-creator itself; place it in Notes); `{DISPUTES}` the ~148k stars are the WHOLE anthropics/skills repo, not skill-creator alone - do not attribute repo stars to the scaffolder (dimension 14).
- Focus: dimension 10 (eval-driven iteration - a strong reference for askit's behavioral mode), 4 (authoring, not grading), 1 (per-skill).

- [ ] Step 1: Run the procedure. Step 2: Write `skill-creator.md`. Step 3: Acceptance check. Step 4: `git commit -m "docs(research): verified profile - skill-creator"`

### Task 11: Profile `vercel-skills-cli` (context)

**Files:** Create `docs/internal/research/tool-profiles/vercel-skills-cli.md`

- Inputs: `{REPO}` github.com/vercel-labs/skills (npm `skills`; directory skills.sh); `{SOURCES}` repo, the CLI commands (init/add/list/remove/update + lockfile + `experimental_install`), skills.sh, the launch changelog; `{SEED}` none; `{DISPUTES}` the Claude report flagged a live star discrepancy (~17.3k vs ~21.7k) and the npm "67 more agents" / skills.sh install-count claims - record stars as a dated snapshot and verify the supported-agent + install claims against primary sources.
- Focus: this is a package manager / scaffolder, NOT a grader - most grading dimensions are "none"; its value is dimension 13 (install/distribution) and being the ecosystem gravity well. Keep it a lighter profile.

- [ ] Step 1: Run the procedure. Step 2: Write `vercel-skills-cli.md`. Step 3: Acceptance check. Step 4: `git commit -m "docs(research): verified profile - vercel-skills-cli"`

---

## Phase 2: distill the matrix + adjudicate disputes

### Task 12: Fill the matrix and the adjudication log

**Files:**
- Modify: `docs/internal/research/matrix.md`
- Modify: `METHODOLOGY.md` (the adjudication log table)

- [ ] **Step 1: Fill the matrix from the profiles.** For each tool row, copy dimension 1-16 values from its profile. Every cell shows the value; where a value is Medium/Low confidence, suffix it with `(M)` / `(unverified)`. Add a row for `agent-skills-toolkit` itself (its values are known: whole-library, tiered-with-burndown, deterministic, multi-format native, self-proving, agentskills.io base + Claude-extended + Codex, ..., provenance taxonomy = yes). Set the `last_verified` date.

- [ ] **Step 2: Verify the matrix has no unresolved placeholders.**

Run: `Select-String -Path docs/internal/research/matrix.md -Pattern "_pending_"`
Expected: no matches (every cell filled).

- [ ] **Step 3: Write the adjudication log entries** in `METHODOLOGY.md`, replacing the placeholder row. At minimum the AAIF entry: claim, conflicting sources (Gemini/ChatGPT reports vs the Claude report and our own memory), primary evidence (`agentskills/agentskills` LICENSE; `aaif.io` project list), the ruling, and the date. Add an entry for any other contradiction surfaced in Phase 1.

- [ ] **Step 4: If the AAIF ruling contradicts our own memory** ("governance -> Linux Foundation"), note in the adjudication entry that the prior positioning memory absorbed an unverified claim, and flag it for a memory correction (do not edit competitive-positioning memory inside this task; record the correction need).

- [ ] **Step 5: Commit**

```powershell
git add docs/internal/research/matrix.md METHODOLOGY.md
git commit -m "docs(research): distill comparison matrix + adjudication log (AAIF resolved)"
```

## Phase 3: the gap analysis (the prize)

### Task 13: Write the gap analysis

**Files:**
- Create: `docs/internal/research/gap-analysis.md`

- [ ] **Step 1: Write the gap analysis.** For each capability some competitor has that askit lacks, rule it **adopt / build / deliberately-skip** with rationale tied to askit's identity (deterministic, library-level, cross-agent, self-proving). Use this structure, and ground every candidate in a specific profile cell:

```markdown
---
title: Best-in-class gap analysis
last_verified: <YYYY-MM-DD>
---

# How to stay best in class: gap analysis

Derived from `matrix.md`. Each item cites the profile(s) that motivate it.

## Adopt (clear wins to take)
- **<capability>** - has it: <tool(s)> (`tool-profiles/<x>.md` dim N). Why adopt: <fits askit's identity>. Effort: <S/M/L>.
  (Early candidates from the research: SARIF + GitHub-annotation output (skill-check, dim 12); an
  integrated security / prompt-injection scan (skills-validator dim 11, skill-check); deterministic
  `--fix` auto-remediation (skill-check, the doctor pattern); semver-bump-vs-diff verification
  (skills-check, dim 9); a packaged eval/regression harness (skill-creator dim 10, skills-check).)

## Build (differentiated, worth building ourselves)
- **<capability>** - the gap: <no competitor does this well>. Why it fits askit: <...>. Effort: <...>.

## Deliberately skip (and why)
- **<capability>** - has it: <tool>. Why we skip: <conflicts with deterministic/library-level identity, e.g. per-skill LLM-judge scoring as the gate verdict>.

## Honesty notes
- askit's U5 description scorer clusters good descriptions at ~0.65 and likely saturates
  (recalibration pending); do not claim description-quality superiority until fixed.
- The provenance taxonomy (objective / vendor-cited / house, ADR 0029) is a genuine differentiator
  no competitor matches; surface it.
```

- [ ] **Step 2: Verify every gap item cites a profile.**

Run: `Select-String -Path docs/internal/research/gap-analysis.md -Pattern "tool-profiles/"`
Expected: multiple matches (every Adopt/Skip item references a profile).

- [ ] **Step 3: Commit**

```powershell
git add docs/internal/research/gap-analysis.md
git commit -m "docs(research): best-in-class gap analysis (adopt/build/skip)"
```

## Phase 5 (maintenance) brought forward: REFRESH + folder README

### Task 14: Write the refresh runbook

**Files:**
- Create: `docs/internal/research/REFRESH.md`

- [ ] **Step 1: Write `REFRESH.md`** documenting: the cadence (quarterly + event-triggered when a tracked tool ships a major release); which cells are volatile and always re-checked (dimensions 14 stars/releases/last-commit, and any Low-confidence cells); the exact re-run loop (re-dispatch the Phase 1 procedure per changed tool, update its `last_verified`, then redo Task 12 to re-distill the matrix and Task 13 if a capability changed); and the rule that the public page (Task 16) only publishes once corpus evidence is rich enough to cite.

- [ ] **Step 2: Commit**

```powershell
git add docs/internal/research/REFRESH.md
git commit -m "docs(research): add refresh runbook + cadence"
```

### Task 15: Folder README for human navigation

**Files:**
- Create: `docs/internal/research/README.md`

- [ ] **Step 1: Write a short README** with a `title` frontmatter and an inventory listing the folder's files (DESIGN.md, METHODOLOGY.md, IMPL-PLAN.md, matrix.md, gap-analysis.md, REFRESH.md, tool-profiles/). NOTE: this is for human navigation only - `G8` excludes `docs/internal`, so it is NOT gate-required and its inventory is not gate-enforced.

- [ ] **Step 2: Confirm the gate is still green** (sanity, should be unaffected).

Run: `node scripts/check.mjs .`
Expected: `0 error(s), 0 warning(s).`

- [ ] **Step 3: Commit**

```powershell
git add docs/internal/research/README.md
git commit -m "docs(research): add folder README (human navigation)"
```

---

## Phase 4 (DEFERRED): publish the public surfaces

> **Gate:** Do NOT start Tasks 16-17 until the eval-target corpus run has produced a richer body of
> rendered reports to cite as live proof (DESIGN.md section 3b). Build them when that evidence exists.
> They are fully specified here so they are ready.

### Task 16: Public comparison page (DEFERRED)

**Files:**
- Create: `docs/explanation/comparison.md`
- Modify: `docs/explanation/README.md` (add `comparison.md` to its inventory - G8)
- Modify: `site/scripts/route-manifest.txt` (register the route - ADR 0026)

- [ ] **Step 1: Write `comparison.md`** with G7 frontmatter (`title`, `description`, `audience`, `level`), then the neutral curated matrix (the `## At a glance` columns plus dimensions 7, 8, 12, 14 from `matrix.md`, each cell a one-line sourced value), then a clearly-labelled `## Where askit fits (our read)` section drawing conclusions, and a `## How we verified this` callout linking `../internal/research/METHODOLOGY.md` and the corpus reports under `_local/audit/anchor-runs/`. Keep all claims traced to `matrix.md`.

- [ ] **Step 2: Add `comparison.md` to `docs/explanation/README.md`** inventory section (under the `## Inventory`/`## Contents` heading) so G8's set-match passes.

- [ ] **Step 3: Register the route.** Append the comparison route to `site/scripts/route-manifest.txt` (match the existing line format; a Starlight page at `docs/explanation/comparison.md` serves at `/agent-skills-toolkit/explanation/comparison/`).

- [ ] **Step 4: Run the dogfood gate.**

Run: `node scripts/check.mjs .`
Expected: `0 error(s), 0 warning(s).` (G7 frontmatter present, G8 inventory matches, G10 unaffected.)

- [ ] **Step 5: Build the site and run the ADR 0026 guards.**

```powershell
npm --prefix site install
npm --prefix site run build
node site/scripts/check-route-parity.mjs
$env:STRICT_ANCHORS = "1"; node site/scripts/check-rendered-links.mjs
```
Expected: build succeeds; route-parity passes (manifest matches rendered routes); rendered-link guard passes (no browser-broken links/anchors). If a guard reports a mismatch, fix the manifest/links it names.

- [ ] **Step 6: Commit**

```powershell
git add docs/explanation/comparison.md docs/explanation/README.md site/scripts/route-manifest.txt
git commit -m "docs(explanation): publish sourced comparison page + register route"
```

### Task 17: README mini-matrix (DEFERRED)

**Files:**
- Modify: `README.md` (extend the "What makes it different" section)

- [ ] **Step 1: Add a 5-column mini-matrix** (the `## At a glance` columns: Unit of evaluation, Tiered & climbable, Verdict basis, Cross-agent emission, Self-proving) across the corpus, with a one-line lead-in and a link to the live comparison page. Place it inside or just after "What makes it different". Keep it tight; the full table lives on the page.

- [ ] **Step 2: Confirm the gate is still green** (the root README is G8-excluded, but run anyway).

Run: `node scripts/check.mjs .`
Expected: `0 error(s), 0 warning(s).`

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs(readme): add comparison mini-matrix + link to the full page"
```

---

## Self-review (run before handing off)

- **Spec coverage:** DESIGN.md sections map to tasks - corpus (Tasks 3-11), schema/keystone (Task 1), matrix (Tasks 2, 12), verification protocol (Phase 1 procedure + Task 9 adjudication + Task 12 log), gap analysis (Task 13), public surfaces (Tasks 16-17, deferred), maintenance (Tasks 14-15). Section 3b integrations: `--profile` (in the research procedure for any gate-run), provenance dimension 16 (Task 1 template), batch-1 seed evidence (Tasks 4, 10), U5 caveat (Task 13 honesty notes). Covered.
- **No placeholders:** the only `_pending_` is the intentional matrix-skeleton sentinel that Task 12 fills and verifies to zero; the `<...>` tokens are template fill-slots an executor completes from sourced values, not plan gaps.
- **Type/name consistency:** the 16 dimensions are defined once in `_TEMPLATE.md` (Task 1) and referenced by number everywhere; the acceptance check expects >= 16 confidence labels and source links, matching the template; file paths are consistent (`docs/internal/research/tool-profiles/<tool>.md`).
- **Gate facts verified live:** gate currently 0/0; `G8` excludes `docs/internal` (so Phases 1-3, 5 carry no gate risk); `docs/explanation/` IS scanned (so Task 16 updates its README); site build = `npm --prefix site run build`.
