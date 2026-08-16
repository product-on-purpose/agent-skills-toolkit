// what-it-is:   coverage for vendor-watch (the claim checker, its exit contract, and its write-incapability)
// what-it-does: drives every cell of the verdict table offline, and fails the build if the watcher ever gains
//               the ability to write a file
// why:          this watcher exists because a vendor claim expired unnoticed and cost a ratified ADR. A watcher
//               that can EDIT the claim it watches, or that reports a clean run when it could not reach the
//               page, would reproduce that failure with more ceremony
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VERDICT,
  FRESHNESS_DAYS,
  normalizeForMatch,
  daysBetween,
  evaluateClaim,
  buildReport,
  exitCodeFor,
  renderReport,
} from "../../scripts/lib/vendor-watch.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLAIMS = path.join(REPO, "docs/internal/vendor-watch/vendor-claims.json");

// Built from char codes rather than written literally: this repository's PreToolUse hook refuses to write
// en/em dashes to disk, and a test fixture is still bytes on disk.
const LDQUO = String.fromCharCode(0x201c);
const RDQUO = String.fromCharCode(0x201d);
const EMDASH = String.fromCharCode(0x2014);

const quote = (over = {}) => ({
  id: "q", kind: "quote", source: "s", claim: "the pinned sentence",
  verifiedOn: "2026-08-15", dependsOn: ["U14"], ...over,
});
const probe = (over = {}) => ({
  id: "p", kind: "probe", source: "s", claim: "an observed behaviour",
  verifiedOn: "2026-08-15", reproduction: "run the probe", ...over,
});

// --- the verdict table -----------------------------------------------------------------------------

test("a quote still on the page HOLDS", () => {
  assert.equal(evaluateClaim(quote(), "prelude. The Pinned Sentence. postlude.", "2026-08-15").verdict, VERDICT.HOLDS);
});

test("a quote no longer on the page is MISSING, and that is the whole point", () => {
  const r = evaluateClaim(quote(), "the page now says something else entirely", "2026-08-15");
  assert.equal(r.verdict, VERDICT.MISSING);
  assert.deepEqual(r.dependsOn, ["U14"], "a missing claim must carry what breaks, or it is merely interesting");
});

test("an UNREACHABLE page is UNCHECKABLE, never HOLDS", () => {
  // A watch that reports a clean run because it could not reach the page is worse than no watch. Same rule
  // as "a killed review run is UNMEASURED, never a result".
  assert.equal(evaluateClaim(quote(), null, "2026-08-15").verdict, VERDICT.UNCHECKABLE);
});

test("a PROBE claim is never confirmed by a fetch, however much page text it is handed", () => {
  // No vendor page states that Claude Code registers every .md under agents/; it was established by running
  // a probe. Reporting HOLDS because a page happens to contain the words would be inventing evidence.
  const r = evaluateClaim(probe(), "an observed behaviour appears verbatim right here", "2026-08-15");
  assert.equal(r.verdict, VERDICT.UNCHECKABLE);
  assert.equal(r.reproduction, "run the probe", "an unconfirmable claim must name how to confirm it");
});

test("freshness: a claim past the window is STALE even while it still holds", () => {
  assert.equal(daysBetween("2026-08-15", "2026-09-14"), 30);
  assert.equal(
    evaluateClaim(quote(), "the pinned sentence", "2026-09-14").verdict,
    VERDICT.HOLDS,
    `${FRESHNESS_DAYS} days is inside the window`
  );
  assert.equal(evaluateClaim(quote(), "the pinned sentence", "2026-09-15").verdict, VERDICT.STALE, "31 days is outside it");
});

test("an unparseable verifiedOn is STALE, not silently fresh", () => {
  assert.equal(daysBetween("not-a-date", "2026-08-15"), null);
  assert.equal(
    evaluateClaim(quote({ verifiedOn: "not-a-date" }), "the pinned sentence", "2026-08-15").verdict,
    VERDICT.STALE
  );
});

// --- matching --------------------------------------------------------------------------------------

test("matching survives what a docs pipeline rewrites, and nothing wider", () => {
  const rewritten = `The ${LDQUO}Pinned${RDQUO} Sentence ${EMDASH} again`;
  assert.ok(normalizeForMatch(rewritten).includes(normalizeForMatch('The "Pinned" Sentence - again')));
  assert.ok(normalizeForMatch("wrapped in `backticks` and **bold**").includes("wrapped in backticks and bold"));
  assert.ok(normalizeForMatch("collapsed    whitespace").includes("collapsed whitespace"));
  // and NOT so wide that a CHANGED MEANING still matches, which is the failure that would actually matter
  assert.ok(
    !normalizeForMatch("hooks are now supported for plugin-shipped agents")
      .includes(normalizeForMatch("hooks are not supported for plugin-shipped agents"))
  );
});

// --- the exit contract -----------------------------------------------------------------------------

const pin = { sources: [{ id: "s", url: "https://x/y" }], claims: [quote(), probe()] };

