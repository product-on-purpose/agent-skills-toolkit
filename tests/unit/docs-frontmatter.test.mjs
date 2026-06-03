import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/docs-frontmatter.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const ok = path.join(FIXTURES, "golden/docs-frontmatter-ok");
const bad = path.join(FIXTURES, "anti/docs-frontmatter-bad");
const noDocs = path.join(FIXTURES, "golden/minimal-skill"); // has no docs/ tree

test("a conformant docs page passes G7 with no findings", () => {
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("a docs page missing audience, with a colon-space description, a bad level, and non-array tags, fails G7", () => {
  const f = check(loadPlugin(bad));
  assert.ok(f.some((x) => /audience/.test(x.message)), "flags missing audience");
  assert.ok(f.some((x) => /colon-space/.test(x.message)), "flags the colon-space description");
  assert.ok(f.some((x) => /level/.test(x.message)), "flags the out-of-vocabulary level");
  assert.ok(f.some((x) => /tags/.test(x.message)), "flags the non-array tags");
  assert.ok(f.length > 0 && f.every((x) => x.reqId === "G7" && x.severity === "error"));
});

test("a plugin with no docs/ tree passes G7 vacuously", () => {
  assert.equal(check(loadPlugin(noDocs)).length, 0);
});
