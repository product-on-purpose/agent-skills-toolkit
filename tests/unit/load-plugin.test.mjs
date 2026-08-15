import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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

test("loads commands from commands/*.md into ctx.commands", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/command-fixture"));
  assert.deepEqual(ctx.commands.map((c) => c.name), ["cf-do-thing"]);
  assert.equal(ctx.commands[0].frontmatter["maps-to"], "cf-do-thing");
  assert.equal(ctx.commands[0].parseError, null);
});

test("ctx.commands is empty when no commands/ dir exists", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/minimal-skill"));
  assert.deepEqual(ctx.commands, []);
});

// --- ADR 0047: ctx.workflows -------------------------------------------------------------------

test("ADR 0047: ctx.workflows excludes README.md and _-prefixed files, and includes everything else", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-workflows-"));
  try {
    mkdirSync(path.join(dir, "_workflows"), { recursive: true });
    for (const [name, body] of [
      ["real-arc.md", "---\ntitle: Real\nsteps:\n  - one\n---\n"],
      ["another.md", "---\ntitle: Another\n---\n"],
      ["README.md", "---\ntitle: Workflows\n---\n"],
      ["_control.md", "---\ntitle: Control\n---\n"],
      ["notes.txt", "not markdown"],
    ]) writeFileSync(path.join(dir, "_workflows", name), body);

    const names = loadPlugin(dir).workflows.map((w) => w.name).sort();
    assert.deepEqual(names, ["another", "real-arc"]);

    // The README exclusion is correct HERE and would be wrong in agents/: no runtime scans
    // _workflows/, so a folder guide there creates no phantom. listRuntimeAgentDocs excludes
    // nothing for exactly the opposite reason (ADR 0046). The two must not be "harmonised".
    assert.ok(!names.includes("README"), "a folder guide is not a workflow");
    assert.ok(!names.includes("_control"), "an underscore control file is not a workflow");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ADR 0047: a plugin with no _workflows/ yields [], never undefined", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-workflows-none-"));
  try {
    // undefined is what S7 read for the whole life of the field, and `(undefined || []).map` hides it
    // silently. An empty array makes "no workflows" and "the loader forgot" different states.
    assert.deepEqual(loadPlugin(dir).workflows, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ADR 0047: a workflow's name is the FILENAME, not a frontmatter field", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-workflows-name-"));
  try {
    mkdirSync(path.join(dir, "_workflows"), { recursive: true });
    // Workflows in the wild carry `title`, not `name`, and `maps-to` plus the Standard's
    // `_workflows/<name>.md` both refer to the basename. Taking the frontmatter would make a
    // command's maps-to resolve against a value the Standard never points at.
    writeFileSync(path.join(dir, "_workflows", "design-sprint.md"), "---\ntitle: Design Sprint\nname: something-else\n---\n");
    assert.deepEqual(loadPlugin(dir).workflows.map((w) => w.name), ["design-sprint"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
