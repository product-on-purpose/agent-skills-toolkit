import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { SEVERITY_ORDER, classifyAudit, formatVerdict } from "../../scripts/lib/audit-report.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const CLI = path.join(REPO, "scripts/audit-deps.mjs");
const FIX = path.join(REPO, "tests/fixtures/audit-deps");

const fixture = (name) => readFileSync(path.join(FIX, name), "utf8");

/** Classify a captured stdout exactly as the CLI does: npm exits 1 for BOTH outcomes we must tell apart. */
const classifyFixture = (name, opts = {}) =>
  classifyAudit({ stdout: fixture(name), stderr: "", status: 1, ...opts }, { level: opts.level ?? "high" });

// ---------------------------------------------------------------------------------------------
// The three outage shapes below are CAPTURED, not invented. Two came off the runs that reded
// `main` on 2026-09-03 (issue #310) and one off a local run against a dead registry:
//
//   outage-400-quick.json   validate (22.12.0), run 33823170019 - 400 on /security/audits/quick
//   outage-503-bulk.json    validate (24),      run 33822004450 - 503 on /security/advisories/bulk
//   outage-econnrefused.json  local `npm audit --json --registry=http://127.0.0.1:9`
//
// Three error strings across two endpoints, so the error TEXT is not the discriminator. What every
// one of them shares is that no report body came back, and that is what this classifies on.
// ---------------------------------------------------------------------------------------------

test("#310: a 503 from the bulk advisory endpoint is UNREACHABLE (exit 2), not a vulnerability", () => {
  const v = classifyFixture("outage-503-bulk.json");
  assert.equal(v.code, 2, "an npm outage must not read as a finding about this repository");
  assert.match(v.reason, /Service Unavailable/, "npm's own words are echoed, so the log says what happened");
});

test("#310: a 400 from the retiring quick endpoint is UNREACHABLE (exit 2)", () => {
  const v = classifyFixture("outage-400-quick.json");
  assert.equal(v.code, 2);
  assert.match(v.reason, /Bad Request/);
});

test("#310: a refused connection is UNREACHABLE (exit 2)", () => {
  const v = classifyFixture("outage-econnrefused.json");
  assert.equal(v.code, 2);
  assert.match(v.reason, /ECONNREFUSED/);
});

test("#310: output that is not JSON at all is UNREACHABLE (exit 2), never a silent pass", () => {
  // npm has printed plain text on stdout before it has a report to serialize. Unparseable is a
  // refusal, and a refusal is never a pass - the vendor-watch posture, applied here.
  const v = classifyAudit({ stdout: "npm error audit endpoint returned an error\n", stderr: "", status: 1 }, {});
  assert.equal(v.code, 2);
});

test("#310: npm failing to spawn at all is UNREACHABLE (exit 2)", () => {
  const v = classifyAudit({ stdout: "", stderr: "", status: null, spawnError: "spawn npm ENOENT" }, {});
  assert.equal(v.code, 2);
  assert.match(v.reason, /ENOENT/);
});

// ---------------------------------------------------------------------------------------------
// The guard must still BLOCK on the thing it exists to catch. A check that cannot be shown failing
// is not a check, and "makes the outage non-blocking" is worthless if it made everything non-blocking.
// ---------------------------------------------------------------------------------------------

test("#310: a real high-severity advisory still BLOCKS (exit 1)", () => {
  const v = classifyFixture("vulnerable-high.json");
  assert.equal(v.code, 1, "a genuine high-severity vulnerability must still red the job");
  assert.match(v.reason, /high/);
});

test("#310: a critical advisory blocks at the default level", () => {
  const report = JSON.parse(fixture("vulnerable-high.json"));
  report.metadata.vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 1, total: 1 };
  const v = classifyAudit({ stdout: JSON.stringify(report), stderr: "", status: 1 }, { level: "high" });
  assert.equal(v.code, 1, "critical is ABOVE the high threshold, so the comparison must be >=, not ==");
});

test("#310: findings BELOW the threshold do not block", () => {
  const v = classifyFixture("vulnerable-moderate-only.json");
  assert.equal(v.code, 0, "--audit-level=high is the shipped posture; moderate is reported, not gated");
  assert.match(v.reason, /moderate/, "the count is still stated, so a non-blocking finding is not invisible");
});

test("#310: a clean audit passes (exit 0)", () => {
  const v = classifyAudit({ stdout: fixture("clean.json"), stderr: "", status: 0 }, {});
  assert.equal(v.code, 0);
});

// ---------------------------------------------------------------------------------------------
// The collision that IS the defect.
// ---------------------------------------------------------------------------------------------

