// what-it-is:   a guard that the published tarball contains no library file nothing in it can reach
// what-it-does: walks the import graph from every SHIPPED entry point, then requires every scripts/lib
//               module that graph never reaches to be explicitly excluded in package.json "files"
// why:          `package.json` ships `scripts/lib/` wholesale and negates individual maintainer-only
//               modules one at a time (`!scripts/lib/standards-watch.mjs` and four others). That works
//               only while somebody remembers to add the negation, and twice they did not: v1.14.0's
//               tarball carried `scripts/lib/vendor-watch.mjs` and `scripts/lib/release-ready.mjs`
//               - 16.5 kB of code whose CLIs are not shipped, imported by nothing a consumer installs.
//
//               It is a small defect with a specific edge: this package GRADES other people's plugins on
//               hygiene. Dead files in its own tarball are the credibility version of the same problem,
//               and a supply-chain surface nobody audits because nobody knows it is there.
//
//               Guarding the CLASS rather than the two instances is deliberate. The sibling guard in
//               remediation-commands-ship.test.mjs records why: that defect shipped TWICE because the
//               first fix addressed the instance, which is what let the second one sit unnoticed.
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PKG = JSON.parse(readFileSync(path.join(REPO, "package.json"), "utf8"));

/** Posix-style path relative to the repo root, which is how package.json "files" is written. */
const rel = (abs) => path.relative(REPO, abs).split(path.sep).join("/");

/**
 * The entry points a CONSUMER can actually reach: the bin, the three top-level scripts named in
 * "files", the two shipped generators, and every check (the registry imports them all).
 */
function shippedEntryPoints() {
  const out = [];
  const add = (p) => {
    const abs = path.join(REPO, p);
    if (existsSync(abs)) out.push(abs);
  };
  for (const f of PKG.files ?? []) {
    if (f.startsWith("!")) continue;
    if (f.endsWith(".mjs")) add(f);
  }
  const binDir = path.join(REPO, "bin");
  if (existsSync(binDir)) {
    for (const e of readdirSync(binDir)) if (e.endsWith(".mjs")) out.push(path.join(binDir, e));
  }
  const checksDir = path.join(REPO, "scripts", "checks");
  if (existsSync(checksDir)) {
    for (const e of readdirSync(checksDir)) if (e.endsWith(".mjs")) out.push(path.join(checksDir, e));
  }
  return out;
}

/** Every relative specifier this source imports, statically or dynamically. */
function relativeImports(src) {
  const out = [];
  const patterns = [/\bfrom\s+["'](\.[^"']+)["']/g, /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g];
  for (const re of patterns) for (const m of src.matchAll(re)) out.push(m[1]);
  return out;
}

/** Transitive closure of the import graph from `entries`. */
function reachable(entries) {
  const seen = new Set();
  const stack = [...entries];
  while (stack.length) {
    const abs = stack.pop();
    if (seen.has(abs) || !existsSync(abs)) continue;
    seen.add(abs);
    for (const spec of relativeImports(readFileSync(abs, "utf8"))) {
      stack.push(path.resolve(path.dirname(abs), spec));
    }
  }
  return seen;
}

/** Every .mjs under scripts/lib, recursively - the directory package.json ships wholesale. */
function libModules() {
  const root = path.join(REPO, "scripts", "lib");
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const abs = path.join(dir, e);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (e.endsWith(".mjs")) out.push(abs);
    }
  };
  if (existsSync(root)) walk(root);
  return out;
}

test("every scripts/lib module in the tarball is reachable from something the tarball ships", () => {
  const excluded = new Set((PKG.files ?? []).filter((f) => f.startsWith("!")).map((f) => f.slice(1)));
  const reached = reachable(shippedEntryPoints());
  const orphans = libModules()
    .filter((abs) => !reached.has(abs))
    .map(rel)
    .filter((r) => !excluded.has(r));

  assert.deepEqual(
    orphans,
    [],
    `these ship but nothing in the package imports them. Either wire them to a shipped entry point, or ` +
      `add the negation to package.json "files" the way !scripts/lib/standards-watch.mjs already is:\n` +
      orphans.map((o) => `  "!${o}"`).join("\n")
  );
});

test("the exclusion list has no stale entries pointing at files that are gone", () => {
  // A negation for a deleted file is harmless to npm and misleading to a reader: it implies a maintainer
  // -only module still exists and was consciously withheld.
  for (const f of (PKG.files ?? []).filter((x) => x.startsWith("!"))) {
    const target = f.slice(1);
    assert.ok(existsSync(path.join(REPO, target)), `package.json excludes "${target}", which does not exist`);
  }
});

test("the guard is anchored to a real wholesale-shipped directory", () => {
  // If "scripts/lib/" ever stops being shipped wholesale, the reachability test above becomes vacuous
  // and would pass forever without checking anything. Fail loudly instead of going quiet.
  assert.ok(
    (PKG.files ?? []).includes("scripts/lib/"),
    'package.json no longer ships "scripts/lib/" wholesale; this guard assumed it did and is now vacuous'
  );
});
