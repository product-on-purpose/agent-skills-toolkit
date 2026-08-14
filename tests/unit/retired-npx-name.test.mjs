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
function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return out.split("\0").filter(Boolean);
}

/**
 * Every decoding of a file's bytes that could hide the pattern, as strings to search.
 *
 * There is deliberately no binary-extension list and no text/binary classification. An earlier version
 * had one and it excluded `.svg`, which is text and can carry an instruction a reader will follow; any
 * such list is a place for the next exempt extension to hide.
 *
 * latin1 alone was not enough either. It maps each BYTE to one character, so it finds an ASCII pattern in
 * a UTF-8 file exactly - but UTF-16 interleaves NUL bytes between ASCII characters, so in that decoding
 * the pattern is simply not there. A tracked UTF-16 document could carry the forbidden instruction while
 * this guard reported success. Both endiannesses are decoded too, and the byte swap is done here rather
 * than trusting a BOM, because a file without a BOM is exactly the one an evasion would use.
 */
function decodings(abs) {
  const buf = fs.readFileSync(abs);
  const out = [buf.toString("latin1")];
  if (buf.length >= 2 && buf.length % 2 === 0) {
    out.push(buf.toString("utf16le"));
    const swapped = Buffer.from(buf);
    swapped.swap16();
    out.push(swapped.toString("utf16le"));   // the same bytes read as UTF-16BE
  }
  return out;
}

test("no tracked file names an npm package this project does not own", () => {
  // NO EXEMPTIONS, deliberately. An earlier version waived any line that LOOKED like a comment, which it
  // decided by checking whether the trimmed line began with "//" or "*". The CLI's help text is a
  // multi-line template literal, so a live help bullet written in that shape was waived as a comment -
  // the guard would have stayed green while shipping the instruction it exists to forbid. A waiver whose
  // condition can be satisfied inside the text being guarded is not a waiver.
  //
  // FAIL CLOSED. The version before this one caught every read error with `continue` and skipped any path
  // that did not exist, so a single unreadable tracked file made the whole guard pass without inspecting
  // it - a security guard whose failure mode is silent success. Unreadable and missing files are now
  // reported as failures in their own right, naming the path.
  const offenders = [];
  const unreadable = [];
  for (const rel of trackedFiles()) {
    const abs = path.join(REPO_ROOT, rel);
    if (abs === SELF) continue; // this file must name the pattern in order to forbid it
    let texts;
    try {
      texts = decodings(abs);
    } catch (e) {
      unreadable.push(`${rel}: ${e.code ?? e.message}`);
      continue;
    }
    for (const text of texts) {
      text.split(/\r?\n/).forEach((line, i) => {
        if (RETIRED.test(line)) {
          offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
        }
      });
    }
  }
  assert.deepEqual(
    unreadable,
    [],
    `every tracked file must be READ, not skipped - an unscanned file is an unguarded one:\n${unreadable.join("\n")}`,
  );
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

  const scanned = trackedFiles().map((f) => f.split(path.sep).join("/"));
  // The specific blind spots the previous version had.
  assert.ok(scanned.includes("CHANGELOG.md"), "the file the second instance was found in is scanned");
  assert.ok(scanned.some((f) => f.startsWith("site/")), "authored files under site/ are scanned, not skipped as generated");
  assert.ok(scanned.some((f) => f.startsWith("docs/")), "the docs tree is scanned");
  assert.ok(scanned.includes("bin/agent-skills-toolkit.mjs"), "the CLI whose help text is a template literal is scanned");
  // And the generated tree really is excluded by being untracked, not by a hand-written skip.
  assert.ok(!scanned.some((f) => f.startsWith("site/src/content/docs/explanation/")), "the generated docs mirror is untracked and therefore out of scope");
  // No extension is exempt any more. SVG is text and can carry an instruction; it was on the old
  // binary list, which is exactly the kind of hole a classification invites.
  assert.ok(scanned.some((f) => f.endsWith(".svg")), "text formats like SVG are scanned, not classified away as binary");
  assert.ok(decodings(path.join(REPO_ROOT, "package.json"))[0].includes('"name"'), "files are read as bytes");
  // UTF-16 is decoded too, both endiannesses. latin1 cannot see a pattern whose characters are
  // separated by NUL bytes, so a tracked UTF-16 file was a hole the old self-check could not expose.
  const le = Buffer.from("npx agent-skills-toolkit-gen-index", "utf16le");
  assert.ok(!RETIRED.test(le.toString("latin1")), "latin1 alone genuinely misses UTF-16 - that is why this matters");
  assert.ok(RETIRED.test(le.toString("utf16le")), "the LE decoding finds it");
  const be = Buffer.from(le); be.swap16();
  assert.ok(!RETIRED.test(be.toString("utf16le")), "BE bytes are not readable as LE");
  const unswapped = Buffer.from(be); unswapped.swap16();
  assert.ok(RETIRED.test(unswapped.toString("utf16le")), "and the swap this guard performs recovers it");

  // A near-miss spelling is caught too, so "fix the exact string" cannot become the next escape route.
  assert.ok(RETIRED.test("agent-skills-toolkit-genindex"), "a near-miss spelling is still a package we do not own");

  // The positive half, verified rather than assumed: the migration really does name the owned form.
  const changelog = fs.readFileSync(path.join(REPO_ROOT, "CHANGELOG.md"), "utf8");
  assert.match(changelog, /npx agent-skills-toolkit gen-index/, "the CHANGELOG upgrade step names the owned CLI");
});
