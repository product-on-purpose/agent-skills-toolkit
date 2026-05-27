import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const missing = path.join(FIXTURES, "anti/missing-library-json");

test("golden reports universal satisfied, empty blocked", () => {
  const r = computeTierReport(golden);
  assert.equal(r.tier, "universal");
  assert.deepEqual(r.satisfies, ["universal"]);
  assert.deepEqual(r.blocked, {});
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
