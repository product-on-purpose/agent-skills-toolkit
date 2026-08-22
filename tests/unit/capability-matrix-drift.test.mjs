import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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
  // From a PARENTHETICAL. Sec 2.1's first bullet spells the progressive-disclosure bundle inside
  // parentheses, so this token exists only because parenthetical contents are extracted too.
  ["skill.md + references/", "References / assets"],
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
  // Parenthetical tokens that are not component types.
  ["scripts/", "part of the same progressive-disclosure bundle as references/, covered by the References / assets row"],
  ["assets/", "part of the same progressive-disclosure bundle as references/, covered by the References / assets row"],
  ["the server is portable; only its registration location differs", "a clarifying note about MCP, not a component"],
  ["session lifecycle", "a category of hook event, not a component"],
  ["tool-use guards", "a category of hook event, not a component"],
]);

/** A broken parser must fail loudly rather than pass vacuously. */
// tokensPerTier was 1 against live extractions of 7, 5 and 6, so a tier could lose most of its
// component bullets and still clear the floor - total emptiness was caught, partial loss was not.
// Raised to 3, which is a FLOOR and not an equality pin: pinning the live counts would reject a
// legitimate removal, which is the change-prohibition shape the false-FAIL lens found three of.
// The remaining gap - a tier losing ONE component type - is only closable by the reverse-direction
// check this file's docblock declares out of scope. Filed rather than half-built.
const FLOORS = { tokensPerTier: 3, componentRows: 8, honestRows: 2, agentColumns: 2, foundationChildren: 1 };

/** Columns of the component table that name a document, not an agent. */
const NON_AGENT_COLUMNS = new Set(["Component", "Standard", "Notes"]);

/**
 * A FIXED floor, not a moving window. A real, non-future, non-placeholder date still carries no
 * currency if it predates the project: `1970-01-01` passed every other check. A staleness WINDOW
 * would catch it and would also fail on a future date with no code change, which is the calendar-bomb
 * `vendor-watch` had to remove from its own verdict logic. A fixed floor never fires spontaneously.
 */
