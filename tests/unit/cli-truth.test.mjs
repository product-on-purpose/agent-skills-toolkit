import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import {
  runGate,
  sectionFindings,
  formatOperatorBlock,
  formatGithubAnnotations,
  hintsFor,
} from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";
import { loadConfig, CONFIG_FILENAME, configFrom, ORIGIN, withGraderOptions } from "../../scripts/lib/config.mjs";
import { isOperatorFinding } from "../../scripts/lib/findings.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

// WS-D, CLI TRUTH: the two places the gate told a user something false about their own work.
//
// F-011 (the grader config drags the tier down): a syntax error in askit.config.json - the file that
// selects the RUBRIC, not the plugin's content - was an ordinary finding with a null reqId. tierForReq
// buckets a null reqId as `universal`, so a trailing comma in the operator's own config took a
// conforming Bronze plugin to "Tier: None" and exit 1. Measured before the fix, on a clone of
// golden/minimal-skill: Tier Universal / 0 errors / exit 0 became Tier None / 1 error / exit 1, with
// not one byte of the plugin changed.
//
// F-037 / B-07 (a folder of loose skills gets a wall of Gold): pointing the gate at a directory with no
// library.json grades it against the full askit ladder. Measured before the fix, on two loose skills:
// seven [error/house] lines, five of them Gold requirements, and no mention anywhere in the output that
// the `plain-plugin` profile exists for exactly this case. The same tree under `--profile plain-plugin`
// reported 0 errors, exit 0.
//
// Every assertion below fails if its fix is reverted; each test names the specific reversion.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(ROOT, "tests/fixtures");

function withTmp(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-cli-truth-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A clone of the golden conformant plugin, so any movement is attributable to what the test wrote. */
function withMinimalPlugin(fn) {
  return withTmp((dir) => {
    cpSync(path.join(FIXTURES, "golden/minimal-skill"), dir, { recursive: true });
    return fn(dir);
  });
}

/** A plain plugin: two loose skills, no library.json, no AGENTS.md - the F-037 shape. */
function withLooseSkills(fn) {
  return withTmp((dir) => {
    for (const name of ["do-thing", "other-thing"]) {
      mkdirSync(path.join(dir, "skills", name), { recursive: true });
      writeFileSync(
        path.join(dir, "skills", name, "SKILL.md"),
        `---\nname: ${name}\ndescription: Converts a list of tasks into a prioritized plan. Use when the user asks to order, rank, or sequence work items by priority.\nmetadata:\n  version: 0.1.0\n---\n# ${name}\nSteps the agent follows.\n`
      );
    }
    return fn(dir);
  });
}

function runCliScript(script, args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, [path.join(ROOT, script), ...args], { encoding: "utf8" }), stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}
const runCli = (args) => runCliScript("scripts/check.mjs", args);

const BROKEN_JSON = '{ "profile": "plain-plugin",\n';

// --- F-011: a broken grader config is an operator error, not a conformance defect ------------------

test("F-011 (the grader config drags the tier down): a malformed askit.config.json moves NO part of the grade", () => {
  withMinimalPlugin((dir) => {
    const before = runGate(dir);
    const beforeTier = computeTierReport(dir, loadPlugin(dir), before.findings);

    writeFileSync(path.join(dir, CONFIG_FILENAME), BROKEN_JSON);
    const after = runGate(dir);
    const afterTier = computeTierReport(dir, loadPlugin(dir), after.findings);

    // The whole claim, stated as the four numbers a user reads. Revert the `operator: true` stamp in
    // config.mjs, or the `isOperatorFinding` filter in runGate or computeTierReport, and every one of
    // these moves: tier universal -> none, errorCount 0 -> 1.
    assert.equal(afterTier.tier, beforeTier.tier, "a broken rubric file must not change the tier");
    assert.deepEqual(afterTier.blocked, beforeTier.blocked, "and must not appear in the burndown");
    assert.equal(after.errorCount, before.errorCount, "a broken rubric file is not a conformance error");
    assert.equal(after.warnCount, before.warnCount);

    // It is REPORTED, loudly, in its own channel - the fix is a reclassification, not a silencing.
    const ops = after.findings.filter(isOperatorFinding);
    assert.equal(ops.length, 1, "the parse failure is still a finding");
    assert.equal(ops[0].effectiveSeverity, "error", "and still at error severity - only its KIND changed");
    assert.equal(after.operatorErrorCount, 1);
    assert.equal(after.exitCode, 2, "exit 2 is this CLI's operator-error code; 1 would say the plugin failed");
    assert.equal(before.exitCode, 0);
  });
});

