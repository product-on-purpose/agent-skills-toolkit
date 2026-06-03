import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/source-doc.mjs";

// Proves the G9 source-doc check (scripts/checks/source-doc.mjs): a source file with all four header
// fields passes (lowercase labeled, .py hash-comment, and @what JSDoc-tag styles all recognized); a file
// missing a field fails naming the file and the field; a file under tests/fixtures/ is skipped; a plugin
// with no in-scope source passes vacuously; a non-comment code line cannot spuriously satisfy a field.

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const ok = path.join(FIXTURES, "golden/source-doc-ok");
const bad = path.join(FIXTURES, "anti/source-doc-missing-why");
const noSrc = path.join(FIXTURES, "golden/minimal-skill"); // no scripts/ tree

test("source files with all four docblock fields pass G9 (lowercase, .py, and @tag styles)", () => {
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("a source file missing the why field fails G9 naming the file and the field", () => {
  const f = check(loadPlugin(bad));
  assert.ok(f.some((x) => /why/.test(x.message)), "flags the missing why field");
  assert.ok(f.some((x) => /scripts[\\/]sample\.mjs/.test(x.file)), "names the offending file");
  assert.ok(f.length > 0 && f.every((x) => x.reqId === "G9" && x.severity === "error"));
});

test("a .mjs under tests/fixtures/ inside a scope root is ignored", () => {
  // golden fixture plants scripts/tests/fixtures/ignored.mjs (no docblock); SKIP_PATHS must skip it.
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("a plugin with no in-scope source passes G9 vacuously", () => {
  assert.equal(check(loadPlugin(noSrc)).length, 0);
});

test("the uppercase WHAT IT IS style is recognized", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "g9-upper-"));
  try {
    mkdirSync(path.join(dir, "scripts"), { recursive: true });
    writeFileSync(
      path.join(dir, "scripts", "a.mjs"),
      "// WHAT IT IS:   a module\n// WHAT IT DOES: uses the uppercase labeled style\n// WHY:          it proves the recognizer is case- and separator-insensitive\n// WHAT USES IT:  this test\nexport const a = 1;\n",
    );
    assert.equal(check({ root: dir }).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a non-comment code line does not spuriously satisfy a field", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "g9-code-"));
  try {
    mkdirSync(path.join(dir, "scripts"), { recursive: true });
    // The object literal has `why: 1` but it is not a comment, so the why field is still missing.
    writeFileSync(
      path.join(dir, "scripts", "a.mjs"),
      "// what-it-is:   a module\n// what-it-does: has why only inside a code object, not a comment\n// used-by:      this test\nexport const o = { why: 1 };\n",
    );
    assert.ok(check({ root: dir }).some((x) => /why/.test(x.message)), "a code `why:` must not satisfy the field");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
