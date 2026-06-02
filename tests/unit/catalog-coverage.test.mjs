import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

// The docs site catalog page (site/src/content/docs/catalog.md) is hand-authored editorial
// prose, NOT generated: it carries annotations ("interview, questionnaire, hybrid", "including
// an Astro Starlight site mode") that do not exist in library.json, so a generator would flatten
// the voice. This test is its drift guard instead - it keeps the curated page honest with the
// manifest without dictating the prose. It is a repo-local test, NOT a registered check in
// scripts/check.mjs, on purpose: check.mjs is the portable gate downstream plugins run against
// their own repos, where no Astro site exists, so a catalog check there would impose a phantom
// requirement on every consumer.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG = path.join(REPO_ROOT, "site/src/content/docs/catalog.md");

// Component names declared in library.json (the canonical manifest the public catalog must
// track). Skills + subagents + commands; commands reuse skill names, so a Set dedupes them.
function declaredNames(ctx) {
  const c = ctx.library?.data?.components ?? {};
  const all = [...(c.skills ?? []), ...(c.subagents ?? []), ...(c.commands ?? [])];
  return new Set(all.map((x) => x.name));
}

// Every askit- name the catalog page mentions, captured as whole tokens so a prefix name like
// askit-evaluate is not falsely matched inside askit-evaluator.
function mentionedNames(text) {
  return new Set(text.match(/askit-[a-z0-9-]+/g) ?? []);
}

const ctx = loadPlugin(REPO_ROOT);
const declared = declaredNames(ctx);

test("catalog.md exists (the docs site catalog page is committed content)", () => {
  assert.ok(existsSync(CATALOG), `expected catalog at ${CATALOG}`);
});

test("catalog.md names every component declared in library.json (no silent omission as the library grows)", () => {
  const mentioned = mentionedNames(readFileSync(CATALOG, "utf8"));
  const missing = [...declared].filter((n) => !mentioned.has(n)).sort();
  assert.deepEqual(
    missing,
    [],
    `catalog.md does not name library.json component(s): ${missing.join(", ")}. Add them to site/src/content/docs/catalog.md.`,
  );
});

test("catalog.md lists no orphan askit- name absent from library.json (no stale name after a rename or removal)", () => {
  const mentioned = mentionedNames(readFileSync(CATALOG, "utf8"));
  const orphans = [...mentioned].filter((n) => !declared.has(n)).sort();
  assert.deepEqual(
    orphans,
    [],
    `catalog.md lists askit- name(s) not in library.json: ${orphans.join(", ")}. Remove or rename them in site/src/content/docs/catalog.md.`,
  );
});