test("F-011: every finding loadConfig emits is stamped operator, warnings included", () => {
  withMinimalPlugin((dir) => {
    writeFileSync(
      path.join(dir, CONFIG_FILENAME),
      JSON.stringify({ profile: "nope", rules: { U99: "warn" }, suppressions: [{ file: "x" }] })
    );
    const { findings } = loadConfig(dir);
    assert.ok(findings.length >= 3, "the soft config problems still surface");
    assert.ok(
      findings.every(isOperatorFinding),
      "half-labelling leaves 'unknown profile' reading as a warning about the plugin, one severity quieter"
    );
    // A soft config problem is an operator WARNING, so it must not inflate the plugin's warn count.
    const r = runGate(dir);
    assert.equal(r.warnCount, runGateWarnCountWithoutConfig(dir), "operator warnings are not plugin warnings");
    assert.equal(r.operatorErrorCount, 0, "and nothing here is fatal, so the exit code is the gate's");
    assert.equal(r.exitCode, 0);
  });
});

/** The same plugin's warn count with its config removed - the control for the assertion above. */
function runGateWarnCountWithoutConfig(dir) {
  return withMinimalPlugin((clean) => runGate(clean).warnCount);
}

test("F-011: an operator finding is not a tier-report error, whatever its severity", () => {
  const op = { check: "config", severity: "error", effectiveSeverity: "error", message: "bad json", file: CONFIG_FILENAME, reqId: null, operator: true };
  const real = { check: "library-json", severity: "error", effectiveSeverity: "error", message: "missing", file: "library.json", reqId: "U1" };
  const ctx = { library: { data: { tier: "universal" } } };
  assert.equal(computeTierReport("/nowhere", ctx, [op]).tier, "universal", "an operator finding alone leaves the tier standing");
  assert.equal(computeTierReport("/nowhere", ctx, [op, real]).tier, "none", "a real Universal error still fails it");
});

test("F-011: the operator block prints first, in its own vocabulary, and the finding sections exclude it", () => {
  withMinimalPlugin((dir) => {
    writeFileSync(path.join(dir, CONFIG_FILENAME), BROKEN_JSON);
    const r = runGate(dir);

    const { grading, aboveTier } = sectionFindings(r.findings, "universal");
    assert.ok(![...grading, ...aboveTier].some(isOperatorFinding), "sectionFindings must not print it as a conformance line");

    const block = formatOperatorBlock(r.findings);
    assert.match(block, /YOUR GRADER CONFIGURATION/);
    assert.match(block, /\[operator\/error\]/, "labelled operator, not [error/objective]");
    assert.match(block, /does not affect the tier/);
    assert.match(block, /computed with DEFAULT configuration/, "a fatal parse means the rubric in force is not the one selected");

    const out = runCli([dir]);
    assert.equal(out.code, 2);
    assert.ok(out.stdout.indexOf("YOUR GRADER CONFIGURATION") >= 0, "the block reaches the terminal");
    // Compared against the FIRST FINDING LINE, not the "Tier:" line. minimal-skill prints above-tier
    // findings before its tier line, so anchoring on "Tier:" would let the block sink below the wall of
    // findings it exists to explain and still pass.
    const blockAt = out.stdout.indexOf("YOUR GRADER CONFIGURATION");
    const firstFindingAt = out.stdout.indexOf("  [error/");
    assert.ok(firstFindingAt >= 0, "this fixture prints findings, so there is a wall to be ahead of");
    assert.ok(
      blockAt < firstFindingAt,
      "it is the reader's frame for the grade, so it leads - learning it after the verdict is the same defect with extra steps"
    );
  });
});

test("F-011: a broken grader config still annotates a pull request diff", () => {
  const op = { check: "config", severity: "error", effectiveSeverity: "error", message: "askit.config.json is present but not valid JSON: x", file: CONFIG_FILENAME, reqId: null, operator: true };
  const lines = formatGithubAnnotations([op], "universal").split("\n");
  // Dropping it here would turn a broken rubric into a CI run that fails with exit 2 and no annotation
  // on the one surface a reviewer looks at.
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^::error file=askit\.config\.json::operator problem \(your grader configuration, not the plugin\): /);
});

