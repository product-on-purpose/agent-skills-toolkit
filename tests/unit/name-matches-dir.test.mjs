import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/name-matches-dir.mjs";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";

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
