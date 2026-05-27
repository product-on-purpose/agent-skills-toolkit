import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderAgentsComponentBlock } from "../../scripts/generators/sync-agents-md.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("renderAgentsComponentBlock wraps the skill list in generated markers", () => {
  const block = renderAgentsComponentBlock(loadPlugin(path.join(FIXTURES, "golden/minimal-skill")));
  assert.match(block, /<!-- generated:components -->/);
  assert.match(block, /- do-thing/);
  assert.match(block, /<!-- \/generated:components -->/);
});
