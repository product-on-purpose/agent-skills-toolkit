import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/frontmatter-valid.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const bad = path.join(FIXTURES, "anti/bad-frontmatter");

test("golden skill frontmatter is valid - no errors", () => {
  assert.equal(check(loadPlugin(golden)).filter((f) => f.severity === "error").length, 0);
});

test("bad frontmatter is a U3 error naming the file", () => {
  const findings = check(loadPlugin(bad));
  const err = findings.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U3");
  assert.match(err.file, /SKILL\.md$/);
});

test("missing required key (description) is a U3 error", () => {
  const ctx = { root: ".", skills: [{ name: "s", skillMdPath: "skills/s/SKILL.md", frontmatter: { name: "s" }, parseError: null }] };
  assert.ok(check(ctx).some((f) => f.reqId === "U3" && /description/.test(f.message)));
});
