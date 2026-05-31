# Phase 3C-1 Implementation Plan - Silver self-claim + milestone tag (v0.2.0)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The toolkit declares and satisfies Silver (`tier: convergent`), bumps to v0.2.0, and is tagged `v0.2.0` (repo stays private).

**Architecture:** Close S3 by adding the `components` index to `library.json`, flip `tier` to `convergent` and `version` to `0.2.0`, regenerate the three native/resolved manifests, and update the two repo-tier seed tests via red-green. Then sweep the entry-surface docs to Silver framing. The controller opens the PR, merges on green CI, and tags `v0.2.0`.

**Tech Stack:** Node >= 20, ESM `.mjs`, `node:test`. Source of truth: `PHASE-3C-1-DESIGN.md`, `STANDARD.md` v0.8.

**Commit convention:** every commit message ends with a blank line then `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. No em-dash (U+2014) / en-dash (U+2013) anywhere (a hook rejects them).

**Task map:** A = the Silver claim (config + manifests + seed tests, TDD red-green); B = docs sweep + CHANGELOG. Tag + PR + merge are controller steps after B.

---

## File Structure

| File | Action |
|---|---|
| `library.json` | `version` 0.2.0; `tier` convergent; add `components` index (S3) |
| `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `manifest.generated.json` | REGENERATED to 0.2.0 |
| `tests/unit/seed-blocked-convergent.test.mjs` | UPDATE to convergent-satisfied contract |
| `tests/unit/seed-bronze.test.mjs` | UPDATE tier assertion to convergent, drop S3-blocked |
| `AGENTS.md`, `README.md`, `INDEX.md`, `docs/explanation/conformance-and-tiers.md` | UPDATE tier framing to Silver/convergent |
| `CHANGELOG.md` | `[Unreleased]` entry + roll under `[0.2.0]` heading |

---

## Task A: Silver self-claim (library.json + manifests + seed tests)

**Files:** `library.json`; regenerated manifests; `tests/unit/seed-blocked-convergent.test.mjs`; `tests/unit/seed-bronze.test.mjs`.

- [ ] **Step 1: Read the two skills' frontmatter for accurate component-index values**

Read `skills/askit-build-skill/SKILL.md` and `skills/askit-evaluate/SKILL.md`. Note each one's `metadata.version` and `metadata.tier` (expected: both `version: 0.1.0`, `tier: universal` - use the ACTUAL values you read). These populate the components index.

- [ ] **Step 2: Update the seed tests to the convergent-satisfied contract (do this FIRST so they fail)**

Replace the body of `tests/unit/seed-blocked-convergent.test.mjs` with (rename the test description to reflect Silver):
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const REPO = process.cwd();

test("repo tier-report: declares + satisfies convergent (Silver); no convergent blockers remain", () => {
  const t = computeTierReport(REPO);
  assert.equal(t.tier, "convergent");
  assert.deepEqual(t.satisfies, ["universal", "convergent"]);
  const conv = t.blocked.convergent ?? [];
  assert.equal(conv.length, 0, "no convergent blockers expected at Silver: " + JSON.stringify(conv));
});
```

In `tests/unit/seed-bronze.test.mjs`, update the tier test. It currently asserts `tier == "universal"` and S3 in blocked.convergent. Change the body to:
```javascript
test("the repository self-validates at Convergent (Silver): gate stays exit 0, no convergent blockers", () => {
  const t = computeTierReport(process.cwd());
  assert.equal(t.tier, "convergent");
  assert.ok(t.satisfies.includes("universal") && t.satisfies.includes("convergent"));
  const conv = t.blocked.convergent ?? [];
  assert.equal(conv.length, 0, "no convergent blockers expected");
});
```
Preserve the rest of `seed-bronze.test.mjs` (imports, any gate/exit-0 assertions). If it has a separate assertion that `runGate` exits 0, keep it (still true at convergent once S3 closes).

- [ ] **Step 3: Run the seed tests to verify they FAIL**

Run: `node --test tests/unit/seed-blocked-convergent.test.mjs tests/unit/seed-bronze.test.mjs`
Expected: FAIL - the repo still declares `tier: universal` and S3 still blocks, so `t.tier` is `universal` not `convergent`.

- [ ] **Step 4: Update library.json (version, tier, components index)**

Edit `library.json`: set `"version": "0.2.0"`, `"tier": "convergent"`, and add a `components` index after `keywords` (use the actual version/tier values read in Step 1):
```json
  "components": {
    "skills": [
      { "name": "askit-build-skill", "path": "skills/askit-build-skill/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" },
      { "name": "askit-evaluate", "path": "skills/askit-evaluate/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" }
    ]
  }
```
(Adjust `version`/`tier` per Step 1 if they differ. The S3 check enforces the `name` <-> disk correspondence; include the full field set per Standard sec 5.1.)

- [ ] **Step 5: Regenerate the manifests**

Run: `node scripts/generators/gen-manifest.mjs . --write --target=all`
Then `git --no-pager diff --stat` and confirm `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `manifest.generated.json` all now show `version: 0.2.0` (and `manifest.generated.json` shows `tier: convergent`). U8 must stay clean (name/version agree).

- [ ] **Step 6: Run the seed tests + gate to verify GREEN at the convergent ceiling**

Run: `node --test tests/unit/seed-blocked-convergent.test.mjs tests/unit/seed-bronze.test.mjs` -> PASS.
Run: `node scripts/check.mjs` -> exit 0 (print the code). Now at the convergent ceiling, S1-S6 gate; they all pass (S3 closed, S1/S2/S6 pass, S4/S5 untriggered).
Run: `node scripts/tier-report.mjs --json` -> paste it; expect `{"tier":"convergent","satisfies":["universal","convergent"],"blocked":{}}`.
Run: `npm test` -> all pass; report counts.

