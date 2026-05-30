import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderManifest, renderClaudeNativeManifest, renderCodexNativeManifest } from "../../scripts/generators/gen-manifest.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("renderManifest projects library.json + skills into a resolved index", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/minimal-skill"));
  const m = JSON.parse(renderManifest(ctx));
  assert.equal(m.name, "minimal-skill");
  assert.equal(m.tier, "universal");
  assert.ok(Array.isArray(m.skills));
  assert.equal(m.skills[0].name, "do-thing");
});

const LIB_CTX = {
  library: {
    data: {
      name: "agent-skills-toolkit",
      version: "0.1.0",
      description: "Toolkit and Standard for cross-agent skill libraries.",
      author: { name: "product-on-purpose" },
      homepage: "https://example.com/repo",
      repository: "https://example.com/repo",
      keywords: ["skills", "standard"],
      "agent-targets": ["claude", "codex"],
    },
  },
};

test("renderClaudeNativeManifest emits the shared spine from library.json", () => {
  const m = JSON.parse(renderClaudeNativeManifest(LIB_CTX));
  assert.equal(m.name, "agent-skills-toolkit");
  assert.equal(m.version, "0.1.0");
  assert.deepEqual(m.author, { name: "product-on-purpose" });
  assert.deepEqual(m.keywords, ["skills", "standard"]);
  assert.equal(m.skills, undefined, "Claude manifest has no skills pointer");
  assert.equal(m.interface, undefined, "Claude manifest has no interface block");
});

test("renderCodexNativeManifest adds skills pointer + interface block", () => {
  const m = JSON.parse(renderCodexNativeManifest(LIB_CTX));
  assert.equal(m.name, "agent-skills-toolkit");
  assert.equal(m.version, "0.1.0");
  assert.equal(m.skills, "./skills/");
  assert.equal(m.interface.displayName, "Agent Skills Toolkit");
  assert.equal(m.interface.category, "Engineering");
});

test("renderCodexNativeManifest honors explicit displayName/category overrides", () => {
  const ctx = { library: { data: { name: "x-y", version: "1.0.0", displayName: "Custom Name", category: "Productivity" } } };
  const m = JSON.parse(renderCodexNativeManifest(ctx));
  assert.equal(m.interface.displayName, "Custom Name");
  assert.equal(m.interface.category, "Productivity");
});

test("renderManifest indexes commands with name + maps-to", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/command-fixture"));
  const obj = JSON.parse(renderManifest(ctx));
  assert.ok(Array.isArray(obj.commands));
  assert.deepEqual(obj.commands.map((c) => c.name), ["cf-do-thing"]);
  assert.equal(obj.commands[0].mapsTo, "cf-do-thing");
});
