import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { partitionCraftFindings, phaseTwoEligible, applySafeFixes, toReviewAdvisory } from "../../scripts/lib/craft-review.mjs";

// End to end over the REAL seams the askit-build-skill improve-mode phase 2 uses: the evaluate.mjs CLI
// for the gate and for the durable advisory render, and craft-review.mjs for the partition and the
// consent-gated apply. The fixture is gate-clean and craft-defective at the same time, which is the
// whole premise of phase 2: it runs only after the deterministic gate has nothing left to say.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CRAFT = path.join(ROOT, "tests/fixtures/anti/craft-defects/summarize-doc");

function runEvaluate(args) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(ROOT, "scripts/evaluate.mjs"), ...args], { encoding: "utf8" });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

/** The gate result the skill reads in phase 1, through the CLI's own --json output and exit code. */
function gateResult(dir) {
  const r = runEvaluate([dir, "--json"]);
  return { exitCode: r.code, ...JSON.parse(r.stdout).summary };
}

// What the askit-reviewer emits against references/skill-craft-rubric.md for this fixture: one
// mechanical defect the deterministic spine cannot see (U6 does not scan examples/) and one judgment
// defect it cannot see either (U5 scores this description 1.00 while its trigger names nothing).
const CRAFT_FINDINGS = [
  {
    dimension: "reference structure",
    category: "broken-link",
    severity: "major",
    file: "examples/basic.md",
    message: "the example links to ../SKILLS.md, which does not resolve; the file is SKILL.md",
    provenance: "objective",
    fix: { kind: "replace", from: "(../SKILLS.md)", to: "(../SKILL.md)" },
  },
  {
    dimension: "description and trigger quality",
    category: "trigger-rewrite",
    severity: "major",
    file: "SKILL.md",
    message: "the trigger \"when the user asks about the document thing\" names no phrase a user would actually type; U5 scores this description 1.00, so the deterministic scorer cannot see the gap",
    provenance: "house-preference",
  },
];

test("phase 2 end to end: offered on a clean gate, SAFE apply fixes only the link, the judgment finding is reported and untouched, and the gate re-runs clean", () => {
  // The copy keeps the fixture's directory NAME, or U4 (name-matches-dir) fires on the temp directory.
  const base = mkdtempSync(path.join(tmpdir(), "askit-craft-e2e-"));
  const dir = path.join(base, path.basename(CRAFT));
  try {
    cpSync(CRAFT, dir, { recursive: true });
    const skillPath = path.join(dir, "SKILL.md");
    const examplePath = path.join(dir, "examples/basic.md");
    const skillBefore = readFileSync(skillPath, "utf8");

    // 1. Phase 1: the deterministic gate is clean, so phase 2 may be OFFERED.
    const before = gateResult(dir);
    assert.equal(before.exitCode, 0, "the fixture passes the deterministic gate");
    assert.equal(before.errors, 0);
    assert.equal(before.warns, 0);
    const offer = phaseTwoEligible(before);
    assert.equal(offer.eligible, true, "phase 2 is offered");

    // 2. The partition: one SAFE, one JUDGMENT.
    const { safe, judgment } = partitionCraftFindings(CRAFT_FINDINGS);
    assert.deepEqual(safe.map((f) => f.category), ["broken-link"]);
    assert.deepEqual(judgment.map((f) => f.category), ["trigger-rewrite"]);

    // 3. The consent-gated apply touches ONLY the SAFE finding. Declining writes nothing at all.
    const declined = applySafeFixes(dir, safe, { consent: false });
    assert.equal(declined.applied.length, 0, "declining consent applies nothing");
    assert.ok(readFileSync(examplePath, "utf8").includes("(../SKILLS.md)"), "the defect survives a declined offer");

    const applied = applySafeFixes(dir, safe, { consent: true });
    assert.equal(applied.applied.length, 1);
    assert.equal(applied.skipped.length, 0);
    const exampleAfter = readFileSync(examplePath, "utf8");
    assert.ok(exampleAfter.includes("(../SKILL.md)"), "the broken link is fixed");
    assert.ok(!exampleAfter.includes("(../SKILLS.md)"), "the typo is gone");
    assert.equal(readFileSync(skillPath, "utf8"), skillBefore, "the JUDGMENT finding's file is byte-identical: no meaning was edited");

    // 4. The findings render through the existing advisory path as a durable artifact, and BOTH
    //    dispositions appear there: the judgment finding is reported, not silently dropped.
    const advPath = path.join(dir, "craft-advisory.json");
    const mdPath = path.join(dir, "craft-review.md");
    writeFileSync(advPath, JSON.stringify(toReviewAdvisory(CRAFT_FINDINGS, { model: "claude-opus-4-8", effort: "high", date: "2026-07-26" }), null, 2));
    const render = runEvaluate([dir, "--report=review", "--advisory", advPath, "--format=md", "--out", mdPath]);
    assert.equal(render.code, 0, "rendering the advisory does not change the gate exit code");
    assert.ok(existsSync(mdPath), "the durable craft-review artifact is written");
    const md = readFileSync(mdPath, "utf8");
    assert.match(md, /\[SAFE\]/);
    assert.match(md, /\[JUDGMENT\].*names no phrase a user would actually type/);
    assert.match(md, /never moves the grade or the gate exit code/, "the report labels the layer advisory");

    // 5. The gate re-runs clean after the apply.
    const after = gateResult(dir);
    assert.deepEqual(after, before, "the gate verdict is identical before and after the craft pass");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("phase 2 is NOT offered while the deterministic gate is red", () => {
  const base = mkdtempSync(path.join(tmpdir(), "askit-craft-red-"));
  const dir = path.join(base, path.basename(CRAFT));
  try {
    cpSync(CRAFT, dir, { recursive: true });
    const p = path.join(dir, "SKILL.md");
    writeFileSync(p, readFileSync(p, "utf8").replace("(examples/basic.md)", "(examples/gone.md)"));
    const gate = gateResult(dir);
    assert.equal(gate.exitCode, 1, "U6 fires on the SKILL.md body");
    const offer = phaseTwoEligible(gate);
    assert.equal(offer.eligible, false, "phase 2 is withheld until phase 1 is clean");
    assert.match(offer.reason, /gate is not clean/i);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
