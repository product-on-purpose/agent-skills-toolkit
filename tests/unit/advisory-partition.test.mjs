import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runGate, gateExitFromFindings, sectionFindings, standardDebtLine, format,
  formatGithubAnnotations, formatAdvisorySection, buildJsonReport, parseArgs,
} from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

// ADR 0063 sec 1 and "What was considered and refused": advisory findings are never placed in
// findings[]. They carry reqId: null and their ID in advisoryId, but reqId: null protects nothing -
// tierForReq(null) is "universal", so a null-reqId finding at error severity INSIDE findings[] would
// gate at Bronze (exactly F-011's "the grader config drags the tier down" shape). The separate array,
// advisoryFindings, is the only protection, and this file is the test that proves it.
//
// This is the PARTITION TEST named in ADR 0063's Implementation sites. It is deliberately extensible:
// VERDICT_PATHS is a list of [name, deriveFn] pairs, one per verdict path already covered. A later stage
// (W5b) appends to this list rather than writing a new test file, so the whole set keeps running under
// one stub registration.
//
// SHOWN FAILING against the real production code, not just against a value built inline in the test
// (a guard that only ever asserts against its own fixture cannot prove anything about a regression):
// runGate's return was temporarily changed to `findings: [...resolved, ...(advisoryFindings ?? [])]`
// - merging the real, stamped advisoryFindings array (carrying advisoryId and reqId: null) into
// findings[], exactly the leak this partition exists to prevent. Captured, then reverted:
//   BEFORE (correct code): 12 tests, 12 pass, 0 fail.
//   AFTER  (mutant):       12 tests,  9 pass, 3 fail -
//     "partition: an error-severity stub advisory finding changes NO verdict path" (computeTierReport
//       went universal -> none, because tierForReq(null) buckets the leaked finding as Universal);
//     "partition: no element of findings[] carries an advisoryId, with the stub registered" (found
//       "ADV-STUB" where it expected undefined);
//     "partition GUARD CAN FAIL: merging the stub's finding into findings[] visibly changes the
//       verdict" (its own "before" assertion failed, because production had already leaked by then -
//       the strongest possible proof that the mutation moves the EARLIEST point in the pipeline).
// A guard that cannot fail is not a guard (RS-E4's criterion 2, reused by ADR 0063).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// A fixture that currently passes clean at its declared tier (Universal/Bronze), so a leaked
// null-reqId error has somewhere to go: a fixture already failing Bronze could not show the "before"
// state changing, because it already reports "none".
const FIXTURE = path.join(ROOT, "tests/fixtures/golden/minimal-skill");

/**
 * The stub advisory module (ADR 0063's "INJECTION POINT"). It is never written into
 * scripts/lib/advisory-registry.mjs and never gated by an environment variable - it is passed as a
 * plain parameter to runGate's `advisoryModules` option, which is exactly the injection point the ADR
 * asks for. `advisoryId` is deliberately NOT one of the real ADV1-ADV4 ids, so this test cannot be
 * mistaken for exercising a real screen.
 */
const STUB_ADVISORY_MODULE = {
  meta: { advisoryId: "ADV-STUB" },
  check: () => [
    { check: "stub-advisory", severity: "error", message: "stub advisory finding (test-only)", file: null, reqId: null },
  ],
};

function runWith(stubOn) {
  const ctx = loadPlugin(FIXTURE);
  const r = runGate(FIXTURE, ctx, { advisoryModules: stubOn ? [STUB_ADVISORY_MODULE] : [] });
  return { ctx, r };
}

