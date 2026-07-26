import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  SAFE_CATEGORIES,
  SAFE_FRONTMATTER_FIELDS,
  MAX_SAFE_EDIT_CHARS,
  classifyCraftFinding,
  partitionCraftFindings,
  phaseTwoEligible,
  applySafeFixes,
  toReviewAdvisory,
} from "../../scripts/lib/craft-review.mjs";
import { evaluate, applyAdvisory } from "../../scripts/evaluate.mjs";
import { gateExitFromFindings } from "../../scripts/check.mjs";
import { renderMarkdown } from "../../scripts/lib/report-render.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(ROOT, "tests/fixtures");
// A skill the DETERMINISTIC gate passes (0 errors, 0 warnings) that a craft review still has real
// findings about: a dangling link in examples/ (U6 scans SKILL.md and references/ only) and a
// well-formed description whose trigger names nothing a user would type (U5 scores it 1.00).
const CRAFT = path.join(FIXTURES, "anti/craft-defects/summarize-doc");

// ---------------------------------------------------------------------------------------------
// The seeded finding set. These are real-shaped: the fields are what the askit-reviewer emits
// against skills/askit-build-skill/references/skill-craft-rubric.md.
// ---------------------------------------------------------------------------------------------

const SAFE_LINK = {
  dimension: "reference structure",
  category: "broken-link",
  severity: "major",
  file: "examples/basic.md",
  message: "the link [the authoring steps](../SKILLS.md) does not resolve; the file is SKILL.md",
  provenance: "objective",
  fix: { kind: "replace", from: "(../SKILLS.md)", to: "(../SKILL.md)" },
};

const SAFE_FRONTMATTER = {
  dimension: "description and trigger quality",
  category: "missing-frontmatter-field",
  severity: "minor",
  file: "SKILL.md",
  message: "frontmatter declares no metadata.tier; Bronze components declare universal",
  provenance: "house-preference",
  fix: { kind: "add-frontmatter-field", field: "metadata.tier", value: "universal" },
};

const SAFE_FORMATTING = {
  dimension: "instruction clarity",
  category: "formatting",
  severity: "minor",
  file: "SKILL.md",
  message: "the Steps heading is missing the space after the hashes, so it renders as body text",
  provenance: "objective",
  fix: { kind: "replace", from: "##Steps", to: "## Steps" },
};

const JUDGMENT_INSTRUCTION = {
  dimension: "instruction clarity",
  category: "instruction-rewrite",
  severity: "major",
  file: "SKILL.md",
  message: "step 2 says write the summary without saying how long, in what voice, or what to keep",
  provenance: "house-preference",
  fix: { kind: "replace", from: "2. Write the summary.", to: "2. Write a five-line summary in the brief's own voice." },
};

const JUDGMENT_PROCEDURE = {
  dimension: "example depth",
  category: "procedure-change",
  severity: "major",
  file: "SKILL.md",
  message: "the skill has one golden example and no anti-example; add an anti-example step",
  provenance: "house-preference",
};

// An unknown category WITH a well-formed mechanical fix. The fix shape alone must not buy SAFE.
const UNKNOWN_CATEGORY = {
  dimension: "token economy",
  category: "tighten-the-prose",
  severity: "minor",
  file: "SKILL.md",
  message: "the body repeats the description",
  provenance: "house-preference",
  fix: { kind: "replace", from: "Read the document, then write the summary.", to: "Read, then summarize." },
};

const SEEDED = [SAFE_LINK, SAFE_FRONTMATTER, SAFE_FORMATTING, JUDGMENT_INSTRUCTION, JUDGMENT_PROCEDURE, UNKNOWN_CATEGORY];

const catsOf = (list) => list.map((f) => f.category);

// ---------------------------------------------------------------------------------------------
// The allowlist itself
// ---------------------------------------------------------------------------------------------

test("SAFE is a CLOSED allowlist of exactly the three mechanical categories, and it is frozen", () => {
  assert.deepEqual([...SAFE_CATEGORIES].sort(), ["broken-link", "formatting", "missing-frontmatter-field"]);
  assert.ok(Object.isFrozen(SAFE_CATEGORIES), "the allowlist cannot be widened at runtime");
  assert.ok(Object.isFrozen(SAFE_FRONTMATTER_FIELDS), "the frontmatter-field allowlist cannot be widened at runtime");
  // description and name carry meaning and trigger quality; they are authored, never auto-filled.
  assert.ok(!SAFE_FRONTMATTER_FIELDS.includes("description"), "description is never a SAFE frontmatter field");
  assert.ok(!SAFE_FRONTMATTER_FIELDS.includes("name"), "name is never a SAFE frontmatter field");
});

