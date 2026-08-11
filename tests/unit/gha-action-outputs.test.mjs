import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { toGithubOutputLines, validateReport } from "../../scripts/gha-action-outputs.mjs";

// Proves the Action's outputs bridge (action.yml wraps scripts/check.mjs --json and this script).
// Standard sec 4.1/4.4 requires CI configuration to hold no validation logic of its own - this file
// is where the decision of what becomes an output actually lives, so action.yml itself is a pure pipe.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "gha-action-outputs.mjs");
const CHECK_SCRIPT = path.join(ROOT, "scripts", "check.mjs");
const SILVER_FIXTURE = path.join(ROOT, "tests", "fixtures", "golden", "silver-fixture");

// --- toGithubOutputLines: the pure function, given an already-built report object ---

test("toGithubOutputLines projects tier/errorCount/warnCount into GITHUB_OUTPUT-format lines", () => {
  const lines = toGithubOutputLines({ tierReport: { tier: "advanced" }, errorCount: 0, warnCount: 2, exitCode: 0 });
  assert.deepEqual(lines, ["tier=advanced", "errors=0", "warnings=2"]);
});

// Finding 2 (pre-release adversarial review, v1.11.0): the bridge must FAIL CLOSED, never substitute a
// default. A parseable-but-schema-incomplete report - a JSON contract drift, or output truncated into a
// differently-shaped-but-still-valid object - must never be read as a clean, zero-error result. This
// replaces the old "defaults to tier=none rather than throwing" test, which asserted the exact fail-open
// behavior this finding requires removing.

test("toGithubOutputLines throws (does not default to tier=none) when tierReport is absent", () => {
  assert.throws(() => toGithubOutputLines({ errorCount: 1, warnCount: 0, exitCode: 1 }), /tierReport\.tier/);
});

test("toGithubOutputLines throws naming every missing/invalid field when the report is empty", () => {
  assert.throws(() => toGithubOutputLines({}), (err) => {
    assert.match(err.message, /tierReport\.tier/);
    assert.match(err.message, /errorCount/);
    assert.match(err.message, /warnCount/);
    assert.match(err.message, /exitCode/);
    return true;
  });
});

test("toGithubOutputLines throws on an out-of-domain tier value rather than passing it through", () => {
  assert.throws(
    () => toGithubOutputLines({ tierReport: { tier: "gold" }, errorCount: 0, warnCount: 0, exitCode: 0 }),
    /tierReport\.tier/
  );
});

test("toGithubOutputLines throws on a non-integer or negative errorCount/warnCount", () => {
  assert.throws(
    () => toGithubOutputLines({ tierReport: { tier: "none" }, errorCount: "0", warnCount: 0, exitCode: 0 }),
    /errorCount/
  );
  assert.throws(
    () => toGithubOutputLines({ tierReport: { tier: "none" }, errorCount: 0, warnCount: -1, exitCode: 0 }),
    /warnCount/
  );
});

test("toGithubOutputLines throws on an exitCode outside {0, 1}", () => {
  assert.throws(
    () => toGithubOutputLines({ tierReport: { tier: "none" }, errorCount: 0, warnCount: 0, exitCode: 2 }),
    /exitCode/
  );
  assert.throws(
    () => toGithubOutputLines({ tierReport: { tier: "none" }, errorCount: 0, warnCount: 0 }),
    /exitCode/
  );
});

test("toGithubOutputLines accepts a fully valid report and never substitutes a default", () => {
  const lines = toGithubOutputLines({ tierReport: { tier: "advanced" }, errorCount: 0, warnCount: 0, exitCode: 0 });
  assert.deepEqual(lines, ["tier=advanced", "errors=0", "warnings=0"]);
});

// --- validateReport: the underlying schema check, exercised directly ---

test("validateReport returns an empty array for a fully valid report", () => {
  assert.deepEqual(validateReport({ tierReport: { tier: "universal" }, errorCount: 0, warnCount: 0, exitCode: 0 }), []);
});

test("validateReport returns one problem per missing/invalid field, not just the first", () => {
  const problems = validateReport({});
  assert.equal(problems.length, 4, `expected 4 problems (tier, errorCount, warnCount, exitCode), got:\n${problems.join("\n")}`);
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

// --- CLI: fail closed on a parseable-but-schema-incomplete report (Finding 2) ---

test("CLI gha-action-outputs.mjs exits non-zero on a schema-incomplete-but-valid-JSON report, naming the missing fields", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-gha-out-schema-"));
  try {
    const badFile = path.join(dir, "malformed.json");
    // Valid JSON, parseable, but not check.mjs's report shape - e.g. a differently-shaped object that
    // happens to still be valid JSON, which is exactly the drift-or-truncation scenario Finding 2 names.
    writeFileSync(badFile, JSON.stringify({ ok: true, count: 3 }), "utf8");
    try {
      execFileSync(process.execPath, [SCRIPT, badFile], { encoding: "utf8" });
      assert.fail("must exit non-zero on a schema-incomplete report");
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(String(e.stderr), /tierReport\.tier/);
      assert.match(String(e.stderr), /errorCount/);
      assert.match(String(e.stderr), /warnCount/);
      assert.match(String(e.stderr), /exitCode/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI gha-action-outputs.mjs exits non-zero on a REAL check.mjs --json report truncated mid-stream", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-gha-out-truncated-"));
  try {
    // Start from a real, full check.mjs --json report, then cut it exactly where a truncated write in
    // practice would land: after "warnCount" but before "exitCode"/"tierReport" ever got written. That
    // is the realistic failure this finding calls out - not hand-authored garbage, an honest prefix of
    // a real report that still happens to close as valid JSON.
    const fullJson = execFileSync(process.execPath, [CHECK_SCRIPT, SILVER_FIXTURE, "--json"], { encoding: "utf8" });
    const cut = fullJson.indexOf('"warnCount"');
    assert.ok(cut > 0, "fixture assumption: buildJsonReport must still serialize a warnCount field");
    const lineEnd = fullJson.indexOf("\n", cut);
    const truncated = fullJson.slice(0, lineEnd).replace(/,\s*$/, "") + "\n}\n";
    JSON.parse(truncated); // sanity: the truncated fixture itself must still be valid JSON
    const truncatedFile = path.join(dir, "truncated.json");
    writeFileSync(truncatedFile, truncated, "utf8");
    try {
      execFileSync(process.execPath, [SCRIPT, truncatedFile], { encoding: "utf8" });
      assert.fail("must exit non-zero on a truncated report, even though it still parses as JSON");
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(String(e.stderr), /exitCode/, "the truncated fields (exitCode, tierReport) must be named");
      assert.match(String(e.stderr), /tierReport\.tier/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
