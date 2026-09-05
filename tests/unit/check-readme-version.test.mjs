import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../scripts/check-readme-version.mjs");
const { CHECKS } = await import("../../scripts/lib/registry.mjs");
const SPINE_SIZE = CHECKS.length;

// Every fixture carries a `## Status` section because the guard treats a missing one as a hard
// failure. That is deliberate: a check that quietly passes when the thing it inspects is absent is
// worse than no check, which is the lesson `docs/internal/STATUS.md` learned the expensive way.
// `statusVersion` defaults to the library version so the badge tests stay focused on the badge;
// pass it explicitly to exercise Status-section drift.
// libTier / statusTier default to undefined (no tier field in library.json, no Tier bullet in
// Status): every existing call site that omits them keeps behaving exactly as before, since the
// tier guard only activates when library.json actually declares a tier.
function mkFixture(libVersion, badgeVersion, { statusVersion = libVersion, extraStatus = "", libTier, statusTier } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  const lib = { name: "test-lib", version: libVersion };
  if (libTier !== undefined) lib.tier = libTier;
  writeFileSync(path.join(dir, "library.json"), JSON.stringify(lib), "utf8");
  const badgeLine = badgeVersion
    ? `<img src="https://img.shields.io/badge/version-${badgeVersion}-blue?style=flat-square" alt="Version">`
    : "<!-- no version badge -->";
  const tierLine = statusTier !== undefined ? `- **Tier** - ${statusTier}.\n` : "";
  const status = `## Status\n\n- **Version** - \`${statusVersion}\`.\n${tierLine}${extraStatus}`;
  writeFileSync(path.join(dir, "README.md"), `# Test Lib\n\n${badgeLine}\n\n${status}\n`, "utf8");
  return dir;
}

// --- RED: exits 1 on version mismatch ---

test("check-readme-version: exits 1 when badge version disagrees with library.json version", () => {
  const dir = mkFixture("1.6.1", "1.2.0");
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "must exit 1 for version mismatch");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /1\.2\.0|1\.6\.1/, "output must mention the differing versions");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- GREEN: exits 0 on exact match ---

test("check-readme-version: exits 0 when badge version matches library.json version", () => {
  const dir = mkFixture("1.6.1", "1.6.1");
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, "must exit 0 for matching versions");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Format-shift: extra content before the badge still works ---

test("check-readme-version: locates the badge regardless of its line position", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "test-lib", version: "2.0.0" }), "utf8");
    const readme = [
      "# Title",
      "",
      "Some description here.",
      "",
      "Another paragraph with links and stuff.",
      "",
      '<p>',
      '  <img src="https://img.shields.io/badge/version-2.0.0-blue?style=flat-square" alt="Version 2.0.0">',
      '</p>',
      "",
      "## Status",
      "",
      "- **Version** - `2.0.0`.",
      "",
    ].join("\n");
    writeFileSync(path.join(dir, "README.md"), readme, "utf8");
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, "must exit 0 regardless of badge line position");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- The `## Status` claims: the front-door prose nothing used to check ---
//
// docs/internal/RELEASE.md has always promised "README Status matches the declared tier + version
// (drift = error)" and described itself as a one-to-one mirror of an automated gate. Only the badge
// was ever checked. These cover the rest of that promise.

