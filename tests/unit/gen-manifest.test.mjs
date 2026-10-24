import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderManifest, renderClaudeNativeManifest, renderCodexNativeManifest, fieldLosses } from "../../scripts/generators/gen-manifest.mjs";

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
// These mirror the NATIVE_FIELD_LOSS_FIELDS spec shape gen-manifest.mjs's own CLI driver uses.
// They are kept local, so the pure function's contract is tested independently of that internal
// table.
const CLAUDE_SPECS = [
  { field: "homepage", libKey: "homepage" },
  { field: "repository", libKey: "repository" },
  { field: "license", libKey: "license" },
  { field: "author", libKey: "author" },
  { field: "keywords", libKey: "keywords" },
  { field: "description", libKey: "description" },
];
const CODEX_SPECS = [...CLAUDE_SPECS, { field: "interface.displayName", libKey: "displayName" }, { field: "interface.category", libKey: "category" }];

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
  const lost = fieldLosses(existing, rendered, lib, CLAUDE_SPECS);
  assert.deepEqual(
    lost.map((l) => l.field).sort(),
    ["author", "homepage", "keywords", "license", "repository"],
    "every non-empty existing field the thin library.json does not supply is named"
  );
});

test("fieldLosses flags a Codex interface field that library.json does not supply, even though neither side is empty", () => {
  const existing = { interface: { displayName: "PM Skills", category: "Productivity" } };
  const rendered = { interface: { displayName: "Pm Skills", category: "Engineering" } }; // the computed default, not a drop to null
  const lost = fieldLosses(existing, rendered, {}, CODEX_SPECS);
  assert.deepEqual(lost.map((l) => l.field).sort(), ["interface.category", "interface.displayName"]);
});

test("fieldLosses allows a field library.json supplies with a new value: a deliberate regeneration, not a loss", () => {
  const existing = { homepage: "https://example.com/old" };
  const rendered = { homepage: "https://example.com/new" };
  const lib = { homepage: "https://example.com/new" };
  const lost = fieldLosses(existing, rendered, lib, CLAUDE_SPECS);
  assert.deepEqual(lost, [], "library.json supplying the differing value makes this a regeneration, never a loss");
});

test("fieldLosses reports nothing in the steady state: existing and rendered already agree", () => {
  const existing = { homepage: "https://example.com/repo", keywords: ["a", "b"] };
  const rendered = { homepage: "https://example.com/repo", keywords: ["a", "b"] };
  const lost = fieldLosses(existing, rendered, {}, CLAUDE_SPECS);
  assert.deepEqual(lost, []);
});

test("fieldLosses reports nothing when the existing manifest never carried the field", () => {
  const existing = {};
  const rendered = { author: null, keywords: [] };
  const lost = fieldLosses(existing, rendered, {}, CLAUDE_SPECS);
  assert.deepEqual(lost, [], "nothing on disk means nothing to lose");
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
  assert.match(r.stderr, /interface\.displayName/);
  assert.match(r.stderr, /--allow-field-loss/);
  assert.equal(readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"), before, "the refused manifest must be untouched");
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
  assert.equal(readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"), brokenJson, "a malformed existing manifest must be left exactly as it was");
});