- [ ] **Step 7: Commit**

```
git add library.json .claude-plugin/plugin.json .codex-plugin/plugin.json manifest.generated.json tests/unit/seed-blocked-convergent.test.mjs tests/unit/seed-bronze.test.mjs
git commit -m "feat: claim Silver - declare tier convergent + components index (v0.2.0)"
```

---

## Task B: Docs sweep to Silver + CHANGELOG

**Files:** `AGENTS.md`, `README.md`, `INDEX.md`, `docs/explanation/conformance-and-tiers.md`, `CHANGELOG.md`.

- [ ] **Step 1: AGENTS.md current-state**

In `AGENTS.md`, the "Current state" section says the repo declares `tier: universal` (Bronze) and references the bootstrap exemption. Update it to state the toolkit now declares `tier: convergent` (Silver) and self-validates at Convergent in CI (S1-S6 gate green; the Silver burndown is empty). Keep the BOOTSTRAP.md pointer as historical context but make clear the current declared tier is convergent.

- [ ] **Step 2: README.md + INDEX.md tier framing**

Read `README.md` and `INDEX.md`. Update any statement that the toolkit is Bronze / `tier: universal` to Silver / `tier: convergent`. Grep both for `universal` and `Bronze` and fix occurrences that describe the toolkit's OWN current tier (do NOT change generic explanations of what the Universal/Bronze tier IS).

- [ ] **Step 3: conformance-and-tiers.md**

In `docs/explanation/conformance-and-tiers.md`, the closing paragraph says the toolkit "declares `tier: universal` and passes its own Universal checks." Update it to: the toolkit now declares `tier: convergent` and satisfies Silver (S1-S6), so `tier-report` reports convergent with an empty `blocked`.

- [ ] **Step 4: CHANGELOG**

In `CHANGELOG.md`, add an `[Unreleased]` -> `### Added` (or a new `### Changed`) entry:
```markdown
- Silver self-claim: the toolkit declares `tier: convergent` and satisfies all Convergent checks (S1-S6) - it now self-validates at Silver in CI, with an empty `tier-report` burndown. Added the `library.json` `components` index (closes S3).
```
Then roll the accumulated `## [Unreleased]` entries under a new `## [0.2.0] - 2026-05-28` heading (Keep a Changelog convention), leaving `## [Unreleased]` empty above it, and add the `[0.2.0]` compare link at the bottom alongside the existing `[Unreleased]` / `[0.1.0]` links (`[0.2.0]: https://github.com/product-on-purpose/agent-skills-toolkit/compare/v0.1.0...v0.2.0` and update `[Unreleased]` to `compare/v0.2.0...HEAD`). Note: v0.1.0 was never tagged, so the compare links are best-effort; if the v0.1.0 link 404s that is acceptable for a private preview. Prefer pointing `[0.2.0]` at `releases/tag/v0.2.0`.

- [ ] **Step 5: Verify gate + suite still green**

Run: `node scripts/check.mjs` -> exit 0. `npm test` -> all pass. (Docs do not affect validation.)

- [ ] **Step 6: Commit**

```
git add AGENTS.md README.md INDEX.md docs/explanation/conformance-and-tiers.md CHANGELOG.md
git commit -m "docs: reframe the toolkit as Silver (convergent) + changelog v0.2.0"
```

---

## Controller steps (after Tasks A + B pass review)

1. Final exit-gate verification on the branch: `npm ci && npm test` (all pass), `node scripts/check.mjs` (exit 0), `node scripts/evaluate.mjs .` (exit 0), `node scripts/tier-report.mjs --json` (`tier: convergent`, `satisfies: [universal, convergent]`, `blocked: {}`). Dash-scan the diff clean (charcode-built scanner).
2. Push branch; open PR (base main); watch CI green.
3. Merge (squash); pull main; close epic + sub-issues.
4. **Tag the Silver milestone:** `git tag -a v0.2.0 -m "Silver milestone - toolkit self-validates at Convergent"` on the merge commit; `git push origin v0.2.0`. Repo stays private; no go-public. (Optional: `gh release create v0.2.0` with notes.)
5. Update memory status (toolkit is Silver/convergent, v0.2.0 tagged; 3C-2 = the eight builders next).

## Exit Gate (3C-1)

- [ ] `library.json`: `version 0.2.0`, `tier convergent`, `components` index that S3 accepts.
- [ ] Three manifests regenerated to 0.2.0; U8 clean.
- [ ] `check.mjs` + `evaluate .` exit 0 at the convergent ceiling; `tier-report` = convergent satisfied, empty blocked.
- [ ] Seed tests updated to the convergent-satisfied contract; full suite green.
- [ ] Docs (AGENTS/README/INDEX/conformance) reframed to Silver; CHANGELOG `[0.2.0]`.
- [ ] CI green on the PR; merged; `v0.2.0` tag pushed; repo still private.
- [ ] No em-dash / en-dash in the diff.

## Self-Review

- **Spec coverage:** every 3C-1 design item maps to a task (claim = A, docs = B, tag = controller). S4 orphan / per-target S6 / builders are explicitly deferred to 3C-2 - no tasks (correct).
- **Placeholders:** none; the components-index field values are read from real frontmatter in A.Step 1.
- **Consistency:** the convergent-satisfied contract (`tier: convergent`, `satisfies: [universal, convergent]`, empty `blocked`) is asserted identically in both seed tests and the exit gate.
- **Regression safety:** only the two REPO-tier seed tests change; the `minimal-skill` fixture tests are untouched (that fixture is universal with no agent-targets, so S3/S6 behavior there is unchanged).
