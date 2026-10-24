import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderManifest, renderClaudeNativeManifest, renderCodexNativeManifest, fieldLosses, NATIVE_LIB_KEY_MAP } from "../../scripts/generators/gen-manifest.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.resolve(HERE, "../../scripts/generators/gen-manifest.mjs");

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

// --- fieldLosses (E72: adopting a plugin can wipe its hand-written manifest fields) ---
//
// These exercise the REAL NATIVE_LIB_KEY_MAP gen-manifest.mjs's own CLI driver uses (it is the
// function's default fourth argument), not a local copy, so a change to the production table
// is exercised here too.

test("fieldLosses flags every spine field a rich manifest carries that a thin library.json does not supply", () => {
  const existing = {
    homepage: "https://example.com/pm-skills",
    repository: "https://example.com/pm-skills.git",
    license: "MIT",
    author: { name: "PM Author" },
    keywords: ["pm", "skills"],
  };
  const rendered = { homepage: null, repository: null, author: null, keywords: [] }; // no "license" key at all, same as the real renderer omits it
  const lib = {}; // the adopt-mode minimum: none of these fields
  const lost = fieldLosses(existing, rendered, lib);
  assert.deepEqual(
    lost.map((l) => l.field).sort(),
    ["author", "homepage", "keywords", "license", "repository"],
    "every non-empty existing field the thin library.json does not supply is named"
  );
});

test("fieldLosses flags every Codex interface field library.json does not supply, not just displayName/category", () => {
  // Shaped after the real pm-skills measurement: a rich interface block with fields the
  // renderer never emits at all (shortDescription, brandColor, ...), alongside the two it does
  // (displayName, category). library.json supplies both of those two, so only the fields with
  // no library.json home are reported.
  const existing = {
    interface: {
      displayName: "PM Skills",
      shortDescription: "Product management skills for AI agents",
      developerName: "Product on Purpose",
      category: "Productivity",
      brandColor: "#2563EB",
      screenshots: [], // already empty: never a loss
    },
  };
  const rendered = { interface: { displayName: "Pm Skills", category: "Engineering" } }; // the computed default, not a drop to null
  const lib = { displayName: "PM Skills", category: "Productivity" };
  const lost = fieldLosses(existing, rendered, lib);
  assert.deepEqual(
    lost.map((l) => l.field).sort(),
    ["interface.brandColor", "interface.developerName", "interface.shortDescription"],
    "displayName/category are supplied by library.json (regeneration); the rest have no library.json home at all"
  );
  for (const l of lost) assert.equal(l.libKey, null, "an interface field the renderer never emits has no libKey mapping");
});

test("fieldLosses flags a Codex interface field that library.json does not supply, even though neither side is empty", () => {
  const existing = { interface: { displayName: "PM Skills", category: "Productivity" } };
  const rendered = { interface: { displayName: "Pm Skills", category: "Engineering" } }; // the computed default, not a drop to null
  const lost = fieldLosses(existing, rendered, {});
  assert.deepEqual(lost.map((l) => l.field).sort(), ["interface.category", "interface.displayName"]);
  assert.deepEqual(lost.map((l) => l.libKey).sort(), ["category", "displayName"]);
});

test("fieldLosses allows a field library.json supplies with a new value: a deliberate regeneration, not a loss", () => {
  const existing = { homepage: "https://example.com/old" };
  const rendered = { homepage: "https://example.com/new" };
  const lib = { homepage: "https://example.com/new" };
  const lost = fieldLosses(existing, rendered, lib);
  assert.deepEqual(lost, [], "library.json supplying the differing value makes this a regeneration, never a loss");
});

test("fieldLosses reports nothing in the steady state: existing and rendered already agree", () => {
  const existing = { homepage: "https://example.com/repo", keywords: ["a", "b"] };
  const rendered = { homepage: "https://example.com/repo", keywords: ["a", "b"] };
  const lost = fieldLosses(existing, rendered, {});
  assert.deepEqual(lost, []);
});

test("fieldLosses reports nothing when the existing manifest never carried the field", () => {
  const existing = {};
  const rendered = { author: null, keywords: [] };
  const lost = fieldLosses(existing, rendered, {});
  assert.deepEqual(lost, [], "nothing on disk means nothing to lose");
});

