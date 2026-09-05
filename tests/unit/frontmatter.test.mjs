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

test("a leading UTF-8 byte-order mark is not content: the fence still matches and the body does not start with it", () => {
  const r = parseFrontmatter("\uFEFF" + sample);
  assert.equal(r.parseError, null, "a BOM before the fence was graded as a missing fence");
  assert.equal(r.frontmatter.name, "my-skill");
  assert.match(r.body, /^# Body/);
  assert.notEqual(r.body.charCodeAt(0), 0xfeff);
});

test("a byte-order mark alone does not invent a fence: a file without frontmatter is still a parseError", () => {
  const r = parseFrontmatter("\uFEFF# no frontmatter here");
  assert.equal(r.frontmatter, null);
  assert.match(r.parseError, /frontmatter/i);
});
