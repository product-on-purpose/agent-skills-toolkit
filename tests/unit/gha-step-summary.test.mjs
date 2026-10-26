import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { renderStepSummary, validateReport, groupFindingsByReqId } from "../../scripts/gha-step-summary.mjs";
import { TIER_SCOPE_SENTENCE } from "../../scripts/lib/tier-scope.mjs";

// Proves action.yml's new job-summary step (F-033): the Markdown body gha-step-summary.mjs renders from
// the same check.mjs --json shape gha-action-outputs.mjs already validates, and the CLI's handling of
// $GITHUB_STEP_SUMMARY - append-not-truncate, and a reported-but-non-fatal skip when it is unset.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "gha-step-summary.mjs");
const CHECK_SCRIPT = path.join(ROOT, "scripts", "check.mjs");
const PASSING_FIXTURE = path.join(ROOT, "tests", "fixtures", "golden", "minimal-skill");
const FAILING_FIXTURE = path.join(ROOT, "tests", "fixtures", "anti", "missing-library-json");
const WARNING_FIXTURE = path.join(ROOT, "tests", "fixtures", "golden", "silver-fixture");

// check.mjs exits non-zero on a real failing or operator-error grade by design - that is how the gate
// reports a failure - so a FAILING fixture's --json output must be read from the caught error's own
// stdout, not assumed to come back through a clean execFileSync return.
function gateReport(fixture) {
  try {
    const json = execFileSync(process.execPath, [CHECK_SCRIPT, fixture, "--json"], { encoding: "utf8" });
    return JSON.parse(json);
  } catch (e) {
    return JSON.parse(e.stdout);
  }
}

// --- renderStepSummary: pure function, against real gate reports ---

