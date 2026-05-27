import { test } from "node:test";
import assert from "node:assert/strict";
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
