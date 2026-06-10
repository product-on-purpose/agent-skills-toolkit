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

// Finding 4 (batch-2 corpus): when the frontmatter name is a display label or a namespaced command that
// differs from the directory, it is not being used as the canonical identifier. U4 (name-matches-dir) owns
// that divergence; U3 must not ALSO format-check the label as if it were a kebab identifier (double jeopardy).
function labelCtx(dirName, fmName, description = "a valid description") {
  return { root: ".", skills: [{ name: dirName, skillMdPath: `skills/${dirName}/SKILL.md`, frontmatter: { name: fmName, description }, parseError: null }] };
}

test("a display-label name (spaces/caps, differs from dir) does not trigger the U3 kebab format error", () => {
  const ctx = labelCtx("writing-rules", "Writing Hookify Rules");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("a colon-namespaced name (differs from dir) does not trigger the U3 kebab format error", () => {
  const ctx = labelCtx("add-backlog", "gsd:add-backlog");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("a malformed canonical name (name === dir, non-kebab) is still a U3 error", () => {
  const ctx = labelCtx("My_Skill", "My_Skill");
  const err = check(ctx).find((f) => f.severity === "error");
  assert.ok(err, "a non-kebab name that equals its dir is still flagged");
  assert.equal(err.reqId, "U3");
  assert.match(err.message, /name/);
});

test("a display-label name still gets the description check (only the NAME format is skipped)", () => {
  const ctx = { root: ".", skills: [{ name: "writing-rules", skillMdPath: "skills/writing-rules/SKILL.md", frontmatter: { name: "Writing Hookify Rules" }, parseError: null }] };
  assert.ok(check(ctx).some((f) => f.reqId === "U3" && /description/.test(f.message)), "missing description on a display-label skill still errors");
});
