import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check } from "../../scripts/checks/reference-links.mjs";

function skillCtx(body) {
  const root = mkdtempSync(path.join(tmpdir(), "rl-"));
  const dir = path.join(root, "skills", "s");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "SKILL.md"), "x");
  return { root, skills: [{ name: "s", dir, skillMdPath: path.join(dir, "SKILL.md"), body, frontmatter: { name: "s" }, parseError: null }] };
}

test("resolving relative link - no error", () => {
  const ctx = skillCtx("see [ref](references/a.md)");
  mkdirSync(path.join(ctx.skills[0].dir, "references"), { recursive: true });
  writeFileSync(path.join(ctx.skills[0].dir, "references", "a.md"), "hi");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("broken relative link is a U6 error", () => {
  const ctx = skillCtx("see [ref](references/missing.md)");
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.reqId === "U6" && f.severity === "error"));
});

test("http links are ignored", () => {
  const ctx = skillCtx("see [x](https://example.com)");
  assert.equal(check(ctx).length, 0);
});
