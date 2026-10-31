// what-it-is:   the E62 evidence - what an arbitrarily old Standard pin buys a plugin
// what-it-does: grades tests/fixtures/audit-corpus/pin-abuse at its pinned 0.9 and at three other pin
//               values, and pins what the gate does with each
// why:          E62 (the pin has no floor) said its central figure came from a fixture "this repository
//               cannot currently rebuild". That made the finding a citation of someone else's run. This
//               file rebuilds it in-tree, so the number is ours and any future floor can be shown to work
// used-by:      npm test; tests/fixtures/audit-corpus/pin-abuse is the tree it grades
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runGate } from "../../scripts/check.mjs";
import { evaluate } from "../../scripts/evaluate.mjs";
import { MAX_LINES } from "../../scripts/checks/instruction-budget.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const PIN_ABUSE = path.join(FIXTURES, "audit-corpus/pin-abuse");

/** The line ending the checked-out tree actually uses. Windows checkouts get CRLF and CI's Linux legs
 *  get LF, and a file written into the copy must match its neighbours rather than assume either. */
function eolOf(dir) {
  return readFileSync(path.join(dir, "library.json"), "utf8").includes("\r\n") ? "\r\n" : "\n";
}

/** A throwaway copy of the fixture, so a pin rewrite never touches the tracked tree. */
function cloneWithPin(value) {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), "pin-floor-")), "plugin");
  cpSync(PIN_ABUSE, dir, { recursive: true });
  const manifest = path.join(dir, "library.json");
  const eol = eolOf(dir);
  const lib = JSON.parse(readFileSync(manifest, "utf8"));
  lib.standard = value;
  writeFileSync(manifest, (JSON.stringify(lib, null, 2) + "\n").replace(/\r?\n/g, eol));
  return dir;
}

const waivedRequirements = (g) =>
  [...new Set(g.findings.filter((f) => f.downgraded).map((f) => f.reqId))].sort();

/**
 * WHAT THIS FIXTURE IS, AND WHY IT IS PINNED RATHER THAN FIXED.
 *
 * `pin-abuse` is the audit's `09-pin-abuse` rebuilt in-tree: the Potemkin Gold tree, declared Advanced,
 * pinned to `"standard": "0.9"`, and then made to violate eight requirements introduced after 0.9. Every
 * one of those violations is downgraded to a warning by the pin alone, so the gate passes it.
 *
 * ONE VIOLATION FROM THE AUDIT'S TREE IS NOT CHECKED IN: the broken `docs/reference/diagram.md` that
 * trips `U12` (mermaid-valid). `U12` scans a repository repo-wide, `tests/` is not in `SKIP_DIRS`, and a
 * committed broken diagram therefore fails THIS repository's own gate - measured, not argued: adding it
 * moved `node scripts/check.mjs .` from Advanced/0 errors to None/2 errors. The repo's own `U12` tests
 * write their bad blocks into a tmpdir for the same reason. The ninth waived check is reproduced the
 * same way below, in a copy, which is where the audit's fourteen-warning figure comes back exactly.
 *
 * These are characterization tests. They assert what the gate DOES today. The remedy - bounding how far
 * back a pin may reach - is D-02 (whether a stale pin surfaces as a debt figure on the badge), which is
 * downstream of the deferred D-01 (a health score beside the tier). Both are recorded under E62 (the pin
 * has no floor) in docs/internal/backlog/enhancements.md. When a floor lands, REWRITE these assertions;
 * do not force this file green.
 */
test("E62 (the pin has no floor): a pin of 0.9 waives eight requirements and the gate still passes", () => {
  const g = runGate(PIN_ABUSE);
  const e = evaluate(PIN_ABUSE);

  assert.equal(e.tier, "advanced", "the plugin keeps the tier it declared");
  assert.equal(g.errorCount, 0);
  assert.equal(g.exitCode, 0, "the gate passes a plugin that violates eight of its requirements");
  assert.equal(g.warnCount, 11);
  assert.equal(g.findings.filter((f) => f.downgraded).length, 11,
    "every warning here is a downgrade, not a check that is advisory by nature");
  assert.deepEqual(waivedRequirements(g), ["G10", "G7", "G8", "G9", "U14", "U15", "U16", "U17"]);
});

test("E62 (the pin has no floor): with the mermaid violation restored, the audit's nine and fourteen come back", () => {
  const dir = cloneWithPin("0.9");
  writeFileSync(path.join(dir, "docs/reference/diagram.md"),
    ["---", 'title: "Diagram"', 'description: "A diagram page for the pin-abuse fixture"',
      "audience: both", "level: beginner", "---", "", "```mermaid", "notadiagram [[", "```", ""]
      .join(eolOf(dir)));

  const g = runGate(dir);
  assert.equal(evaluate(dir).tier, "advanced");
  assert.equal(g.exitCode, 0);
  assert.equal(g.errorCount, 0);
  // The audit's `09-pin-abuse` recorded "0 error(s), 14 warning(s)" across nine requirements.
  assert.equal(g.warnCount, 14);
  assert.deepEqual(waivedRequirements(g), ["G10", "G7", "G8", "G9", "U12", "U14", "U15", "U16", "U17"]);
});

