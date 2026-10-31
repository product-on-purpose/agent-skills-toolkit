// what-it-is:   coverage for tests/fixtures/audit-corpus-labelled/inventory.json (W6 finding 7,
//               pre-merge adversarial review of ADR 0063).
// what-it-does: three things. (1) every `materialized` entry's claimed path actually exists on disk,
//               and nothing on disk is undeclared. (2) the label tally inventory.json produces (positive
//               and negative LABELLED trees per category, excluding the two hold-out fixtures and every
//               `deserves: null` tree, exactly as docs/reference/health-score.md's table does) matches
//               scripts/lib/health-calibration.mjs's CATEGORY_LABEL_COUNTS - so the two can never drift
//               silently apart. (3) a REAL, measured confusion count over the trees actually materialized
//               on disk: for each category with an available positive, does measuring the tree the way
//               ADV4/ADV3/currencyCategory already does agree with its label? This is the thing finding
//               6 asked for that CATEGORY_LABEL_COUNTS alone cannot answer: that constant counts how many
//               LABELLED examples exist, never whether the measurement agrees with the label on any one
//               of them.
// why:          finding 6 (pre-merge review): "label counts are not separation measurements" -
//               docs/reference/health-score.md used to call CATEGORY_LABEL_COUNTS's tally "confusion
//               counts", which is the wrong name for a count of labelled examples. This file computes
//               the real thing for every tree now materialized, and reports what it found exactly as
//               measured - including one surprising result (11-malformed-grader-config, a `deserves:
//               true` tree, legitimately reads as a substance FALSE POSITIVE, because its skill bodies
//               happen to be the same "Do nothing." placeholder potemkin-gold uses: the audit's shared
//               filler content, not a new defect ADV4 introduces). Finding 6 also asked that this be
//               surfaced rather than hidden if a category penalises a tree it shouldn't.
// used-by:      npm test; docs/reference/health-score.md's "Confusion counts" section quotes these
//               numbers directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { evaluate } from "../../scripts/evaluate.mjs";
import { CATEGORY_LABEL_COUNTS } from "../../scripts/lib/health-calibration.mjs";
import { buildSecretInSkillAndHook, cleanup } from "../fixtures/audit-corpus-labelled/17-secret-in-skill-and-hook.builder.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LABELLED_DIR = path.join(REPO, "tests/fixtures/audit-corpus-labelled");
const INVENTORY = JSON.parse(readFileSync(path.join(LABELLED_DIR, "inventory.json"), "utf8"));

// The two falsifiable-test fixtures: held out of every count, per ADR 0063 sec 4 ("to avoid
// calibrating the cut points to the test that grades them") - already tracked under
// tests/fixtures/audit-corpus/, not this directory.
const HOLD_OUTS = new Set(["01-potemkin-gold", "09-pin-abuse"]);
// Pin-state variants of the currency hold-out, excluded from calibration for the same reason the
// hold-out itself is (ADR 0063 sec 4: "test the pin states ... rather than a threshold") - see each
// one's own `justification` in inventory.json.
const EXCLUDED_VARIANTS = new Set(["09b-pin-garbage", "09c-pin-sentinel", "09d-pin-future"]);
const CATEGORIES = ["substance", "budget", "portability", "security", "currency"];

function resolveTreePath(tree) {
  if (!tree.path) return null;
  if (tree.materialized === "builder") return null; // built at test time, not a static path
  return path.isAbsolute(tree.path) || tree.path.startsWith("tests/fixtures/audit-corpus/")
    ? path.join(REPO, tree.path)
    : path.join(LABELLED_DIR, tree.path);
}

// --- (1) every declared path is real, and nothing on disk is undeclared --------------------------

test("inventory: every materialized tree's declared path exists on disk", () => {
  for (const tree of INVENTORY.trees) {
    if (tree.materialized !== true) continue;
    const abs = resolveTreePath(tree);
    assert.ok(abs, `${tree.id} is materialized but has no path`);
    assert.ok(existsSync(abs), `${tree.id} declares ${tree.path} but nothing exists there`);
  }
});

test("inventory: every non-materialized tree declares no path, and the builder tree names a real builder file", () => {
  for (const tree of INVENTORY.trees) {
    if (tree.materialized === false) assert.equal(tree.path, null, `${tree.id} is not materialized but declares a path`);
    if (tree.materialized === "builder") assert.ok(existsSync(path.join(REPO, tree.path)), `${tree.id}'s builder file is missing`);
  }
});

// --- (2) the label tally agrees with health-calibration.mjs's pre-committed constant ---------------

test("inventory's label tally matches health-calibration.mjs's CATEGORY_LABEL_COUNTS, for every category", () => {
  const tally = {};
  for (const c of CATEGORIES) tally[c] = { positives: 0, negatives: 0 };
  for (const tree of INVENTORY.trees) {
    if (HOLD_OUTS.has(tree.id) || EXCLUDED_VARIANTS.has(tree.id) || tree.deserves === null) continue;
    if (tree.deserves === true) {
      // ADR 0063 sec 4 / health-score.md: "the seven `deserves: true` trees are negatives for every
      // category" - a clean tree is evidence against EVERY category's signal, not just the one(s)
      // its own (nonexistent) undeserving reason would have named.
      for (const c of CATEGORIES) tally[c].negatives++;
    } else {
      for (const c of tree.categories) if (tally[c]) tally[c].positives++;
    }
  }
  assert.deepEqual(tally, CATEGORY_LABEL_COUNTS, "inventory.json and health-calibration.mjs must count the same labelled trees");
});

