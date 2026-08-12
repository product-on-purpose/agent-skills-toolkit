import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { resolveBash } from "./_resolve-bash.mjs";

// Executes action.yml's own "Run the gate" composite step - the ONE shell step with any logic
// (sequencing plus exit-code forwarding, per its own header comment; Standard sec 4.1/4.4) - against a
// real FAILING fixture, across the full fail-on-error x sarif matrix. This is deliberately not a copy
// of the shell script: it parses action.yml and runs the step's actual `run:` text through bash, so a
// regression in the real file fails this test. Both pre-release findings (a normal gate failure under
// `set -e` losing the SARIF artifact and defeating fail-on-error: false) live entirely inside this
// script, so the YAML-shape assertions in action-yml.test.mjs cannot catch a regression here - only
// running the script for real can.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT_POSIX = ROOT.replace(/\\/g, "/");
const FAILING_FIXTURE = path.join(ROOT, "tests/fixtures/anti/missing-library-json").replace(/\\/g, "/");
const PASSING_FIXTURE = path.join(ROOT, "tests/fixtures/golden/minimal-skill").replace(/\\/g, "/");
// Declares tier "convergent" but carries real G2/G4/G5 (advanced-tier) error-severity findings ABOVE its
// declared ceiling: gated errorCount is 0 (exitCode 0), while the SARIF document legitimately contains
// 3 error-level results. The exact real-world shape that would false-positive under a raw error-COUNT
// comparison between the JSON gate report and the SARIF document (gha-sarif-guard.mjs deliberately does
// not compare counts - see that module's header - this proves the production pipeline agrees).
const COUNT_MISMATCH_FIXTURE = path.join(ROOT, "tests/fixtures/golden/silver-fixture").replace(/\\/g, "/");

// Resolves an explicit, filesystem-verified bash instead of trusting "bash" through PATH - see
// _resolve-bash.mjs's header for the full defect this replaces (WSL bash resolved from PowerShell
// drops RUNNER_TEMP crossing the boundary; found by a real user because `npm test` runs from
// `prepublishOnly`, so `npm publish` was impossible from the default Windows shell). Resolved once, at
// module load, so every test below shares one already-verified bash, and a resolution failure is
// reported as this file failing to load - loudly, not as a silent skip. Git for Windows is already a
// de facto prerequisite for developing this repo on Windows (git clone requires it), and this file
// specifically exists to catch a Windows-bash defect, so failing loudly here - rather than skipping
// quietly - is the choice that cannot itself repeat the original mistake of going green while testing
// nothing.
const BASH_RESOLUTION = resolveBash();
if (!BASH_RESOLUTION.bash) {
  throw new Error(
    "action-run-step.test.mjs: no bash that shares the Windows filesystem could be found, so these " +
      "tests cannot run without silently re-triggering the exact defect they exist to catch. Install " +
      "Git for Windows (https://git-scm.com/download/win), or set GIT_INSTALL_ROOT. " +
      BASH_RESOLUTION.reasonForFailure
  );
}
const BASH = BASH_RESOLUTION.bash;

