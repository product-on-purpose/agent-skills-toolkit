import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

const golden = path.resolve("tests/fixtures/golden/minimal-skill");
const missing = path.resolve("tests/fixtures/anti/missing-library-json");

test("loads library.json, AGENTS.md, and skills", () => {
  const ctx = loadPlugin(golden);
  assert.equal(ctx.library.data.name, "minimal-skill");
  assert.ok(ctx.agentsMdPath.endsWith("AGENTS.md"));
  assert.equal(ctx.skills.length, 1);
  assert.equal(ctx.skills[0].name, "do-thing");
  assert.equal(ctx.skills[0].frontmatter.name, "do-thing");
  assert.equal(ctx.skills[0].parseError, null);
});

test("missing library.json yields null data, not a throw", () => {
  const ctx = loadPlugin(missing);
  assert.equal(ctx.library.data, null);
  assert.equal(ctx.skills.length, 0);
});
