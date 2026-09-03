import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import { TIER_SCOPE_SENTENCE, LIMITATIONS_URL, renderIndex, parseArgs } from "../../scripts/gen-site-reports.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const CLI = path.join(REPO, "scripts/gen-site-reports.mjs");

// Grades tier "none" against a DECLARED "convergent" - a genuinely failing grade, which is what the
// publish-the-failing-case test below needs. Fast, unlike grading the repository itself.
const FAILING_FIXTURE = path.join(REPO, "tests/fixtures/golden/chain-string-fixture");

function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const outDir = () => mkdtempSync(path.join(tmpdir(), "askit-reports-"));

/* ------------------------------------------------------------------------
 * RS-D3: the verdict behind the badge gets published, not just the 8 fields.
 * ---------------------------------------------------------------------- */

test("RS-D3: the generator writes all three artifacts and stamps provenance on the JSON", () => {
  const dir = outDir();
  const { code, out } = run([FAILING_FIXTURE, "--out-dir", dir]);
  assert.equal(code, 0, out);

  for (const f of ["tier-report.json", "report.html", "index.html"]) {
    assert.ok(existsSync(path.join(dir, f)), `${f} was not written`);
  }

  const j = JSON.parse(readFileSync(path.join(dir, "tier-report.json"), "utf8"));
  assert.ok(typeof j.tier === "string" && j.tier.length > 0, "the tier must survive into the published JSON");
  // Provenance is ADDED by this generator rather than expected from tier-report.mjs, whose --json output
  // is a consumer-facing contract. Asserted so a later "tidy-up" cannot drop it: a published verdict that
  // does not say WHICH COMMIT it graded is the stale-front-door defect the badge exists to retire.
  assert.match(j.gradedAt, /^\d{4}-\d{2}-\d{2}$/, "the published verdict must say when it was graded");
  assert.ok("sha" in j, "the published verdict must say what it graded");
  assert.ok("standard" in j, "the published verdict must say which Standard it graded against");
});

test("RS-D3: a FAILING grade is still published - that is the grade a reader most needs", () => {
  // The trap this guards. `tier-report.mjs` and `evaluate.mjs` exit NON-ZERO to report a failing grade.
  // A generator that treated a non-zero child exit as its own failure would publish reports only while
  // the repository was green, which is exactly backwards, and it would fail the site build for the
  // ordinary, correct case of a plugin that does not meet its declared tier.
  //
  // This was demonstrated accidentally before it was asserted: mid-change, this repository briefly failed
  // G8 (a new script not yet in its folder README), and the generator published `tier: convergent` rather
  // than refusing or crashing. The fixture makes that repeatable.
  const dir = outDir();
  const { code, out } = run([FAILING_FIXTURE, "--out-dir", dir]);
  assert.equal(code, 0, `a failing GRADE must not be a failing RUN\n${out}`);

  const j = JSON.parse(readFileSync(path.join(dir, "tier-report.json"), "utf8"));
  assert.equal(j.tier, "none", "the fixture is chosen because it fails; if it stopped failing this test proves nothing");
  assert.equal(j.declaredTier, "convergent", "and it fails against a tier it actually declares");

  const html = readFileSync(path.join(dir, "report.html"), "utf8");
  assert.ok(html.length > 1000, "the rendered report must be a real document, not an empty shell");
  assert.match(html, /<html/i);
});

test("RS-D3 / RS-E3: the index carries the tier-scope sentence and links what a tier does not certify", () => {
  const html = renderIndex({ tier: "advanced", sha: "abc1234", gradedAt: "2026-09-02", standard: "0.15", registryAvailable: false });
  assert.ok(html.includes(TIER_SCOPE_SENTENCE), "the concession must travel with the claim");
  assert.ok(html.includes(LIMITATIONS_URL), "and it must link the page that says more");
  assert.ok(html.includes("abc1234"), "the page names the commit it describes");
  assert.ok(html.includes("2026-09-02"), "and the date it was measured");
});

