import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { buildBadgePayload, resolveGradedSha } from "../../scripts/gen-tier-badge.mjs";
import { mkdirSync } from "node:fs";

// Proves workstream 3 of v1.11.0 ("reach"): a CI-generated, sha-pinned tier badge. The generator is a
// pure serialization of computeTierReport()'s already-computed tier (scripts/tier-report.mjs) plus
// three facts the caller supplies (sha, Standard pin, date) - no new grading decision is made here.
// See the module docblock in scripts/gen-tier-badge.mjs for the shields.io endpoint-badge contract.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "gen-tier-badge.mjs");
const SILVER_FIXTURE = path.join(ROOT, "tests", "fixtures", "golden", "silver-fixture");

// --- buildBadgePayload: the pure function, every input pinned ---

test("buildBadgePayload emits a valid shields.io endpoint-badge shape (schemaVersion 1, label, message, color)", () => {
  const p = buildBadgePayload({ tier: "advanced", standard: "0.12", sha: "ad507e2", gradedAt: "2026-08-11" });
  assert.equal(p.schemaVersion, 1);
  assert.equal(p.label, "tier");
  assert.equal(typeof p.message, "string");
  assert.equal(typeof p.color, "string");
});

test("buildBadgePayload's message names the tier, the sha, the Standard pin, and the date", () => {
  const p = buildBadgePayload({ tier: "advanced", standard: "0.12", sha: "ad507e2", gradedAt: "2026-08-11" });
  assert.match(p.message, /Gold/);
  assert.match(p.message, /ad507e2/);
  assert.match(p.message, /0\.12/);
  assert.match(p.message, /2026-08-11/);
});

test("buildBadgePayload carries the same four facts as top-level fields too, for a consumer reading the JSON directly rather than through shields.io", () => {
  const p = buildBadgePayload({ tier: "advanced", standard: "0.12", sha: "ad507e2", gradedAt: "2026-08-11" });
  assert.equal(p.tier, "advanced");
  assert.equal(p.sha, "ad507e2");
  assert.equal(p.standard, "0.12");
  assert.equal(p.gradedAt, "2026-08-11");
});

test("buildBadgePayload picks a distinct color per tier (gold/silver/bronze/none all differ)", () => {
  const colors = ["advanced", "convergent", "universal", "none"].map(
    (tier) => buildBadgePayload({ tier, standard: "0.12", sha: "abc1234", gradedAt: "2026-08-11" }).color
  );
  assert.equal(new Set(colors).size, colors.length, "every tier must render a visually distinct color");
});

test("buildBadgePayload handles a null Standard pin (no library.json standard field) without throwing", () => {
  const p = buildBadgePayload({ tier: "universal", standard: null, sha: "abc1234", gradedAt: "2026-08-11" });
  assert.equal(p.standard, null);
  assert.doesNotThrow(() => JSON.stringify(p));
});

test("buildBadgePayload reads tier \"none\" (nothing satisfied) as a real, unsoftened claim, not a fabricated grade", () => {
  const p = buildBadgePayload({ tier: "none", standard: "0.12", sha: "abc1234", gradedAt: "2026-08-11" });
  assert.match(p.message, /none/i);
});

// --- resolveGradedSha: environment first, git fallback, never throws ---

test("resolveGradedSha prefers GITHUB_SHA (short-formed to 7 chars) over a git subprocess", () => {
  const sha = resolveGradedSha(ROOT, { GITHUB_SHA: "ad507e2abcdef1234567890abcdef1234567890" });
  assert.equal(sha, "ad507e2");
});

test("resolveGradedSha falls back to `git rev-parse` when GITHUB_SHA is not set", () => {
  const sha = resolveGradedSha(ROOT, {});
  assert.match(sha, /^[0-9a-f]{7,40}$|^unknown$/, "must be a short hex sha or the explicit unknown fallback");
});

// --- CLI: real output for this repository, and the required broken-input demonstration ---

test("CLI gen-tier-badge.mjs prints a parseable JSON payload for this repository's own root", () => {
  const stdout = execFileSync(process.execPath, [SCRIPT, ROOT], { encoding: "utf8" });
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.label, "tier");
  assert.ok(parsed.sha, "must carry a graded sha");
  assert.ok(parsed.gradedAt, "must carry a graded date");
});

