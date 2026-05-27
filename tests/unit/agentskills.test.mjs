import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { checkAgentskills } from "../../scripts/checks/agentskills.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const bad = path.join(FIXTURES, "anti/bad-frontmatter");

test("golden passes agentskills equivalence (no errors)", () => {
  assert.equal(checkAgentskills(loadPlugin(golden)).filter((f) => f.severity === "error").length, 0);
});

test("bad frontmatter surfaces via the composed surface", () => {
  assert.ok(checkAgentskills(loadPlugin(bad)).some((f) => f.severity === "error"));
});
