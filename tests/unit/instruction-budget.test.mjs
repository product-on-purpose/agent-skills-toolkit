import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../../scripts/checks/instruction-budget.mjs";

function ctxWith(body) {
  return { root: ".", skills: [{ name: "s", skillMdPath: "skills/s/SKILL.md", body, frontmatter: { name: "s" }, parseError: null }] };
}

test("short skill - no warn", () => {
  assert.equal(check(ctxWith("# short\nsome steps")).length, 0);
});

test("over-long skill is a U7 WARN (never error)", () => {
  const big = "line\n".repeat(600);
  const findings = check(ctxWith(big));
  const w = findings.find((f) => f.reqId === "U7");
  assert.ok(w);
  assert.equal(w.severity, "warn");
  assert.equal(w.file, "skills/s/SKILL.md");
  assert.ok(!w.file.includes("\\"));
});