const EARLIEST_PLAUSIBLE_READING = "2025-01-01";

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
    // Deliberately LOOSE: any line introducing the tier's requirement list ends the component bullets.
    // The first version matched only "A <Tier>-tier plugin MUST" and missed sec 2.3's "An", swallowing
    // four requirement bullets as component types. The false-FAIL lens then showed a second reword would
    // do it again - lowercase "must", "Convergent-tier plugins MUST", "A Tier 2 plugin MUST" - each
    // producing a wall of findings telling the maintainer that prose is a missing component type. So the
    // SHAPE is widened rather than the one instance patched.
    // #{1,3} - SHALLOWER-OR-EQUAL to the tier heading's own level. Widening this to #{2,6} to fix a
    // false FAIL created a new one: a #### heading is a SUBSECTION OF a tier section, not the end of
    // it, so adding a note inside sec 2.2 truncated extraction to zero and only the floor noticed. A
    // terminator that matches more aggressively ends the section too early. Found by probing the fix
    // set directly rather than reasoning about it.
    const end = rest.search(/\n(?:#{1,3}\s|An?\s+[A-Za-z0-9 -]*?tier\s+plugins?\s+must\b)/i);
    const body = rest.slice(0, end === -1 ? rest.length : end);
    const tokens = [];
    // Strips ** as well as backticks, matching parseMatrix's strip(). Without it, bolding a component
    // name in a tier bullet - "- **Subagents**, slash commands" - yields the token "**subagents**",
    // which misses the "subagents" alias and is reported as an unknown component type. Pure formatting,
    // hard fail, and the asymmetry with parseMatrix made it look deliberate. Found by the false-FAIL lens.
    const norm = (x) => x.trim().replace(/\*\*/g, "").replace(/\.$/, "").replace(/^full\s+/i, "").replace(/\s+/g, " ").toLowerCase();
    for (const line of body.split("\n")) {
      if (!/^\s*-\s+/.test(line)) continue;
      const raw = line.replace(/^\s*-\s+/, "").replace(/`/g, "");
      // Parentheticals are extracted SEPARATELY rather than discarded. Stripping them stops the
      // comma-split from shredding sec 2.1's bundle, but it also made everything inside them
      // invisible - and "references/" lives inside one, which left the matrix's
      // "References / assets" row entirely unguarded. Wave 1 found that by deleting the row and
      // watching all eleven tests pass.
      for (const inner of raw.match(/\(([^)]*)\)/g) ?? []) {
        for (const piece of inner.slice(1, -1).split(",")) { const t = norm(piece); if (t) tokens.push(t); }
      }
      for (const piece of raw.replace(/\([^)]*\)/g, " ").split(/,| and /)) {
        const t = norm(piece); if (t) tokens.push(t);
      }
    }
    out[sec] = tokens;
  }
  return out;
}

/** Strip fenced code blocks, so a fenced EXAMPLE is neither counted as a child nor flagged a phantom. */
function stripFences(text) {
  return text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "");
}

/** The first markdown table under `heading`, as { header: [...], rows: [[...]] }. */
function tableUnder(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return null;
  const lines = text.slice(start).split("\n");
  let i = lines.findIndex((l) => /^\s*\|/.test(l));
  if (i === -1) return null;
  // Splits on UNESCAPED pipes only, and unescapes what survives. This repository ships
  // scripts/lib/md-escape.mjs precisely to write a literal pipe into a cell, and splitting on every
  // pipe turned one such Notes cell into an extra column - which the new arity check then reported as
  // a truncated row. A false FAIL on output this repo's own helper produces.
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
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
  const compHeader = (comp?.header ?? []).map(strip);
  // The honest table's columns are located BY NAME, not by position. Reading r[1] and r[2] positionally
  // meant inserting any column re-pointed the date check at the wrong cell - it would certify a column
  // nobody chose while the real one went stale. The component table's header was already consulted; this
  // one was parsed and thrown away. Found by the false-PASS lens.
  const hHeader = (honest?.header ?? []).map(strip);
  const iAgainst = hHeader.findIndex((h) => /confirmed against/i.test(h));
  const iOn = hHeader.findIndex((h) => /^on$/i.test(h));
  return {
    components: new Set((comp?.rows ?? []).map((r) => strip(r[0]))),
    // Full rows, keyed by component name, so verify() can read the ANSWER cells. Discarding them at
    // parse time made the matrix's entire capability content structurally unreachable by the guard
    // named after it: every agent answer could be blanked and every test still passed.
    componentCells: new Map((comp?.rows ?? []).map((r) => [strip(r[0]), r.map(strip)])),
    componentHeader: compHeader,
    agentColumns: compHeader.filter((h) => h && !NON_AGENT_COLUMNS.has(h)),
    honestColumns: { against: iAgainst, on: iOn },
    confirmed: new Map((honest?.rows ?? []).map((r) => [
      strip(r[0]),
      { against: strip(r[iAgainst] ?? ""), on: strip(r[iOn] ?? "") },
    ])),
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
  // ROW ARITY. cells() returns however many cells it finds, and nothing compared that to the header, so
  // a truncated row parsed cleanly - and the cell it dropped was the Codex answer, which is exactly what
  // this release added. Found by the false-PASS lens.
  const width = matrix.componentHeader.length;
  for (const [name, cells] of matrix.componentCells) {
    if (width && cells.length !== width) {
      findings.push(`matrix row "${name}" has ${cells.length} cells under a ${width}-column header. A truncated row silently drops an agent's answer while the row name still parses.`);
      continue;
    }
    // AND THE ANSWER ITSELF. Row presence is not agreement: every agent answer in the matrix could be
    // blanked and this guard passed, while its own docblock says its job is that the matrix agrees with
    // the Standard. The answers are the matrix's entire product.
    for (const agent of matrix.agentColumns) {
      const at = matrix.componentHeader.indexOf(agent);
      if (at === -1) continue;
      if (!String(cells[at] ?? "").trim()) {
        findings.push(`matrix row "${name}" has an EMPTY "${agent}" cell. A row whose capability answer is blank agrees with nothing.`);
      }
    }
  }

  const NULLISH = new Set(["none", "n/a", "na", "tbd", "unknown", "-", "?", "pending"]);
  for (const agent of matrix.agentColumns) {
    const rec = matrix.confirmed.get(agent);
    if (!rec) {
      findings.push(`the matrix has an agent column "${agent}" with no row in "Keeping the matrix honest". Every agent the matrix makes claims about must carry a confirmed-against reading and a date.`);
      continue;
    }
    if (!rec.against || NULLISH.has(rec.against.toLowerCase())) {
      findings.push(`agent "${agent}" has no real "Confirmed against" value (found "${rec.against}"). A placeholder is a currency claim with no currency evidence, which is the defect that section exists to prevent.`);
    }
    // A REAL calendar date, and not in the future. Deliberately NOT a staleness window: a window would
    // make this test fail on a future date with no code change, which is the calendar-bomb the watch
    // itself had to remove. This catches the impossible date and the future typo, both always wrong.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rec.on);
    const asDate = m ? new Date(`${rec.on}T00:00:00Z`) : null;
    const realDate = asDate && !Number.isNaN(asDate.getTime()) && asDate.toISOString().slice(0, 10) === rec.on;
    if (!realDate) {
      findings.push(`agent "${agent}" has no real ISO date in its "On" cell (found "${rec.on}").`);
    } else if (rec.on < EARLIEST_PLAUSIBLE_READING) {
      findings.push(`agent "${agent}" has an implausible "On" date (${rec.on}), earlier than this project existed. A date that old is a currency claim with no currency, which is the defect this section exists to prevent.`);
    } else if (asDate.getTime() > Date.now() + 86400000) {
      findings.push(`agent "${agent}" has a FUTURE "On" date (${rec.on}). A reading cannot have happened yet.`);
    }
  }
  return findings;
}

/** Floor violations as a LIST, so a negative test can assert the floors actually fire. */
function floorViolations(tokens, matrix) {
  const out = [];
  for (const sec of TIER_SECTIONS) {
    const n = (tokens[sec] ?? []).length;
    if (n < FLOORS.tokensPerTier) out.push(`sec ${sec} yielded ${n} tokens (floor ${FLOORS.tokensPerTier}); the heading or its bullet list moved, and every subset assertion would pass vacuously.`);
  }
  if (matrix.components.size < FLOORS.componentRows) out.push(`parsed ${matrix.components.size} component rows, floor ${FLOORS.componentRows}`);
  if (matrix.confirmed.size < FLOORS.honestRows) out.push(`parsed ${matrix.confirmed.size} confirmed-against rows, floor ${FLOORS.honestRows}`);
  if (matrix.agentColumns.length < FLOORS.agentColumns) out.push(`derived ${matrix.agentColumns.length} agent columns, floor ${FLOORS.agentColumns}`);
  return out;
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
  const v = floorViolations(parseTierTokens(STANDARD_TEXT), parseMatrix(MATRIX_TEXT));
  assert.deepEqual(v, [], `floor violations:\n  - ${v.join("\n  - ")}`);
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
  // A FLOOR and a membership check, not an equality pin. The earlier deepEqual against
  // ["Claude Code", "Codex"] had the exact inverse of this test's stated purpose: a correctly added
  // fourth column - header cell, separator, one cell per row, and its honest-table row ALREADY present -
  // satisfies verify() on the first try and failed here anyway. A newly added column could not ESCAPE
  // the guard; it could not SATISFY it. Column reordering failed too, which verify() is indifferent to.
  // The derivation itself is proved by the synthetic three-column negative test below.
  assert.ok(m.agentColumns.length >= FLOORS.agentColumns, `derived ${m.agentColumns.length} agent columns`);
  for (const required of ["Claude Code", "Codex"]) {
    assert.ok(m.agentColumns.includes(required), `${required} must remain an agent column`);
  }
  // Extra honest-table rows are fine - Cowork is modelled in prose rather than as a column today.
  assert.ok(m.confirmed.has("Cowork"), "Cowork should still carry a reading even while it is not a column");
});

