// what-it-is:   a repo-wide guard against instructing anyone to run an npm package we do not own
// what-it-does: fails if the retired `agent-skills-toolkit-gen-index` name appears in any consumer-facing
//               instruction, in docs or in a runtime string
// why:          this exact string has now escaped review TWICE. Round 1 of the v1.13.0 review found it in
//               the G4 remediation messages and fixed those; round 4 found it still sitting in
//               CHANGELOG.md's Upgrade section, which is the most-read consumer instruction in the whole
//               release. Fixing the second instance by hand and moving on is what produced the second
//               instance. `npx <name>` DOWNLOADS AND EXECUTES whatever publisher holds that name, so an
//               instruction naming a package we do not own is not a typo, it is a supply-chain hazard we
//               authored.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { walkFiles } from "../../scripts/lib/fs-utils.mjs";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SELF), "../..");

// The owned CLI is `agent-skills-toolkit` with `gen-index` as a SUBCOMMAND. Any hyphenated run-together
// form is a package name, and none of them are ours. Written as a pattern rather than one literal so a
// near-miss (`...-genindex`, `...-gen_index`) is caught by the same guard.
const RETIRED = /agent-skills-toolkit-gen[-_]?index/i;

// Where a reader could act on the text. site/ is a generated mirror of docs/ and node_modules/ is not
// ours; .git and the local-only scratch trees are not shipped.
const SKIP_DIRS = new Set(["node_modules", ".git", "site", "_local", ".memsearch", "coverage"]);
const TEXT_EXT = new Set([".md", ".mjs", ".js", ".json", ".yml", ".yaml", ".txt"]);

function candidateFiles() {
  return walkFiles(REPO_ROOT).filter((f) => {
    const rel = path.relative(REPO_ROOT, f);
    if (rel.split(path.sep).some((seg) => SKIP_DIRS.has(seg))) return false;
    return TEXT_EXT.has(path.extname(f));
  });
}

/**
 * A COMMENT line in source is allowed to name the retired form, because explaining why a name is retired
 * requires writing it, and bin/agent-skills-toolkit.mjs does exactly that. Everything else is not: prose
 * in a .md file is an instruction to a reader, and a string literal in .mjs is an instruction we print.
 *
 * This distinguishes by line shape, not by parsing, so a comment sharing a line with code would be
 * waived. That is stated rather than fixed: the alternative was matching on rationale words like
 * "retired", which waives any line an author happens to phrase that way, and this repo already has one
 * audit that learned the same lesson the hard way (see adr-implementation-sites.test.mjs).
 */
function isCommentLine(line, ext) {
  if (ext !== ".mjs" && ext !== ".js") return false;
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

test("no consumer-facing instruction names an npm package this project does not own", () => {
  const offenders = [];
  for (const file of candidateFiles()) {
    if (file === SELF) continue; // this file names the pattern in order to forbid it
    const ext = path.extname(file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!RETIRED.test(line)) return;
      if (isCommentLine(line, ext)) return;
      offenders.push(`${path.relative(REPO_ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `Use the owned form "npx agent-skills-toolkit gen-index . --write". Offending lines:\n${offenders.join("\n")}`,
  );
});

test("the guard can actually fail, and the owned form is what the repo tells people to run", () => {
  // Guarding against a guard that passes because its pattern matches nothing real.
  assert.ok(RETIRED.test("npx agent-skills-toolkit-gen-index . --write"), "the retired form is matched");
  assert.ok(!RETIRED.test("npx agent-skills-toolkit gen-index . --write"), "the owned form is not matched");
  assert.ok(!isCommentLine("  out.push(`run npx agent-skills-toolkit-gen-index`);", ".mjs"), "a string literal is not waived as a comment");
  assert.ok(isCommentLine("  // named `npx agent-skills-toolkit-gen-index`, which is NOT a package", ".mjs"), "an explanatory comment is waived");
  assert.ok(!isCommentLine("- Run `npx agent-skills-toolkit-gen-index`", ".md"), "markdown prose is never waived");

  // And the positive half: the migration really does tell people the owned form somewhere.
  const changelog = fs.readFileSync(path.join(REPO_ROOT, "CHANGELOG.md"), "utf8");
  assert.match(changelog, /npx agent-skills-toolkit gen-index/, "the CHANGELOG upgrade step names the owned CLI");
});