test("fieldLosses flags a Claude top-level key the renderer never emits (icon, hooks, commands, agents, inline mcpServers)", () => {
  const existing = {
    icon: "./icon.png",
    hooks: { PreToolUse: [{ matcher: "Bash", hooks: [] }] },
    commands: ["./commands/foo.md"],
    agents: ["./agents/bar.md"],
    mcpServers: { demo: { command: "node", args: ["server.js"] } },
  };
  const rendered = {}; // renderClaudeNativeManifest never produces any of these
  const lost = fieldLosses(existing, rendered, {});
  assert.deepEqual(
    lost.map((l) => l.field).sort(),
    ["agents", "commands", "hooks", "icon", "mcpServers"],
    "none of these have a library.json home, so the renderer dropping them is always a loss"
  );
});

test("fieldLosses treats a renderer-owned field's formatting difference as a regeneration, not a loss (E72, round 2: the skills-pointer bug)", () => {
  // The Codex renderer always emits the "skills" pointer as "./skills/" on its own; it is not
  // library.json's to supply at all (there is no map entry for it). An existing file still
  // carrying the old "./skills" (no trailing slash) is the renderer fixing its own formatting,
  // not a field a plugin author hand-wrote and is now losing.
  const existing = { skills: "./skills" };
  const rendered = { skills: "./skills/" };
  const lost = fieldLosses(existing, rendered, {});
  assert.deepEqual(lost, [], '"./skills" and "./skills/" name the same path: a regeneration, never a loss with "no library.json home"');
});

test("fieldLosses still flags a renderer-owned field the renderer OMITS entirely this render, even with no map entry", () => {
  // The distinction is "the renderer emits a value here" (regeneration), not "there is no map
  // entry" (which alone would wrongly excuse every unmapped field, including a true drop).
  const existing = { skills: "./skills/" };
  const rendered = {}; // this render never reached the "skills" key at all (e.g. a non-codex render)
  const lost = fieldLosses(existing, rendered, {});
  assert.deepEqual(lost.map((l) => l.field), ["skills"], "omitted entirely in this render, so still a loss despite having no library.json home");
});

test("fieldLosses still flags a renderer-owned field the renderer renders EMPTY this render (not just undefined), even with no map entry", () => {
  // "Renderer owns it" must mean "emits a genuine, non-empty value," not merely "the key is
  // present." An empty string/array/object at an unmapped path is as good as omitted.
  const existing = { skills: "./skills/" };
  const rendered = { skills: "" };
  const lost = fieldLosses(existing, rendered, {});
  assert.deepEqual(lost.map((l) => l.field), ["skills"], "an empty rendered value at an unmapped path is still a loss, not a regeneration");
});

// E72, round 3. Round 2 excused ANY non-empty rendered value at a key with no library.json home,
// so each case below was replaced without a refusal. Only a path spelled two ways is forgiven now.
test("fieldLosses flags a different path at an unmapped key, even though the renderer emits a non-empty value there (E72, round 3)", () => {
  const lost = fieldLosses({ skills: "./src/agent-skills/" }, { skills: "./skills/" }, {});
  assert.deepEqual(lost.map((l) => l.field), ["skills"], "a custom skills directory is hand-written content, not path spelling");
});

test("fieldLosses flags a hand-written inline object the renderer would replace with a pointer (E72, round 3)", () => {
  const existing = { mcpServers: { handwritten: { command: "node", args: ["inline-server.js"] } } };
  const lost = fieldLosses(existing, { mcpServers: "./.mcp.json" }, {});
  assert.deepEqual(lost.map((l) => l.field), ["mcpServers"], "an inline server definition is not the same value as a pointer to .mcp.json");
});

test("fieldLosses flags an array the renderer would replace with a single string (E72, round 3)", () => {
  const lost = fieldLosses({ skills: ["./skills/", "./extra-skills/"] }, { skills: "./skills/" }, {});
  assert.deepEqual(lost.map((l) => l.field), ["skills"]);
});

