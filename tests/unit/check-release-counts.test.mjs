import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  readVersion,
  parseTapSummary,
  extractStatedCounts,
  isolateChangelogSection,
  isolateStatusTestsRows,
  collectPacketFiles,
  evaluateReleaseCounts,
  versionHasShipped,
} from "../../scripts/check-release-counts.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../scripts/check-release-counts.mjs");

function tapText({ total, failures }) {
  return [
    "TAP version 13",
    "1..1",
    `# tests ${total}`,
    "# suites 0",
    `# pass ${total - failures}`,
    `# fail ${failures}`,
    "# cancelled 0",
    "# skipped 0",
    "# todo 0",
    "# duration_ms 1.0",
    "",
  ].join("\n");
}

// --- parseTapSummary: the TAP-parsing half, exercised entirely against fake TAP strings (no real
// suite run), per the task's own instruction. ---

test("parseTapSummary: reads the total and failure count from real TAP shape", () => {
  const r = parseTapSummary(tapText({ total: 682, failures: 0 }));
  assert.deepEqual(r, { total: 682, failures: 0 });
});

test("parseTapSummary: reads a nonzero failure count", () => {
  const r = parseTapSummary(tapText({ total: 10, failures: 3 }));
  assert.deepEqual(r, { total: 10, failures: 3 });
});

test("parseTapSummary: never reads \"# pass\" as the authoritative total (platform-varying skip split must not matter)", () => {
  // Same total and failures, deliberately different pass/skip split (mirrors the real argv-coverage
  // platform difference: Windows and Linux report the same 682 total with different skip counts).
  const linux = "# tests 682\n# pass 677\n# fail 0\n# skipped 5\n";
  const windows = "# tests 682\n# pass 681\n# fail 0\n# skipped 1\n";
  assert.deepEqual(parseTapSummary(linux), { total: 682, failures: 0 });
  assert.deepEqual(parseTapSummary(windows), { total: 682, failures: 0 });
});

test("parseTapSummary: handles CRLF line endings", () => {
  const crlf = tapText({ total: 5, failures: 1 }).replace(/\n/g, "\r\n");
  assert.deepEqual(parseTapSummary(crlf), { total: 5, failures: 1 });
});

test("parseTapSummary: throws when the \"# tests\" summary line is absent (reporter format changed or suite crashed)", () => {
  assert.throws(() => parseTapSummary("# fail 0\n"), /TAP summary/);
});

test("parseTapSummary: throws when the \"# fail\" summary line is absent", () => {
  assert.throws(() => parseTapSummary("# tests 5\n"), /TAP summary/);
});

// --- extractStatedCounts: the shape this guard treats as a "live stated test count", and the cases
// it deliberately does NOT match. See the module docblock for the reasoning. ---

test("extractStatedCounts: matches the CHANGELOG.md shape (\"N tests, M failures\")", () => {
  const c = extractStatedCounts("A trust patch. **682 tests, 0 failures** (was 613), gate Advanced 0/0.");
  assert.equal(c.length, 1);
  assert.equal(c[0].total, 682);
  assert.equal(c[0].failures, 0);
});

test("extractStatedCounts: matches the STATUS.md table-row shape (\"N, M failures\", no \"tests\" word)", () => {
  const c = extractStatedCounts("| Tests | 682, 0 failures (measured at the v1.10.1 cut, 2026-08-11) |");
  assert.equal(c.length, 1);
  assert.equal(c[0].total, 682);
  assert.equal(c[0].failures, 0);
});

test("extractStatedCounts: does NOT match a bare test count with no adjacent failures count (the real RELEASE-PLAN.md baseline shape)", () => {
  const c = extractStatedCounts("Baseline at branch: main @ bf2745f, gate Advanced 0/0, 613 tests, spine 30, Standard 0.12.");
  assert.equal(c.length, 0, "a count with no paired failures count must not be read as a live claim");
});

