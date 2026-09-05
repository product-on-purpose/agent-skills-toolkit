// The guard for a completeness claim about the check spine made in prose.
//
// Every case below is a REAL line, or a minimal edit of one, taken from the tree this guard was
// written against. The negative cases matter as much as the positive ones: the first draft of this
// guard decided completeness by testing the line for the words "full"/"every"/"all", and fired on
// two README bullets where "every shipped skill" and "every component" describe the checks' SUBJECT
// rather than claiming the list is complete. Those two lines are cases 5 and 6.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scanLine, findStaleEnumerations } from "../../scripts/check-doc-enumerations.mjs";

const stale = [
  ["full-spine list, one tier behind",
   "**Spine** - the 34-check backbone the toolkit ships (`U1`-`U9`, `U11`-`U14`, `S1`-`S8`, `G1`-`G10`)"],
  ["a tier count that agrees with its own stale list",
   "- **Bronze - Universal (`U1-U9`, `U11-U13`, 12 checks).** Certifies portable files"],
  ["two spans for one tier, no count",
   "- **Requires (`U1-U9`, `U11-U13`):**"],
  ["a range written in words that spans retired U10",
   "backed by checks `U1` through `U12`."],
];

const clean = [
  ["the current full-spine list",
   "The spine is **35 checks** total (`U1-U9`, `U11-U18`, `S1-S8`, `G1-G10`)"],
  ["a subset bullet whose prose says \"every\"",
   "  - `U11-U13` - well-formed MCP entries that commit no secrets, and every shipped skill registered"],
  ["a subset bullet starting at S1",
   "  - `S1-S2` - declared `agent-targets` and a short component `prefix` carried by every component"],
  ["a correct word-form range",
   "The Gold checks are `G1` through `G10`."],
  ["prose with no range at all", "The gate exits with a real status code."],
];

for (const [name, line] of stale) {
  test(`reports a stale claim: ${name}`, () => {
    assert.notEqual(scanLine(line), null, `expected a finding for: ${line}`);
  });
}

for (const [name, line] of clean) {
  test(`stays silent on: ${name}`, () => {
    assert.equal(scanLine(line), null, `unexpected finding for: ${line}`);
  });
}

test("the U10 message names why the gap exists, so a reader does not re-add it", () => {
  const msg = scanLine("each Universal check (`U1` through `U12`)");
  assert.match(msg, /U10/);
  assert.match(msg, /retired in Standard v0\.11/);
});

test("a stale count is reported with BOTH numbers, not just a complaint", () => {
  const msg = scanLine("- **Bronze - Universal (`U1-U9`, `U11-U13`, 12 checks).**");
  assert.match(msg, /12/);
  assert.match(msg, /16/);
});

test("the tree it guards is currently clean", () => {
  assert.deepEqual(findStaleEnumerations("."), []);
});