test("fieldLosses flags an existing interface that is not an object, which the render replaces whole (E72, round 3)", () => {
  const lost = fieldLosses({ interface: "hand-written string" }, { interface: { displayName: "Demo Plugin", category: "Engineering" } }, {});
  assert.deepEqual(lost.map((l) => l.field), ["interface"]);
});

test("NATIVE_LIB_KEY_MAP maps name/version so a legitimate rename or bump is never a false refusal", () => {
  assert.equal(NATIVE_LIB_KEY_MAP.name, "name");
  assert.equal(NATIVE_LIB_KEY_MAP.version, "version");
  const existing = { name: "old-name", version: "1.0.0" };
  const rendered = { name: "new-name", version: "2.0.0" };
  const lib = { name: "new-name", version: "2.0.0" };
  assert.deepEqual(fieldLosses(existing, rendered, lib), []);
});

// --- CLI end-to-end: the --write refusal, its override flag, and the steady state ---

function seedPlugin(root, { lib, claudeManifest, codexManifest }) {
  mkdirSync(path.join(root, "skills", "demo-skill"), { recursive: true });
  writeFileSync(path.join(root, "library.json"), JSON.stringify(lib, null, 2) + "\n", "utf8");
  writeFileSync(
    path.join(root, "skills", "demo-skill", "SKILL.md"),
    "---\nname: demo-skill\ndescription: A demo skill. Use when testing gen-manifest field-loss protection.\n---\n\n# demo-skill\n",
    "utf8"
  );
  if (claudeManifest) {
    mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
    writeFileSync(path.join(root, ".claude-plugin/plugin.json"), JSON.stringify(claudeManifest, null, 2) + "\n", "utf8");
  }
  if (codexManifest) {
    mkdirSync(path.join(root, ".codex-plugin"), { recursive: true });
    writeFileSync(path.join(root, ".codex-plugin/plugin.json"), JSON.stringify(codexManifest, null, 2) + "\n", "utf8");
  }
}

