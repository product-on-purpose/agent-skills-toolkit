// what-it-is:   the advisory precision/recall harness and its thin CLI (F3 R-AQ-2)
// what-it-does: classifies every finding in an ALREADY-WRITTEN advisory result against a seeded-defect
//               scoring key, then reports the true-positive / false-positive / miss partition, the
//               precision and recall pair for one model x effort cell, and the adjudication worklist
// why:          sensor reading 17 recorded a model that smelled a real error, invented a correction that
//               is also wrong, and certified it verified; a harness that credited that as a catch would
//               score a hallucination as recall, so confabulation-is-both-a-false-positive-and-a-miss
//               has to be mechanical rather than a note in a document
// used-by:      run directly (node scripts/lib/advisory-score.mjs <result.json> [key.json]); covered by
//               tests/unit/advisory-score.test.mjs and tests/integration/seeded-defect-fixture.test.mjs
//
// It dispatches NO model and reads no graded tree: a score is a pure synchronous function of two JSON
// documents. It imports nothing from the check spine, so it relocates as a self-contained unit.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class AdvisoryScoreError extends Error {
  constructor(message) {
    super(message);
    this.name = "AdvisoryScoreError";
  }
}

/** The key's own outcome vocabulary (scoring.examplesVocabulary), plus `duplicate`, which is a
 *  property of a RUN rather than of a finding read on its own. */
export const OUTCOME = Object.freeze({
  TP: "tp",
  CONFABULATION: "confabulation",
  PARTIAL: "partial",
  REVIEW_REQUIRED: "review-required",
  FP: "fp",
  OUT_OF_SCOPE: "out-of-scope",
  NO_MATCH: "no-match",
  DUPLICATE: "duplicate",
});

// The three outcomes the key counts as false positives: an engaged entry answered with a wrong asserted
// correction, a bait entry claimed as a defect, and a finding that engages nothing at all.
const FALSE_POSITIVE_OUTCOMES = new Set([OUTCOME.CONFABULATION, OUTCOME.FP, OUTCOME.NO_MATCH]);

// The two outcomes a human resolves before a cell is published. A CONFABULATION is deliberately NOT
// here: adjudication step 3 hand-checks a false positive because it might be a real defect nobody
// planted, and a confabulation already engaged a planted entry, so that question cannot arise for it.
const PROVISIONAL_OUTCOMES = new Set([OUTCOME.REVIEW_REQUIRED, OUTCOME.NO_MATCH]);