test("CLI gen-tier-badge.mjs --out writes the payload to a file instead of stdout", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-badge-out-"));
  try {
    const outFile = path.join(dir, "tier.json");
    execFileSync(process.execPath, [SCRIPT, ROOT, "--out", outFile], { encoding: "utf8" });
    const parsed = JSON.parse(readFileSync(outFile, "utf8"));
    assert.equal(parsed.schemaVersion, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// deploy-pages.yml writes into site/dist/badges/tier.json, a subdirectory `astro build` does not
// create on its own - the generator must make the parent directory itself rather than assume it
// exists, the same way this repository's other generators (gen-index.mjs, gen-manifest.mjs) do.
test("CLI gen-tier-badge.mjs --out creates a non-existent parent directory rather than failing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-badge-nested-"));
  try {
    const outFile = path.join(dir, "dist", "badges", "tier.json");
    execFileSync(process.execPath, [SCRIPT, ROOT, "--out", outFile], { encoding: "utf8" });
    const parsed = JSON.parse(readFileSync(outFile, "utf8"));
    assert.equal(parsed.schemaVersion, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The required "proof it is live" demonstration (W3 acceptance: "the badge reflects a real graded
// sha, and a deliberately-broken fixture changes it"). Copies the Silver-shaped golden fixture, runs
// the generator to get the baseline (Silver/convergent), then deliberately removes `agent-targets`
// (S1: REQUIRED at Convergent+) and re-runs it, proving the earned tier - and therefore the badge's
// message and color - actually moves in response to a real change on disk, not just in theory.
test("CLI gen-tier-badge.mjs: a deliberately-broken fixture changes the badge's tier, message, and color (the required live-proof demonstration)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-badge-demo-"));
  try {
    cpSync(SILVER_FIXTURE, dir, { recursive: true });
    const libPath = path.join(dir, "library.json");
    const before = JSON.parse(execFileSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" }));
    assert.equal(before.tier, "convergent", "the unmodified Silver fixture must earn convergent (Silver)");

    // Deliberately break it: remove the S1-required agent-targets field.
    const lib = JSON.parse(readFileSync(libPath, "utf8"));
    delete lib["agent-targets"];
    writeFileSync(libPath, JSON.stringify(lib, null, 2), "utf8");

    const after = JSON.parse(execFileSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" }));
    assert.equal(after.tier, "universal", "removing agent-targets must drop the earned tier to universal (Bronze)");
    assert.notEqual(after.message, before.message, "the badge message must visibly change");
    assert.notEqual(after.color, before.color, "the badge color must visibly change");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- the badge is a PUBLISHED verdict, and its subject must not be able to raise it ---

test("a subject cannot raise its own public tier badge", () => {
  // This is the single most public artifact the project produces: a badge on a README asserting a tier to
  // strangers. The generator called computeTierReport with no findings, which resolves through the
  // SUBJECT'S OWN askit.config.json - so a plugin could suppress a finding about itself and publish a
  // passing badge at a commit whose published-verdict gate fails. ADR 0044 draws exactly that boundary
  // everywhere except, until now, the one output nobody reading it can inspect.
  //
  // The fixture isolates ONE Universal-tier error on purpose. An earlier version of this probe left U13
  // failing beside U6, so suppressing U6 could not move the tier and the check reported "no difference"
  // both before and after the fix - passing for a reason that had nothing to do with the behavior.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-badge-trust-"));
  try {
    mkdirSync(path.join(dir, "skills", "demo"), { recursive: true });
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({
      name: "t", version: "0.1.0",
      description: "A fixture isolating exactly one Universal-tier error, so this test measures what it claims to.",
      standard: "0.13", tier: "universal", prefix: "t",
      components: { skills: [{ name: "demo", path: "skills/demo", version: "0.1.0", description: "A demo skill registered properly so U13 passes." }] },
    }, null, 2));
    writeFileSync(path.join(dir, "AGENTS.md"), "# t\n\nGuidance.\n");
    writeFileSync(path.join(dir, "skills", "demo", "SKILL.md"),
      "---\nname: demo\ndescription: A demo skill carrying a deliberately broken reference link.\n---\n\n# demo\n\nSee [missing](./nope.md).\n");

    const badgeTier = () => JSON.parse(execFileSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" })).tier;

    assert.equal(badgeTier(), "none", "the fixture really does fail on its own, with no config at all");

    // Every subject-owned lever that could plausibly raise a grade.
    for (const [label, cfg] of [
      ["a suppression of its own U6", { suppressions: [{ reqId: "U6", reason: "we accept this" }] }],
      ["turning U6 off outright", { rules: { U6: "off" } }],
      ["reducing U6 to a warning", { rules: { U6: "warn" } }],
      ["selecting a laxer profile", { profile: "plain-plugin" }],
    ]) {
      writeFileSync(path.join(dir, "askit.config.json"), JSON.stringify(cfg, null, 2));
      assert.equal(badgeTier(), "none", `${label} must not raise the published badge`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