function runGen(args) {
  try {
    const stdout = execFileSync(process.execPath, [GEN, ...args], { encoding: "utf8" });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

const RICH_MANIFEST = {
  name: "demo-plugin",
  version: "0.1.0",
  description: "Demo plugin for the gen-manifest field-loss tests.",
  license: "MIT",
  author: { name: "Demo Author" },
  homepage: "https://example.com/demo-plugin",
  repository: "https://example.com/demo-plugin.git",
  keywords: ["demo", "plugin"],
};
const THIN_LIB = {
  name: "demo-plugin",
  version: "0.1.0",
  description: "Demo plugin for the gen-manifest field-loss tests.",
  standard: "0.17",
  tier: "universal",
};

test("CLI gen-manifest --write refuses a thin library.json against a rich manifest, names each field and target, and writes nothing", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-refuse-"));
  seedPlugin(root, { lib: THIN_LIB, claudeManifest: RICH_MANIFEST, codexManifest: { ...RICH_MANIFEST, skills: "./skills/", interface: { displayName: "Demo Plugin!!", category: "Productivity" } } });
  const before = readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8");

  const r = runGen([root, "--write", "--target=all"]);

  assert.equal(r.code, 1);
  assert.match(r.stderr, /refuse to write/);
  assert.match(r.stderr, /\.claude-plugin\/plugin\.json/);
  assert.match(r.stderr, /- homepage/);
  assert.match(r.stderr, /- repository/);
  assert.match(r.stderr, /- license/);
  assert.match(r.stderr, /- author/);
  assert.match(r.stderr, /- keywords/);
  assert.match(r.stderr, /\.codex-plugin\/plugin\.json/);
  assert.match(r.stderr, /- interface\.displayName \(existing: "Demo Plugin!!"\) \(set library\.json "displayName"\)/, 'the native path differs from the library.json key, so the refusal must name the key to set (E72, finding 3)');
  assert.match(r.stderr, /- interface\.category \(existing: "Productivity"\) \(set library\.json "category"\)/);
  assert.match(r.stderr, /--allow-field-loss/);
  assert.equal(readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"), before, "the refused manifest must be untouched");
  assert.equal(existsSync(path.join(root, "manifest.generated.json")), false, "a refused run writes nothing, including the resolved manifest");
});

test("CLI gen-manifest --write --target=all refuses the whole run when only ONE target (codex) loses a field, leaving the clean target (claude) and the resolved manifest untouched too", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-mixed-"));
  // library.json supplies every spine field, so claude's manifest regenerates clean; it supplies
  // no Codex interface.category, so only codex loses a field.
  const lib = { ...THIN_LIB, license: "MIT", author: { name: "Demo Author" }, homepage: "https://example.com/demo-plugin", repository: "https://example.com/demo-plugin.git", keywords: ["demo", "plugin"] };
  seedPlugin(root, { lib, claudeManifest: RICH_MANIFEST, codexManifest: { ...RICH_MANIFEST, skills: "./skills/", interface: { displayName: "Demo Plugin", category: "Productivity" } } });
  const claudeBefore = readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8");
  const codexBefore = readFileSync(path.join(root, ".codex-plugin/plugin.json"), "utf8");

  const r = runGen([root, "--write", "--target=all"]);

  assert.equal(r.code, 1);
  assert.doesNotMatch(r.stderr, /\.claude-plugin\/plugin\.json:/, "claude is clean and must not be named as a losing target");
  assert.match(r.stderr, /\.codex-plugin\/plugin\.json:/);
  assert.match(r.stderr, /- interface\.category/);
  assert.equal(readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"), claudeBefore, "the clean target must not be written either: the whole run is refused");
  assert.equal(readFileSync(path.join(root, ".codex-plugin/plugin.json"), "utf8"), codexBefore, "the losing target must be untouched");
  assert.equal(existsSync(path.join(root, "manifest.generated.json")), false, "the resolved manifest is part of the same run and must not be written");
});

test("CLI gen-manifest --write names the library.json key that differs from the native path, and says plainly when there is none", () => {
  // Shaped after the real pm-skills measurement (docs/internal/backlog/enhancements.md, E72):
  // a Codex interface block carrying fields the renderer never emits at all, alongside the two
  // it does. library.json supplies both of those two (the documented way through), so the
  // refusal is left naming only the fields with no library.json home.
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-pmskills-shaped-"));
  const lib = { ...THIN_LIB, displayName: "Demo Plugin", category: "Productivity" };
  const richInterfaceManifest = {
    name: "demo-plugin",
    version: "0.1.0",
    description: "Demo plugin for the gen-manifest field-loss tests.",
    skills: "./skills/",
    interface: {
      displayName: "Demo Plugin",
      shortDescription: "A short marketing line",
      category: "Productivity",
      brandColor: "#2563EB",
    },
  };
  seedPlugin(root, { lib, codexManifest: richInterfaceManifest });

  const r = runGen([root, "--write", "--target=codex"]);

  assert.equal(r.code, 1);
  assert.doesNotMatch(r.stderr, /- interface\.displayName/, "library.json supplies displayName: a regeneration, not a loss");
  assert.doesNotMatch(r.stderr, /- interface\.category/, "library.json supplies category: a regeneration, not a loss");
  assert.match(r.stderr, /- interface\.shortDescription \(existing: .*no library\.json field carries this; --allow-field-loss is the only way through\)/);
  assert.match(r.stderr, /- interface\.brandColor \(existing: .*no library\.json field carries this; --allow-field-loss is the only way through\)/);
});

test("CLI gen-manifest --write refuses on a non-empty existing description that library.json omits", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-description-"));
  const lib = { name: "demo-plugin", version: "0.1.0", standard: "0.17", tier: "universal" }; // no description at all
  seedPlugin(root, { lib, claudeManifest: RICH_MANIFEST });

  const r = runGen([root, "--write", "--target=claude"]);

  assert.equal(r.code, 1);
  assert.match(r.stderr, /- description \(existing:/);
  assert.doesNotMatch(r.stderr, /- description.*no library\.json field/, "description has a library.json home (the field name itself), so it is not an unmappable loss");
});

test("CLI gen-manifest --write --allow-field-loss overwrites despite the field loss", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-override-"));
  seedPlugin(root, { lib: THIN_LIB, claudeManifest: RICH_MANIFEST });

  const r = runGen([root, "--write", "--target=claude", "--allow-field-loss"]);

  assert.equal(r.code, 0);
  const after = JSON.parse(readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"));
  assert.equal(after.homepage, null, "the override flag means the author chose to let the thin manifest win");
});

test("CLI gen-manifest --write reports no refusal in the steady state (library.json already carries the fields)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-steady-"));
  const lib = { ...THIN_LIB, license: "MIT", author: { name: "Demo Author" }, homepage: "https://example.com/demo-plugin", repository: "https://example.com/demo-plugin.git", keywords: ["demo", "plugin"] };
  seedPlugin(root, { lib, claudeManifest: RICH_MANIFEST });

  const r = runGen([root, "--write", "--target=claude"]);

  assert.equal(r.code, 0, r.stderr);
  const after = JSON.parse(readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"));
  assert.deepEqual(after.keywords, ["demo", "plugin"]);
});

