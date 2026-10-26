#!/usr/bin/env node
// what-it-is:   the version-agreement preflight (E85), modelled on the property `claude plugin tag` already
//               checks before it will cut a tag
// what-it-does: reads the version every version-bearing manifest declares - library.json, the two native
//               plugin manifests, package.json, both halves of package-lock.json, and (only when the
//               repository root itself holds a marketplace catalogue) that catalogue's entry for this
//               plugin by name - and requires them to all be the SAME version. Checks only the files that
//               exist; never fetches anything.
// why:          `verify-tag-matches-manifests.mjs` already proves the four JSON manifests agree with a
//               TAG, but it runs AFTER the tag is pushed, as a release.yml / publish-npm.yml step - and by
//               then `publish-npm.yml`'s own prepare job has already run `npm ci`, installed, and tested
//               the candidate. A version bumped in library.json but not yet in package-lock.json (a
//               forgotten `npm install`) is not a tag-versus-manifest disagreement at all - it is a
//               disagreement AMONG the manifests, present before any tag exists, and nothing upstream of
//               the tag ever looked for it. This gate runs release-ready, before the tag, and would have
//               caught that shape without needing a tag to compare against.
// used-by:      scripts/lib/release-ready.mjs (gate `version-agreement`); covered by
//               tests/unit/check-version-agreement.test.mjs
//
// Deliberately NOT a copy of verify-tag-matches-manifests.mjs's shape: that script compares N files to
// ONE external reference (the tag) and is the right tool once a tag exists. This script has no external
// reference - the "reference" IS library.json, the manifest every other release gate already reads as
// this repository's source of truth for its own version (see check-release-notes-section.mjs). Every
// other file is compared against library.json's version, and a disagreement names the file and the
// value it actually holds, never just "mismatch".
//
// library.json absent, unparseable, or missing a "version" field is NOT treated as "optional file,
// skip it" - every other release-blocking gate in this repository reads library.json as the version of
// record, and a run that passed with no version of record to compare against would be the exact
// reports-clean-over-nothing shape ADR 0053 and review finding F2 (scripts/lib/release-ready.mjs) both
// reject. It is UNREADABLE input, so it refuses (exit 2), never passes.
//
// package.json, the two native plugin manifests, and both halves of package-lock.json are genuinely
// OPTIONAL here: a plugin graded by this Standard need not ship an npm package or a Codex manifest, and
// this script's job is to check what exists, not to invent requirements check.mjs's own manifest checks
// (U8, U9) already own.
//
// The marketplace entry is read ONLY when `<root>/.claude-plugin/marketplace.json` itself exists - never
// a sibling or external catalogue. The agent-plugins marketplace this repository ships to is re-pinned
// AFTER a release (its own `metadata.version` and sha pins trail the tag by design, per
// docs/internal/RELEASE.md), so reading it here would make this gate permanently, correctly red at
// exactly the moment a tag is about to be cut. Nothing in this file resolves a remote catalogue, follows
// a `source` field, or shells out to anything that could reach one.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMarketplaceManifest } from "./lib/marketplace/manifest.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: node scripts/check-version-agreement.mjs [root]

  root                  repository root to check (default: this script's own repository)
  -h, --help            this message

Exit: 0 every version-bearing file that exists agrees with library.json's version
      1 at least one of them disagrees
      2 the input could not be read at all (library.json absent/unparseable/no "version" field, a
        present manifest with unparseable JSON, or a marketplace.json that is present but malformed) -
        a refusal, never a pass`;

/** Read and JSON.parse `abs`, or throw a short, file-naming Error. Never returns a non-object. */
function readJson(abs, label) {
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch (e) {
    throw new Error(`${label}: could not be read (${e.message})`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`${label}: not valid JSON (${e.message})`);
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${label}: must be a JSON object`);
  }
  return data;
}

/**
 * Checks `root` for version agreement. Never throws and never spawns anything - pure over the
 * filesystem, so it is testable against plain fixture directories with no process involved.
 *
 * @returns {{ok: true, reference: string, rows: Array<{label, version}>}
 *          | {ok: false, refused: true, problems: string[]}
 *          | {ok: false, refused: false, reference: string, rows: Array<{label, version, agrees: boolean}>}}
 */