// ---------------------------------------------------------------------------------------------
// The negative cases. These are the point: a guard that cannot be shown failing is not a guard, and
// keeping the failures as standing tests is stronger than demonstrating them once by hand.
// ---------------------------------------------------------------------------------------------

/** One synthetic component row, so negative tests can name a row without hardcoding its whole text. */
const synthRow = (name) => `| ${name} | 3.x | yes | yes | . |`;

/**
 * The component rows are DERIVED from the live matrix, not frozen.
 *
 * The first version was a hand-copied duplicate, and the false-FAIL lens showed what that costs: adding
 * one component type correctly - to STANDARD.md, to ALIASES, and to the real matrix - left the live test
 * green and turned SEVEN fixture-backed tests red, each reporting `2 !== 1` under a name about agent
 * columns or ISO dates or boundary regexes. Nothing said "add the row to SYNTHETIC_MATRIX". Deriving
 * removes the lockstep obligation instead of documenting it.
 *
 * The honest table stays literal: two rows are the point of those tests, and they must not track a live
 * file that has three.
 */
const SYNTHETIC_MATRIX = [
  "## By component type", "",
  "| Component | Standard | Claude Code | Codex | Notes |",
  "|---|---|---|---|---|",
  ...[...parseMatrix(MATRIX_TEXT).components].sort().map(synthRow), "",
  "## Keeping the matrix honest", "",
  "| Agent | Confirmed against | On | How |",
  "|---|---|---|---|",
  "| Claude Code | `2.1.235` | 2026-08-18 | read |",
  "| Codex | plugins page as published | 2026-08-18 | read |", "",
].join("\n");