test("exit 0 only when every quote holds and nothing is stale", () => {
  assert.equal(exitCodeFor(buildReport(pin, { s: "the pinned sentence" }, "2026-08-15")), 0);
});

test("exit 1 when a claim is MISSING, and 1 when one is merely STALE", () => {
  assert.equal(exitCodeFor(buildReport(pin, { s: "gone" }, "2026-08-15")), 1);
  assert.equal(exitCodeFor(buildReport(pin, { s: "the pinned sentence" }, "2026-12-01")), 1);
});

test("exit 2 REFUSES and outranks a clean result: an unfetchable page proves nothing", () => {
  const r = buildReport(pin, { s: null }, "2026-08-15");
  assert.equal(exitCodeFor(r), 2);
  assert.equal(r.summary.holds, 0);
});

test("a probe alone never forces a refusal: it is uncheckable BY NATURE, not by failure", () => {
  const probeOnly = { sources: [{ id: "s", url: "https://x/y" }], claims: [probe()] };
  assert.equal(exitCodeFor(buildReport(probeOnly, { s: "anything" }, "2026-08-15")), 0);
});

// --- the shipped claims document -------------------------------------------------------------------

test("the shipped claims document is well formed, and every claim names what depends on it", () => {
  const d = JSON.parse(readFileSync(CLAIMS, "utf8"));
  assert.equal(d.schema, "askit-vendor-claims/1");
  assert.ok(d.claims.length > 0);
  const sourceIds = new Set(d.sources.map((s) => s.id));
  for (const c of d.claims) {
    assert.ok(["quote", "probe"].includes(c.kind), `${c.id}: kind must be quote or probe`);
    assert.ok(sourceIds.has(c.source), `${c.id}: names an unknown source ${c.source}`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(c.verifiedOn), `${c.id}: verifiedOn must be an ISO date`);
    // The fields that make a failure ACTIONABLE. Without them the report says a sentence moved and leaves
    // the reader to work out whether that matters.
    assert.ok(Array.isArray(c.dependsOn) && c.dependsOn.length > 0, `${c.id}: must name what depends on it`);
    assert.ok(typeof c.onChange === "string" && c.onChange.length > 0, `${c.id}: must say what to do when it fails`);
    if (c.kind === "probe") assert.ok(c.reproduction, `${c.id}: a probe claim must name its reproduction`);
  }
});

test("the claims document covers every vendor citation the gate makes, and shares its exact wording", () => {
  // U14 quotes a vendor sentence in every finding it emits. If that sentence is not watched, the check can
  // go on quoting a page that no longer says it - exactly what happened to ADR 0048's premise.
  const d = JSON.parse(readFileSync(CLAIMS, "utf8"));
  const ids = new Set(d.claims.map((c) => c.id));
  for (const required of ["plugin-agent-unsupported-fields", "agents-dir-registers-every-md"]) {
    assert.ok(ids.has(required), `the gate cites this and nothing watches it: ${required}`);
  }
  const u14 = readFileSync(path.join(REPO, "scripts/lib/vendor-agent-fields.mjs"), "utf8");
  const claim = d.claims.find((c) => c.id === "plugin-agent-unsupported-fields").claim;
  assert.ok(
    normalizeForMatch(u14).includes(normalizeForMatch(claim)),
    "the watched sentence must be the SAME sentence U14 quotes; two copies would let them drift apart"
  );
});

test("renderReport leads with what is wrong, and names the consequence", () => {
  const out = renderReport(buildReport(pin, { s: "gone" }, "2026-08-15"));
  assert.match(out, /depends on: U14/);
  assert.match(out, /asserts something the vendor no longer says/);
});

/* ----------------------------------------------------------------------
 * WRITE-INCAPABILITY. The same guard standards-watch carries, for the same reason: a watcher that can
 * amend the thing it watches turns a governed decision into a silent one. Enforcement, not a promise.
 * ---------------------------------------------------------------------- */
const WRITE_APIS = [
  "writeFileSync", "writeFile", "appendFileSync", "appendFile", "mkdirSync", "mkdir",
  "rmSync", "rm", "rmdirSync", "rmdir", "unlinkSync", "unlink", "renameSync", "rename",
  "copyFileSync", "copyFile", "cpSync", "createWriteStream", "truncateSync", "truncate",
  "writeSync", "openSync", "mkdtempSync", "symlinkSync", "linkSync", "chmodSync", "utimesSync",
];

for (const rel of ["scripts/lib/vendor-watch.mjs", "scripts/vendor-watch.mjs"]) {
  test(`${rel} references no filesystem write API (the watcher proposes, it never amends)`, () => {
    const src = readFileSync(path.join(REPO, rel), "utf8");
    const hits = WRITE_APIS.filter((api) => new RegExp(`\\b${api}\\s*\\(`).test(src));
    assert.deepEqual(hits, [], `${rel} would be able to write: ${hits.join(", ")}. Emit to stdout and let a human save it.`);
  });
}
