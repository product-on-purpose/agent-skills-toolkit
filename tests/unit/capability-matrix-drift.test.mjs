import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// what-it-does: guards foundation/synthesis/capability-matrix.md against drifting away from
//   STANDARD.md's tier sections, and against claiming currency it cannot evidence. Two assertions,
//   per v1.16.0 W4: (1) every component type named in a tier section appears in the matrix, and
//   (2) every agent COLUMN of the matrix carries a confirmed-against version and a date.
//
// why-a-test-and-not-a-check: this grades THIS repository's own evidence, not any plugin. It carries
//   no reqId, is not in scripts/checks/, and is not part of the shipped gate. ADR 0055 fixed the
//   scope: "W4 adds exactly one guard, and it guards the matrix rather than graded plugins."
//
// why-it-exists: as of v1.16.0 the matrix is read by two SKILL.md files, a golden example, and two
//   public documentation pages, and nothing verified any of them agree with the Standard. That is a
//   hand-maintained rendering beside a machine-readable truth with no guard between them, which is
//   the exact shape of the four drift defects found on 2026-08-18 and 2026-08-19.
//
// the-vacuity-problem-and-the-floors: every assertion below is a SUBSET test, and a subset test over
//   an empty set passes. Rename a `### 2.x` heading, or the "Keeping the matrix honest" heading, and
//   a naive version of this guard would extract nothing and go green - a partial drift guard, which
//   is worse than no guard because it exists and passes. The FLOORS make a broken parser fail loudly.
//
// one-direction-only: this does NOT assert the reverse (matrix rows the tier sections do not name).
//   "References / assets" and "Workflow" would both trip it and it needs its own allowlist, which is
//   outside W4's "scope this narrowly". File it if it matters; do not widen this here.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const STANDARD_PATH = path.join(REPO, "STANDARD.md");
const MATRIX_PATH = path.join(REPO, "foundation", "synthesis", "capability-matrix.md");

const TIER_SECTIONS = ["2.1", "2.2", "2.3"];

/**
 * Standard prose to matrix row name. An EXPLICIT table rather than fuzzy containment, so every
 * mapping decision is visible and reviewable. An unmapped token is a finding, not a silent pass.
 */
const ALIASES = new Map([
  ["agentskills.io skills", "Skill"],
  ["agents.md project instructions", "AGENTS.md"],
  ["mcp server definitions", "MCP server"],
  ["subagents", "Subagent"],
  ["slash commands", "Command"],
  ["workflows", "Workflow"],
  ["chain contracts", "Chain contract"],
  ["hooks", "Hook"],
  ["output styles", "Output style"],
  ["statusline", "Statusline"],
]);

/**
 * Tokens a tier section names that are NOT component types with a per-agent capability answer, each
 * with its reason. Derived by RUNNING the extractor, not by predicting what it would produce.
 *
 * Every entry is also asserted to still be extractable (see the dead-entry test): an allowlist that
 * outlives the text it excuses is the same phantom class G8 reports on folder inventories.
 */
const NOT_A_COMPONENT_TYPE = new Map([
  ["plugin packaging", "a packaging obligation on the plugin as a whole, not a component whose support differs per agent"],
  ["self-hosting ci", "a lifecycle requirement discharged by the plugin's own CI; there is no per-agent capability to record"],
]);

/** A broken parser must fail loudly rather than pass vacuously. */
const FLOORS = { tokensPerTier: 1, componentRows: 8, honestRows: 2, agentColumns: 2 };

/** Columns of the component table that name a document, not an agent. */
const NON_AGENT_COLUMNS = new Set(["Component", "Standard", "Notes"]);

// ---------------------------------------------------------------------------------------------
// Pure functions. Kept in this file deliberately: a scripts/lib helper would need listing in that
// folder's README (the v1.14.0 trap) and would blur the "not part of the shipped gate" boundary.
// ---------------------------------------------------------------------------------------------

