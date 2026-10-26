import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  AdvisoryScoreError, OUTCOME, loadKey, testRule, matchTextOf, classifyText, classifyFinding,
  extractFindings, scoreAdvisory, formatScoreReport,
} from "../../scripts/lib/advisory-score.mjs";

// F3 R-AQ-2, the precision/recall harness. It scores an ALREADY-WRITTEN advisory result file against
// the seeded-defect key. Four properties are load-bearing and each is asserted below:
//
//   1. The precedence rule. confabulation only -> CONFABULATION; correct only -> true positive; BOTH ->
//      REVIEW_REQUIRED (never guessed); neither -> PARTIAL.
//   2. The rule the whole measurement rests on (reading 17). A confabulation is appended to the false
//      positives AND leaves its entry unsatisfied, so it is also a miss. Never a true positive. The
//      headline: a run made only of confabulations scores precision 0.00 AND recall 0.00, while an
//      honest hedge costs recall only. Silence must be cheaper than invention.
//   3. It dispatches no model. Scoring is a synchronous pure function over two JSON files; the module's
//      whole import graph is node:fs, node:path and node:url, it has no dynamic import, and no network
//      or subprocess surface is reachable from it.
//   4. Reproducibility. The same result against the same key yields the identical partition and the
//      identical pair, every time.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KEY_PATH = path.join(ROOT, "tests/fixtures/seeded-defect-keys/privacy-notice-toolkit.key.1.1.0.json");
const RUNS = path.join(ROOT, "tests/fixtures/anti/seeded-defects/simulated-runs");
const STRONG = path.join(RUNS, "strong-frontier.advisory.json");
const CHEAP = path.join(RUNS, "reading-17-cheap.advisory.json");
const MODULE = path.join(ROOT, "scripts/lib/advisory-score.mjs");
// E13's real recorded runs (byte-frozen, batch 2026-08-04), the fixtures RS-B1 criteria 2-3 are
// measured against. Each is the real triple's advisory at effort high, moved out of `_local/` so a
// clean checkout can re-score them (ADR 0065, Implementation sites: "Regression fixtures").
const RECORDED = path.join(ROOT, "tests/fixtures/anti/seeded-defects/recorded-runs/2026-08-04");
const HAIKU_RUN = path.join(RECORDED, "haiku-high-advisory.json");
const SONNET_RUN = path.join(RECORDED, "sonnet-high-advisory.json");
const OPUS_RUN = path.join(RECORDED, "opus-high-advisory.json");

const key = loadKey(KEY_PATH);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** An advisory in the dispatch-reviewer shape from a list of finding objects. */
const advisoryOf = (findings, over = {}) => ({
  review: { model: "TEST", effort: "high", date: "2026-07-26", findings, ...over },
  insights: ["an insight is not a finding and is never scored"],
});
const f = (file, message, over = {}) => ({ area: "test", severity: "major", file, message, provenance: "verified", ...over });

const LAWS = "skills/privacy-notice-review/references/us-state-laws.md";

// ---------------------------------------------------------------------------
// 1. The four precedence outcomes, one test each (SD-05, the cleanest auto entry)
// ---------------------------------------------------------------------------

test("precedence: correct without confabulation is a true positive", () => {
  const got = classifyText(key, `${LAWS}\nThe Colorado row names a statute that does not exist. Colorado's law is the Colorado Privacy Act, SB 21-190.`);
  assert.equal(got.outcome, OUTCOME.TP);
  assert.equal(got.entryId, "SD-05");
});

test("precedence: confabulation without correct is a CONFABULATION, never a true positive", () => {
  const got = classifyText(key, `${LAWS}\nThe Colorado citation should be VCDPA. Minor.`);
  assert.equal(got.outcome, OUTCOME.CONFABULATION);
  assert.equal(got.entryId, "SD-05");
  assert.notEqual(got.outcome, OUTCOME.TP);
});

test("precedence: correct AND confabulation together is REVIEW_REQUIRED, never guessed", () => {
  const got = classifyText(key, `${LAWS}\nCCDPA does not exist. The statute is the Colorado Privacy Act (CPA); the name in the table looks like a blend of Virginia's VCDPA and California's CCPA, and it should be replaced with the CCPA-style short form used in the other rows.`);
  assert.equal(got.outcome, OUTCOME.REVIEW_REQUIRED);
  assert.equal(got.entryId, "SD-05");
});

test("precedence: neither is a PARTIAL, the honest unverified engagement", () => {
  const got = classifyText(key, `${LAWS}\nI could not verify the CCDPA citation in the Colorado row against a primary source. Flagging it unverified rather than guessing a replacement.`);
  assert.equal(got.outcome, OUTCOME.PARTIAL);
  assert.equal(got.entryId, "SD-05");
});

// ---------------------------------------------------------------------------
// 2. The rule the measurement rests on: confabulation is BOTH an FP and a miss
// ---------------------------------------------------------------------------

test("HEADLINE: a confabulation-only run scores precision 0.00 AND recall 0.00", () => {
  const only = [
    f(LAWS, "The Colorado citation should be VCDPA. Minor."),
    f("commands/review-privacy-notice.md", "The two lists are identical, so no action is needed. The seven-point checklist is fine."),
    f(".claude-plugin/plugin.json", "The plugin's skills are not registered in any manifest, so they are invisible to installers; notice-reviewer is affected too."),
    f("README.md", "The signed PDF is generated by the hook that runs after the review closes; document the SMTP settings the email step needs."),
  ];
  const s = scoreAdvisory(advisoryOf(only), key);
  assert.equal(s.counts.confabulations, 4);
  assert.equal(s.counts.truePositives, 0);
  assert.equal(s.counts.falsePositives, 4, "every confabulation is a false positive");
  assert.equal(s.counts.misses, key.defects.length, "and every entry it engaged is STILL a miss");
  assert.equal(s.precision, 0, "precision over a confabulation-only run is zero");
  assert.equal(s.recall, 0, "recall over a confabulation-only run is zero");
  // The second penalty, stated directly: each engaged entry is named in BOTH the false positives and
  // the miss list.
  for (const id of ["SD-05", "SD-07", "SD-02", "SD-08"]) {
    assert.ok(s.misses.includes(id), `${id} must still be a miss after a confabulation`);
    assert.ok(!s.satisfied.includes(id), `${id} must NOT be satisfied by a confabulation`);
  }
});