test("extractStatedCounts: does NOT match a historical count quoted with a semicolon, not a comma (the real adversarial-review-resolutions.md shape)", () => {
  const c = extractStatedCounts("CHANGELOG.md claimed 647 tests; three rounds of review had pushed the real number to 667.");
  assert.equal(c.length, 0);
});

test("extractStatedCounts: does NOT match \"N tests against HEAD's M\" (the real round-5 finding's own description of itself)", () => {
  const c = extractStatedCounts("plan_v1.10.1/README.md claimed 673 tests against HEAD's 682, in a document that was rebaselined.");
  assert.equal(c.length, 0);
});

test("extractStatedCounts: finds two separate claims in one blob", () => {
  const c = extractStatedCounts("First: 10 tests, 0 failures. Later: 12 tests, 1 failures.");
  assert.equal(c.length, 2);
  assert.deepEqual([c[0].total, c[0].failures], [10, 0]);
  assert.deepEqual([c[1].total, c[1].failures], [12, 1]);
});

// --- isolateChangelogSection ---

test("isolateChangelogSection: isolates the body between the version heading and the next \"## [\" heading", () => {
  const changelog = [
    "# Changelog",
    "",
    "## [Unreleased]",
    "",
    "## [1.10.1] - 2026-08-11",
    "",
    "**682 tests, 0 failures**.",
    "",
    "### Fixed",
    "- something",
    "",
    "## [1.10.0] - 2026-08-07",
    "",
    "**613 tests, 0 failures**.",
    "",
  ].join("\n");
  const section = isolateChangelogSection(changelog, "1.10.1");
  assert.ok(section);
  assert.match(section.text, /682 tests, 0 failures/);
  assert.doesNotMatch(section.text, /613 tests/, "must stop before the NEXT version heading");
});

test("isolateChangelogSection: still isolates the section when it is the LAST one in the file (regression guard: a lookahead silently finds nothing here)", () => {
  const changelog = [
    "# Changelog",
    "",
    "## [Unreleased]",
    "",
    "## [2.0.0] - 2026-08-11",
    "",
    "**9 tests, 0 failures**.",
    "",
  ].join("\n");
  const section = isolateChangelogSection(changelog, "2.0.0");
  assert.ok(section, "must isolate the section even with no trailing heading after it");
  assert.match(section.text, /9 tests, 0 failures/);
});

test("isolateChangelogSection: returns null when the version heading is not present", () => {
  const changelog = "# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n\nold.\n";
  assert.equal(isolateChangelogSection(changelog, "9.9.9"), null);
});

// --- isolateStatusTestsRows ---
//
// Collects EVERY "| Tests |" row via matchAll, never just the first (round-6 adversarial review,
// Finding 1: the identical first-match-only defect that round-5 fixed in check-readme-version.mjs's
// tier-claim scan was reintroduced here, in a brand-new file, in the same commit).

test("isolateStatusTestsRows: finds the row whose first cell is exactly \"Tests\"", () => {
  const status = "| Fact | Value |\n|---|---|\n| Version | 1.10.1 |\n| Tests | 682, 0 failures (measured 2026-08-11) |\n| Spine | 30 checks |\n";
  const rows = isolateStatusTestsRows(status);
  assert.equal(rows.length, 1);
  assert.match(rows[0].text, /682, 0 failures/);
});

test("isolateStatusTestsRows: returns [] when there is no \"Tests\" row", () => {
  const status = "| Fact | Value |\n|---|---|\n| Version | 1.10.1 |\n";
  assert.deepEqual(isolateStatusTestsRows(status), []);
});

test("isolateStatusTestsRows: returns BOTH rows when the table carries a correct first \"Tests\" row and a stale second one, not just the first", () => {
  const status = [
    "| Fact | Value |",
    "|---|---|",
    "| Tests | 720, 0 failures |",
    "| Tests | 682, 0 failures |",
    "",
  ].join("\n");
  const rows = isolateStatusTestsRows(status);
  assert.equal(rows.length, 2, "a first-match-only scan would silently see only the first row");
  assert.match(rows[0].text, /720, 0 failures/);
  assert.match(rows[1].text, /682, 0 failures/);
});

