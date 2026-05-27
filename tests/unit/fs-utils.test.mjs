import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readJsonSafe, fileExists, listSkillDirs } from "../../scripts/lib/fs-utils.mjs";

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
  assert.match(r.parseError, /.+/);
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
