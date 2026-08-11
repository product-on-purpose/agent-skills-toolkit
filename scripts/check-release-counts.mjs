// what-it-is:   release-time stated-test-count drift guard (backlog E27, "the test count is quoted by
//               hand in two places and nothing checks it")
// what-it-does: runs the test suite itself, reads the authoritative total and failure count from its
//               TAP summary, then fails if the newest CHANGELOG.md section, the STATUS.md "Tests"
//               row, or any file under the current version's release-plan packet states a
//               disagreeing count
// why:          v1.10.1 published a hand-typed test count that went stale FOUR separate times in one
//               release (CHANGELOG's 647 against a true 667, STATUS.md's pre-release 613, a round-4
//               packet snapshot, and the rebaselined packet still claiming 673 against HEAD's 682).
//               Filing a backlog item for the fourth instance of the same defect, inside the release
//               that documents it, was not credible when the fix is small; this is that fix.
// used-by:      npm run release-counts (wired to the release gate, deliberately NOT to npm test - see
//               the note below); tests/unit/check-release-counts.test.mjs; imports the number-parsing
//               half from scripts/lib/stated-counts.mjs
//
// Scope note, and why this does NOT run inside `npm test`: running the suite from inside the suite is
// circular, and doubling test time on every push to guard a number that changes once per release is
// the wrong trade. This is a release-time gate, run by hand or by the release checklist, the same
// boundary `docs/internal/RELEASE.md` already draws around `scripts/check-readme-version.mjs`.
//
// Scope note on what counts as a "stated test count": extractStatedCounts (scripts/lib/stated-
// counts.mjs's extractTestCountClaims, re-exported here under its original name) deliberately
// requires a count paired with an ADJACENT failures count, in the "N (tests,)? M failures" shape
// this repository already uses everywhere it states a LIVE total (CHANGELOG's "**682 tests, 0
// failures**", STATUS's "682, 0 failures"). A bare "NNN tests" mention with no adjacent failures
// count does not match, by design: `docs/internal/release-plans/plan_v1.10.1/RELEASE-PLAN.md` states
// "613 tests, spine 30" as a HISTORICAL baseline fact (the branch point, not the current suite), and
// this release's own adversarial-review record quotes 647, 667, 613 and 673 as PAST evidence while
// narrating the four instances of this exact defect. None of those pairs a number with a failures
// count, so none of them is misread as a live claim. What this misses, honestly: a genuinely stale
// LIVE claim phrased without a failures count ("the suite now has 673 tests", "673 tests pass") would
// slip past this guard undetected. The narrower shape was chosen because it has zero false positives
// against every count mention this repository's own release packet already contains, several of
// which are deliberately historical; a looser "any digits near the word tests" pattern would have
// flagged the RELEASE-PLAN.md baseline line and the adversarial-review record's own history section
// on every run, which is a worse guard than none because a maintainer who sees it cry wolf stops
// reading its output.
//
// Only DISAGREEMENT fails, never absence. `docs/internal/release-plans/plan_v1.10.1/README.md`
// deliberately states no test count at all ("the packet headline now states no test count at all and
// points at the two files the checker verifies") - a target carrying zero matches of the shape above
// is not an error under this guard, on the same reasoning: the fewer hand-maintained copies of the
// number, the fewer places it can go stale, and inventing a new "you must restate this number here"
// requirement would work against that.
//
// Scope note on the release-plan packet scan: only `.md` files under the current version's packet
// directory are read. Every file in every packet this repository has shipped is Markdown; a non-
// Markdown artifact placed there in the future would not be scanned.
//
// Scope note on number parsing: the ACTUAL regex - a complete-integer-token match with thousands-
// separator normalization - lives in scripts/lib/stated-counts.mjs, not here, and this file does not
// keep its own copy (round-6 adversarial review, Findings 1 and 2: the identical first-match-only
// defect that round-5 fixed in check-readme-version.mjs was reintroduced in this file's own
// isolateStatusTestsRow, and a second, independent defect - no leading numeric boundary, no
// thousands-separator support - let a false claim like "1,720 tests, 0 failures" match on the
// substring "720 tests, 0 failures" against an actual 720 and silently pass). isolateStatusTestsRows
// (plural) below mirrors that same lesson: it collects EVERY "| Tests |" row and requires exactly
// one, the same treatment check-readme-version.mjs already gives its own "exactly one" claims.
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { normalizeArgPath, relPath, walkFiles } from "./lib/fs-utils.mjs";
import { extractTestCountClaims } from "./lib/stated-counts.mjs";

/** Read library.json and return its `version` field. Throws (never returns null) on a missing file,
 *  unparseable JSON, or a missing version, the same fail-closed shape check-readme-version.mjs uses
 *  for its own required inputs - a version this script cannot determine means it cannot know which
 *  release-plan packet or CHANGELOG section to hold accountable. */
export function readVersion(root) {
  const libPath = path.join(root, "library.json");
  if (!existsSync(libPath)) {
    throw new Error(`check-release-counts: library.json not found at ${libPath}`);
  }
  let lib;
  try {
    lib = JSON.parse(readFileSync(libPath, "utf8"));
  } catch (e) {
    throw new Error(`check-release-counts: failed to parse library.json: ${e.message}`);
  }
  if (!lib.version) {
    throw new Error(`check-release-counts: library.json has no version field`);
  }
  return lib.version;
}