test("an honest hedge costs recall and costs no precision: silence is cheaper than invention", () => {
  const hedges = [
    f(LAWS, "I could not verify the CCDPA citation in the Colorado row against a primary source. Flagging it unverified."),
    f("skills/consent-log-audit/SKILL.md", "The expires_at arithmetic in step 3 is worth a second look; I could not verify it against the schema."),
    f("README.md", "The PDF and email claim in the README is worth checking against what the skills actually do."),
  ];
  const s = scoreAdvisory(advisoryOf(hedges), key);
  assert.equal(s.counts.partials, 3);
  assert.equal(s.counts.falsePositives, 0, "a hedge asserts nothing that could be wrong");
  assert.equal(s.counts.truePositives, 0);
  assert.equal(s.recall, 0, "a hedge still costs recall: the entry stays unsatisfied");
  assert.equal(s.precision, null, "precision over zero scored claims is undefined, not 0.00 and not 1.00");
  // The asymmetry the key encodes, stated as a comparison: the same four engagements confabulated
  // score a WORSE partition than hedged, never a better one.
  const confabulated = scoreAdvisory(advisoryOf([
    f(LAWS, "The Colorado citation should be VCDPA."),
    f("skills/consent-log-audit/SKILL.md", "The audit correctly uses renewed_at for the retention window; the only gap is the summary."),
    f("README.md", "The signed PDF is generated by the hook that runs after the review closes."),
  ]), key);
  assert.equal(confabulated.recall, s.recall, "both cost the same recall");
  assert.ok(confabulated.counts.falsePositives > s.counts.falsePositives, "only invention costs precision");
});

test("a bait claim is an unambiguous false positive", () => {
  const s = scoreAdvisory(advisoryOf([
    f(LAWS, "The universal opt-out mechanism requirement looks invented; no statute imposes it."),
    f(LAWS, "The response deadline is wrong: it should be 30 days, not 45."),
    f("commands/audit-consent-log.md", "audit-consent-log is missing from the manifest, so it will not install for users."),
  ]), key);
  assert.equal(s.counts.baitHits, 3);
  assert.equal(s.counts.falsePositives, 3);
  assert.equal(s.precision, 0);
  assert.deepEqual(s.findings.map((x) => x.entryId), ["NB-01", "NB-02", "NB-03"]);
});

test("an out-of-scope finding is excluded from both formulas and reported as noise", () => {
  const s = scoreAdvisory(advisoryOf([
    f(LAWS, "The Colorado row names a statute that does not exist. Colorado's law is the Colorado Privacy Act, SB 21-190."),
    f("README.md", "The plugin has no library.json and no AGENTS.md; adopt the house scaffolding."),
    f("README.md", "The disclosure that this is a fixture should be nearer the top."),
  ]), key);
  assert.equal(s.counts.outOfScope, 2);
  assert.equal(s.counts.truePositives, 1);
  assert.equal(s.counts.falsePositives, 0, "an out-of-scope finding is not a false claim");
  assert.equal(s.precision, 1, "out-of-scope items are excluded from precision");
  assert.equal(s.noiseShare, 2 / 3);
});

test("a finding that engages nothing at all counts as a false positive, flagged provisional", () => {
  const s = scoreAdvisory(advisoryOf([
    f("skills/data-request-router/SKILL.md", "The skill never says what to do when the requester's state of residence cannot be determined."),
  ]), key);
  assert.equal(s.counts.noMatch, 1);
  assert.equal(s.counts.falsePositives, 1);
  assert.equal(s.precision, 0);
  assert.ok(s.findings[0].provisional, "a no-match FP is provisional until adjudication step 3");
});

test("a second finding on an already-satisfied entry collapses as a duplicate", () => {
  const tp = `${LAWS}\nThe Colorado row names a statute that does not exist. Colorado's law is the Colorado Privacy Act, SB 21-190.`;
  const s = scoreAdvisory(advisoryOf([f(LAWS, tp), f(LAWS, `${tp} Repeating it here for the summary table.`)]), key);
  assert.equal(s.counts.truePositives, 1, "restating a real defect is thoroughness, not a second catch");
  assert.equal(s.counts.duplicates, 1);
  assert.equal(s.counts.falsePositives, 0, "and not noise either");
  assert.equal(s.precision, 1);
});

test("a confabulation on an entry a later finding catches is still a false positive", () => {
  // The confabulation is not a satisfying finding, so it is not collapsed as a duplicate: it keeps
  // its precision penalty even when the run also gets the entry right.
  const s = scoreAdvisory(advisoryOf([
    f(LAWS, "The Colorado citation should be VCDPA."),
    f(LAWS, "The Colorado row names a statute that does not exist. Colorado's law is the Colorado Privacy Act, SB 21-190."),
  ]), key);
  assert.equal(s.counts.truePositives, 1);
  assert.equal(s.counts.falsePositives, 1);
  assert.equal(s.precision, 0.5);
  assert.ok(!s.misses.includes("SD-05"), "the later catch does satisfy the entry");
});

test("a semantic entry is never auto-credited: it goes to the adjudication worklist", () => {
  const s = scoreAdvisory(advisoryOf([
    f(LAWS, "The Direction of consent section has the two regimes reversed: the GDPR requires prior opt-in consent for direct marketing email, while Colorado and Virginia give an opt-out right for targeted advertising."),
  ]), key);
  assert.equal(s.counts.reviewRequired, 1);
  assert.equal(s.counts.truePositives, 0);
  assert.equal(s.counts.falsePositives, 0);
  assert.equal(s.worklist.length, 1);
  assert.equal(s.worklist[0].entryId, "SD-06");
  assert.ok(s.provisional, "a cell with anything awaiting adjudication is provisional, never final");
});

