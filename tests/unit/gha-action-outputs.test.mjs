import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { toGithubOutputLines } from "../../scripts/gha-action-outputs.mjs";

// Proves the Action's outputs bridge (action.yml wraps scripts/check.mjs --json and this script).
// Standard sec 4.1/4.4 requires CI configuration to hold no validation logic of its own - this file
// is where the decision of what becomes an output actually lives, so action.yml itself is a pure pipe.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "gha-action-outputs.mjs");
const CHECK_SCRIPT = path.join(ROOT, "scripts", "check.mjs");
const SILVER_FIXTURE = path.join(ROOT, "tests", "fixtures", "golden", "silver-fixture");

// --- toGithubOutputLines: the pure function, given an already-built report object ---

test("toGithubOutputLines projects tier/errorCount/warnCount into GITHUB_OUTPUT-format lines", () => {
  const lines = toGithubOutputLines({ tierReport: { tier: "advanced" }, errorCount: 0, warnCount: 2 });
  assert.deepEqual(lines, ["tier=advanced", "errors=0", "warnings=2"]);
});

test("toGithubOutputLines defaults to tier=none when tierReport is absent, rather than throwing", () => {
  const lines = toGithubOutputLines({ errorCount: 1, warnCount: 0 });
  assert.deepEqual(lines, ["tier=none", "errors=1", "warnings=0"]);
});

// --- CLI: reads a real check.mjs --json file and emits the three lines ---

test("CLI gha-action-outputs.mjs reads a check.mjs --json file and prints tier/errors/warnings lines", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-gha-out-"));
  try {
    const reportFile = path.join(dir, "gate.json");
    const gateJson = execFileSync(process.execPath, [CHECK_SCRIPT, SILVER_FIXTURE, "--json"], { encoding: "utf8" });
    writeFileSync(reportFile, gateJson, "utf8");
    const out = execFileSync(process.execPath, [SCRIPT, reportFile], { encoding: "utf8" });
    const lines = out.trim().split("\n");
    assert.equal(lines.length, 3);
    assert.match(lines[0], /^tier=convergent$/);
    assert.match(lines[1], /^errors=\d+$/);
    assert.match(lines[2], /^warnings=\d+$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI gha-action-outputs.mjs exits 2 with a usage message when no file argument is given", () => {
  try {
    execFileSync(process.execPath, [SCRIPT], { encoding: "utf8" });
    assert.fail("must exit non-zero with no argument");
  } catch (e) {
    assert.equal(e.status, 2);
    assert.match(String(e.stderr), /usage/i);
  }
});

test("CLI gha-action-outputs.mjs exits 1 with a clear message on unparseable input", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-gha-out-bad-"));
  try {
    const badFile = path.join(dir, "not-json.txt");
    writeFileSync(badFile, "not json at all {{{", "utf8");
    try {
      execFileSync(process.execPath, [SCRIPT, badFile], { encoding: "utf8" });
      assert.fail("must exit non-zero on unparseable input");
    } catch (e) {
      assert.equal(e.status, 1);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