// --- (3) real, measured confusion data over the trees actually materialized on disk ----------------
//
// SHOWN FAILING FIRST (the method, not a specific line): before inventory.json and this file existed,
// "how many labelled negatives does ADV4 actually agree with" was not a question this repository could
// answer at all - CATEGORY_LABEL_COUNTS only ever counted LABELS, never measurements. There was no
// code to put a mutation against, so the proof here is that every assertion below is a REAL measured
// value (re-run `node _local/_scratch...` by hand against a reverted adv4-substance.mjs and the first
// assertion below changes), not a value copied from the categories table.

test("substance: the one materialized positive (03-description-gaming) is correctly flagged", () => {
  const r = evaluate(path.join(LABELLED_DIR, "03-description-gaming"));
  const m = r.health.categories.substance.measurement;
  assert.ok(m.flaggedCount > 0, "a true positive: this tree's gamed descriptions must be caught");
});

test("substance: 02-excellent-orphan (deserves: true) is a correctly-unflagged negative", () => {
  const r = evaluate(path.join(LABELLED_DIR, "02-excellent-orphan"));
  assert.equal(r.health.categories.substance.measurement.flaggedCount, 0, "a true negative: real skills must not be flagged");
});

test("substance: 11-malformed-grader-config (deserves: true) is a MEASURED false positive, reported not hidden", () => {
  // Its `deserves: true` label is about the tree's own undeserving reason (an unparseable
  // askit.config.json, an OPERATOR defect never charged to the plugin) - its skill bodies, inherited
  // from the audit's shared placeholder content, are the same "Do nothing." text potemkin-gold uses.
  // ADV4 has no way to know the fixture's INTENDED point was something else; it reads the body it was
  // given, correctly, and flags it. Finding 6 asked that a category penalising a tree it should not
  // be reported rather than smoothed over - this is that report, falsifiable: if a future ADV4 change
  // stops flagging "Do nothing." bodies, this assertion goes red and must be revisited deliberately.
  const r = evaluate(path.join(LABELLED_DIR, "11-malformed-grader-config"));
  const substance = r.health.categories.substance;
  assert.equal(substance.measurement.flaggedCount, substance.componentCount, "MEASURED: every skill in this tree reads as placeholder content, a false positive against its own deserves:true label");
});

test("security: the builder-reproduced positive (17-secret-in-skill-and-hook) is correctly flagged", () => {
  const dir = buildSecretInSkillAndHook();
  try {
    const r = evaluate(dir);
    const m = r.health.categories.security.measurement;
    assert.equal(m.flaggedFileCount, m.scannedFileCount, "a true positive: both carrier files must be flagged");
    assert.ok(
      r.advisoryFindings.some((f) => f.advisoryId === "ADV3" && f.key === "pipe-to-shell-curl" && f.file === "hooks/hooks.json"),
      "the HOOK half of this tree's name must itself be the carrier flagged, not only the skill",
    );
  } finally {
    cleanup(dir);
  }
});

test("security: both materialized negatives (02, 11) are correctly unflagged", () => {
  for (const id of ["02-excellent-orphan", "11-malformed-grader-config"]) {
    const r = evaluate(path.join(LABELLED_DIR, id));
    assert.equal(r.health.categories.security.measurement.flaggedFileCount, 0, `${id}: a true negative for security`);
  }
});

test("budget and portability: no materialized positive exists (04-budget-gaming is not on disk), but both materialized negatives are correctly unflagged", () => {
  for (const id of ["02-excellent-orphan", "11-malformed-grader-config"]) {
    const r = evaluate(path.join(LABELLED_DIR, id));
    assert.equal(r.health.categories.budget.measurement.flaggedCount, 0, `${id}: a true negative for budget`);
    assert.equal(r.health.categories.portability.measurement.flaggedCount, 0, `${id}: a true negative for portability`);
  }
});

test("currency: the one materialized positive (the tracked pin-abuse hold-out) shows debt; an unpinned negative reports not-applicable rather than a false fire", () => {
  const abused = evaluate(path.join(REPO, "tests/fixtures/audit-corpus/pin-abuse"));
  assert.ok(abused.health.categories.currency.measurement.minorsBehind > 0, "a true positive: the 0.9 pin must show debt");
  // 02-excellent-orphan has no library.json at all (the manifest's own note), so currency is
  // not-applicable - never a clean "0 minors behind" true negative, because there is no pin to measure.
  const orphan = evaluate(path.join(LABELLED_DIR, "02-excellent-orphan"));
  assert.equal(orphan.health.categories.currency.state, "not-applicable");
  assert.equal(orphan.health.categories.currency.reason, "unpinned");
});
