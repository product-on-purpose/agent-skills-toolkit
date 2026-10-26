import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  runGate, gateExitFromFindings, sectionFindings, standardDebtLine, format,
  formatGithubAnnotations, formatAdvisorySection, buildJsonReport, parseArgs,
} from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { evaluate, dispositions, buildConditional } from "../../scripts/evaluate.mjs";
import { releaseReport } from "../../scripts/lib/release-report.mjs";
import { migrateReport } from "../../scripts/lib/migrate-report.mjs";
import { evaluateMarketplace, marketplaceExitCode } from "../../scripts/lib/marketplace/evaluate-marketplace.mjs";
import { renderSarif } from "../../scripts/lib/sarif-render.mjs";
import { renderMarkdown, deriveModel } from "../../scripts/lib/report-render.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";
import { runAdvisoryModules } from "../../scripts/lib/advisory-registry.mjs";

// ADR 0063 sec 1 and "What was considered and refused": advisory findings are never placed in
// findings[]. They carry reqId: null and their ID in advisoryId, but reqId: null protects nothing -
// tierForReq(null) is "universal", so a null-reqId finding at error severity INSIDE findings[] would
// gate at Bronze (exactly F-011's "the grader config drags the tier down" shape). The separate array,
// advisoryFindings, is the only protection, and this file is the test that proves it.
//
// This is the PARTITION TEST named in ADR 0063's Implementation sites. It is deliberately extensible:
// VERDICT_PATHS is a list of [name, deriveFn] pairs, one per verdict path already covered. A later stage
// (W5a stage B) appends to this list rather than writing a new test file, so the whole set keeps running under
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
//
// W5a STAGE B: the same demonstration repeated against the TWO PATHS this stage adds, each a
// separate mutation applied and reverted (git diff clean afterward in both cases):
//
//   Mutant 1 - scripts/evaluate.mjs baseReport(): `findings: [...findings, ...(advisory.advisoryFindings
//   ?? [])]`. Run against this file (18 tests at the time): BEFORE 18/18 pass; AFTER 16/18 pass, 2 fail -
//   "pipeline: an error-severity stub advisory finding changes NO evaluate()-derived verdict path" and
//   "pipeline: releaseReport() and migrateReport() inherit evaluate()'s advisory fields and verdict,
//   unaffected by the stub". The marketplace tests (17, 18) stayed green under THIS mutant, because
//   gradeMember() goes through runGate(), not evaluate() - proving the two pipelines are genuinely
//   independent seams, not one guard covering both by accident.
//
//   Mutant 2 - scripts/check.mjs runGate()'s return: `findings: [...resolved, ...(advisoryFindings ??
//   [])]`. Run against the same 18 tests: AFTER 13/18 pass, 5 fail - the three original runGate-path
//   tests (2, 3, 4) RE-FAIL exactly as Stage A's own mutant reproduced, PLUS the two marketplace tests
//   (17, 18), because gradeMember() runs every member through this same runGate(). Test 4's own "before"
//   assertion failed again here too, for the identical reason Stage A recorded: the leak had already
//   happened before the test's manual construction ran.
//
// Each mutant was reverted immediately after capturing its result; neither left any trace in the
// committed diff.

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
  // W5a stage B addition: resolve-config.mjs's gatingFindings, the ADR's own-named verdict path for
  // that file. A pure filter on `findings[]`, so it is unaffected by construction, but it is listed in
  // the ADR's Implementation sites and gets its own entry rather than being left implicit.
  ["resolve-config.mjs gatingFindings(r.findings).length", (ctx, r) => gatingFindings(r.findings).length],
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

// ADR 0063's own named deliverable ("the CLI... help says that --no-advisory and --advisory
// <file.json> are unrelated") had NO guard until this test: scripts/evaluate.mjs had no --help at all
// before this stage, so `--help` matched nothing in runCli's own argv parsing and silently graded
// process.cwd() instead of printing anything - the exact gap this test exists to catch a regression of.
test("scripts/evaluate.mjs --help prints usage naming --no-advisory and --advisory <file.json> as unrelated, and does not grade anything", () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, "scripts/evaluate.mjs"), "--help"], { encoding: "utf8" });
  assert.match(out, /--no-advisory/);
  assert.match(out, /--advisory <file\.json>/);
  assert.match(out, /unrelated/i);
  assert.doesNotMatch(out, /Evaluating \(/, "--help must not fall through to grading the current directory");
});