// --- evaluateReleaseCounts: the full pipeline against a fixture root and an injected TAP string.
// Never spawns a real suite (the tapText is always supplied directly), per the task's instruction. ---

function mkRoot({ version = "9.0.0", changelogSection, statusRow, packetFiles = {} } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-relcounts-"));
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "t", version }), "utf8");
  const changelog = [
    "# Changelog",
    "",
    "## [Unreleased]",
    "",
    `## [${version}] - 2026-08-11`,
    "",
    changelogSection ?? "**7 tests, 0 failures**.",
    "",
  ].join("\n");
  writeFileSync(path.join(dir, "CHANGELOG.md"), changelog, "utf8");
  mkdirSync(path.join(dir, "docs", "internal"), { recursive: true });
  const status = [
    "# STATUS",
    "",
    "| Fact | Value |",
    "|---|---|",
    `| Version | ${version} |`,
    `| Tests | ${statusRow ?? "7, 0 failures"} |`,
    "",
  ].join("\n");
  writeFileSync(path.join(dir, "docs", "internal", "STATUS.md"), status, "utf8");
  const packetDir = path.join(dir, "docs", "internal", "release-plans", `plan_v${version}`);
  mkdirSync(packetDir, { recursive: true });
  const entries = Object.keys(packetFiles).length > 0 ? packetFiles : { "README.md": "No test count restated here.\n" };
  for (const [name, content] of Object.entries(entries)) {
    writeFileSync(path.join(packetDir, name), content, "utf8");
  }
  return dir;
}