test("a semantic worklist item carries the two hint sets and the files to adjudicate against", () => {
  // The key: "Every locate hit is emitted as a REVIEW_REQUIRED worklist item with the two hint sets
  // attached", and adjudication step 2 resolves it "against the fixture file named in the entry's
  // locations". Both are the worklist's job, so both are on the item.
  const s = scoreAdvisory(advisoryOf([
    f(LAWS, "The Direction of consent section has the two regimes reversed: the GDPR requires prior opt-in consent for direct marketing email, while Colorado and Virginia give an opt-out right for targeted advertising."),
  ]), key);
  const item = s.worklist[0];
  assert.deepEqual(item.locations, [LAWS], "both of SD-06's anchors live in one file, listed once");
  assert.match(item.hints.tpCriterion, /state at least one direction correctly/);
  assert.match(item.hints.confabulationCriterion, /names a wrong rule as the fix/);
  assert.ok(item.hints.correct.length > 0 && item.hints.confabulation.length > 0, "both hint sets are attached");
});

test("a worklist item for an auto entry carries its locations but no semantic hints", () => {
  const s = scoreAdvisory(advisoryOf([
    f(LAWS, "CCDPA does not exist. The statute is the Colorado Privacy Act (CPA); it should be replaced with the CCPA-style short form used in the other rows."),
  ]), key);
  assert.equal(s.worklist[0].entryId, "SD-05");
  assert.deepEqual(s.worklist[0].locations, [LAWS]);
  assert.equal(s.worklist[0].hints, null, "an auto entry resolves against the key's own patterns, not a hint set");
});

// ---------------------------------------------------------------------------
// 3. The two simulated runs reproduce the documented numbers
// ---------------------------------------------------------------------------

// COUPLING NOTE (E13, key 1.1.0): the recall, ceiling and miss-list assertions below are functions
// of the KEY's contents, not of the scorer. Adjudication step 4 says promoting a verified unplanted
// defect bumps keyVersion and makes earlier scores non-comparable, so a key bump legitimately moves
// these numbers and these tests must be re-derived rather than "fixed". The scorer claims that must
// hold at ANY key version are the precision figures, the confabulation and bait partitions, and the
// false-verified rate. Filed as a backlog item: pin these to a frozen key so a key bump stops
// breaking scorer unit tests.
test("the strong simulated run scores precision 1.00, recall 0.62 against key 1.1.0, PROVISIONAL", () => {
  const s = scoreAdvisory(readJson(STRONG), key);
  assert.equal(s.counts.truePositives, 8);
  assert.equal(s.counts.falsePositives, 0);
  assert.equal(s.counts.reviewRequired, 1);
  assert.equal(s.counts.outOfScope, 1);
  assert.equal(s.counts.misses, 5);
  assert.deepEqual(
    s.misses,
    ["SD-06", "SD-10", "SD-11", "SD-12", "SD-13"],
    "SD-06 is the semantic entry an auto score can never credit; SD-10 through SD-13 were promoted from the E13 triple AFTER this simulated run was authored, so it does not address them"
  );
  assert.equal(s.precision.toFixed(2), "1.00");
  assert.equal(s.recall.toFixed(2), "0.62");
  assert.equal(s.recallAutoCeiling.toFixed(2), "0.92", "12 of 13 is the auto ceiling: one semantic entry, never creditable");
  assert.ok(s.provisional);
  assert.equal(s.falseVerifiedRate, 0, "nothing it marked verified was wrong");
});

test("the reading-17 cheap simulated run scores precision 0.00 and recall 0.00", () => {
  const s = scoreAdvisory(readJson(CHEAP), key);
  assert.equal(s.counts.truePositives, 0);
  assert.equal(s.counts.confabulations, 4);
  assert.equal(s.counts.baitHits, 1);
  assert.equal(s.counts.falsePositives, 5);
  assert.equal(s.counts.misses, key.defects.length, "it caught nothing, so every planted entry is a miss whatever the key holds");
  assert.equal(s.precision.toFixed(2), "0.00");
  assert.equal(s.recall.toFixed(2), "0.00");
  assert.equal(s.falseVerifiedRate, 1, "every finding it certified as verified was wrong");
});

test("the two recall formulas agree on every scored run, which is the duplicate rule's proof", () => {
  for (const file of [STRONG, CHEAP, HAIKU_RUN, SONNET_RUN, OPUS_RUN]) {
    const s = scoreAdvisory(readJson(file), key);
    assert.equal(
      s.recall,
      s.recallByMisses,
      `${path.basename(file)}: satisfied/defects.length and satisfied/(satisfied+misses) must agree`,
    );
    assert.ok(s.recallAgrees);
  }
});

// ---------------------------------------------------------------------------
// 4. Reproducibility
// ---------------------------------------------------------------------------

test("scoring the same result against the same key twice yields the identical partition and pair", () => {
  const a = scoreAdvisory(readJson(STRONG), loadKey(KEY_PATH));
  const b = scoreAdvisory(readJson(STRONG), loadKey(KEY_PATH));
  assert.deepEqual(a, b, "the whole score object is reproducible, not just the numbers");
  assert.equal(JSON.stringify(a), JSON.stringify(b), "and byte-identical when serialized");
  assert.equal(formatScoreReport(a), formatScoreReport(b));
  // Nothing time-, path- or environment-dependent leaked into the object.
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(JSON.stringify(a)), "no timestamp in the score object");
});

test("the partition is order-stable: findings are scored in the order the advisory lists them", () => {
  const s = scoreAdvisory(readJson(CHEAP), key);
  assert.deepEqual(s.findings.map((x) => x.index), [0, 1, 2, 3, 4]);
  assert.deepEqual(s.findings.map((x) => x.entryId), ["SD-05", "SD-07", "SD-02", "SD-08", "NB-02"]);
});

// ---------------------------------------------------------------------------
// 5. It dispatches no model
// ---------------------------------------------------------------------------

