import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, scoreDescription } from "../../scripts/checks/description-score.mjs";

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
