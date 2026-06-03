import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rewriteTarget, emittedDirs } from "../../site/scripts/gen-docs-site.mjs";

// Proves the Pattern S generator's link rewriting (site/scripts/gen-docs-site.mjs, ADR 0024 D2):
// a link to another published docs/ page becomes a base-absolute site route (so it resolves in the
// browser one URL level deeper), and a link to anything outside the published tree (the Standard, a
// skill reference, a script, library.json, an internal doc) becomes an absolute GitHub blob URL
// (which the clause-14.11 rendered-link guard skips). External/anchor links pass through untouched.
// rewriteTarget is pure path math (no filesystem reads), so synthetic source paths suffice.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "/agent-skills-toolkit";
const BLOB = "https://github.com/product-on-purpose/agent-skills-toolkit/blob/main";
// A real-shaped source path under the public docs tree; the files need not exist.
const SRC = path.join(REPO_ROOT, "docs", "how-to", "build-a-hook.md");

test("a sibling published doc becomes a base-absolute site route", () => {
  assert.equal(rewriteTarget("../reference/gold-checks.md", SRC), `${BASE}/reference/gold-checks/`);
});

test("a same-quadrant bare link becomes a site route", () => {
  assert.equal(
    rewriteTarget("climb-from-bronze-to-silver.md", SRC),
    `${BASE}/how-to/climb-from-bronze-to-silver/`,
  );
});

test("an #anchor is preserved on a rewritten site route", () => {
  assert.equal(rewriteTarget("../reference/gold-checks.md#g7", SRC), `${BASE}/reference/gold-checks/#g7`);
});

test("a link to the Standard (outside the published tree) becomes a GitHub blob URL", () => {
  assert.equal(rewriteTarget("../../STANDARD.md", SRC), `${BLOB}/STANDARD.md`);
});

test("a link to a skill reference becomes a GitHub blob URL", () => {
  assert.equal(
    rewriteTarget("../../skills/askit-evaluate/SKILL.md", SRC),
    `${BLOB}/skills/askit-evaluate/SKILL.md`,
  );
});

test("a non-markdown repo file (library.json) becomes a GitHub blob URL", () => {
  assert.equal(rewriteTarget("../../library.json", SRC), `${BLOB}/library.json`);
});

test("a docs/internal page is NOT a site route (it is not published) - blob URL instead", () => {
  assert.equal(
    rewriteTarget("../internal/decisions/0024-documentation-depth-and-discoverability.md", SRC),
    `${BLOB}/docs/internal/decisions/0024-documentation-depth-and-discoverability.md`,
  );
});

test("external, mailto, and pure-anchor links pass through unchanged", () => {
  assert.equal(rewriteTarget("https://example.com/x", SRC), "https://example.com/x");
  assert.equal(rewriteTarget("mailto:hi@example.com", SRC), "mailto:hi@example.com");
  assert.equal(rewriteTarget("#section", SRC), "#section");
});

test("emittedDirs returns the public quadrants and never docs/internal", () => {
  const dirs = emittedDirs();
  assert.ok(dirs.includes("how-to"), `expected how-to in ${dirs.join(", ")}`);
  assert.ok(dirs.includes("reference"));
  assert.ok(dirs.includes("explanation"));
  assert.ok(dirs.includes("tutorials"));
  assert.ok(!dirs.includes("internal"), "docs/internal must never be emitted to the site");
});