// Every verdict path the implementation sites list names, covered so far (check.mjs's own functions,
// plus tier-report.mjs's computeTierReport). Each entry derives a verdict-shaped value from a runGate
// result; the test below asserts that value is IDENTICAL whether or not the stub fired.
const VERDICT_PATHS = [
  ["runGate: exitCode", (ctx, r) => r.exitCode],
  ["runGate: errorCount", (ctx, r) => r.errorCount],
  ["runGate: warnCount", (ctx, r) => r.warnCount],
  ["runGate: operatorErrorCount", (ctx, r) => r.operatorErrorCount],
  ["tier-report.mjs computeTierReport(root, ctx, r.findings)", (ctx, r) => computeTierReport(FIXTURE, ctx, r.findings)],
  ["gateExitFromFindings(r.findings, declaredTier)", (ctx, r) => gateExitFromFindings(r.findings, ctx?.library?.data?.tier)],
  ["sectionFindings(r.findings, declaredTier) counts", (ctx, r) => {
    const { grading, aboveTier } = sectionFindings(r.findings, ctx?.library?.data?.tier);
    return { grading: grading.length, aboveTier: aboveTier.length };
  }],
  ["format(r.findings, declaredTier)", (ctx, r) => format(r.findings, ctx?.library?.data?.tier)],
  ["standardDebtLine(r.findings, declaredTier)", (ctx, r) => standardDebtLine(r.findings, ctx?.library?.data?.tier)],
  ["formatGithubAnnotations(r.findings, declaredTier) - findings-derived lines only", (ctx, r) => formatGithubAnnotations(r.findings, ctx?.library?.data?.tier)],
  ["buildJsonReport: tierReport.tier, errorCount, exitCode", (ctx, r) => {
    const j = buildJsonReport(FIXTURE, ctx, r);
    return { tier: j.tierReport.tier, errorCount: j.errorCount, exitCode: j.exitCode, findingsLength: j.findings.length };
  }],
];

test("partition: the stub advisory module really fires (otherwise the rest of this test checks nothing)", () => {
  const { r } = runWith(true);
  assert.ok(Array.isArray(r.advisoryFindings), "advisoryFindings must be an array when the layer is on");
  assert.equal(r.advisoryFindings.length, 1);
  assert.equal(r.advisoryFindings[0].advisoryId, "ADV-STUB");
  assert.equal(r.advisoryFindings[0].reqId, null, "an advisory finding always carries reqId: null");
});

test("partition: an error-severity stub advisory finding changes NO verdict path", () => {
  const without = runWith(false);
  const withStub = runWith(true);
  for (const [name, derive] of VERDICT_PATHS) {
    assert.deepEqual(
      derive(withStub.ctx, withStub.r),
      derive(without.ctx, without.r),
      `${name} must be unchanged by the stub advisory module`
    );
  }
});

test("partition: no element of findings[] carries an advisoryId, with the stub registered", () => {
  const { r } = runWith(true);
  for (const f of r.findings) {
    assert.equal(f.advisoryId, undefined, `findings[] element "${f.check}" must not carry advisoryId`);
  }
});

// THE GUARD MUST BE SHOWN FAILING (ADR 0063, RS-E4's criterion 2 reused: "a guard that cannot fail is
// not a guard"). This simulates the exact defect the partition exists to prevent - an advisory finding
// leaking into findings[] - and proves that leak is NOT harmless just because the finding carries
// reqId: null. tierForReq(null) is "universal", so the leaked finding fails the fixture's own declared
// Bronze/Universal tier outright.
test("partition GUARD CAN FAIL: merging the stub's finding into findings[] visibly changes the verdict", () => {
  const { ctx, r } = runWith(true);
  const beforeTier = computeTierReport(FIXTURE, ctx, r.findings).tier;
  const beforeExit = gateExitFromFindings(r.findings, ctx?.library?.data?.tier).exitCode;
  assert.equal(beforeTier, "universal", "the unmodified fixture must satisfy its declared Bronze/Universal tier");
  assert.equal(beforeExit, 0, "the unmodified fixture must gate clean");

  // The leak: an advisory finding, at the effective severity it would carry if treated as a real
  // conformance finding, appended to findings[] exactly where a missed filter would put it.
  const leaked = [
    ...r.findings,
    ...r.advisoryFindings.map((f) => ({ ...f, severity: "error", effectiveSeverity: "error" })),
  ];
  const afterTier = computeTierReport(FIXTURE, ctx, leaked).tier;
  const afterExit = gateExitFromFindings(leaked, ctx?.library?.data?.tier).exitCode;

  // The exact before/after lines (ADR 0063 Implementation sites, "Required tests"):
  //   before: tier="universal" exitCode=0
  //   after:  tier="none"      exitCode=1
  assert.equal(afterTier, "none", "a leaked null-reqId error buckets as Universal and fails the declared tier");
  assert.equal(afterExit, 1, "a leaked null-reqId error at effective severity error must fail the gate");
  assert.notEqual(afterTier, beforeTier);
  assert.notEqual(afterExit, beforeExit);
});

