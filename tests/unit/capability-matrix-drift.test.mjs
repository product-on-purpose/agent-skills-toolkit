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
    const norm = (x) => x.trim().replace(/\.$/, "").replace(/^full\s+/i, "").replace(/\s+/g, " ").toLowerCase();
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
  "| References / assets | 3.1 | yes | yes | . |",
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
  const dropped = SYNTHETIC_MATRIX.replace("| References / assets | 3.1 | yes | yes | . |\n", "");
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
  // Parenthetical tokens come first, then the main split. The four requirement bullets must NOT
  // appear at all - their presence is the regression this pins.
  assert.deepEqual(tokens["2.3"],
    ["session lifecycle", "tool-use guards", "hooks", "output styles", "statusline", "self-hosting ci"]);
  for (const swallowed of ["document every hook", "its event", "its scope", "pass its own validation"]) {
    assert.ok(!tokens["2.3"].includes(swallowed), `sec 2.3 must not extract the requirement bullet "${swallowed}"`);
  }
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

const FOUNDATION_DIRS = ["foundation", "foundation/claims", "foundation/sources", "foundation/synthesis"];
const INVENTORY_SKIP = new Set(["README.md"]);

/** G8's semantics, applied to foundation/ only: title, an inventory, and set-equal children. */
function folderGuideFindings(root) {
  const out = [];
  for (const rel of FOUNDATION_DIRS) {
    const dir = path.join(root, rel);
    const readme = path.join(dir, "README.md");
    if (!existsSync(readme)) { out.push(`${rel}/ has no README.md`); continue; }
    const text = readFileSync(readme, "utf8");
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!fm || !/^title:\s*\S/m.test(fm[1])) out.push(`${rel}/README.md has no non-empty frontmatter title`);
    const invAt = text.indexOf("## Inventory");
    if (invAt === -1) { out.push(`${rel}/README.md has no "## Inventory" section`); continue; }
    const listed = new Set();
    for (const line of text.slice(invAt).split("\n").slice(1)) {
      if (/^##\s/.test(line)) break;
      if (!/^\s*[-*]\s/.test(line)) continue;
      const m = /`([^`]+)`/.exec(line);
      if (m) listed.add(m[1].replace(/\/$/, ""));
    }
    const onDisk = new Set(readdirSync(dir).filter((n) => !INVENTORY_SKIP.has(n)));
    for (const n of onDisk) if (!listed.has(n)) out.push(`${rel}/README.md: child "${n}" is on disk but not in the inventory`);
    for (const n of listed) if (!onDisk.has(n)) out.push(`${rel}/README.md: inventory lists "${n}", which is not on disk`);
  }
  return out;
}


test("foundation/'s four folder guides carry a title, an inventory, and children that set-equal what is on disk", () => {
  const f = folderGuideFindings(REPO);
  assert.deepEqual(f, [], `foundation folder-guide findings:\n  - ${f.join("\n  - ")}`);
});

test("NEGATIVE: the foundation folder-guide check fires on a phantom and on an unlisted child", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-foundation-guide-"));
  try {
    for (const rel of FOUNDATION_DIRS) mkdirSync(path.join(dir, rel), { recursive: true });
    // Correct guides for the three subfolders, so only the top-level one is under test.
    for (const rel of FOUNDATION_DIRS.slice(1)) {
      writeFileSync(path.join(dir, rel, "README.md"), `---\ntitle: "${rel}"\n---\n\n## Inventory\n\n`, "utf8");
    }
    writeFileSync(path.join(dir, "foundation", "surveys.md"), "x\n", "utf8");
    writeFileSync(path.join(dir, "foundation", "README.md"),
      `---\ntitle: "foundation"\n---\n\n## Inventory\n\n- \`claims/\` - ok.\n- \`sources/\` - ok.\n- \`synthesis/\` - ok.\n- \`ghost.md\` - not on disk.\n`, "utf8");
    const f = folderGuideFindings(dir);
    assert.ok(f.some((x) => x.includes('"surveys.md" is on disk but not in the inventory')), `expected an unlisted-child finding; got ${JSON.stringify(f)}`);
    assert.ok(f.some((x) => x.includes('lists "ghost.md", which is not on disk')), `expected a phantom finding; got ${JSON.stringify(f)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