export function checkVersionAgreement(root = process.cwd()) {
  const libPath = path.join(root, "library.json");
  let lib;
  try {
    lib = readJson(libPath, "library.json");
  } catch (e) {
    return { ok: false, refused: true, problems: [e.message] };
  }
  const reference = lib.version;
  if (typeof reference !== "string" || reference.trim() === "") {
    return { ok: false, refused: true, problems: [`library.json: has no "version" field`] };
  }

  // {label, relPath, extract(data) -> string|undefined|null}. `null` means "present but this file
  // carries no claim worth checking" (e.g. package-lock.json without packages[""].version on an old
  // lockfile version) - distinct from `undefined`, which this function treats as unreadable.
  const candidates = [
    { label: ".claude-plugin/plugin.json", relPath: path.join(".claude-plugin", "plugin.json"), extract: (d) => d.version },
    { label: ".codex-plugin/plugin.json", relPath: path.join(".codex-plugin", "plugin.json"), extract: (d) => d.version },
    { label: "package.json", relPath: "package.json", extract: (d) => d.version },
    { label: "package-lock.json (version)", relPath: "package-lock.json", extract: (d) => d.version },
    {
      label: 'package-lock.json (packages[""].version)',
      relPath: "package-lock.json",
      extract: (d) => (d.packages && Object.prototype.hasOwnProperty.call(d.packages, "") ? d.packages[""].version : null),
    },
  ];

  const problems = [];
  const rows = [{ label: "library.json", version: reference, agrees: true }];

  for (const c of candidates) {
    const abs = path.join(root, c.relPath);
    if (!existsSync(abs)) continue; // genuinely optional; not mentioned at all
    let data;
    try {
      data = readJson(abs, c.label);
    } catch (e) {
      problems.push(e.message);
      continue;
    }
    const version = c.extract(data);
    if (version === null) continue; // present file, but this particular claim does not apply to it
    if (version === undefined || typeof version !== "string" || version.trim() === "") {
      problems.push(`${c.label}: has no "version" field`);
      continue;
    }
    rows.push({ label: c.label, version, agrees: version === reference });
  }

  // The marketplace entry - gated on the repository root itself holding the catalogue, per this
  // file's docblock. readMarketplaceManifest never throws; its own `problems` carry parse/shape
  // failures, which this gate treats the same as any other unreadable manifest.
  const marketplacePath = path.join(root, ".claude-plugin", "marketplace.json");
  if (existsSync(marketplacePath)) {
    const mkt = readMarketplaceManifest(root);
    const mktErrors = mkt.problems.filter((p) => p.severity === "error").map((p) => p.message);
    if (mktErrors.length > 0) {
      problems.push(...mktErrors);
    } else {
      const pluginName = typeof lib.name === "string" ? lib.name : null;
      const entry = pluginName ? mkt.entries.find((e) => e.name === pluginName) : null;
      if (entry && typeof entry.declaredVersion === "string" && entry.declaredVersion.trim() !== "") {
        rows.push({
          label: `.claude-plugin/marketplace.json (plugins[] entry "${pluginName}")`,
          version: entry.declaredVersion,
          agrees: entry.declaredVersion === reference,
        });
      }
      // No matching entry, or a matching entry that pins by sha rather than declaring a version: no
      // claim to check, not a disagreement.
    }
  }

  if (problems.length > 0) {
    return { ok: false, refused: true, problems };
  }

  const ok = rows.every((r) => r.agrees);
  return { ok, refused: false, reference, rows };
}

export function main(argv = process.argv.slice(2)) {
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(USAGE);
    return 0;
  }
  const root = argv[0] ? path.resolve(argv[0]) : REPO;
  const result = checkVersionAgreement(root);

  if (result.refused) {
    for (const p of result.problems) console.log(`::error::check-version-agreement: ${p}`);
    console.log(`check-version-agreement: refusing - input could not be read, so nothing is proven`);
    return 2;
  }

  if (!result.ok) {
    console.log(`::error::check-version-agreement: versions disagree (library.json says ${result.reference})`);
    for (const r of result.rows) {
      if (!r.agrees) console.log(`  ${r.label} says ${r.version}`);
    }
    return 1;
  }

  console.log(`check-version-agreement: OK (${result.rows.length} file(s) agree on ${result.reference})`);
  return 0;
}

if (process.argv[1]?.endsWith("check-version-agreement.mjs")) process.exit(main());