test("F-011: --json keeps stdout one document and keeps the operator finding in it", () => {
  withMinimalPlugin((dir) => {
    writeFileSync(path.join(dir, CONFIG_FILENAME), BROKEN_JSON);
    const out = runCli([dir, "--json"]);
    assert.equal(out.code, 2);
    const doc = JSON.parse(out.stdout); // throws if the block leaked onto stdout
    assert.equal(doc.exitCode, 2, "the document's own exit code must equal the process's");
    assert.equal(doc.errorCount, 0);
    assert.equal(doc.operatorErrorCount, 1);
    assert.equal(doc.tierReport.tier, "universal");
    assert.ok(doc.findings.some((f) => f.operator === true), "the finding is partitioned, never dropped");
    assert.match(out.stderr, /YOUR GRADER CONFIGURATION/, "and it is still said out loud, on stderr");
  });
});

// --- F-037 / B-07: the plain-plugin verdict comes first ---------------------------------------------

test("F-037 (a folder of loose skills gets a wall of Gold): the plain-plugin hint leads the output", () => {
  withLooseSkills((dir) => {
    const out = runCli([dir]);
    const hintAt = out.stdout.indexOf("--profile plain-plugin");
    const firstFindingAt = out.stdout.indexOf("[error/");
    assert.ok(hintAt >= 0, "the profile built for this exact case must be named in the output");
    assert.ok(firstFindingAt >= 0, "the findings are unchanged - this is ordering and a hint, not a new verdict");
    assert.ok(hintAt < firstFindingAt, "the hint that explains the wall must precede the wall");
    assert.match(out.stdout, /No library\.json here/);
    assert.match(out.stdout, /"profile": "plain-plugin"/, "both opt-ins are named: the flag and the config key");
  });
});

test("F-037: the hint is silent once anybody has chosen a profile", () => {
  withLooseSkills((dir) => {
    const ctx = loadPlugin(dir);
    const nobodyChose = withGraderOptions(loadConfig(dir).config, {});
    assert.equal(hintsFor(ctx, nobodyChose).length, 1, "nobody chose: the hint is the only way to discover the profile");

    const graderChose = withGraderOptions(loadConfig(dir).config, { profile: "plain-plugin" });
    assert.equal(graderChose.profile.origin, ORIGIN.GRADER);
    assert.equal(hintsFor(ctx, graderChose).length, 0, "a grader who passed --profile has answered the question");

    writeFileSync(path.join(dir, CONFIG_FILENAME), JSON.stringify({ profile: "plain-plugin" }));
    const subjectChose = loadConfig(dir).config;
    assert.equal(subjectChose.profile.origin, ORIGIN.SUBJECT);
    assert.equal(hintsFor(ctx, subjectChose).length, 0, "so has a subject whose own config names one");
  });
});

test("F-037: the hint never fires for a plugin that HAS a library.json, readable or not", () => {
  const def = configFrom({}, ORIGIN.DEFAULT);
  assert.equal(hintsFor({ library: { data: { name: "x" } } }, def).length, 0);
  // A library.json that is PRESENT but malformed is not a plain plugin, and "no library.json here"
  // would be a false statement to its author. U1 already reports that case.
  assert.equal(hintsFor({ library: { data: null, parseError: "Unexpected token" } }, def).length, 0);
  assert.equal(hintsFor({ library: { data: null, parseError: null } }, def).length, 1);
});

// --- F-011, the second surface: evaluate.mjs must not disagree with check.mjs -----------------------

test("F-011: evaluate.mjs returns the SAME exit code as check.mjs for the same directory", () => {
  withMinimalPlugin((dir) => {
    const clean = { check: runCliScript("scripts/check.mjs", [dir]).code, evaluate: runCliScript("scripts/evaluate.mjs", [dir]).code };
    assert.deepEqual(clean, { check: 0, evaluate: 0 }, "the control: a clean plugin passes both");

    writeFileSync(path.join(dir, CONFIG_FILENAME), BROKEN_JSON);
    const broken = { check: runCliScript("scripts/check.mjs", [dir]).code, evaluate: runCliScript("scripts/evaluate.mjs", [dir]).code };
    // Two CLIs describing one directory in contradictory terms is the defect ADR 0036 / F-032 exists to
    // prevent. Leaving the operator finding in evaluate's gate filter produced it outright: evaluate
    // printed "Tier: universal" (its tier comes through the fixed computeTierReport) beside exit 1, with
    // no universal conformance error in its own list to justify that exit.
    assert.deepEqual(broken, { check: 2, evaluate: 2 }, "a broken rubric is an operator error in BOTH");
  });
});

