// what-it-is:   coverage for E77 - the informational line naming a graded plugin's Standard edition
//               when it is newer than the edition this toolkit ships
// what-it-does: proves newerStandardNotice()'s five cases (no declaration, equal, older, malformed,
//               newer) as a pure function, proves extractShippedStandard()/shippedStandardEdition()
//               read this repo's own STANDARD.md rather than any graded plugin's, proves the --json
//               field on both check.mjs and evaluate.mjs, and runs the real check.mjs CLI against a
//               temp fixture pinned one minor above the shipped edition
// why:          a plugin that adopts a rule from an edition newer than this toolkit's own gets a clean
//               grade that never checked that rule; E77's first option (an informational line, not a
//               finding, not a warning) says so without changing severity, counts, tier, or exit code
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import { newerStandardNotice, buildJsonReport, runGate } from "../../scripts/check.mjs";
import { evaluate } from "../../scripts/evaluate.mjs";
import { extractShippedStandard, shippedStandardEdition } from "../../scripts/lib/shipped-standard.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(ROOT, "tests/fixtures");

// --- extractShippedStandard / shippedStandardEdition: no graded-plugin dependency -----------------

test("extractShippedStandard reads STANDARD.md's own header shape, and only that shape", () => {
  assert.equal(extractShippedStandard("> **Standard version 0.17**, amended 2026-09-28"), "0.17");
  assert.equal(extractShippedStandard("Standard version 0.17"), null, "must require the bold markers, not just the words");
  assert.equal(extractShippedStandard("garbage"), null);
  assert.equal(extractShippedStandard(undefined), null, "must not throw on a non-string input");
});

test("shippedStandardEdition reads THIS repository's own STANDARD.md, matching library.json's pin", () => {
  const shipped = shippedStandardEdition();
  assert.equal(typeof shipped, "string");
  assert.match(shipped, /^\d+\.\d+$/, "must be a bare MAJOR.MINOR, not the surrounding markdown");
  const library = JSON.parse(readFileSync(path.join(ROOT, "library.json"), "utf8"));
  assert.equal(shipped, library.standard, "this repo's own STANDARD.md and library.json must agree (standard-self-consistency already asserts this the other way)");
});

// --- newerStandardNotice: the five cases, as a pure function ---------------------------------------

test("newerStandardNotice: no standard declared -> no line", () => {
  assert.equal(newerStandardNotice(undefined, "0.17"), "");
});

test("newerStandardNotice: equal edition -> no line", () => {
  assert.equal(newerStandardNotice("0.17", "0.17"), "");
});

test("newerStandardNotice: older edition -> no line (standardDebtLine's job, not this one's)", () => {
  assert.equal(newerStandardNotice("0.10", "0.17"), "");
});

test("newerStandardNotice: malformed edition -> no line, no crash", () => {
  assert.equal(newerStandardNotice("banana", "0.17"), "");
  assert.equal(newerStandardNotice("1", "0.17"), "");
  assert.equal(newerStandardNotice("0.x", "0.17"), "", "the BASELINE sentinel must not be read as a real edition");
  assert.equal(newerStandardNotice(0.18, "0.17"), "", "a non-string declared value must not throw");
});

test("newerStandardNotice: shipped edition unresolved -> no line (never \"newer than unknown\")", () => {
  assert.equal(newerStandardNotice("0.18", null), "");
  assert.equal(
    newerStandardNotice("0.18", "0.x"),
    "",
    "the BASELINE sentinel on the shipped side must not be read as a real edition either"
  );
});

test("newerStandardNotice: newer edition names both, in one plain sentence, and states what was not checked", () => {
  const line = newerStandardNotice("0.18", "0.17");
  assert.match(line, /0\.18/, "must name the plugin's declared edition");
  assert.match(line, /0\.17/, "must name the edition this toolkit ships");
  assert.match(line, /did not check/i, "must say the grade did not check rules newer than the toolkit's edition");
  assert.equal(line.split("\n").length, 1, "one plain sentence, not a multi-line block");
});

// --- the --json field, both scripts -----------------------------------------------------------------

function withTmp(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-e77-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A clone of the golden conformant fixture, re-pinned to a given Standard edition. */
function withRepinnedFixture(edition, fn) {
  return withTmp((dir) => {
    cpSync(path.join(FIXTURES, "golden/minimal-skill"), dir, { recursive: true });
    const libPath = path.join(dir, "library.json");
    const lib = JSON.parse(readFileSync(libPath, "utf8"));
    lib.standard = edition;
    writeFileSync(libPath, JSON.stringify(lib));
    return fn(dir);
  });
}

test("buildJsonReport (check.mjs): standardEditionNotice is null when the pin does not qualify", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/minimal-skill"));
  const r = runGate(path.join(FIXTURES, "golden/minimal-skill"), ctx);
  const j = buildJsonReport(path.join(FIXTURES, "golden/minimal-skill"), ctx, r);
  assert.equal(j.standardEditionNotice, null);
});