// --- --no-advisory: the flag, the field, and that it changes nothing else ---

test("parseArgs recognizes --no-advisory, defaulting to false", () => {
  assert.equal(parseArgs(["some/root"]).noAdvisory, false);
  assert.equal(parseArgs(["some/root", "--no-advisory"]).noAdvisory, true);
});

test("runGate: advisoryLayer is 'on' by default and advisoryFindings is an array (empty - no real modules ship yet)", () => {
  const r = runGate(FIXTURE);
  assert.equal(r.advisoryLayer, "on");
  assert.deepEqual(r.advisoryFindings, []);
});

test("runGate: --no-advisory sets advisoryLayer to 'off' and advisoryFindings to null, changing no other field", () => {
  const on = runGate(FIXTURE);
  const off = runGate(FIXTURE, undefined, { noAdvisory: true });
  assert.equal(off.advisoryLayer, "off");
  assert.equal(off.advisoryFindings, null);
  assert.equal(off.exitCode, on.exitCode);
  assert.equal(off.errorCount, on.errorCount);
  assert.equal(off.warnCount, on.warnCount);
  assert.deepEqual(off.findings, on.findings);
});

test("runGate: a house-provenance ADV id does not run under plain-plugin (profile advisory off-set)", () => {
  const stubHouse = { meta: { advisoryId: "ADV4" }, check: () => [{ check: "stub", severity: "warn", message: "m", file: null, reqId: null }] };
  const underLibrary = runGate(FIXTURE, undefined, { advisoryModules: [stubHouse] });
  const underPlain = runGate(FIXTURE, undefined, { profile: "plain-plugin", advisoryModules: [stubHouse] });
  assert.equal(underLibrary.advisoryFindings.length, 1, "ADV4 runs under the default askit-library profile");
  assert.equal(underPlain.advisoryFindings.length, 0, "ADV4 (house provenance) is off under plain-plugin");
});

test("buildJsonReport carries advisoryLayer and advisoryFindings straight from runGate", () => {
  const ctx = loadPlugin(FIXTURE);
  const r = runGate(FIXTURE, ctx);
  const j = buildJsonReport(FIXTURE, ctx, r);
  assert.equal(j.advisoryLayer, r.advisoryLayer);
  assert.deepEqual(j.advisoryFindings, r.advisoryFindings);
});

// --- renderers: text section and --gha ::notice lines (exercised directly; the real registry ships no
// module yet, so a live fixture run never has anything to render) ---

test("formatAdvisorySection renders a section after the conformance findings; '' when off or empty", () => {
  assert.equal(formatAdvisorySection(null), "", "advisoryLayer off (null) renders nothing");
  assert.equal(formatAdvisorySection([]), "", "layer on with nothing found renders nothing");
  const out = formatAdvisorySection([
    { advisoryId: "ADV1", provenance: "vendor-cited", message: "frontmatter key outside the Skills API whitelist", file: "skills/x/SKILL.md" },
  ]);
  assert.match(out, /^\nAdvisory \(informational/);
  assert.match(out, /\[advisory\/vendor-cited\] ADV1: frontmatter key outside the Skills API whitelist {2}-> skills\/x\/SKILL\.md/);
});

test("formatGithubAnnotations renders advisory findings as ::notice lines, separate from findings[]", () => {
  const out = formatGithubAnnotations([], undefined, [
    { advisoryId: "ADV2", message: "subagent skills: list exceeds the 32-skill preload cap", file: "agents/x.md" },
  ]);
  assert.match(out, /^::notice file=agents\/x\.md::advisory \(ADV2\): subagent skills: list exceeds the 32-skill preload cap$/);
});

test("formatGithubAnnotations defaults advisoryFindings to empty (existing 2-arg callers are unaffected)", () => {
  const findings = [{ check: "c", severity: "error", effectiveSeverity: "error", message: "boom", file: "a.md", reqId: "U6" }];
  const out = formatGithubAnnotations(findings, undefined);
  assert.equal(out, "::error file=a.md::c (U6): boom");
});
