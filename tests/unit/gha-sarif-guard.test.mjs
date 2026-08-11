import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { validateSarifShape, validateSarifResult } from "../../scripts/gha-sarif-guard.mjs";

// Proves scripts/gha-sarif-guard.mjs (round 2 of the pre-release adversarial review, v1.11.0): SARIF's
// exit code alone cannot prove serialization succeeded, because status 1 is BOTH the expected code for
// a real failing grade (valid SARIF written) AND the ordinary code for a crash/failed write (garbage or
// partial file). Structural content validity is checked as its OWN signal, independent of any exit code;
// exit-code agreement between check.mjs --sarif and --json is checked SEPARATELY as a "like with like"
// comparison (both compute the identical runGate().exitCode), never by comparing raw error counts (which
// legitimately differ - see the false-positive this module deliberately avoids, documented in its header).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "gha-sarif-guard.mjs");

const VALID_SARIF = { version: "2.1.0", runs: [{ tool: { driver: { name: "x" } }, results: [] }] };

// --- validateSarifShape: structural validity only, no exit codes involved ---

test("validateSarifShape accepts a real, minimal, valid SARIF document", () => {
  assert.deepEqual(validateSarifShape(VALID_SARIF), []);
});

test("validateSarifShape rejects a non-object", () => {
  assert.ok(validateSarifShape(null).length > 0);
  assert.ok(validateSarifShape("not an object").length > 0);
  assert.ok(validateSarifShape(42).length > 0);
});

test("validateSarifShape rejects a wrong or missing version", () => {
  const problems = validateSarifShape({ ...VALID_SARIF, version: "2.0.0" });
  assert.match(problems.join("\n"), /version/);
});

test("validateSarifShape rejects a missing/empty runs array", () => {
  assert.match(validateSarifShape({ version: "2.1.0" }).join("\n"), /runs/);
  assert.match(validateSarifShape({ version: "2.1.0", runs: [] }).join("\n"), /runs/);
});

test("validateSarifShape rejects a run with no results array (the truncation shape: cut before results was ever written)", () => {
  const problems = validateSarifShape({ version: "2.1.0", runs: [{ tool: {} }] });
  assert.match(problems.join("\n"), /results/);
});

// --- validateSarifResult: shape PLUS exit-code agreement (the full decision) ---

test("validateSarifResult accepts a valid document whose exit code agrees with the JSON gate (ordinary passing grade)", () => {
  assert.deepEqual(validateSarifResult(VALID_SARIF, 0, 0), []);
});

test("validateSarifResult accepts a valid document whose exit code agrees with the JSON gate (ordinary FAILING grade)", () => {
  // This is the case the finding says must still work: exitCode 1 on both sides, but the SARIF content
  // is real. Distinguishing this from the garbage-content case below is the entire point of the fix.
  assert.deepEqual(validateSarifResult(VALID_SARIF, 1, 1), []);
});

test("THE FINDING: rejects a STRUCTURALLY INVALID document even though its exit code coincidentally matches the JSON gate's", () => {
  const garbage = { oops: true }; // parses as JSON, but is not a SARIF document at all
  const problems = validateSarifResult(garbage, 1, 1); // exit codes AGREE - the old check alone would have passed this
  assert.ok(problems.length > 0, "must still reject on shape alone, regardless of exit-code agreement");
  assert.match(problems.join("\n"), /version/);
});

test("validateSarifResult rejects an exit-code disagreement even when the document is structurally valid", () => {
  const problems = validateSarifResult(VALID_SARIF, 1, 0);
  assert.match(problems.join("\n"), /exit-code disagreement/);
});

test("validateSarifResult does NOT compare raw error/warning counts (that would be a false positive - see fixture evidence in the module header)", () => {
  // A document that legitimately carries MORE error-level results than the JSON gate's ceiling-filtered
  // errorCount (above-declared-tier findings are real SARIF results but not gate-affecting) must still
  // be accepted when shape is valid and exit codes agree - proven directly against this repo's own
  // silver-fixture in the implementation notes; this test locks in that the comparison is exit-code-only.
  const docWithExtraErrors = {
    version: "2.1.0",
    runs: [{ tool: {}, results: [{ level: "error" }, { level: "error" }, { level: "error" }] }],
  };
  assert.deepEqual(validateSarifResult(docWithExtraErrors, 0, 0), []);
});

// --- CLI: reads a real file, decides, and REMOVES the file on any rejection ---

function withTempDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-sarif-guard-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("CLI accepts a valid SARIF file whose exit code agrees with the gate's, leaving the file in place", () => {
  withTempDir((dir) => {
    const file = path.join(dir, "gate.sarif");
    writeFileSync(file, JSON.stringify(VALID_SARIF), "utf8");
    execFileSync(process.execPath, [SCRIPT, file, "1", "1"], { encoding: "utf8" });
    assert.ok(existsSync(file), "a valid, agreeing artifact must survive");
  });
});

test("THE FINDING, at the CLI: a garbage file with a coincidentally-matching exit code is REJECTED and REMOVED", () => {
  withTempDir((dir) => {
    const file = path.join(dir, "gate.sarif");
    writeFileSync(file, JSON.stringify({ not: "sarif" }), "utf8");
    try {
      execFileSync(process.execPath, [SCRIPT, file, "1", "1"], { encoding: "utf8" });
      assert.fail("must exit non-zero on a structurally invalid document");
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(String(e.stderr), /version/);
    }
    assert.ok(!existsSync(file), "the partial/garbage artifact must be removed so nothing downstream can pick it up");
  });
});

test("CLI rejects and removes an unparseable (non-JSON) file - the truncated-mid-write case", () => {
  withTempDir((dir) => {
    const file = path.join(dir, "gate.sarif");
    writeFileSync(file, '{"version": "2.1.0", "runs": [ { "resu', "utf8"); // cut mid-stream
    try {
      execFileSync(process.execPath, [SCRIPT, file, "1", "1"], { encoding: "utf8" });
      assert.fail("must exit non-zero on unparseable JSON");
    } catch (e) {
      assert.equal(e.status, 1);
    }
    assert.ok(!existsSync(file), "the truncated artifact must be removed");
  });
});

test("CLI rejects and reports an exit-code disagreement even when the file itself is valid", () => {
  withTempDir((dir) => {
    const file = path.join(dir, "gate.sarif");
    writeFileSync(file, JSON.stringify(VALID_SARIF), "utf8");
    try {
      execFileSync(process.execPath, [SCRIPT, file, "1", "0"], { encoding: "utf8" });
      assert.fail("must exit non-zero on exit-code disagreement");
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(String(e.stderr), /exit-code disagreement/);
    }
    assert.ok(!existsSync(file), "a disagreeing artifact must not survive either - fail closed, not half-trusted");
  });
});

test("CLI exits 2 with a usage message when arguments are missing", () => {
  try {
    execFileSync(process.execPath, [SCRIPT], { encoding: "utf8" });
    assert.fail("must exit non-zero with no arguments");
  } catch (e) {
    assert.equal(e.status, 2);
    assert.match(String(e.stderr), /usage/i);
  }
});

test("CLI treats a nonexistent file as a rejection, not a crash", () => {
  withTempDir((dir) => {
    const file = path.join(dir, "does-not-exist.sarif");
    try {
      execFileSync(process.execPath, [SCRIPT, file, "1", "1"], { encoding: "utf8" });
      assert.fail("must exit non-zero when the file does not exist");
    } catch (e) {
      assert.equal(e.status, 1);
    }
  });
});
