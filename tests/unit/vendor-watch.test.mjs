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

test("freshness is PROBE-ONLY: a probe past the window is STALE and blocks", () => {
  assert.equal(daysBetween("2026-08-15", "2026-09-14"), 30);
  assert.equal(evaluateClaim(probe(), null, "2026-09-14").verdict, VERDICT.UNCHECKABLE, "30 days is inside");
  assert.equal(evaluateClaim(probe(), null, "2026-09-15").verdict, VERDICT.STALE, "31 days is outside it");
  // For a probe, age IS the verification: no fetch can confirm it, so an old one must stop the release.
  const one = { sources: [{ id: "s", url: "x" }], claims: [probe()] };
  assert.equal(exitCodeFor(buildReport(one, { s: "page" }, "2026-09-15")), 1);
});

test("a QUOTE confirmed against the live page today HOLDS, however old its recorded reading is", () => {
  // This replaces a test that asserted the opposite, and the replacement is the fix.
  //
  // Returning STALE here was a release-blocker with a calendar date on it: every quote claim's recorded
  // date would have aged out on 2026-09-14, release-ready treats STALE as exit 1, and from that morning
  // no tag and no publish could be cut - while every run kept proving the sentences were still on the
  // page. The only escape is hand-editing the dates, which is exactly what RELEASE.md forbids. A gate
  // whose sole remedy is the thing the documentation forbids teaches the operator to override it.
  const r = evaluateClaim(quote({ verifiedOn: "2026-06-01" }), "the pinned sentence", "2026-09-20");
  assert.equal(r.verdict, VERDICT.HOLDS, "the watch just confirmed it against the live page");
  assert.equal(r.recordIsOld, true, "and the old human reading must still be VISIBLE, just not blocking");
  assert.match(r.detail, /confirmed against the live page today/);
  assert.match(r.detail, /human last read this page 111 days ago/);
});

test("an old RECORD on a holding quote does not change the exit code", () => {
  const one = { sources: [{ id: "s", url: "x" }], claims: [quote({ verifiedOn: "2026-06-01" })] };
  const rep = buildReport(one, { s: "the pinned sentence" }, "2026-09-20");
  assert.equal(rep.summary.recordsOld, 1, "the fact must be counted");
  assert.equal(rep.summary.stale, 0, "but it is not staleness");
  assert.equal(exitCodeFor(rep), 0, "and it must not block a release the watch just verified");
  assert.match(renderReport(rep), /no human has READ that page in over 30 days/);
});

test("a quote whose sentence is GONE is still MISSING, whatever its dates say", () => {
  // The guard on the fix above: relaxing freshness must not relax the thing that actually matters.
  for (const on of ["2026-06-01", "2026-09-20", "not-a-date"]) {
    const r = evaluateClaim(quote({ verifiedOn: on }), "a page that no longer says it", "2026-09-20");
    assert.equal(r.verdict, VERDICT.MISSING, `verifiedOn ${on} must not rescue a vanished sentence`);
  }
});

test("an unparseable verifiedOn on a PROBE is STALE, not silently fresh", () => {
  assert.equal(daysBetween("not-a-date", "2026-08-15"), null);
  assert.equal(evaluateClaim(probe({ verifiedOn: "not-a-date" }), null, "2026-08-15").verdict, VERDICT.STALE);
  // and on a quote it is a visibly-old RECORD rather than a silent pass
  const q = evaluateClaim(quote({ verifiedOn: "not-a-date" }), "the pinned sentence", "2026-08-15");
  assert.equal(q.verdict, VERDICT.HOLDS);
  assert.equal(q.recordIsOld, true);
  assert.match(q.detail, /unparseable date/);
});