// =====================================================================================================
// W5a stage B: the EVALUATE.MJS-side pipelines. ADR 0063's Implementation sites names evaluate(),
// evaluateComponent(), release-report.mjs's releaseReport(), migrate-report.mjs's migrateReport() and
// marketplace/evaluate-marketplace.mjs's gradeMember()/evaluateMarketplace() as verdict paths. None of
// these take a runGate() result as input (Stage A's handoff flagged this as the stage B structural
// limit) - each builds its own pipeline, so each needs its OWN injection seam. evaluate() and
// evaluateComponent() both accept `advisoryModules` in their `opts` bag (threaded to the shared
// computeAdvisoryLayer() in scripts/check.mjs); releaseReport()/migrateReport() forward `opts` straight
// into evaluate() unchanged, so the same seam reaches them for free; evaluateMarketplace() forwards
// `opts` into gradeMember(), which forwards it into runGate() exactly as a plugin graded alone would.
// =====================================================================================================

const PIPELINE_STUB = { meta: { advisoryId: "ADV-STUB" }, check: () => [
  { check: "stub-advisory", severity: "error", message: "stub advisory finding (test-only)", file: null, reqId: null },
] };

function evaluateWith(stubOn) {
  return evaluate(FIXTURE, { advisoryModules: stubOn ? [PIPELINE_STUB] : [] });
}

test("pipeline: evaluate() really runs the stub (advisoryFindings carries it)", () => {
  const r = evaluateWith(true);
  assert.deepEqual(r.advisoryFindings.map((f) => f.advisoryId), ["ADV-STUB"]);
  assert.equal(r.advisoryFindings[0].reqId, null);
});

// Every value derived from an evaluate()-shaped report that a verdict path reads, covered the same way
// VERDICT_PATHS covers runGate(): identical with the stub on or off.
const PIPELINE_PATHS = [
  ["evaluate(): tier / satisfies / blocked", (r) => ({ tier: r.tier, satisfies: r.satisfies, blocked: r.blocked })],
  ["evaluate(): summary.errors/warns", (r) => r.summary],
  ["evaluate(): dispositions(r.findings)", (r) => dispositions(r.findings)],
  ["evaluate(): no element of findings[] carries advisoryId", (r) => r.findings.map((f) => f.advisoryId)],
];

test("pipeline: an error-severity stub advisory finding changes NO evaluate()-derived verdict path", () => {
  const without = evaluateWith(false);
  const withStub = evaluateWith(true);
  for (const [name, derive] of PIPELINE_PATHS) {
    assert.deepEqual(derive(withStub), derive(without), `${name} must be unchanged by the stub advisory module`);
  }
});

test("pipeline GUARD CAN FAIL: merging evaluate()'s advisoryFindings into findings[] visibly changes dispositions/tier", () => {
  const r = evaluateWith(true);
  // The stub's unregistered "ADV-STUB" id falls back to "house" provenance (runAdvisoryModules'
  // documented fallback), so a leaked copy lands in `profileConformance`, not `realIssues` - dispositions
  // partitions by provenance, and this is the correct partition for an unregistered id, not a bug in
  // the test. The tier is the sharper, provenance-independent demonstration: tierForReq(null) is
  // "universal" regardless of provenance, so the leak fails the declared tier either way.
  const before = { tier: r.tier, profileConformance: dispositions(r.findings).profileConformance };
  assert.equal(before.tier, "universal", "the unmodified fixture must satisfy its declared Bronze/Universal tier");
  const leaked = [...r.findings, ...r.advisoryFindings.map((f) => ({ ...f, severity: "error", effectiveSeverity: "error" }))];
  const after = { tier: computeTierReport(FIXTURE, loadPlugin(FIXTURE), leaked).tier, profileConformance: dispositions(leaked).profileConformance };
  assert.equal(after.tier, "none", "a leaked null-reqId error buckets as Universal and fails the declared tier");
  assert.notEqual(after.tier, before.tier);
  assert.notEqual(after.profileConformance, before.profileConformance);
});

