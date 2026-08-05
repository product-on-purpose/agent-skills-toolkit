import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderIndex } from "../../scripts/generators/gen-index.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("renderIndex lists each skill with its description", () => {
  const md = renderIndex(loadPlugin(path.join(FIXTURES, "golden/minimal-skill")));
  assert.match(md, /do-thing/);
  assert.match(md, /summary table/);
});

test("manifest and doc rows render only for artifacts the plugin actually ships", () => {
  // Regression: both sections were fixed strings describing this toolkit's own layout, so every
  // consuming plugin got an INDEX asserting paths it does not have. index-drift (G4) compares
  // against this same generator, so the dangling links passed the drift check forever.
  const dir = mkdtempSync(path.join(tmpdir(), "genidx-partial-"));
  try {
    writeFileSync(path.join(dir, "library.json"), '{ "name": "partial", "version": "0.1.0" }\n');
    mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), "{}\n");
    writeFileSync(path.join(dir, "README.md"), "# partial\n");
    mkdirSync(path.join(dir, "scripts"), { recursive: true });
    const md = renderIndex(loadPlugin(dir));

    assert.match(md, /library\.json/, "ships library.json, so it is listed");
    assert.match(md, /\.claude-plugin\/plugin\.json/, "ships the Claude manifest, so it is listed");
    for (const absent of [".codex-plugin", "manifest.generated.json", "STANDARD.md", "templates/", "_chain-permitted", "docs/internal/STATUS.md"]) {
      assert.ok(!md.includes(absent), `must not assert ${absent}, which is not on disk`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a composite row renders only its surviving fragments, still ending in one period", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "genidx-composite-"));
  try {
    writeFileSync(path.join(dir, "library.json"), '{ "name": "composite", "version": "0.1.0" }\n');
    writeFileSync(path.join(dir, "CHANGELOG.md"), "# changelog\n"); // ships CHANGELOG but no RELEASE-NOTES
    const md = renderIndex(loadPlugin(dir));
    assert.match(md, /- \[`CHANGELOG\.md`\]\(CHANGELOG\.md\) - full technical history\.$/m, "row ends after the surviving fragment");
    assert.ok(!md.includes("RELEASE-NOTES"), "must not assert an absent RELEASE-NOTES.md");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a section with no surviving row loses its heading, and the file ends in one newline", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "genidx-bare-"));
  try {
    // library.json is required to load, and is itself a manifest row, so only the docs section empties.
    writeFileSync(path.join(dir, "library.json"), '{ "name": "bare", "version": "0.1.0" }\n');
    const md = renderIndex(loadPlugin(dir));
    assert.ok(md.includes("## Manifests"), "manifests survive via library.json");
    assert.ok(!md.includes("## Documentation and governance"), "empty docs section drops its heading");
    assert.match(md, /[^\n]\n$/, "file ends with exactly one trailing newline");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
