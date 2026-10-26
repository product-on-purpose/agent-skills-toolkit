// what-it-is:   the ADR 0063 corpus-parity test
// what-it-does: grades every tree under tests/fixtures/audit-corpus/ with and without --no-advisory
//               and asserts the tier and exit code are IDENTICAL either way
// why:          ADR 0063's Implementation sites, "Required tests": "every audit-corpus fixture graded
//               with and without --no-advisory gives identical tiers and exit codes." This is the
//               SAME partition invariant advisory-partition.test.mjs proves with a stub module, proven
//               a second way: against REAL corpus trees, with the REAL (empty) advisory registry, both
//               in-process (runGate) and through a spawned CLI (so the --no-advisory flag itself is
//               proven to reach the gate, not just the option runGate() accepts directly)
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { runGate } from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORPUS_DIR = path.join(ROOT, "tests/fixtures/audit-corpus");
const CHECK_SCRIPT = path.join(ROOT, "scripts/check.mjs");
const EVALUATE_SCRIPT = path.join(ROOT, "scripts/evaluate.mjs");

// Every top-level directory under audit-corpus/ that carries a library.json or SKILL.md one level
// down (i.e. is itself a graded tree, not a loose supporting file like README.md). Discovered from
// disk rather than hand-listed, so a third tree added later is covered automatically.
function corpusTargets() {
  return readdirSync(CORPUS_DIR)
    .map((name) => path.join(CORPUS_DIR, name))
    .filter((p) => {
      try { return statSync(p).isDirectory(); } catch { return false; }
    });
}

const TARGETS = corpusTargets();

// check.mjs exits non-zero on a real failing or operator-error grade by design, so a corpus tree's
// --json output must be read from the caught error's own stdout, not assumed to come back through a
// clean execFileSync return (the same wrapper tests/unit/gha-step-summary.test.mjs's gateReport uses).
// Both corpus trees today grade clean (exit 0), but the discovery above is NOT limited to those two, so
// a future tree that fails its own grade must not make this file throw instead of asserting parity.
function runCheckJson(args) {
  try {
    return execFileSync(process.execPath, [CHECK_SCRIPT, ...args], { encoding: "utf8" });
  } catch (e) {
    return String(e.stdout ?? "");
  }
}

test("the corpus fixture discovery actually finds trees (otherwise the rest of this file checks nothing)", () => {
  assert.ok(TARGETS.length >= 2, `expected at least potemkin-gold and pin-abuse, found: ${TARGETS.map((t) => path.basename(t)).join(", ") || "(none)"}`);
});

for (const target of TARGETS) {
  const name = path.basename(target);

  test(`corpus parity (in-process): ${name} grades identically with and without --no-advisory`, () => {
    const ctx = loadPlugin(target);
    const on = runGate(target, ctx);
    const off = runGate(target, ctx, { noAdvisory: true });

    assert.equal(on.advisoryLayer, "on");
    assert.equal(off.advisoryLayer, "off");
    assert.deepEqual(off.advisoryFindings, null);
    assert.ok(Array.isArray(on.advisoryFindings));

    assert.equal(off.exitCode, on.exitCode, `${name}: exitCode must be identical`);
    assert.equal(off.errorCount, on.errorCount, `${name}: errorCount must be identical`);
    assert.equal(off.warnCount, on.warnCount, `${name}: warnCount must be identical`);
    assert.deepEqual(off.findings, on.findings, `${name}: findings[] must be identical (advisory never touches it)`);

    const tierOn = computeTierReport(target, ctx, on.findings).tier;
    const tierOff = computeTierReport(target, ctx, off.findings).tier;
    assert.equal(tierOff, tierOn, `${name}: the earned tier must be identical`);
  });

  test(`corpus parity (spawned CLI): ${name}'s check.mjs --json agrees with --no-advisory on tier and exitCode`, () => {
    const on = JSON.parse(runCheckJson([target, "--json"]));
    const off = JSON.parse(runCheckJson([target, "--no-advisory", "--json"]));

    assert.equal(on.advisoryLayer, "on");
    assert.equal(off.advisoryLayer, "off");
    assert.equal(off.exitCode, on.exitCode, `${name}: CLI exitCode must be identical`);
    assert.equal(off.tierReport.tier, on.tierReport.tier, `${name}: CLI tier must be identical`);
    assert.equal(off.errorCount, on.errorCount);
    assert.equal(off.warnCount, on.warnCount);
  });

  // The guard this test exists to close: a mutant that replaced evaluate.mjs's CLI parsing with
  // `const noAdvisory = false;` left the full suite green, because this file's own CLI coverage only
  // ever spawned check.mjs, never evaluate.mjs. Spawned, not called in-process, so the flag itself -
  // not just the `opts.noAdvisory` runGate()/evaluate() already accept - is proven to reach the CLI.
  test(`corpus parity (spawned evaluate.mjs CLI): ${name}'s evaluate.mjs --json agrees with --no-advisory on tier and exit code`, () => {
    const on = JSON.parse(runEvaluateJson(target, []));
    const off = JSON.parse(runEvaluateJson(target, ["--no-advisory"]));

    assert.equal(on.advisoryLayer, "on");
    assert.equal(off.advisoryLayer, "off");
    assert.deepEqual(off.advisoryFindings, null);
    assert.equal(off.tier, on.tier, `${name}: evaluate.mjs CLI tier must be identical`);
    assert.deepEqual(off.summary, on.summary, `${name}: evaluate.mjs CLI summary must be identical`);
  });
}

function runEvaluateJson(target, extraArgs) {
  try {
    return execFileSync(process.execPath, [EVALUATE_SCRIPT, target, "--json", ...extraArgs], { encoding: "utf8" });
  } catch (e) {
    return String(e.stdout ?? "");
  }
}
