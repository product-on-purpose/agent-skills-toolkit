import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "../../scripts/lib/frontmatter.mjs";

const sample = `---
name: my-skill
description: Does a thing and says when to use it.
---
# Body
hello`;

test("parses frontmatter and body", () => {
  const r = parseFrontmatter(sample);
  assert.equal(r.parseError, null);
  assert.equal(r.frontmatter.name, "my-skill");
  assert.match(r.body, /# Body/);
});

test("missing frontmatter fence is a parseError", () => {
  const r = parseFrontmatter("# no frontmatter here");
  assert.equal(r.frontmatter, null);
  assert.match(r.parseError, /frontmatter/i);
});

test("invalid YAML is a parseError", () => {
  const r = parseFrontmatter(`---\nname: [unclosed\n---\nbody`);
  assert.equal(r.frontmatter, null);
  assert.match(r.parseError, /flow|yaml|unexpected|parse|map|\]/i);
});
