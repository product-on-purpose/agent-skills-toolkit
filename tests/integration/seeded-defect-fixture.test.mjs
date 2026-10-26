import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { classifyText, testRule, scoreAdvisory } from "../../scripts/lib/advisory-score.mjs";

// The seeded-defect fixture and its scoring key (F3 R-AQ-1). Two properties have to hold for any
// advisory precision/recall number measured against this fixture to mean anything:
//
//   1. The fixture passes the DETERMINISTIC gate. Every planted defect is qualitative; if the gate
//      could see one, the measurement would be measuring the gate rather than the advisory layer.
//   2. The key still describes the fixture. Every planted defect's anchor is verified to be present
//      in the file the key names, so an edit to a fixture file that silently removes a defect fails
//      here instead of quietly deflating a recorded recall number.
//
// The third block is the key's own self-test: each entry declares example finding texts with the
// outcome the documented classification MUST produce. These assertions ran against a reference
// classifier local to this file until the F3 harness landed (F3 R-AQ-2); they now run against the
// harness itself (scripts/lib/advisory-score.mjs) and the local copy is deleted, so the key's declared
// examples guard the SHIPPED classifier rather than a test-only twin of it.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KEY_PATH = path.join(ROOT, "tests/fixtures/seeded-defect-keys/privacy-notice-toolkit.key.1.1.0.json");
const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
const FIXTURE = path.join(ROOT, key.fixture.path);

// The nine defect classes the F3 fixture is required to span (release R2 section 2, F3 bullet 1).
const REQUIRED_CLASSES = [
  "trigger-surface-collision", "manifest-vs-disk-drift", "stale-doc-claim", "wrong-procedure",
  "fake-statute", "inverted-rule", "command-vs-skill-contradiction", "capability-overclaim",
  "broken-cross-reference",
];

// ---------------------------------------------------------------------------
// The classifier under test: the shipped harness, not a local twin of it
// ---------------------------------------------------------------------------

const re = (p) => new RegExp(p, key.patternSyntax.flags);
const classify = (text) => classifyText(key, text);

// ---------------------------------------------------------------------------
// 1. The fixture passes the deterministic gate
// ---------------------------------------------------------------------------

test("the seeded-defect fixture passes the deterministic gate under its declared profile", () => {
  const args = [path.join(ROOT, "scripts/check.mjs"), FIXTURE, "--profile", key.fixture.profile];
  let stdout = "";
  let code = 0;
  try {
    stdout = execFileSync(process.execPath, args, { encoding: "utf8" });
  } catch (e) {
    code = e.status ?? 1;
    stdout = String(e.stdout ?? "") + String(e.stderr ?? "");
  }
  assert.equal(code, key.fixture.gateBaseline.exitCode, `the gate must exit ${key.fixture.gateBaseline.exitCode} on the fixture:\n${stdout}`);
  assert.match(stdout, /0 error\(s\), 0 warning\(s\)/, `the gate must report 0 errors and 0 warnings:\n${stdout}`);
  assert.equal(key.fixture.gateBaseline.errors, 0);
  assert.equal(key.fixture.gateBaseline.warnings, 0);
});

// ---------------------------------------------------------------------------
// 2. The key still describes the fixture
// ---------------------------------------------------------------------------

test("every planted defect and every bait anchor is still present in the file the key names", () => {
  for (const entry of [...key.defects, ...key.nonDefects]) {
    for (const loc of entry.locations) {
      const abs = path.join(FIXTURE, loc.file);
      assert.ok(existsSync(abs), `${entry.id}: ${loc.file} does not exist in the fixture`);
      const text = readFileSync(abs, "utf8");
      assert.ok(
        text.includes(loc.anchor),
        `${entry.id}: the anchor is gone from ${loc.file}. Either restore it or update the key (and bump keyVersion).\nanchor: ${loc.anchor}`
      );
    }
  }
});

