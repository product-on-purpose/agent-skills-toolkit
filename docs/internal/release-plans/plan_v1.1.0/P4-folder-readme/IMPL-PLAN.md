# P4 - folder-READMEs + folder-readme (G8) - implementation plan

> Per-phase cadence (from the packet [`IMPL-PLAN.md`](../IMPL-PLAN.md)): branch from current `main` (`phase-4-folder-readme`); author the conforming artifacts first; run `gen-manifest`/`gen-index --write` for any generated file that moves; `node scripts/check.mjs` (0/0) + `npm test` (all green) + `(cd site && npm run build)` + the two `site/scripts/` 14.11 guards where the site is touched; `git diff --name-only` to confirm only intended files; commit (Conventional Commit + `Co-Authored-By: Claude Opus 4.8` trailer), push, PR; run an adversarial gate before merging the check change; admin-squash merge; confirm `main` green. Use the date **2026-06-03** wherever a date is needed.

## Author-before-enforce micro-order

The strict ordering inside P4 (R-SEQ-1: no check is enforced before its artifacts exist):

1. **Author every folder README** in the allowlist (the gate stays green because `folder-readme` does not exist yet).
2. **Add the `folder-readme` mode** to `askit-build-docs` (documentation of the authoring path; no enforcement).
3. **Add the check module + fixtures + tests**, then **register it** in `scripts/lib/registry.mjs` (it ships green on its own dogfood because step 1 already authored the conforming READMEs).
4. Regenerate `INDEX.md` / manifests if anything moved; run the full verification; adversarial gate; squash-merge.

If the README diff is large enough to make review hard, split into **P4a** (steps 1-2: all READMEs + the mode, gate green, no new check) and **P4b** (step 3: add + register the check, green on the dogfood). Each half is its own individually-green PR. Default is a single P4 PR.

## Steps

### Step 1 - author the folder READMEs

Re-list each folder at author time (`fs.readdirSync` or `git ls-files <folder>`) and write a `README.md` whose inventory matches. Create/edit, with exact paths:

**Fixed roots:**
- Edit `README.md` (repo root) - coordinate with the P3 hero rewrite; ensure frontmatter `title` + an `## Inventory` (or equivalent) section listing the top-level children. If P3 has already merged, edit in place; if P4 precedes P3, add the section and tell P3 to preserve it.
- Create `scripts/README.md`
- Create `scripts/checks/README.md` (inventory MUST include `folder-readme.mjs` added in step 3 - author it now so the inventory is correct at flip time)
- Create `scripts/generators/README.md`
- Create `scripts/lib/README.md`
- Create `agents/README.md`
- Create `templates/README.md`
- Verify/refresh `templates/seed-plugin/README.md` (exists) - add frontmatter `title` + inventory if missing
- Create `evals/README.md`
- Create `.github/workflows/README.md`
- Create `site/scripts/README.md`

**`skills/*` (create where missing, verify/refresh the two that exist):**
- Create `skills/<name>/README.md` for each of the 22 skill dirs that lack one: `askit-backlog`, `askit-build-agents-md`, `askit-build-chain-contract`, `askit-build-command`, `askit-build-docs`, `askit-build-hook`, `askit-build-mcp`, `askit-build-output-style`, `askit-build-samples`, `askit-build-settings`, `askit-build-statusline`, `askit-build-subagent`, `askit-build-workflow`, `askit-capability-advisor`, `askit-decision`, `askit-deprecate`, `askit-init-marketplace`, `askit-init-plugin`, `askit-migrate`, `askit-release`, `askit-template-manager`.
- Verify/refresh `skills/askit-build-skill/README.md` and `skills/askit-evaluate/README.md` - these are human overviews and likely lack a frontmatter `title` and an explicit inventory; bring them into conformance (add `---\ntitle: ...\n---` and an `## Inventory` listing `SKILL.md`, `references/`, `README.md`-excluded).

