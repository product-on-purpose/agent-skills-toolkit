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

// --- the CLI surface on both entry points ---

test("CLI evaluate.mjs --profile plain-plugin threads through to the JSON report", () => {
  const { stdout } = runCli("scripts/evaluate.mjs", [SF, "--format=json", "--profile", "plain-plugin"]);
  const r = JSON.parse(stdout);
  assert.equal(r.profile, "plain-plugin");
  assert.equal(r.findings.find((f) => f.reqId === "G2")?.effectiveSeverity, "off");
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
