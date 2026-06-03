# P5 - source docblocks + source-doc (G9) - implementation plan

> Phase cadence: branch from `main`; author all docblocks first; add the check + fixtures + test; register `G9` last; run `gen-manifest`/`gen-index` if a generated file changes; gate + `npm test` + (site build where the link guards were touched) + the two 14.11 guards; adversarial gate; squash-merge; confirm `main` green. Keyed to this packet's [`SPEC.md`](./SPEC.md), the program [`CHECKS-SPEC.md`](../CHECKS-SPEC.md) sec "G9", and [ADR 0024](../../../decisions/0024-documentation-depth-and-discoverability.md) D1.2/D4. One PR vs protected `main`, individually green, adversarial gate before merge.

## Author-before-enforce micro-order (the exact ordering within the phase)

The check `G9` MUST NOT be registered until every in-scope docblock exists, or the gate goes red mid-phase. The order is:

1. **Author** the four-field docblock on every in-scope source file that lacks one (Step 2 below). Do NOT register the check yet.
2. **Run the gate without `G9`** (`node scripts/check.mjs`) and `npm test` to confirm the docblock edits broke nothing and the tree is still green at the current spine.
3. **Add** `scripts/checks/source-doc.mjs` (Step 3) and its fixtures + test (Steps 4-6) - but still do not register.
4. **Run the test in isolation** (`node --test tests/unit/source-doc.test.mjs`) to confirm the module is sound against fixtures before it touches the live gate.
5. **Register** `G9` in `scripts/lib/registry.mjs` (Step 7) - this is the flip.
6. **Re-run** the full gate + `npm test`: `G9` now runs over the real tree and MUST be green on its own dogfood (R-SEQ-1). If it flags a real file, that file is missing a docblock - author it (back to Step 1), never weaken the check.

## Steps

### Step 1 - branch and enumerate

- Branch from current `main`: `phase-5-source-docblock`.
- Enumerate the live in-scope set so the authoring list is exact (do this read-only; the SPEC enumeration is the target, this confirms it against `main` at execution time):
  - `git ls-files "scripts/**/*.mjs" "scripts/**/*.js" "scripts/**/*.py"`
  - `git ls-files "site/scripts/**/*.mjs" "site/scripts/**/*.js" "site/scripts/**/*.py"`
  - `git ls-files "hooks/*.mjs"`
- For each file, confirm presence/absence of a recognized docblock (grep the first lines for a field alias). The grounding state: all `scripts/**` files lack one; `site/scripts/gen-docs-site.mjs` and `check-generated-untracked.mjs` already have the uppercase form; `site/scripts/check-rendered-links.mjs` and `check-route-parity.mjs` have prose headers only; `hooks/no-dashes.mjs` already has the canonical form.

### Step 2 - author the docblocks (the artifacts, before the check)

For every in-scope file lacking a recognized four-field docblock, add the block immediately under any shebang and above the first `import`, using the canonical lowercase hyphen style:

```
// what-it-is:   <one line>
// what-it-does: <one line>
// why:          <one line>
// used-by:      <one line>
```

Concrete edits (paths are exact):
- `scripts/check.mjs`, `scripts/evaluate.mjs`, `scripts/tier-report.mjs` - the three entrypoints.
- Each file under `scripts/checks/*.mjs` (the ~26 check modules; `docs-frontmatter.mjs` from P2 is included if it lacks one - confirm at execution).
- `scripts/generators/gen-index.mjs`, `gen-manifest.mjs`, `sync-agents-md.mjs`.
- `scripts/lib/findings.mjs`, `frontmatter.mjs`, `fs-utils.mjs`, `load-plugin.mjs`, `registry.mjs`, `tier.mjs`.
- `site/scripts/check-rendered-links.mjs`, `site/scripts/check-route-parity.mjs` - add the four labeled lines under (or in place of) the existing prose header. Comment-only edit; do NOT change the 14.11 logic, the `BASE` constant, or any behavior.