// ---------------------------------------------------------------------------------------------
// The partition
// ---------------------------------------------------------------------------------------------

test("partition: the three planted SAFE findings land in SAFE", () => {
  const p = partitionCraftFindings(SEEDED);
  assert.deepEqual(catsOf(p.safe).sort(), ["broken-link", "formatting", "missing-frontmatter-field"]);
});

test("partition: the planted JUDGMENT findings land in JUDGMENT", () => {
  const p = partitionCraftFindings(SEEDED);
  assert.ok(catsOf(p.judgment).includes("instruction-rewrite"), "an instruction rewrite is JUDGMENT");
  assert.ok(catsOf(p.judgment).includes("procedure-change"), "a procedure change is JUDGMENT");
});

test("partition: an UNKNOWN category defaults to JUDGMENT even carrying a well-formed fix (fail closed)", () => {
  const p = partitionCraftFindings(SEEDED);
  assert.ok(catsOf(p.judgment).includes("tighten-the-prose"), "an unrecognized category is never SAFE");
  assert.ok(!catsOf(p.safe).includes("tighten-the-prose"));
});

test("partition: the two buckets account for every input, and every decision states a reason", () => {
  const p = partitionCraftFindings(SEEDED);
  assert.equal(p.safe.length + p.judgment.length, SEEDED.length, "no finding is dropped");
  assert.equal(p.decisions.length, SEEDED.length, "one decision per input, in input order");
  for (const d of p.decisions) {
    assert.ok(["safe", "judgment"].includes(d.disposition), "the disposition is one of the two");
    assert.ok(typeof d.reason === "string" && d.reason.length > 0, "every decision carries a stated reason");
  }
  assert.equal(p.decisions[0].finding, SAFE_LINK, "decisions preserve input order and identity");
});

test("partition: an empty or non-array input yields two empty buckets (no throw)", () => {
  for (const input of [[], undefined, null, "nope", 7, {}]) {
    const p = partitionCraftFindings(input);
    assert.deepEqual(p.safe, []);
    assert.deepEqual(p.judgment, []);
  }
});

// ---------------------------------------------------------------------------------------------
// Fail-closed guards. Each of these is a way a model-authored finding could otherwise launder a
// meaning change through a mechanical category.
// ---------------------------------------------------------------------------------------------

test("fail closed: a finding that is not an object is JUDGMENT", () => {
  for (const bad of [null, undefined, "broken-link", 42, []]) {
    assert.equal(classifyCraftFinding(bad).disposition, "judgment", `${JSON.stringify(bad)} is JUDGMENT`);
  }
});

test("fail closed: a missing or non-string category is JUDGMENT", () => {
  assert.equal(classifyCraftFinding({ file: "SKILL.md", fix: { kind: "replace", from: "a", to: "b" } }).disposition, "judgment");
  assert.equal(classifyCraftFinding({ category: 7, file: "SKILL.md" }).disposition, "judgment");
});

test("fail closed: a SAFE category with no fix descriptor is JUDGMENT (nothing to apply mechanically)", () => {
  const c = classifyCraftFinding({ ...SAFE_LINK, fix: undefined });
  assert.equal(c.disposition, "judgment");
  assert.match(c.reason, /fix/i, "the reason names the missing fix descriptor");
});

test("fail closed: a SAFE category whose fix kind does not match the category is JUDGMENT", () => {
  const c = classifyCraftFinding({ ...SAFE_LINK, fix: { kind: "add-frontmatter-field", field: "metadata.tier", value: "universal" } });
  assert.equal(c.disposition, "judgment");
});

test("fail closed: a MULTI-LINE replacement is JUDGMENT (an instruction rewrite dressed as formatting)", () => {
  const laundered = {
    ...SAFE_FORMATTING,
    fix: { kind: "replace", from: "1. Read the document.\n2. Write the summary.", to: "1. Read it.\n2. Write a five-line summary in the brief's own voice." },
  };
  const c = classifyCraftFinding(laundered);
  assert.equal(c.disposition, "judgment", "a SAFE edit is a bounded, single-line literal substitution");
});

test("fail closed: an over-cap replacement is JUDGMENT even on one line", () => {
  const long = "x".repeat(MAX_SAFE_EDIT_CHARS + 1);
  assert.equal(classifyCraftFinding({ ...SAFE_FORMATTING, fix: { kind: "replace", from: long, to: "y" } }).disposition, "judgment");
  assert.equal(classifyCraftFinding({ ...SAFE_FORMATTING, fix: { kind: "replace", from: "y", to: long } }).disposition, "judgment");
});