test("#310: the exit STATUS cannot tell the two apart, so the body must decide", () => {
  // `npm audit --json` exits 1 for a vulnerability AND exits 1 for a registry outage. Both fixtures
  // below are classified from an identical status of 1 and reach opposite verdicts. This is the
  // whole reason a script exists rather than a bare `npm audit --audit-level=high` step.
  const outage = classifyAudit({ stdout: fixture("outage-503-bulk.json"), stderr: "", status: 1 }, {});
  const vuln = classifyAudit({ stdout: fixture("vulnerable-high.json"), stderr: "", status: 1 }, {});
  assert.equal(outage.code, 2);
  assert.equal(vuln.code, 1);
});

test("#310: severity order is ascending, so >= threshold means 'at least as severe'", () => {
  assert.deepEqual(SEVERITY_ORDER, ["info", "low", "moderate", "high", "critical"]);
});

test("#310: an unknown --level is rejected rather than silently gating nothing", () => {
  // A typo'd threshold that quietly matched no severity would be a guard that cannot fail.
  const v = classifyAudit({ stdout: fixture("vulnerable-high.json"), stderr: "", status: 1 }, { level: "High" });
  assert.equal(v.code, 2);
  assert.match(v.reason, /level/i);
});

// ---------------------------------------------------------------------------------------------
// The CLI contract the workflow depends on.
// ---------------------------------------------------------------------------------------------

test("#310: the verdict text names the exit code's MEANING, not just its number", () => {
  const out = formatVerdict({ code: 2, reason: "npm said: Service Unavailable" });
  assert.match(out, /could not be (read|reached|performed)/i);
  assert.doesNotMatch(out, /vulnerab/i, "an outage report must not use the word a real finding uses");
});

test("#310: --help exits 0 and states all three exit codes", () => {
  const r = spawnSync(process.execPath, [CLI, "--help"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0);
  const text = `${r.stdout}${r.stderr}`;
  assert.match(text, /\b0\b/);
  assert.match(text, /\b1\b/);
  assert.match(text, /\b2\b/);
});

test("#310: --report <file> classifies a captured report without touching the network", () => {
  // The offline path is what makes the outage reproducible in a test at all, and it is how a
  // maintainer re-checks a run that already happened.
  const r = spawnSync(process.execPath, [CLI, "--report", path.join(FIX, "outage-503-bulk.json")], {
    cwd: REPO,
    encoding: "utf8",
  });
  assert.equal(r.status, 2, `expected the outage exit; got ${r.status}\n${r.stdout}${r.stderr}`);
});

test("#310: --report on a genuine finding exits 1", () => {
  const r = spawnSync(process.execPath, [CLI, "--report", path.join(FIX, "vulnerable-high.json")], {
    cwd: REPO,
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
});

test("#310: --report on a clean report exits 0", () => {
  const r = spawnSync(process.execPath, [CLI, "--report", path.join(FIX, "clean.json")], {
    cwd: REPO,
    encoding: "utf8",
  });
  assert.equal(r.status, 0);
});

// ---------------------------------------------------------------------------------------------
// The workflow half of the defect: the audit skipped the suite and the gate.
// ---------------------------------------------------------------------------------------------

test("#310: ci.yml runs the audit AFTER the tests and the conformance gate", () => {
  // The exit-code split fixes the verdict; it does not fix the ORDERING. On 2026-09-03 the audit
  // failing skipped `Unit tests`, `Coverage report` and `Conformance gate` outright, so a required
  // check went red on a run that never graded the repository at all.
  const ci = readFileSync(path.join(REPO, ".github/workflows/ci.yml"), "utf8");
  const validate = ci.slice(ci.indexOf("\n  validate:"), ci.indexOf("\n  validate-windows:"));
  assert.ok(validate.length > 0, "could not locate the validate job");

  const at = (needle) => {
    const i = validate.indexOf(needle);
    assert.ok(i !== -1, `validate job has no step matching ${needle}`);
    return i;
  };
  assert.ok(at("Unit tests") < at("Audit dependencies"), "the suite must run before the audit");
  assert.ok(
    at("Conformance gate") < at("Audit dependencies"),
    "the conformance gate must run before the audit, so an audit problem can never skip it",
  );
});

test("#310: ci.yml audits through the script, not through a bare npm audit", () => {
  // Standard sec 4.1/4.4: the decision belongs in a portable script the workflow invokes, never in
  // the YAML. A bare `npm audit --audit-level=high` step cannot make the split at all.
  const ci = readFileSync(path.join(REPO, ".github/workflows/ci.yml"), "utf8");
  assert.doesNotMatch(ci, /run:\s*npm audit/, "the bare audit step is what issue #310 removed");
  assert.match(ci, /scripts\/audit-deps\.mjs/);
});
