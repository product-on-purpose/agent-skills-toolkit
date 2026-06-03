# P6 - docs-presence (G10) + G7 renumber + STANDARD v0.10 + v1.1.0 release - implementation plan

> The execution sketch for P6, the last phase. Cadence: branch from `main`; author the `G10` module + fixtures + test and confirm the gate is green against the real tree *before* registering it; register it (the flip); finish the `STANDARD.md` v0.10 surface, the version bump, and the regeneration; sweep the counts/wording; gate + `npm test` + site build + the 14.11 guards; adversarial gate (a local multi-agent read-only review, since the Codex CLI is unreliable on this Windows setup); squash-merge; `main` green. The release (tag `v1.1.0` + the marketplace re-pin) is a separate, maintainer-gated step after merge. Keyed to [`SPEC.md`](./SPEC.md) and [`PRD.md`](./PRD.md); per-check detail in [`../CHECKS-SPEC.md`](../CHECKS-SPEC.md).

## Author-before-enforce micro-order

`G10`'s conforming artifacts are authored upstream (P1 content + the marked-and-linked architecture pair + the ADR TL;DRs, all already on `main`). So the P6 micro-order is:

1. **Author the module + fixtures + test** (`docs-presence.mjs`, the golden + three anti fixtures, the unit test) - but do **not** register it yet.
2. **Dry-run the module against the real tree** by importing its `check` and running it over `loadPlugin(REPO_ROOT)` in a scratch test (or the unit test's repo-root case): confirm zero `G10` findings against the toolkit's own `docs/`. This proves the flip will be green before it happens.
3. **Register it** (the import + the `CHECKS` array entry) - the flip. Now the gate runs `G10`.
4. **Finish the STANDARD.md v0.10 surface** (sec 2.5 `U12`, sec 2.6 `G8-G10` + spine line, sec 4.2, the history note) and the **version bump** (`library.json` + `package.json` -> `1.1.0`).
5. **Regenerate** native manifests + `manifest.generated.json` + `INDEX.md`.
6. **Sweep** the stale counts/wording and add the `G8/G9/G10` rows to `gold-checks.md`; write the CHANGELOG + RELEASE-NOTES.
7. **Gate + test + site build + 14.11 guards**, all green.
8. **Adversarial gate**, fix confirmed findings, re-gate.
9. **Squash-merge**; confirm `main` green.
10. (Maintainer-gated) **tag + marketplace re-pin.**

## Steps

> All paths relative to the repo root `E:\Projects\product-on-purpose\agent-skills-toolkit`.

### 1. Branch

`git checkout -b phase-6-docs-presence-release main` (from current `main`, after P0-P5 are merged and `main` is green at the 29-check spine `U1-U12` + `S1-S8` + `G1-G9`).

### 2. Author the check module

Create `scripts/checks/docs-presence.mjs`. Skeleton (synchronous, zero-model, reusing `relPath`, `finding`/`SEVERITY`, `parseFrontmatter`, mirroring the `docs-frontmatter.mjs` shape):

```js
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { parseFrontmatter } from "../lib/frontmatter.mjs";

export const meta = { id: "docs-presence", tier: "advanced", reqId: "G10" };

const DIATAXIS = ["tutorials", "how-to", "reference", "explanation"];

// what-it-is:   the G10 docs-presence Gold check
// what-it-does: asserts the Diataxis dirs are non-empty, every ADR has a ## TL;DR, and the
//               architecture overview links the detailed page
// why:          a presence/linkage bar so a Gold library cannot ship a hollow docs tree
// used-by:      scripts/lib/registry.mjs (the gate), tests/unit/docs-presence.test.mjs

/** True if dir exists and contains at least one *.md (recursively). */
function hasMarkdown(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return false; }
  for (const name of entries) {
    const full = path.join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { if (hasMarkdown(full)) return true; }
    else if (name.endsWith(".md")) return true;
  }
  return false;
}

/** Strip fenced code blocks so a ## TL;DR inside a fence is not matched. */
function stripFences(text) {
  return text.replace(/```[\s\S]*?```/g, "");
}

function hasTldr(text) {
  return /^## TL;DR\s*$/m.test(stripFences(text));
}

/** Collect docs/** *.md excluding docs/internal/**. */
function collectPublic(docsDir, internal, out) {
  let entries;
  try { entries = readdirSync(docsDir); } catch { return; }
  for (const name of entries) {
    const full = path.join(docsDir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (full === internal || full.startsWith(internal + path.sep)) continue;
    if (st.isDirectory()) collectPublic(full, internal, out);
    else if (name.endsWith(".md")) out.push(full);
  }
}

export function check(ctx) {
  const root = ctx.root;
  if (!root) return [];
  const docsDir = path.join(root, "docs");
  if (!existsSync(docsDir)) return []; // no docs tree -> vacuous.
  const internal = path.join(docsDir, "internal");
  const out = [];

  // Rule 1: Diataxis presence.
  for (const name of DIATAXIS) {
    const dir = path.join(docsDir, name);
    if (!hasMarkdown(dir)) {
      out.push(finding(meta.id, SEVERITY.ERROR,
        `Diataxis directory docs/${name} is missing or has no *.md page; each quadrant MUST be non-empty (Standard sec 2.6 G10).`,
        { file: `docs/${name}`, reqId: meta.reqId }));
    }
  }

  // Rule 2: ADR TL;DR (conditional on docs/internal/decisions/).
  const decisions = path.join(internal, "decisions");
  if (existsSync(decisions)) {
    let names = [];
    try { names = readdirSync(decisions); } catch { names = []; }
    for (const name of names) {
      if (name === "README.md") continue;
      if (!/^\d{4}-.*\.md$/.test(name)) continue;
      const full = path.join(decisions, name);
      let text;
      try { text = readFileSync(full, "utf8"); } catch { continue; }
      if (!hasTldr(text)) {
        out.push(finding(meta.id, SEVERITY.ERROR,
          `ADR ${relPath(root, full)} has no "## TL;DR" block; every decision record MUST carry the 3-line decision summary (Standard sec 10.4).`,
          { file: relPath(root, full), reqId: meta.reqId }));
      }
    }
  }

  // Rule 3: architecture overview links the detailed page.
  const pages = [];
  collectPublic(docsDir, internal, pages);
  let overview = null, detailed = null;
  for (const f of pages) {
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    const { frontmatter } = parseFrontmatter(text);
    const role = frontmatter && frontmatter["doc-role"];
    if (role === "architecture-overview") overview = { file: f, text };
    else if (role === "architecture-detailed") detailed = { file: f };
  }
  if (!overview && !detailed) {
    out.push(finding(meta.id, SEVERITY.ERROR,
      `no page carries doc-role: architecture-overview or architecture-detailed; the architecture pair MUST exist and be marked (R-CONTENT-4 / G10 rule 3).`,
      { file: "docs", reqId: meta.reqId }));
  } else if (overview && detailed) {
    const overviewDir = path.dirname(overview.file);
    const wantRel = relPath(root, detailed.file);
    let linked = false;
    const linkRe = /\]\(([^)]+)\)/g;
    let m;
    while ((m = linkRe.exec(overview.text)) !== null) {
      const target = m[1].split("#")[0].trim();
      if (!target) continue;
      const resolved = relPath(root, path.resolve(overviewDir, target));
      if (resolved === wantRel) { linked = true; break; }
    }
    if (!linked) {
      out.push(finding(meta.id, SEVERITY.ERROR,
        `architecture overview (${relPath(root, overview.file)}) does not link the detailed page (${wantRel}); add a resolvable markdown link (G10 rule 3).`,
        { file: relPath(root, overview.file), reqId: meta.reqId }));
    }
  }
  // (overview xor detailed present is covered by the link rule's else-if guard:
  //  if only one marker exists, the pair is incomplete -> treat as presence; see test.)
  return out;
}
```

Note the docblock at the top of the module: it carries the four `G9` `source-doc` fields so the module itself passes `G9` (P5's check). Confirm the `overview xor detailed` case is handled the way the test expects (a single marker present is a presence problem; the skeleton currently only emits the unlinked finding when *both* are present - decide and encode: the simplest sound rule is "if exactly one of the two markers is present, emit the presence finding", which the test below pins; adjust the `else if (overview && detailed)` to an explicit three-way before merge).

### 3. Golden fixture

Create `tests/fixtures/golden/docs-presence-ok/`:
- `library.json` -> `{ "name": "docs-presence-ok", "version": "0.1.0", "description": "A fixture plugin with a complete docs tree. Use it as the golden baseline for the docs-presence (G10) check.", "standard": "0.10", "tier": "advanced" }`
- `docs/tutorials/intro.md`, `docs/how-to/do-a-thing.md`, `docs/reference/api.md`, `docs/explanation/why.md` - each a minimal `*.md` page (a heading is enough; the four quadrants need at least one `.md`).
- `docs/explanation/architecture.md` - frontmatter `doc-role: architecture-overview` + a body link `[internals](./architecture-internals.md)`.
- `docs/explanation/architecture-internals.md` - frontmatter `doc-role: architecture-detailed`.
- `docs/internal/decisions/0001-sample.md` - contains a `## TL;DR` block.
- `docs/internal/decisions/README.md` - no TL;DR (it is excluded, so this proves the README skip).

### 4. Anti fixtures (three)

Create three sibling fixtures, each a copy of the golden with exactly one defect so each rule's failure path is isolated:

- `tests/fixtures/anti/docs-presence-empty-tutorials/` - identical to golden but `docs/tutorials/` contains only a `.gitkeep` (no `*.md`). Expect: a finding naming `docs/tutorials`.
- `tests/fixtures/anti/docs-presence-adr-no-tldr/` - identical to golden but `docs/internal/decisions/0001-sample.md` has its `## TL;DR` heading removed. Expect: a finding naming that ADR.
- `tests/fixtures/anti/docs-presence-arch-unlinked/` - identical to golden but `docs/explanation/architecture.md`'s body link to `architecture-internals.md` is removed (the `doc-role: architecture-overview` marker stays). Expect: an "unlinked" finding naming the overview.

(Optional fourth, if encoding the presence rule: `docs-presence-arch-unmarked/` with neither `doc-role` marker, expecting the distinct "presence" finding. Cover it in the test even if folded into one of the above.)

### 5. Unit test

Create `tests/unit/docs-presence.test.mjs`, mirroring `docs-frontmatter.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/docs-presence.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const ok = path.join(FIXTURES, "golden/docs-presence-ok");
const emptyTut = path.join(FIXTURES, "anti/docs-presence-empty-tutorials");
const noTldr = path.join(FIXTURES, "anti/docs-presence-adr-no-tldr");
const unlinked = path.join(FIXTURES, "anti/docs-presence-arch-unlinked");
const noDocs = path.join(FIXTURES, "golden/minimal-skill"); // no docs/ tree

test("a complete docs tree passes G10 with no findings", () => {
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("an empty Diataxis quadrant fails G10", () => {
  const f = check(loadPlugin(emptyTut));
  assert.ok(f.some((x) => /docs\/tutorials/.test(x.message)));
  assert.ok(f.every((x) => x.reqId === "G10" && x.severity === "error"));
});

test("an ADR missing ## TL;DR fails G10", () => {
  const f = check(loadPlugin(noTldr));
  assert.ok(f.some((x) => /TL;DR/.test(x.message)));
});

test("an architecture overview that does not link the detailed page fails G10", () => {
  const f = check(loadPlugin(unlinked));
  assert.ok(f.some((x) => /does not link/.test(x.message)));
});

test("a plugin with no docs/ tree passes G10 vacuously", () => {
  assert.equal(check(loadPlugin(noDocs)).length, 0);
});
```

### 6. Register the check (the flip)

In `scripts/lib/registry.mjs`:
- Add the import after the `docsFrontmatter` line: `import * as docsPresence from "../checks/docs-presence.mjs";`
- Add `docsPresence` to the end of the `CHECKS` array (after `docsFrontmatter`).

### 7. Numbering-integrity assertions

- Confirm a reqId-uniqueness assertion exists (in `registry-sync.test.mjs` or a sibling); if not, add one that asserts `new Set(CHECKS.map(m => m.meta.reqId)).size === CHECKS.length`.
- Find and update any hard-coded spine-count expectation from `26`/`29` to `30` (grep tests for the count; if none asserts it, add one: `assert.equal(CHECKS.length, 30)` is acceptable, with a comment naming the spine `U1-U12 + S1-S8 + G1-G10`).

### 8. STANDARD.md v0.10 completion

Edit `STANDARD.md`:
- The top version-history `v0.10` note: extend it to record `U12` + `G8-G10` completion and the spine `= 30` (keep the header at `v0.10`).
- sec 2.5 / the Universal list: add `U12` (`mermaid-valid`, Bronze).
- sec 2.6 Gold table: add the `G8`, `G9`, `G10` rows (column shape `# | Requirement | Satisfied by | Deferred elaboration`); per SPEC "STANDARD.md sec deltas".
- sec 2.6 spine line: `G1-G7 ... = 26` -> `G1-G10 ... = 30`; "MUST pass G1-G7 against itself" -> `G1-G10`.
- sec 4.2: add the Universal `U12` clause and the three Advanced clauses.
- sec 8.4: verify present (no change beyond confirmation).

### 9. Version bump + regeneration

- `library.json`: `"version": "1.0.0"` -> `"1.1.0"` (the `standard` is already `"0.10"`).
- `package.json`: `"version": "1.0.0"` -> `"1.1.0"`.
- Regenerate: `node scripts/generators/gen-manifest.mjs . --write --target=all` then `node scripts/generators/gen-index.mjs . --write`. This updates `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `manifest.generated.json`, `INDEX.md`. Re-run both to confirm idempotence (no diff).

### 10. gold-checks.md rows + the wording sweep

- `docs/reference/gold-checks.md`: change `G1-G7` -> `G1-G10` in the frontmatter `description`, the H1 lead, and any inline reference; add the `G8`, `G9`, `G10` rows per SPEC.
- Stale-count sweep (R-G7FIX-2): grep for present-tense `25 checks` / `26 checks` / `G1-G6` / `G1-G7` across `README.md`, `AGENTS.md`, `docs/internal/STATUS.md`, `docs/**`, badges; correct each present-tense claim to `30 checks` / `G1-G10`. Leave version-history notes and ADR text that describe a prior version unchanged (they are historical).

### 11. CHANGELOG + RELEASE-NOTES

- `CHANGELOG.md`: `## [Unreleased]` -> `## [1.1.0] - 2026-06-03`; add the build-out bullets; add a fresh empty `## [Unreleased]` scaffold above; add the `[1.1.0]` compare link at the bottom of the link list.
- `RELEASE-NOTES.md`: add the user-facing 1.1.0 section per SPEC.

### 12. Confirm only-intended files

`git diff --name-only` should show: `scripts/checks/docs-presence.mjs`, `scripts/lib/registry.mjs`, `tests/unit/docs-presence.test.mjs`, the four/seven fixture trees, `tests/unit/registry-sync.test.mjs` (if the uniqueness/count assertion landed there), `STANDARD.md`, `library.json`, `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `manifest.generated.json`, `INDEX.md`, `docs/reference/gold-checks.md`, `README.md`, `AGENTS.md`, `docs/internal/STATUS.md`, `CHANGELOG.md`, `RELEASE-NOTES.md`, and any doc the count-sweep touched.

## Verification

Run, expecting the stated results:

- `node scripts/check.mjs` -> `Tier: Advanced (no blockers detected)`, 0 errors / 0 warnings. The spine is now 30 checks.
- `node scripts/tier-report.mjs --json` -> `"tier":"advanced"`, `"blocked":{}`.
- `npm test` -> all green, including the five `docs-presence` cases, `registry-sync`, the reqId-uniqueness assertion, and the spine-count expectation (`30`).
- `node scripts/generators/gen-manifest.mjs . --write --target=all` then `node scripts/generators/gen-index.mjs . --write` -> re-run produces no diff (idempotent; drift-clean).
- `(cd site && npm run build)` -> builds; then run the two `site/scripts/` 14.11 guards on `dist` (rendered-links + route-parity) -> pass.
- A grep over tracked human docs for `25 checks` / `26 checks` / `G1-G6` / `G1-G7` (present-tense) -> no stale match.
- A grep over the diff for U+2014 / U+2013 -> none (the PreToolUse hook + `U10` enforce it).

## Adversarial review

Run a local multi-agent read-only review before merge (the Codex CLI is unreliable on this Windows setup, so do **not** rely on `/codex:review`; spawn an own multi-agent verification instead). Lenses to run:

- **`G10` soundness:** does the check actually bite each anti fixture for the right reason? Does it false-pass a `.gitkeep`-only dir, a TL;DR inside a code fence, or a `#fragment`-only link? Does the link resolver normalize relative vs absolute-from-root targets the same way?
- **`overview xor detailed` branch:** confirm the single-marker case is handled (presence finding), not silently passed.
- **Version completeness:** all five version-bearing files read `1.1.0`; the `release.yml` guard would fail on a mismatch (does it actually?).
- **Generated-file drift:** `gen-manifest`/`gen-index` idempotent; no hand-edit to a generated file.
- **STANDARD.md coherence:** sec 2.6 spine line, sec 4.2, sec 8.4, and the history note all agree on `30` / `G1-G10`; the inclusion statement is unnumbered.
- **Stale-count completeness:** no present-tense `26`/`G1-G7` survives; no legitimate historical reference was over-corrected.
- **No-dash sweep:** the whole diff is dash-clean.
- **`RELEASE-NOTES` vs `CHANGELOG` distinctness** (`G5`): the notes are user-facing highlights, not a raw changelog.

Fix every confirmed finding; re-gate.

## The PR

- **Title (Conventional Commit):** `feat(checks): add docs-presence (G10), complete STANDARD v0.10 (U12+G7-G10), bump to 1.1.0`
- **Body outline:**
  - What: the `docs-presence` Gold check (three facts), the `STANDARD.md` v0.10 completion (`U12` + `G8-G10` normative, spine `26 -> 30`), the `G7`-inclusion renumber close-out, the version bump `1.0.0 -> 1.1.0` + regeneration, the `gold-checks.md` `G8-G10` rows, the stale-count correction, the CHANGELOG/RELEASE-NOTES.
  - Why: closes the ADR 0024 build-out (D4/D6); makes the 30-check spine real and self-proving.
  - Verification: gate Advanced 0/0 at the 30-check spine; `npm test` green (incl. the new cases + reqId-uniqueness + spine-count); site builds; 14.11 guards pass; grep finds no stale count; dash-clean.
  - Author-before-enforce note: `G10`'s artifacts (Diataxis content, arch link, ADR TL;DRs) were authored in P1 and are already on `main`; this PR ships green on its own dogfood.
  - Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
  - Follow-up note: after merge, the maintainer-gated release (tag `v1.1.0` -> fill sha -> marketplace re-pin PR -> install smoke -> STATUS update) per SPEC "The release + marketplace re-pin steps".

## Rollback / risk notes

- **Pre-tag, nothing is released.** If `G10` proves unsound at the adversarial gate or after merge, revert the P6 PR; because P6 is the only phase that bumps the Standard and the version, a P6 revert never strands the Standard at a partial state (it returns to the v0.10 / 26-check / `G1-G7` way-station P2a left, which is itself a coherent release point).
- **Post-tag, fix forward.** Tags are immutable; a defect found after `v1.1.0` is tagged is fixed with `v1.1.1`, not a re-tag.
- **The marketplace re-pin is a one-line sha+version update** and is reversible by reverting the registry PR before the install smoke; it is maintainer-gated and forced-order (merge -> tag -> fill sha -> registry PR) so nothing false lands publicly before it is true (the v1.0.0 launch boundary).
- **Concurrency:** P6 runs after P0-P5 are merged; it does not share the tree with a concurrent phase agent. Use a git worktree for the `agent-plugins` registry PR to avoid the shared-worktree branch-switch hazard noted in prior sessions.