test("RS-E3: the scope sentence is ONE canonical wording, not a paraphrase per surface", () => {
  // The item's whole point: the sentence lives in one place that every surface inherits, so the count of
  // placements stops being load-bearing. Pinned verbatim here - if the wording is ever revised it should
  // be revised deliberately, in one commit, with this assertion updated alongside it.
  assert.equal(
    TIER_SCOPE_SENTENCE,
    "This tier reports structural conformance to a written Standard - deterministic and reproducible; " +
      "it is not a content review, a safety audit, or a statement that the skills work.",
  );
});

test("RS-D3: the index offers the registry only when a registry was actually measured", () => {
  const without = renderIndex({ tier: "advanced", sha: "a", gradedAt: "2026-09-02", standard: null, registryAvailable: false });
  const with_ = renderIndex({ tier: "advanced", sha: "a", gradedAt: "2026-09-02", standard: null, registryAvailable: true });
  assert.ok(!without.includes("registry.html"), "a link to a page this deploy did not write is a 404 with a promise on it");
  assert.ok(with_.includes("registry.html"));
});

test("RS-D3: --out-dir is required, and an unknown flag is refused rather than ignored", () => {
  assert.ok(parseArgs(["."]).error, "writing the artifacts somewhere is the whole job; there is no sensible default");
  assert.ok(parseArgs([".", "--out-dir", "x", "--wat"]).error, "a silently ignored flag is a silently wrong run");
  assert.deepEqual(parseArgs([".", "--out-dir", "x"]), { root: ".", outDir: "x" });
  assert.equal(run(["."]).code, 2, "bad arguments exit 2, distinct from the 1 that means it could not write");
});

/* ------------------------------------------------------------------------
 * The wiring. A generator no workflow calls publishes nothing.
 * ---------------------------------------------------------------------- */

test("RS-D3: the deploy publishes the reports, in the same job and after the build", () => {
  const doc = parseYaml(readFileSync(path.join(REPO, ".github/workflows/deploy-pages.yml"), "utf8"));
  const steps = doc.jobs.build.steps;
  // Matched on the RUN COMMAND, never on the bare script name. The install step's own NAME mentions
  // `gen-tier-badge.mjs`, so a name-substring match finds that step instead and the ordering assertion
  // reads three steps too early - which is exactly how this test first failed against a correct
  // workflow. Same class as E56, where G2 counted a workflow that only mentioned the gate in a string.
  const idx = (needle) => steps.findIndex((s) => String(s.run ?? "").includes(needle));
  const build = idx("npm run build");
  const badge = idx("../scripts/gen-tier-badge.mjs");
  const reports = idx("../scripts/gen-site-reports.mjs");
  const upload = steps.findIndex((s) => String(s.uses ?? "").includes("upload-pages-artifact"));
  assert.ok(reports !== -1, "nothing publishes the reports");
  assert.ok(build < reports, "astro build owns dist/ and would wipe anything written before it");
  assert.ok(reports < upload, "written after the artifact is uploaded is written nowhere");
  // Same job as the badge, so one deploy cannot publish a badge and a report naming different commits.
  assert.ok(badge !== -1 && Math.abs(badge - reports) === 1, "the badge and the reports must be published together");
});

test("RS-D3: a PULL REQUEST exercises the generator, not only the deploy that publishes it", () => {
  // deploy-pages.yml fires on push to main. A generator wired only there is found broken by the deploy
  // that publishes the break - which is the exact shape of both escaped Action defects, where self-CI
  // never ran the path that mattered. build-site runs it on every PR into a throwaway dist/.
  const doc = parseYaml(readFileSync(path.join(REPO, ".github/workflows/ci.yml"), "utf8"));
  const steps = JSON.stringify(doc.jobs["build-site"].steps);
  assert.ok(steps.includes("gen-site-reports.mjs"), "no PR ever runs the generator");
  assert.ok(!steps.includes("upload-pages-artifact"), "the PR job must not be able to publish anything");
});
