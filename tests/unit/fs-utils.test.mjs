import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readJsonSafe, fileExists, listSkillDirs, walkFiles, SKIP_DIRS, normalizeArgPath } from "../../scripts/lib/fs-utils.mjs";

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

// --- normalizeArgPath: the CLI-argv path normalizer ---
//
// A backslash path handed to a CLI entry point was once silently read as a different directory (the
// gate graded an empty tree and printed a clean pass; see tests/unit/eval-run.test.mjs and
// docs/how-to/troubleshoot-the-gate.md). normalizeArgPath converts backslashes to forward slashes ONLY
// on Windows (sep === "\\"): on POSIX a backslash is a legal filename character, so an unconditional
// swap would silently resolve to the wrong path in the opposite direction - the same class of defect,
// facing the other way. Both branches are exercised here with an INJECTED separator, not the host's
// real path.sep, so the guard is verified on every CI platform rather than only on whichever OS
// happens to run the suite (a test that no-ops on the "wrong" platform is worse than no test).

test("normalizeArgPath converts a Windows backslash path to forward slashes when sep is \\\\", () => {
  assert.equal(normalizeArgPath("C:\\plugins\\my-lib", "\\"), "C:/plugins/my-lib");
});

test("normalizeArgPath leaves a forward-slash path unchanged when sep is \\\\", () => {
  assert.equal(normalizeArgPath("C:/plugins/my-lib", "\\"), "C:/plugins/my-lib");
});

test("normalizeArgPath fully converts a mixed-separator path when sep is \\\\", () => {
  assert.equal(normalizeArgPath("C:\\plugins/my-lib\\skills", "\\"), "C:/plugins/my-lib/skills");
});

test("normalizeArgPath leaves a relative '.' default unchanged on both platforms", () => {
  assert.equal(normalizeArgPath(".", "\\"), ".");
  assert.equal(normalizeArgPath(".", "/"), ".");
});

test("normalizeArgPath returns '' for empty or undefined input on both platforms", () => {
  assert.equal(normalizeArgPath("", "\\"), "");
  assert.equal(normalizeArgPath(undefined, "\\"), "");
  assert.equal(normalizeArgPath("", "/"), "");
  assert.equal(normalizeArgPath(undefined, "/"), "");
});

test("normalizeArgPath does NOT trim, because surrounding spaces are part of a POSIX filename", () => {
  // Raised by adversarial review on the v1.10.1 release branch. An earlier draft trimmed, which is
  // wrong for the same reason unconditional backslash replacement is wrong: leading and trailing
  // spaces are legal in a POSIX filename, so "/srv/plugin " and "/srv/plugin" are two different
  // directories. Several callers of this function WRITE (gen-index, gen-manifest and sync-agents-md
  // in --write mode), so trimming would silently retarget a write at a sibling directory - a
  // strictly worse outcome than the read-the-wrong-tree defect the function exists to close.
  // The separator conversion is the ONLY transformation applied.
  assert.equal(normalizeArgPath("/srv/plugin ", "/"), "/srv/plugin ", "a trailing space is part of the name");
  assert.equal(normalizeArgPath(" /srv/plugin", "/"), " /srv/plugin", "a leading space is part of the name");
  assert.notEqual(normalizeArgPath("/srv/plugin ", "/"), "/srv/plugin", "the two must stay distinct paths");
  // On Windows the separator still converts, and the surrounding spaces are still preserved.
  assert.equal(normalizeArgPath(" C:\\plugins\\my-lib ", "\\"), " C:/plugins/my-lib ");
});

test("normalizeArgPath does NOT mangle a POSIX-legal backslash filename when sep is /", () => {
  // On Linux/macOS "my\\dir" is a real, distinct directory name. Unconditional replacement would
  // silently resolve to "my/dir" instead - a different path - which is the mirror-image of the
  // Windows defect this function exists to close.
  assert.equal(normalizeArgPath("my\\dir", "/"), "my\\dir");
  assert.equal(normalizeArgPath("/home/user/my\\backslash\\name", "/"), "/home/user/my\\backslash\\name");
});

test("normalizeArgPath defaults its separator to the live path.sep", () => {
  const input = "a\\b/c";
  assert.equal(normalizeArgPath(input), normalizeArgPath(input, path.sep));
});

// Existence-only invariant (mirrors the SKIP_DIRS invariant above): every CLI entry point that takes a
// filesystem path from argv must import the ONE shared normalizeArgPath rather than growing its own
// separator-handling copy. Presence-only by design - this repo deliberately does not automate
// completeness judgments (which argv sites got the call applied is left to code review / the report).
test("every CLI entry point with an argv path imports the shared normalizeArgPath, with no local redefinition", () => {
  const entryPoints = [
    "../../scripts/check.mjs",
    "../../scripts/evaluate.mjs",
    "../../scripts/tier-report.mjs",
    "../../scripts/standards-watch.mjs",
    "../../scripts/eval-run.mjs",
    "../../scripts/generators/gen-index.mjs",
    "../../scripts/generators/gen-manifest.mjs",
    "../../scripts/generators/sync-agents-md.mjs",
  ];
  for (const r of entryPoints) {
    const src = readFileSync(new URL(r, import.meta.url), "utf8");
    assert.match(src, /import \{[^}]*normalizeArgPath[^}]*\} from "\.+\/lib\/fs-utils\.mjs"/, `${r} must import the shared normalizeArgPath`);
    assert.doesNotMatch(src, /function normalizeArgPath\(/, `${r} must not redefine normalizeArgPath locally`);
  }
});