test("NEGATIVE: a tier section gaining an unknown component type is reported, and the message says what to decide", () => {
  // Adds a bullet to sec 2.2 rather than rewriting its existing one. The earlier version pinned that
  // bullet's exact text, so ANY correct edit to it broke the fixture - including adding a component
  // type, which is precisely the edit this guard exists to support. Its message was good and it was
  // still a false fail; anchoring on the HEADING survives edits to the bullets beneath it.
  const HEADING_2_2 = "### 2.2 Tier 2 - Convergent (Silver)";
  assert.ok(STANDARD_TEXT.includes(HEADING_2_2), "sec 2.2's heading moved; update this test");
  const std = STANDARD_TEXT.replace(HEADING_2_2, `${HEADING_2_2}\n- connectors.`);
  assert.notEqual(std, STANDARD_TEXT);
  const findings = verify(parseTierTokens(std), parseMatrix(SYNTHETIC_MATRIX));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /names "connectors"/);
  assert.match(findings[0], /add an alias plus a matrix row/);
});

test("NEGATIVE: a component type the Standard names but the matrix dropped is reported", () => {
  const matrix = SYNTHETIC_MATRIX.replace(synthRow("Hook") + "\n", "");
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
  assert.match(findings[0], /no real ISO date/);
});

test("NEGATIVE: a NEW agent column added to the matrix cannot escape the guard", () => {
  const matrix = SYNTHETIC_MATRIX
    .replace("| Component | Standard | Claude Code | Codex | Notes |", "| Component | Standard | Claude Code | Codex | Cowork | Notes |")
    .replace("|---|---|---|---|---|", "|---|---|---|---|---|---|")
    // Every row gains a cell too. A header-only widening is now itself a finding (row arity), which is
    // correct: a six-column header over five-column rows drops an agent's answer silently.
    .replaceAll("| yes | yes | . |", "| yes | yes | yes | . |");
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
  // verify() alone stays SILENT - which is exactly why the floors exist...
  assert.deepEqual(verify(tokens, parseMatrix(SYNTHETIC_MATRIX)), []);
  // ...and THIS is the assertion adversarial wave 1 found missing. Without it, setting
  // FLOORS.tokensPerTier to 0 left all eleven tests green, so nothing proved the floors caught
  // anything. A floor nobody exercises is the same class of defect the floors exist to prevent.
  const v = floorViolations(tokens, parseMatrix(SYNTHETIC_MATRIX));
  assert.ok(v.some((x) => x.includes("sec 2.2")), `the floors must fire on a renamed heading; got: ${JSON.stringify(v)}`);
});

test("NEGATIVE: a dropped References / assets row IS caught (it was not, until parentheticals were extracted)", () => {
  // Wave 1's reproduction: sec 2.1 names references/ only INSIDE a parenthetical, so while
  // parentheticals were discarded this row had no token pointing at it and could be deleted freely.
  const dropped = SYNTHETIC_MATRIX.replace(synthRow("References / assets") + "\n", "");
  assert.ok(!parseMatrix(dropped).components.has("References / assets"), "fixture should have lost the row");
  const findings = verify(parseTierTokens(STANDARD_TEXT), parseMatrix(dropped));
  assert.equal(findings.length, 1, `expected exactly the dropped-row finding, got: ${JSON.stringify(findings)}`);
  assert.match(findings[0], /matrix row "References \/ assets"/);
});

