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
const KEY_PATH = path.join(ROOT, "tests/fixtures/anti/seeded-defects/privacy-notice-toolkit.key.json");
const RUNS = path.join(ROOT, "tests/fixtures/anti/seeded-defects/simulated-runs");
const STRONG = path.join(RUNS, "strong-frontier.advisory.json");
const CHEAP = path.join(RUNS, "reading-17-cheap.advisory.json");
const MODULE = path.join(ROOT, "scripts/lib/advisory-score.mjs");

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
  for (const file of [STRONG, CHEAP]) {
    const s = scoreAdvisory(readJson(file), key);
    assert.equal(s.recall, s.recallByMisses, `${path.basename(file)}: TP/defects and TP/(TP+misses) must agree`);
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