const KEY_SCHEMA = "askit-seeded-defect-key/1";
const DEFAULT_MATCH_FIELDS = ["area", "file", "message", "recommendation", "evidence", "title"];
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_KEY_REL = "tests/fixtures/anti/seeded-defects/privacy-notice-toolkit.key.json";

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function readJson(file, what) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    throw new AdvisoryScoreError(`cannot read the ${what} at ${file}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new AdvisoryScoreError(`the ${what} at ${file} is not valid JSON: ${e.message}`);
  }
}

/** Load and validate a seeded-defect scoring key. An unknown schema is refused rather than scored
 *  against, because a number is only comparable when the key that produced it is named. */
export function loadKey(file) {
  const key = readJson(file, "scoring key");
  if (key?.schema !== KEY_SCHEMA) {
    throw new AdvisoryScoreError(`${file} is not a ${KEY_SCHEMA} document (schema: ${key?.schema ?? "absent"})`);
  }
  for (const field of ["keyVersion", "defects", "nonDefects", "outOfScope"]) {
    if (key[field] === undefined) throw new AdvisoryScoreError(`the scoring key at ${file} has no ${field}`);
  }
  return key;
}

/** Read an advisory result file (the dispatch-reviewer shape). */
export function loadAdvisory(file) {
  return readJson(file, "advisory result");
}

// ---------------------------------------------------------------------------
// matchText: the only text a pattern is ever tested against
// ---------------------------------------------------------------------------

/** The key writes its join as the JSON string "\\n", which decodes to a backslash and an n rather than
 *  to a newline. Every declared example separates the file from the message with a REAL newline and the
 *  key's gapClasses note is written in terms of lines, so the escape is resolved here. A join that is
 *  already a real separator passes through untouched. */
function joinOf(key) {
  const raw = key?.matchText?.join;
  if (typeof raw !== "string") return "\n";
  return raw.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");
}

/** Join the key's declared fields into the one string every pattern is tested against. Non-string and
 *  empty fields are dropped, so a scorer can never reach into the run's prose summary for credit. */
export function matchTextOf(finding, key) {
  const fields = Array.isArray(key?.matchText?.fields) ? key.matchText.fields : DEFAULT_MATCH_FIELDS;
  return fields
    .map((name) => finding?.[name])
    .filter((value) => typeof value === "string" && value.length > 0)
    .join(joinOf(key));
}

// ---------------------------------------------------------------------------
// The clause language: anyOf, allOf, none
// ---------------------------------------------------------------------------

const compiled = new Map();

function compile(pattern, flags) {
  const cacheKey = `${flags}::${pattern}`;
  let re = compiled.get(cacheKey);
  if (!re) {
    try {
      re = new RegExp(pattern, flags);
    } catch (e) {
      throw new AdvisoryScoreError(`the scoring key carries a pattern that does not compile: ${pattern} (${e.message})`);
    }
    compiled.set(cacheKey, re);
  }
  return re;
}

/** anyOf is satisfied by one match, allOf requires every member, none must not match at all, and every
 *  clause a rule carries has to hold. A rule with no anyOf and no allOf never matches: an empty rule is
 *  the key's way of saying "this entry has nothing to verify", not "everything matches". */
export function testRule(rule, text, flags = "i") {
  if (!rule || typeof rule !== "object") return false;
  const any = Array.isArray(rule.anyOf) ? rule.anyOf : null;
  const all = Array.isArray(rule.allOf) ? rule.allOf : null;
  const none = Array.isArray(rule.none) ? rule.none : null;
  if (!any && !all) return false;
  if (all && !all.every((p) => compile(p, flags).test(text))) return false;
  if (any && !(any.length > 0 && any.some((p) => compile(p, flags).test(text)))) return false;
  if (none && none.some((p) => compile(p, flags).test(text))) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Classification: one finding, read on its own
// ---------------------------------------------------------------------------

const result = (outcome, entryId = null, why = null) => ({ outcome, entryId, why });

/**
 * Classify one finding's matchText against the key. The precedence is the key's
 * scoring.confabulationRule.mechanics, and nothing here guesses:
 *
 *   more than one entry engaged      -> review-required
 *   a semantic entry engaged         -> review-required
 *   verification not required        -> tp (naming the pair IS the finding)
 *   confabulation only               -> confabulation  (a false positive AND a miss)
 *   correct only                     -> tp
 *   both                             -> review-required
 *   neither                          -> partial        (an honest unverified engagement)
 *   no entry, a bait entry engaged   -> fp
 *   no entry, an outOfScope rule     -> out-of-scope
 *   nothing at all                   -> no-match       (a provisional false positive)
 *
 * Satisfied-entry bookkeeping (duplicates, misses) belongs to scoreAdvisory, not here. The returned
 * entryId is the engaged entry's id, the bait or outOfScope rule's id, null when nothing engaged, or
 * the ids joined with "+" when a finding engaged several entries at once.
 */
export function classifyText(key, text) {
  const flags = key?.patternSyntax?.flags ?? "i";
  const engaged = (key.defects ?? []).filter((d) => testRule(d.match?.locate, text, flags));
  if (engaged.length > 1) {
    return result(OUTCOME.REVIEW_REQUIRED, engaged.map((d) => d.id).join("+"), "engages more than one defect entry");
  }
  if (engaged.length === 1) {
    const entry = engaged[0];
    if (entry.match.mode === "semantic") return result(OUTCOME.REVIEW_REQUIRED, entry.id, "semantic entry");
    if (entry.match.verification === "not-required") return result(OUTCOME.TP, entry.id);
    const correct = testRule(entry.match.correct, text, flags);
    const confabulated = testRule(entry.match.confabulation, text, flags);
    if (confabulated && !correct) return result(OUTCOME.CONFABULATION, entry.id);
    if (correct && !confabulated) return result(OUTCOME.TP, entry.id);
    if (correct && confabulated) return result(OUTCOME.REVIEW_REQUIRED, entry.id, "correct and confabulation both match");
    return result(OUTCOME.PARTIAL, entry.id);
  }
  const bait = (key.nonDefects ?? []).find((n) => testRule(n.match?.locate, text, flags));
  if (bait) return result(OUTCOME.FP, bait.id, "claims a planted non-defect");
  const outOfScope = (key.outOfScope ?? []).find((o) => testRule(o.rule, text, flags));
  if (outOfScope) return result(OUTCOME.OUT_OF_SCOPE, outOfScope.id);
  return result(OUTCOME.NO_MATCH, null, "engages nothing in the key");
}

/** classifyText over the finding's matchText. */
export function classifyFinding(key, finding) {
  return classifyText(key, matchTextOf(finding, key));
}

// ---------------------------------------------------------------------------
// Scoring one run
// ---------------------------------------------------------------------------

/** Pull the findings array out of an advisory result: the dispatch-reviewer `review.findings` shape, a
 *  bare `findings` key, or a bare array. Anything else is refused loudly. */
export function extractFindings(advisory) {
  const candidate = Array.isArray(advisory)
    ? advisory
    : Array.isArray(advisory?.review?.findings)
      ? advisory.review.findings
      : Array.isArray(advisory?.findings)
        ? advisory.findings
        : null;
  if (!candidate) {
    throw new AdvisoryScoreError("the advisory has no findings array (expected review.findings, findings, or a bare array)");
  }
  return candidate;
}

const ratio = (numerator, denominator) => (denominator === 0 ? null : numerator / denominator);

/**
 * Score one advisory result against one key.
 *
 * Precision is TP / (TP + FP) and recall is TP / planted defects. A CONFABULATION is appended to the
 * false positives and its entry is NOT added to the satisfied set, which is what produces the second
 * penalty (the miss) with no extra bookkeeping: it is never a true positive. An out-of-scope finding is
 * excluded from both formulas and reported as the run's noise share. Findings are processed in the
 * order the advisory lists them, so the partition is reproducible.
 *
 * @param {object|Array} advisory the advisory result (dispatch-reviewer shape)
 * @param {object} key a loaded seeded-defect scoring key
 * @param {{model?:string, effort?:string, runId?:string}} [opts] cell labels for the record
 */
export function scoreAdvisory(advisory, key, opts = {}) {
  if (!key || typeof key !== "object") throw new AdvisoryScoreError("scoreAdvisory needs a loaded scoring key");
  const defects = Array.isArray(key.defects) ? key.defects : [];
  const findings = extractFindings(advisory);
  const review = (!Array.isArray(advisory) && advisory?.review) || {};

  const satisfied = new Set();
  const rows = [];
  findings.forEach((finding, index) => {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
      throw new AdvisoryScoreError(`finding ${index} is not an object; a malformed advisory is refused, never silently skipped`);
    }
    const classified = classifyFinding(key, finding);
    let outcome = classified.outcome;
    let why = classified.why;
    if (outcome === OUTCOME.TP) {
      // First satisfying finding wins. A later one restates a real defect somewhere else, which is
      // thoroughness rather than noise, so it is collapsed and counted neither way.
      if (satisfied.has(classified.entryId)) {
        outcome = OUTCOME.DUPLICATE;
        why = "the entry was already satisfied by an earlier finding";
      } else {
        satisfied.add(classified.entryId);
      }
    }
    rows.push({
      index,
      outcome,
      entryId: classified.entryId,
      why: why ?? null,
      file: typeof finding.file === "string" ? finding.file : null,
      provenance: typeof finding.provenance === "string" ? finding.provenance : null,
      provisional: PROVISIONAL_OUTCOMES.has(outcome),
    });
  });

  const tally = (outcome) => rows.filter((r) => r.outcome === outcome).length;
  const truePositives = tally(OUTCOME.TP);
  const confabulations = tally(OUTCOME.CONFABULATION);
  const baitHits = tally(OUTCOME.FP);
  const noMatch = tally(OUTCOME.NO_MATCH);
  const outOfScope = tally(OUTCOME.OUT_OF_SCOPE);
  const falsePositives = confabulations + baitHits + noMatch;
  const misses = defects.map((d) => d.id).filter((id) => !satisfied.has(id));

  const precision = ratio(truePositives, truePositives + falsePositives);
  const recall = ratio(truePositives, defects.length);
  const recallByMisses = ratio(truePositives, truePositives + misses.length);
  const verified = rows.filter((r) => r.provenance === "verified");
  const semantic = defects.filter((d) => d.match?.mode === "semantic").length;
  const byId = new Map(defects.map((d) => [d.id, d]));
  const worklist = rows
    .filter((r) => r.provisional)
    .map((r) => {
      const entry = byId.get(r.entryId);
      return {
        index: r.index,
        entryId: r.entryId,
        file: r.file,
        reason: r.outcome === OUTCOME.NO_MATCH
          ? "engages nothing in the key: confirm the false positive, promote it to a new entry, or record it out of scope (adjudication step 3)"
          : r.why ?? "awaiting adjudication",
        // Adjudication step 2 resolves an item "against the fixture file named in the entry's
        // locations", so the item carries them rather than making a human look the entry up.
        locations: [...new Set((entry?.locations ?? []).map((l) => l.file))],
        // A semantic entry's correct and confabulation sets are hints for the human, never an
        // auto-credit rule, so they travel with the worklist item and nowhere else.
        hints: entry?.match?.mode === "semantic"
          ? {
            tpCriterion: entry.match.tpCriterion ?? null,
            confabulationCriterion: entry.match.confabulationCriterion ?? null,
            correct: entry.match.correct?.anyOf ?? [],
            confabulation: entry.match.confabulation?.anyOf ?? [],
          }
          : null,
      };
    });

  return {
    keyVersion: key.keyVersion,
    fixture: key.fixture?.path ?? null,
    cell: {
      model: opts.model ?? (typeof review.model === "string" ? review.model : null),
      effort: opts.effort ?? (typeof review.effort === "string" ? review.effort : null),
    },
    runId: opts.runId ?? null,
    counts: {
      findings: rows.length,
      truePositives,
      falsePositives,
      misses: misses.length,
      confabulations,
      partials: tally(OUTCOME.PARTIAL),
      reviewRequired: tally(OUTCOME.REVIEW_REQUIRED),
      baitHits,
      noMatch,
      outOfScope,
      duplicates: tally(OUTCOME.DUPLICATE),
      verified: verified.length,
      plantedDefects: defects.length,
    },
    precision,
    recall,
    recallByMisses,
    // TP/(TP+misses) and TP/defects are the same number whenever the duplicate rule was applied
    // correctly, so a disagreement is a harness defect and is surfaced rather than smoothed over.
    recallAgrees: sameNumber(recall, recallByMisses),
    // A semantic entry can never be auto-credited, so this is the highest recall an auto score can
    // report on this key. Reading a run's recall against it is the difference between "the model
    // missed one" and "no auto score can catch that one".
    recallAutoCeiling: ratio(defects.length - semantic, defects.length),
    noiseShare: ratio(outOfScope, rows.length),
    falseVerifiedRate: ratio(verified.filter((r) => FALSE_POSITIVE_OUTCOMES.has(r.outcome)).length, verified.length),
    satisfied: [...satisfied],
    misses,
    findings: rows,
    worklist,
    provisional: worklist.length > 0,
  };
}

function sameNumber(a, b) {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < Number.EPSILON;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const pair = (value) => (value === null ? " n/a" : value.toFixed(2));
const pad = (text, width) => String(text).padEnd(width);

/** The human-readable partition. Deterministic by construction: it carries no timestamp and no absolute
 *  path, so the same score always formats to the same bytes. */
export function formatScoreReport(score) {
  const c = score.counts;
  const cell = [score.cell.model ?? "unknown model", score.cell.effort ?? "unknown effort"].join(" / ");
  const lines = [];
  lines.push(`advisory-score  key ${score.keyVersion}  cell ${cell}${score.runId ? `  run ${score.runId}` : ""}`);
  if (score.fixture) lines.push(`  fixture         ${score.fixture}`);
  lines.push(`  findings        ${c.findings}  (${c.truePositives + c.falsePositives} scored claims, ${c.outOfScope} excluded as out of scope)`);
  lines.push("");
  lines.push(`  ${pad("tp", 18)}${pad(c.truePositives, 8)}${pad("confabulation", 18)}${c.confabulations}`);
  lines.push(`  ${pad("partial", 18)}${pad(c.partials, 8)}${pad("bait fp", 18)}${c.baitHits}`);
  lines.push(`  ${pad("review-required", 18)}${pad(c.reviewRequired, 8)}${pad("no-match", 18)}${c.noMatch}`);
  lines.push(`  ${pad("duplicate", 18)}${pad(c.duplicates, 8)}${pad("out of scope", 18)}${c.outOfScope}`);
  lines.push("");
  lines.push(`  precision       ${pair(score.precision)}   (${c.truePositives} tp / ${c.truePositives + c.falsePositives} scored claims)`);
  lines.push(`  recall          ${pair(score.recall)}   (${c.truePositives} tp / ${c.plantedDefects} planted defects)`);
  lines.push(`  auto ceiling    ${pair(score.recallAutoCeiling)}   (a semantic entry can never be auto-credited)`);
  lines.push(`  noise share     ${pair(score.noiseShare)}   (${c.outOfScope} of ${c.findings} findings excluded from both formulas)`);
  lines.push(`  false-verified  ${pair(score.falseVerifiedRate)}   (findings marked verified whose claim was wrong, of ${c.verified} marked verified)`);
  if (!score.recallAgrees) {
    lines.push(`  WARNING: TP/(TP+misses) is ${pair(score.recallByMisses)}, which disagrees with TP/planted. The duplicate rule was applied wrongly.`);
  }
  lines.push("");
  lines.push(`  misses          ${score.misses.length ? score.misses.join(", ") : "none"}`);
  if (score.provisional) {
    lines.push("");
    lines.push(`  PROVISIONAL: ${score.worklist.length} item(s) await adjudication; this cell may not be published as final.`);
    for (const item of score.worklist) {
      lines.push(`    #${item.index}  ${item.entryId ?? "unmatched"}  ${item.reason}${item.file ? `  (${item.file})` : ""}`);
    }
  }
  lines.push("");
  lines.push("  Scored from the advisory file and the key alone. No model was dispatched and no check was run.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// The thin CLI
// ---------------------------------------------------------------------------

const USAGE = `advisory-score - score an advisory result against a seeded-defect key (F3 R-AQ-2)

  node scripts/lib/advisory-score.mjs <result.json> [key.json] [options]

Options
  --json            print the whole score object instead of the report
  --model <name>    label the cell (defaults to the advisory's review.model)
  --effort <level>  label the cell (defaults to the advisory's review.effort)
  --run-id <id>     the eval-run id this score belongs beside in the record

The key defaults to ${DEFAULT_KEY_REL}.

This scores a run that already exists: it dispatches no model, runs no check, and reads nothing from the
graded tree. Scoring the same result against the same key twice yields the identical partition and the
identical pair. Exit 0 means the run was scored (a bad score is still a score); exit 2 is a refusal.`;

const VALUE_FLAGS = new Set(["--model", "--effort", "--run-id", "--key"]);

function parseArgs(argv) {
  const out = { positionals: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") out.json = true;
    else if (VALUE_FLAGS.has(arg)) {
      const value = argv[++i];
      if (value === undefined) throw new AdvisoryScoreError(`${arg} needs a value`);
      out[arg.slice(2)] = value;
    } else if (arg.startsWith("--")) throw new AdvisoryScoreError(`unknown flag ${arg}`);
    else out.positionals.push(arg);
  }
  return out;
}

function main(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const args = parseArgs(argv);
  const [resultPath, keyPath] = args.positionals;
  if (!resultPath) throw new AdvisoryScoreError("no advisory result given");
  const key = loadKey(keyPath ?? args.key ?? path.join(REPO_ROOT, DEFAULT_KEY_REL));
  const advisory = loadAdvisory(resultPath);
  const score = scoreAdvisory(advisory, key, { model: args.model, effort: args.effort, runId: args["run-id"] });
  console.log(args.json ? JSON.stringify(score, null, 2) : formatScoreReport(score));
  return 0;
}

if (process.argv[1]?.endsWith("advisory-score.mjs")) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(e instanceof AdvisoryScoreError ? `REFUSED: ${e.message}` : `advisory-score FAILED: ${e.stack ?? e.message}`);
    process.exit(2);
  }
}
