import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { evaluate } from "../../scripts/evaluate.mjs";
import { runGate } from "../../scripts/check.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

// The --profile flag (corpus-run finding A-1): grade a third-party plugin under a chosen profile WITHOUT
// writing askit.config.json into its tree. It mirrors --mode: an opts/CLI value that overrides the loaded
// config's profile, resolved through the same resolveFindings path. The silver fixture declares convergent
// and is blocked from Gold by the house checks G2/G4/G5; plain-plugin turns the house set off, so those
// findings resolve to "off" instead of "error" - the discriminating, deterministic signal.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SF = path.join(ROOT, "tests/fixtures/golden/silver-fixture");
const GOLD_BLOCKERS = ["G2", "G4", "G5"];

const sevOf = (r, reqId) => r.findings.find((f) => f.reqId === reqId)?.effectiveSeverity;

function runCli(script, args) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(ROOT, script), ...args], { encoding: "utf8" });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

// --- evaluate(): opts.profile overrides the (absent) config profile ---

test("evaluate: opts.profile=plain-plugin turns the house Gold checks off without a config file", () => {
  const r = evaluate(SF, { profile: "plain-plugin" });
  assert.equal(r.profile, "plain-plugin", "the report records the active profile");
  for (const id of GOLD_BLOCKERS) {
    assert.equal(sevOf(r, id), "off", `${id} (a house check) is off under plain-plugin`);
  }
});

test("evaluate: default profile is askit-library and the house checks still fire (regression guard)", () => {
  const r = evaluate(SF);
  assert.equal(r.profile, "askit-library");
  assert.equal(sevOf(r, "G2"), "error", "G2 still fires as an error under the default profile");
});

// --- runGate() (the gate): opts.profile is honored too ---

test("runGate: opts.profile=plain-plugin resolves the house checks off", () => {
  const r = runGate(SF, loadPlugin(SF), { profile: "plain-plugin" });
  for (const id of GOLD_BLOCKERS) {
    assert.equal(r.findings.find((f) => f.reqId === id)?.effectiveSeverity, "off", `${id} off under plain-plugin`);
  }
});

// --- component scope (ADR 0034): --profile is resolved, not silently dropped ---
// Before the fix, evaluateComponent() never saw opts: a third-party single skill graded with
// --profile plain-plugin still got the house checks (U5), and report.profile was undefined.
// The vague anti-fixture fires U5 (house) as a warn under the default ladder - the discriminating signal.

const VAGUE = path.join(ROOT, "tests/fixtures/anti/weak-description/skills/vague");

test("evaluate component: opts.profile=plain-plugin turns the house U5 off and records the profile", () => {
  const r = evaluate(VAGUE, { profile: "plain-plugin" });
  assert.equal(r.scope, "component");
  assert.equal(r.profile, "plain-plugin", "the component report records the active profile");
  assert.equal(sevOf(r, "U5"), "off", "U5 (house provenance) resolves off under plain-plugin");
  assert.equal(r.summary.warns, 0, "an off finding is not counted as a warning");
});

test("evaluate component: default profile is askit-library and U5 still warns (regression guard)", () => {
  const r = evaluate(VAGUE);
  assert.equal(r.scope, "component");
  assert.equal(r.profile, "askit-library");
  assert.equal(sevOf(r, "U5"), "warn", "U5 still fires as a warn under the default ladder");
});

test("CLI evaluate.mjs component scope threads --profile through to the JSON report", () => {
  const { code, stdout } = runCli("scripts/evaluate.mjs", [VAGUE, "--format=json", "--profile", "plain-plugin"]);
  const r = JSON.parse(stdout);
  assert.equal(r.scope, "component");
  assert.equal(r.profile, "plain-plugin");
  assert.equal(r.findings.find((f) => f.reqId === "U5")?.effectiveSeverity, "off");
  assert.equal(code, 0, "an off finding must not fail the gate exit");
});

test("evaluate component: opts.mode threads through and defaults to local", () => {
  assert.equal(evaluate(VAGUE).mode, "local");
  assert.equal(evaluate(VAGUE, { mode: "published-verdict" }).mode, "published-verdict");
});

// --- component scope + a skill-dir config: file-scoped suppressions must match the finding paths ---
// The config and the findings must share one root (the skill directory). If findings stay rooted at the
// parent dir (file "linkrot/SKILL.md") while the config sits in the skill dir, a natural file glob
// ("SKILL.md") never matches and the suppressed error still fails the gate.

const LINKROT = path.join(ROOT, "tests/fixtures/anti/component-config/linkrot");

test("evaluate component: a file-scoped suppression in the skill-dir config waives the error", () => {
  const r = evaluate(LINKROT);
  const u6 = r.findings.find((f) => f.reqId === "U6");
  assert.ok(u6, "the dangling link fires U6");
  assert.equal(u6.suppressed, true, "the file-scoped suppression matches the component finding path");
  assert.equal(r.summary.errors, 0, "a suppressed error is not counted");
});

test("CLI evaluate.mjs component scope: a suppressed error does not fail the gate (exit 0)", () => {
  const { code } = runCli("scripts/evaluate.mjs", [LINKROT, "--format=json"]);
  assert.equal(code, 0);
});

// --- the CLI surface on both entry points ---

test("CLI evaluate.mjs --profile plain-plugin threads through to the JSON report", () => {
  const { code, stdout } = runCli("scripts/evaluate.mjs", [SF, "--format=json", "--profile", "plain-plugin"]);
  const r = JSON.parse(stdout);
  assert.equal(r.profile, "plain-plugin");
  assert.equal(r.findings.find((f) => f.reqId === "G2")?.effectiveSeverity, "off");
  assert.equal(code, 0, "the report and the process exit must agree after profile resolution");
});

test("CLI evaluate.mjs rejects an unknown --profile with exit 2", () => {
  const { code, stderr } = runCli("scripts/evaluate.mjs", [SF, "--profile", "bogus"]);
  assert.equal(code, 2);
  assert.match(stderr, /invalid --profile/);
});

test("CLI check.mjs rejects an unknown --profile with exit 2", () => {
  const { code, stderr } = runCli("scripts/check.mjs", [SF, "--profile", "bogus"]);
  assert.equal(code, 2);
  assert.match(stderr, /invalid --profile/);
});

test("CLI check.mjs --profile plain-plugin grades the silver fixture without error", () => {
  const { code } = runCli("scripts/check.mjs", [SF, "--profile", "plain-plugin"]);
  assert.equal(code, 0, "plain-plugin grades the valid silver fixture clean");
});
