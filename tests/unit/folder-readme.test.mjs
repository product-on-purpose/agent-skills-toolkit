import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/folder-readme.mjs";

// Proves the G8 folder-readme check (scripts/checks/folder-readme.mjs): a folder whose inventory set-
// equals its children passes; an under-listed child, a phantom (listed-not-on-disk), and a missing
// frontmatter title each fail; a plugin with no allowlisted folders passes vacuously; and prose
// backticks outside the inventory section do not cause a phantom false-fail.

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const ok = path.join(FIXTURES, "golden/folder-readme-ok");
const missing = path.join(FIXTURES, "anti/folder-readme-missing-child");
const phantom = path.join(FIXTURES, "anti/folder-readme-phantom");
const noTitle = path.join(FIXTURES, "anti/folder-readme-no-title");

test("a folder with a matching inventory passes G8", () => {
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("a child on disk missing from the inventory fails G8 (under-listed)", () => {
  const f = check(loadPlugin(missing));
  assert.ok(f.some((x) => /under-listed/.test(x.message)), "expected an under-listed finding");
  assert.ok(f.length > 0 && f.every((x) => x.reqId === "G8" && x.severity === "error"));
});

test("an inventory child not on disk fails G8 (phantom)", () => {
  assert.ok(check(loadPlugin(phantom)).some((x) => /phantom/.test(x.message)));
});

test("a folder README without a frontmatter title fails G8", () => {
  assert.ok(check(loadPlugin(noTitle)).some((x) => /title/.test(x.message)));
});

test("a plugin with no allowlisted folders passes G8 vacuously", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "g8-empty-"));
  try {
    writeFileSync(path.join(dir, "library.json"), '{ "name": "x", "version": "0.1.0" }\n');
    assert.equal(check({ root: dir }).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prose backticks outside the inventory section do not cause a phantom false-fail", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "g8-prose-"));
  try {
    mkdirSync(path.join(dir, "scripts", "lib"), { recursive: true });
    writeFileSync(path.join(dir, "scripts", "lib", "a.mjs"), "export const a = 1;\n");
    // README references `node:fs` and another `helper.mjs` in PROSE, but only lists a.mjs in the inventory.
    writeFileSync(
      path.join(dir, "scripts", "lib", "README.md"),
      '---\ntitle: "scripts/lib"\n---\n\n# scripts/lib\n\nUses `node:fs` and is paired with `helper.mjs` elsewhere.\n\n## Inventory\n\n- `a.mjs` - the only real child.\n',
    );
    // scripts/ also exists as a parent root and would need its own README; give it one too.
    writeFileSync(
      path.join(dir, "scripts", "README.md"),
      '---\ntitle: "scripts"\n---\n\n# scripts\n\nScripts.\n\n## Inventory\n\n- `lib/` - the lib folder.\n',
    );
    const f = check({ root: dir });
    assert.ok(!f.some((x) => /phantom/.test(x.message)), "prose backticks must not be phantoms");
    assert.equal(f.length, 0, `expected 0 findings, got: ${f.map((x) => x.message).join("; ")}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