function indent(text) {
  return String(text)
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

function loadGateStepScript() {
  const action = parseYaml(readFileSync(path.join(ROOT, "action.yml"), "utf8"));
  const step = action.runs.steps.find((s) => s.id === "gate");
  assert.ok(step?.run, "action.yml must still declare an id: gate step with a run: script");
  assert.equal(step.shell, "bash", "this test drives the step through bash directly");
  return step.run;
}

function parseGithubOutput(text) {
  const out = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const eq = line.indexOf("=");
    out[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return out;
}

// Runs the real gate-step script under bash, simulating exactly the env vars action.yml wires up
// (ASKIT_* inputs, ACTION_PATH, plus the runner-supplied RUNNER_TEMP/GITHUB_OUTPUT). Caller owns
// cleanup of the returned dirs so sarif-path assertions can still read the file afterward.
function runGateStep({ failOnError, sarif, annotations = "false", fixture = FAILING_FIXTURE, actionPath = ROOT_POSIX }) {
  const script = loadGateStepScript();
  const workDir = mkdtempSync(path.join(tmpdir(), "askit-action-step-")).replace(/\\/g, "/");
  const runnerTemp = mkdtempSync(path.join(tmpdir(), "askit-runner-temp-")).replace(/\\/g, "/");
  const githubOutput = path.join(workDir, "github_output.txt");
  writeFileSync(githubOutput, "", "utf8");

  const env = {
    ...process.env,
    ASKIT_PATH: fixture,
    ASKIT_PROFILE: "",
    ASKIT_STRICT: "false",
    ASKIT_ANNOTATIONS: annotations,
    ASKIT_SARIF: sarif,
    ASKIT_FAIL_ON_ERROR: failOnError,
    ACTION_PATH: actionPath,
    RUNNER_TEMP: runnerTemp,
    GITHUB_OUTPUT: githubOutput,
  };

  let status = 0;
  let stdout = "";
  let stderr = "";
  try {
    stdout = execFileSync(BASH, ["-c", script], { env, encoding: "utf8" });
  } catch (e) {
    status = e.status ?? 1;
    stdout = String(e.stdout ?? "");
    stderr = String(e.stderr ?? "");
  }

  const outputs = parseGithubOutput(readFileSync(githubOutput, "utf8"));

  // action.yml's gate step writes tier/errors/warnings to GITHUB_OUTPUT unconditionally, before any
  // conditional branch (see the "Run the gate" step, the `gha-action-outputs.mjs` line runs before any
  // `if`) - so outputs.tier is ALWAYS set once the shell script itself ran to completion, whether the
  // gate passed or genuinely failed. If it is undefined here, the script died before reaching that
  // line: a shell/environment problem, not a grading disagreement, and the plain `expected 'none', got
  // undefined` an assertion would otherwise produce sends a reader chasing the wrong bug entirely (this
  // is exactly how the original defect was first misdiagnosed). Fail here instead, with the evidence.
  if (outputs.tier === undefined) {
    cleanup({ workDir, runnerTemp });
    throw new Error(
      "gate step produced no parseable GITHUB_OUTPUT (outputs.tier is undefined): the shell script " +
        "itself failed before it could reach node, not a grading disagreement.\n" +
        `  bash used: ${BASH}\n` +
        `  exit status: ${status}\n` +
        `  stderr:\n${indent(stderr) || "    (empty)"}\n` +
        `  stdout:\n${indent(stdout) || "    (empty)"}`
    );
  }

  return { status, stdout, stderr, outputs, workDir, runnerTemp };
}

function cleanup({ workDir, runnerTemp }) {
  rmSync(workDir, { recursive: true, force: true });
  rmSync(runnerTemp, { recursive: true, force: true });
}

// --- the full fail-on-error x sarif matrix against a FAILING fixture ---

for (const failOnError of ["true", "false"]) {
  for (const sarif of ["true", "false"]) {
    test(`gate step on a FAILING fixture: fail-on-error=${failOnError}, sarif=${sarif}`, () => {
      const result = runGateStep({ failOnError, sarif });
      try {
        const { status, outputs } = result;

        // tier/errors/warnings must always be set, regardless of fail-on-error or sarif - the bridge
        // ran and the fixture really does fail the gate.
        assert.equal(outputs.tier, "none", "the missing-library-json fixture earns no tier");
        assert.ok(Number(outputs.errors) >= 1, "errors output must reflect the real gate failure");

        if (failOnError === "true") {
          assert.notEqual(status, 0, "fail-on-error: true must fail the step on a real gate failure");
        } else {
          assert.equal(status, 0, "fail-on-error: false must NOT fail the step, even though the gate failed (Finding 1)");
        }

        if (sarif === "true") {
          assert.ok(outputs["sarif-path"], "sarif-path must be emitted even though the gate failed (Finding 1)");
          assert.ok(existsSync(outputs["sarif-path"]), "the SARIF file itself must exist on disk");
          const doc = JSON.parse(readFileSync(outputs["sarif-path"], "utf8"));
          assert.equal(doc.version, "2.1.0", "the emitted file must be a real, valid SARIF document");
          assert.ok(Array.isArray(doc.runs?.[0]?.results), "the SARIF document must carry results");
        } else {
          assert.equal(outputs["sarif-path"], "", "sarif-path must be empty when sarif: false");
        }
      } finally {
        cleanup(result);
      }
    });
  }
}

// --- symmetry sanity check: the fix must not regress the PASSING path ---

test("gate step on a PASSING fixture: fail-on-error=true, sarif=true never fails the step, and sarif-path is still emitted", () => {
  const result = runGateStep({ failOnError: "true", sarif: "true", fixture: PASSING_FIXTURE });
  try {
    const { status, outputs } = result;
    assert.equal(status, 0, "a passing grade must not fail the step even with fail-on-error: true");
    assert.equal(outputs.errors, "0", "the golden minimal-skill fixture has no errors");
    assert.ok(outputs["sarif-path"], "sarif-path must be emitted on a passing grade too");
    const doc = JSON.parse(readFileSync(outputs["sarif-path"], "utf8"));
    assert.equal(doc.version, "2.1.0");
  } finally {
    cleanup(result);
  }
});

// gha-sarif-guard.mjs (round 2 of the pre-release adversarial review) compares check.mjs --sarif's and
// --json's EXIT CODES, never their raw error/warning COUNTS, precisely because the two artifacts
// legitimately disagree on count for any plugin with real findings above its declared-tier ceiling. This
// proves the production action.yml pipeline does not false-positive on that real, ordinary shape.
test("gate step on a fixture with SARIF error-count > JSON gate errorCount (real ceiling-filtered mismatch): still succeeds and emits a valid sarif-path", () => {
  const result = runGateStep({ failOnError: "true", sarif: "true", fixture: COUNT_MISMATCH_FIXTURE });
  try {
    const { status, outputs } = result;
    assert.equal(status, 0, "a passing (ceiling-filtered) grade must not fail the step");
    assert.equal(outputs.errors, "0", "gated errorCount is 0 for this fixture's declared tier");
    assert.ok(outputs["sarif-path"], "sarif-path must still be emitted - the guard compares exit codes, not counts");
    const doc = JSON.parse(readFileSync(outputs["sarif-path"], "utf8"));
    const sarifErrorResults = doc.runs[0].results.filter((r) => r.level === "error");
    assert.ok(sarifErrorResults.length > 0, "sanity check: this fixture must actually exhibit the count mismatch (SARIF has error results the gate didn't count)");
  } finally {
    cleanup(result);
  }
});

// --- round 2 of the pre-release adversarial review: exit code 1 cannot prove SARIF serialization
// succeeded, because status 1 is BOTH the expected code for a real failing grade AND the ordinary code
// for a renderer crash / truncated write. Reproduce that EXACT ambiguity against the real action.yml
// shell script (not a copy of it) by swapping in a stub `scripts/check.mjs` under a temporary
// ACTION_PATH: --json prints a real, valid, schema-complete failing-grade report and exits 1; --sarif
// prints a truncated, unparseable fragment and ALSO exits 1 - the same coincidence the finding names.
// scripts/gha-action-outputs.mjs and scripts/gha-sarif-guard.mjs are the REAL, current files (copied
// in), so this exercises the actual guard logic, not a stand-in for it.

function buildAmbiguousExitCodeActionPath() {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-stub-action-")).replace(/\\/g, "/");
  const scriptsDir = path.join(dir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });

  cpSync(path.join(ROOT, "scripts/gha-action-outputs.mjs"), path.join(scriptsDir, "gha-action-outputs.mjs"));
  cpSync(path.join(ROOT, "scripts/gha-sarif-guard.mjs"), path.join(scriptsDir, "gha-sarif-guard.mjs"));

  const stubCheck = `
const argv = process.argv.slice(2);
if (argv.includes("--json")) {
  const report = {
    findings: [],
    errorCount: 1,
    warnCount: 0,
    exitCode: 1,
    config: {},
    tierReport: { tier: "none", satisfies: [], blocked: {}, declaredTier: null },
  };
  process.stdout.write(JSON.stringify(report, null, 2) + "\\n");
  process.exit(1);
} else if (argv.includes("--sarif")) {
  // Simulate a renderer crash mid-write: a truncated, unparseable fragment, exiting with the SAME
  // code (1) a real failing grade also produces - the exact ambiguity this test proves is closed.
  process.stdout.write('{"version": "2.1.0", "runs": [ { "resu');
  process.exit(1);
} else {
  process.exit(0);
}
`;
  writeFileSync(path.join(scriptsDir, "check.mjs"), stubCheck, "utf8");
  return dir;
}

test("THE FINDING: SARIF exits 1 without producing valid JSON (coincidentally matching the JSON gate's own exit 1) - the Action refuses to emit sarif-path, distinguishably from an ordinary failing grade", () => {
  const stubActionPath = buildAmbiguousExitCodeActionPath();
  // fail-on-error: false is the crux of the distinction: an ORDINARY failing grade under
  // fail-on-error: false must SUCCEED the step (proven by the matrix above). A SARIF artifact that
  // failed validation must FAIL the step regardless - that different outcome, under the identical
  // fail-on-error setting, is the "distinguishable from an ordinary failing grade" the finding asks for.
  const result = runGateStep({ failOnError: "false", sarif: "true", actionPath: stubActionPath });
  try {
    const { status, stdout, stderr, outputs, runnerTemp } = result;
    assert.notEqual(status, 0, "an invalid SARIF artifact must fail the step even under fail-on-error: false - unlike an ordinary failing grade");
    assert.match(stdout, /SARIF artifact failed validation/i, "action.yml's own ::error:: line (stdout, not stderr)");
    assert.match(stderr, /refusing to trust/i, "the guard's own message naming why (stderr)");
    assert.ok(!outputs["sarif-path"], "sarif-path must NOT be emitted for an artifact that failed validation");
    assert.ok(
      !existsSync(path.join(runnerTemp, "askit-gate.sarif")),
      "the truncated artifact must not survive on disk for a later step or a consumer to pick up"
    );
    // The JSON gate side is unaffected: the bridge still ran against a real, valid, schema-complete
    // report (errorCount: 1), proving the failure is specifically about the SARIF artifact.
    assert.equal(outputs.tier, "none");
    assert.equal(outputs.errors, "1");
  } finally {
    cleanup(result);
    rmSync(stubActionPath, { recursive: true, force: true });
  }
});