test("fail closed: a no-op replacement (from equals to) is JUDGMENT", () => {
  assert.equal(classifyCraftFinding({ ...SAFE_FORMATTING, fix: { kind: "replace", from: "## Steps", to: "## Steps" } }).disposition, "judgment");
});

test("fail closed: a fix target that is absolute, escapes the subject, or is missing is JUDGMENT", () => {
  for (const file of ["/etc/passwd", "C:/Windows/system.ini", "../../SKILL.md", "a/../../b.md", "", undefined, 7]) {
    assert.equal(classifyCraftFinding({ ...SAFE_LINK, file }).disposition, "judgment", `${String(file)} is not a contained relative path`);
  }
});

test("fail closed: a frontmatter field outside the closed field list is JUDGMENT (description is meaning)", () => {
  const c = classifyCraftFinding({ ...SAFE_FRONTMATTER, fix: { kind: "add-frontmatter-field", field: "description", value: "Converts a doc." } });
  assert.equal(c.disposition, "judgment");
  assert.equal(classifyCraftFinding({ ...SAFE_FRONTMATTER, fix: { kind: "add-frontmatter-field", field: "metadata.tier", value: "" } }).disposition, "judgment", "an empty value is not applicable");
});

test("normalization is lexical only: case and surrounding whitespace do not change which category is named", () => {
  assert.equal(classifyCraftFinding({ ...SAFE_LINK, category: "  Broken-Link  " }).disposition, "safe");
  assert.equal(classifyCraftFinding({ ...SAFE_LINK, category: "broken link" }).disposition, "judgment", "a different token is a different category");
});

// ---------------------------------------------------------------------------------------------
// Phase-2 eligibility: offered only after the deterministic gate is clean
// ---------------------------------------------------------------------------------------------

test("phase 2 is eligible only when the gate is clean, and ineligibility states why", () => {
  assert.equal(phaseTwoEligible({ exitCode: 0, errors: 0, warns: 0 }).eligible, true);
  assert.equal(phaseTwoEligible({ exitCode: 0, errors: 0, warns: 3 }).eligible, true, "warnings do not fail the gate");
  const failed = phaseTwoEligible({ exitCode: 1, errors: 2, warns: 0 });
  assert.equal(failed.eligible, false);
  assert.match(failed.reason, /gate/i, "the reason names the gate");
  assert.equal(phaseTwoEligible({}).eligible, false, "an unknown gate result is not clean (fail closed)");
  assert.equal(phaseTwoEligible().eligible, false);
  assert.equal(phaseTwoEligible({ exitCode: 0, errors: 2 }).eligible, false, "an inconsistent result (exit 0 with errors) is not clean");
});

// ---------------------------------------------------------------------------------------------
// The consent-gated apply
// ---------------------------------------------------------------------------------------------