test("the boundary regex handles BOTH 'A <Tier>-tier plugin MUST' and 'An Advanced-tier plugin MUST'", () => {
  // Regression guard for this file's own first false positive: a boundary matching only "A " ran
  // past sec 2.3's "An Advanced-tier plugin MUST" and swallowed four requirement bullets
  // ("document every hook", "its event", "its scope", ...) as if they were component types.
  const tokens = parseTierTokens(STANDARD_TEXT);
  // Asserts ONLY what the regression is about. An earlier version deepEqual'd the whole extraction
  // against a frozen list, which made every edit to sec 2.3 fail - reordering two words, adding a
  // component correctly - and reported it under a comment about a boundary-regex bug, so a maintainer
  // who reordered a bullet was told the boundary regex regressed. A regression pin that doubles as a
  // change-prohibition, misdiagnosing its own failure. Found by the false-FAIL lens.
  assert.ok(tokens["2.3"].includes("hooks"), "sec 2.3 must still yield its component tokens");
  for (const swallowed of ["document every hook", "its event", "its scope", "pass its own validation"]) {
    assert.ok(!tokens["2.3"].includes(swallowed), `sec 2.3 must not extract the requirement bullet "${swallowed}"`);
  }
});


// ---------------------------------------------------------------------------------------------
// Probes of the FIX SET itself. Three of these were live defects in the code written to answer the
// adversarial panel - found by running an adversarial battery against the guard rather than by
// reasoning about it. Kept as standing tests because the pattern that produced them (each fix
// introducing a defect of the class it was fixing) has recurred four times in one release.
// ---------------------------------------------------------------------------------------------

test("a #### subheading INSIDE a tier section does not truncate its extraction", () => {
  // The boundary was briefly widened to #{2,6} to stop rejecting reworded requirement lead-ins. That
  // made a DEEPER heading end the section, so a note added inside sec 2.2 cut its bullets off and
  // extraction went to zero - caught only by the floor, and reported as a vanished heading.
  // The anchor carries NO newline. An earlier version ended it with "\n" and passed locally while
  // failing on the Windows CI runner: a clean checkout is CRLF, so "(Silver)\n" never matched and the
  // fixture silently became a no-op. It passed here only because this file's own probe script rewrites
  // STANDARD.md with LF - the test was being run against a file the tooling had normalized.
  const H = "### 2.2 Tier 2 - Convergent (Silver)";
  assert.ok(STANDARD_TEXT.includes(H), "sec 2.2's heading moved; update this test");
  const std = STANDARD_TEXT.replace(H, `${H}\n\n#### A clarifying note\n\nSome prose.\n`);
  assert.notEqual(std, STANDARD_TEXT);
  const tokens = parseTierTokens(std);
  assert.ok(tokens["2.2"].includes("subagents"),
    `a subsection heading must not end the tier section; got ${JSON.stringify(tokens["2.2"])}`);
  assert.deepEqual(floorViolations(tokens, parseMatrix(MATRIX_TEXT)), []);
});

test("an escaped pipe in a Notes cell is content, not a column boundary", () => {
  // scripts/lib/md-escape.mjs exists to write a literal pipe into a markdown cell. Splitting on every
  // pipe turned such a cell into an extra column, which the arity check then reported as a truncated
  // row: a false FAIL on output this repository's own helper produces.
  const matrix = MATRIX_TEXT.replace(
    "| Output style | 2.3 (Advanced) | yes | no |",
    "| Output style | 2.3 (Advanced) | yes | no |").replace(
    "Codex has no output-style feature; Claude-only.",
    "Claude-only \\| see sec 2.3.");
  assert.notEqual(matrix, MATRIX_TEXT, "the Output style Notes cell moved; update this test");
  assert.deepEqual(verify(parseTierTokens(STANDARD_TEXT), parseMatrix(matrix)), []);
});

test("NEGATIVE: a real, non-future, non-placeholder date that predates the project is still reported", () => {
  // 1970-01-01 passed every other check: it is a real calendar date, it is not in the future, and it
  // is not a placeholder word. A currency claim with no currency, in the section written against
  // exactly that. Caught by a FIXED floor rather than a staleness window, which would be a
  // calendar-bomb: it would start failing on a future date with no code change.
  const matrix = MATRIX_TEXT.replace("| Claude Code | `2.1.235` | 2026-08-18 |",
                                     "| Claude Code | `2.1.235` | 1970-01-01 |");
  assert.notEqual(matrix, MATRIX_TEXT, "the Claude Code honest row moved; update this test");
  const findings = verify(parseTierTokens(STANDARD_TEXT), parseMatrix(matrix));
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.match(findings[0], /implausible "On" date/);
});

