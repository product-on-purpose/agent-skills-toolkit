import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { verifyTagMatchesManifests, MANIFESTS } from "../../scripts/verify-tag-matches-manifests.mjs";

// The tag/manifest-agreement comparison, pulled out of publish-npm.yml's inline `run:` block into a
// portable script per Standard sec 4.4 ("the CI configuration MUST contain no validation logic of
// its own"). Same four manifests release.yml checks: package.json, library.json,
// .claude-plugin/plugin.json, .codex-plugin/plugin.json.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/verify-tag-matches-manifests.mjs");

function makeManifestDir(version) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-tag-manifests-"));
  mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  mkdirSync(path.join(dir, ".codex-plugin"), { recursive: true });
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ version }), "utf8");
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ version }), "utf8");
  writeFileSync(path.join(dir, ".claude-plugin/plugin.json"), JSON.stringify({ version }), "utf8");
  writeFileSync(path.join(dir, ".codex-plugin/plugin.json"), JSON.stringify({ version }), "utf8");
  return dir;
}

test("MANIFESTS lists exactly the four version-bearing manifests", () => {
  assert.deepEqual(MANIFESTS, [
    "package.json", "library.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json",
  ]);
});

test("all four manifests agreeing with the tag: every check ok", () => {
  const dir = makeManifestDir("1.11.0");
  const { stripped, checks } = verifyTagMatchesManifests("v1.11.0", dir);
  assert.equal(stripped, "1.11.0");
  assert.equal(checks.length, 4);
  assert.ok(checks.every((c) => c.ok));
});

test("a tag with no leading v is stripped the same way (already-bare version)", () => {
  const dir = makeManifestDir("1.11.0");
  const { stripped } = verifyTagMatchesManifests("1.11.0", dir);
  assert.equal(stripped, "1.11.0");
});

test("one disagreeing manifest is reported by name, others still checked and pass", () => {
  const dir = makeManifestDir("1.11.0");
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ version: "1.10.0" }), "utf8");
  const { checks } = verifyTagMatchesManifests("v1.11.0", dir);
  const lib = checks.find((c) => c.file === "library.json");
  assert.equal(lib.ok, false);
  assert.match(lib.detail, /version 1\.10\.0 does not match tag 1\.11\.0/);
  assert.ok(checks.filter((c) => c.file !== "library.json").every((c) => c.ok));
});

test("a missing manifest file fails closed, does not throw", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-tag-manifests-empty-"));
  const { checks } = verifyTagMatchesManifests("v1.0.0", dir);
  assert.ok(checks.every((c) => c.ok === false));
});

test("a manifest missing the version field fails closed", () => {
  const dir = makeManifestDir("1.11.0");
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x" }), "utf8");
  const { checks } = verifyTagMatchesManifests("v1.11.0", dir);
  const pkg = checks.find((c) => c.file === "package.json");
  assert.equal(pkg.ok, false);
  assert.match(pkg.detail, /no "version" field/);
});

test("unparseable JSON fails closed", () => {
  const dir = makeManifestDir("1.11.0");
  writeFileSync(path.join(dir, "package.json"), "{ not json", "utf8");
  const { checks } = verifyTagMatchesManifests("v1.11.0", dir);
  const pkg = checks.find((c) => c.file === "package.json");
  assert.equal(pkg.ok, false);
  assert.match(pkg.detail, /could not read\/parse/);
});

// --- CLI behavior ---

test("CLI: exits 0 and prints ok lines when everything agrees", () => {
  const dir = makeManifestDir("1.11.0");
  const r = spawnSync(process.execPath, [SCRIPT, "v1.11.0", dir], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ok: package\.json = 1\.11\.0/);
  assert.match(r.stdout, /OK \(all 4 manifests agree with tag 1\.11\.0\)/);
});

test("CLI: exits 1 and names the disagreeing manifest on mismatch", () => {
  const dir = makeManifestDir("1.11.0");
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ version: "1.10.0" }), "utf8");
  const r = spawnSync(process.execPath, [SCRIPT, "v1.11.0", dir], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /library\.json/);
  assert.match(r.stderr, /aborting before publishing anything/);
});

// The whole toolkit repo itself is a valid target: its own four manifests should always agree with
// its own library.json version (this is effectively what publish-npm.yml runs against a real tag).
test("the toolkit's own manifests self-agree", () => {
  const { version } = JSON.parse(readFileSync(path.join(ROOT, "library.json"), "utf8"));
  const r = spawnSync(process.execPath, [SCRIPT, `v${version}`, ROOT], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});
