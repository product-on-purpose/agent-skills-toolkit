import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin, loadSkill } from "../../scripts/lib/load-plugin.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const missing = path.join(FIXTURES, "anti/missing-library-json");

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

test("loadSkill loads one skill dir into a SkillInfo", () => {
  const dir = path.join(FIXTURES, "golden/minimal-skill/skills/do-thing");
  const s = loadSkill(dir);
  assert.equal(s.name, "do-thing");
  assert.equal(s.frontmatter.name, "do-thing");
  assert.equal(s.parseError, null);
  assert.match(s.skillMdPath, /SKILL\.md$/);
});

test("loads subagents from agents/*.md into ctx.subagents (and excludes _chain-permitted.yaml)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  // agents/ holds sf-worker.md AND _chain-permitted.yaml; only the subagent .md is loaded.
  assert.deepEqual(ctx.subagents.map((s) => s.name), ["sf-worker"]);
  assert.equal(ctx.subagents[0].frontmatter.name, "sf-worker");
  assert.deepEqual(ctx.subagents[0].frontmatter.chain ?? null, null);
  assert.equal(ctx.subagents[0].parseError, null);
});

test("ctx.subagents is empty when no agents/ dir exists", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/minimal-skill"));
  assert.deepEqual(ctx.subagents, []);
});
