// The prose measurement behind the documentation style report.
//
// The negative cases are the point of this file. Three separator forms in this repository's own
// house style are NOT idea-joins, and each one inflated the corpus count before it was exempted:
// the glossary's `**Term** - meaning`, the troubleshooting pages' `- **Cause:** explanation`, and
// the parenthetical handle that the reference-ID rule REQUIRES. The label-colon exemption alone
// removed 74 false hits from an 89-page corpus, and without the handle exemption the instrument
// penalises the very rule the sweep exists to enforce.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  measureText,
  plainnessDebt,
  bodyLines,
  opensWithProse,
  sectionsWithoutOrientation,
} from "../../scripts/lib/prose-metrics.mjs";

/* ------------------------------------------------------------- stacked sentences */

test("a sentence carrying two or more idea-joins is stacked", () => {
  const m = measureText("The cap binds here; it is compared by rank (never lexically).");
  assert.equal(m.stackedCount, 1);
});

test("a single semicolon is one idea-join, so the sentence is not stacked", () => {
  const m = measureText("The cap binds here; it is compared by rank.");
  assert.equal(m.stackedCount, 0);
});

test("a comma is not an idea-join, so comma-heavy prose is left alone", () => {
  const m = measureText("The cap is compared by rank, never lexically, in every mode.");
  assert.equal(m.stackedCount, 0);
});

test("the passage the maintainer could not parse scores as stacked", () => {
  const m = measureText(
    "Pre-1.14 release notes (history), the six dense reference pages (ranked findings in doc-review.md, none blocking), and STANDARD.md - normative, yours, and its spine statement was already correct.",
  );
  assert.equal(m.stackedCount, 1);
  assert.ok(m.worstClauseLoad >= 3, `expected a clause load of at least 3, got ${m.worstClauseLoad}`);
});

test("the same content rewritten to one idea per sentence scores clean", () => {
  const m = measureText(
    [
      "Three things were left alone.",
      "",
      "- The release notes before v1.14. They are history.",
      "- Six reference pages. They are dense but correct.",
      "- The Standard. It is normative and it was already right.",
    ].join("\n"),
  );
  assert.equal(m.stackedCount, 0);
  assert.equal(plainnessDebt(m), 0);
});

/* ------------------------------------------- the three separator false positives */

test("the glossary's definition dash is a separator, not an idea-join", () => {
  const m = measureText("**Workspace** - a directory holding several plugins developed together.");
  assert.equal(m.stackedCount, 0);
});

test("a label colon is a separator, not an idea-join", () => {
  const m = measureText("- **Cause:** no root `AGENTS.md`, required at every tier (Standard sec 3.10).");
  assert.equal(m.stackedCount, 0);
});

test("only ONE leading separator is discounted, so a genuinely stacked entry still counts", () => {
  const m = measureText(
    "**Bronze (Universal)** - the start line: portable files (valid skills, a manifest) that run unchanged anywhere, backed by checks.",
  );
  assert.equal(m.stackedCount, 1);
});

test("a required reference-ID handle is not counted as a heavy parenthetical", () => {
  const m = measureText(
    "[ADR 0044 (one Standard ceiling, and the deliberate published-verdict reversal)](x) records the decision.",
  );
  assert.equal(m.heavyParens, 0);
});

test("a long parenthetical that is NOT an ID handle still counts as heavy", () => {
  const m = measureText(
    "The resolver reverses its guarantee (because a guarantee that protects the subject is the wrong guarantee in a published verdict).",
  );
  assert.equal(m.heavyParens, 1);
});

/* ------------------------------------------------------------------- stripping */

test("a fenced code block is not measured as prose", () => {
  const withFence = measureText("One sentence here.\n\n```js\nconst a = 1; const b = 2; const c = 3;\n```\n");
  assert.equal(withFence.sentences, 1);
});

test("a filename inside inline code does not end a sentence", () => {
  const m = measureText("Run `node scripts/check.mjs` and read the output.");
  assert.equal(m.sentences, 1);
});

test("frontmatter is not measured as prose", () => {
  const m = measureText("---\ntitle: t\ndescription: d\n---\n\nOne sentence.\n");
  assert.equal(m.sentences, 1);
});

/* ------------------------------------------------------- the vocabulary rules */

test("internal planning vocabulary is reported", () => {
  const m = measureText("Wait for phase 2 of the release packet before adopting this.");
  assert.ok(m.planningVocab > 0);
});

test("a reference ID carrying a handle is not reported as bare", () => {
  assert.equal(measureText("See E56 (G2 counts a gate inside an echo string) for detail.").bareIds, 0);
});

test("a bare reference ID is reported", () => {
  assert.ok(measureText("This was filed as E56 and never chased.").bareIds > 0);
});

/* --------------------------------------------------------------- page anatomy */

const FRONT = "---\ntitle: t\ndescription: d\n---\n\n";

test("a page opening on prose satisfies the orientation rule", () => {
  assert.equal(opensWithProse(bodyLines(`${FRONT}# Heading\n\nThis page orients first.\n`)), true);
});

test("a page opening on a table fails the orientation rule", () => {
  assert.equal(opensWithProse(bodyLines(`${FRONT}# Heading\n\n| a | b |\n|---|---|\n| 1 | 2 |\n`)), false);
});

test("a page opening on a code fence fails the orientation rule", () => {
  assert.equal(opensWithProse(bodyLines(`${FRONT}# Heading\n\n\`\`\`js\nconst a = 1;\n\`\`\`\n`)), false);
});

test("a section reaching a fence before any prose is reported", () => {
  const offenders = sectionsWithoutOrientation(
    bodyLines(`${FRONT}# H\n\nIntro.\n\n## The shape\n\n\`\`\`js\nconst a = 1;\n\`\`\`\n`),
  );
  assert.deepEqual(offenders, ["The shape"]);
});

test("a section that says what the thing is before showing it is not reported", () => {
  const offenders = sectionsWithoutOrientation(
    bodyLines(`${FRONT}# H\n\nIntro.\n\n## The shape\n\nA check answers one question about a plugin.\n\n\`\`\`js\nconst a = 1;\n\`\`\`\n`),
  );
  assert.deepEqual(offenders, []);
});

test("a fence inside a section counts only before the first prose, not after", () => {
  const offenders = sectionsWithoutOrientation(
    bodyLines(`${FRONT}# H\n\nIntro.\n\n## A\n\nProse first.\n\n\`\`\`js\nx\n\`\`\`\n\n## B\n\n| a |\n|---|\n`),
  );
  assert.deepEqual(offenders, ["B"]);
});
