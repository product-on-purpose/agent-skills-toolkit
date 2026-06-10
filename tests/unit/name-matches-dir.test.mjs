import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/name-matches-dir.mjs";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { runGate } from "../../scripts/check.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const mismatch = path.join(FIXTURES, "anti/name-mismatch");

test("golden name == dir - no error", () => {
  assert.equal(check(loadPlugin(golden)).filter((f) => f.severity === "error").length, 0);
});

test("name != dir is a U4 error", () => {
  const findings = check(loadPlugin(mismatch));
  const err = findings.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U4");
  assert.match(err.message, /wrong-name/);
});

// Finding 4 (batch-2 corpus): name-vs-dir divergence is a hard error for an askit library (it commits to the
// canonical-name contract) but only advisory for a vanilla third-party plugin, where real plugins (gsd's 83
// "gsd:*" commands, hookify's display labels) deliberately use name as a label. plain-plugin downgrades U4 to
// warn so those plugins inform rather than fail; the default askit-library ladder keeps it an error.
const PROV = provenanceByReq();
const u4 = (over = {}) => resolveFindings(
  [{ reqId: "U4", check: "name-matches-dir", severity: "error", message: "name != dir" }],
  { mode: "local", profile: "askit-library", rules: {}, suppressions: [], ...over },
  PROV,
)[0];

test("U4 resolves to warn under the plain-plugin profile (advisory for vanilla plugins)", () => {
  assert.equal(u4({ profile: "plain-plugin" }).effectiveSeverity, "warn");
});

test("U4 stays an error under the default askit-library profile (no conformance change)", () => {
  assert.equal(u4({ profile: "askit-library" }).effectiveSeverity, "error");
});

// End-to-end through the real gate (runGate -> resolve -> tier-ceiling -> exit code), not just the
// resolver: the whole point of Finding 4 is an EXIT-CODE claim ("informs rather than fails"). A
// name-mismatch plugin must gate under the default ladder and only inform under plain-plugin.
test("end-to-end: a name-mismatch gates under default (U4 error, exit 1) but only informs under plain-plugin (U4 warn, exit 0)", () => {
  const def = runGate(mismatch);
  assert.equal(def.findings.find((f) => f.reqId === "U4")?.effectiveSeverity, "error");
  assert.equal(def.exitCode, 1, "name-mismatch fails the gate under the default askit-library ladder");

  const plain = runGate(mismatch, loadPlugin(mismatch), { profile: "plain-plugin" });
  assert.equal(plain.findings.find((f) => f.reqId === "U4")?.effectiveSeverity, "warn");
  assert.equal(plain.exitCode, 0, "name-mismatch only warns under plain-plugin - it informs, it does not fail");
});

// The safety argument of the U3 change: the colon-namespace / display-label inputs U3 now SKIPS are
// still caught by U4 (it owns the divergence). Pairs with the matching U3-skips tests in
// frontmatter-valid.test.mjs so a regression that made U4 also skip them cannot pass silently.
test("the colon-namespace input U3 now skips is still caught by U4 (raw check)", () => {
  const ctx = { root: ".", skills: [{ name: "add-backlog", skillMdPath: "skills/add-backlog/SKILL.md", frontmatter: { name: "gsd:add-backlog" }, parseError: null }] };
  const err = check(ctx).find((f) => f.severity === "error");
  assert.ok(err, "U4 owns the divergence U3 stopped flagging");
  assert.equal(err.reqId, "U4");
  assert.match(err.message, /gsd:add-backlog/);
});
