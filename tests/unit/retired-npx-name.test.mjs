// what-it-is:   a repo-wide guard against instructing anyone to run an npm package we do not own
// what-it-does: fails if the retired hyphenated `gen-index` package name appears ANYWHERE in a tracked
//               file, with no exemptions
// why:          this exact string has now escaped review TWICE. Round 1 of the v1.13.0 review found it in
//               the G4 remediation messages and fixed those; round 4 found it still sitting in
//               CHANGELOG.md's Upgrade section, which is the most-read consumer instruction in the whole
//               release. Fixing the second instance by hand and moving on is what produced the second
//               instance. `npx <name>` DOWNLOADS AND EXECUTES whatever publisher holds that name, so an
//               instruction naming a package we do not own is not a typo, it is a supply-chain hazard we
//               authored.
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SELF), "../..");

// The owned CLI is `agent-skills-toolkit` with `gen-index` as a SUBCOMMAND. Any hyphenated run-together
// form is a package name, and none of them are ours. A pattern rather than one literal, so a near-miss
// (`...-genindex`, `...-gen_index`) is caught by the same guard.
const RETIRED = /agent-skills-toolkit-gen[-_]?index/i;

/**
 * Every file GIT TRACKS. Not a filesystem walk with a skip list, and the difference is the finding that
 * produced this version: the walk skipped `site/` wholesale as "generated", but 21 tracked authored files
 * live there - the site's own scripts, and `catalog.md`. Meanwhile the genuinely generated docs tree
 * under `site/src/content/docs/` is gitignored and asserted untracked by its own check. So "tracked" is
 * already the exact line between authored and generated in this repository, and asking git removes both
 * the false skip and the extension list that omitted `.mdx`.
 */
function trackedTextFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const BINARY = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".pdf", ".zip"]);
  return out.split("\0").filter(Boolean)
    .filter((rel) => !BINARY.has(path.extname(rel).toLowerCase()))
    .map((rel) => path.join(REPO_ROOT, rel))
    .filter((f) => fs.existsSync(f));
}

test("no tracked file names an npm package this project does not own", () => {
  // NO EXEMPTIONS, deliberately. The previous version waived any line that LOOKED like a comment, which
  // it decided by checking whether the trimmed line began with "//" or "*". The CLI's help text is a
  // multi-line template literal, so a live help bullet written in that shape was waived as a comment -
  // the guard would have stayed green while shipping the instruction it exists to forbid. A waiver whose
  // condition an attacker (or a tired author) can satisfy in the text being guarded is not a waiver.
  //
  // The one comment that genuinely needed to discuss the retired name was rephrased to describe it
  // instead of spelling it, which costs one sentence and removes the hole entirely.
  const offenders = [];
  for (const file of trackedTextFiles()) {
    if (file === SELF) continue; // this file must name the pattern in order to forbid it
    let lines;
    try {
      lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    } catch {
      continue; // unreadable or genuinely binary despite its extension
    }
    lines.forEach((line, i) => {
      if (RETIRED.test(line)) {
        offenders.push(`${path.relative(REPO_ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `Use the owned form "npx agent-skills-toolkit gen-index . --write". Describe the retired spelling rather than writing it. Offending lines:\n${offenders.join("\n")}`,
  );
});

test("the guard scans what it claims to, and can actually fail", () => {
  // Guarding the guard. Every clause below failed in some earlier draft of this file.
  assert.ok(RETIRED.test("npx agent-skills-toolkit-gen-index . --write"), "the retired form is matched");
  assert.ok(!RETIRED.test("npx agent-skills-toolkit gen-index . --write"), "the owned form is not matched");

  const scanned = trackedTextFiles().map((f) => path.relative(REPO_ROOT, f).split(path.sep).join("/"));
  // The specific blind spots the previous version had.
  assert.ok(scanned.includes("CHANGELOG.md"), "the file the second instance was found in is scanned");
  assert.ok(scanned.some((f) => f.startsWith("site/")), "authored files under site/ are scanned, not skipped as generated");
  assert.ok(scanned.some((f) => f.startsWith("docs/")), "the docs tree is scanned");
  assert.ok(scanned.includes("bin/agent-skills-toolkit.mjs"), "the CLI whose help text is a template literal is scanned");
  // And the generated tree really is excluded by being untracked, not by a hand-written skip.
  assert.ok(!scanned.some((f) => f.startsWith("site/src/content/docs/explanation/")), "the generated docs mirror is untracked and therefore out of scope");

  // A near-miss spelling is caught too, so "fix the exact string" cannot become the next escape route.
  assert.ok(RETIRED.test("agent-skills-toolkit-genindex"), "a near-miss spelling is still a package we do not own");

  // The positive half, verified rather than assumed: the migration really does name the owned form.
  const changelog = fs.readFileSync(path.join(REPO_ROOT, "CHANGELOG.md"), "utf8");
  assert.match(changelog, /npx agent-skills-toolkit gen-index/, "the CHANGELOG upgrade step names the owned CLI");
});