test("the key is structurally complete and spans every required defect class", () => {
  assert.equal(key.schema, "askit-seeded-defect-key/1");
  assert.match(key.keyVersion, /^\d+\.\d+\.\d+$/);
  const ids = key.defects.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, "defect ids are unique");
  for (const cls of REQUIRED_CLASSES) {
    assert.ok(key.defects.some((d) => d.class === cls), `no planted defect for the required class "${cls}"`);
    assert.ok(key.defectClasses[cls], `defectClasses does not document "${cls}"`);
  }
  for (const d of key.defects) {
    assert.ok(d.groundTruth && d.correction, `${d.id}: needs a groundTruth and a correction`);
    assert.ok(["auto", "semantic"].includes(d.match.mode), `${d.id}: mode must be auto or semantic`);
    assert.ok(["required", "not-required"].includes(d.match.verification), `${d.id}: verification must be required or not-required`);
    assert.ok(testRule(d.match.locate, "") === false, `${d.id}: locate must not match empty text`);
    if (d.match.verification === "required") {
      assert.ok((d.match.correct.anyOf ?? []).length > 0, `${d.id}: a verified entry needs correct patterns`);
    }
    for (const p of [...(d.match.locate.anyOf ?? []), ...(d.match.locate.allOf ?? []), ...(d.match.locate.none ?? []),
      ...(d.match.correct?.anyOf ?? []), ...(d.match.correct?.allOf ?? []),
      ...(d.match.confabulation?.anyOf ?? [])]) {
      assert.doesNotThrow(() => re(p), `${d.id}: pattern does not compile: ${p}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 3. The key's self-test: the declared examples classify as declared
// ---------------------------------------------------------------------------

test("every declared example classifies exactly as the key says it must", () => {
  for (const entry of [...key.defects, ...key.nonDefects]) {
    for (const ex of entry.examples) {
      const got = classify(ex.text);
      assert.equal(
        got.outcome, ex.expect,
        `${entry.id}: expected ${ex.expect}, got ${got.outcome}${got.entryId ? ` (${got.entryId})` : ""}${got.why ? ` [${got.why}]` : ""}\ntext: ${ex.text}`
      );
      if (["tp", "confabulation", "partial"].includes(ex.expect)) {
        assert.equal(got.entryId, entry.id, `${entry.id}: the example engaged ${got.entryId} instead`);
      }
    }
  }
});

test("a confabulated correction is never a true positive, and it leaves its defect unsatisfied", () => {
  // The single rule the whole measurement rests on (release R2 section 2, F3 bullet 2; reading 17).
  const confabExamples = key.defects.flatMap((d) => (d.examples ?? [])
    .filter((e) => e.expect === "confabulation").map((e) => ({ d, e })));
  assert.ok(confabExamples.length >= 5, "the key must exercise the confabulation rule on several defect classes");
  const satisfied = new Set();
  for (const { d, e } of confabExamples) {
    const got = classify(e.text);
    assert.equal(got.outcome, "confabulation", `${d.id}: a confabulated correction must not classify as ${got.outcome}`);
    assert.notEqual(got.outcome, "tp");
    // The harness adds a confabulation to the false positives and does NOT add its entry to the
    // satisfied set, which is what produces the second penalty: the defect is still a miss.
    assert.ok(!satisfied.has(d.id), `${d.id}: a confabulation must leave the entry unsatisfied`);
  }
  // Recall over a run made only of confabulations is therefore zero, and precision is zero too.
  const tp = 0;
  const fp = confabExamples.length;
  const misses = key.defects.length - tp;
  assert.equal(tp / (tp + fp), 0, "precision over a confabulation-only run is zero");
  assert.equal(tp / (tp + misses), 0, "recall over a confabulation-only run is zero");
});

test("the reading-17 verbatim shape scores as a false positive and a miss, not a catch", () => {
  // Reading 17: Haiku smelled the real statute error, cited a statute that also does not exist,
  // graded it minor, and asserted a false consistency elsewhere. Both halves are scored here.
  const invented = classify("skills/privacy-notice-review/references/us-state-laws.md\nThe Colorado citation is slightly off. CCDPA should be the CCPA, which is the correct statute for that row. Minor, house preference.");
  assert.equal(invented.outcome, "confabulation");
  assert.equal(invented.entryId, "SD-05");

  const falseConsistency = classify("commands/review-privacy-notice.md\nThe command's seven-point checklist and the skill's are identical, and all cross-references are accurate.");
  assert.equal(falseConsistency.outcome, "confabulation");
  assert.equal(falseConsistency.entryId, "SD-07");
});

test("locate patterns are disjoint: no declared example engages two defect entries by accident", () => {
  for (const entry of [...key.defects, ...key.nonDefects]) {
    for (const ex of entry.examples) {
      const engaged = key.defects.filter((d) => testRule(d.match.locate, ex.text)).map((d) => d.id);
      if (ex.expect === "review-required" && engaged.length > 1) continue; // declared ambiguity
      assert.ok(engaged.length <= 1, `${entry.id}: example engages ${engaged.join(", ")}; locate patterns must be disjoint`);
    }
  }
});

// ---------------------------------------------------------------------------
// 4. E20: the scoring key is not readable from inside the fixture tree
// ---------------------------------------------------------------------------

/** Every .json file under `dir`, recursive, skipping the usual noise. A file that fails to parse as
 *  JSON is not a key and is skipped rather than failing this walk. */
function allJsonFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const abs = path.join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...allJsonFiles(abs));
    else if (name.endsWith(".json")) out.push(abs);
  }
  return out;
}

test("E20: no file inside the seeded-defect fixture tree parses as a scoring key", () => {
  // This is a CONTENT check, not a filename check: a key copied in under any other name is still a
  // key. A run dispatched at FIXTURE must not be able to read the answers by listing its own tree.
  const FIXTURE_TREE = path.join(ROOT, "tests/fixtures/anti/seeded-defects");
  for (const file of allJsonFiles(FIXTURE_TREE)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue; // not JSON, or not parseable; not a key either way
    }
    assert.notEqual(
      parsed?.schema, "askit-seeded-defect-key/1",
      `${path.relative(ROOT, file)} is a seeded-defect scoring key (schema askit-seeded-defect-key/1) ` +
      "planted inside the fixture tree. The key must live outside tests/fixtures/anti/seeded-defects/ " +
      "(see tests/fixtures/seeded-defect-keys/README.md)."
    );
  }
});

// ---------------------------------------------------------------------------
// The E13 adjudication document: consumable by E17 and covering the whole mandatory worklist
// ---------------------------------------------------------------------------

// ADR 0065 makes adjudication mandatory on every multi-entry engagement. The tracked adjudication
// document is only useful if the scorer can actually consume it, so this loads each fenced json block
// and feeds it to scoreAdvisory as opts.adjudication. It asserts no figure: the resolutions are a
// human's to sign or amend, and a test that pinned the draft's numbers would fight that signature.
const ADJUDICATION_DOC = path.join(ROOT, "docs/internal/eval-runs/adjudication-2026-08-04.md");
const RECORDED_RUNS = path.join(ROOT, "tests/fixtures/anti/seeded-defects/recorded-runs/2026-08-04");

test("the E13 adjudication document is consumable by E17 and resolves every engaged entry of every multi-entry engagement", () => {
  const doc = readFileSync(ADJUDICATION_DOC, "utf8");
  assert.match(
    doc, /\*\*Status: (?:DRAFT - PENDING MAINTAINER SIGNATURE|SIGNED)/,
    "the adjudication document must state whether a human has signed it",
  );
  const blocks = [...doc.matchAll(/```json\r?\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));
  for (const model of ["haiku", "sonnet", "opus"]) {
    const block = blocks.find((b) => b.advisory === model);
    assert.ok(block, `the adjudication document has no json block for the ${model} advisory`);
    assert.equal(block.keyVersion, key.keyVersion, `the ${model} block names a different key version`);
    const advisory = JSON.parse(readFileSync(path.join(RECORDED_RUNS, `${model}-high-advisory.json`), "utf8"));
    const auto = scoreAdvisory(advisory, key);
    // Every engaged entry of every multi-entry engagement carries exactly one explicit resolution,
    // including entries the scorer already credited, so a signature confirms each automatic credit.
    for (const row of auto.findings.filter((r) => r.multi)) {
      for (const entryId of row.engagedIds) {
        const hits = block.resolutions.filter((r) => r.index === row.index && r.entryId === entryId);
        assert.equal(hits.length, 1, `${model} finding ${row.index}: expected one resolution for ${entryId}, found ${hits.length}`);
      }
    }
    // scoreAdvisory refuses a malformed, misdirected, or single-entry resolution, so this call is the
    // consumability check; afterwards no multi-entry engagement may remain on the worklist.
    const adjudicated = scoreAdvisory(advisory, key, { adjudication: block });
    const leftMulti = adjudicated.worklist.filter((w) => w.engagedIds);
    assert.deepEqual(leftMulti.map((w) => w.index), [], `${model}: a multi-entry engagement is still unadjudicated`);
  }
});
