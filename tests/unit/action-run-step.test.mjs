import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

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
function runGateStep({ failOnError, sarif, annotations = "false", fixture = FAILING_FIXTURE }) {
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
    ACTION_PATH: ROOT_POSIX,
    RUNNER_TEMP: runnerTemp,
    GITHUB_OUTPUT: githubOutput,
  };

  let status = 0;
  let stderr = "";
  try {
    execFileSync("bash", ["-c", script], { env, encoding: "utf8" });
  } catch (e) {
    status = e.status ?? 1;
    stderr = String(e.stderr ?? "");
  }

  const outputs = parseGithubOutput(readFileSync(githubOutput, "utf8"));
  return { status, stderr, outputs, workDir, runnerTemp };
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