// ---------------------------------------------------------------------------------------------
// foundation/'s own folder guides.
//
// WHY THIS LIVES HERE AND NOT IN G8. The first attempt added "foundation" and its three layers to
// FIXED_ROOTS in scripts/checks/folder-readme.mjs. That was wrong, and adversarial wave 1 caught it:
// G8 is a SPINE check that grades other people's plugins, so the change silently imposed this
// repository's private evidence layout on any third-party plugin that happened to use a folder
// called `foundation/`. Reproduced with a throwaway plugin containing an empty foundation/: it took
// a gate-failing error demanding a README.
//
// The measurement that was offered as proof did not support the claim it was hung on. All six
// registry members were graded before and after and nothing moved - true, and uninformative, since
// none of them HAS a foundation/ folder. A narrower question was answered than the one asked.
//
// So the FIXED_ROOTS change is reverted and the guard lives here instead, where it grades exactly
// one repository: this one. That is also what ADR 0055 said in the first place - "W4 adds exactly
// one guard, and it guards the matrix rather than graded plugins."
// ---------------------------------------------------------------------------------------------

// DISCOVERED, not listed. A fixed list of four meant a fifth subfolder - probes/ being the one ADR
// 0055 explicitly left open - could ship with no README, no title and no inventory, and be checked by
// nothing, as long as the parent listed it. Found by the false-PASS lens.
function foundationDirs(root) {
  const base = path.join(root, "foundation");
  if (!existsSync(base)) return [];
  const out = ["foundation"];
  const walk = (rel) => {
    for (const n of readdirSync(path.join(root, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!n.isDirectory() || INVENTORY_SKIP.has(n.name)) continue;
      const child = `${rel}/${n.name}`;
      out.push(child);
      walk(child);
    }
  };
  walk("foundation");
  return out;
}
// MIRRORS G8's list (scripts/checks/folder-readme.mjs), which exists because readdirSync surfaces
// UNTRACKED entries. The first version here held only README.md, so a .DS_Store from opening the folder
// in Finder - gitignored, invisible to git status - turned `npm test` red and told the maintainer to add
// it to the inventory, which would then get committed. Found by the false-FAIL lens.
const INVENTORY_SKIP = new Set([
  ".git", "node_modules", ".venv", "venv", "dist", ".astro",
  "README.md", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".gitkeep", ".DS_Store",
]);

/** G8's semantics, applied to foundation/ only: title, an inventory, and set-equal children. */
function folderGuideFindings(root) {
  const out = [];
  for (const rel of foundationDirs(root)) {
    const dir = path.join(root, rel);
    const readme = path.join(dir, "README.md");
    if (!existsSync(readme)) { out.push(`${rel}/ has no README.md`); continue; }
    const text = readFileSync(readme, "utf8");
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!fm || !/^title:\s*\S/m.test(fm[1])) out.push(`${rel}/README.md has no non-empty frontmatter title`);
    // Fence-stripped, heading-agnostic, line-anchored - all three matching G8. Scanning raw text made a
    // fenced EXAMPLE list item inside the inventory read as a phantom child, and these guides already
    // carry fenced examples. Accepting only the literal "## Inventory" rejected "## Contents", which G8
    // explicitly blesses, and then SKIPPED that folder's set-equality entirely: a false fail that also
    // silently dropped the real check. Both found by the false-FAIL lens.
    const body = stripFences(text);
    const hm = /^#{1,6}[ \t]+(inventory|contents|repository map|repository structure)[ \t]*$/im.exec(body);
    if (!hm) { out.push(`${rel}/README.md has no inventory section (a heading reading Inventory, Contents, Repository map or Repository structure)`); continue; }
    const listed = new Set();
    for (const line of body.slice(hm.index).split("\n").slice(1)) {
      if (/^#{1,6}\s/.test(line)) break;
      if (!/^\s*[-*]\s/.test(line)) continue;
      const m = /`([^`]+)`/.exec(line);
      if (m) listed.add(m[1].replace(/\/$/, ""));
    }
    // SORTED, because readdirSync order is filesystem-dependent: b-tree order on NTFS, unordered on
    // ext4. Unsorted, two unlisted children produce the same SET of findings in a different ORDER on
    // Linux CI than on a Windows checkout, so the assertion message differs between machines for the
    // same defect. It cannot flip pass/fail here - the live test asserts an empty array - but a
    // diagnostic that is not reproducible is a diagnostic someone has to re-derive. Found by the
    // determinism lens, which also noted G8 carries the identical unsorted pattern.
    const onDisk = new Set(readdirSync(dir).filter((n) => !INVENTORY_SKIP.has(n)).sort());
    // A FLOOR for the folder half. Both sides empty was a pass, so deleting every record under
    // sources/ and its four inventory bullets left the suite green on a layer-1 evidence folder holding
    // nothing but its own guide. The matrix half had anti-vacuity floors; this half had none.
    if (onDisk.size < FLOORS.foundationChildren) {
      out.push(`${rel}/ holds ${onDisk.size} non-README children; an evidence folder that is empty agrees with nothing`);
    }
    for (const n of [...onDisk].sort()) if (!listed.has(n)) out.push(`${rel}/README.md: child "${n}" is on disk but not in the inventory`);
    // The existsSync clause is G8's, and it is what lets a SKIPPED-but-present file be listed
    // harmlessly. Without it, a guide listing its own README.md was told that file "is not on disk" -
    // a false fail whose message is also factually wrong, which is worse than a bare mismatch.
    for (const n of [...listed].sort()) {
      // The escape is INVENTORY_SKIP membership, not existsSync on a joined path. existsSync accepted
      // any resolvable relative path, so listing `synthesis/tier-basis.md` or `../STANDARD.md` in a
      // parent's inventory suppressed the phantom finding while breaking the set-equality the docblock
      // claims. It was added for one real case - a guide listing its own README, which INVENTORY_SKIP
      // removes from onDisk - and that case is exactly what membership covers. Found by false-PASS.
      if (!onDisk.has(n) && !INVENTORY_SKIP.has(n)) {
        out.push(`${rel}/README.md: inventory lists "${n}", which is not an immediate child`);
      }
    }
  }
  return out;
}


test("foundation/'s four folder guides carry a title, an inventory, and children that set-equal what is on disk", () => {
  const f = folderGuideFindings(REPO);
  assert.deepEqual(f, [], `foundation folder-guide findings:\n  - ${f.join("\n  - ")}`);
});

test("NEGATIVE: the foundation folder-guide check fires on a phantom and on an unlisted child", () => {
  const NL = String.fromCharCode(10);
  const dir = mkdtempSync(path.join(tmpdir(), "askit-foundation-guide-"));
  try {
    // Each subfolder gets a correct guide AND a child, so only the top-level guide is under test.
    // The children matter now: the folder floor treats an empty evidence folder as a finding.
    for (const rel of ["claims", "sources", "synthesis"]) {
      const sub = path.join(dir, "foundation", rel);
      mkdirSync(sub, { recursive: true });
      writeFileSync(path.join(sub, "one.md"), "x", "utf8");
      writeFileSync(path.join(sub, "README.md"),
        ["---", 'title: "' + rel + '"', "---", "", "## Inventory", "", "- `one.md` - ok."].join(NL), "utf8");
    }
    writeFileSync(path.join(dir, "foundation", "surveys.md"), "x", "utf8");
    writeFileSync(path.join(dir, "foundation", "README.md"),
      ["---", 'title: "foundation"', "---", "", "## Inventory", "",
       "- `claims/` - ok.", "- `sources/` - ok.", "- `synthesis/` - ok.",
       "- `ghost.md` - not on disk."].join(NL), "utf8");
    const f = folderGuideFindings(dir);
    assert.ok(f.some((x) => x.includes('"surveys.md" is on disk but not in the inventory')), JSON.stringify(f));
    assert.ok(f.some((x) => x.includes('lists "ghost.md", which is not an immediate child')), JSON.stringify(f));
    // And the DISCOVERED-subfolder path: an unguarded fifth folder is now found, not skipped.
    mkdirSync(path.join(dir, "foundation", "probes"), { recursive: true });
    writeFileSync(path.join(dir, "foundation", "probes", "x.md"), "x", "utf8");
    const g = folderGuideFindings(dir);
    assert.ok(g.some((x) => x.startsWith("foundation/probes/ has no README.md")), JSON.stringify(g));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
