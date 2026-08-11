import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { normalizeArgPath } from "../../scripts/lib/fs-utils.mjs";
import { parseArgs as parseCheckArgs } from "../../scripts/check.mjs";
import { parseArgs as parseWatchArgs } from "../../scripts/standards-watch.mjs";
import { parseArgs as parseEvalRunArgs } from "../../scripts/eval-run.mjs";

// The documented Windows defect (docs/how-to/troubleshoot-the-gate.md, tests/unit/eval-run.test.mjs): a
// backslash path handed to a CLI entry point was silently read as a different directory, so the gate
// reported a clean pass having graded nothing. scripts/lib/eval-run.mjs already normalized paths INSIDE
// the eval-run pipeline; this file covers the other entry points named in the fix - check.mjs,
// evaluate.mjs, tier-report.mjs, standards-watch.mjs, eval-run.mjs's own CLI flags, and the generators -
// which previously had NO argv parsing tests at all.
//
// normalizeArgPath's own branch logic (Windows swap vs POSIX no-op) is covered exhaustively, on every
// platform, with an injected separator in tests/unit/fs-utils.test.mjs. The tests below instead prove
// WIRING: that each entry point actually routes its argv-sourced path(s) through normalizeArgPath, and
// (for the keystone tests) that a real backslash-spelled invocation resolves and grades identically to
// its forward-slash twin. That keystone reproduction is inherently platform-specific - a backslash IS
// the Windows path separator and is NOT one on POSIX - so those tests are explicitly (loudly, with a
// stated reason) scoped to path.sep === "\\" rather than silently asserting nothing useful elsewhere.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SF_FWD = path.join(ROOT, "tests/fixtures/golden/silver-fixture").split(path.sep).join("/");
const SF_BS = SF_FWD.split("/").join("\\");
const WINDOWS_ONLY = path.sep !== "\\" && "reproduces the Windows-only historical defect; cross-platform branch logic for normalizeArgPath itself is covered deterministically (injected separator) in tests/unit/fs-utils.test.mjs";

function runCli(script, args) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(ROOT, script), ...args], { encoding: "utf8" });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

// --- check.mjs: the positional root ---

test("check.mjs parseArgs trims the positional root (proves it is routed through normalizeArgPath)", () => {
  const { root } = parseCheckArgs(["  tests/fixtures/golden/silver-fixture  "]);
  assert.equal(root, "tests/fixtures/golden/silver-fixture");
});

test("check.mjs parseArgs normalizes a backslash-spelled root the same way normalizeArgPath does on this host", () => {
  const raw = "some\\nested\\plugin";
  const { root } = parseCheckArgs([raw]);
  assert.equal(root, normalizeArgPath(raw));
});

test("check.mjs parseArgs leaves non-path flags (--mode, --profile, --strict) unaffected by path normalization", () => {
  const { mode, profile, strict } = parseCheckArgs(["some/root", "--mode", "local", "--profile", "plain-plugin", "--strict"]);
  assert.equal(mode, "local");
  assert.equal(profile, "plain-plugin");
  assert.equal(strict, true);
});

// --- standards-watch.mjs: the positional root, --pin, --snapshot-dir ---

test("standards-watch.mjs parseArgs trims the positional root (proves it is routed through normalizeArgPath)", () => {
  const { root } = parseWatchArgs(["  my-plugin  "]);
  assert.equal(root, "my-plugin");
});

test("standards-watch.mjs parseArgs trims --pin and --snapshot-dir", () => {
  const { pin, snapshotDir } = parseWatchArgs(["--pin", "  docs/pin.json  ", "--snapshot-dir", "  local/mirror  "]);
  assert.equal(pin, "docs/pin.json");
  assert.equal(snapshotDir, "local/mirror");
});

test("standards-watch.mjs parseArgs normalizes a backslash-spelled root the same way normalizeArgPath does on this host", () => {
  const raw = "some\\nested\\plugin";
  const { root } = parseWatchArgs([raw]);
  assert.equal(root, normalizeArgPath(raw));
});

// --- eval-run.mjs (the CLI, not the lib): positionals plus the path-valued flags ---