**`docs/*` quadrants (also `G7` pages - full D3 taxonomy):**
- Create `docs/tutorials/README.md`, `docs/how-to/README.md`, `docs/reference/README.md`, `docs/explanation/README.md`, each with `title`, `description` (no `": "`), `audience`, `level`, optional `tags`, plus an inventory listing the quadrant's pages.

**Verify only (already conformant from P0):** `hooks/README.md`.

Each README's body shape (outside `docs/`):

```
---
title: <folder path> - <short label>
---

# <folder>

<one-to-two-sentence purpose>

## Inventory

- `child-a` - what it is.
- `child-b` - what it is.
- `subdir/` - what it is.
```

Inside `docs/` quadrants, prepend the full taxonomy:

```
---
title: <quadrant> docs
description: <action-verb + use-when, no colon-space>
audience: both
level: beginner
---
```

### Step 2 - add the `folder-readme` mode

Edit `skills/askit-build-docs/SKILL.md`:
- Add `folder-readme` to the `description` mode list and to the Diataxis mode enumeration in `## Purpose`.
- Add a `## folder-readme mode` section per this packet's SPEC ("The folder-readme mode"): read the directory listing, drop `INVENTORY_SKIP` + `README.md`, scaffold or refresh the inventory to the current children (preserving existing per-child descriptions and the purpose paragraph), emit a README that passes `G8`.

### Step 3 - the check module

Create `scripts/checks/folder-readme.mjs`. Skeleton (the executor fills the regexes and tightens the listed-set extraction):

```js
// what-it-is:   the G8 folder-readme Gold check
// what-it-does: asserts every meaningful folder has a README with a title and an inventory matching its children
// why:          folder docs that silently rot are the failure ADR 0024 D1 closes; the inventory match is the anti-rot guard
// used-by:      scripts/lib/registry.mjs (the CHECKS array), via scripts/check.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { parseFrontmatter } from "../lib/frontmatter.mjs";

export const meta = { id: "folder-readme", tier: "advanced", reqId: "G8" };

const INVENTORY_SKIP = new Set([
  "README.md", "node_modules", "dist", ".astro",
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".gitkeep",
]);

// Allowlisted fixed roots, relative to the plugin root. Checked only if they exist.
const FIXED_ROOTS = [
  ".", "scripts", "scripts/checks", "scripts/generators", "scripts/lib",
  "agents", "templates", "templates/seed-plugin", "evals",
  ".github/workflows", "site/scripts", "hooks",
];

// Each parent expands to its existing immediate subdirectories (minus excludes).
const GLOB_ROOTS = [
  { parent: "skills", exclude: [] },
  { parent: "docs", exclude: ["internal"] },
];

function isDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }

function resolveFolders(root) {
  const out = [];
  for (const rel of FIXED_ROOTS) {
    const abs = rel === "." ? root : path.join(root, rel);
    if (isDir(abs)) out.push(abs);
  }
  for (const { parent, exclude } of GLOB_ROOTS) {
    const parentAbs = path.join(root, parent);
    if (!isDir(parentAbs)) continue;
    for (const name of readdirSync(parentAbs)) {
      if (exclude.includes(name)) continue;
      const abs = path.join(parentAbs, name);
      if (isDir(abs)) out.push(abs);
    }
  }
  return out;
}

// Names the README references: backticked tokens and link basenames.
function listedChildren(text) {
  const names = new Set();
  for (const m of text.matchAll(/`([^`]+)`/g)) names.add(m[1].replace(/\/$/, ""));
  for (const m of text.matchAll(/\]\(([^)]+)\)/g)) {
    const base = path.basename(m[1].split("#")[0].replace(/\/$/, ""));
    if (base) names.add(base);
  }
  return names;
}