test("F-011: evaluate.mjs labels the operator finding instead of listing it as a conformance defect", () => {
  withMinimalPlugin((dir) => {
    writeFileSync(path.join(dir, CONFIG_FILENAME), BROKEN_JSON);
    const out = runCliScript("scripts/evaluate.mjs", [dir]);
    assert.match(out.stdout, /\[operator\/error\] askit\.config\.json is present but not valid JSON/);
    assert.match(out.stdout, /not the plugin; it does not affect the tier/);
    assert.ok(!/\[error\] config:/.test(out.stdout), "never in the same stream and vocabulary as U1 and G4");
    assert.match(out.stdout, /^Tier: universal$/m, "and the tier it reports is the plugin's, unmoved");
  });
});

test("F-011: the release report's own gateExit agrees with the process exit and the tier", () => {
  withMinimalPlugin((dir) => {
    writeFileSync(path.join(dir, CONFIG_FILENAME), BROKEN_JSON);
    const proc = runCliScript("scripts/evaluate.mjs", [dir, "--report=release", "--format=json"]);
    const doc = JSON.parse(proc.stdout);
    // Delete the exit-2 override in scripts/lib/release-report.mjs and this is 1 while `proc.code` is 2:
    // the release card read "Gate exit code | 1 (fails)" in the same document whose masthead chip, KPI
    // and metadata table all read 2 (measured on this fixture, md and html).
    assert.equal(doc.release.gateExit, 2, "release.gateExit is the number the release card prints");
    assert.equal(proc.code, 2, "and the process exit it claims to be");
    // CONTROLS, not guards: neither moves on the reversion this test names. The tier comes through
    // the already-fixed computeTierReport, and this fixture is no-go on its missing release notes
    // alone. They are here so a future change that DID move them is caught beside the number above.
    assert.equal(doc.tier, "universal", "control: the tier stays the plugin's, unmoved");
    assert.equal(doc.release.goNoGo, "no-go", "control: the verdict a reader sees beside the exit code");

    // The rendered surfaces, because gateExit is a number a reader only ever meets through them.
    const md = runCliScript("scripts/evaluate.mjs", [dir, "--report=release", "--format=md"]).stdout;
    assert.ok(!/Gate exit code \| 1 \(fails\)/.test(md), "no site in the document may still say 1");
    assert.match(md, /\| Gate exit code \| 2 \(fails\) \|/);
    assert.match(md, /Gate exit 2, release notes missing/);
  });
});

// --- F-011, the third surface: the published GitHub Action ----------------------------------------

test("F-011: the Action's own pipeline survives a broken rubric and reports it as its own output", () => {
  withMinimalPlugin((dir) => {
    writeFileSync(path.join(dir, CONFIG_FILENAME), BROKEN_JSON);
    const reportFile = path.join(dir, "gate.json");

    // action.yml's exact sequence: check.mjs --json into a file under exit-code capture, then the
    // outputs bridge, then the SARIF guard with both exit codes.
    const gate = runCliScript("scripts/check.mjs", [dir, "--json"]);
    assert.equal(gate.code, 2);
    writeFileSync(reportFile, gate.stdout, "utf8");

    // The bridge validates fail-closed and USED to reject exit 2 outright ("exitCode: expected 0 or 1,
    // got 2"). Under action.yml that line runs with `set -e`, so the step died there, leaving tier,
    // errors, warnings and sarif-path unset for the rest of the job and printing a message that reads
    // as a toolkit bug rather than "your askit.config.json does not parse".
    const bridge = runCliScript("scripts/gha-action-outputs.mjs", [reportFile]);
    assert.equal(bridge.code, 0, `the outputs bridge must not reject an operator exit: ${bridge.stderr}`);
    const lines = bridge.stdout.trim().split("\n");
    assert.deepEqual(lines, ["tier=universal", "errors=0", "warnings=1", "operator-errors=1", "advisory-count=0"]);

    // `errors=0` is true and `operator-errors=1` is what stops it being a false pass: a workflow running
    // with fail-on-error: false reads both, and folding them into one number would put back the exact
    // falsehood this effort removed, in the one place a machine reads it.
    const sarif = runCliScript("scripts/check.mjs", [dir, "--sarif"]);
    assert.equal(sarif.code, 2, "both check.mjs invocations compute the identical runGate exit code");
    const sarifFile = path.join(dir, "gate.sarif");
    writeFileSync(sarifFile, sarif.stdout, "utf8");
    const guard = runCliScript("scripts/gha-sarif-guard.mjs", [sarifFile, "2", "2"]);
    assert.equal(guard.code, 0, `the SARIF guard must accept the operator exit on both sides: ${guard.stderr}`);
  });
});

test("F-037: the repository's own gate output is untouched by the hint", () => {
  assert.deepEqual(runGate(ROOT).hints, [], "this toolkit carries a library.json, so nothing changes here");
});
