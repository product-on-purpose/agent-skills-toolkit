// what-it-is:   a guard that every command this toolkit PRINTS is one a consumer can actually run
// what-it-does: extracts every `npx agent-skills-toolkit <sub>` named in a check message or report
//               template, and fails unless <sub> is a real subcommand whose target file is inside the
//               published package
// why:          this defect has now shipped TWICE, in two sibling generators. Round 1 of the v1.13.0
//               review found `G4` telling consumers to run a generator that was not in the package;
//               round 9 found `U8` and `S6` doing the identical thing with gen-manifest, which had been
//               sitting there the whole time. Fixing the instance is what allowed the second instance.
//               A remediation a reader cannot follow is the E35 defect class itself: a message that
//               sounds actionable and is not.
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Every `npx agent-skills-toolkit <sub>` mentioned anywhere a consumer could read it. */
function printedSubcommands() {
  const dirs = [
    path.join(REPO_ROOT, "scripts", "checks"),
    path.join(REPO_ROOT, "scripts", "lib"),
    path.join(REPO_ROOT, "scripts", "generators"),
  ];
  const found = new Map(); // sub -> [where]
  const re = /npx agent-skills-toolkit ([a-z][a-z-]*)/g;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop();
      for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
        const full = path.join(cur, e.name);
        if (e.isDirectory()) { stack.push(full); continue; }
        if (!e.name.endsWith(".mjs")) continue;
        const text = fs.readFileSync(full, "utf8");
        for (const m of text.matchAll(re)) {
          // `.` is the path argument of the default subcommand, not a subcommand name.
          if (m[1] === "gen" || m[1] === "") continue;
          const rel = path.relative(REPO_ROOT, full).split(path.sep).join("/");
          if (!found.has(m[1])) found.set(m[1], []);
          if (!found.get(m[1]).includes(rel)) found.get(m[1]).push(rel);
        }
      }
    }
  }
  return found;
}

/** The subcommand names the bin actually dispatches, read from the bin rather than restated here. */
function declaredSubcommands() {
  const src = fs.readFileSync(path.join(REPO_ROOT, "bin", "agent-skills-toolkit.mjs"), "utf8");
  const block = src.slice(src.indexOf("const SUBCOMMANDS"), src.indexOf("};", src.indexOf("const SUBCOMMANDS")));
  const out = new Map();
  for (const m of block.matchAll(/"?([a-z][a-z-]*)"?:\s*path\.join\(PKG_ROOT,\s*([^)]+)\)/g)) {
    const parts = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    out.set(m[1], parts.join("/"));
  }
  return out;
}

/**
 * npm `files` semantics, which are include-then-EXCLUDE rather than a flat allowlist.
 *
 * The first version of this helper returned false for any `!` entry, which is not "exclude" - it just
 * skipped the rule. So `scripts/lib/` matched and nothing ever took a path back out, and the guard's own
 * negation clause failed the moment it was asked to prove the exclusion worked.
 */
function isShipped(target, files) {
  const matches = (f) => (f.endsWith("/") ? target.startsWith(f) : target === f);
  const included = files.some((f) => !f.startsWith("!") && matches(f));
  const excluded = files.some((f) => f.startsWith("!") && matches(f.slice(1)));
  return included && !excluded;
}

test("every command this toolkit tells a consumer to run is one the package ships", () => {
  const printed = printedSubcommands();
  const declared = declaredSubcommands();
  const files = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")).files;

  assert.ok(printed.size > 0, "the scan found no printed commands at all, which means it stopped scanning");
  assert.ok(declared.size > 0, "the SUBCOMMANDS table could not be read from the bin");

  const problems = [];
  for (const [sub, where] of printed) {
    const target = declared.get(sub);
    if (!target) {
      problems.push(`"${sub}" is printed in ${where.join(", ")} but is not a subcommand the bin dispatches`);
      continue;
    }
    if (!isShipped(target, files)) {
      problems.push(`"${sub}" dispatches to ${target}, which the package files list does not ship (printed in ${where.join(", ")})`);
    }
  }
  assert.deepEqual(problems, [], `a remediation naming a command the consumer does not have is unfollowable:\n${problems.join("\n")}`);
});

test("the guard can fail, and it really is reading both sides", () => {
  // Guarding the guard: each clause below is a way this could pass while checking nothing.
  const printed = printedSubcommands();
  const declared = declaredSubcommands();
  assert.ok(printed.has("gen-index"), "the scan sees the generator round 1 fixed");
  assert.ok(printed.has("gen-manifest"), "and the sibling round 9 found, which is the case that motivated this file");
  assert.ok(declared.has("gen-index") && declared.has("gen-manifest"), "both are dispatched by the bin");
  assert.equal(declared.get("gen-manifest"), "scripts/generators/gen-manifest.mjs", "and the dispatch target is read, not assumed");

  // A subcommand that is printed but undeclared must be caught.
  const files = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")).files;
  assert.ok(isShipped("scripts/generators/gen-manifest.mjs", files), "the files list genuinely ships it now");
  assert.ok(!isShipped("scripts/lib/eval-run.mjs", files), "and the EXCLUSION works: scripts/lib/ ships the directory, and !scripts/lib/eval-run.mjs takes that one back out");
  assert.ok(isShipped("scripts/lib/tier.mjs", files), "while a non-excluded file under the same directory is still shipped");
});