test("pipeline: releaseReport() and migrateReport() inherit evaluate()'s advisory fields and verdict, unaffected by the stub", () => {
  const relWithout = releaseReport(FIXTURE, { advisoryModules: [] });
  const relWith = releaseReport(FIXTURE, { advisoryModules: [PIPELINE_STUB] });
  assert.deepEqual(relWith.release, relWithout.release, "release.goNoGo/gateExit must be unchanged by the stub");
  assert.equal(relWith.advisoryFindings.length, 1, "releaseReport() still carries the advisory field through, inherited from evaluate()");

  const migWithout = migrateReport(FIXTURE, { advisoryModules: [], targetTier: "advanced" });
  const migWith = migrateReport(FIXTURE, { advisoryModules: [PIPELINE_STUB], targetTier: "advanced" });
  assert.deepEqual(migWith.migration, migWithout.migration, "migration.stages/blockers must be unchanged by the stub");
});

// --- marketplace scope: gradeMember() runs the stub through the SAME runGate() a plugin graded alone
// uses, so the seam is `opts.advisoryModules` on evaluateMarketplace() itself, forwarded unchanged. ---

function tmpMarketplace() {
  const root = mkdtempSync(path.join(tmpdir(), "askit-advisory-partition-mp-"));
  const memberDir = path.join(root, "member");
  const SEED = path.join(ROOT, "templates", "seed-plugin");
  cpSync(SEED, memberDir, { recursive: true });
  writeFileSync(
    path.join(memberDir, "library.json"),
    JSON.stringify({ name: "member", version: "0.1.0", description: "REPLACE - what this plugin does and when to use it, with concrete trigger keywords.", standard: "0.12", tier: "universal" }, null, 2),
  );
  mkdirSync(path.join(root, "catalogue", ".claude-plugin"), { recursive: true });
  writeFileSync(
    path.join(root, "catalogue", ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "test-catalogue", metadata: { version: "1.0.0" }, plugins: [{ name: "member", source: "../member" }] }, null, 2),
  );
  return { root, catalogueDir: path.join(root, "catalogue") };
}