/** Run `node --test` against `root` and return its TAP stdout. Forces the tap reporter explicitly
 *  rather than relying on the runner's own TTY-detection default, so the summary lines this script
 *  parses are not dependent on how the parent process happens to be invoked. maxBuffer is raised well
 *  past the default 1 MiB: a suite this size's verbose TAP body is comfortably larger than that.
 *
 *  `NODE_TEST_CONTEXT` is stripped from the child's environment before spawning. Node's test runner
 *  sets it to `child-v8` on every process it runs a test file in, so this script's OWN test suite
 *  (itself running under `node --test`) inherits it via `process.env`, and spawnSync copies the
 *  parent environment by default. A nested `node --test` that inherits that variable switches to a
 *  V8-serialized child-reporter protocol instead of printing plain TAP text, which made this
 *  function's own CLI-level tests fail with "could not find the TAP summary lines" until this was
 *  found and fixed - a real bug, not a hypothetical one. */
export function runSuite(root) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-reporter=tap", "--test-reporter-destination=stdout"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env }
  );
  if (result.error) {
    throw new Error(`check-release-counts: failed to launch the test suite in ${root}: ${result.error.message}`);
  }
  return result.stdout ?? "";
}

/** Parse the two authoritative numbers from TAP output: the total ("# tests N") and the failure count
 *  ("# fail N"). Deliberately never reads "# pass": the argv coverage skips its Windows-only half on
 *  POSIX and its POSIX-only half on Windows, so the same 682-test suite reports different pass/skip
 *  splits per platform while the total and the failure count do not move. Comparing a pass count
 *  would fail this guard on exactly one platform for a difference that is not a defect. */