test("CLI gen-manifest --write allows a field library.json supplies with a new value (regeneration, not loss)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-regen-"));
  const lib = { ...THIN_LIB, homepage: "https://example.com/demo-plugin-NEW" };
  seedPlugin(root, { lib, claudeManifest: RICH_MANIFEST });

  const r = runGen([root, "--write", "--target=claude"]);

  assert.equal(r.code, 1, "repository/license/author/keywords are still unsupplied, so those still refuse");
  assert.doesNotMatch(r.stderr, /- homepage/, "homepage must not be named: library.json supplied the new value deliberately");
  assert.match(r.stderr, /- repository/);
});

test('CLI gen-manifest --write regenerates a Codex manifest whose "skills" pointer lacks the trailing slash, with no refusal (E72, round 2)', () => {
  // Reproduces the round-2 review finding exactly: seeding .codex-plugin/plugin.json with
  // "skills": "./skills" (the renderer emits "./skills/") used to produce a "no library.json
  // home" refusal for a pure formatting difference, not a hand-written-field loss.
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-skills-pointer-"));
  const lib = { ...THIN_LIB, license: "MIT", author: { name: "Demo Author" }, homepage: "https://example.com/demo-plugin", repository: "https://example.com/demo-plugin.git", keywords: ["demo", "plugin"] };
  // displayName/category match the computed defaults for "demo-plugin" exactly, so only the
  // "skills" pointer's missing trailing slash differs between existing and rendered.
  seedPlugin(root, { lib, codexManifest: { ...RICH_MANIFEST, skills: "./skills", interface: { displayName: "Demo Plugin", category: "Engineering" } } });

  const r = runGen([root, "--write", "--target=codex"]);

  assert.equal(r.code, 0, r.stderr);
  const after = JSON.parse(readFileSync(path.join(root, ".codex-plugin/plugin.json"), "utf8"));
  assert.equal(after.skills, "./skills/", "the renderer's own formatting wins; this was never library.json's field to lose");
});

test("CLI gen-manifest --write still refuses a hand-written Codex interface key the renderer never emits, even alongside the fixed skills-pointer behavior", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-skills-pointer-plus-vendor-key-"));
  const lib = { ...THIN_LIB, displayName: "Demo Plugin", category: "Engineering" };
  seedPlugin(root, {
    lib,
    codexManifest: { ...RICH_MANIFEST, skills: "./skills", interface: { displayName: "Demo Plugin", category: "Engineering", brandColor: "#2563EB" } },
  });

  const r = runGen([root, "--write", "--target=codex"]);

  assert.equal(r.code, 1);
  assert.doesNotMatch(r.stderr, /- skills/, 'the "skills" pointer formatting fix must never be reported');
  assert.match(r.stderr, /- interface\.brandColor \(existing: .*no library\.json field carries this; --allow-field-loss is the only way through\)/);
});