export function check(ctx) {
  const root = ctx.root;
  if (!root) return [];
  const out = [];
  for (const folder of resolveFolders(root)) {
    const readmePath = path.join(folder, "README.md");
    const relReadme = relPath(root, readmePath);
    if (!existsSync(readmePath)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `meaningful folder has no README.md (ADR 0024 D1.1); scaffold one with askit-build-docs folder-readme.`, { file: relReadme, reqId: meta.reqId }));
      continue;
    }
    let text;
    try { text = readFileSync(readmePath, "utf8"); } catch { continue; }
    const { frontmatter } = parseFrontmatter(text);
    if (!frontmatter || typeof frontmatter.title !== "string" || frontmatter.title.trim() === "") {
      out.push(finding(meta.id, SEVERITY.ERROR, `folder README must carry a frontmatter "title" (ADR 0024 D1.1).`, { file: relReadme, reqId: meta.reqId }));
    }
    const onDisk = new Set(readdirSync(folder).filter((n) => !INVENTORY_SKIP.has(n)));
    const listed = listedChildren(text);
    for (const name of onDisk) {
      if (!listed.has(name)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `child "${name}" exists on disk but is not in the README inventory (under-listed); add it or refresh with askit-build-docs folder-readme.`, { file: relReadme, reqId: meta.reqId }));
      }
    }
    for (const name of listed) {
      // Only count phantoms that look like a child name (skip prose backticks that are not children).
      if (!onDisk.has(name) && !INVENTORY_SKIP.has(name) && existsSync(path.join(folder, name)) === false && /^[\w.-]+\/?$/.test(name)) {
        // A listed token that is not on disk AND is a plausible filename is a phantom.
        // NB: tighten this so generic backticked prose tokens do not false-positive (see review note).
      }
    }
    return out; // (placeholder return position; real code accumulates across folders, see note)
  }
  return out;
}
```

**Implementation notes the executor MUST resolve (do not ship the skeleton verbatim):**
- The `return out;` inside the loop above is a placeholder; the real code accumulates findings across **all** folders and returns once at the end.
- **Phantom detection is the soundness-critical part.** A naive "every backticked token not on disk is a phantom" will false-positive on prose backticks (a README may reference `node:fs` or another folder's file). Constrain the phantom set to tokens that appear under an explicit inventory section (e.g. lines after an `## Inventory` heading, or list-item backticks `- \`name\``) AND look like a sibling filename. The SPEC's "listed" definition is the union of backticked names and link basenames; for **phantom** reporting, prefer the stricter inventory-section scope to avoid false fails. Capture the exact rule in the module header and a test.
- Match by child **name** (basename), not full path; strip a trailing slash so `` `checks/` `` matches the `checks` subdir.

### Step 4 - fixtures

Create four fixture plugin roots (each needs a minimal `library.json` so `loadPlugin` resolves `ctx.root`; mirror `tests/fixtures/golden/docs-frontmatter-ok/library.json` with `"standard": "0.10", "tier": "advanced"`). The check reads `ctx.root` and walks from there, so a fixture only needs the folders under test (e.g. a `scripts/lib/` with a README), not the whole allowlist.