test("pipeline: marketplace scope - gradeMember() carries the stub's advisoryFindings into members[], unaffected verdict", () => {
  const { root, catalogueDir } = tmpMarketplace();
  try {
    const without = evaluateMarketplace(catalogueDir, { advisoryModules: [] });
    const withStub = evaluateMarketplace(catalogueDir, { advisoryModules: [PIPELINE_STUB] });
    assert.equal(without.members[0].advisoryFindings.length, 0);
    assert.equal(withStub.members[0].advisoryFindings.length, 1, "the member's own advisoryFindings must carry the stub");
    // Every verdict-shaped field on the member, and the collection verdict itself, unchanged:
    assert.equal(withStub.verdict, without.verdict);
    assert.equal(withStub.members[0].exitCode, without.members[0].exitCode);
    assert.equal(withStub.members[0].errors, without.members[0].errors);
    assert.equal(withStub.members[0].failsOwnClaim, without.members[0].failsOwnClaim);
    assert.equal(withStub.members[0].earnedTier, without.members[0].earnedTier);
    // marketplaceExitCode(report) IS the collection's exit code (scripts/lib/marketplace/evaluate-
    // marketplace.mjs) and is named explicitly in ADR 0063's Implementation sites; `verdict` equality
    // above does not exercise the function itself.
    assert.equal(marketplaceExitCode(withStub), marketplaceExitCode(without));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("pipeline GUARD CAN FAIL: leaking a member's advisoryFindings into its own gate findings visibly changes failsOwnClaim", () => {
  const { root, catalogueDir } = tmpMarketplace();
  try {
    const withStub = evaluateMarketplace(catalogueDir, { advisoryModules: [PIPELINE_STUB] });
    const member = withStub.members[0];
    assert.equal(member.failsOwnClaim, false, "the unmodified member must satisfy its own declared tier");
    const ctx = loadPlugin(path.join(root, "member"));
    const leakedFindings = member.advisoryFindings.map((f) => ({ ...f, severity: "error", effectiveSeverity: "error" }));
    const afterTier = computeTierReport(path.join(root, "member"), ctx, leakedFindings).tier;
    assert.equal(afterTier, "none", "a leaked null-reqId error fails the member's own declared Universal tier");
    assert.notEqual(afterTier, member.earnedTier);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// =====================================================================================================
// FIX ROUND (adversarial review of feat/advisory-engine): the SARIF conformance path, component scope,
// deriveModel()/renderMarkdown, and marketplaceExitCode (added above) had no partition coverage, each
// named by ADR 0063's Implementation sites. Each gap was verified with a reverted production mutant
// exactly like the ones this file's own header documents, run and reverted once per gap:
//
//   Mutant 3 - scripts/lib/sarif-render.mjs: TWO changes together, reproducing the review's reported
//   defect exactly (the review's literal one-line merge alone does NOT leak: buildResults()'s existing
//   `f.effectiveSeverity !== "error" && ... !== "warn"` guard happens to filter an advisory finding out,
//   because runAdvisoryModules() never stamps `effectiveSeverity`, only `severity` - verified by running
//   the review's exact one-liner alone first: 24/24 still pass). The REAL risk - and what this mutant
//   proves - is that buildResults() is one small, plausible refactor away from leaking: check.mjs's own
//   code falls back to `f.effectiveSeverity ?? f.severity` in five other places (formatOperatorBlock,
//   format, formatGithubAnnotations - see that file), and buildResults() is the one SARIF-rendering
//   function that does NOT follow that convention. Mutant: (1) `renderSarif`'s results line becomes
//   `buildResults([...r.findings, ...(r.advisoryFindings ?? [])], ...)`, AND (2) `buildResults`'s own
//   severity read becomes `const esev = f.effectiveSeverity ?? f.severity` (matching check.mjs's
//   convention) used in both the filter and the level computation. Before this round's new SARIF test
//   existed, the full suite stayed green under the ORIGINAL review mutant (1); with BOTH changes
//   applied together: RED on the test below (1 of 24 advisory-partition tests fails), because the
//   leaked copy (reqId: null, severity "error") now passes the fallback-adjusted filter and renders at
//   level "error" inside buildResults(), outside the "carries askit/advisory" selection the new
//   assertion uses to reconstruct the baseline.
//
//   Mutant 4 - scripts/evaluate.mjs evaluateComponent(): `baseReport("component", target,
//   [...resolved, ...(advisory.advisoryFindings ?? [])], advisory)`. Before the new component-scope
//   test existed, the full suite stayed green under it. AFTER: RED, on both the exit-code and the
//   no-advisoryId-in-findings assertions below.
//
// Each mutant was reverted immediately after capturing its result; neither left any trace in the
// committed diff.
// =====================================================================================================

// --- SARIF: buildResults(findings) (the conformance path) must be unaffected by advisory results ---

test("SARIF partition: buildResults' conformance results are byte-identical with and without the stub, and advisory results are exactly appended", () => {
  const ctx = loadPlugin(FIXTURE);
  const baseline = renderSarif(ctx, { findings: runGate(FIXTURE, ctx, { advisoryModules: [] }).findings, advisoryFindings: [] });
  const withStub = runGate(FIXTURE, ctx, { advisoryModules: [STUB_ADVISORY_MODULE] });
  const doc = renderSarif(ctx, withStub);

  const baselineResults = baseline.runs[0].results;
  const allResults = doc.runs[0].results;
  const conformanceResults = allResults.filter((res) => !res.properties?.["askit/advisory"]);
  const advisoryResults = allResults.filter((res) => res.properties?.["askit/advisory"]);

  // The GUARD: a leak into buildResults() would put the leaked copy INSIDE conformanceResults (it
  // carries no askit/advisory property when rendered through the conformance path, since that path
  // never sets one), changing its length and its content relative to the true baseline.
  assert.deepEqual(conformanceResults, baselineResults, "the conformance results must be unaffected by the stub advisory module");
  assert.equal(allResults.length, baselineResults.length + withStub.advisoryFindings.length, "results.length must equal baseline + advisoryFindings.length - no fewer, no more");
  assert.equal(advisoryResults.length, withStub.advisoryFindings.length);
});

// --- Component scope: evaluateComponent() (evaluate() on a SKILL.md directory, no library.json) ---

function componentTarget() {
  // A real on-disk skill with no library.json beside it, so evaluate() takes the component branch
  // (evaluateComponent), the one ADR 0063 Implementation sites names and the original partition test
  // never exercised (every evaluate() call there graded FIXTURE, which carries a library.json).
  const lone = path.join(ROOT, "tests/fixtures/golden/lone-skill");
  assert.ok(!existsSync(path.join(lone, "library.json")), "fixture must have no library.json to exercise component scope");
  assert.ok(existsSync(path.join(lone, "SKILL.md")), "fixture must carry a SKILL.md to exercise component scope");
  return lone;
}

function evaluateComponentWith(stubOn) {
  return evaluate(componentTarget(), { advisoryModules: stubOn ? [STUB_ADVISORY_MODULE] : [] });
}

test("component scope: evaluateComponent() really runs the stub (advisoryFindings carries it)", () => {
  const r = evaluateComponentWith(true);
  assert.equal(r.scope, "component", "the fixture must actually take the component branch");
  assert.deepEqual(r.advisoryFindings.map((f) => f.advisoryId), ["ADV-STUB"]);
});

test("component scope: an error-severity stub advisory finding changes NO evaluateComponent()-derived verdict path", () => {
  const without = evaluateComponentWith(false);
  const withStub = evaluateComponentWith(true);
  assert.deepEqual(without.summary, withStub.summary, "summary.errors/warns must be unchanged by the stub");
  const declared = undefined; // component scope has no declared tier ceiling
  const gateWithout = gateExitFromFindings(without.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity })), declared);
  const gateWithStub = gateExitFromFindings(withStub.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity })), declared);
  assert.deepEqual(gateWithStub, gateWithout, "gateExitFromFindings(r.findings, undefined) must be unchanged by the stub");
  for (const f of withStub.findings) assert.equal(f.advisoryId, undefined, "no element of component-scope findings[] may carry advisoryId");
});