Each docblock's `used-by` field SHOULD name the real call sites (for a check module: "registered in scripts/lib/registry.mjs; run by scripts/check.mjs; covered by tests/unit/<name>.test.mjs"). Write real content, not placeholders - the field values are non-load-bearing for `G9` (presence only) but are the actual deliverable for a human reader (R-CONV-3.3 says the check ignores quality; the maintainer's intent is real orientation prose).

Leave already-conformant files untouched: `site/scripts/gen-docs-site.mjs`, `site/scripts/check-generated-untracked.mjs`, `hooks/no-dashes.mjs`.

Run `node scripts/check.mjs` + `npm test` here - both MUST stay green (no check enforces docblocks yet; this proves the comment edits broke nothing, especially the two site link guards).

### Step 3 - the check module (skeleton inline)

Create `scripts/checks/source-doc.mjs`:

```js
// what-it-is:   the source-doc Gold check (G9).
// what-it-does: walks the in-scope source roots and asserts every hand-authored .mjs/.js/.py carries a four-field header docblock (what-it-is / what-it-does / why / used-by) in its first 30 lines.
// why:          ADR 0024 D1.2 documents source via folder-READMEs + header docblocks (not sibling .md files); this enforces the docblock half so the tree stays self-orienting without a rot surface.
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs; covered by tests/unit/source-doc.test.mjs.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "source-doc", tier: "advanced", reqId: "G9" };

const HEADER_LINES = 30;
const EXT = /\.(mjs|js|py)$/;

// Directories skipped by basename anywhere in the walk.
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", ".astro",
  "_LOCAL", "_local", "_agent-context", ".memsearch",
]);

// Path fragments (slash-normalized) skipped wherever they occur: intentional fixtures and generated output.
const SKIP_PATHS = ["tests/fixtures/", "site/src/content/docs/"];

// In-scope source roots, relative to the plugin root. Only these are walked.
const SCOPE_ROOTS = ["scripts", "site/scripts", "hooks", "agents", "templates", "evals", ".github/workflows"];

// The four logical fields and their recognized aliases (normalized: lowercased, separators collapsed) + JSDoc tags.
export const FIELDS = [
  { key: "what-it-is",   aliases: ["whatitis", "what"],           tag: "@what" },
  { key: "what-it-does", aliases: ["whatitdoes", "does"],         tag: "@does" },
  { key: "why",          aliases: ["why", "whyitmatters"],        tag: "@why" },
  { key: "used-by",      aliases: ["usedby", "whatusesit", "uses"], tag: "@usedby" },
];

function norm(label) {
  return label.toLowerCase().replace(/[-_\s]+/g, "");
}

function collect(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) collect(full, out);
    else if (EXT.test(name)) out.push(full);
  }
}

/** True if any header line satisfies this field (labeled-line OR JSDoc-tag form), with non-empty trailing text. */
function fieldPresent(field, headerLines) {
  for (const raw of headerLines) {
    // Strip a leading comment marker (//, #, *) and surrounding space.
    const line = raw.replace(/^\s*(\/\/|#|\*)?\s*/, "");
    // JSDoc-tag form: @what <text>
    const tagMatch = line.match(/^(@\w+)\s+(.+\S)\s*$/);
    if (tagMatch && tagMatch[1].toLowerCase() === field.tag) return true;
    // Labeled-line form: <label> : <text>
    const labMatch = line.match(/^([A-Za-z][A-Za-z\-_ ]*?)\s*:\s*(.+\S)\s*$/);
    if (labMatch) {
      const n = norm(labMatch[1]);
      if (n === norm(field.key) || field.aliases.includes(n)) return true;
    }
  }
  return false;
}

/**
 * G9 (Gold): every hand-authored .mjs/.js/.py under the in-scope source roots carries a header
 * docblock with the four fields (what-it-is / what-it-does / why / used-by) in its first
 * HEADER_LINES lines. Presence + the four keys only, never prose quality (Design Principle 3).
 * Conditional: a plugin with no in-scope source files passes vacuously. Advanced tier.
 */
export function check(ctx) {
  const root = ctx.root;
  if (!root || !existsSync(root)) return [];

  const files = [];
  for (const rel of SCOPE_ROOTS) {
    const dir = path.join(root, rel);
    if (existsSync(dir)) collect(dir, files);
  }

  const out = [];
  for (const f of files) {
    const rel = relPath(root, f);
    if (SKIP_PATHS.some((p) => rel.includes(p))) continue; // fixtures + generated output.

    let header;
    try {
      header = readFileSync(f, "utf8").split(/\r?\n/).slice(0, HEADER_LINES);
    } catch {
      continue;
    }

    const missing = FIELDS.filter((field) => !fieldPresent(field, header)).map((field) => field.key);
    if (missing.length) {
      out.push(finding(
        meta.id,
        SEVERITY.ERROR,
        `source file is missing the header docblock field(s): ${missing.join(", ")}. Every hand-authored source file MUST carry what-it-is / what-it-does / why / used-by in its first ${HEADER_LINES} lines (Standard sec 8.4 / ADR 0024 D1.2).`,
        { file: rel, reqId: meta.reqId }
      ));
    }
  }
  return out;
}
```