- `tests/fixtures/golden/folder-readme-ok/` - a fixture root containing one allowlisted folder (e.g. `scripts/lib/`) with a `README.md` (frontmatter `title` + an inventory matching the folder's files) and the listed files present. 0 findings.
- `tests/fixtures/anti/folder-readme-missing-child/` - same shape but the folder has a child file **not** in the inventory (under-listed). Fails.
- `tests/fixtures/anti/folder-readme-phantom/` - the inventory lists a child that is **not** on disk (phantom). Fails.
- `tests/fixtures/anti/folder-readme-no-title/` - the README lacks a frontmatter `title`. Fails.
- Add a `tests/fixtures/<...>/tests/fixtures/ignored/` subtree (or rely on the check never selecting `tests/fixtures` as a root) and assert it is ignored - the cleanest proof is a test that constructs a ctx whose root has a `tests/fixtures/<x>/` folder with no README and shows 0 findings for it (because `tests/fixtures` is neither a fixed nor a glob root).

### Step 5 - the unit test

Create `tests/unit/folder-readme.test.mjs`, mirroring `tests/unit/docs-frontmatter.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/folder-readme.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const ok = path.join(FIXTURES, "golden/folder-readme-ok");
const missing = path.join(FIXTURES, "anti/folder-readme-missing-child");
const phantom = path.join(FIXTURES, "anti/folder-readme-phantom");
const noTitle = path.join(FIXTURES, "anti/folder-readme-no-title");
const noFolders = path.join(FIXTURES, "golden/minimal-skill"); // no allowlisted folders

test("a folder with a matching inventory passes G8", () => {
  assert.equal(check(loadPlugin(ok)).length, 0);
});
test("a child on disk missing from the inventory fails G8 (under-listed)", () => {
  const f = check(loadPlugin(missing));
  assert.ok(f.some((x) => /under-listed/.test(x.message)));
  assert.ok(f.every((x) => x.reqId === "G8" && x.severity === "error"));
});
test("an inventory child not on disk fails G8 (phantom)", () => {
  assert.ok(check(loadPlugin(phantom)).some((x) => /phantom/.test(x.message)));
});
test("a folder README without a title fails G8", () => {
  assert.ok(check(loadPlugin(noTitle)).some((x) => /title/.test(x.message)));
});
test("a plugin with no allowlisted folders passes G8 vacuously", () => {
  assert.equal(check(loadPlugin(noFolders)).length, 0);
});
```

(Use whichever existing no-folder golden fixture is the minimal one; the `docs-frontmatter` test uses `golden/minimal-skill` - reuse it if it has no `scripts/`/`skills/`/`docs/`/etc.)

### Step 6 - register the check

Edit `scripts/lib/registry.mjs`: add the import alongside the others and append the module to the `CHECKS` array (advanced group, next to `docsFrontmatter`):

```js
import * as folderReadme from "../checks/folder-readme.mjs";
```
and in `CHECKS`, extend the last line:
```js
  hookDocumentation, selfHosting, releaseNotes, indexDrift, docsFrontmatter, folderReadme,
```

### Step 7 - generated-file + count sweeps

- Run `node scripts/generators/gen-index.mjs . --write` and `node scripts/generators/gen-manifest.mjs . --write --target=all`; commit any change to `INDEX.md` / `manifest.generated.json` / native manifests (a new check or README may move generated counts).
- **Do not** touch the "25-check / G1-G7" -> "30-check / G1-G10" wording or the `STANDARD.md` spine list - that is P6's sweep. If a test asserts an exact registered-check count, P4 increments it by one (folder-readme) only if such a test exists and would otherwise fail; confirm with `npm test` and update the minimal count assertion, leaving the human-doc wording to P6.
- Re-run the directory listings and reconcile every README inventory you authored against the final tree (after fixtures and the new check file land, `scripts/checks/` gained `folder-readme.mjs`, so `scripts/checks/README.md` must list it).

## Verification

Run from the repo root (the executor runs these; this packet does not):

1. `node scripts/check.mjs` -> expect **Advanced, 0 errors, 0 warnings**, with `folder-readme` listed among the checks.
2. `node scripts/tier-report.mjs` -> expect advanced, empty burndown (no `G8` item).
3. `npm test` -> expect all green, including `tests/unit/folder-readme.test.mjs` and `registry-sync`.
4. `(cd site && npm run build)` -> expect a clean build (the new `docs/` quadrant READMEs are emitted).
5. `node site/scripts/check-rendered-links.mjs` + `node site/scripts/check-route-parity.mjs` + `node site/scripts/check-generated-untracked.mjs` -> expect all green; update `site/scripts/route-manifest.txt` first if a quadrant README publishes a new route.
6. Local probe (prove `G8` bites): temporarily add a stray file to `scripts/lib/` without updating its README and re-run `node scripts/check.mjs` -> expect an under-listed `G8` error; remove the stray file.
7. `git diff --name-only` -> expect only the authored READMEs, `skills/askit-build-docs/SKILL.md`, `scripts/checks/folder-readme.mjs`, `scripts/lib/registry.mjs`, the four fixtures, `tests/unit/folder-readme.test.mjs`, and any regenerated `INDEX.md`/manifest. Confirm `site/src/content/docs/**` is untracked.

## Adversarial review

Per R-SEQ-2, run an adversarial gate before merging the check change. The Codex CLI is unreliable on this Windows setup, so use an **own multi-agent read-only review** (dispatch 2-3 read-only subagents, no writes), with these lenses:

- **Soundness / false-pass:** can a folder README pass `G8` while its inventory is actually wrong? Probe the phantom-detection rule hardest (prose backticks vs inventory items); confirm under-listed and phantom both bite; confirm an empty-but-titled inventory in an empty folder is a true pass, not a hidden false pass.
- **Over-reach / false-fail:** does the check ever flag `tests/fixtures/**`, `node_modules`, `dist`, `.astro`, `site/node_modules`, or a lockfile? Does a backticked `node:fs` in prose cause a phantom false-fail? Confirm an allowlisted-but-absent folder is skipped, not flagged.
- **Determinism / no-model / sync:** the module is synchronous, returns an array, no network, no LLM, no new dependency (`registry-sync` covers the array/sync property; the reviewer confirms no `await`/Promise and no new `package.json` dep).
- **Reuse boundary:** confirm `folder-readme.mjs` does **not** reuse `index-drift`/`manifest-drift` and computes a genuine set difference.
- **House rules:** no em-dash/en-dash anywhere in the new READMEs, fixtures, mode prose, or code (the P0 hook + `U10` + this lens); the date is 2026-06-03; no invented shas/PR numbers.

Fix every confirmed finding before merge; record the review (the Phase-5 discipline).

## The PR

- **Title:** `docs(P4): folder READMEs in every meaningful folder + folder-readme (G8) check`
- **Body outline:**
  - Summary: authors a conforming `README.md` in every meaningful folder per ADR 0024 D1, adds the `askit-build-docs folder-readme` mode, and turns on `folder-readme` (`G8`).
  - Realizes: R-CONV-1, R-CONV-2, R-CONV-4, R-CHECK-G8 (CHECKS-SPEC "G8 - folder-readme").
  - Author-before-enforce: READMEs authored first; check registered green on the toolkit's own dogfood.
  - What `G8` asserts: README present, frontmatter `title`, inventory set-equals the actual immediate children; reports under-listed + phantom; vacuous on a folder-less plugin; fixtures excluded.
  - Verification block: gate Advanced 0/0; `npm test` green; site build + 14.11 guards green; anti fixtures bite.
  - Adversarial gate: link/record the multi-agent review.
  - Spec decisions confirmed (the four flagged in this packet's SPEC: `docs/` root README, `.gitkeep` handling, `skills/` not checked, seed-plugin README role).
  - Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Rollback / risk notes

- P4 is a single independent PR against protected `main`; if `G8` proves unsound, revert the phase PR. Pre-tag nothing is released, so a revert never strands the Standard (the Standard line does not advance until P6).
- The READMEs are pure additions/edits with no runtime effect; reverting them is safe. The only behavior change is the new gate check; reverting the `registry.mjs` line disables `G8` without touching the READMEs (so a fast "disable the check, keep the docs" rollback is the single-line revert of the registry registration).
- If a later phase (P5) genuinely adds files to a folder, `G8` will (correctly) go red until that folder's README inventory is updated - this is the intended behavior, not a regression; the `folder-readme` mode refreshes the inventory in one step.
- If the phantom-detection rule is found too loose or too strict post-merge, tighten the regex in `folder-readme.mjs` and add a regression fixture; this is a contained, single-module fix-forward (`v1.1.1` if post-tag).
