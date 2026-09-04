import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

// A structural contract test for action.yml (workstream 3 of v1.11.0, "reach": the published GitHub
// Action wrapping the gate). Deliberately not testing YAML "logic" - action.yml has none, by design
// (Standard sec 4.1/4.4, restated in the file's own header comment): every decision lives in
// scripts/check.mjs and scripts/gha-action-outputs.mjs, both covered by their own test files. This
// asserts the artifact's SHAPE - the inputs/outputs contract a consumer's workflow depends on - the
// same way G8's folder-readme check asserts a README's inventory shape rather than its prose.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ACTION_PATH = path.join(ROOT, "action.yml");

function loadAction() {
  return parseYaml(readFileSync(ACTION_PATH, "utf8"));
}

test("action.yml parses as valid YAML and declares a composite action", () => {
  const action = loadAction();
  assert.equal(action.runs.using, "composite");
  assert.equal(typeof action.name, "string");
  assert.equal(typeof action.description, "string");
});

test("action.yml's description fits GitHub Marketplace's 125-character limit", () => {
  // Learned the hard way on 2026-09-03. The Marketplace listing validator REFUSES to publish an
  // Action whose `description` is 125 characters or longer, and it only says so on the release edit
  // screen - after the release exists, at the one moment a human is trying to finish the job. The
  // description had been 350 characters since the Action shipped, so nothing in this repository could
  // have told anyone until someone stood at that screen.
  //
  // Asserted here rather than remembered, because the failure mode is a person blocked mid-task with
  // no way to have known. The long form lives in the file's header comment and in
  // docs/how-to/run-the-gate-in-github-actions.md; this field is a storefront tagline, not the manual.
  const MARKETPLACE_LIMIT = 125;
  const action = loadAction();
  const d = action.description.replace(/\s+/g, " ").trim();
  assert.ok(
    d.length < MARKETPLACE_LIMIT,
    `action.yml description is ${d.length} characters; GitHub Marketplace refuses to list at ${MARKETPLACE_LIMIT} or more:\n  ${d}`,
  );
  assert.ok(d.length > 40, "a tagline this short says nothing; the limit is a ceiling, not a target");
});

test("action.yml declares the minimum required inputs: path, profile, fail-on-error, and machine-output toggles", () => {
  const action = loadAction();
  for (const name of ["path", "profile", "strict", "fail-on-error", "annotations", "sarif"]) {
    assert.ok(action.inputs[name], `missing input "${name}"`);
  }
  assert.equal(action.inputs.path.default, ".");
  assert.equal(action.inputs["fail-on-error"].default, "true");
});

test("action.yml declares the required outputs: earned tier plus error and warning counts", () => {
  const action = loadAction();
  for (const name of ["tier", "errors", "warnings", "sarif-path"]) {
    assert.ok(action.outputs[name], `missing output "${name}"`);
  }
});

test("action.yml's steps invoke scripts/check.mjs and scripts/gha-action-outputs.mjs from github.action_path, never a bare npm-installed \"agent-skills-toolkit\"", () => {
  const raw = readFileSync(ACTION_PATH, "utf8");
  assert.match(raw, /\$\{\{\s*github\.action_path\s*\}\}/, "must reference github.action_path (the checked-out repo at the pinned ref), not an npm install");
  assert.match(raw, /scripts\/check\.mjs/);
  assert.match(raw, /scripts\/gha-action-outputs\.mjs/);
  assert.doesNotMatch(raw, /npm\s+(install|i)\s+agent-skills-toolkit/, "must not npm-install the package itself (unpublished as of this release)");
});

// Built from character codes rather than typed as literals, deliberately: this repository's own
// house rule forbids writing an em-dash or en-dash to disk at all, including as a literal inside a
// detection regex.
test("action.yml carries no em-dashes or en-dashes anywhere in the file", () => {
  const raw = readFileSync(ACTION_PATH, "utf8");
  const emDash = String.fromCharCode(8212);
  const enDash = String.fromCharCode(8211);
  assert.ok(!raw.includes(emDash), "must not contain an em-dash");
  assert.ok(!raw.includes(enDash), "must not contain an en-dash");
});

test("this repository's own gate run through the Action's exact CLI pipeline (check.mjs --json piped through gha-action-outputs.mjs) reports Advanced with 0 errors, 0 warnings", async () => {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(path.join(tmpdir(), "askit-action-e2e-"));
  try {
    const gateJson = execFileSync(process.execPath, [path.join(ROOT, "scripts/check.mjs"), ROOT, "--json"], { encoding: "utf8" });
    const file = path.join(dir, "gate.json");
    writeFileSync(file, gateJson, "utf8");
    const out = execFileSync(process.execPath, [path.join(ROOT, "scripts/gha-action-outputs.mjs"), file], { encoding: "utf8" });
    assert.match(out, /^tier=advanced$/m);
    assert.match(out, /^errors=0$/m);
    assert.match(out, /^warnings=0$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