Notes on the skeleton (resolve during execution, do not ship blind):
- The `SCOPE_ROOTS` list includes `agents`, `templates`, `evals`, `.github/workflows`, `skills` is intentionally omitted here because those folders hold `.md` not source today; include a root only if it actually contains in-scope source on `main` (verify with `git ls-files`). Keeping the roots list explicit (vs walking the whole repo) is what bounds the check and keeps it from touching `tests/fixtures` even before the `SKIP_PATHS` guard.
- The check ITSELF carries a docblock (so it passes `G9` over itself).
- Verify `fieldPresent` against the two real uppercase docblocks in `site/scripts/` and the lowercase one in `hooks/` before flipping (Step 8), to confirm the recognizer is not over- or under-matching.

### Step 4 - golden fixture

Create `tests/fixtures/golden/source-doc-ok/`:
- `tests/fixtures/golden/source-doc-ok/library.json`:
  ```json
  { "name": "source-doc-ok", "version": "0.1.0", "description": "A fixture plugin whose source files carry the four-field docblock. Use it as the golden baseline for source-doc (G9).", "standard": "0.10", "tier": "advanced" }
  ```
- `tests/fixtures/golden/source-doc-ok/scripts/sample.mjs` - a `.mjs` with all four canonical labeled lines (see SPEC "Example pass").
- `tests/fixtures/golden/source-doc-ok/scripts/sample.py` - a `.py` with the four fields behind `#` comments (the `.py` path coverage).
- `tests/fixtures/golden/source-doc-ok/scripts/tagged.mjs` - a `.mjs` using the `@what`/`@does`/`@why`/`@usedby` JSDoc tag form (the JSDoc alias coverage).

Because the check walks `<root>/scripts`, loading this fixture as the plugin root makes `scripts/sample.mjs` etc. the in-scope files. The fixture has no `tests/fixtures/` of its own, so all three sample files are inspected and all pass.

### Step 5 - anti fixture

Create `tests/fixtures/anti/source-doc-missing-why/`:
- `library.json` (same shape, name `source-doc-missing-why`).
- `tests/fixtures/anti/source-doc-missing-why/scripts/sample.mjs` - exactly three fields (`what-it-is`, `what-it-does`, `used-by`), the `why` line deleted (see SPEC "Example fail"). The check MUST flag this file naming the missing `why`.

### Step 6 - the ignore-path proof (a fixture-under-fixtures case)