test("eval-run.mjs parseArgs normalizes positionals (target ids/paths)", () => {
  const args = parseEvalRunArgs(["  fixture-plugin  "]);
  assert.equal(args.positionals[0], "fixture-plugin");
});

test("eval-run.mjs parseArgs normalizes path-valued flags but leaves non-path flags untouched", () => {
  const args = parseEvalRunArgs([
    "some-id",
    "--out-dir", "  my-out  ",
    "--manifest", "  my-manifest.json  ",
    "--subpath", "  sub/dir  ",
    "--sha", "  abc123  ",
  ]);
  assert.equal(args["out-dir"], "my-out");
  assert.equal(args["manifest"], "my-manifest.json");
  assert.equal(args["subpath"], "sub/dir");
  assert.equal(args["sha"], "  abc123  ", "a sha is not a filesystem path and must be left exactly as typed");
});

test("eval-run.mjs parseArgs normalizes a backslash-spelled --manifest the same way normalizeArgPath does on this host", () => {
  const raw = "some\\nested\\corpus.json";
  const args = parseEvalRunArgs(["id", "--manifest", raw]);
  assert.equal(args.manifest, normalizeArgPath(raw));
});

// --- the keystone integration proof: the historical defect is closed ---

test(
  "CLI evaluate.mjs: a backslash-spelled path to a real fixture resolves to the same plugin as its forward-slash spelling, and grades it (not a vacuous clean pass)",
  { skip: WINDOWS_ONLY },
  () => {
    const fwd = runCli("scripts/evaluate.mjs", [SF_FWD, "--format=json"]);
    const bs = runCli("scripts/evaluate.mjs", [SF_BS, "--format=json"]);
    // Gate exit is filtered to the declared-tier ceiling (the silver fixture declares convergent, so its
    // Gold-only G2/G4/G5 errors stay below the exit-code threshold); summary.errors is the un-filtered
    // count, which is the honest signal that real grading happened - the control this test relies on.
    assert.equal(fwd.code, 0, "sanity: the forward-slash run's exit code reflects the declared-tier ceiling, not a crash");
    const rFwd = JSON.parse(fwd.stdout);
    const rBs = JSON.parse(bs.stdout);
    assert.equal(rBs.target, rFwd.target, "the backslash spelling normalizes to the identical target string as the forward-slash spelling");
    assert.equal(rBs.scope, "plugin", "the backslash-spelled path is recognized as the plugin, not an unknown/empty scope");
    assert.deepEqual(rBs.summary, rFwd.summary, "grading is identical regardless of which separator style was typed");
    assert.ok(rBs.summary.errors > 0 || rBs.summary.warns > 0, "real findings were produced; a vacuous 0/0 here would mean nothing was actually graded");
  }
);

test(
  "CLI tier-report.mjs: backslash and forward-slash spellings of the same root produce identical --json output",
  { skip: WINDOWS_ONLY },
  () => {
    const fwd = runCli("scripts/tier-report.mjs", [SF_FWD, "--json"]);
    const bs = runCli("scripts/tier-report.mjs", [SF_BS, "--json"]);
    assert.equal(fwd.code, 0);
    assert.equal(bs.code, 0);
    assert.deepEqual(JSON.parse(bs.stdout), JSON.parse(fwd.stdout));
  }
);

test(
  "CLI generators (gen-index, gen-manifest, sync-agents-md): backslash and forward-slash root spellings produce byte-identical output",
  { skip: WINDOWS_ONLY },
  () => {
    const cases = [
      ["scripts/generators/gen-index.mjs", []],
      ["scripts/generators/gen-manifest.mjs", ["--target=resolved"]],
      ["scripts/generators/sync-agents-md.mjs", []],
    ];
    for (const [script, extraArgs] of cases) {
      const fwd = runCli(script, [SF_FWD, ...extraArgs]);
      const bs = runCli(script, [SF_BS, ...extraArgs]);
      assert.equal(fwd.code, 0, `${script} (forward-slash) should succeed`);
      assert.equal(bs.code, 0, `${script} (backslash) should succeed`);
      assert.equal(bs.stdout, fwd.stdout, `${script}: backslash and forward-slash root must render byte-identical output`);
    }
  }
);