// The copy keeps the fixture's directory NAME, or U4 (name-matches-dir) fires on the temp directory
// and the gate would fail for a reason the test is not about.
function withCraftCopy(fn) {
  const base = mkdtempSync(path.join(tmpdir(), "askit-craft-"));
  const dir = path.join(base, path.basename(CRAFT));
  try {
    cpSync(CRAFT, dir, { recursive: true });
    return fn(dir);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

test("apply: without explicit consent nothing is written", () => {
  withCraftCopy((dir) => {
    const before = readFileSync(path.join(dir, "examples/basic.md"), "utf8");
    for (const opts of [undefined, {}, { consent: false }, { consent: "yes" }, { consent: 1 }]) {
      const r = applySafeFixes(dir, [SAFE_LINK], opts);
      assert.equal(r.applied.length, 0, "nothing is applied without consent === true");
      assert.equal(r.skipped.length, 1);
      assert.match(r.skipped[0].reason, /consent/i);
    }
    assert.equal(readFileSync(path.join(dir, "examples/basic.md"), "utf8"), before, "the file is byte-identical");
  });
});

test("apply: with consent the SAFE link fix is applied and only the link changes", () => {
  withCraftCopy((dir) => {
    const skillBefore = readFileSync(path.join(dir, "SKILL.md"), "utf8");
    const r = applySafeFixes(dir, [SAFE_LINK], { consent: true });
    assert.equal(r.applied.length, 1);
    assert.equal(r.skipped.length, 0);
    const ex = readFileSync(path.join(dir, "examples/basic.md"), "utf8");
    assert.ok(ex.includes("(../SKILL.md)"), "the dangling link is corrected");
    assert.ok(!ex.includes("(../SKILLS.md)"), "the typo is gone");
    assert.equal(readFileSync(path.join(dir, "SKILL.md"), "utf8"), skillBefore, "no other file is touched");
  });
});

test("apply: the applier re-classifies and REFUSES a JUDGMENT finding handed to it (defense in depth)", () => {
  withCraftCopy((dir) => {
    const before = readFileSync(path.join(dir, "SKILL.md"), "utf8");
    const r = applySafeFixes(dir, [JUDGMENT_INSTRUCTION, UNKNOWN_CATEGORY], { consent: true });
    assert.equal(r.applied.length, 0, "a caller cannot smuggle a JUDGMENT finding past the applier");
    assert.equal(r.skipped.length, 2);
    assert.equal(readFileSync(path.join(dir, "SKILL.md"), "utf8"), before, "SKILL.md is byte-identical");
  });
});

test("apply: an ambiguous or absent literal is refused, not guessed", () => {
  withCraftCopy((dir) => {
    const p = path.join(dir, "examples/basic.md");
    writeFileSync(p, "(../SKILLS.md) and again (../SKILLS.md)\n");
    const amb = applySafeFixes(dir, [SAFE_LINK], { consent: true });
    assert.equal(amb.applied.length, 0);
    assert.match(amb.skipped[0].reason, /2 occurrence|ambiguous/i);

    writeFileSync(p, "nothing to replace here\n");
    const absent = applySafeFixes(dir, [SAFE_LINK], { consent: true });
    assert.equal(absent.applied.length, 0);
    assert.match(absent.skipped[0].reason, /not found/i);

    const missing = applySafeFixes(dir, [{ ...SAFE_LINK, file: "examples/gone.md" }], { consent: true });
    assert.equal(missing.applied.length, 0);
    assert.match(missing.skipped[0].reason, /does not exist/i);
  });
});

test("apply: a Windows-style relative path resolves, and the write site re-asserts containment", () => {
  withCraftCopy((dir) => {
    const r = applySafeFixes(dir, [{ ...SAFE_LINK, file: "examples\\basic.md" }], { consent: true });
    assert.equal(r.applied.length, 1, "a backslash path is normalized, not silently skipped");
    assert.ok(readFileSync(path.join(dir, "examples/basic.md"), "utf8").includes("(../SKILL.md)"));
  });
});

test("apply: the replacement is inserted LITERALLY (a $ pattern in `to` is not expanded)", () => {
  withCraftCopy((dir) => {
    // String-form String.prototype.replace gives $& / $` / $' special meaning; a model-authored payload
    // must not be able to splice in surrounding text that way.
    const fix = { ...SAFE_LINK, fix: { kind: "replace", from: "(../SKILLS.md)", to: "($& price: $100)" } };
    assert.equal(applySafeFixes(dir, [fix], { consent: true }).applied.length, 1);
    const text = readFileSync(path.join(dir, "examples/basic.md"), "utf8");
    assert.ok(text.includes("($& price: $100)"), "the replacement text is written verbatim");
    assert.ok(!text.includes("((../SKILLS.md)"), "$& was not expanded to the matched text");
  });
});

test("apply: a missing frontmatter field is inserted under metadata, and a present one is refused", () => {
  withCraftCopy((dir) => {
    const r = applySafeFixes(dir, [SAFE_FRONTMATTER], { consent: true });
    assert.equal(r.applied.length, 1);
    const text = readFileSync(path.join(dir, "SKILL.md"), "utf8");
    assert.match(text, /^metadata:\r?\n(?:.*\r?\n)*?\s+tier: universal$/m, "the field is inserted inside the metadata map");
    // Idempotence: a second run refuses, because the field is now present.
    const again = applySafeFixes(dir, [SAFE_FRONTMATTER], { consent: true });
    assert.equal(again.applied.length, 0);
    assert.match(again.skipped[0].reason, /already present/i);
  });
});

test("apply: an INLINE frontmatter map is refused, not given a duplicate key", () => {
  withCraftCopy((dir) => {
    const p = path.join(dir, "SKILL.md");
    const text = readFileSync(p, "utf8").replace(/metadata:\r?\n\s+version: 0\.1\.0/, "metadata: {version: 0.1.0}");
    writeFileSync(p, text);
    const r = applySafeFixes(dir, [SAFE_FRONTMATTER], { consent: true });
    assert.equal(r.applied.length, 0);
    assert.match(r.skipped[0].reason, /inline/i);
    assert.equal(readFileSync(p, "utf8"), text, "no duplicate metadata key was written");
  });
});

// ---------------------------------------------------------------------------------------------
// THE LOAD-BEARING INVARIANT: the advisory layer cannot move the gate verdict.
// The gate exit code is computed from report.findings, and applyAdvisory() allowlists ONLY its own
// namespaced keys (reportType / review / insights). These two tests exercise both directions with a
// hostile craft advisory: it cannot fail a clean subject, and it cannot pass a failing one.
// ---------------------------------------------------------------------------------------------

const exitOf = (r) =>
  gateExitFromFindings(
    r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity })),
    undefined
  ).exitCode;