test("check-readme-version: exits 1 when a version in the Status section disagrees, even with a correct badge", () => {
  const dir = mkFixture("1.10.1", "1.10.1", { statusVersion: "1.10.0" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a stale version in Status must fail even when the badge is right");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /## Status/, "output must say where the drift is");
    assert.match(out, /1\.10\.0/, "output must name the stale version");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the Status section is missing entirely", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "test-lib", version: "3.0.0" }), "utf8");
    writeFileSync(
      path.join(dir, "README.md"),
      '# T\n\n<img src="https://img.shields.io/badge/version-3.0.0-blue" alt="v">\n',
      "utf8"
    );
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    // A guard that passes when its subject is absent is worse than no guard.
    assert.equal(r.status, 1, "a missing Status section must fail rather than silently skip");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: still reads Status when it is the LAST section in the file", () => {
  // Regression guard. The first implementation isolated the section with a lookahead for the next
  // `## ` heading, which matched nothing when Status came last, silently disabling every Status
  // check. Section order must not be able to turn the guard off.
  const dir = mkFixture("4.1.0", "4.1.0", { statusVersion: "9.9.9" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "Status drift must be caught when Status is the final section");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /9\.9\.9/, "output must name the stale version found in the last section");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the Status section misstates the spine size", () => {
  // The spine count is read from the live check registry, so a README claiming a stale number fails
  // without anyone having to remember to update a second list.
  const dir = mkFixture("5.0.0", "5.0.0", { extraStatus: "- **Validation spine** - 1 checks.\n" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a wrong spine count must fail");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /spine/i, "output must name the spine claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- The tier claim: round-3 adversarial review, Finding B (the README release guard still does
// not validate tier) ---
//
// docs/internal/RELEASE.md promises "README Status matches the declared tier + version (drift =
// error)". This script's own docblock claimed to be a one-to-one mirror of that promise, but only
// read library.json.version and the skill/spine counts; library.json.tier and the Status section's
// tier claim were never compared, so the README could claim a different grade than the manifest
// declares and the guard would still pass. These cover the fix, in both mismatch directions plus
// the missing-claim case (a guard that silently skips when its subject is absent is worse than no
// guard - the same reasoning already recorded above for the missing-`## Status` case).

test("check-readme-version: exits 0 when the Status tier claim matches library.json.tier", () => {
  const dir = mkFixture("7.0.0", "7.0.0", { libTier: "advanced", statusTier: "Advanced (Gold)" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, "a matching tier claim must pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the README claims a tier the manifest does not declare (README says Silver, manifest says advanced)", () => {
  const dir = mkFixture("8.0.0", "8.0.0", { libTier: "advanced", statusTier: "Silver (Convergent)" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a README tier claim that disagrees with library.json.tier must fail");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /tier/i, "output must name the tier claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the manifest declares a tier the README does not claim (manifest says universal, README says Gold)", () => {
  const dir = mkFixture("9.0.0", "9.0.0", { libTier: "universal", statusTier: "Advanced (Gold)" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a manifest tier that the README does not claim must fail");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /tier/i, "output must name the tier claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when library.json declares a tier and the Status section carries no tier claim at all", () => {
  const dir = mkFixture("10.0.0", "10.0.0", { libTier: "advanced" }); // statusTier omitted: no Tier bullet
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a missing tier claim must fail rather than silently skip, once the manifest declares a tier");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /tier/i, "output must say the tier claim is missing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- The contradictory tier claim: round-4 adversarial review, Finding 1 (regression in round-3's
// own fix) ---
//
// The round-3 matcher tested only whether the claim contained EITHER expected synonym anywhere in
// the string. "Advanced (Silver)" against library.json.tier "advanced" passed, because the string
// contains "Advanced" - even though "Silver" names a different tier outright. A claim naming the
// declared tier plus a foreign tier token is a contradiction, not agreement, and must fail.

test("check-readme-version: exits 1 when the Status tier claim names the declared tier AND a foreign tier token (Advanced (Silver) against tier advanced)", () => {
  const dir = mkFixture("11.0.0", "11.0.0", { libTier: "advanced", statusTier: "Advanced (Silver)" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a claim naming both the declared tier and a foreign tier token is a contradiction and must fail");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /tier/i, "output must name the tier claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 for the same contradiction in the other direction (Silver (Gold) against tier convergent)", () => {
  const dir = mkFixture("12.0.0", "12.0.0", { libTier: "convergent", statusTier: "Silver (Gold)" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "the correct sub-name plus a foreign tier name is still a contradiction");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /tier/i, "output must name the tier claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- The duplicate-claim bypass: round 5 adversarial review, Finding 1 (regression in round 4's own
// fix) ---
//
// Round 4's matcher used `statusBody.match(...)`, which returns only the FIRST match. A Status
// section carrying a correct `**Tier**` bullet followed by a second, contradictory one passed,
// because the second claim was never inspected. The fix collects every `**Tier**` claim with
// `matchAll` and requires EXACTLY ONE: a section stating two grades at once is a defect in its own
// right, not merely a parsing inconvenience, whether or not the two claims happen to be identical.

test("check-readme-version: exits 1 when the Status section carries two contradictory Tier claims (the second, disagreeing claim must not be invisible to a first-match-only check)", () => {
  const dir = mkFixture("14.0.0", "14.0.0", {
    libTier: "advanced",
    statusTier: "Advanced (Gold)",
    extraStatus: "- **Tier** - Convergent (Silver).\n",
  });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "two contradictory tier claims must fail even though the first one is correct");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /tier/i, "output must name the tier claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the Status section carries two IDENTICAL correct Tier claims (exactly one is the rule)", () => {
  const dir = mkFixture("15.0.0", "15.0.0", {
    libTier: "advanced",
    statusTier: "Advanced (Gold)",
    extraStatus: "- **Tier** - Advanced (Gold).\n",
  });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "two tier claims must fail even when both are correct and identical; exactly one is required");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /tier/i, "output must name the tier claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Neighbouring first-match-only holes: the skill-count and spine-size scans used the same
// `statusBody.match(...)` shape as the round-4 tier check. Decision (see report): a CONTRADICTORY
// second claim must fail for both, same as tier. Unlike the tier claim, these numbers have no single
// canonical labeled bullet the Standard promises exactly one of, so a second IDENTICAL (non-
// contradictory) mention is not itself an error here; only disagreement is drift.

test("check-readme-version: exits 1 when the Status section carries two contradictory skill-count claims", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(
      path.join(dir, "library.json"),
      JSON.stringify({ name: "t", version: "16.0.0", components: { skills: [{ name: "a" }, { name: "b" }] } }),
      "utf8"
    );
    writeFileSync(
      path.join(dir, "README.md"),
      '# T\n\n<img src="https://img.shields.io/badge/version-16.0.0-blue" alt="v">\n\n## Status\n\n- **Components** - 2 skills.\n- **Also** - 9 skills, elsewhere.\n',
      "utf8"
    );
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a second, contradictory skill-count claim must not be invisible to a first-match-only check");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /9 skills/, "output must name the disagreeing claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 0 when the Status section repeats the SAME correct skill count twice", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(
      path.join(dir, "library.json"),
      JSON.stringify({ name: "t", version: "17.0.0", components: { skills: [{ name: "a" }, { name: "b" }] } }),
      "utf8"
    );
    writeFileSync(
      path.join(dir, "README.md"),
      '# T\n\n<img src="https://img.shields.io/badge/version-17.0.0-blue" alt="v">\n\n## Status\n\n- **Components** - 2 skills.\n- **Also** - 2 skills, elsewhere.\n',
      "utf8"
    );
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, "repeating the same correct skill count is not a contradiction");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the Status section carries two contradictory spine-size claims", () => {
  const dir = mkFixture("18.0.0", "18.0.0", {
    extraStatus: "- **Validation spine** - 30 checks.\n- **Also** - 1 checks, elsewhere.\n",
  });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a second, contradictory spine-size claim must not be invisible to a first-match-only check");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /spine/i, "output must name the spine claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Round-6 adversarial review, Finding 3: the skill/checks matchAll loops had no leading numeric
// boundary and no thousands-separator understanding, so a contradictory grouped claim like "1,024
// skills" was read as the substring "024" -> Number("024") === 24, coincidentally matching a real
// count of 24 and passing as if it agreed. ---

test("check-readme-version: exits 1 when a second skill-count claim is a false grouped total (\"1,024 skills\" against 24 registered skills)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(
      path.join(dir, "library.json"),
      JSON.stringify({
        name: "t",
        version: "19.0.0",
        components: { skills: Array.from({ length: 24 }, (_, i) => ({ name: `s${i}` })) },
      }),
      "utf8"
    );
    writeFileSync(
      path.join(dir, "README.md"),
      '# T\n\n<img src="https://img.shields.io/badge/version-19.0.0-blue" alt="v">\n\n## Status\n\n- **Components** - 24 skills.\n- **Also** - 1,024 skills, elsewhere.\n',
      "utf8"
    );
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(
      r.status,
      1,
      "\"1,024\" must be read as the full 1024, not misread as the substring \"024\" -> 24, which would coincidentally match"
    );
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /1,?024/, "output must name the disagreeing grouped claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when a second checks-count claim is a false grouped total (\"1,030 checks\" against a 30-check spine)", () => {
  const dir = mkFixture("20.0.0", "20.0.0", {
    extraStatus: "- **Validation spine** - 30 checks.\n- **Also** - 1,030 checks, elsewhere.\n",
  });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(
      r.status,
      1,
      "\"1,030\" must be read as the full 1030, not misread as the substring \"030\" -> 30, which would coincidentally match"
    );
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /1,?030/, "output must name the disagreeing grouped claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: a reasonable single-token claim still passes (Gold alone against tier advanced)", () => {
  // The fix forbids foreign tokens; it must not over-tighten into requiring the exact canonical
  // pair. Naming just one of the two correct synonyms, with no foreign token present, is agreement.
  const dir = mkFixture("13.0.0", "13.0.0", { libTier: "advanced", statusTier: "Gold" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, "a single correct synonym with no foreign token is a legitimate claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: the real repository's Status tier claim still passes its own guard", () => {
  const ROOT = path.resolve(HERE, "..", "..");
  const r = spawnSync(process.execPath, [SCRIPT, ROOT], { encoding: "utf8" });
  assert.equal(r.status, 0, "this repository's own README/library.json must pass the tier guard");
});

test("check-readme-version: exits 1 when the Status section misstates the skill count", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(
      path.join(dir, "library.json"),
      JSON.stringify({ name: "t", version: "6.0.0", components: { skills: [{ name: "a" }, { name: "b" }] } }),
      "utf8"
    );
    writeFileSync(
      path.join(dir, "README.md"),
      '# T\n\n<img src="https://img.shields.io/badge/version-6.0.0-blue" alt="v">\n\n## Status\n\n- **Components** - 7 skills.\n',
      "utf8"
    );
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a wrong skill count must fail");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /7 skills.*registers 2|2/, "output must contrast the claim with the register");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// A composite action's own USAGE version (review finding F13)
//
// `action.yml` advertises the tag a consumer should pin. This repository's went
// stale, was hand-corrected in #238, and had gone stale AGAIN one release later
// with nothing checking it. A third manual correction is not a fix; a guard is.
//
// The rule is SELF-REFERENTIAL rather than scoped to a hardcoded name: a manifest
// that advertises its OWN tag must advertise the right one. A reference to some
// other project is somebody else's version and is none of this guard's business.
// ---------------------------------------------------------------------------

function mkActionFixture(libVersion, usageRef, { name = 'my-plugin', manifest = 'action.yml' } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'askit-action-'));
  writeFileSync(path.join(dir, 'library.json'), JSON.stringify({ name, version: libVersion }), 'utf8');
  const readme = [
    '# T',
    '',
    '<img src="https://img.shields.io/badge/version-' + libVersion + '-blue" alt="v">',
    '',
    '## Status',
    '',
    '- **Version** - `' + libVersion + '`.',
    '',
  ].join('\n');
  writeFileSync(path.join(dir, 'README.md'), readme, 'utf8');
  const manifestText = [
    'name: t',
    '# USAGE (paste into a workflow job):',
    '#   uses: ' + usageRef + '   # pin a released tag or a commit sha',
    '',
  ].join('\n');
  writeFileSync(path.join(dir, manifest), manifestText, 'utf8');
  return dir;
}

test('F13: a manifest advertising a STALE version of itself fails, naming the file', () => {
  const dir = mkActionFixture('1.15.0', 'some-owner/my-plugin@v1.14.0');
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'a stale self-reference must fail');
    const out = (r.stdout ?? '') + (r.stderr ?? '');
    assert.ok(out.includes('action.yml'), 'the failure must name the file to edit');
    assert.ok(out.includes('1.14.0'), 'it must quote what the manifest says');
    assert.ok(out.includes('1.15.0'), 'and what it should say');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('R5: the version needs no leading v here either, as F4 taught the comment parser the same day', () => {
  // Fix-code review, 2026-08-19. The guard required `@vX.Y.Z`, so a manifest advertising `@1.15.0` matched
  // nothing and the guard reported clean - the reports-clean-over-nothing class this very PR fixed in three
  // other places, reintroduced in the fix for one of them.
  const dir = mkActionFixture('1.15.0', 'some-owner/my-plugin@1.14.0');
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'a stale self-reference without a v must still fail');
    assert.ok(((r.stdout ?? '') + (r.stderr ?? '')).includes('1.14.0'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('F13: a manifest advertising its CURRENT version passes', () => {
  const dir = mkActionFixture('1.15.0', 'some-owner/my-plugin@v1.15.0');
  try {
    assert.equal(spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' }).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('F13: action.yaml is checked too, because GitHub accepts both spellings', () => {
  const dir = mkActionFixture('1.15.0', 'some-owner/my-plugin@v1.14.0', { manifest: 'action.yaml' });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'the .yaml spelling must be checked as well');
    assert.ok(((r.stdout ?? '') + (r.stderr ?? '')).includes('action.yaml'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('F13: a reference to a DIFFERENT project is not this guard s business', () => {
  // Requiring somebody else's project to be pinned at OUR version would be nonsense, and inventing a
  // rule a plugin never agreed to is the error this script's spine-claim scope note already names.
  const dir = mkActionFixture('9.9.9', 'product-on-purpose/agent-skills-toolkit@v1.14.0');
  try {
    assert.equal(spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' }).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('F13: EVERY occurrence must agree, not merely the first', () => {
  // The all-occurrences-agree rule this script already applies to counts. A manifest documenting two
  // usages and correcting only one is exactly how the stale line survived a hand fix.
  const dir = mkdtempSync(path.join(tmpdir(), 'askit-action-'));
  try {
    writeFileSync(path.join(dir, 'library.json'), JSON.stringify({ name: 'my-plugin', version: '1.15.0' }), 'utf8');
    writeFileSync(
      path.join(dir, 'README.md'),
      '# T\n\n<img src="https://img.shields.io/badge/version-1.15.0-blue" alt="v">\n\n## Status\n\n- **Version** - `1.15.0`.\n',
      'utf8'
    );
    writeFileSync(
      path.join(dir, 'action.yml'),
      'name: t\n#   uses: o/my-plugin@v1.15.0\n#   uses: o/my-plugin@v1.14.0\n',
      'utf8'
    );
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'a second, stale occurrence must still fail');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// The universal-checks page's stated RANGE (found by the v1.15.0 docs pass)
//
// The page drifted twice. v1.15.0 repaired the TABLE and left the prose saying
// the set ended at U13 while the frontmatter said sixteen - a public page
// contradicting itself about its own subject.
//
// The FIRST version of the guard could not fail: it compared the highest U<n>
// named anywhere, and the table lists every check, so the table saturated it.
// These tests exist because reverting the fix is what revealed that.
// ---------------------------------------------------------------------------

function mkRangeFixture(rangeSentence) {
  const dir = mkdtempSync(path.join(tmpdir(), 'askit-ucrange-'));
  writeFileSync(path.join(dir, 'library.json'), JSON.stringify({ name: 'agent-skills-toolkit', version: '9.9.9' }), 'utf8');
  writeFileSync(
    path.join(dir, "README.md"),
    [
      "# T",
      "",
      '<img src="https://img.shields.io/badge/version-9.9.9-blue" alt="v">',
      "",
      "## Status",
      "",
      "- **Version** - `9.9.9`.",
      "",
    ].join("\n"),
    "utf8"
  );
  mkdirSync(path.join(dir, 'docs', 'reference'), { recursive: true });
  // A full table of rows, exactly as the real page has - this is what defeated the first guard.
  const rows = Array.from({ length: 17 }, (_, i) => `| U${i + 1} | mod | what | sec | no | fix |`);
  writeFileSync(
    path.join(dir, "docs", "reference", "universal-checks.md"),
    ["# Universal", "", rangeSentence, "", ...rows, ""].join("\n"),
    "utf8"
  );
  // The guard under test is scoped to this project by name, so the fixture must be named for it - which
  // also switches ON the spine-claim floor (at least five present-tense pages must state the spine size).
  // Satisfy it, or every fixture here fails for an unrelated reason. Finding this cost a red test twice:
  // the same collision caught the F13 fixture, and it is exactly why name-scoped guards are awkward to
  // test in isolation.
  for (let i = 0; i < 5; i += 1) {
    writeFileSync(path.join(dir, "docs", "reference", `spine-claim-${i}.md`), `The spine is ${SPINE_SIZE} checks.\n`, "utf8");
  }
  return dir;
}

test('the universal-checks page must state a range that matches the registry', () => {
  const dir = mkRangeFixture('The Universal set is `U1-U9` and `U11-U13`.');
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'a stale range must fail even when the table below it is complete');
    assert.match((r.stdout ?? '') + (r.stderr ?? ''), /universal range ending at U13/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a range that matches the registry passes', () => {
  const dir = mkRangeFixture('The Universal set is `U1-U9` and `U11-U18`.');
  try {
    assert.equal(spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' }).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a page that stops stating the range at all is reported, not silently passed', () => {
  // Otherwise the guard is removable by deleting the sentence it reads, which is the
  // reports-clean-over-nothing class this repository keeps finding in its own checks.
  const dir = mkRangeFixture('The Universal set is described in the table below.');
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match((r.stdout ?? '') + (r.stderr ?? ''), /no longer states the universal range/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
