// what-it-is:   coverage for U16 (metadata-placement), ADR 0050
// what-it-does: asserts both messages, the open-vocabulary decision, presence-not-nullishness, and the pin
// why:          ADR 0050's DECISION is that an unknown key is NOT a defect - strictness would fail 44.9% of
//               2342 measured skills against a metadata map the upstream spec defines as arbitrary. A test
//               that only checked the positive cases would pass against a strict implementation
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { check, meta } from "../../scripts/checks/metadata-placement.mjs";
import { resolveFindings, gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { SINCE_BY_REQ } from "../../scripts/lib/standard-gate.mjs";

const ctxOf = (frontmatter) => ({
  root: "/x",
  skills: [{ name: "demo", skillMdPath: "/x/skills/demo/SKILL.md", frontmatter }],
});

test("meta declares U16 universal, house, since 0.14, with no migration metadata", () => {
  assert.equal(meta.reqId, "U16");
  assert.equal(meta.tier, "universal");
  // house, NOT vendor-cited: sec 3.7's placement is this Standard's convention. The version that would
  // earn a vendor citation needs a published closed field list, which agentskills.io does not have.
  assert.equal(meta.provenance, "house");
  assert.equal(meta.since, "0.14");
  assert.equal(meta.migration, undefined, "a NEW check needs no migration metadata (ADR 0044 point 3)");
});

test("a top-level sec 3.7 key with NO nested copy is reported as silently lost, and names its destination", () => {
  // The live case: all six shipped critique-skills skills declare `version` at the top level with no
  // metadata block at all, violating a sec 3.7 REQUIRED rule invisibly at Convergent with 0 errors.
  const f = check(ctxOf({ name: "demo", description: "d", version: "0.1.0" }));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /nothing reads it and the declaration is silently lost/);
  assert.match(f[0].message, /Move it to metadata\.version/);
});

test("a top-level key that is ALSO nested gets the OTHER message, because it is a different situation", () => {
  const f = check(ctxOf({ name: "demo", version: "9.9.9", metadata: { version: "0.1.0" } }));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /at the top level AND under "metadata"/);
  assert.match(f[0].message, /can silently drift/);
  assert.doesNotMatch(f[0].message, /silently lost/, "the nested copy IS read; saying it is lost would be false");
});

test("a correctly nested key reports nothing", () => {
  assert.deepEqual(check(ctxOf({ name: "demo", metadata: { version: "0.1.0", tier: "universal" } })), []);
});

test("THE VOCABULARY IS OPEN: an unknown top-level key is never a finding", () => {
  // The decision, asserted so a future strictness proposal fails here rather than in the wild. Measured
  // across 2342 skills in thirteen sources: 44.9% carry an unknown TOP-LEVEL key and 58.2% an unknown
  // metadata.* key. `compatibility` alone appears 971 times, metadata.author 1158, metadata.tags 1154.
  // Three family members sit at 100% on one axis or the other. And sec 3.7's own first sentence calls
  // the metadata map ARBITRARY, so rejecting unknown keys inside it contradicts the upstream spec.
  const exotic = {
    name: "demo", description: "d",
    compatibility: ["claude"], intent: "x", best_for: ["y"], scenarios: [], triggers: [], when_to_use: "z",
    metadata: { version: "0.1.0", author: "someone", tags: ["a"], frameworks: [], "use-cases": [] },
  };
  assert.deepEqual(check(ctxOf(exotic)), [], "an open vocabulary means open, at both levels");
});

test("PRESENCE, not nullishness: an explicit top-level `version: null` is still reported", () => {
  // `?? null` cannot distinguish an absent key from an explicitly null one, and an author who wrote
  // `version:` with no value has still put a declaration in the wrong place. This is the same defect
  // shape the v1.13.0 round-8 tier fix corrected, which is why Object.hasOwn is load-bearing.
  const f = check(ctxOf({ name: "demo", version: null }));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /declares "version" at the top level/);
});

test("every sec 3.7 key is covered, and each produces its own finding", () => {
  const all = { name: "demo", version: "1", updated: "d", tier: "t", audience: "a", category: "c",
                "agent-targets": [], status: "s", "deprecated-by": "x", "remove-in": "y", chain: [] };
  assert.equal(check(ctxOf(all)).length, 10, "ten sec 3.7 keys, ten findings");
});

test("an unparseable frontmatter is U3's finding, not this one's", () => {
  assert.deepEqual(check({ root: "/x", skills: [{ name: "d", skillMdPath: "/x/s", parseError: "bad yaml", frontmatter: null }] }), []);
});

test("the check reads skills only, and that scope is a DECISION (E22 owns agents/)", () => {
  // ADR 0050 point 6. Asserted so widening it silently is a test failure rather than a quiet change of
  // subject: whether component frontmatter checks extend to agents/ is E22's open question.
  const ctx = { root: "/x", skills: [], subagents: [{ name: "a", frontmatter: { version: "1" } }], agentDocs: [{ name: "a", frontmatter: { version: "1" } }] };
  assert.deepEqual(check(ctx), []);
});

test("U16 is held at warn below 0.14 and gates at 0.14", () => {
  const raw = check(ctxOf({ name: "demo", version: "0.1.0" }));
  const PROV = provenanceByReq();
  const resolve = (pinned) => resolveFindings(raw, configFrom({}), PROV, { pinned, sinceByReq: SINCE_BY_REQ })[0];

  const held = resolve("0.12");
  assert.equal(held.severity, "error", "the check emits its TARGET severity, always");
  assert.equal(held.effectiveSeverity, "warn");
  assert.equal(gatingFindings([held]).length, 0);
  assert.equal(held.ceiling.constraints[0].cause, "since");

  const due = resolve("0.14");
  assert.equal(due.effectiveSeverity, "error");
  assert.equal(due.ceiling, null);
  assert.equal(gatingFindings([due]).length, 1);
});