test("INVARIANT: a craft-review finding cannot fail a subject the gate passes", () => {
  const base = evaluate(CRAFT);
  assert.equal(exitOf(base), 0, "the fixture is gate-clean before any advisory");
  // Every seeded craft finding at the worst severity, plus deterministic keys the advisory must not set.
  const hostile = {
    ...toReviewAdvisory(SEEDED.map((f) => ({ ...f, severity: "critical" })), { model: "claude-opus-4-8", effort: "high", date: "2026-01-01" }),
    findings: [{ check: "x", reqId: "U6", severity: "error", message: "laundered", file: "SKILL.md", effectiveSeverity: "error" }],
    summary: { errors: 99, warns: 99 },
    byRule: { U6: [{ severity: "error" }] },
    tier: "universal",
  };
  const merged = applyAdvisory(base, "review", hostile);
  assert.equal(exitOf(merged), 0, "the gate exit code is unchanged by the craft advisory");
  assert.equal(merged.findings.length, base.findings.length, "the advisory cannot write report.findings");
  assert.equal(merged.summary.errors, base.summary.errors, "the advisory cannot write report.summary");
  assert.ok(merged.review, "the craft findings ARE carried, beside the verdict");
});

test("INVARIANT: a clean craft review cannot pass a subject the gate fails", () => {
  withCraftCopy((dir) => {
    // Break a link the gate DOES scan (SKILL.md body): U6 fires, exit 1.
    const p = path.join(dir, "SKILL.md");
    writeFileSync(p, readFileSync(p, "utf8").replace("(examples/basic.md)", "(examples/gone.md)"));
    const base = evaluate(dir);
    assert.equal(exitOf(base), 1, "the broken SKILL.md link fails the gate");
    assert.ok(base.findings.some((f) => f.reqId === "U6" && f.severity === "error"), "it fails on U6 (the link), not on some incidental fixture defect");
    const clean = { ...toReviewAdvisory([], { model: "claude-opus-4-8", effort: "high", date: "2026-01-01" }), findings: [], summary: { errors: 0, warns: 0 }, byRule: {} };
    const merged = applyAdvisory(base, "review", clean);
    assert.equal(exitOf(merged), 1, "a clean craft review cannot launder a failing gate");
    assert.equal(merged.summary.errors, base.summary.errors);
  });
});

test("the craft advisory renders BESIDE the verdict: both dispositions appear, the grade does not move", () => {
  const base = evaluate(CRAFT);
  const adv = toReviewAdvisory(SEEDED, { model: "claude-opus-4-8", effort: "high", date: "2026-01-01" });
  const merged = applyAdvisory(base, "review", adv);
  const md = renderMarkdown(merged, {
    library: null,
    spine: CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier })),
    conditional: new Set(["G1", "G6", "U11"]),
    date: "2026-01-01",
    exitCode: exitOf(merged),
    reportType: "review",
  });
  assert.match(md, /\[SAFE\]/, "the SAFE findings are labeled in the durable report");
  assert.match(md, /\[JUDGMENT\]/, "the JUDGMENT findings are reported, not hidden");
  assert.match(md, /never moves the grade or the gate exit code/, "the advisory block carries the invariant statement");
  assert.match(md, /Gate exit code \| 0/, "the rendered verdict is the gate's");
});

test("toReviewAdvisory shapes the evaluate.mjs --report=review advisory block", () => {
  const adv = toReviewAdvisory(SEEDED, { model: "claude-sonnet-4-6", effort: "medium", date: "2026-02-02" });
  assert.equal(adv.review.model, "claude-sonnet-4-6");
  assert.equal(adv.review.effort, "medium");
  assert.equal(adv.review.date, "2026-02-02");
  assert.equal(adv.review.findings.length, SEEDED.length, "every craft finding is carried into the report");
  for (const f of adv.review.findings) {
    for (const k of ["area", "severity", "message", "provenance"]) {
      assert.ok(typeof f[k] === "string" && f[k].length > 0, `advisory finding carries ${k}`);
    }
  }
  assert.equal(adv.insights.length, 1, "one partition summary insight");
  assert.match(adv.insights[0], /3 .*SAFE/i);
  assert.match(adv.insights[0], /3 .*JUDGMENT/i);
});
