import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CODEX_MANIFEST = path.join(REPO, ".codex-plugin", "plugin.json");
// On Windows, spawnSync cannot resolve .cmd wrappers without shell:true.
const SHELL = process.platform === "win32";

function codexAvailable() {
  const r = spawnSync("codex", ["--version"], { encoding: "utf8", shell: SHELL });
  return !r.error && r.status === 0;
}

function cx(args, opts = {}) {
  const a = SHELL ? args.map((x) => (typeof x === "string" && x.includes(" ") ? `"${x}"` : x)) : args;
  return spawnSync("codex", a, { encoding: "utf8", shell: SHELL, ...opts });
}

const present = codexAvailable();
const required = process.env.CODEX_REQUIRED === "1";
const skip = present ? false : (required ? false : "codex CLI not on PATH (set CODEX_REQUIRED=1 to fail instead of skip)");

test("emitted .codex-plugin/plugin.json round-trips through the codex CLI (skills ingested)", { skip }, () => {
  if (!present && required) assert.fail("CODEX_REQUIRED=1 but codex CLI is not on PATH");
  assert.ok(existsSync(CODEX_MANIFEST), "the toolkit must have generated .codex-plugin/plugin.json (run gen-manifest --target=all)");

  // The plugin name in the marketplace must match the "name" field in plugin.json.
  const pluginName = "agent-skills-toolkit";
  const mpName = "askit-rt-test";
  const sel = pluginName + "@" + mpName;
  const root = mkdtempSync(path.join(tmpdir(), "askit-codex-rt-"));
  let added = false;
  try {
    // Wrap the toolkit's emitted manifest in a throwaway local marketplace.
    const pluginDir = path.join(root, "plugins", pluginName);
    mkdirSync(path.join(pluginDir, ".codex-plugin"), { recursive: true });
    mkdirSync(path.join(pluginDir, "skills", "probe"), { recursive: true });
    copyFileSync(CODEX_MANIFEST, path.join(pluginDir, ".codex-plugin", "plugin.json"));
    writeFileSync(
      path.join(pluginDir, "skills", "probe", "SKILL.md"),
      "---\nname: probe\ndescription: Probe skill used only to validate Codex round-trip. Use never in production.\n---\n\n# probe\n"
    );
    mkdirSync(path.join(root, ".agents", "plugins"), { recursive: true });
    writeFileSync(
      path.join(root, ".agents", "plugins", "marketplace.json"),
      JSON.stringify({
        name: mpName,
        interface: { displayName: "ASKit RT Test" },
        plugins: [{ name: pluginName, source: { source: "local", path: "./plugins/" + pluginName }, policy: { installation: "AVAILABLE" }, category: "Engineering" }],
      }, null, 2)
    );

    // v0.135 syntax: marketplace add takes a POSITIONAL source path (no --local).
    const mpAdd = cx(["plugin", "marketplace", "add", root]);
    added = mpAdd.status === 0;
    assert.equal(mpAdd.status, 0, `marketplace add failed: ${mpAdd.stderr || mpAdd.stdout}`);

    const list = cx(["plugin", "list", "--marketplace", mpName]);
    assert.equal(list.status, 0, `plugin list failed: ${list.stderr || list.stdout}`);
    assert.match(list.stdout, /agent-skills-toolkit/, "the emitted plugin should appear in codex plugin list");

    // Listing is NOT ingestion. Install and confirm the skill RESOLVES into the install cache.
    const add = cx(["plugin", "add", sel]);
    assert.equal(add.status, 0, `plugin add failed: ${add.stderr || add.stdout}`);
    const m = (add.stdout || "").match(/Installed plugin root:\s*(.+?)\s*$/m);
    assert.ok(m, `could not parse install root from plugin add output: ${add.stdout}`);
    const installRoot = m[1].trim();
    assert.ok(
      existsSync(path.join(installRoot, "skills", "probe", "SKILL.md")),
      "Codex did not ingest the skill - skills/probe/SKILL.md missing from the install root (check the \"skills\" pointer in .codex-plugin/plugin.json)"
    );
  } finally {
    cx(["plugin", "remove", sel]);
    if (added) cx(["plugin", "marketplace", "remove", mpName]);
    rmSync(root, { recursive: true, force: true });
  }
});