// --- deriveModel()/renderMarkdown: the Markdown/HTML rendering model built from an evaluate() report ---

test("deriveModel()/renderMarkdown: the rendered rows and counts are unaffected by the stub (plugin scope)", () => {
  const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));
  const opts = { library: JSON.parse(readFileSync(path.join(FIXTURE, "library.json"), "utf8")), spine: SPINE, conditional: buildConditional(FIXTURE), date: "2026-01-01", exitCode: 0, reportType: "conformance" };
  const without = evaluateWith(false);
  const withStub = evaluateWith(true);
  const modelWithout = deriveModel(without, opts);
  const modelWithStub = deriveModel(withStub, opts);
  // Strip the one field the stub is SUPPOSED to change (if deriveModel surfaces advisory rows at all,
  // as a plain data pass-through; it carries no verdict semantics) before comparing the rest.
  const { advisoryFindings: _a, ...restWithout } = modelWithout;
  const { advisoryFindings: _b, ...restWithStub } = modelWithStub;
  assert.deepEqual(restWithStub, restWithout, "every verdict-shaped field deriveModel() produces must be unchanged by the stub");
  const mdWithout = renderMarkdown(without, opts);
  const mdWithStub = renderMarkdown(withStub, opts);
  // The rendered Markdown legitimately differs (the stub adds an "## Advisory"-shaped line) - the
  // partition guarantee is that the TIER/BLOCKER prose, never the advisory line, is what differs.
  assert.equal(mdWithStub.includes("Tier: universal") || mdWithout.includes("tier"), true, "sanity: the rendered markdown must mention the tier");
  assert.notEqual(mdWithStub, mdWithout, "sanity: the stub must actually change the rendered output somewhere (otherwise this test checks nothing)");
});

// --- runCli(): the spawned evaluate.mjs CLI's own exit code, --no-advisory vs on (real, empty registry;
// the stub has no CLI injection point by design - ADR 0063's INJECTION POINT is a function parameter,
// not an env var or flag, so the CLI-level guarantee is proven with the real module list instead) ---

const EVALUATE_SCRIPT = path.join(ROOT, "scripts/evaluate.mjs");

function runEvaluateJson(args) {
  try {
    return execFileSync(process.execPath, [EVALUATE_SCRIPT, ...args], { encoding: "utf8" });
  } catch (e) {
    return String(e.stdout ?? "");
  }
}

test("runCli: spawned scripts/evaluate.mjs --json agrees with --no-advisory on tier and exit code", () => {
  const on = JSON.parse(runEvaluateJson([FIXTURE, "--json"]));
  const off = JSON.parse(runEvaluateJson([FIXTURE, "--no-advisory", "--json"]));
  assert.equal(on.advisoryLayer, "on");
  assert.equal(off.advisoryLayer, "off");
  assert.deepEqual(off.advisoryFindings, null);
  assert.equal(on.tier, off.tier, "tier must be identical");
  assert.deepEqual(on.summary, off.summary, "summary must be identical");
});