test("renderStepSummary headlines a PASSING report's tier and zero counts, and carries the tier-scope sentence verbatim", () => {
  const report = gateReport(PASSING_FIXTURE);
  const md = renderStepSummary(report);
  assert.match(md, /^## Agent Skills Toolkit Grader/m);
  assert.match(md, /\*\*Tier: \w+\*\* - 0 error\(s\), \d+ warning\(s\), 0 operator error\(s\)/);
  assert.ok(md.includes(TIER_SCOPE_SENTENCE), "must import the sentence, not paraphrase it");
  assert.match(md, /No blockers reported for the next tier\.|### Blocking/);
});

test("renderStepSummary on a FAILING report names the tier none and reports at least one error", () => {
  const report = gateReport(FAILING_FIXTURE);
  const md = renderStepSummary(report);
  assert.match(md, /\*\*Tier: None\*\*/);
  assert.match(md, /\d+ error\(s\)/);
  const errorCountInHeadline = Number(report.errorCount);
  assert.ok(errorCountInHeadline >= 1, "fixture assumption: missing-library-json must carry a real gate-failing error");
});

test("renderStepSummary on a report with findings above the declared tier states what blocks the next tier", () => {
  const report = gateReport(WARNING_FIXTURE);
  const md = renderStepSummary(report);
  const [nextTier] = Object.keys(report.tierReport.blocked ?? {});
  assert.ok(nextTier, "fixture assumption: silver-fixture must carry a blocked next tier");
  assert.match(md, new RegExp(`### Blocking ${nextTier.charAt(0).toUpperCase()}${nextTier.slice(1)}`));
  for (const reqLine of report.tierReport.blocked[nextTier]) {
    const reqId = reqLine.split(":")[0];
    assert.ok(md.includes(reqId), `blocking line for ${reqId} must appear in the rendered summary`);
  }
});

test("renderStepSummary reports an operator error in the headline without affecting the tier wording", () => {
  const report = {
    tierReport: { tier: "advanced", blocked: {} },
    errorCount: 0,
    warnCount: 0,
    operatorErrorCount: 1,
    exitCode: 2,
    findings: [],
  };
  const md = renderStepSummary(report);
  assert.match(md, /\*\*Tier: Advanced\*\* - 0 error\(s\), 0 warning\(s\), 1 operator error\(s\)/);
});

// --- groupFindingsByReqId: pure grouping ---

test("groupFindingsByReqId groups by reqId, counts members, and skips suppressed and operator findings", () => {
  const findings = [
    { reqId: "U5", severity: "warn", effectiveSeverity: "warn", message: "first", suppressed: false },
    { reqId: "U5", severity: "warn", effectiveSeverity: "warn", message: "second", suppressed: false },
    { reqId: "U5", severity: "warn", effectiveSeverity: "warn", message: "suppressed one", suppressed: true },
    { reqId: null, severity: "error", effectiveSeverity: "error", message: "operator", suppressed: false, operator: true },
    { reqId: "G2", severity: "error", effectiveSeverity: "error", message: "gold gap", suppressed: false },
  ];
  const groups = groupFindingsByReqId(findings);
  assert.deepEqual(groups.map((g) => g.reqId), ["G2", "U5"], "error-severity groups sort before warn-severity groups");
  const u5 = groups.find((g) => g.reqId === "U5");
  assert.equal(u5.count, 2, "the suppressed member must not be counted");
});

// --- renderStepSummary: the omission line, no silent caps ---

test("renderStepSummary caps the top-findings list and states how many requirement groups were omitted", () => {
  const findings = [];
  for (let i = 0; i < 5; i++) {
    findings.push({ reqId: `U${i}`, severity: "warn", effectiveSeverity: "warn", message: `finding ${i}`, suppressed: false });
  }
  const report = {
    tierReport: { tier: "convergent", blocked: {} },
    errorCount: 0,
    warnCount: 5,
    operatorErrorCount: 0,
    exitCode: 0,
    findings,
  };
  const md = renderStepSummary(report, { maxFindings: 2 });
  assert.match(md, /U0/);
  assert.match(md, /U1/);
  assert.doesNotMatch(md, /U2/, "the third group must not appear once the cap is reached");
  assert.match(md, /3 further requirements omitted/);
});

test("renderStepSummary with no findings says so explicitly rather than printing an empty section", () => {
  const report = {
    tierReport: { tier: "advanced", blocked: {} },
    errorCount: 0,
    warnCount: 0,
    operatorErrorCount: 0,
    exitCode: 0,
    findings: [],
  };
  const md = renderStepSummary(report);
  assert.match(md, /No gating or warning findings\./);
});

// --- validateReport: fail-closed, including the field gha-action-outputs.mjs never needed ---

test("validateReport accepts a fully valid report", () => {
  assert.deepEqual(
    validateReport({ tierReport: { tier: "advanced" }, errorCount: 0, warnCount: 0, exitCode: 0, operatorErrorCount: 0, findings: [] }),
    []
  );
});

test("validateReport rejects a report with no findings array, naming the field", () => {
  const problems = validateReport({ tierReport: { tier: "advanced" }, errorCount: 0, warnCount: 0, exitCode: 0, operatorErrorCount: 0 });
  assert.ok(problems.some((p) => p.includes("findings")), "must name the missing findings field");
});

test("renderStepSummary throws (does not render a quiet summary) when the report fails schema validation", () => {
  assert.throws(() => renderStepSummary({ errorCount: 0 }), /tierReport\.tier/);
});

// --- CLI: GITHUB_STEP_SUMMARY handling ---

test("CLI gha-step-summary.mjs appends to an existing GITHUB_STEP_SUMMARY rather than truncating it", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-step-summary-"));
  try {
    const reportFile = path.join(dir, "gate.json");
    writeFileSync(reportFile, JSON.stringify(gateReport(PASSING_FIXTURE)), "utf8");
    const summaryFile = path.join(dir, "summary.md");
    writeFileSync(summaryFile, "## Some earlier step's own summary\n", "utf8");

    execFileSync(process.execPath, [SCRIPT, reportFile], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_STEP_SUMMARY: summaryFile },
    });

    const after = readFileSync(summaryFile, "utf8");
    assert.match(after, /Some earlier step's own summary/, "the earlier content must survive");
    assert.match(after, /## Agent Skills Toolkit Grader/, "this step's own content must be appended");
    assert.ok(
      after.indexOf("Some earlier step's own summary") < after.indexOf("Agent Skills Toolkit Grader"),
      "the append must land after the existing content, not before it"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI gha-step-summary.mjs with GITHUB_STEP_SUMMARY unset exits 0 and reports the skip to stderr", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-step-summary-nosummary-"));
  try {
    const reportFile = path.join(dir, "gate.json");
    writeFileSync(reportFile, JSON.stringify(gateReport(PASSING_FIXTURE)), "utf8");
    const env = { ...process.env };
    delete env.GITHUB_STEP_SUMMARY;
    const result = execFileSync(process.execPath, [SCRIPT, reportFile], { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] });
    assert.equal(result, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI gha-step-summary.mjs writes a real summary for a FAILING gate, proving the summary works on a red run too", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-step-summary-failing-"));
  try {
    const reportFile = path.join(dir, "gate.json");
    writeFileSync(reportFile, JSON.stringify(gateReport(FAILING_FIXTURE)), "utf8");
    const summaryFile = path.join(dir, "summary.md");
    writeFileSync(summaryFile, "", "utf8");

    execFileSync(process.execPath, [SCRIPT, reportFile], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_STEP_SUMMARY: summaryFile },
    });

    const after = readFileSync(summaryFile, "utf8");
    assert.match(after, /\*\*Tier: None\*\*/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- CLI: operator error (F-011's exit 2), malformed JSON, and usage ---

test("CLI gha-step-summary.mjs renders an operator-error report (exit 2 from check.mjs) without failing itself", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-step-summary-operator-"));
  try {
    const report = {
      tierReport: { tier: "none", blocked: {} },
      errorCount: 0,
      warnCount: 0,
      operatorErrorCount: 1,
      exitCode: 2,
      findings: [],
    };
    const reportFile = path.join(dir, "gate.json");
    writeFileSync(reportFile, JSON.stringify(report), "utf8");
    const summaryFile = path.join(dir, "summary.md");
    writeFileSync(summaryFile, "", "utf8");

    execFileSync(process.execPath, [SCRIPT, reportFile], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_STEP_SUMMARY: summaryFile },
    });

    const after = readFileSync(summaryFile, "utf8");
    assert.match(after, /1 operator error\(s\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI gha-step-summary.mjs exits 1 on unparseable JSON", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-step-summary-badjson-"));
  try {
    const badFile = path.join(dir, "not-json.txt");
    writeFileSync(badFile, "not json at all {{{", "utf8");
    try {
      execFileSync(process.execPath, [SCRIPT, badFile], { encoding: "utf8" });
      assert.fail("must exit non-zero on unparseable input");
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(String(e.stderr), /failed to read\/parse/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI gha-step-summary.mjs exits 1 naming the missing fields on a schema-incomplete report", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-step-summary-schema-"));
  try {
    const badFile = path.join(dir, "malformed.json");
    writeFileSync(badFile, JSON.stringify({ ok: true }), "utf8");
    try {
      execFileSync(process.execPath, [SCRIPT, badFile], { encoding: "utf8" });
      assert.fail("must exit non-zero on a schema-incomplete report");
    } catch (e) {
      assert.equal(e.status, 1);
      assert.match(String(e.stderr), /tierReport\.tier/);
      assert.match(String(e.stderr), /findings/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI gha-step-summary.mjs exits 2 with a usage message when no file argument is given", () => {
  try {
    execFileSync(process.execPath, [SCRIPT], { encoding: "utf8" });
    assert.fail("must exit non-zero with no argument");
  } catch (e) {
    assert.equal(e.status, 2);
    assert.match(String(e.stderr), /usage/i);
  }
});

test("CLI gha-step-summary.mjs exits 2 on a non-positive-integer max-findings argument", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-step-summary-maxarg-"));
  try {
    const reportFile = path.join(dir, "gate.json");
    writeFileSync(reportFile, JSON.stringify(gateReport(PASSING_FIXTURE)), "utf8");
    try {
      execFileSync(process.execPath, [SCRIPT, reportFile, "not-a-number"], { encoding: "utf8" });
      assert.fail("must exit non-zero on a non-numeric max-findings argument");
    } catch (e) {
      assert.equal(e.status, 2);
      assert.match(String(e.stderr), /max-findings/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
