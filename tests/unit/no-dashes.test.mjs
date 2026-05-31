import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check, meta } from "../../scripts/checks/no-dashes.mjs";

// Built from a code point so this test file itself contains no literal forbidden char
// (the gate scans .mjs, including this file).
const EM = String.fromCharCode(0x2014);

test("meta declares U10 universal", () => {
  assert.equal(meta.reqId, "U10");
  assert.equal(meta.tier, "universal");
});

test("clean tree (plain hyphens) - no error", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nodash-clean-"));
  try {
    writeFileSync(path.join(dir, "a.md"), "# Title\n\nA plain hyphen - is fine.\n");
    const r = check({ root: dir });
    assert.equal(r.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("em-dash in a .md is a U10 error naming the file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nodash-em-"));
  try {
    writeFileSync(path.join(dir, "bad.md"), "# Title\n\nThis has an " + EM + " em dash.\n");
    const r = check({ root: dir });
    const err = r.find((f) => f.severity === "error");
    assert.ok(err);
    assert.equal(err.reqId, "U10");
    assert.equal(err.file, "bad.md");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skips node_modules and _local scratch", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nodash-skip-"));
  try {
    mkdirSync(path.join(dir, "node_modules"));
    writeFileSync(path.join(dir, "node_modules", "x.md"), "bad " + EM + " here");
    mkdirSync(path.join(dir, "_local"));
    writeFileSync(path.join(dir, "_local", "y.md"), "bad " + EM + " here");
    const r = check({ root: dir });
    assert.equal(r.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