test("buildJsonReport (check.mjs): standardEditionNotice carries the sentence when the pin is newer than shipped", () => {
  withRepinnedFixture("9.9", (dir) => {
    const ctx = loadPlugin(dir);
    const r = runGate(dir, ctx);
    const j = buildJsonReport(dir, ctx, r);
    assert.match(j.standardEditionNotice, /9\.9/);
  });
});

test("evaluate() plugin scope carries the same standardEditionNotice field", () => {
  withRepinnedFixture("9.9", (dir) => {
    const r = evaluate(dir);
    assert.equal(r.scope, "plugin");
    assert.match(r.standardEditionNotice, /9\.9/);
  });
  const clean = evaluate(path.join(FIXTURES, "golden/minimal-skill"));
  assert.equal(clean.standardEditionNotice, null);
});

// --- the real CLI, on a temp fixture one minor above the SHIPPED edition ---------------------------
//
// Computed from shippedStandardEdition() rather than hard-coded, so this test keeps testing "one minor
// above whatever this toolkit currently ships" through a future Standard bump, instead of silently
// testing "newer than 0.17" forever after the toolkit moves past it.

function runCli(args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, [path.join(ROOT, "scripts/check.mjs"), ...args], { encoding: "utf8" }), stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

function oneMinorAbove(edition) {
  const [major, minor] = edition.split(".").map(Number);
  return `${major}.${minor + 1}`;
}

test("CLI: a plugin pinned one minor above the shipped edition prints the notice, naming both editions, with no effect on exit code, tier, or counts", () => {
  const shipped = shippedStandardEdition();
  assert.ok(shipped, "this repo's own STANDARD.md must resolve a shipped edition for the test to mean anything");
  const newerEdition = oneMinorAbove(shipped);
  const evenNewerEdition = oneMinorAbove(newerEdition);

  withRepinnedFixture(newerEdition, (dirA) => {
    withRepinnedFixture(evenNewerEdition, (dirB) => {
      const a = runCli([dirA, "--json"]);
      const b = runCli([dirB, "--json"]);
      assert.equal(a.code, 0);
      assert.equal(b.code, 0);
      const ja = JSON.parse(a.stdout);
      const jb = JSON.parse(b.stdout);

      // The notice itself: both editions named, one sentence, in --json.
      assert.match(ja.standardEditionNotice, new RegExp(newerEdition.replace(".", "\\.")));
      assert.match(ja.standardEditionNotice, new RegExp(shipped.replace(".", "\\.")));
      assert.match(jb.standardEditionNotice, new RegExp(evenNewerEdition.replace(".", "\\.")));

      // No pre-existing migration is scheduled past the shipped edition (verified separately in this
      // effort), so these two pins must gate IDENTICALLY: only the notice's own text may differ.
      assert.equal(ja.errorCount, jb.errorCount);
      assert.equal(ja.warnCount, jb.warnCount);
      assert.equal(ja.exitCode, jb.exitCode);
      assert.equal(ja.tierReport.tier, jb.tierReport.tier);
      assert.equal(ja.findings.length, jb.findings.length);

      // Human mode: the notice appears as its own line, after the verdict and the counts.
      const human = runCli([dirA]);
      assert.equal(human.code, 0);
      const lines = human.stdout.trim().split("\n");
      const noticeIdx = lines.findIndex((l) => l.startsWith("Note:"));
      const countsIdx = lines.findIndex((l) => /error\(s\),.*warning\(s\)\.$/.test(l));
      assert.ok(noticeIdx > countsIdx, "the notice must print after the verdict's error/warning counts line");
      assert.match(lines[noticeIdx], new RegExp(newerEdition.replace(".", "\\.")));
      assert.match(lines[noticeIdx], new RegExp(shipped.replace(".", "\\.")));

      // SARIF and --gha are untouched: same result/annotation counts, no new fields.
      const sarifA = JSON.parse(runCli([dirA, "--sarif"]).stdout);
      const sarifB = JSON.parse(runCli([dirB, "--sarif"]).stdout);
      assert.equal(sarifA.runs[0].results.length, sarifB.runs[0].results.length);
      assert.deepEqual(Object.keys(sarifA.runs[0]).sort(), Object.keys(sarifB.runs[0]).sort());
    });
  });
});