/**
 * THE CONTROL, AND IT IS THE POINT OF THE ENTRY.
 *
 * The same bytes, pinned to the Standard the toolkit actually ships, fail. Nothing about the plugin
 * changed; the declared pin is the whole difference between exit 0 and exit 1. (`G4` joins the error
 * list in every one of these cases because `INDEX.md` is generated and records the pin, so rewriting the
 * pin drifts it. That is an artifact of rewriting the manifest in a copy, not a finding about pins.)
 */
test("E62 (the pin has no floor): the same tree pinned at the current Standard fails the gate", () => {
  const dir = cloneWithPin("0.16");
  const g = runGate(dir);
  assert.equal(evaluate(dir).tier, "none");
  assert.equal(g.exitCode, 1);
  assert.equal(g.errorCount, 12);
  assert.deepEqual(waivedRequirements(g), [], "a current pin waives nothing");
});

test("E62 (the pin has no floor): a garbage pin value grades at FULL strength, so it fails safe", () => {
  const dir = cloneWithPin("banana");
  const g = runGate(dir);
  assert.equal(evaluate(dir).tier, "none");
  assert.equal(g.exitCode, 1);
  assert.equal(g.errorCount, 12);
  assert.deepEqual(waivedRequirements(g), [],
    "an unparseable pin must not buy a single downgrade");
});

test("E62 (the pin has no floor): a pin AHEAD of the toolkit grades at full strength too", () => {
  const dir = cloneWithPin("1.0");
  const g = runGate(dir);
  assert.equal(evaluate(dir).tier, "none");
  assert.equal(g.exitCode, 1);
  assert.equal(g.errorCount, 12);
  assert.deepEqual(waivedRequirements(g), [],
    "a pin the toolkit has never shipped must not hold anything back");
});

// --- W6 finding 2 (pre-merge adversarial review): the currency category's waivedCount must count
// findings the PIN actually waived, never every live warning. Before this test, every warning
// pin-abuse's clone carried HAPPENED to be waived by the pin (11 of 11), so a mutation at
// scripts/lib/health-score.mjs's currencyCategory() that counted warnings instead of `f.ceiling != null`
// would still read 11 and this suite would not notice. This variant adds ONE warning the pin cannot
// touch - U7 is `since: "0.x"` (introduced at the baseline, never gated by any version constraint), so
// an over-budget skill body warns regardless of the pin - making warnCount (12) and waivedCount (11)
// provably different numbers, so a mutation that conflates them must turn this test red.

function cloneWithOverBudgetSkill() {
  const dir = cloneWithPin("0.9"); // same pin the tracked fixture already carries - nothing about the pin changes here
  const eol = eolOf(dir);
  const skillPath = path.join(dir, "skills/pg-skill-one/SKILL.md");
  const frontmatter = [
    "---",
    'name: "pg-skill-one"',
    'description: "Creates output for things. Use when the user asks for things."',
    "metadata:",
    '  version: "0.1.0"',
    "  tier: universal",
    "  status: active",
    '  chain: "pg-agent-one"',
    "---",
    "",
  ].join(eol);
  // MAX_LINES + 1 plain body lines - well over the budget, and nowhere near any Standard-version
  // constraint (U7's `since` is the baseline sentinel "0.x", so no pin can ever hold this back).
  const body = Array.from({ length: MAX_LINES + 1 }, (_, i) => `Step ${i + 1}: do the next thing.`).join(eol) + eol;
  writeFileSync(skillPath, frontmatter + body);
  return dir;
}

test("W6 finding 2: a warning the pin cannot waive (U7, over-budget) makes warnCount and the currency category's waivedCount provably different", () => {
  const dir = cloneWithOverBudgetSkill();
  const g = runGate(dir);
  const e = evaluate(dir);

  // The baseline: pin-abuse's own 11 pin-waived warnings, unchanged by adding a 12th that is NOT one.
  assert.equal(g.errorCount, 0);
  assert.equal(g.exitCode, 0);
  assert.equal(g.warnCount, 12, "11 pin-waived warnings plus the new U7 over-budget warning");
  assert.equal(
    g.findings.filter((f) => f.reqId === "U7" && f.effectiveSeverity === "warn").length,
    1,
    "the new over-budget skill must fire U7 exactly once"
  );
  const u7 = g.findings.find((f) => f.reqId === "U7" && f.effectiveSeverity === "warn");
  assert.equal(u7.ceiling, null, "U7 is since: \"0.x\" - no pin can ever hold it back, so it is never waived");

  assert.equal(e.health.categories.currency.state, "scored");
  assert.equal(
    e.health.categories.currency.measurement.waivedCount,
    11,
    "waivedCount must stay exactly 11 (ceiling != null) - the 12th warning is real, not pin-waived"
  );
});
