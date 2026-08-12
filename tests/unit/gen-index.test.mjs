import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderIndex } from "../../scripts/generators/gen-index.mjs";
import { TIER_NAME, TIER_ORDER } from "../../scripts/lib/tier.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, "../fixtures");

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

test("the self-validation line names a command the TARGET can actually run, not one only this repo has", () => {
  // Found the way this repository's findings are always found: by running a published instruction from
  // the consumer's position. `npm i -D agent-skills-toolkit` into a clean directory, regenerate a
  // scaffolded plugin's INDEX, and the generated file told its owner to run `node scripts/check.mjs` -
  // a path nothing installs into a consuming plugin. Same defect class as the two boilerplate sections
  // above (and as the G4 remediation recorded 2026-08-10), except emitted INTO the consumer's own
  // repository over their signature rather than published in ours.
  const dir = mkdtempSync(path.join(tmpdir(), "genidx-selfvalidate-"));
  try {
    writeFileSync(path.join(dir, "library.json"), '{ "name": "consumer", "version": "0.1.0", "tier": "universal" }\n');
    const consumer = renderIndex(loadPlugin(dir));
    assert.match(consumer, /Self-validating: `npx agent-skills-toolkit \.`/, "a plugin without the gate is told how to run the published one");
    assert.ok(!consumer.includes("node scripts/check.mjs"), "must not hand a consumer a path nothing installs for them");

    // A plugin that HAS a scripts/check.mjs keeps the original line - the condition is a path test, not
    // a claim about which validator that file is. This is why this repository's own INDEX.md does not
    // move in the release that makes the line conditional.
    mkdirSync(path.join(dir, "scripts"), { recursive: true });
    writeFileSync(path.join(dir, "scripts", "check.mjs"), "// a check script in the target's own tree\n");
    const vendored = renderIndex(loadPlugin(dir));
    assert.match(vendored, /Self-validating: `node scripts\/check\.mjs`/);
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

// --- Round-4 adversarial review, Finding 3 (single-source-of-truth still not real): round 3 moved
// TIER_NAME / TIER_SUB into scripts/lib/tier.mjs so report-render.mjs and check-readme-version.mjs
// could share them, and the CHANGELOG claims "one mapping, three consumers, no second copy to
// drift". gen-index.mjs kept its own independent TIER_LABEL mapping instead of importing the shared
// one, so its generated tier text could diverge from the reports and the README guard without any
// test catching it. These cover the fix: no local copy survives, and the rendered label always
// tracks the shared export.

test("gen-index.mjs imports its tier label from the shared tier.mjs module, not a local copy", () => {
  const src = readFileSync(path.resolve(HERE, "../../scripts/generators/gen-index.mjs"), "utf8");
  assert.ok(!/const\s+TIER_LABEL\s*=/.test(src), "gen-index.mjs must not define its own TIER_LABEL mapping");
  assert.match(src, /from\s+["']\.\.\/lib\/tier\.mjs["']/, "gen-index.mjs must import from scripts/lib/tier.mjs");
});

test("renderIndex's Tier line always uses tier.mjs's TIER_NAME, for every declared tier", () => {
  for (const tier of TIER_ORDER) {
    const dir = mkdtempSync(path.join(tmpdir(), "genidx-tier-"));
    try {
      writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "t", version: "0.1.0", tier }));
      const md = renderIndex(loadPlugin(dir));
      assert.match(
        md,
        new RegExp(`\\*\\*Tier:\\*\\* ${TIER_NAME[tier]} \\(${tier}\\)\\.`),
        `tier "${tier}" must render the shared TIER_NAME label "${TIER_NAME[tier]}"`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
