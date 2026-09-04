import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import { pinnedTargets, fetchMembers } from "../../scripts/lib/fetch-members.mjs";
import { main, parseArgs, renderBanner, renderUnmeasurable, withBanner, NARRATIVE_URL } from "../../scripts/gen-family-registry.mjs";
import { TIER_SCOPE_SENTENCE } from "../../scripts/gen-site-reports.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const scratch = () => mkdtempSync(path.join(tmpdir(), "askit-registry-"));

/* ------------------------------------------------------------------------
 * The pins. Grading a branch tip instead of the pinned sha is the defect the
 * 2026-09-01 hand regeneration fixed; it must not be reachable by accident.
 * ---------------------------------------------------------------------- */

test("only entries the catalogue actually PINS are fetched, and the rest are named, not dropped", () => {
  const { targets, unpinned } = pinnedTargets([
    { name: "a", source: { source: "url", url: "https://x/a.git", sha: "deadbeef" }, version: "1.0.0" },
    { name: "b", source: { source: "url", url: "https://x/b.git" } },
    { name: "c", source: {} },
  ]);
  assert.deepEqual(targets.map((t) => t.name), ["a"]);
  // "The catalogue does not pin this member" is a fact about the CATALOGUE. Silently grading such a
  // member at whatever HEAD happened to be is how the page acquired unreproducible numbers before.
  assert.deepEqual(unpinned.map((u) => u.name), ["b", "c"]);
});

test("a member that cannot be fetched degrades ONE row and never throws", () => {
  const dir = scratch();
  const { fetched, failed } = fetchMembers(
    [
      { name: "ok", source: { url: "https://x/ok.git", sha: "1" } },
      { name: "gone", source: { url: "https://x/gone.git", sha: "2" } },
    ],
    dir,
    ({ url }) => (url.includes("gone") ? { ok: false, why: "Repository not found." } : { ok: true }),
  );
  assert.deepEqual(fetched.map((f) => f.name), ["ok"]);
  assert.deepEqual(failed.map((f) => f.name), ["gone"]);
  assert.match(failed[0].why, /not found/);
});

/* ------------------------------------------------------------------------
 * The page states. Every network failure is a page state, never an exit state.
 * ---------------------------------------------------------------------- */

test("an unreachable catalogue writes a DATED could-not-measure page and exits 0", () => {
  // The design constraint stated in RS-D3: somebody else's outage is not a fact about this repository,
  // and a deploy that failed on it would take the whole documentation site down with it. Equally, a page
  // showing the previous deploy's numbers under today's date would be worse than admitting the gap.
  const work = scratch();
  const out = path.join(scratch(), "registry.html");
  const code = main(["--out", out, "--work-dir", work], {
    fetchAtSha: () => ({ ok: false, why: "remote: Repository not found." }),
    today: () => "2026-09-02",
  });
  assert.equal(code, 0, "a third party's outage must not fail the site build");
  assert.ok(existsSync(out), "a page must be written even when nothing could be measured");
  const html = readFileSync(out, "utf8");
  assert.match(html, /could not measure/i);
  assert.match(html, /2026-09-02/, "the attempt must be dated, or it is indistinguishable from a stale page");
  assert.match(html, /Repository not found/, "the reason belongs on the page, not only in a build log");
  assert.ok(!/in sync|FAILS OWN CLAIM/.test(html), "it must not show a table it did not measure");
});

test("the could-not-measure page still carries the tier-scope sentence and the narrative link", () => {
  const html = renderUnmeasurable({ measuredAt: "2026-09-02", why: "timeout" });
  assert.ok(html.includes(TIER_SCOPE_SENTENCE));
  assert.ok(html.includes(NARRATIVE_URL));
});

