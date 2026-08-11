import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

// Structural/step-order contract test for publish-npm.yml (v1.11.0 pre-release adversarial review,
// round 2, CRITICAL). The round-1 fix (Finding 1: injection; Finding 2: ancestry) still checked out
// the CANDIDATE tag before running either verifier, so scripts/verify-release-tag.mjs and
// scripts/verify-tag-ancestry.mjs came from the very commit whose trust they were supposed to
// establish - a verifier shipped by the candidate, checking the candidate. This test asserts the
// fixed ordering directly from the workflow file, so a regression back to the circular shape fails
// here, not only in a scratch-repo attack simulation (see publish-npm-trust-root.test.mjs for that).
//
// Trust boundary asserted below: `main` is checked out FIRST, into its own directory, with full
// history - branch protection governs that tree, not the candidate's. Tag-format validation, the
// tag-to-sha resolution, and the ancestry proof all run against main's tree, before the candidate is
// checked out at all. Only after the ancestry proof succeeds does a second checkout bring in the
// candidate's tree, and only then may anything candidate-controlled run (npm ci, the test suite, the
// gate, npm pack/publish). The manifest-agreement guard is a middle case: it runs main's own copy of
// the script, but reads the candidate's checked-out files as data - never the candidate's own copy of
// that script.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORKFLOW_PATH = path.join(ROOT, ".github/workflows/publish-npm.yml");

function loadWorkflow() {
  return parseYaml(readFileSync(WORKFLOW_PATH, "utf8"));
}

function prepareSteps() {
  const wf = loadWorkflow();
  const steps = wf.jobs.prepare.steps;
  assert.ok(Array.isArray(steps) && steps.length > 0, "prepare job must declare steps");
  return steps;
}

function indexOfRun(steps, pattern) {
  return steps.findIndex((s) => typeof s.run === "string" && pattern.test(s.run));
}

function indexOfCheckout(steps, refPattern) {
  return steps.findIndex(
    (s) => typeof s.uses === "string" && s.uses.startsWith("actions/checkout") && refPattern.test(String(s.with?.ref ?? ""))
  );
}

function indexOfAnyCheckoutAfter(steps, afterIndex) {
  return steps.findIndex((s, i) => i > afterIndex && typeof s.uses === "string" && s.uses.startsWith("actions/checkout"));
}

test("prepare job checks out main - the trust root - into its own directory, with full history", () => {
  const steps = prepareSteps();
  const mainCheckout = indexOfCheckout(steps, /^main$/);
  assert.notEqual(mainCheckout, -1, "must have a checkout step with ref: main");
  const step = steps[mainCheckout];
  assert.equal(step.with.path, "trust-root", "main's checkout must land in its own directory, not the default workspace root");
  assert.equal(step.with["fetch-depth"], 0, "must fetch full history so the ancestry check can walk it");
});

test("tag-format validation, tag-to-sha resolution, and the ancestry proof all run before the candidate is checked out, from main's own tree", () => {
  const steps = prepareSteps();
  const mainCheckout = indexOfCheckout(steps, /^main$/);
  assert.notEqual(mainCheckout, -1, "must have a checkout step with ref: main");
  const candidateCheckout = indexOfAnyCheckoutAfter(steps, mainCheckout);
  assert.notEqual(candidateCheckout, -1, "must have a second checkout step for the candidate commit");

  const formatCheck = indexOfRun(steps, /verify-release-tag\.mjs/);
  const ancestryCheck = indexOfRun(steps, /verify-tag-ancestry\.mjs/);
  const resolveShaStep = steps.findIndex((s) => s.id === "resolve-tag");

  assert.notEqual(formatCheck, -1, "tag-format step must exist");
  assert.notEqual(ancestryCheck, -1, "ancestry step must exist");
  assert.notEqual(resolveShaStep, -1, "a step with id: resolve-tag must exist");

  assert.ok(formatCheck < candidateCheckout, "tag-format validation must run before the candidate is checked out");
  assert.ok(resolveShaStep < candidateCheckout, "tag-to-sha resolution must run before the candidate is checked out");
  assert.ok(ancestryCheck < candidateCheckout, "ancestry proof must run before the candidate is checked out");

  assert.equal(steps[formatCheck]["working-directory"], "trust-root", "tag-format validation must run from main's tree");
  assert.equal(steps[ancestryCheck]["working-directory"], "trust-root", "the ancestry proof must run from main's tree");
});

test("the candidate is checked out at the resolved/proven sha, never the raw tag string", () => {
  const steps = prepareSteps();
  const mainCheckout = indexOfCheckout(steps, /^main$/);
  const candidateCheckoutIdx = indexOfAnyCheckoutAfter(steps, mainCheckout);
  const ref = String(steps[candidateCheckoutIdx].with.ref);
  assert.match(
    ref,
    /steps\.resolve-tag\.outputs\.sha/,
    'candidate checkout must use the resolved/proven sha output, not "$TAG" or "${{ inputs.tag }}" directly'
  );
});

test("npm ci, the test suite, the conformance gate, and npm pack all run after the candidate checkout - never before it", () => {
  const steps = prepareSteps();
  const mainCheckout = indexOfCheckout(steps, /^main$/);
  const candidateCheckout = indexOfAnyCheckoutAfter(steps, mainCheckout);
  for (const pattern of [/npm ci/, /npm test/, /check\.mjs/, /npm pack/]) {
    const idx = indexOfRun(steps, pattern);
    assert.notEqual(idx, -1, `expected a step matching ${pattern}`);
    assert.ok(idx > candidateCheckout, `${pattern} must run after the candidate checkout (found at step ${idx}, checkout at ${candidateCheckout})`);
  }
});

test("the manifest-agreement guard invokes main's own copy of the script, reading the candidate's files as data rather than running the candidate's own copy", () => {
  const steps = prepareSteps();
  const manifestCheck = steps.find((s) => typeof s.run === "string" && /verify-tag-matches-manifests\.mjs/.test(s.run));
  assert.ok(manifestCheck, "manifest-agreement step must exist");
  assert.equal(manifestCheck["working-directory"], "trust-root", "must invoke main's own copy of the script (cwd = trust-root)");
  assert.match(manifestCheck.run, /candidate/, "must point the check's root argument at the candidate's checked-out files");
});

test('"${{ inputs.tag }}" appears exactly once outside comments: the job-level env: TAG assignment', () => {
  const raw = readFileSync(WORKFLOW_PATH, "utf8");
  const codeLines = raw.split("\n").filter((line) => !line.trim().startsWith("#"));
  const occurrences = codeLines.join("\n").split("${{ inputs.tag }}").length - 1;
  assert.equal(
    occurrences,
    1,
    'expected exactly one raw "${{ inputs.tag }}" expression outside comments (the env: TAG assignment) - prose in header comments may still mention it when explaining history'
  );
});

test("publish-npm.yml carries no em-dashes or en-dashes anywhere in the file", () => {
  const raw = readFileSync(WORKFLOW_PATH, "utf8");
  const emDash = String.fromCharCode(8212);
  const enDash = String.fromCharCode(8211);
  assert.ok(!raw.includes(emDash), "must not contain an em-dash");
  assert.ok(!raw.includes(enDash), "must not contain an en-dash");
});
