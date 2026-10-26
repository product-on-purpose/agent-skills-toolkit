import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { checkVersionAgreement, main } from "../../scripts/check-version-agreement.mjs";
import { GATES } from "../../scripts/lib/release-ready.mjs";

// E85: the version-agreement preflight, modelled on the property `claude plugin tag` already checks
// before it will cut a tag - every version-bearing manifest must agree BEFORE a tag makes the claim
// permanent, not just after one is pushed (verify-tag-matches-manifests.mjs's job).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/check-version-agreement.mjs");

function makeDir(version, { withLockfile = true, withPackage = true, withNative = true } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-version-agreement-"));
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "x", version }), "utf8");
  if (withNative) {
    mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    mkdirSync(path.join(dir, ".codex-plugin"), { recursive: true });
    writeFileSync(path.join(dir, ".claude-plugin/plugin.json"), JSON.stringify({ version }), "utf8");
    writeFileSync(path.join(dir, ".codex-plugin/plugin.json"), JSON.stringify({ version }), "utf8");
  }
  if (withPackage) {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x", version }), "utf8");
  }
  if (withLockfile) {
    writeFileSync(
      path.join(dir, "package-lock.json"),
      JSON.stringify({ name: "x", version, packages: { "": { name: "x", version } } }),
      "utf8"
    );
  }
  return dir;
}

// ---------------------------------------------------------------------------------------------
// The gate aggregate carries this gate.
// ---------------------------------------------------------------------------------------------

test("release-ready carries a version-agreement gate, not overridable at any code", () => {
  const gate = GATES.find((g) => g.id === "version-agreement");
  assert.ok(gate, "release-ready.mjs has no version-agreement gate");
  assert.deepEqual(gate.argv, ["scripts/check-version-agreement.mjs", "."]);
  assert.equal(gate.overridableCodes, undefined, "nothing this gate reads lives on somebody else's server");
});

// ---------------------------------------------------------------------------------------------
// All agree.
// ---------------------------------------------------------------------------------------------

test("every file agreeing: ok, and every row is reported", () => {
  const dir = makeDir("1.11.0");
  const result = checkVersionAgreement(dir);
  assert.equal(result.ok, true);
  assert.equal(result.refused, false);
  assert.equal(result.reference, "1.11.0");
  // library.json + native plugin manifests (2) + package.json + lockfile halves (2) = 6
  assert.equal(result.rows.length, 6);
  assert.ok(result.rows.every((r) => r.agrees));
});

test("CLI: exits 0 and reports the agreement count when everything agrees", () => {
  const dir = makeDir("1.11.0");
  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /OK \(6 file\(s\) agree on 1\.11\.0\)/);
});

// ---------------------------------------------------------------------------------------------
// Each file disagreeing in turn.
// ---------------------------------------------------------------------------------------------

const DISAGREEING_FILES = [
  { label: ".claude-plugin/plugin.json", rel: ".claude-plugin/plugin.json", write: (v) => JSON.stringify({ version: v }) },
  { label: ".codex-plugin/plugin.json", rel: ".codex-plugin/plugin.json", write: (v) => JSON.stringify({ version: v }) },
  { label: "package.json", rel: "package.json", write: (v) => JSON.stringify({ name: "x", version: v }) },
  {
    label: "package-lock.json (version)",
    rel: "package-lock.json",
    write: (v) => JSON.stringify({ name: "x", version: v, packages: { "": { name: "x", version: "1.11.0" } } }),
  },
  {
    label: 'package-lock.json (packages[""].version)',
    rel: "package-lock.json",
    write: (v) => JSON.stringify({ name: "x", version: "1.11.0", packages: { "": { name: "x", version: v } } }),
  },
];

