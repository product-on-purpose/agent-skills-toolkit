import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, scoreDescription } from "../../scripts/checks/description-score.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const weak = path.join(FIXTURES, "anti/weak-description");

test("a strong description scores >= 0.7", () => {
  const s = scoreDescription("Converts a CSV file into a formatted summary table. Use when the user asks to summarize or tabulate spreadsheet data.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

test("a vague description scores < 0.7", () => {
  assert.ok(scoreDescription("Helps with stuff.") < 0.7);
});

test("golden produces no warn for description", () => {
  assert.equal(check(loadPlugin(golden)).filter((f) => f.reqId === "U5").length, 0);
});

test("an evaluate-verb description scores >= 0.7", () => {
  const s = scoreDescription("Evaluates a skill or plugin against the Standard. Use when you want to audit conformance or check what blocks the next tier.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

test("weak description is a WARN (never error) with U5", () => {
  const findings = check(loadPlugin(weak));
  const w = findings.find((f) => f.reqId === "U5");
  assert.ok(w);
  assert.equal(w.severity, "warn");
  assert.equal(findings.filter((f) => f.severity === "error").length, 0);
});