test("CLI gen-manifest --write still refuses a Claude top-level key the renderer never emits (icon), alongside the fixed skills-pointer behavior", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-icon-"));
  const lib = { ...THIN_LIB, license: "MIT", author: { name: "Demo Author" }, homepage: "https://example.com/demo-plugin", repository: "https://example.com/demo-plugin.git", keywords: ["demo", "plugin"] };
  seedPlugin(root, { lib, claudeManifest: { ...RICH_MANIFEST, icon: "./icon.png" } });

  const r = runGen([root, "--write", "--target=claude"]);

  assert.equal(r.code, 1);
  assert.match(r.stderr, /- icon \(existing: "\.\/icon\.png"\)/);
  assert.match(r.stderr, /no library\.json field carries this; --allow-field-loss is the only way through/);
});

const FULL_LIB = { ...THIN_LIB, license: "MIT", author: { name: "Demo Author" }, homepage: "https://example.com/demo-plugin", repository: "https://example.com/demo-plugin.git", keywords: ["demo", "plugin"], displayName: "Demo Plugin", category: "Engineering" };

test("CLI gen-manifest --write refuses to replace an inline Claude mcpServers object with the .mcp.json pointer (E72, round 3)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-inline-mcp-"));
  seedPlugin(root, { lib: FULL_LIB, claudeManifest: { ...RICH_MANIFEST, mcpServers: { handwritten: { command: "node", args: ["inline-server.js"] } } } });
  writeFileSync(path.join(root, ".mcp.json"), JSON.stringify({ mcpServers: { other: { command: "node", args: ["other.js"] } } }, null, 2) + "\n", "utf8");
  const before = readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8");

  const r = runGen([root, "--write", "--target=claude"]);

  assert.equal(r.code, 1, "round 2 wrote this through with exit 0");
  assert.match(r.stderr, /- mcpServers \(existing: .*no library\.json field carries this/);
  assert.equal(readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"), before, "nothing was written");
});

test("CLI gen-manifest --write refuses to replace a custom Codex skills directory (E72, round 3)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-custom-skills-"));
  seedPlugin(root, { lib: FULL_LIB, codexManifest: { ...RICH_MANIFEST, skills: "./src/agent-skills/", interface: { displayName: "Demo Plugin", category: "Engineering" } } });

  const r = runGen([root, "--write", "--target=codex"]);

  assert.equal(r.code, 1, "round 2 wrote this through with exit 0");
  assert.match(r.stderr, /- skills \(existing: "\.\/src\/agent-skills\/"\)/);
});

test("CLI gen-manifest --write refuses to replace a non-object Codex interface value (E72, round 3)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-string-interface-"));
  seedPlugin(root, { lib: FULL_LIB, codexManifest: { ...RICH_MANIFEST, skills: "./skills/", interface: "hand-written string" } });

  const r = runGen([root, "--write", "--target=codex"]);

  assert.equal(r.code, 1, "this predates round 2: the interface walk skipped a non-object value");
  assert.match(r.stderr, /- interface \(existing: "hand-written string"\)/);
});

// A guard that cannot be shown failing is not a guard: this covers the "present but unparseable"
// fail-closed branch, the same house style U9 and U11 already use for a malformed file.
test("CLI gen-manifest --write refuses a present-but-invalid-JSON manifest and leaves it untouched", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-gen-manifest-malformed-"));
  mkdirSync(path.join(root, "skills", "demo-skill"), { recursive: true });
  writeFileSync(path.join(root, "library.json"), JSON.stringify(THIN_LIB, null, 2) + "\n", "utf8");
  writeFileSync(
    path.join(root, "skills", "demo-skill", "SKILL.md"),
    "---\nname: demo-skill\ndescription: A demo skill. Use when testing gen-manifest field-loss protection.\n---\n\n# demo-skill\n",
    "utf8"
  );
  mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  const brokenJson = "{ not json";
  writeFileSync(path.join(root, ".claude-plugin/plugin.json"), brokenJson, "utf8");

  const r = runGen([root, "--write", "--target=claude"]);

  assert.equal(r.code, 1);
  assert.match(r.stderr, /\(whole file\)/);
  assert.doesNotMatch(r.stderr, /no library\.json field/, "the whole-file entry has no single field to map to library.json; it must not print that suffix");
  assert.equal(readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"), brokenJson, "a malformed existing manifest must be left exactly as it was");
});
