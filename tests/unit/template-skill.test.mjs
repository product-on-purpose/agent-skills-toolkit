import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../../scripts/lib/frontmatter.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("templates/SKILL.md parses and has the required frontmatter keys", () => {
  const raw = readFileSync(path.join(ROOT, "templates/SKILL.md"), "utf8");
  const { frontmatter, parseError } = parseFrontmatter(raw);
  assert.equal(parseError, null);
  assert.ok("name" in frontmatter);
  assert.ok("description" in frontmatter);
});
