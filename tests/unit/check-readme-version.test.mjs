import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../scripts/check-readme-version.mjs");

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
