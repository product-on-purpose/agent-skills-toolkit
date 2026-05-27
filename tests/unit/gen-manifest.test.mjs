import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderManifest } from "../../scripts/generators/gen-manifest.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("renderManifest projects library.json + skills into a resolved index", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/minimal-skill"));
  const m = JSON.parse(renderManifest(ctx));
  assert.equal(m.name, "minimal-skill");
  assert.equal(m.tier, "universal");
  assert.ok(Array.isArray(m.skills));
  assert.equal(m.skills[0].name, "do-thing");
});