To prove the real check ignores `tests/fixtures/**`, the unit test runs the check against the actual repo root (or asserts via a constructed root) so a `.mjs` that lives under `tests/fixtures/` is NOT flagged. Concretely, add one undocumented `.mjs` inside the golden fixture under a `tests/fixtures/`-named subpath, e.g. `tests/fixtures/golden/source-doc-ok/tests/fixtures/ignored.mjs` (no docblock), and assert the check still returns zero findings for that fixture root - proving the `SKIP_PATHS` `tests/fixtures/` guard fires even nested inside a plugin. (Alternatively assert against the toolkit's own root that no `tests/fixtures/**` file is ever in a finding.)

### Step 7 - the unit test

Create `tests/unit/source-doc.test.mjs`, mirroring `tests/unit/docs-frontmatter.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/source-doc.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const ok = path.join(FIXTURES, "golden/source-doc-ok");
const bad = path.join(FIXTURES, "anti/source-doc-missing-why");
const noSrc = path.join(FIXTURES, "golden/minimal-skill"); // no scripts/ tree

test("source files with all four docblock fields pass G9", () => {
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("a .py with #-comment fields and a JSDoc-tag .mjs both pass (covered by the golden fixture)", () => {
  // golden fixture contains scripts/sample.py and scripts/tagged.mjs; zero findings proves both styles recognized.
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("a source file missing the why field fails G9 naming the file and the field", () => {
  const f = check(loadPlugin(bad));
  assert.ok(f.some((x) => /why/.test(x.message)), "flags the missing why field");
  assert.ok(f.some((x) => /scripts[\\/]sample\.mjs/.test(x.file)), "names the offending file");
  assert.ok(f.length > 0 && f.every((x) => x.reqId === "G9" && x.severity === "error"));
});

test("a .mjs under tests/fixtures/ is ignored", () => {
  // golden fixture plants tests/fixtures/ignored.mjs with no docblock; it must not be flagged.
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("a plugin with no in-scope source passes G9 vacuously", () => {
  assert.equal(check(loadPlugin(noSrc)).length, 0);
});
```

(Confirm `tests/fixtures/golden/minimal-skill` exists and has no `scripts/`; it is the same no-content fixture `docs-frontmatter.test.mjs` reuses for its vacuous case. If its name differs on `main`, point `noSrc` at whatever fixture has no in-scope source.)

### Step 8 - register the check (the flip)

In `scripts/lib/registry.mjs`:
- Add the import beside the other check imports:
  ```js
  import * as sourceDoc from "../checks/source-doc.mjs";
  ```
- Add `sourceDoc` to the `CHECKS` array (group it with the Gold docs-depth checks, after `docsFrontmatter`):
  ```js
  hookDocumentation, selfHosting, releaseNotes, indexDrift, docsFrontmatter, sourceDoc,
  ```

This is the author-before-enforce flip. After this line lands, re-run the gate (Step 9).

### Step 9 - regenerate + verify + sweep

- If the registry change alters a generated file, regenerate: `node scripts/generators/gen-manifest.mjs . --write --target=all` and `node scripts/generators/gen-index.mjs . --write`. (Adding a check is unlikely to change the component manifest or INDEX since `source-doc` is not a shipped component; regenerate to confirm a no-op, and commit only if something changed.)
- No count-of-checks wording is edited in P5 (the `25 -> 30` sweep is P6). Do NOT introduce a "27-check" or any interim count claim; leave count prose for P6 to finalize in one place.

## Verification

Run from the repo root (read the expected results):

- `node scripts/check.mjs`
  - Expect: `Advanced`, `0 errors / 0 warnings`. `source-doc` (`G9`) is active and passes over the real source tree (the dogfood).
- `npm test`
  - Expect: all green, including `tests/unit/source-doc.test.mjs` (5 tests) and the existing `registry-sync` and reqId-uniqueness assertions (no `G9` collision).
- `node --test tests/unit/source-doc.test.mjs` (focused)
  - Expect: golden passes, anti fails with the `why` finding, vacuous passes, fixture-ignore passes.
- If the two `site/scripts/` link guards were edited (comment-only): `(cd site && npm run build)` then `node site/scripts/check-rendered-links.mjs` and `node site/scripts/check-route-parity.mjs`
  - Expect: site builds; both 14.11 guards pass (behavior unchanged by the comment edits).
- `git diff --name-only`
  - Expect: only the docblock-edited source files, `scripts/checks/source-doc.mjs`, the registry import + array line, the two fixtures, the unit test, and (if non-empty) a regenerated manifest/INDEX. No unrelated file.
- Dash sweep: confirm no U+2014 / U+2013 in any new or edited file (the P0 hook denies any such write; this is the belt-and-suspenders check).

## Adversarial review

Before merging (this PR adds a check, so R-SEQ-2 mandates an adversarial gate):

- **Soundness lens.** Probe for false-pass: a docblock with three fields, a field present only below line 30, a label with an empty value (`// why:` and nothing after), a field key that appears in the file body but not the header. Each MUST fail. Probe for false-fail: the uppercase `WHAT IT IS:` style (the two site scripts), the `@what` JSDoc style, a `.py` `#` style, a field with extra inner spacing - each MUST pass.
- **Scope lens.** Confirm `tests/fixtures/**`, `node_modules`, `dist`, `.astro`, `site/node_modules`, `site/src/content/docs/**`, and `*.json`/`*.md` are never flagged. Confirm the walk does not escape `SCOPE_ROOTS` into the whole repo.
- **Determinism lens.** No async, no network, stable ordering of findings (the walk is `readdirSync` order; if a test asserts ordering, sort findings by `file` first).
- **Regression lens.** Confirm the comment-only edits to the two site link guards did not change their behavior (the 14.11 guards still pass; `BASE` and the route-manifest logic untouched).
- **Tooling note:** the Codex CLI is unreliable on this Windows setup (per project memory). Run the adversarial review as an OWN multi-agent read-only review (dispatch 2-3 read-only sub-agents over the diff with the lenses above), not via `/codex:review`.

## The PR

- **Title (Conventional Commit):** `feat(checks): add source-doc (G9) and the four-field source docblocks (ADR 0024 P5)`
- **Body outline:**
  - What: the four-field header docblock on every in-scope hand-authored source file; the Gold `source-doc` (`G9`) check; golden + anti fixtures; unit tests; the registry line.
  - Why: ADR 0024 D1.2 / R-CONV-3 / R-CHECK-G9 - document source via folder-READMEs + docblocks, no sibling `.md`; this lands the docblock half and its check.
  - Author-before-enforce: docblocks authored first, `G9` registered last, green on the toolkit's own dogfood (R-SEQ-1).
  - Scope note: presence-only check, never prose quality (Design Principle 3); `tests/fixtures/**`, generated output, lockfiles excluded.
  - Verification: gate Advanced 0/0; `npm test` green; anti fixture bites; `.py` + JSDoc-tag + ignore cases covered; 14.11 guards still pass after the comment-only site edits.
  - Spec decision flagged for the maintainer: the recognizer accepts both the canonical lowercase `what-it-is:` style and the uppercase `WHAT IT IS:` style already in the two site scripts (presence-not-format); confirm or request a single canonical style.
  - Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Rollback / risk notes

- P5 is an independent PR; if `G9` proves unsound, revert the phase PR. Pre-tag nothing is released, so a revert strands nothing (the Standard version only advances at P6).
- The docblock edits are additive comments; reverting them is clean and changes no runtime behavior.
- If the recognizer is found to over-match (a stray `something: text` line in a file body false-passing a field), tighten `fieldPresent` to require the line to be a comment (leading `//`/`#`/`*`) AND restrict to the header window - both already in the skeleton; the test suite is the guard.
- If a new in-scope source file is added in a later phase without a docblock, `G9` fails the gate on that PR - the convention is self-enforcing, which is the intended behavior, not a regression.
- Do NOT touch `library.json` version or `STANDARD.md` here; any version/Standard edit belongs to P6. A stray version bump in P5 would collide with P6's single bump.
