import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, scoreDescription, englishDensity, notScoredCount, READABLE_FLOOR } from "../../scripts/checks/description-score.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const weak = path.join(FIXTURES, "anti/weak-description");

test("a strong description scores >= 0.7", () => {
  const s = scoreDescription("Converts a CSV file into a formatted summary table. Use when the user asks to summarize or tabulate spreadsheet data.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

test("a vague description scores < 0.7", () => {
  assert.ok(scoreDescription("Helps with stuff.") < 0.7);
});

test("golden produces no warn for description", () => {
  assert.equal(check(loadPlugin(golden)).filter((f) => f.reqId === "U5").length, 0);
});

test("an evaluate-verb description scores >= 0.7", () => {
  const s = scoreDescription("Evaluates a skill or plugin against the Standard. Use when you want to audit conformance or check what blocks the next tier.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

test("weak description is a WARN (never error) with U5", () => {
  const findings = check(loadPlugin(weak));
  const w = findings.find((f) => f.reqId === "U5");
  assert.ok(w);
  assert.equal(w.severity, "warn");
  assert.equal(findings.filter((f) => f.severity === "error").length, 0);
});

// --- ADR 0033 recalibration corpus (real third-party descriptions the scorer under-scored) ---

// anthropics/skills mcp-builder @ 5754626: gerund action verbs ("creating", "building") scored 0.65.
test("a gerund action verb counts as a concrete action (mcp-builder)", () => {
  const s = scoreDescription("Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).");
  assert.ok(s >= 0.7, `score was ${s}`);
});

// anthropics/skills pdf @ 5754626: "Use this skill whenever the user..." missed the WHEN regex; scored 0.65.
test("'whenever the user' counts as a use-when trigger (pdf)", () => {
  const s = scoreDescription("Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, splitting PDFs apart, rotating pages, adding watermarks, creating new PDFs, filling PDF forms, encrypting/decrypting PDFs, extracting images, and OCR on scanned PDFs to make them searchable. If the user mentions a .pdf file or asks to produce one, use this skill.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

// phuryn/pm-skills pm-toolkit privacy-policy @ d384f0c: "Draft" not in the verb list AND the legitimate
// trigger acronym GDPR took the all-caps penalty; scored 0.55.
test("a domain acronym is a trigger keyword, not a penalty (privacy-policy)", () => {
  const s = scoreDescription("Draft a detailed privacy policy covering data types, jurisdiction, GDPR and compliance considerations, and clauses needing legal review. Use when creating a privacy policy, updating data protection documentation, or preparing for compliance.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

// RefoundAI/lenny-skills conducting-user-interviews @ 280a57a: the "Help users <verb> ..." template stem
// put 50 of 86 strong descriptions at exactly 0.65.
test("'Help users <verb>' states a concrete action (lenny-skills template)", () => {
  const s = scoreDescription("Help users run better customer and user interviews. Use when someone is preparing for user research, planning discovery interviews, writing interview questions, analyzing interview findings, or trying to understand customer needs.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

// deanpeters/Product-Manager-Skills @ 70fb6c4: "Diagnose ..." scored 0.65 (verb absent from the list).
test("'Diagnose' counts as a concrete action (deanpeters)", () => {
  const s = scoreDescription("Diagnose context stuffing vs. context engineering. Use when an AI workflow feels bloated, brittle, or hard to steer reliably.");
  assert.ok(s >= 0.7, `score was ${s}`);
});

// The inverse defect: unfinished placeholder text currently scores 0.9 because "write" + "use when" match.
test("a TODO placeholder description fails regardless of matched verbs", () => {
  const s = scoreDescription("TODO: write a description. Use when needed by the user.");
  assert.ok(s < 0.7, `score was ${s}`);
});

// Guard: the help-pattern must not resurrect the anti-pattern stem.
test("'Helps with' stays a vague anti-pattern, not an action", () => {
  assert.ok(scoreDescription("Helps with various things. Use when the user asks for help with project files and more.") < 0.7);
});

// --- ADR 0049: U5 declines rather than failing a description it cannot read -----------------------

test("ADR 0049: the French exemplar produces NO finding, where it used to score 0.30", () => {
  // reading 18's clearest case. It states what it does, states when to use it, and carries concrete
  // trigger keywords - a word-for-word French rendering of the exact construction the WHEN regex is
  // built to reward - and U5's message ("state what it does AND when to use it") is false of every
  // clause of it. A check with no evidence must say nothing, not say something wrong.
  const fr =
    "À utiliser quand l'utilisateur veut relire, corriger ou améliorer un texte français";
  assert.ok(scoreDescription(fr) < 0.7, "the scorer still cannot read it; that is the premise");
  assert.ok(englishDensity(fr) < READABLE_FLOOR, `density was ${englishDensity(fr)}`);

  const ctx = { skills: [{ name: "fr", skillMdPath: "skills/fr/SKILL.md", frontmatter: { description: fr } }] };
  assert.deepEqual(check(ctx), [], "a description the scorer cannot read must produce no finding");
  assert.equal(notScoredCount(ctx), 1, "and the decline must be counted, or it is indistinguishable from a pass");
});

test("ADR 0049: the 0.102-density English exemplar is STILL SCORED, which is what fixes the floor at 0.10", () => {
  // The calibration's whole cost is here. This is legitimate keyword-dense technical English from the
  // TerminalSkills corpus; it sits just above the floor. A floor of 0.15 would silence it along with 61
  // others to gain 0.3 points of French coverage, which is the wrong trade and the reason 0.10 was
  // chosen from a sweep rather than picked.
  // VERBATIM from TerminalSkills/skills at sha 7a5cc967, density 0.1020. Written out in full and not
  // paraphrased: an invented "roughly like this" string is what made the first version of this test
  // prove NOTHING - appending "Use when managing ad spend" added two function words and pushed the
  // density above 0.15, so moving the floor to 0.15 left the test green. The mutation check caught it.
  const en =
    "Optimize paid advertising campaigns across Google Ads, Meta, TikTok, LinkedIn, and other platforms. " +
    "Use when tasks involve bid optimization, audience targeting, creative testing, ROAS improvement, " +
    "attribution modeling, budget allocation, campaign structure, retargeting strategies, lookalike " +
    "audiences, or reducing customer acquisition cost. Covers multi-platform campaign management and " +
    "creative performance analysis.";
  const d = englishDensity(en);
  assert.equal(d.toFixed(4), "0.1020", "the exemplar must stay the verbatim corpus string");
  assert.ok(
    d >= READABLE_FLOOR,
    `density ${d.toFixed(4)} is below the ${READABLE_FLOOR} floor: raising the floor silences this ` +
      "description and the 57 others measured in the 0.10-0.15 band, to gain 0.3 points of French coverage"
  );

  const ctx = { skills: [{ name: "en", skillMdPath: "skills/en/SKILL.md", frontmatter: { description: en } }] };
  assert.equal(notScoredCount(ctx), 0, "an English description must never be declined");
});

test("ADR 0049: englishDensity returns 0 for an empty token set rather than NaN", () => {
  // 0/0 is NaN, and NaN < READABLE_FLOOR is FALSE, so the guard would fall through and score a
  // description with no word tokens at all - the opposite of the intended behaviour.
  assert.equal(englishDensity(""), 0);
  assert.equal(englishDensity("!!! ??? ..."), 0);
  assert.equal(englishDensity(42), 0);
});

test("ADR 0049: declining WITHDRAWS a finding and can never add one", () => {
  // The green-ward claim that lets this ship with no migration window, asserted rather than argued:
  // for any description, the set of findings after the floor is a SUBSET of the set before it.
  const cases = [
    "Helps with stuff.",
    "Converts a CSV file into a formatted summary table. Use when the user asks to summarize data.",
    "À utiliser quand l'utilisateur veut relire un texte",
    "TODO",
    "",
  ];
  for (const desc of cases) {
    const ctx = { skills: [{ name: "x", skillMdPath: "skills/x/SKILL.md", frontmatter: { description: desc } }] };
    const after = check(ctx).length;
    const wouldHaveBeen =
      typeof desc === "string" && desc.length > 0 && scoreDescription(desc) < 0.7 ? 1 : 0;
    assert.ok(after <= wouldHaveBeen, `declining added a finding for ${JSON.stringify(desc)}`);
  }
});

// --- ADR 0048: the skills-only scope is a RATIFIED DECISION, not an unfinished loop --------------

test("ADR 0048: a command's description is NEVER scored, however badly it would score", () => {
  // Without this test the decision lives only in a comment, and `for (const s of ctx.skills)` reads as
  // the same defect E42 found in the agent checks - so a future reviewer "fixes" it.
  //
  // Measured before it was decided: 0 of 14 commands across the reference family satisfy the sec 8.1
  // bar, INCLUDING this toolkit's own two, whose backing skills of identical name and intent score 1.00.
  // The entire gap is one literal token - "Use TO audit" is not "Use WHEN". A command is invoked by a
  // person typing its name, and on Codex no command description exists at all, so on neither runtime
  // does it perform trigger matching. Applying a trigger-quality bar measures a property it lacks.
  const weak = "Helps with stuff.";
  assert.ok(scoreDescription(weak) < 0.7, "the premise: this description would fail the bar");

  const ctx = {
    root: "/x",
    skills: [],
    commands: [
      { name: "fx-run", frontmatter: { description: weak } },
      // This repository's own /askit-evaluate description, verbatim. It scores 0.65 and is a good
      // description; it is short because it is a menu label.
      { name: "askit-evaluate", frontmatter: { description: "Evaluate a skill or plugin against the Advanced Skill Library Standard and report per-rule findings, the tier, and remediation. Use to audit conformance or see what blocks the next tier." } },
    ],
  };
  assert.deepEqual(check(ctx), [], "U5 scores skills; a command description is a label, not a trigger surface");
});
