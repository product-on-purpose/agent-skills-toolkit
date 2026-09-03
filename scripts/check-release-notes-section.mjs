#!/usr/bin/env node
// what-it-is:   the RELEASE-NOTES section gate and extractor CLI (E57)
// what-it-does: default mode asserts RELEASE-NOTES.md carries a `## <version>` section for the version
//               in library.json, as a release-ready gate that runs BEFORE the tag; `--extract <version>
//               --out <file>` writes that section out, which is what release.yml uses to build the
//               GitHub release body
// why:          both callers must decide "does this version have a section" the SAME way, or the
//               pre-tag gate and the post-tag refusal can disagree about one file. They share
//               scripts/lib/release-notes-section.mjs and neither reimplements it. See E57 in
//               docs/internal/backlog/enhancements.md for the run that motivated this: v1.17.1 was
//               tagged and published to npm and only THEN failed release.yml, because the release
//               script left a literal `## %s - %s` heading in the notes file and no gate before the
//               tag looked at the notes section at all.
// used-by:      scripts/lib/release-ready.mjs (gate `release-notes-section`);
//               .github/workflows/release.yml; covered by tests/unit/release-notes-section.test.mjs
//
// The extraction is NOT duplicated here from release.yml - it was MOVED out of it. Standard sec
// 4.1/4.4 requires CI configuration to hold no validation logic of its own and only invoke the
// portable scripts, and an inline awk program deciding whether a release may publish was exactly
// such logic. It was also, being in YAML, unreachable from the gate that runs before the tag.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractSection } from "./lib/release-notes-section.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: node scripts/check-release-notes-section.mjs [options]

  (no options)          GATE MODE: read the version from library.json and require a matching
                        "## <version>" section in RELEASE-NOTES.md. Exit 1 if it is absent.
  --extract <version>   write that version's section instead of gating
  --out <file>          where --extract writes (required with --extract, so stdout stays free for
                        the ::error:: annotation a failing run needs to emit)
  --root <dir>          repository root to read from (default: this script's repository)
  -h, --help            this message

Exit: 0 the section exists | 1 it does not | 2 the arguments were unusable`;

export function parseArgs(argv) {
  const opts = { extract: null, out: null, root: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--extract") opts.extract = argv[++i] ?? null;
    else if (a === "--out") opts.out = argv[++i] ?? null;
    else if (a === "--root") opts.root = argv[++i] ?? null;
    else return { error: `unrecognized argument: ${a}` };
  }
  if (opts.extract !== null && !opts.out) return { error: "--extract requires --out <file>" };
  if (opts.extract === "") return { error: "--extract requires a version" };
  return opts;
}

/**
 * The version this repository is about to cut. library.json is the source, not package.json: the
 * release choreography bumps all four manifests together and library.json is the one the other
 * release gates already read, so a gate reading a different manifest could pass on a half-done bump.
 */
function declaredVersion(root) {
  return JSON.parse(readFileSync(path.join(root, "library.json"), "utf8")).version;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  if (opts.error) {
    console.log(`::error::check-release-notes-section: ${opts.error}`);
    return 2;
  }
  const root = opts.root ? path.resolve(opts.root) : REPO;
  const notesPath = path.join(root, "RELEASE-NOTES.md");

  let version;
  let notes;
  try {
    version = opts.extract ?? declaredVersion(root);
    notes = readFileSync(notesPath, "utf8");
  } catch (e) {
    // FAIL CLOSED. A notes file that cannot be read, or a library.json that cannot be parsed, is not
    // a release that has been proven ready - it is a run that proved nothing. G5 already covers
    // RELEASE-NOTES.md's presence at the conformance layer; this gate refusing as well costs a
    // duplicate message on a broken tree and buys never passing on an unread file.
    console.log(`::error::check-release-notes-section: ${e.message}`);
    return 1;
  }

  const { found, text } = extractSection(notes, version);
  if (!found) {
    console.log(
      `::error::no RELEASE-NOTES.md section for ${version}; add a '## ${version}' heading before tagging ` +
        `(refusing to publish the whole changelog as the release body)`,
    );
    return 1;
  }

  if (opts.extract) {
    writeFileSync(path.resolve(opts.out), text);
    console.log(`check-release-notes-section: wrote ${version}'s section (${text.split("\n").length - 1} lines) to ${opts.out}`);
  } else {
    console.log(`check-release-notes-section: RELEASE-NOTES.md carries a section for ${version}`);
  }
  return 0;
}

if (process.argv[1]?.endsWith("check-release-notes-section.mjs")) process.exit(main());