for (const f of DISAGREEING_FILES) {
  test(`${f.label} disagreeing with library.json: refused-false, exit 1, named by label`, () => {
    const dir = makeDir("1.11.0");
    writeFileSync(path.join(dir, f.rel), f.write("1.10.0"), "utf8");
    const result = checkVersionAgreement(dir);
    assert.equal(result.ok, false);
    assert.equal(result.refused, false);
    const row = result.rows.find((r) => r.label === f.label);
    assert.ok(row, `no row for ${f.label}; rows: ${JSON.stringify(result.rows)}`);
    assert.equal(row.agrees, false);
    assert.equal(row.version, "1.10.0");
    // Every OTHER row still agrees.
    assert.ok(result.rows.filter((r) => r.label !== f.label).every((r) => r.agrees));

    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(
      r.stdout.includes(f.label) || r.stderr.includes(f.label),
      `CLI output does not name ${f.label}:\n${r.stdout}${r.stderr}`
    );
  });
}

test("library.json itself disagreeing with the reference is impossible by construction (it IS the reference)", () => {
  // library.json supplies `reference`, so there is no separate "library.json disagrees" case - this
  // documents that deliberately, rather than leaving the omission to look like an oversight.
  const dir = makeDir("1.11.0");
  const result = checkVersionAgreement(dir);
  assert.equal(result.rows[0].label, "library.json");
  assert.equal(result.rows[0].agrees, true);
});

// ---------------------------------------------------------------------------------------------
// Optional files missing: skipped, not refused, not disagreeing.
// ---------------------------------------------------------------------------------------------

test("only library.json present: ok, one row", () => {
  const dir = makeDir("1.11.0", { withLockfile: false, withPackage: false, withNative: false });
  const result = checkVersionAgreement(dir);
  assert.equal(result.ok, true);
  assert.equal(result.refused, false);
  assert.deepEqual(result.rows.map((r) => r.label), ["library.json"]);
});

test("an old-shape package-lock.json with no packages[\"\"] skips only that half", () => {
  const dir = makeDir("1.11.0");
  writeFileSync(path.join(dir, "package-lock.json"), JSON.stringify({ version: "1.11.0" }), "utf8");
  const result = checkVersionAgreement(dir);
  assert.equal(result.ok, true);
  const labels = result.rows.map((r) => r.label);
  assert.ok(labels.includes("package-lock.json (version)"));
  assert.ok(!labels.includes('package-lock.json (packages[""].version)'));
});

// ---------------------------------------------------------------------------------------------
// An in-repo marketplace.
// ---------------------------------------------------------------------------------------------

function addMarketplace(dir, { name, version, pluginName = "x" }) {
  mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  const entry = { name };
  if (version !== undefined) entry.version = version;
  writeFileSync(
    path.join(dir, ".claude-plugin/marketplace.json"),
    JSON.stringify({ name: "catalogue", plugins: [entry] }),
    "utf8"
  );
}

test("an in-repo marketplace entry agreeing: counted as an extra row, still ok", () => {
  const dir = makeDir("1.11.0", { withLockfile: false, withPackage: false, withNative: false });
  addMarketplace(dir, { name: "x", version: "1.11.0" });
  const result = checkVersionAgreement(dir);
  assert.equal(result.ok, true);
  const row = result.rows.find((r) => r.label.includes("marketplace.json"));
  assert.ok(row, "no marketplace row found when the catalogue agrees");
  assert.equal(row.agrees, true);
});

test("an in-repo marketplace entry disagreeing: exit 1, named", () => {
  const dir = makeDir("1.11.0", { withLockfile: false, withPackage: false, withNative: false });
  addMarketplace(dir, { name: "x", version: "1.10.0" });
  const result = checkVersionAgreement(dir);
  assert.equal(result.ok, false);
  const row = result.rows.find((r) => r.label.includes("marketplace.json"));
  assert.equal(row.agrees, false);

  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /marketplace\.json/);
});