test("evaluateReleaseCounts: passes with no failures when every target agrees with the authoritative count", () => {
  const dir = mkRoot({ version: "9.0.0" });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.0.0", tapText: tapText({ total: 7, failures: 0 }) });
    assert.deepEqual(r.failures, []);
    assert.deepEqual(r.authoritative, { total: 7, failures: 0 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: fails when CHANGELOG.md's newest section disagrees with the authoritative count", () => {
  // statusRow is set to agree with the injected authoritative total (682) so only CHANGELOG.md
  // disagrees; otherwise STATUS.md's default ("7, 0 failures") would ALSO disagree with it.
  const dir = mkRoot({ version: "9.1.0", changelogSection: "**673 tests, 0 failures**.", statusRow: "682, 0 failures" });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.1.0", tapText: tapText({ total: 682, failures: 0 }) });
    assert.equal(r.failures.length, 1);
    assert.match(r.failures[0], /CHANGELOG\.md/);
    assert.match(r.failures[0], /673/);
    assert.match(r.failures[0], /682/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: fails when STATUS.md's Tests row disagrees with the authoritative count", () => {
  // changelogSection is left at mkRoot's default ("7 tests, 0 failures"), so the injected authoritative
  // total below (7) must match it - otherwise CHANGELOG.md would ALSO disagree and this would no
  // longer isolate the STATUS.md-only case.
  const dir = mkRoot({ version: "9.2.0", statusRow: "613, 0 failures" });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.2.0", tapText: tapText({ total: 7, failures: 0 }) });
    assert.equal(r.failures.length, 1);
    assert.match(r.failures[0], /STATUS\.md/);
    assert.match(r.failures[0], /613/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: fails when a file under the release-plan packet disagrees with the authoritative count", () => {
  const dir = mkRoot({
    version: "9.3.0",
    packetFiles: { "RELEASE-PLAN.md": "This packet claims 999 tests, 0 failures at the cut.\n" },
  });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.3.0", tapText: tapText({ total: 7, failures: 0 }) });
    assert.equal(r.failures.length, 1);
    assert.match(r.failures[0], /RELEASE-PLAN\.md/);
    assert.match(r.failures[0], /999/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: does NOT fail on a historical baseline count in a packet file, mirroring the real RELEASE-PLAN.md shape", () => {
  const dir = mkRoot({
    version: "9.4.0",
    packetFiles: { "RELEASE-PLAN.md": "Baseline at branch: main @ deadbee, gate Advanced 0/0, 613 tests, spine 30, Standard 0.12.\n" },
  });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.4.0", tapText: tapText({ total: 7, failures: 0 }) });
    assert.deepEqual(r.failures, [], "a bare historical count with no paired failures count must not be flagged");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: a target stating no count at all is not an error (only disagreement fails)", () => {
  const dir = mkRoot({ version: "9.5.0", packetFiles: { "README.md": "No test count restated here on purpose.\n" } });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.5.0", tapText: tapText({ total: 7, failures: 0 }) });
    assert.deepEqual(r.failures, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: throws when CHANGELOG.md itself is missing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-relcounts-"));
  try {
    assert.throws(
      () => evaluateReleaseCounts({ root: dir, version: "1.0.0", tapText: tapText({ total: 1, failures: 0 }) }),
      /CHANGELOG\.md not found/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- readVersion: the version-derivation half ("derive the current version from library.json rather
// than hardcoding it"). ---

test("readVersion: reads library.json's version field", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-relcounts-"));
  try {
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "t", version: "3.4.5" }), "utf8");
    assert.equal(readVersion(dir), "3.4.5");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readVersion: throws when library.json is missing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-relcounts-"));
  try {
    assert.throws(() => readVersion(dir), /library\.json not found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readVersion: throws when library.json has no version field", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-relcounts-"));
  try {
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "t" }), "utf8");
    assert.throws(() => readVersion(dir), /no version field/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: throws when the CHANGELOG.md version heading is missing", () => {
  const dir = mkRoot({ version: "9.6.0" });
  try {
    assert.throws(
      () => evaluateReleaseCounts({ root: dir, version: "9.9.9", tapText: tapText({ total: 7, failures: 0 }) }),
      /no "## \[9\.9\.9\]" heading/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: throws when the STATUS.md Tests row is missing", () => {
  const dir = mkRoot({ version: "9.7.0" });
  writeFileSync(path.join(dir, "docs", "internal", "STATUS.md"), "# STATUS\n\nno table here.\n", "utf8");
  try {
    assert.throws(
      () => evaluateReleaseCounts({ root: dir, version: "9.7.0", tapText: tapText({ total: 7, failures: 0 }) }),
      /no "\| Tests \|" row/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: throws when the release-plan packet directory for the current version does not exist", () => {
  const dir = mkRoot({ version: "9.8.0" });
  rmSync(path.join(dir, "docs", "internal", "release-plans"), { recursive: true, force: true });
  try {
    assert.throws(
      () => evaluateReleaseCounts({ root: dir, version: "9.8.0", tapText: tapText({ total: 7, failures: 0 }) }),
      /no release-plan packet found/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Round-6 adversarial review, Finding 1: the isolateStatusTestsRow first-match-only bypass,
// exercised at the evaluateReleaseCounts level (not just isolateStatusTestsRows in isolation). ---

test("evaluateReleaseCounts: fails when STATUS.md has a correct first Tests row and a stale second Tests row", () => {
  const dir = mkRoot({ version: "9.9.1" });
  writeFileSync(
    path.join(dir, "docs", "internal", "STATUS.md"),
    [
      "# STATUS",
      "",
      "| Fact | Value |",
      "|---|---|",
      "| Tests | 7, 0 failures |",
      "| Tests | 682, 0 failures |",
      "",
    ].join("\n"),
    "utf8"
  );
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.9.1", tapText: tapText({ total: 7, failures: 0 }) });
    assert.ok(r.failures.length > 0, "a stale second Tests row must not be invisible to a first-match-only scan");
    assert.ok(
      r.failures.some((f) => /STATUS\.md/.test(f) && /682/.test(f)),
      "the failure must name the disagreeing second row's stale count"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Round-6 adversarial review, Finding 2: STATED_COUNT_RE matched grouped totals by suffix, with
// no leading numeric boundary and no thousands-separator understanding. ---

test("evaluateReleaseCounts: fails when CHANGELOG.md states a false grouped-thousands total (\"1,720 tests, 0 failures\" against an actual 720)", () => {
  const dir = mkRoot({ version: "9.9.2", changelogSection: "**1,720 tests, 0 failures**.", statusRow: "720, 0 failures" });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.9.2", tapText: tapText({ total: 720, failures: 0 }) });
    assert.equal(r.failures.length, 1, "\"1,720\" must be read as 1720, which disagrees with 720 - not matched as the substring \"720\"");
    assert.match(r.failures[0], /CHANGELOG\.md/);
    assert.match(r.failures[0], /1,?720/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: fails when STATUS.md's row states a false grouped-thousands total (\"1,720, 0 failures\" against an actual 720)", () => {
  const dir = mkRoot({ version: "9.9.3", changelogSection: "**720 tests, 0 failures**.", statusRow: "1,720, 0 failures" });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.9.3", tapText: tapText({ total: 720, failures: 0 }) });
    assert.equal(r.failures.length, 1, "\"1,720\" in the STATUS.md row form must also be read as the full 1720");
    assert.match(r.failures[0], /STATUS\.md/);
    assert.match(r.failures[0], /1,?720/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: passes when a genuinely correct grouped total is stated (actual 1720, claim \"1,720 tests, 0 failures\")", () => {
  const dir = mkRoot({ version: "9.9.4", changelogSection: "**1,720 tests, 0 failures**.", statusRow: "1,720, 0 failures" });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.9.4", tapText: tapText({ total: 1720, failures: 0 }) });
    assert.deepEqual(r.failures, [], "a genuinely correct grouped total must not be flagged once the suite legitimately reaches that size");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("collectPacketFiles: returns null (not []) when the packet directory does not exist", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-relcounts-"));
  try {
    assert.equal(collectPacketFiles(dir, "1.0.0"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- CLI-level integration: spawns the REAL script end to end, but against a fixture root with no
// test files, so `node --test` returns "0 tests, 0 failures" almost instantly. This exercises the real
// runSuite() spawn without paying the cost of this repository's own ~680-test suite. ---

test("CLI: exits 0 when every target agrees with the real (fast, empty) suite run", () => {
  const dir = mkRoot({ version: "20.0.0", changelogSection: "**0 tests, 0 failures**.", statusRow: "0, 0 failures" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, (r.stdout ?? "") + (r.stderr ?? ""));
    assert.match(r.stdout, /OK/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, { timeout: 20000 });

test("CLI: exits 1 and names the disagreeing file when CHANGELOG.md states a stale count against the real (empty) suite run", () => {
  const dir = mkRoot({ version: "21.0.0", changelogSection: "**673 tests, 0 failures**.", statusRow: "0, 0 failures" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1);
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /CHANGELOG\.md/);
    assert.match(out, /673/);
    assert.match(out, /\b0\b/, "must report the real suite's actual total (0), not the stale claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, { timeout: 20000 });

// --- W1 second order: a record must be able to QUOTE the defect it records ---
//
// Widening the parser to see a bolded count immediately made the write-up documenting that bug trip the
// gate, because it quotes the defective string as evidence. Same class as folder-readme's stripFences and
// the pin-watch tests' stripComments: a guard that scans text also matches the passage explaining it.
// Blanked to equal length rather than removed, so `index` keeps pointing at the right line.

test("extractStatedCounts: a claim inside a fenced block is evidence, not an assertion", () => {
  const doc = [
    "The gate could not see this shape:",
    "",
    "```",
    "**1292**, 0 failures",
    "```",
    "",
    "That is the whole finding.",
  ].join("\n");
  assert.deepEqual(extractStatedCounts(doc), []);
});

test("extractStatedCounts: a claim OUTSIDE a fence still counts", () => {
  const doc = [
    "```",
    "irrelevant fenced text",
    "```",
    "",
    "The suite reports **1356**, 0 failures today.",
  ].join("\n");
  const claims = extractStatedCounts(doc);
  assert.equal(claims.length, 1);
  assert.equal(claims[0].total, 1356);
});

test("extractStatedCounts: blanking a fence does not shift the reported line number", () => {
  // The reason fences are blanked rather than deleted. Deleting would renumber every claim after the
  // first fence and misreport where the drift is - the same constraint that made the parser widen
  // instead of pre-strip.
  const doc = [
    "```",
    "1111, 0 failures",
    "```",
    "real claim: 1356, 0 failures",
  ].join("\n");
  const claims = extractStatedCounts(doc);
  assert.equal(claims.length, 1);
  assert.equal(doc.slice(0, claims[0].index).split("\n").length, 4, 'the claim must report line 4');
});

// --- E52: a SHIPPED packet is a record of its tag, not a live claim. ---
//
// The paired positive and negative cases are the point. Before this, the guard exited 1 on `main`
// against plan_v1.16.1/README.md stating 1399, which was CORRECT for tag 1da4d16 and disagreed only
// with a later branch's suite. Exempting a shipped packet must NOT weaken the guard anywhere else,
// so CHANGELOG and STATUS are still policed below, and an UNSHIPPED packet still fails.

const PACKET_DRIFT = { "README.md": "| Suite | **1399 tests, 0 failures** |\n" };

test("evaluateReleaseCounts: a SHIPPED packet's disagreeing count is not reported", () => {
  const dir = mkRoot({ version: "9.7.0", packetFiles: PACKET_DRIFT });
  try {
    const r = evaluateReleaseCounts({
      root: dir,
      version: "9.7.0",
      tapText: tapText({ total: 7, failures: 0 }),
      versionIsShipped: true,
    });
    assert.deepEqual(r.failures, [], "a tagged version's packet must not be policed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: the SAME packet drift IS reported when the version is not shipped", () => {
  const dir = mkRoot({ version: "9.7.1", packetFiles: PACKET_DRIFT });
  try {
    const r = evaluateReleaseCounts({
      root: dir,
      version: "9.7.1",
      tapText: tapText({ total: 7, failures: 0 }),
      versionIsShipped: false,
    });
    assert.equal(r.failures.length, 1, "an unshipped packet must still be policed");
    assert.match(r.failures[0], /README\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: defaults to policing the packet when versionIsShipped is not supplied", () => {
  const dir = mkRoot({ version: "9.7.2", packetFiles: PACKET_DRIFT });
  try {
    const r = evaluateReleaseCounts({ root: dir, version: "9.7.2", tapText: tapText({ total: 7, failures: 0 }) });
    assert.equal(r.failures.length, 1, "the default must be the strict, pre-E52 behaviour");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: a shipped version exempts its two RECORDS and nothing else", () => {
  // The boundary in one case. Packet and CHANGELOG section state what was true at the tag, so both
  // go quiet. STATUS.md is live state, so it stays policed and is the only reported failure.
  const dir = mkRoot({
    version: "9.7.3",
    changelogSection: "**999 tests, 0 failures**.",
    statusRow: "998, 0 failures",
    packetFiles: PACKET_DRIFT,
  });
  try {
    const r = evaluateReleaseCounts({
      root: dir,
      version: "9.7.3",
      tapText: tapText({ total: 7, failures: 0 }),
      versionIsShipped: true,
    });
    assert.equal(r.failures.length, 1, "exempting the records must never exempt live state");
    assert.ok(r.failures[0].startsWith("docs/internal/STATUS.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: a shipped packet still has to EXIST (the fail-closed anchor is kept)", () => {
  const dir = mkRoot({ version: "9.7.4" });
  try {
    rmSync(path.join(dir, "docs", "internal", "release-plans"), { recursive: true, force: true });
    assert.throws(
      () => evaluateReleaseCounts({
        root: dir,
        version: "9.7.4",
        tapText: tapText({ total: 7, failures: 0 }),
        versionIsShipped: true,
      }),
      /no release-plan packet found/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: skipping a shipped packet is REPORTED, never silent", () => {
  const dir = mkRoot({ version: "9.7.5", packetFiles: PACKET_DRIFT });
  try {
    const r = evaluateReleaseCounts({
      root: dir,
      version: "9.7.5",
      tapText: tapText({ total: 7, failures: 0 }),
      versionIsShipped: true,
    });
    assert.equal(r.notes.length, 2, "both exemptions are reported, so neither is silent");
    assert.ok(r.notes.some((n) => /plan_v9\.7\.5\/ not scanned/.test(n)));
    assert.ok(r.notes.some((n) => /CHANGELOG\.md's \[9\.7\.5\] section not scanned/.test(n)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- versionHasShipped: the tag lookup, and its fail-closed behaviour. ---

test("versionHasShipped: true for a version this repository has actually tagged", () => {
  assert.equal(versionHasShipped(path.resolve(HERE, "../.."), "1.16.1"), true);
});

test("versionHasShipped: false for a version with no tag", () => {
  assert.equal(versionHasShipped(path.resolve(HERE, "../.."), "99.99.99"), false);
});

test("versionHasShipped: FAILS CLOSED outside a git repository, so the packet keeps being policed", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-notgit-"));
  try {
    assert.equal(
      versionHasShipped(dir, "1.16.1"),
      false,
      "no git context must read as not-shipped, never as shipped",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- E52, second surface: the CHANGELOG's versioned section is history once tagged, for the same
// reason the packet is. STATUS.md is deliberately NOT exempt: it is live state. ---

test("evaluateReleaseCounts: a SHIPPED version's CHANGELOG section is not policed", () => {
  const dir = mkRoot({ version: "9.8.0", changelogSection: "**1004 tests, 0 failures**, gate Advanced 0/0." });
  try {
    const r = evaluateReleaseCounts({
      root: dir,
      version: "9.8.0",
      tapText: tapText({ total: 7, failures: 0 }),
      versionIsShipped: true,
    });
    assert.deepEqual(r.failures, [], "a tagged release's CHANGELOG section states what was true then");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: the SAME CHANGELOG drift IS policed before the tag exists", () => {
  const dir = mkRoot({ version: "9.8.1", changelogSection: "**1004 tests, 0 failures**, gate Advanced 0/0." });
  try {
    const r = evaluateReleaseCounts({
      root: dir,
      version: "9.8.1",
      tapText: tapText({ total: 7, failures: 0 }),
      versionIsShipped: false,
    });
    assert.equal(r.failures.length, 1, "this is the v1.10.1 defect the guard exists for");
    assert.ok(r.failures[0].startsWith("CHANGELOG.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluateReleaseCounts: STATUS.md is policed even for a shipped version (live state is never exempt)", () => {
  const dir = mkRoot({
    version: "9.8.2",
    changelogSection: "**1004 tests, 0 failures**.",
    statusRow: "1004, 0 failures",
    packetFiles: { "README.md": "| Suite | **1004 tests, 0 failures** |\n" },
  });
  try {
    const r = evaluateReleaseCounts({
      root: dir,
      version: "9.8.2",
      tapText: tapText({ total: 7, failures: 0 }),
      versionIsShipped: true,
    });
    assert.equal(r.failures.length, 1, "exactly one target stays policed: STATUS.md");
    assert.ok(r.failures[0].startsWith("docs/internal/STATUS.md"));
    assert.equal(r.notes.length, 2, "both exemptions are reported");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