test("the harness dispatches no model: its whole import graph is node:fs, node:path and node:url", () => {
  const src = readFileSync(MODULE, "utf8");
  const allowed = new Set(["node:fs", "node:path", "node:url"]);
  const specifiers = [...src.matchAll(/^\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, "the module does import something, so the scan is not vacuous");
  for (const spec of specifiers) {
    assert.ok(allowed.has(spec), `advisory-score.mjs imports ${spec}; only ${[...allowed].join(", ")} are allowed`);
  }
  // No dynamic escape hatch, so the static list above IS the whole graph.
  assert.ok(!/\bimport\s*\(/.test(src), "no dynamic import");
  assert.ok(!/\brequire\s*\(/.test(src), "no require");
  // No dispatch surface of any kind.
  for (const forbidden of [
    /child_process/, /worker_threads/, /node:https?/, /node:net\b/, /node:dns\b/, /node:dgram\b/,
    /\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /\bspawn(?:Sync)?\s*\(/, /\bexec(?:File|Sync|FileSync)?\s*\(/,
  ]) {
    assert.ok(!forbidden.test(src), `advisory-score.mjs must not contain ${forbidden}`);
  }
  // And it touches no check module (contract fidelity): the checks live one directory over.
  assert.ok(!/checks\//.test(src), "the harness imports no check module");
});

test("scoring is a synchronous pure function, so it cannot have awaited a dispatch", () => {
  assert.equal(scoreAdvisory.constructor.name, "Function", "not an AsyncFunction");
  assert.equal(classifyText.constructor.name, "Function");
  const out = scoreAdvisory(readJson(STRONG), key);
  assert.ok(!(out instanceof Promise));
  // Belt and braces at runtime: the one network primitive a module could reach without importing
  // anything is the global fetch. Trip it and score again.
  const realFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = () => { called++; throw new Error("the harness must never dispatch"); };
  try {
    const again = scoreAdvisory(readJson(STRONG), key);
    assert.deepEqual(again, out);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(called, 0, "no network call was attempted");
});

test("the harness touches no check module and no fixture file: it reads the result and the key only", () => {
  // The fixture tree is not consulted at all - a score is a function of two JSON documents. Proven by
  // scoring with the fixture path pointed at a directory that does not exist.
  const bogus = { ...key, fixture: { ...key.fixture, path: "no/such/directory" } };
  const s = scoreAdvisory(readJson(STRONG), bogus);
  assert.equal(s.counts.truePositives, 8);
});

// ---------------------------------------------------------------------------
// 6. matchText discipline and input handling
// ---------------------------------------------------------------------------

test("only the key's declared matchText fields are consulted, so prose cannot buy credit", () => {
  const hidden = advisoryOf([{
    area: "legal content", severity: "major", file: "docs/nothing.md",
    message: "Something in the state law reference is off.",
    notes: "The Colorado row names a statute that does not exist; the law is the Colorado Privacy Act, SB 21-190.",
  }]);
  hidden.insights = ["The Colorado row cites a statute that does not exist. It is the Colorado Privacy Act, SB 21-190."];
  const s = scoreAdvisory(hidden, key);
  assert.equal(s.counts.truePositives, 0, "an unlisted field and the insights array are both out of reach");
  const text = matchTextOf(hidden.review.findings[0], key);
  assert.ok(!text.includes("Colorado Privacy Act"));
  assert.ok(text.includes("state law reference"));
});

test("matchText joins the declared fields with a real newline, so a one-line gap class stays on one line", () => {
  // The key's matchText.join is the JSON string "\\n" (a literal backslash and an n). Every declared
  // example separates the file from the message with a REAL newline, and the key's own gapClasses note
  // is written in terms of lines, so the escape is resolved rather than taken literally.
  const text = matchTextOf({ area: "a", file: "b.md", message: "c" }, key);
  assert.equal(text, "a\nb.md\nc");
  assert.ok(!text.includes("\\n"), "the separator is a newline, not a backslash and an n");
});

test("non-string fields are dropped from matchText rather than stringified", () => {
  const text = matchTextOf({ area: "a", file: null, message: "c", severity: 3, title: ["x"] }, key);
  assert.equal(text, "a\nc");
});

test("the findings array is read from the review block, a bare findings key, or a bare array", () => {
  const one = [f(LAWS, "The Colorado row names a statute that does not exist. It is the Colorado Privacy Act.")];
  assert.equal(extractFindings(advisoryOf(one)).length, 1);
  assert.equal(extractFindings({ findings: one }).length, 1);
  assert.equal(extractFindings(one).length, 1);
  assert.throws(() => extractFindings({ review: {} }), AdvisoryScoreError);
  assert.throws(() => extractFindings(null), AdvisoryScoreError);
});

test("a malformed finding is refused loudly with its index, never silently skipped", () => {
  assert.throws(() => scoreAdvisory(advisoryOf(["a string finding"]), key), (e) => {
    assert.ok(e instanceof AdvisoryScoreError);
    assert.match(e.message, /finding 0/);
    return true;
  });
});

test("a key whose schema is not the seeded-defect key is refused", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-score-"));
  try {
    const bad = path.join(dir, "not-a-key.json");
    writeFileSync(bad, JSON.stringify({ schema: "something-else/1", defects: [] }), "utf8");
    assert.throws(() => loadKey(bad), AdvisoryScoreError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("testRule implements the key's clause language: anyOf, allOf, none, and an empty rule", () => {
  assert.equal(testRule({ anyOf: ["alpha", "beta"] }, "here is BETA"), true);
  assert.equal(testRule({ allOf: ["alpha", "beta"] }, "here is beta"), false);
  assert.equal(testRule({ allOf: ["alpha"], anyOf: ["beta"] }, "alpha and beta"), true);
  assert.equal(testRule({ anyOf: ["alpha"], none: ["beta"] }, "alpha and beta"), false);
  assert.equal(testRule({ anyOf: [] }, "anything"), false, "a rule with no clause never matches");
  assert.equal(testRule({ none: ["x"] }, "anything"), false, "a none-only rule never matches on its own");
  assert.equal(testRule(undefined, "anything"), false);
});

// ---------------------------------------------------------------------------
// 7. The key's own self-test, now run through the harness
// ---------------------------------------------------------------------------

test("every example the key declares classifies exactly as the key says it must", () => {
  for (const entry of [...key.defects, ...key.nonDefects]) {
    for (const ex of entry.examples) {
      const got = classifyText(key, ex.text);
      assert.equal(got.outcome, ex.expect, `${entry.id}: expected ${ex.expect}, got ${got.outcome}\ntext: ${ex.text}`);
      if (["tp", "confabulation", "partial"].includes(ex.expect)) assert.equal(got.entryId, entry.id);
    }
  }
});

test("classifyFinding and classifyText agree on a finding built from the same text", () => {
  const message = "The Colorado row names a statute that does not exist. Colorado's law is the Colorado Privacy Act, SB 21-190.";
  const viaFinding = classifyFinding(key, { file: LAWS, message });
  const viaText = classifyText(key, `${LAWS}\n${message}`);
  assert.deepEqual(viaFinding, viaText);
});

// ---------------------------------------------------------------------------
// 8. The thin CLI
// ---------------------------------------------------------------------------

function cli(args, expectFail = false) {
  try {
    const stdout = execFileSync(process.execPath, [MODULE, ...args], { encoding: "utf8", stdio: "pipe" });
    if (expectFail) assert.fail(`expected a non-zero exit, got:\n${stdout}`);
    return { status: 0, stdout };
  } catch (e) {
    if (!expectFail) assert.fail(`unexpected exit ${e.status}: ${e.stderr ?? ""}`);
    return { status: e.status, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

test("CLI: scoring the strong run prints the pair, the misses and the provisional flag", () => {
  const { stdout } = cli([STRONG, KEY_PATH]);
  assert.match(stdout, /precision\s+1\.00/);
  assert.match(stdout, /recall\s+0\.62/);
  assert.match(stdout, /SD-06/);
  assert.match(stdout, /PROVISIONAL/);
  assert.match(stdout, /key 1\.1\.0/, "the keyVersion is printed beside the numbers (adjudication step 6)");
});

test("CLI: --json is byte-identical across two runs", () => {
  const a = cli([CHEAP, KEY_PATH, "--json"]).stdout;
  const b = cli([CHEAP, KEY_PATH, "--json"]).stdout;
  assert.equal(a, b);
  const parsed = JSON.parse(a);
  assert.equal(parsed.precision, 0);
  assert.equal(parsed.recall, 0);
  assert.equal(parsed.keyVersion, key.keyVersion);
});

test("CLI: the key argument defaults to the tracked seeded-defect key", () => {
  const { stdout } = cli([STRONG]);
  assert.match(stdout, /recall\s+0\.62/);
});

test("CLI: a refusal is loud - exit 2 and a message on stderr", () => {
  const r = cli([path.join(RUNS, "no-such-run.json"), KEY_PATH], true);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /REFUSED/);
});

test("CLI: --help exits 0 and states that it dispatches no model", () => {
  const { stdout } = cli(["--help"]);
  assert.match(stdout, /no model/i);
});

// ---------------------------------------------------------------------------
// 9. ADR 0065, rule (a'): multi-entry credit (E16) and E17's adjudication input (RS-B1 criteria 2-3)
// ---------------------------------------------------------------------------
//
// These score the three REAL, byte-frozen E13 advisories (Haiku, Sonnet and Opus at effort high,
// batch 2026-08-04) against key 1.1.0, not a hand-built fixture: the ruled numbers in ADR 0065 and
// the RS-B1 section of docs/internal/roadmap.md were measured against exactly these files, so a test
// built on different findings could pass while the real rule was wrong. The single-entry path is
// untouched by this ruling, so every test above this section stays green unmodified.

const haikuScore = () => scoreAdvisory(readJson(HAIKU_RUN), key, { model: "haiku", effort: "high" });
const sonnetScore = () => scoreAdvisory(readJson(SONNET_RUN), key, { model: "sonnet", effort: "high" });
const opusScore = () => scoreAdvisory(readJson(OPUS_RUN), key, { model: "opus", effort: "high" });

test("rule (a'): recall on key 1.1.0 is exactly Haiku 0.46, Sonnet 0.54, Opus 0.92 (RS-B1 criterion 2)", () => {
  const haiku = haikuScore();
  const sonnet = sonnetScore();
  const opus = opusScore();
  assert.equal(haiku.recall.toFixed(2), "0.46", `haiku recall was ${haiku.recall}`);
  assert.equal(sonnet.recall.toFixed(2), "0.54", `sonnet recall was ${sonnet.recall}`);
  assert.equal(opus.recall.toFixed(2), "0.92", `opus recall was ${opus.recall}`);
});

test("rule (a'): Opus precision is 11 of 11 and recall is 12 of 13 (ADR 0065, Implementation sites)", () => {
  const opus = opusScore();
  assert.equal(opus.counts.truePositives, 11);
  assert.equal(opus.counts.falsePositives, 0);
  assert.equal(opus.precision, 1, "11 of 11 scored claims");
  assert.equal(opus.counts.satisfiedEntries, 12);
  assert.equal(opus.counts.plantedDefects, 13);
  assert.equal(opus.recall, 12 / 13, "12 of 13 planted entries satisfied");
  // The worked misattribution ADR 0065 names: finding index 0 credits BOTH SD-03 and SD-07, which is
  // why 11 true-positive findings satisfy 12 entries rather than 11.
  const zeroRow = opus.findings.find((r) => r.index === 0);
  assert.deepEqual(zeroRow.creditedIds, ["SD-03", "SD-07"]);
  assert.equal(zeroRow.outcome, OUTCOME.TP);
});

test("ADR 0065 decision driver: Opus index 7 is credited to SD-05, the entry it did NOT report", () => {
  // Index 7 textually reports only SD-06 (the semantic entry, which `isAutoCreditable` always
  // refuses). Rule (a') credits SD-05 instead, because SD-05's OWN correct clause happens to verify
  // against the same text (it names the Colorado Privacy Act in passing). This is the measured
  // misattribution ADR 0065's decision drivers name, kept as a named test rather than an incidental
  // byproduct of the recall assertion above.
  const opus = opusScore();
  const row7 = opus.findings.find((r) => r.index === 7);
  assert.deepEqual(row7.engagedIds, ["SD-05", "SD-06"]);
  assert.deepEqual(row7.creditedIds, ["SD-05"], "SD-06 is semantic-blocked; SD-05 verifies on its own text");
  assert.equal(row7.outcome, OUTCOME.TP);
  assert.ok(opus.worklist.some((w) => w.index === 7), "still mandatory adjudication whether or not it was credited");
});

test("ADR 0065 decision driver: Opus index 8 describes neither entry it engages, credited anyway, and collapses to a duplicate", () => {
  // Index 8 engages SD-01 (credited because verification is not-required - naming the pair IS the
  // finding) and SD-05 (credited because its correct clause verifies against index 8's text, though
  // index 8 does not describe SD-05). Both were already satisfied earlier (SD-01 by index 4, SD-05 by
  // index 7 above), so index 8 collapses to a DUPLICATE - order-dependent, and real only because the
  // fixtures are byte-frozen and the order is therefore stable.
  const opus = opusScore();
  const row8 = opus.findings.find((r) => r.index === 8);
  assert.deepEqual(row8.engagedIds, ["SD-01", "SD-05"]);
  assert.deepEqual(row8.creditedIds, ["SD-01", "SD-05"]);
  assert.equal(row8.outcome, OUTCOME.DUPLICATE, "both credited entries were already satisfied by earlier findings");
  assert.ok(opus.worklist.some((w) => w.index === 8), "a duplicate multi-entry engagement is STILL mandatory adjudication");
});

test("ADR 0065 decision driver: Sonnet's order-dependence counterpart - index 6 is the one that collapses", () => {
  // Sonnet lists its findings the other way round from Opus: a single-entry SD-05 true positive comes
  // BEFORE its one multi-entry engagement, so index 6 (SD-05+SD-06, SD-05 credited) is the one that
  // collapses to a duplicate here, not an earlier index. Same masking, opposite position - the ADR's
  // point that the masking depends on finding order, not on which model wrote the advisory.
  const sonnet = sonnetScore();
  const row6 = sonnet.findings.find((r) => r.index === 6);
  assert.deepEqual(row6.engagedIds, ["SD-05", "SD-06"]);
  assert.deepEqual(row6.creditedIds, ["SD-05"]);
  assert.equal(row6.outcome, OUTCOME.DUPLICATE, "SD-05 was already satisfied by an earlier single-entry finding");
  assert.ok(sonnet.satisfied.includes("SD-05"));
});

test("rule (a'): recallByMisses is entry-counted, not finding-counted (ADR 0065, Implementation sites)", () => {
  // Opus index 0 alone credits two entries (SD-03 and SD-07), so 11 true-positive FINDINGS satisfy 12
  // entries. A `recallByMisses` built from `truePositives` rather than `satisfied.size` would read
  // 11/12 here, disagreeing with `recall`'s 12/13 and tripping the CLI's WARNING line - the exact
  // "false harness defect" ADR 0065 predicts if this count is ever finding-counted instead of
  // entry-counted. This is a named regression test for that disagreement, not an incidental byproduct
  // of the "two recall formulas agree" loop above.
  const opus = opusScore();
  assert.equal(opus.counts.truePositives, 11);
  assert.equal(opus.counts.satisfiedEntries, 12);
  assert.equal(opus.recallByMisses, 12 / 13, "recallByMisses must be satisfied.size / (satisfied.size + misses.length), not truePositives-based");
  assert.equal(opus.recall, 12 / 13);
  assert.ok(opus.recallAgrees, "recall and recallByMisses must agree");
  const { stdout } = cli([OPUS_RUN, KEY_PATH]);
  assert.doesNotMatch(stdout, /WARNING/, "a correct recallByMisses never trips the CLI's disagreement warning");
});

test("rule (a'): the ceiling invariant - no reported recall exceeds recallAutoCeiling for its key", () => {
  for (const score of [haikuScore(), sonnetScore(), opusScore()]) {
    assert.ok(
      score.recall <= score.recallAutoCeiling + Number.EPSILON,
      `recall ${score.recall} exceeded recallAutoCeiling ${score.recallAutoCeiling}`,
    );
  }
  // Opus sits exactly AT the ceiling (12 of 13; SD-06 is mode: semantic and never auto-credited), the
  // case ADR 0065 was written to get right: the falsified alternative (rule a, full credit) would have
  // published Opus recall at 1.00 here, above this same 0.92 ceiling.
  const opus = opusScore();
  assert.equal(opus.recallAutoCeiling.toFixed(2), "0.92");
  assert.equal(opus.recall, opus.recallAutoCeiling, "Opus reaches the ceiling and never crosses it");
});

test("rule (a') REVERT PROOF: zero-credit-on-multi-engagement reproduces the pre-ruling baseline, not the ruled numbers", () => {
  // This re-derives the OLD (pre-ADR-0065) multi-entry outcome locally - without touching the shipped
  // module - and asserts that it reproduces the documented pre-ruling baseline (Haiku 0.38, Opus 0.62)
  // while the LIVE module's recall does not. It is itself one of the tests that goes red on a revert:
  // reverting classifyText's multi-entry branch back to this shape makes the live and zero-credit
  // recalls equal, which trips the `assert.notEqual` calls below. This was verified directly during
  // implementation (ADR 0065, RS-B1 criterion 2): temporarily reverting the multi-entry branch to
  // unconditional review-required turned this test and seven others red (the ruled-number assertions
  // above, the ceiling-at-exactly-Opus assertion, and the adjudication demonstrations, which all
  // depend on a multi-entry engagement existing to adjudicate), and restoring the implementation
  // turned the whole suite green again. (Re-verified after this section grew to its current size:
  // the same mutation turns exactly 12 of these tests red.)
  const zeroCreditRecall = (file) => {
    const advisory = readJson(file);
    const findings = extractFindings(advisory);
    const satisfied = new Set();
    for (const finding of findings) {
      const text = matchTextOf(finding, key);
      const engaged = (key.defects ?? []).filter((d) => testRule(d.match?.locate, text, key.patternSyntax?.flags ?? "i"));
      if (engaged.length !== 1) continue; // the old behaviour: >1 engaged credits NOTHING
      const entry = engaged[0];
      if (entry.match.mode === "semantic") continue;
      if (entry.match.verification === "not-required") { satisfied.add(entry.id); continue; }
      const correct = testRule(entry.match.correct, text, key.patternSyntax?.flags ?? "i");
      const confabulated = testRule(entry.match.confabulation, text, key.patternSyntax?.flags ?? "i");
      if (correct && !confabulated) satisfied.add(entry.id);
    }
    return satisfied.size / key.defects.length;
  };
  assert.equal(zeroCreditRecall(HAIKU_RUN).toFixed(2), "0.38", "the zero-credit baseline, reproduced");
  assert.equal(zeroCreditRecall(OPUS_RUN).toFixed(2), "0.62", "the zero-credit baseline, reproduced");
  // And the live module does NOT reproduce that baseline: the ruled numbers are strictly higher.
  assert.notEqual(haikuScore().recall.toFixed(2), zeroCreditRecall(HAIKU_RUN).toFixed(2));
  assert.notEqual(opusScore().recall.toFixed(2), zeroCreditRecall(OPUS_RUN).toFixed(2));
});

test("rule (a'): determinism - the same recorded advisory scores identically across two runs", () => {
  const a = scoreAdvisory(readJson(OPUS_RUN), loadKey(KEY_PATH), { model: "opus", effort: "high" });
  const b = scoreAdvisory(readJson(OPUS_RUN), loadKey(KEY_PATH), { model: "opus", effort: "high" });
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test("E17: an adjudication document overrides one automatic multi-entry engagement", () => {
  const before = sonnetScore();
  // Finding #0 of the Sonnet run engages SD-07 and SD-08 at once and, under the automatic rule,
  // credits neither (both fail their own correct/confabulation test), so it sits review-required and
  // SD-07 is a miss. This is the mandatory-adjudication case ADR 0065 requires routing to a human for,
  // not a hand-built example.
  const row0 = before.findings.find((r) => r.index === 0);
  assert.equal(row0.outcome, OUTCOME.REVIEW_REQUIRED);
  assert.deepEqual(row0.engagedIds, ["SD-07", "SD-08"]);
  assert.deepEqual(row0.creditedIds, []);
  assert.ok(before.misses.includes("SD-07"));
  assert.ok(before.worklist.some((w) => w.index === 0), "finding 0 is on the mandatory worklist");

  const after = scoreAdvisory(readJson(SONNET_RUN), key, {
    model: "sonnet",
    effort: "high",
    adjudication: { resolutions: [{ index: 0, entryId: "SD-07", decision: "credit" }] },
  });
  const after0 = after.findings.find((r) => r.index === 0);
  assert.equal(after0.outcome, OUTCOME.TP, "the human's credit decision promotes the finding to a true positive");
  assert.deepEqual(after0.creditedIds, ["SD-07"]);
  assert.ok(after0.adjudicated);
  assert.ok(!after0.provisional, "a resolved item leaves the mandatory worklist");
  assert.ok(!after.worklist.some((w) => w.index === 0), "adjudication folds the item OUT of the published worklist");
  assert.ok(after.satisfied.includes("SD-07"), "the adjudicated credit reaches the satisfied set");
  assert.ok(!after.misses.includes("SD-07"));
  assert.equal(after.recall, before.recall + 1 / key.defects.length, "recall moves by exactly one entry");
  assert.equal(after.counts.adjudicated, 1);
});

test("E17: an adjudication resolution may deny credit, which still folds the item out of the worklist", () => {
  // Opus finding #4 engages SD-01 (not-required, so auto-credited) and SD-12 (uncredited). A human who
  // decides SD-01's auto-credit was wrong here can deny it; the finding then has zero credited entries
  // and stays review-required, but it is no longer PENDING, because the adjudication resolved it.
  const after = scoreAdvisory(readJson(OPUS_RUN), key, {
    model: "opus",
    effort: "high",
    adjudication: { resolutions: [{ index: 4, entryId: "SD-01", decision: "no-credit" }] },
  });
  const row4 = after.findings.find((r) => r.index === 4);
  assert.equal(row4.outcome, OUTCOME.REVIEW_REQUIRED);
  assert.deepEqual(row4.creditedIds, []);
  assert.ok(row4.adjudicated);
  assert.ok(!row4.provisional, "denied credit still resolves the mandatory item");
  assert.ok(!after.worklist.some((w) => w.index === 4));
});

test("E17: an adjudication resolution naming an entry the finding never engaged is refused", () => {
  assert.throws(
    () => scoreAdvisory(readJson(SONNET_RUN), key, {
      adjudication: { resolutions: [{ index: 0, entryId: "SD-05", decision: "credit" }] },
    }),
    (e) => {
      assert.ok(e instanceof AdvisoryScoreError);
      assert.match(e.message, /does not engage/);
      return true;
    },
  );
});

test("E17: a malformed adjudication resolution is refused, not silently ignored", () => {
  for (const bad of [
    { resolutions: [{ entryId: "SD-07", decision: "credit" }] }, // no index
    { resolutions: [{ index: 0, decision: "credit" }] }, // no entryId
    { resolutions: [{ index: 0, entryId: "SD-07", decision: "approve" }] }, // unknown decision
    { resolutions: "not-an-array" },
  ]) {
    assert.throws(
      () => scoreAdvisory(readJson(SONNET_RUN), key, { adjudication: bad }),
      AdvisoryScoreError,
    );
  }
});

test("E17: an adjudication resolution for a single-entry finding is refused, not silently dropped", () => {
  // Sonnet finding #1 is an ordinary single-entry engagement (not multi). A resolution naming it must
  // be refused loudly rather than accepted and ignored - the exact failure indexAdjudication's own
  // docstring warns against, and the one a silent-drop bug would hide from every caller.
  const before = sonnetScore();
  const row1 = before.findings.find((r) => r.index === 1);
  assert.equal(row1.multi, false, "finding 1 is single-entry, the case this test needs");
  assert.throws(
    () => scoreAdvisory(readJson(SONNET_RUN), key, {
      adjudication: { resolutions: [{ index: 1, entryId: row1.entryId ?? "SD-01", decision: "credit" }] },
    }),
    (e) => {
      assert.ok(e instanceof AdvisoryScoreError);
      assert.match(e.message, /not a multi-entry engagement/);
      return true;
    },
  );
});

test("E17: an adjudication resolution for a finding index the advisory does not have is refused", () => {
  assert.throws(
    () => scoreAdvisory(readJson(SONNET_RUN), key, {
      adjudication: { resolutions: [{ index: 9999, entryId: "SD-01", decision: "credit" }] },
    }),
    (e) => {
      assert.ok(e instanceof AdvisoryScoreError);
      assert.match(e.message, /no finding 9999/);
      return true;
    },
  );
});

test("CLI: scoring the Opus recorded run prints recall as entries over planted defects (12 / 13), not findings", () => {
  // formatScoreReport's recall line must read 12 (satisfied entries), never 11 (true-positive
  // findings) - the two differ here because Opus index 0 alone credits two entries, SD-03 and SD-07.
  const { stdout } = cli([OPUS_RUN, KEY_PATH]);
  assert.match(stdout, /recall\s+0\.92\s+\(12 entries \/ 13 planted defects\)/);
});

test("rule (a'): a multi-entry engagement is NEVER classified CONFABULATION or PARTIAL for one entry", () => {
  // The asymmetry ADR 0065 names: an engaged entry whose confabulation clause matches earns no credit,
  // but the finding is not thereby an automatic false positive, because it may correctly describe a
  // DIFFERENT engaged entry. This text engages SD-01 (not-required, so credited on its own) AND SD-05.
  // SD-05 earns no credit here because its OWN correct clause does not verify against this text (it
  // never names the Colorado Privacy Act, CPA, or SB 21-190) - the confabulation clause matching is
  // incidental to that, not the reason. The next test below isolates the case where SD-05's correct
  // clause DOES verify at the same time its confabulation clause does, which is the one
  // `isAutoCreditable` actually has to refuse. Built directly rather than read off a recorded run,
  // since none of the three recorded advisories happens to hit either exact sub-case.
  const got = classifyText(
    key,
    `${LAWS}\ndsar-intake-triage and data-request-router have a collision in their trigger surfaces. Separately, the Colorado citation should be VCDPA.`,
  );
  assert.equal(got.multi, true);
  assert.deepEqual(got.engagedIds, ["SD-01", "SD-05"]);
  assert.deepEqual(got.creditedIds, ["SD-01"], "SD-05's own correct clause does not verify, so it earns no credit");
  assert.notEqual(got.outcome, OUTCOME.CONFABULATION, "the finding as a whole is not an automatic false positive");
  assert.notEqual(got.outcome, OUTCOME.PARTIAL);
  assert.equal(got.outcome, OUTCOME.TP, "it is one true positive, credited via SD-01");
});

test("rule (a') GUARD: an engaged entry whose correct clause verifies AND confabulation clause also fires stays uncredited", () => {
  // isAutoCreditable's actual guard is `correct && !confabulated`, not `correct` alone. The test above
  // cannot see a revert of that guard to `return correct;`, because SD-05's correct clause never
  // verifies there. This text makes BOTH of SD-05's clauses match within one engagement (the key's own
  // review-required worked example for SD-05, reused here): it names the real statute ("Colorado
  // Privacy Act", "CPA") AND asserts a wrong correction ("replaced with the CCPA-style ... form") in
  // the same breath, alongside SD-01's not-required pair. If `isAutoCreditable` is ever reverted to
  // credit on `correct` alone, SD-05 moves from absent to present in `creditedIds` and this test goes
  // red; it does not merely sit silently passing either way.
  const text = `${LAWS}\ndsar-intake-triage and data-request-router have a collision in their trigger surfaces. CCDPA does not exist. The statute is the Colorado Privacy Act (CPA); the name in the table looks like a blend of Virginia's VCDPA and California's CCPA, and it should be replaced with the CCPA-style short form used in the other rows.`;
  const got = classifyText(key, text);
  assert.equal(got.multi, true);
  assert.deepEqual(got.engagedIds, ["SD-01", "SD-05"], "both SD-01 and SD-05 are engaged by this text");
  // Confirm SD-05's own correct clause actually verifies here (unlike the test above), so the guard
  // under test is the one that matters: correct matched AND confabulation matched, not correct alone
  // failing to match.
  const sd05 = key.defects.find((d) => d.id === "SD-05");
  const flags = key.patternSyntax?.flags ?? "i";
  assert.ok(testRule(sd05.match.correct, text, flags), "sanity: SD-05's correct clause verifies against this text");
  assert.ok(testRule(sd05.match.confabulation, text, flags), "sanity: SD-05's confabulation clause also fires against this text");
  assert.deepEqual(got.creditedIds, ["SD-01"], "SD-05 stays uncredited although its correct clause also verifies here");
  assert.ok(!got.creditedIds.includes("SD-05"), "the confabulation clause firing is what withholds SD-05's credit, not a missing correct match");
  assert.equal(got.outcome, OUTCOME.TP, "still one true positive via SD-01");
});

test("rule (a'): the single-entry path is unchanged - every precedence test above still holds", () => {
  // Restated here as a named anchor for this section, not a new assertion: classifyText's
  // `engaged.length === 1` branch was not touched by this ruling, and the suite's section 1 tests
  // (lines ~50-73) already prove it precedence-by-precedence.
  const got = classifyText(key, `${LAWS}\nThe Colorado row names a statute that does not exist. Colorado's law is the Colorado Privacy Act, SB 21-190.`);
  assert.equal(got.outcome, OUTCOME.TP);
  assert.equal(got.multi, undefined, "a single-entry classification carries no multi flag at all");
});