test("a marketplace.json with no entry naming this plugin: no row, no refusal", () => {
  const dir = makeDir("1.11.0", { withLockfile: false, withPackage: false, withNative: false });
  addMarketplace(dir, { name: "some-other-plugin", version: "9.9.9" });
  const result = checkVersionAgreement(dir);
  assert.equal(result.ok, true);
  assert.ok(!result.rows.some((r) => r.label.includes("marketplace.json")));
});

test("a marketplace.json present but with no sibling: never read when the repo root lacks one", () => {
  // Sanity on the gating condition itself: a plain directory with no .claude-plugin/marketplace.json
  // at all must not somehow still produce a marketplace row.
  const dir = makeDir("1.11.0", { withLockfile: false, withPackage: false, withNative: false });
  const result = checkVersionAgreement(dir);
  assert.ok(!result.rows.some((r) => r.label.includes("marketplace.json")));
});

test("a malformed in-repo marketplace.json refuses (exit 2), it does not pass or silently skip", () => {
  const dir = makeDir("1.11.0", { withLockfile: false, withPackage: false, withNative: false });
  mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  writeFileSync(path.join(dir, ".claude-plugin/marketplace.json"), "{ not json", "utf8");
  const result = checkVersionAgreement(dir);
  assert.equal(result.refused, true);
  assert.equal(result.ok, false);

  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout + r.stderr);
});

// ---------------------------------------------------------------------------------------------
// Unreadable input exits 2, never a pass.
// ---------------------------------------------------------------------------------------------

test("library.json absent: refuses with exit 2, not a silent pass with zero files checked", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-version-agreement-empty-"));
  const result = checkVersionAgreement(dir);
  assert.equal(result.refused, true);
  assert.equal(result.ok, false);

  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout + r.stderr);
});

test("library.json unparseable: refuses with exit 2", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-version-agreement-bad-"));
  writeFileSync(path.join(dir, "library.json"), "{ not json", "utf8");
  const result = checkVersionAgreement(dir);
  assert.equal(result.refused, true);
  assert.match(result.problems[0], /not valid JSON/);
});

test("library.json with no version field: refuses with exit 2", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-version-agreement-noversion-"));
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "x" }), "utf8");
  const result = checkVersionAgreement(dir);
  assert.equal(result.refused, true);
  assert.match(result.problems[0], /no "version" field/);
});

test("a present-but-unparseable optional manifest refuses (exit 2), rather than being reported as a disagreement", () => {
  const dir = makeDir("1.11.0");
  writeFileSync(path.join(dir, "package.json"), "{ not json", "utf8");
  const result = checkVersionAgreement(dir);
  assert.equal(result.refused, true);
  assert.match(result.problems.join("\n"), /package\.json/);

  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout + r.stderr);
});

// ---------------------------------------------------------------------------------------------
// Mutation-style: bumping one manifest turns the gate red.
// ---------------------------------------------------------------------------------------------

test("mutation: a passing fixture bumped in exactly one file goes red, and repairing it goes green again", () => {
  const dir = makeDir("1.11.0");
  assert.equal(checkVersionAgreement(dir).ok, true, "fixture must start green");

  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x", version: "1.12.0" }), "utf8");
  const bumped = checkVersionAgreement(dir);
  assert.equal(bumped.ok, false, "bumping package.json alone must turn the gate red");
  assert.equal(bumped.rows.find((r) => r.label === "package.json").agrees, false);

  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x", version: "1.11.0" }), "utf8");
  assert.equal(checkVersionAgreement(dir).ok, true, "repairing the bump must turn the gate green again");
});

// ---------------------------------------------------------------------------------------------
// The toolkit's own tree.
// ---------------------------------------------------------------------------------------------

test("the toolkit's own manifests agree with each other right now", () => {
  const { version } = JSON.parse(readFileSync(path.join(ROOT, "library.json"), "utf8"));
  const result = checkVersionAgreement(ROOT);
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.reference, version);
});

test("main(): --help exits 0 without touching the filesystem", () => {
  assert.equal(main(["--help"]), 0);
});
