import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readJsonSafe, fileExists, listSkillDirs, walkFiles, SKIP_DIRS } from "../../scripts/lib/fs-utils.mjs";

function tmpRepo() {
  return mkdtempSync(path.join(tmpdir(), "ast-"));
}

test("readJsonSafe returns parsed data on valid JSON", () => {
  const dir = tmpRepo();
  const p = path.join(dir, "library.json");
  writeFileSync(p, JSON.stringify({ name: "x" }));
  assert.deepEqual(readJsonSafe(p), { data: { name: "x" }, parseError: null });
});

test("readJsonSafe returns parseError on bad JSON", () => {
  const dir = tmpRepo();
  const p = path.join(dir, "library.json");
  writeFileSync(p, "{ not json");
  const r = readJsonSafe(p);
  assert.equal(r.data, null);
  assert.match(r.parseError, /JSON|Unexpected|token|position/i);
});

test("readJsonSafe returns null data when file is missing", () => {
  const r = readJsonSafe(path.join(tmpRepo(), "nope.json"));
  assert.equal(r.data, null);
  assert.equal(r.parseError, null);
});

test("fileExists detects files", () => {
  const dir = tmpRepo();
  writeFileSync(path.join(dir, "AGENTS.md"), "hi");
  assert.equal(fileExists(path.join(dir, "AGENTS.md")), true);
  assert.equal(fileExists(path.join(dir, "MISSING.md")), false);
});

test("listSkillDirs returns dirs under skills/ that contain SKILL.md", () => {
  const dir = tmpRepo();
  mkdirSync(path.join(dir, "skills", "alpha"), { recursive: true });
  writeFileSync(path.join(dir, "skills", "alpha", "SKILL.md"), "x");
  mkdirSync(path.join(dir, "skills", "not-a-skill"), { recursive: true });
  const found = listSkillDirs(dir).map((d) => path.basename(d));
  assert.deepEqual(found, ["alpha"]);
});

test("listSkillDirs returns [] when skills/ is absent", () => {
  assert.deepEqual(listSkillDirs(tmpRepo()), []);
});

test("walkFiles returns all leaf files recursively", () => {
  const dir = tmpRepo();
  mkdirSync(path.join(dir, "a", "b"), { recursive: true });
  writeFileSync(path.join(dir, "top.txt"), "1");
  writeFileSync(path.join(dir, "a", "mid.txt"), "2");
  writeFileSync(path.join(dir, "a", "b", "leaf.txt"), "3");
  const names = walkFiles(dir).map((p) => path.basename(p)).sort();
  assert.deepEqual(names, ["leaf.txt", "mid.txt", "top.txt"]);
});

test("walkFiles returns [] for a missing dir", () => {
  assert.deepEqual(walkFiles(path.join(tmpRepo(), "nope")), []);
});

test("SKIP_DIRS covers the scratch dirs of both graded ecosystems, not just Node's", () => {
  // The set is graded against third-party plugins, so a category covered for one language but not
  // another produces findings that are the toolkit's fault rather than the plugin's.
  for (const d of ["node_modules", "dist", ".astro"]) {
    assert.ok(SKIP_DIRS.has(d), `expected Node scratch dir ${d} in SKIP_DIRS`);
  }
  for (const d of ["__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox", ".venv", "venv"]) {
    assert.ok(SKIP_DIRS.has(d), `expected Python scratch dir ${d} in SKIP_DIRS`);
  }
  for (const d of [".git", "_local", "_LOCAL", "_agent-context", ".memsearch"]) {
    assert.ok(SKIP_DIRS.has(d), `expected VCS/scratch dir ${d} in SKIP_DIRS`);
  }
});

test("every repo-wide content scanner shares one SKIP_DIRS, with no local redefinition", async () => {
  // A check that keeps its own copy silently stops matching the shared set the moment one is edited.
  const roots = ["../../scripts/checks/folder-readme.mjs", "../../scripts/checks/mermaid-valid.mjs", "../../scripts/checks/source-doc.mjs"];
  for (const r of roots) {
    const src = readFileSync(new URL(r, import.meta.url), "utf8");
    assert.match(src, /import \{[^}]*SKIP_DIRS[^}]*\} from "\.\.\/lib\/fs-utils\.mjs"/, `${r} must import the shared SKIP_DIRS`);
    assert.doesNotMatch(src, /^const SKIP_DIRS = new Set\(/m, `${r} must not redefine SKIP_DIRS locally`);
  }
});