test("the banner names the catalogue commit, the date, and every member it could not measure", () => {
  const b = renderBanner({
    measuredAt: "2026-09-02",
    catalogueSha: "6539abd",
    failures: [{ name: "gone", why: "Repository not found." }],
  });
  assert.ok(b.includes("2026-09-02"));
  assert.ok(b.includes("6539abd"), "'in sync' means nothing without saying which catalogue commit");
  assert.ok(b.includes("gone") && b.includes("Repository not found."));
  assert.match(b, /not-graded rather than failed/, "an outage is not a verdict about somebody's repository");
});

test("a fully measured run says nothing about members it did not fail to measure", () => {
  const b = renderBanner({ measuredAt: "2026-09-02", catalogueSha: "abc1234", failures: [] });
  assert.ok(!/could not be measured/.test(b), "a clean run must not carry an empty caveat box");
});

/* ------------------------------------------------------------------------
 * AC4: the record the generator must not be able to delete.
 * ---------------------------------------------------------------------- */

test("RS-D3 AC4: the generated page LINKS the narrative rather than replacing it", () => {
  // RS-A3 required the repaired page to name the episode in which it carried a false verdict. One cut
  // later this generator writes the live surface - so unless the note lives somewhere the generator
  // cannot reach, a record written at cut 1 silently disappears at cut 2. It lives on the committed
  // reference page; this asserts the generated page points at it, in both page states.
  for (const html of [
    renderBanner({ measuredAt: "2026-09-02", catalogueSha: "a", failures: [] }),
    renderUnmeasurable({ measuredAt: "2026-09-02", why: "x" }),
  ]) {
    assert.ok(html.includes(NARRATIVE_URL), "the measurement must name where its meaning lives");
  }
});

test("RS-D3 AC4: the committed narrative still carries the episode the generator cannot write", () => {
  const md = readFileSync(path.join(REPO, "docs/reference/family-registry.md"), "utf8");
  assert.match(md, /2026-08-15/, "the episode's date must survive");
  assert.match(md, /What is stale is the registry PIN/, "and the correction it records");
});

/* ------------------------------------------------------------------------
 * Mechanics.
 * ---------------------------------------------------------------------- */

test("the banner is inserted into the evaluator's page, and PREPENDED rather than dropped if it cannot be", () => {
  const withBody = withBanner("<html><body><h1>table</h1></body></html>", "<b>BANNER</b>");
  assert.ok(withBody.includes("BANNER"));
  assert.ok(withBody.indexOf("BANNER") < withBody.indexOf("table"), "provenance goes above what it describes");
  // A page that silently loses its measurement date is the exact defect this generator exists to end.
  const noBody = withBanner("<h1>table</h1>", "<b>BANNER</b>");
  assert.ok(noBody.includes("BANNER"));
});

test("both --out and --work-dir are required, and an unknown flag is refused", () => {
  assert.ok(parseArgs([]).error);
  assert.ok(parseArgs(["--out", "x"]).error);
  assert.ok(parseArgs(["--out", "x", "--work-dir", "y", "--wat"]).error);
  assert.equal(parseArgs(["--out", "x", "--work-dir", "y"]).out, "x");
});

/* ------------------------------------------------------------------------
 * The wiring.
 * ---------------------------------------------------------------------- */

test("the deploy generates the registry BEFORE the index that links it", () => {
  const doc = parseYaml(readFileSync(path.join(REPO, ".github/workflows/deploy-pages.yml"), "utf8"));
  const steps = doc.jobs.build.steps;
  const idx = (needle) => steps.findIndex((s) => String(s.run ?? "").includes(needle));
  const registry = idx("gen-family-registry.mjs");
  const reports = idx("gen-site-reports.mjs");
  const upload = steps.findIndex((s) => String(s.uses ?? "").includes("upload-pages-artifact"));
  assert.ok(registry !== -1, "nothing generates the registry");
  assert.ok(registry < reports, "the index promises a registry link; the page must exist before the promise");
  assert.ok(reports < upload);
  // The index links the registry ONLY where the registry is actually generated.
  assert.match(String(steps[reports].run), /--with-registry/);
});
