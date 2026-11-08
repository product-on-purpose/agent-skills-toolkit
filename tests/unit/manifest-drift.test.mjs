import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../../scripts/checks/manifest-drift.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(ROOT, "tests/fixtures");

test("matching name/version - no finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: { name: "x", version: "0.1.0" } };
  assert.equal(check(ctx).length, 0);
});

test("version drift between library.json and plugin.json is an ERROR (the tag-guard invariant)", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.2.0" } }, claudeManifest: { name: "x", version: "0.1.0" } };
  const f = check(ctx)[0];
  assert.equal(f.severity, "error");
  assert.match(f.message, /version/);
});

test("name drift stays a WARN (cosmetic; not the tag-guard invariant)", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: { name: "y", version: "0.1.0" } };
  const f = check(ctx)[0];
  assert.equal(f.severity, "warn");
  assert.match(f.message, /name/);
});

test("no claudeManifest - no finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: null };
  assert.equal(check(ctx).length, 0);
});

test("codex manifest matching name/version - no finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: { name: "x", version: "0.1.0" }, codexManifest: { name: "x", version: "0.1.0" } };
  assert.equal(check(ctx).length, 0);
});

test("codex manifest version drift is an ERROR citing .codex-plugin", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.2.0" } }, codexManifest: { name: "x", version: "0.1.0" } };
  const f = check(ctx)[0];
  assert.equal(f.severity, "error");
  assert.equal(f.file, ".codex-plugin/plugin.json");
  assert.match(f.message, /version/);
});

test("no codex manifest - no codex finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: { name: "x", version: "0.1.0" }, codexManifest: null };
  assert.equal(check(ctx).length, 0);
});

// ADR 0043: askit-init-plugin's `interview` mode can add a real "author" object to a scaffolded
// plugin's library.json and .claude-plugin/plugin.json (so `claude plugin validate --strict`
// passes). check()'s loop over NATIVE only ever compares "name"/"version" fields, so the extra
// optional field must never produce a finding, whether it agrees, differs, or is on only one side.
test("an author field present on both sides is not compared - no finding (U8 only checks name/version)", () => {
  const ctx = {
    root: ".",
    library: { data: { name: "x", version: "0.1.0", author: { name: "Jane Maintainer" } } },
    claudeManifest: { name: "x", version: "0.1.0", author: { name: "Jane Maintainer" } },
  };
  assert.deepEqual(check(ctx), []);
});

test("an author field present on only one side is still not compared - no finding", () => {
  const ctx = {
    root: ".",
    library: { data: { name: "x", version: "0.1.0" } },
    claudeManifest: { name: "x", version: "0.1.0", author: { name: "Jane Maintainer" } },
  };
  assert.deepEqual(check(ctx), []);
});

// A present-but-invalid native manifest used to vanish in the loader: readJsonSafe returned
// { data: null, parseError }, the loader kept only .data, and U8 skipped the null as "no manifest".
// The gate then graded a plugin Claude Code cannot load as passing, with exit 0. These tests pin the
// fail-closed behaviour at three levels: the check, the loader-to-check wiring, and the CLI exit code.
test("a claude manifest parse error is a U8 ERROR naming .claude-plugin/plugin.json", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: null, claudeManifestParseError: "Unexpected token" };
  const r = check(ctx);
  assert.equal(r.length, 1);
  assert.equal(r[0].severity, "error");
  assert.equal(r[0].reqId, "U8");
  assert.equal(r[0].file, ".claude-plugin/plugin.json");
  assert.match(r[0].message, /not valid JSON/);
});

test("a codex manifest parse error is a U8 ERROR naming .codex-plugin/plugin.json", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, codexManifest: null, codexManifestParseError: "Unexpected token" };
  const r = check(ctx);
  assert.equal(r.length, 1);
  assert.equal(r[0].file, ".codex-plugin/plugin.json");
});

test("a manifest parse error is reported even when library.json is absent", () => {
  const r = check({ root: ".", library: { data: null }, claudeManifestParseError: "Unexpected token" });
  assert.equal(r.length, 1);
  assert.equal(r[0].severity, "error");
});

test("loadPlugin carries an invalid plugin.json's parse error through to U8", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "anti/bad-plugin-json"));
  assert.equal(ctx.claudeManifest, null);
  assert.ok(ctx.claudeManifestParseError);
  assert.equal(ctx.codexManifestParseError, null);
  assert.ok(check(ctx).some((f) => f.severity === "error" && f.file === ".claude-plugin/plugin.json"));
});

test("the gate exits 1 on a plugin whose plugin.json is not valid JSON", () => {
  const res = spawnSync(process.execPath, [path.join(ROOT, "scripts/check.mjs"), path.join(FIXTURES, "anti/bad-plugin-json")], { encoding: "utf8" });
  assert.equal(res.status, 1, res.stdout + res.stderr);
  assert.match(res.stdout, /manifest-drift \(U8\): \.claude-plugin\/plugin\.json is present but not valid JSON/);
});
