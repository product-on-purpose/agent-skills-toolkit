// what-it-is:   the decision table for release-ready (review wave 2, H2)
// what-it-does: proves which exit codes block a tag, that vendor-watch exit 1 is NOT overridable at any level,
//               and that both release workflows actually invoke the aggregate
// why:          the gate this file guards replaced a CHECKLIST LINE. A line in RELEASE.md asking a human to
//               confirm the vendor watch was green is exactly as reliable as the memory the watch was built to
//               replace, and neither release.yml nor publish-npm.yml ran it. Tests here, and an assertion that
//               the workflows call it, are what make it a gate rather than a second piece of prose
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GATES, gateBlocks, overrideApplies, summarize, exitCodeFor, renderSummary } from "../../scripts/lib/release-ready.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const gate = (id) => GATES.find((g) => g.id === id);
const allPass = () => GATES.map((g) => ({ id: g.id, code: 0 }));
const withCode = (id, code) => allPass().map((r) => (r.id === id ? { ...r, code } : r));

test("everything green is releasable", () => {
  const s = summarize(allPass());
  assert.equal(s.ok, true);
  assert.equal(exitCodeFor(s), 0);
});

test("vendor-watch exit 1 BLOCKS: a claim is gone or stale", () => {
  // The whole reason this aggregate exists. Before it, this was a human ticking a box.
  const s = summarize(withCode("vendor-watch", 1));
  assert.equal(s.ok, false);
  assert.equal(exitCodeFor(s), 1);
  assert.equal(s.rows.find((r) => r.id === "vendor-watch").status, "BLOCK");
});

test("vendor-watch exit 2 BLOCKS: a run that could not read a page proved nothing", () => {
  const s = summarize(withCode("vendor-watch", 2));
  assert.equal(s.ok, false);
  assert.equal(exitCodeFor(s), 1);
});

test("the override excuses an UNREACHABLE page (exit 2) and records why", () => {
  const s = summarize(withCode("vendor-watch", 2), { overrideReason: "code.claude.com returning 503 all morning" });
  assert.equal(s.ok, true);
  assert.equal(s.rows.find((r) => r.id === "vendor-watch").status, "overridden");
  assert.match(renderSummary(s), /OVERRIDE IN EFFECT: code\.claude\.com returning 503/);
});

test("the override does NOT excuse a claim that is gone or stale (exit 1), whatever reason is given", () => {
  // The asymmetry is the design. Exit 2 is a third party's outage; exit 1 is this repository publishing
  // something the vendor no longer says. No reason string makes shipping that acceptable, so none is taken.
  for (const reason of ["we are in a hurry", "known, tracked in #999", "x".repeat(500)]) {
    const s = summarize(withCode("vendor-watch", 1), { overrideReason: reason });
    assert.equal(s.ok, false, `exit 1 was excused by the reason "${reason.slice(0, 24)}"`);
  }
});

test("an EMPTY or whitespace override reason is not an override", () => {
  for (const reason of ["", "   ", "\n", null, undefined]) {
    assert.equal(overrideApplies(gate("vendor-watch"), 2, reason), false);
  }
});

test("the override is scoped to vendor-watch: it cannot excuse the conformance gate", () => {
  const s = summarize(withCode("conformance", 1), { overrideReason: "please" });
  assert.equal(s.ok, false);
  assert.equal(overrideApplies(gate("conformance"), 1, "please"), false);
});

test("a gate with no blocksOn list blocks on ANY non-zero code", () => {
  assert.equal(gateBlocks(gate("conformance"), 0), false);
  for (const code of [1, 2, 3, 127]) assert.equal(gateBlocks(gate("conformance"), code), true);
});

test("a gate that could not be spawned is NOT a pass", () => {
  // spawnSync returns status null when the process dies on a signal or never starts, and Number(null) is 0.
  // The CLI maps that to 127; this asserts 127 blocks, so the mapping cannot be quietly changed to 0.
  const s = summarize(withCode("readme-drift", 127));
  assert.equal(s.ok, false);
});

test("an UNKNOWN gate id in the results blocks rather than being ignored", () => {
  // A result the summary cannot attribute is a bug in the caller. Skipping it would report a clean release
  // from a run whose gates did not match the declared list.
  const s = summarize([...allPass(), { id: "not-a-gate", code: 0 }]);
  assert.equal(s.ok, false);
});

test("the report never claims an override was in effect when nothing was overridden", () => {
  // Caught by running the CLI against a deliberately-broken pin: a blocked run printed "OVERRIDE IN EFFECT"
  // above "NOT releasable", which reads as an exception having been granted. It had not been - the design's
  // whole point is that exit 1 cannot be. Output that misdescribes its own decision is the class of defect
  // this aggregate exists to remove, so it does not get to have one.
  const out = renderSummary(summarize(withCode("vendor-watch", 1), { overrideReason: "trying to sneak past" }));
  assert.doesNotMatch(out, /OVERRIDE IN EFFECT/);
  assert.match(out, /Override offered and NOT APPLIED/);
  assert.match(out, /NOT releasable/);
});

test("a real override names exactly which gate it excused", () => {
  const out = renderSummary(summarize(withCode("vendor-watch", 2), { overrideReason: "vendor 503" }));
  assert.match(out, /OVERRIDE IN EFFECT: vendor 503/);
  assert.match(out, /It excused: vendor-watch \(exit 2\)/);
});

test("the report leads with what blocks", () => {
  const out = renderSummary(summarize(withCode("vendor-watch", 1)));
  const lines = out.split("\n").filter((l) => /^(ok|BLOCK|override|UNKNOWN)/.test(l));
  assert.match(lines[0], /^BLOCK/);
  assert.match(out, /NOT releasable/);
});

test("BOTH release workflows invoke the aggregate, or it is prose again", () => {
  // The finding this file answers was not "there is no aggregate" - it was that the release-blocking
  // preconditions lived in a checklist. An aggregate no workflow calls is the same defect in a new file.
  for (const rel of [".github/workflows/release.yml", ".github/workflows/publish-npm.yml"]) {
    const wf = readFileSync(path.join(REPO, rel), "utf8");
    assert.match(wf, /scripts\/release-ready\.mjs/, `${rel} does not run the release-ready aggregate`);
  }
});

test("the RELEASE.md checklist points at the command rather than asking for a memory", () => {
  const md = readFileSync(path.join(REPO, "docs/internal/RELEASE.md"), "utf8");
  assert.match(md, /npm run release-ready/, "the checklist must name the command that proves the line");
});
