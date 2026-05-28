import { test } from "node:test";
import assert from "node:assert/strict";
import { TIER_ORDER, tierForReq, ceilingIndex } from "../../scripts/lib/tier.mjs";

test("TIER_ORDER is universal, convergent, advanced", () => {
  assert.deepEqual(TIER_ORDER, ["universal", "convergent", "advanced"]);
});

test("tierForReq maps prefixes correctly", () => {
  assert.equal(tierForReq(null), "universal");
  assert.equal(tierForReq("U1"), "universal");
  assert.equal(tierForReq("U8"), "universal");
  assert.equal(tierForReq("S1"), "convergent");
  assert.equal(tierForReq("G3"), "advanced");
  assert.equal(tierForReq("A2"), "advanced");
});

test("ceilingIndex returns declared tier index or last when missing", () => {
  assert.equal(ceilingIndex("universal"), 0);
  assert.equal(ceilingIndex("convergent"), 1);
  assert.equal(ceilingIndex("advanced"), 2);
  assert.equal(ceilingIndex(undefined), 2);
  assert.equal(ceilingIndex(null), 2);
  assert.equal(ceilingIndex("bogus"), 2);
});