/**
 * The component-type tokens each tier section names, as { "2.1": [...], ... }.
 *
 * Parentheticals are stripped BEFORE splitting on commas, because sec 2.1's first bullet carries
 * commas INSIDE parentheses (`SKILL.md` + `references/`, `scripts/`, `assets/`) and a naive split
 * shreds it into fragments.
 *
 * The section ends at the next `###` or at "A/An <Tier>-tier plugin MUST". Note the `An?`: sec 2.3
 * reads "An Advanced-tier plugin MUST", and a boundary matching only "A " swallows four requirement
 * bullets as if they were component types. That was this guard's own first false positive.
 */
function parseTierTokens(text) {
  const out = {};
  for (const sec of TIER_SECTIONS) {
    const start = text.indexOf(`### ${sec} `);
    if (start === -1) { out[sec] = []; continue; }
    const rest = text.slice(start);
    const end = rest.search(/\n(?:###|An? [A-Za-z]+-tier plugin MUST)/);
    const body = rest.slice(0, end === -1 ? rest.length : end);
    const tokens = [];
    for (const line of body.split("\n")) {
      if (!/^\s*-\s+/.test(line)) continue;
      const cleaned = line.replace(/^\s*-\s+/, "").replace(/\([^)]*\)/g, " ").replace(/`/g, "");
      for (const piece of cleaned.split(/,| and /)) {
        const t = piece.trim().replace(/\.$/, "").replace(/^full\s+/i, "").replace(/\s+/g, " ").toLowerCase();
        if (t) tokens.push(t);
      }
    }
    out[sec] = tokens;
  }
  return out;
}

/** The first markdown table under `heading`, as { header: [...], rows: [[...]] }. */
function tableUnder(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return null;
  const lines = text.slice(start).split("\n");
  let i = lines.findIndex((l) => /^\s*\|/.test(l));
  if (i === -1) return null;
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const header = cells(lines[i]);
  const rows = [];
  for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) rows.push(cells(lines[j]));
  return { header, rows };
}

/** The matrix's component rows, its agent columns, and its confirmed-against records. */
function parseMatrix(text) {
  const comp = tableUnder(text, "## By component type");
  const honest = tableUnder(text, "## Keeping the matrix honest");
  const strip = (s) => s.replace(/`/g, "").replace(/\*\*/g, "").trim();
  return {
    components: new Set((comp?.rows ?? []).map((r) => strip(r[0]))),
    agentColumns: (comp?.header ?? []).map(strip).filter((h) => h && !NON_AGENT_COLUMNS.has(h)),
    confirmed: new Map((honest?.rows ?? []).map((r) => [strip(r[0]), { against: strip(r[1] ?? ""), on: strip(r[2] ?? "") }])),
  };
}

/**
 * Findings, most specific first. The message IS the guard's product: it must tell the reader which
 * of the three dispositions a new token needs, not merely that something is wrong.
 */
function verify(tokens, matrix) {
  const findings = [];
  for (const sec of TIER_SECTIONS) {
    for (const t of tokens[sec] ?? []) {
      if (NOT_A_COMPONENT_TYPE.has(t)) continue;
      const mapped = ALIASES.get(t);
      if (!mapped) {
        findings.push(`STANDARD.md sec ${sec} names "${t}", which is not in the alias table and not allowlisted. Decide which it is: a component type (add an alias plus a matrix row), or not one (add it to NOT_A_COMPONENT_TYPE with its reason).`);
        continue;
      }
      if (!matrix.components.has(mapped)) {
        findings.push(`STANDARD.md sec ${sec} names "${t}" (matrix row "${mapped}"), but the matrix's "By component type" table has no such row. The Standard gained or renamed a component type and the matrix did not follow.`);
      }
    }
  }
  for (const agent of matrix.agentColumns) {
    const rec = matrix.confirmed.get(agent);
    if (!rec) {
      findings.push(`the matrix has an agent column "${agent}" with no row in "Keeping the matrix honest". Every agent the matrix makes claims about must carry a confirmed-against reading and a date.`);
      continue;
    }
    if (!rec.against) findings.push(`agent "${agent}" has an empty "Confirmed against" cell.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.on)) findings.push(`agent "${agent}" has no ISO date in its "On" cell (found "${rec.on}").`);
  }
  return findings;
}

const STANDARD_TEXT = readFileSync(STANDARD_PATH, "utf8");
const MATRIX_TEXT = readFileSync(MATRIX_PATH, "utf8");

// ---------------------------------------------------------------------------------------------
// The live files
// ---------------------------------------------------------------------------------------------

test("the live STANDARD.md and capability matrix agree: no drift findings", () => {
  const findings = verify(parseTierTokens(STANDARD_TEXT), parseMatrix(MATRIX_TEXT));
  assert.deepEqual(findings, [], `capability matrix drift:\n  - ${findings.join("\n  - ")}`);
});

test("FLOORS: extraction is non-vacuous, so a renamed heading fails loudly instead of passing green", () => {
  const tokens = parseTierTokens(STANDARD_TEXT);
  for (const sec of TIER_SECTIONS) {
    assert.ok((tokens[sec] ?? []).length >= FLOORS.tokensPerTier,
      `sec ${sec} yielded ${tokens[sec]?.length ?? 0} tokens; the heading or its bullet list moved, and every subset assertion below would pass vacuously.`);
  }
  const m = parseMatrix(MATRIX_TEXT);
  assert.ok(m.components.size >= FLOORS.componentRows, `parsed ${m.components.size} component rows, floor ${FLOORS.componentRows}`);
  assert.ok(m.confirmed.size >= FLOORS.honestRows, `parsed ${m.confirmed.size} confirmed-against rows, floor ${FLOORS.honestRows}`);
  assert.ok(m.agentColumns.length >= FLOORS.agentColumns, `derived ${m.agentColumns.length} agent columns, floor ${FLOORS.agentColumns}`);
});

test("every NOT_A_COMPONENT_TYPE entry is still extracted from the Standard (no dead allowlist entries)", () => {
  const all = new Set(TIER_SECTIONS.flatMap((s) => parseTierTokens(STANDARD_TEXT)[s] ?? []));
  for (const entry of NOT_A_COMPONENT_TYPE.keys()) {
    assert.ok(all.has(entry),
      `"${entry}" is allowlisted but no longer appears in any tier section. An allowlist that outlives the text it excuses hides the next real finding; remove the entry.`);
  }
});

test("agent columns are DERIVED from the matrix header, so a newly added column cannot escape the guard", () => {
  const m = parseMatrix(MATRIX_TEXT);
  assert.deepEqual(m.agentColumns, ["Claude Code", "Codex"]);
  // Extra honest-table rows are fine - Cowork is modelled in prose, not as a column.
  assert.ok(m.confirmed.has("Cowork"), "Cowork should still carry a reading even though it is not a column");
});

// ---------------------------------------------------------------------------------------------
// The negative cases. These are the point: a guard that cannot be shown failing is not a guard, and
// keeping the failures as standing tests is stronger than demonstrating them once by hand.
// ---------------------------------------------------------------------------------------------

const SYNTHETIC_MATRIX = [
  "## By component type", "",
  "| Component | Standard | Claude Code | Codex | Notes |",
  "|---|---|---|---|---|",
  "| Skill | 3.1 | yes | yes | . |",
  "| AGENTS.md | 3.10 | yes | yes | . |",
  "| MCP server | 3.9 | yes | yes | . |",
  "| Subagent | 3.3 | yes | no | . |",
  "| Command | 3.2 | yes | yes | . |",
  "| Workflow | 3.4 | yes | yes | . |",
  "| Chain contract | 3.6 | yes | yes | . |",
  "| Hook | 3.5 | yes | subset | . |",
  "| Output style | 2.3 | yes | no | . |",
  "| Statusline | 2.3 | yes | differs | . |", "",
  "## Keeping the matrix honest", "",
  "| Agent | Confirmed against | On | How |",
  "|---|---|---|---|",
  "| Claude Code | `2.1.235` | 2026-08-18 | read |",
  "| Codex | plugins page as published | 2026-08-18 | read |", "",
].join("\n");

test("NEGATIVE: a tier section gaining an unknown component type is reported, and the message says what to decide", () => {
  const std = STANDARD_TEXT.replace(
    "- Subagents, slash commands, plugin packaging, workflows, chain contracts.",
    "- Subagents, slash commands, plugin packaging, workflows, chain contracts, connectors.");
  assert.notEqual(std, STANDARD_TEXT, "fixture anchor no longer matches STANDARD.md; update this test");
  const findings = verify(parseTierTokens(std), parseMatrix(SYNTHETIC_MATRIX));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /names "connectors"/);
  assert.match(findings[0], /add an alias plus a matrix row/);
});

test("NEGATIVE: a component type the Standard names but the matrix dropped is reported", () => {
  const matrix = SYNTHETIC_MATRIX.replace("| Hook | 3.5 | yes | subset | . |\n", "");
  const findings = verify(parseTierTokens(STANDARD_TEXT), parseMatrix(matrix));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /matrix row "Hook"/);
  assert.match(findings[0], /did not follow/);
});

test("NEGATIVE: an agent column with no confirmed-against row is reported", () => {
  const matrix = SYNTHETIC_MATRIX.replace("| Codex | plugins page as published | 2026-08-18 | read |\n", "");
  const findings = verify(parseTierTokens(STANDARD_TEXT), parseMatrix(matrix));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /agent column "Codex" with no row/);
});

test("NEGATIVE: a confirmed-against row with a non-ISO date is reported", () => {
  const matrix = SYNTHETIC_MATRIX.replace("| Claude Code | `2.1.235` | 2026-08-18 | read |",
                                          "| Claude Code | `2.1.235` | recently | read |");
  const findings = verify(parseTierTokens(STANDARD_TEXT), parseMatrix(matrix));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /no ISO date/);
});

test("NEGATIVE: a NEW agent column added to the matrix cannot escape the guard", () => {
  const matrix = SYNTHETIC_MATRIX
    .replace("| Component | Standard | Claude Code | Codex | Notes |", "| Component | Standard | Claude Code | Codex | Cowork | Notes |")
    .replace("|---|---|---|---|---|", "|---|---|---|---|---|---|");
  const m = parseMatrix(matrix);
  assert.deepEqual(m.agentColumns, ["Claude Code", "Codex", "Cowork"]);
  const findings = verify(parseTierTokens(STANDARD_TEXT), m);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /agent column "Cowork" with no row/);
});

test("NEGATIVE: a renamed tier heading empties the extraction, which the FLOORS catch", () => {
  const std = STANDARD_TEXT.replace("### 2.2 Tier 2 - Convergent (Silver)", "### 2.2b Tier 2 - Convergent (Silver)");
  assert.notEqual(std, STANDARD_TEXT, "fixture anchor no longer matches STANDARD.md; update this test");
  const tokens = parseTierTokens(std);
  assert.equal(tokens["2.2"].length, 0, "the rename should empty sec 2.2's extraction");
  // And the point: verify() alone stays silent, which is exactly why the floors are a separate test.
  assert.deepEqual(verify(tokens, parseMatrix(SYNTHETIC_MATRIX)), []);
});

test("the boundary regex handles BOTH 'A <Tier>-tier plugin MUST' and 'An Advanced-tier plugin MUST'", () => {
  // Regression guard for this file's own first false positive: a boundary matching only "A " ran
  // past sec 2.3's "An Advanced-tier plugin MUST" and swallowed four requirement bullets
  // ("document every hook", "its event", "its scope", ...) as if they were component types.
  const tokens = parseTierTokens(STANDARD_TEXT);
  assert.deepEqual(tokens["2.3"], ["hooks", "output styles", "statusline", "self-hosting ci"]);
});