test("FRESHNESS_DAYS is the window both kinds are measured against", () => {
  assert.equal(FRESHNESS_DAYS, 30);
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


// --- wave 1, M1: a run that verified NOTHING must never exit 0 ------------------------------------

test("W1-M1: a probe-only document whose source failed to fetch must NOT exit 0", () => {
  // Found by adversarial review wave 1. Probe claims are excluded from the refusal test (they are
  // uncheckable by nature), which let a report with zero `holds` and a failed fetch report success. The
  // scheduled workflow would then open no issue for a run that verified nothing - the exact
  // "a killed run is a result" failure this watcher exists to prevent, wearing the watcher's own badge.
  const probeOnly = { sources: [{ id: "s", url: "https://x/y" }], claims: [probe()] };
  const r = buildReport(probeOnly, { s: null }, "2026-08-15");
  assert.equal(r.summary.holds, 0);
  assert.notEqual(exitCodeFor(r), 0, "zero verified claims is not success");
});

test("W1-M1: an EMPTY claims document is an error, not a clean run", () => {
  assert.notEqual(exitCodeFor(buildReport({ sources: [], claims: [] }, {}, "2026-08-15")), 0);
});

test("W1-M1: a probe-only document whose source FETCHED FINE still exits 0", () => {
  // The narrow case that must keep working: nothing failed, the probe is simply unconfirmable by fetch.
  const probeOnly = { sources: [{ id: "s", url: "https://x/y" }], claims: [probe()] };
  assert.equal(exitCodeFor(buildReport(probeOnly, { s: "page text" }, "2026-08-15")), 0);
});

/* ----------------------------------------------------------------------
 * wave 2, H3: EVERY PINNED QUOTE MUST BE MEANING-BEARING.
 *
 * The watch matches by substring, so a claim pinned as a bare identifier can never fail. Two shipped that
 * way: `Plugin agents support` and `disable-model-invocation`. A page reading "the disable-model-invocation
 * field was removed in v2.2" still CONTAINS `disable-model-invocation`, so the watch would have reported
 * `holds` for a field that no longer exists - and the watcher's whole value is that it fails when the thing
 * it guards changes.
 *
 * The fix is not "write longer claims and remember to keep doing that". It is a REVERSAL table: for every
 * quote claim, a page text that retains the claim's distinctive tokens and says the OPPOSITE, which the
 * watch must report MISSING. The coverage test below makes the table mandatory, so a fragment cannot be
 * added later without someone failing to write a reversal it survives.
 * ---------------------------------------------------------------------- */

/** id -> a page saying the opposite while keeping the claim's own vocabulary. */
const MEANING_REVERSALS = Object.freeze({
  "plugin-agent-unsupported-fields":
    "As of v2.3, hooks, mcpServers, and permissionMode are supported for plugin-shipped agents.",
  "plugin-agent-supported-fields":
    "Plugin agents support name and description frontmatter fields; every other field was removed.",
  "commands-merged-into-skills":
    "Custom commands have been split back out of skills and are a separate component type again.",
  // The strongest shape a reversal can take: identical vocabulary, inverted polarity. Written this way
  // after the honesty test below rejected a first attempt ("the field was removed") that shared only two
  // content words with the claim and so demonstrated vocabulary drift rather than meaning drift.
  "invocation-control-frontmatter":
    "Add disable-model-invocation: true to allow Claude to keep triggering it automatically.",
  "agents-scanned-recursively":
    "Plugin agents/ directories are no longer scanned recursively; only top-level files are registered.",
  "agent-filename-colon-excluded":
    "Claude Code loads a file whose name contains one and logs a warning to the debug log.",
});

test("W2-H3: every quote claim has a reversal recorded, so no fragment can be added unnoticed", () => {
  const d = JSON.parse(readFileSync(CLAIMS, "utf8"));
  const quotes = d.claims.filter((c) => c.kind === "quote").map((c) => c.id);
  for (const id of quotes) {
    assert.ok(
      MEANING_REVERSALS[id],
      `${id} has no meaning-reversal case. Write a page text that keeps this claim's words and reverses ` +
        `its meaning, and confirm the watch reports it MISSING. A claim nobody can show failing is not a check.`
    );
  }
  // and the table must not accumulate entries for claims that no longer exist
  for (const id of Object.keys(MEANING_REVERSALS)) {
    assert.ok(quotes.includes(id), `MEANING_REVERSALS names ${id}, which is not a quote claim in the pin`);
  }
});

test("W2-H3: every shipped quote claim FAILS against a page that reverses it", () => {
  const d = JSON.parse(readFileSync(CLAIMS, "utf8"));
  for (const c of d.claims.filter((x) => x.kind === "quote")) {
    const reversed = MEANING_REVERSALS[c.id];
    const r = evaluateClaim(c, reversed, c.verifiedOn);
    assert.equal(
      r.verdict,
      VERDICT.MISSING,
      `${c.id} still "holds" against a page that says the opposite. Its pinned text is a fragment the ` +
        `reversal happens to contain; pin the whole sentence.`
    );
    // and the report built from it must actually make a human look
    const one = { sources: [{ id: c.source, url: "https://x/y" }], claims: [c] };
    assert.equal(exitCodeFor(buildReport(one, { [c.source]: reversed }, c.verifiedOn)), 1);
  }
});

test("W2-H3: every shipped quote claim is a SENTENCE, not an identifier or a noun phrase", () => {
  // A cheap structural backstop under the reversal table. The table proves each claim is meaning-bearing;
  // this catches the shape at a glance, and gives a new claim's author the rule before they hit the table.
  const d = JSON.parse(readFileSync(CLAIMS, "utf8"));
  for (const c of d.claims.filter((x) => x.kind === "quote")) {
    const words = c.claim.trim().split(/\s+/).length;
    assert.ok(words >= 6, `${c.id}: a quote claim must be a full sentence; "${c.claim}" is ${words} word(s)`);
  }
});

test("W2-H4: the scheduled watcher deduplicates on something that exists", () => {
  // The workflow claimed to "reuse the open issue so a monthly cadence does not accumulate duplicates",
  // and implemented that by filtering open issues on the label `vendor-watch` - which had never been
  // provisioned on this repository. A label filter naming a nonexistent label matches nothing, so every
  // month would have opened a fresh issue. The comment described the intent; nothing implemented it.
  const wf = readFileSync(path.join(REPO, ".github/workflows/vendor-watch.yml"), "utf8");
  assert.match(wf, /askit:vendor-watch/, "the dedup marker must be written into the issue body");
  assert.doesNotMatch(
    wf,
    /listForRepo,?\s*\{[^}]*labels:/,
    "dedup must not depend on a label: the label can be absent, renamed, or stripped during triage"
  );
  // and two runs must not be able to race the lookup
  assert.match(wf, /^concurrency:/m, "a manual dispatch during the scheduled run would double-open");
});

test("W2: the prose describing the pin counts what the pin actually holds", () => {
  // Review wave 2, records drift. CHANGELOG.md and STATUS.md both said the pin holds "six claims across two
  // vendor pages" while it held eight across three, because the sentence was written when it was true and
  // the pin grew twice afterwards. Every other number this repository publishes is generated or checked;
  // this one was prose, so it rotted in the release notes a consumer reads FIRST.
  const d = JSON.parse(readFileSync(CLAIMS, "utf8"));
  const WORD = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const expected = { claims: d.claims.length, sources: d.sources.length };
  const RE = /pins (\w+) claims[^.]*? across (\w+) vendor pages/g;
  for (const rel of ["CHANGELOG.md", "docs/internal/STATUS.md"]) {
    const text = readFileSync(path.join(REPO, rel), "utf8");
    let saw = 0;
    for (const m of text.matchAll(RE)) {
      saw += 1;
      const num = (w) => (WORD.includes(w) ? WORD.indexOf(w) : Number(w));
      assert.equal(num(m[1]), expected.claims, `${rel}: says "${m[1]}" claims; the pin holds ${expected.claims}`);
      assert.equal(num(m[2]), expected.sources, `${rel}: says "${m[2]}" pages; the pin names ${expected.sources}`);
    }
    assert.ok(saw > 0, `${rel}: the sentence this guard is anchored to is gone; update the guard, do not drop it`);
  }
});

test("W2-H3: the reversal cases are honest - each really does retain the claim's own vocabulary", () => {
  // Guards the TEST, not the code. A reversal that shares no words with its claim would pass trivially and
  // prove nothing, which is how three mutation proofs in this release proved nothing before being caught.
  const d = JSON.parse(readFileSync(CLAIMS, "utf8"));
  const words = (s) => new Set(normalizeForMatch(s).split(/[^a-z0-9-]+/).filter((w) => w.length > 3));
  for (const c of d.claims.filter((x) => x.kind === "quote")) {
    const shared = [...words(c.claim)].filter((w) => words(MEANING_REVERSALS[c.id]).has(w));
    assert.ok(
      shared.length >= 3,
      `${c.id}: its reversal shares only ${shared.length} content word(s) with the claim, so it does not ` +
        `demonstrate that the claim discriminates by MEANING rather than by vocabulary`
    );
  }
});