export function parseTapSummary(tapText) {
  const text = String(tapText ?? "").replace(/\r\n/g, "\n");
  const totalM = text.match(/^# tests (\d+)\s*$/m);
  const failM = text.match(/^# fail (\d+)\s*$/m);
  if (!totalM || !failM) {
    throw new Error(
      `check-release-counts: could not find the TAP summary lines ("# tests N" and "# fail N") in the ` +
      `suite's output. The reporter format may have changed, or the suite crashed before printing a summary.`
    );
  }
  return { total: Number(totalM[1]), failures: Number(failM[1]) };
}

// The actual parsing lives in scripts/lib/stated-counts.mjs (extractTestCountClaims): a complete-
// integer-token match, with thousands-separator normalization, found via matchAll so every "N
// (tests,)? M failures" claim in `text` is returned, never just the first. Re-exported under this
// file's original name so existing callers/tests need not change; see the module docblock's "Scope
// note on what counts as a stated test count" for why this shape was chosen and what it deliberately
// does not catch.
export const extractStatedCounts = extractTestCountClaims;

function lineAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

/**
 * Isolate the body of CHANGELOG.md's `## [<version>]` section: from just after that heading up to the
 * next `## [` heading, or end of file if this is the newest (last) section. Returns null when the
 * heading is not found (e.g. the release has not been promoted out of `[Unreleased]` yet). Slicing to
 * the next `## [` heading, rather than a lookahead for it, mirrors check-readme-version.mjs's own
 * documented reasoning for its `## Status` isolation: a lookahead silently matches nothing when the
 * section is the LAST one in the file, which is exactly the case for the newest CHANGELOG entry more
 * often than not.
 */
export function isolateChangelogSection(changelogText, version) {
  const escaped = String(version).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingRe = new RegExp(`^## \\[${escaped}\\][^\n]*$`, "m");
  const m = headingRe.exec(changelogText);
  if (!m) return null;
  const bodyStart = m.index + m[0].length;
  const rest = changelogText.slice(bodyStart);
  const next = rest.match(/^## \[/m);
  const bodyEnd = next ? bodyStart + next.index : changelogText.length;
  return { text: changelogText.slice(bodyStart, bodyEnd), startLine: lineAt(changelogText, bodyStart) };
}

/** Every "| Tests | ... |" row of STATUS.md's current-state table, in document order. Collected with
 *  matchAll - never just the first match (round-6 adversarial review, Finding 1: the identical
 *  first-match-only defect round-5 fixed in check-readme-version.mjs's tier-claim scan was
 *  reintroduced here, in a brand-new file, in the same commit - a correct first row followed by a
 *  stale second row passed unseen). Returns [] (distinct from throwing) when no row's first cell is
 *  exactly "Tests" (case-insensitive); evaluateReleaseCounts treats that as a missing anchor and
 *  fails closed the same way it already does for a missing CHANGELOG heading or packet directory. */
export function isolateStatusTestsRows(statusText) {
  const re = /^\|\s*Tests\s*\|([^\n]*)$/gim;
  const out = [];
  for (const m of statusText.matchAll(re)) {
    out.push({ text: m[0], startLine: lineAt(statusText, m.index) });
  }
  return out;
}

/** Absolute path of the release-plan packet directory for `version`. */
export function packetDir(root, version) {
  return path.join(root, "docs", "internal", "release-plans", `plan_v${version}`);
}

/** Relative, slash-normalized paths of every `.md` file under the current version's release-plan
 *  packet, sorted for deterministic output. Returns null (distinct from an empty array) when the
 *  packet directory itself does not exist, so a missing packet fails closed rather than reading as
 *  "packet present, nothing to say". */
export function collectPacketFiles(root, version) {
  const dir = packetDir(root, version);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  return walkFiles(dir)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .map((f) => relPath(root, f))
    .sort();
}

/**
 * Run the full check against an already-obtained `tapText` (never spawns the suite itself - that is
 * `runSuite`'s job, kept separate so tests exercise this against a fake TAP string per the task's own
 * instruction). Returns `{ authoritative, failures }` when the structural anchors (library.json,
 * the CHANGELOG heading, the STATUS.md Tests row, the packet directory) are all found; throws when one
 * is not, the same fail-closed shape as check-readme-version.mjs's own missing-anchor handling.
 */
export function evaluateReleaseCounts({ root, version, tapText }) {
  const authoritative = parseTapSummary(tapText);
  const failures = [];

  function checkClaims(claims, label, sourceText, lineOffset) {
    for (const c of claims) {
      if (c.total !== authoritative.total || c.failures !== authoritative.failures) {
        const line = lineOffset + lineAt(sourceText, c.index) - 1;
        failures.push(
          `${label}:${line}  states "${c.raw.trim()}" (suite reports ${authoritative.total} tests, ${authoritative.failures} failures)`
        );
      }
    }
  }

  const changelogPath = path.join(root, "CHANGELOG.md");
  if (!existsSync(changelogPath)) {
    throw new Error(`check-release-counts: CHANGELOG.md not found at ${changelogPath}`);
  }
  const changelogText = readFileSync(changelogPath, "utf8");
  const section = isolateChangelogSection(changelogText, version);
  if (!section) {
    throw new Error(
      `check-release-counts: no "## [${version}]" heading found in CHANGELOG.md. This guard is anchored ` +
      `to that heading; promote the release out of [Unreleased] before running it.`
    );
  }
  checkClaims(extractStatedCounts(section.text), "CHANGELOG.md", section.text, section.startLine);

  const statusPath = path.join(root, "docs", "internal", "STATUS.md");
  if (!existsSync(statusPath)) {
    throw new Error(`check-release-counts: docs/internal/STATUS.md not found at ${statusPath}`);
  }
  const statusText = readFileSync(statusPath, "utf8");
  const rows = isolateStatusTestsRows(statusText);
  if (rows.length === 0) {
    throw new Error(
      `check-release-counts: no "| Tests |" row found in docs/internal/STATUS.md. This guard is anchored ` +
      `to that row; update this script if the table was reshaped.`
    );
  }
  // Exactly one "| Tests |" row is required (the same "exactly one" treatment
  // check-readme-version.mjs already gives its own single-labeled-bullet claim, the tier claim): a
  // table stating two counts at once is a defect in its own right, even before either row's content
  // is inspected. Every row found is still checked for a disagreeing count below, so a stale SECOND
  // row is named specifically rather than only reported as "ambiguous".
  if (rows.length > 1) {
    failures.push(
      `docs/internal/STATUS.md  has ${rows.length} "| Tests |" rows; exactly one is required so the front door cannot state two counts at once`
    );
  }
  for (const row of rows) {
    checkClaims(extractStatedCounts(row.text), "docs/internal/STATUS.md", row.text, row.startLine);
  }

  const files = collectPacketFiles(root, version);
  if (files === null) {
    throw new Error(
      `check-release-counts: no release-plan packet found at docs/internal/release-plans/plan_v${version}/. ` +
      `Create the packet before running the release gate.`
    );
  }
  for (const rel of files) {
    const text = readFileSync(path.join(root, rel), "utf8");
    checkClaims(extractStatedCounts(text), rel, text, 1);
  }

  return { authoritative, failures };
}

function main() {
  const argv = process.argv.slice(2);
  const root = argv[0] ? path.resolve(normalizeArgPath(argv[0])) : process.cwd();
  let version;
  let result;
  try {
    version = readVersion(root);
    const tapText = runSuite(root);
    result = evaluateReleaseCounts({ root, version, tapText });
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exitCode = 1;
    return;
  }
  if (result.failures.length > 0) {
    process.stderr.write(
      `check-release-counts: stated test count drift detected\n` +
      result.failures.map((f) => `  ${f}\n`).join("") +
      `  The suite reports ${result.authoritative.total} tests, ${result.authoritative.failures} failures. Update the disagreeing document(s).\n`
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `check-release-counts: OK (version ${version}, suite reports ${result.authoritative.total} tests, ${result.authoritative.failures} failures, agrees everywhere checked)\n`
  );
}

// Guarded like every other CLI entry point in this repo (check.mjs, standards-watch.mjs, ...): main()
// runs only when invoked as a script, never on import, so tests can import the pure functions above
// without spawning a real suite.
if (process.argv[1]?.endsWith("check-release-counts.mjs")) {
  main();
}
