import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeTierReport, humanLine } from "../../scripts/tier-report.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const missing = path.join(FIXTURES, "anti/missing-library-json");

test("golden reports universal satisfied, convergent blocked by S1+S2+S3 (minimal-skill fixture has no prefix/agent-targets/components)", () => {
  const r = computeTierReport(golden);
  assert.equal(r.tier, "universal");
  assert.deepEqual(r.satisfies, ["universal"]);
  // After registering S-checks, the minimal-skill fixture is missing agent-targets,
  // prefix, and components - all three block convergent. The gate keeps it at exit 0
  // because its declared tier is universal.
  const conv = r.blocked.convergent ?? [];
  assert.ok(conv.some((s) => s.startsWith("S1")), "S1 (agent-targets) expected");
  assert.ok(conv.some((s) => s.startsWith("S2")), "S2 (prefix) expected - fixture has no prefix field");
  assert.ok(conv.some((s) => s.startsWith("S3")), "S3 (components-index) expected");
});

test("missing library.json blocks universal (U1)", () => {
  const r = computeTierReport(missing);
  assert.equal(r.tier, "none");
  assert.ok(r.blocked.universal.some((s) => s.startsWith("U1")));
});

test("declared advanced but failing universal: reports none, blocked at universal", () => {
  const r = computeTierReport(path.join(FIXTURES, "anti/overclaim-advanced"));
  assert.equal(r.tier, "none");
  assert.ok(r.blocked.universal?.length >= 1);
  assert.ok(r.blocked.universal.some((s) => s.startsWith("U2")));
});

test("computeTierReport exposes declaredTier (null when no library.json declares one)", () => {
  assert.equal(computeTierReport(missing).declaredTier, null);
  assert.equal(computeTierReport(golden).declaredTier, "universal");
});

test("humanLine: no declared tier with a non-none tier reads as objective-pass, not an earned tier", () => {
  const line = humanLine({ tier: "advanced", satisfies: ["universal", "convergent", "advanced"], blocked: {}, declaredTier: null });
  assert.doesNotMatch(line, /Tier: Advanced/);
  assert.match(line, /objective/i);
});

test("humanLine: a declared tier that is satisfied still reads as that tier", () => {
  assert.match(humanLine({ tier: "advanced", blocked: {}, declaredTier: "advanced" }), /Tier: Advanced \(no blockers/);
});
