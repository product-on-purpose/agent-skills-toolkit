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

test("a tier declaration the tool cannot read earns NO grade, in the line and in the data", () => {
  // Reproduced end to end before the fix: under the plain-plugin profile - which turns U1 off, and which
  // exists for plugins that have NOT adopted this Standard - a library.json declaring `tier: "banana"`
  // printed "Tier: Advanced (no blockers detected)" and exited 0. A top grade, from a declaration the
  // tool could not parse.
  //
  // humanLine already carried the reasoning for this exposure and even named the profile, but it tested
  // `declaredTier == null`. An unreadable tier is NOT null, so it walked straight past the guard written
  // for it. A missing declaration is a choice; an unreadable one is an error, and an error must not earn.
  // A sentinel for ABSENT, because the first version of this helper mapped null to {} - encoding the
  // very conflation under test, so the null case could not be expressed and quietly tested absence
  // instead. A test helper can carry the same defect as the code it guards.
  const ABSENT = Symbol("absent");
  const mk = (tier) => ({ library: { data: tier === ABSENT ? {} : { tier } }, root: "." });
  // An empty string is included deliberately: it is falsy, so a `declaredTier ? ... : -1` guard treats it
  // as "no declaration" while it is in fact a malformed one.
  // `null`, `3` and `""` are here because the FIRST version of this fix used `?? null`, which cannot
  // tell an ABSENT field from one explicitly declared null - so `"tier": null` was read as "never
  // declared" and earned Advanced, preserving the exact defect the fix was written to close. Presence
  // is the question, not nullishness.
  for (const bad of ["banana", "ADVANCED", "Gold", "", null, 3]) {
    const r = computeTierReport(".", mk(bad), []);
    assert.equal(r.tier, "none", `${JSON.stringify(bad)}: no tier is earned`);
    assert.equal(r.declaredTierValid, false, `${JSON.stringify(bad)}: the data says the declaration is invalid`);
    assert.deepEqual(r.satisfies, [], `${JSON.stringify(bad)}: nothing is claimed as satisfied`);
    const line = humanLine(r);
    assert.match(line, /not graded/, `${JSON.stringify(bad)}: the human line refuses to grade`);
    if (typeof bad === "string" && bad !== "") assert.ok(line.includes(bad), "and quotes back what was actually declared");
    assert.ok(!/Advanced \(no blockers/.test(line), "never the top grade");
  }

  // The two states it must NOT change.
  const missing = computeTierReport(".", mk(ABSENT), []);
  assert.match(humanLine(missing), /not graded against the tier ladder/, "a MISSING tier is unchanged");
  const valid = computeTierReport(".", mk("universal"), []);
  assert.equal(valid.tier, "universal", "a valid declaration still grades");
  assert.equal(valid.declaredTierValid, true, "and is marked valid in the data");
});
