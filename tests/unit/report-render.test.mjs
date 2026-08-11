import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { CHECKS } from "../../scripts/lib/registry.mjs";
import { REPORT_META, metaFor } from "../../scripts/lib/report-meta.mjs";
import { evaluate, buildConditional } from "../../scripts/evaluate.mjs";
import { gateExitFromFindings } from "../../scripts/check.mjs";
import { renderMarkdown, renderHtml, deriveModel } from "../../scripts/lib/report-render.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, "../fixtures");
const SF = path.join(FIXTURES, "golden/silver-fixture"); // Convergent (Silver): real tier, real Gold blockers
const LONE = path.join(FIXTURES, "golden/lone-skill"); // a component, no tier
const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));
const TIER_LABEL = { universal: "Bronze", convergent: "Silver", advanced: "Gold" };
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

// Build the opts the way the evaluate.mjs CLI does, so tests render against a realistic options bag.
function optsFor(r, target) {
  let library = null;
  if (target) {
    const p = path.join(target, "library.json");
    if (existsSync(p)) library = JSON.parse(readFileSync(p, "utf8"));
  }
  const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity }));
  const { exitCode } = gateExitFromFindings(forGate, library?.tier);
  return { library, spine: SPINE, conditional: buildConditional(target), date: "2026-01-01", exitCode, reportType: "conformance" };
}

// --- report-meta coverage (the dogfood guard for a future spine addition) ---

test("report-meta: every spine reqId has a REPORT_META entry", () => {
  const missing = CHECKS.map((m) => m.meta.reqId).filter((r) => !REPORT_META[r]);
  assert.deepEqual(missing, [], `REPORT_META missing entries for: ${missing.join(", ")}`);
});

test("report-meta: metaFor returns a safe default for an unmapped reqId", () => {
  const d = metaFor("U99");
  assert.equal(typeof d.why, "string");
  assert.equal(d.fixPrompt, "");
  assert.equal(d.effort, "");
});

// --- renderer contract ---

test("rendered MD and HTML contain no em-dash or en-dash", () => {
  const r = evaluate(SF);
  const o = optsFor(r, SF);
  const md = renderMarkdown(r, o);
  const html = renderHtml(r, o);
  assert.ok(!md.includes(EM) && !md.includes(EN), "MD contains a dash");
  assert.ok(!html.includes(EM) && !html.includes(EN), "HTML contains a dash");
});

test("renderHtml is self-contained: no external asset, web font, or network reference", () => {
  const r = evaluate(SF);
  const html = renderHtml(r, optsFor(r, SF));
  assert.ok(!/<link\b/i.test(html), "must not link an external stylesheet");
  assert.ok(!/<script\s+src=/i.test(html), "must not load an external script");
  assert.ok(!/src="https?:/i.test(html), "must not reference an http asset");
  assert.ok(!/@import/i.test(html), "must not @import");
  assert.ok(!/url\(\s*['"]?https?:/i.test(html), "must not fetch a remote url()");
  assert.ok(/<style>/i.test(html), "must inline a <style> block");
  const scripts = html.match(/<script\b/gi) || [];
  assert.equal(scripts.length, 1, "exactly one inline <script> (TOC/copy/print)");
});

test("renderHtml renders all 11 IA section anchors in order", () => {
  const r = evaluate(SF);
  const html = renderHtml(r, optsFor(r, SF));
  let last = -1;
  for (let i = 1; i <= 11; i++) {
    const id = `s${String(i).padStart(2, "0")}`;
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at >= 0, `missing IA section ${id}`);
    assert.ok(at > last, `IA section ${id} out of order`);
    last = at;
  }
});

// F4 (E12): a consolidated per-check glossary, rendered once per report, covering EVERY spine check
// (including the PASS/N/A rows that surface no inline why), sourced from REPORT_META (zero model tokens).
test("renderMarkdown emits a per-check glossary (section 11) covering every spine check with its why", () => {
  const r = evaluate(SF);
  const md = renderMarkdown(r, optsFor(r, SF));
  const gi = md.indexOf("## 11 Per-check glossary");
  assert.ok(gi >= 0, "glossary section 11 must exist");
  const gloss = md.slice(gi);
  for (const { reqId } of SPINE) assert.ok(gloss.includes(reqId), `glossary missing ${reqId}`);
  assert.ok(gloss.includes(REPORT_META.U13.why.slice(0, 40)), "glossary must carry the U13 why from REPORT_META");
});

test("renderHtml emits a glossary section #s11 linked in the TOC, covering every spine check", () => {
  const r = evaluate(SF);
  const html = renderHtml(r, optsFor(r, SF));
  assert.ok(html.includes('id="s11"'), "glossary section s11 must exist");
  assert.ok(html.includes('href="#s11"'), "the TOC must link the glossary");
  const gloss = html.slice(html.indexOf('id="s11"'));
  for (const { reqId } of SPINE) assert.ok(gloss.includes(reqId), `HTML glossary missing ${reqId}`);
});

test("renderHtml has a left TOC, a print control, and a print stylesheet", () => {
  const r = evaluate(SF);
  const html = renderHtml(r, optsFor(r, SF));
  assert.ok(/id="toc"/i.test(html), "a TOC nav element");
  assert.ok(/window\.print\(\)/.test(html), "a print control");
  assert.ok(/@media print/.test(html), "a print stylesheet");
  assert.ok(/#5c7cfa/i.test(html), "the on-brand accent");
});

test("a hostile finding message is escaped in HTML and does not break the MD table", () => {
  const f = { check: "library-json", severity: "error", message: "bad <script>alert(1)</script> and a | pipe", file: "library.json", reqId: "U1" };
  const hostile = { scope: "plugin", target: "hostile", tier: "universal", satisfies: ["universal"], blocked: {}, summary: { errors: 1, warns: 0 }, findings: [f], byRule: { U1: [f] } };
  const o = optsFor(hostile);
  const html = renderHtml(hostile, o);
  assert.ok(!/<script>alert\(1\)<\/script>/.test(html), "raw <script> must not survive into the HTML");
  assert.ok(/&lt;script&gt;/.test(html), "the angle brackets must be escaped");
  const md = renderMarkdown(hostile, o);
  const pipeLine = md.split("\n").find((l) => l.includes("pipe")) ?? "";
  assert.ok(/\\\|/.test(pipeLine), "a literal pipe in a cell must be escaped so it does not add a column");
});

// CodeQL js/incomplete-sanitization (high), pre-existing since v1.4.0 and surfaced by the workflow's
// first PR run. Escaping the pipe WITHOUT escaping backslashes first is self-defeating: the two
// characters \| became \\| , which Markdown reads as one literal backslash followed by a BARE pipe, so
// the payload walked out of the cell and opened a new column. The test above uses a bare pipe and
// therefore could never catch it. This one uses the escape-the-escape payload.
const BACKSLASH = String.fromCharCode(92);
test("a backslash-pipe payload cannot escape a Markdown table cell (CodeQL js/incomplete-sanitization)", () => {
  const payload = `safe${BACKSLASH}| INJECTED | tail`;
  const f = { check: "library-json", severity: "error", message: payload, file: "library.json", reqId: "U1" };
  const hostile = { scope: "plugin", target: "hostile", tier: "universal", satisfies: ["universal"], blocked: {}, summary: { errors: 1, warns: 0 }, findings: [f], byRule: { U1: [f] } };
  const md = renderMarkdown(hostile, optsFor(hostile));
  const row = md.split("\n").find((l) => l.includes("INJECTED")) ?? "";
  assert.ok(row, "the payload renders somewhere in the table");

  // Count pipes the way Markdown actually reads them, left to right: a pipe is ESCAPED only when the
  // run of backslashes immediately before it is ODD. Naive textual stripping of the substring "\|" is
  // exactly the mistake that let this defect live - in `safe\\|` it "finds" an escape, but Markdown has
  // already consumed `\\` as one literal backslash and meets a BARE pipe.
  const unescapedPipes = (line) => {
    let n = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] !== "|") continue;
      let slashes = 0;
      for (let j = i - 1; j >= 0 && line[j] === BACKSLASH; j--) slashes++;
      if (slashes % 2 === 0) n++; // even run (including zero) means the pipe itself is live
    }
    return n;
  };

  // The control: the same row shape with a message carrying no pipe at all. Its live-pipe count IS the
  // table's structural column count, so this survives the table gaining a column later.
  const benign = { ...f, message: "benign message" };
  const control = { ...hostile, findings: [benign], byRule: { U1: [benign] } };
  const controlRow = renderMarkdown(control, optsFor(control)).split("\n").find((l) => l.includes("benign message")) ?? "";
  const structural = unescapedPipes(controlRow);

  assert.equal(
    unescapedPipes(row), structural,
    `the payload must contribute no LIVE pipe (structural ${structural}, got ${unescapedPipes(row)}): ${row}`
  );
});

test("component scope renders without a tier or climb and does not throw", () => {
  const r = evaluate(LONE);
  assert.equal(r.scope, "component");
  let md;
  assert.doesNotThrow(() => { md = renderMarkdown(r, optsFor(r, LONE)); });
  assert.ok(!/Tier:/.test(md), "a component must not print a Tier line");
  assert.ok(!/The climb/i.test(md), "a component must not render the climb section");
});

test("the renderer is a pure projection: it mutates nothing and renders the source verdict", () => {
  const r = evaluate(SF);
  const o = optsFor(r, SF);
  const beforeTier = r.tier, beforeCount = r.findings.length, beforeErrors = r.summary.errors;
  const md = renderMarkdown(r, o);
  renderHtml(r, o);
  assert.equal(r.tier, beforeTier, "tier must be unchanged after render");
  assert.equal(r.findings.length, beforeCount, "findings must be unchanged after render");
  assert.equal(r.summary.errors, beforeErrors, "summary must be unchanged after render");
  assert.ok(md.includes(TIER_LABEL[r.tier]), "the rendered grade must equal the source grade");
});

// --- provenance surfacing (E9/E23): resolveFindings already stamps `provenance` on every resolved
// finding (scripts/lib/resolve-config.mjs); it was invisible in the designed reports. deriveModel
// projects the lead finding's provenance onto its row exactly the way it already projects `file` and
// `migrationNotices` - a pure serialization of data already on the finding, no new computation. ---

function provenanceReport(provenance) {
  const f = { check: "reference-links", severity: "error", effectiveSeverity: "error", provenance, message: "reference link does not resolve", file: "skills/example/SKILL.md", reqId: "U6" };
  return { scope: "plugin", target: "prov", tier: "universal", satisfies: [], blocked: {}, summary: { errors: 1, warns: 0 }, findings: [f], byRule: { U6: [f] } };
}

test("deriveModel is exported and projects the lead finding's provenance onto its row", () => {
  const m = deriveModel(provenanceReport("objective"), optsFor(provenanceReport("objective")));
  const row = m.rows.find((r) => r.reqId === "U6");
  assert.ok(row, "expected a U6 row from the real spine");
  assert.equal(row.provenance, "objective");
});

test("deriveModel leaves provenance null on a row with no live finding (a PASS or N/A row)", () => {
  const r = provenanceReport("objective");
  const m = deriveModel(r, optsFor(r));
  const passRow = m.rows.find((row) => row.status === "PASS");
  assert.ok(passRow, "expected at least one PASS row in the real spine");
  assert.equal(passRow.provenance, null, "no live finding means nothing to serialize a provenance from");
});

test("renderMarkdown surfaces provenance in the section 05 evidence ledger", () => {
  const r = provenanceReport("vendor-cited");
  const md = renderMarkdown(r, optsFor(r));
  const gi = md.indexOf("## 05 Tier compliance");
  assert.ok(gi >= 0);
  const ledger = md.slice(gi, md.indexOf("## 06"));
  assert.match(ledger, /Provenance/, "the ledger table must carry a Provenance column");
  const u6Line = ledger.split("\n").find((l) => l.includes("U6") && l.includes("FAIL"));
  assert.ok(u6Line, "expected a U6 FAIL row");
  assert.match(u6Line, /vendor-cited/, "the U6 row must show its vendor-cited provenance");
});

test("renderHtml surfaces provenance in the section 05 evidence ledger", () => {
  const r = provenanceReport("house");
  const html = renderHtml(r, optsFor(r));
  const u6Row = html.slice(html.indexOf('id="row-U6"'));
  assert.match(u6Row.slice(0, u6Row.indexOf("</div></div>") + 12), /house/, "the U6 ledger row must show its house provenance");
});

// --- golden snapshots: the byte-for-byte regression lock (regenerate with UPDATE_SNAPSHOTS=1) ---

const SNAP_DIR = path.join(FIXTURES, "golden/report-render");

for (const [name, render] of [["silver-fixture.expected.md", renderMarkdown], ["silver-fixture.expected.html", renderHtml]]) {
  test(`renderer matches the committed golden snapshot: ${name}`, () => {
    const r = evaluate(SF);
    const out = render(r, optsFor(r, SF));
    const file = path.join(SNAP_DIR, name);
    if (process.env.UPDATE_SNAPSHOTS) {
      mkdirSync(SNAP_DIR, { recursive: true });
      writeFileSync(file, out);
    }
    // Golden snapshots are canonical LF (the renderer emits LF); normalize away a Windows CRLF working
    // copy (git autocrlf converts on checkout) so the byte comparison is cross-platform, not OS-dependent.
    const norm = (s) => s.replace(/\r\n/g, "\n");
    assert.equal(norm(out), norm(readFileSync(file, "utf8")), `${name} drifted; re-run with UPDATE_SNAPSHOTS=1 to regenerate and review`);
  });
}

// Reading 19 (corpus batch 3, 2026-07-27): the report asserted a tier the subject never declared.
// deriveModel fell back to `report.tier` (the EARNED tier) when library.json carried no tier, so a
// plugin declaring nothing rendered "declares the Gold (Advanced) tier and earns Gold" - and, because
// earned then always equalled "declared", the verdict card always read "matches its declared tier".
// A false PASS on the artifact third parties are shown, while the terminal gate said the honest thing
// ("no askit tier declared; not graded against the tier ladder"). The guard existed in
// tier-report.mjs humanLine() and had never been mirrored into the renderer.
test("a subject that declares no tier is not reported as declaring one (reading 19)", () => {
  const f = { check: "library-json", severity: "warn", message: "m", file: null, reqId: "U1" };
  const noTier = {
    scope: "plugin", target: "notier", tier: "advanced", satisfies: ["universal", "convergent", "advanced"],
    blocked: {}, summary: { errors: 0, warns: 0 }, findings: [], byRule: { U1: [f] },
  };
  // optsFor supplies library: null, i.e. no library.json, i.e. NO declared tier.
  const opts = { ...optsFor(noTier), library: null };
  const md = renderMarkdown(noTier, opts);
  // Subject-anchored on purpose: a loose /declares the .*tier/ also matches the glossary row explaining
  // what library.json is for, which is a true sentence and not the claim under test.
  assert.ok(!/notier declares the .*tier/i.test(md), `must not assert a declaration that does not exist:\n${md.split("\n").find((l) => /notier declares/i.test(l))}`);
  assert.ok(!/matches its declared tier/i.test(md), "must not claim a match against a tier that was never declared");
  assert.match(md, /no .*tier declared|not graded against the tier ladder/i, "must say plainly that no tier was declared");
});

test("a subject that DOES declare a tier still reports it (the false-FAIL guard for reading 19)", () => {
  const r = evaluate(SF);
  const md = renderMarkdown(r, optsFor(r, SF));
  assert.match(md, /silver-fixture declares the .*tier/i, "a real declaration must still be reported");
  assert.ok(!/no .*tier declared/i.test(md), "and must not be described as undeclared");
});

// renderHtml parallel to the reading-19 MD test: the exec body (s02), masthead header, ID-strip cell,
// and metadata section all had the same unguarded null fallback the verdict card did not. ADR 0038
// fixed renderMarkdown thoroughly and one HTML site (verdict card); the other four HTML sites were not
// mirrored. Caught by the Implementation sites retrofit (feat/adr-implementation-sites).
test("renderHtml: a subject that declares no tier is not reported as declaring one in any HTML section", () => {
  const f = { check: "library-json", severity: "warn", message: "m", file: null, reqId: "U1" };
  const noTier = {
    scope: "plugin", target: "notier", tier: "advanced", satisfies: ["universal", "convergent", "advanced"],
    blocked: {}, summary: { errors: 0, warns: 0 }, findings: [], byRule: { U1: [f] },
  };
  const opts = { ...optsFor(noTier), library: null };
  const html = renderHtml(noTier, opts);
  // Subject-anchored so we do not match the glossary sentence about what library.json is for.
  assert.ok(!/notier declares the .*tier/i.test(html), `HTML exec body must not assert a tier declaration that does not exist:\n${html.split("\n").find((l) => /notier declares/i.test(l)) ?? "(not found)"}`);
  assert.ok(!/declared tier:\s*<\/span>/i.test(html), "HTML masthead must not show an empty declared-tier label");
  assert.match(html, /no askit tier declared|not graded against the tier ladder|none declared/i, "HTML must say plainly that no tier was declared");
});

test("renderHtml: a subject that DOES declare a tier still reports it (HTML false-FAIL guard)", () => {
  const r = evaluate(SF);
  const html = renderHtml(r, optsFor(r, SF));
  assert.match(html, /silver-fixture declares the .*tier/i, "HTML: a real declaration must still be reported");
  assert.ok(!/no .*tier declared/i.test(html), "HTML: a declared tier must not be described as undeclared");
});

// Round-3 adversarial review, Finding A (designed reports discard the migration-cap explanation):
// resolveFindings (scripts/lib/resolve-config.mjs) attaches migrationNotice to a finding whose
// effectiveSeverity was pulled back down to a warn-first migration ceiling (ADR 0041). check.mjs and
// evaluate.mjs both surface it in their text output, but deriveModel here projected only
// lead.message into each rule row, so a consumer who set rules.S4 = "error" saw a plain warning in
// the Markdown/HTML report with no explanation for why their override was not honored, even though
// the CHANGELOG claims the notice "reaches the terminal and the report". A capped S4 finding is
// built directly (mirroring the "hostile finding" pattern above) rather than exercising the full
// chain-contract check, since only the migrationNotice projection is under test here.
function cappedFinding() {
  return {
    check: "chain-contract", severity: "warn", effectiveSeverity: "warn", reqId: "S4",
    message: "chain declared as a string but no matching chain contract found in agents/_chain-permitted.yaml",
    file: "skills/example/SKILL.md",
    migrationNotice: 'capped at warn until Standard 0.13 (ADR 0041: warn-first until Standard 0.13); your configured severity would otherwise be "error"',
  };
}
function cappedReport() {
  const f = cappedFinding();
  return { scope: "plugin", target: "capped", tier: "convergent", satisfies: ["universal", "convergent"], blocked: {}, summary: { errors: 0, warns: 1 }, findings: [f], byRule: { S4: [f] } };
}

test("renderMarkdown projects migrationNotice into the S4 evidence-ledger row (Finding A)", () => {
  const r = cappedReport();
  const md = renderMarkdown(r, optsFor(r));
  const s4Line = md.split("\n").find((l) => l.includes("S4") && l.includes("WARN"));
  assert.ok(s4Line, "expected an S4 WARN row in the evidence ledger");
  assert.match(md, /capped at warn until Standard 0\.13/, "the migration cap explanation must reach the Markdown report");
  assert.match(md, /your configured severity would otherwise be "error"/, "the full migrationNotice text must be preserved, not summarized away");
});

test("renderHtml projects migrationNotice into the S4 evidence-ledger row (Finding A)", () => {
  const r = cappedReport();
  const html = renderHtml(r, optsFor(r));
  assert.match(html, /capped at warn until Standard 0\.13/, "the migration cap explanation must reach the HTML report");
  assert.match(html, /your configured severity would otherwise be &quot;error&quot;|your configured severity would otherwise be "error"/, "the full migrationNotice text must be preserved (HTML-escaped) in the report");
});

// Round-4 adversarial review, Finding 2 (regression in round-3's own fix): deriveModel picks a
// single LEAD finding per requirement and, in round 3, copied migrationNotice from that lead only.
// A real S4 result can carry BOTH an array-shaped orphan finding (severity "error", untouched by
// the ADR 0041 migration cap, so its migrationNotice is null) AND a string-shaped finding capped to
// "warn" (migrationNotice set). deriveModel's lead-picking prefers the "error" finding, so the
// capped warning's migrationNotice was silently dropped whenever an uncapped error shared its
// requirement - the round-3 fix only worked when the capped finding happened to be the lead. The
// fix must collect and render every unique migrationNotice among the LIVE findings for a
// requirement, not just the lead's.
function orphanErrorFinding() {
  return {
    check: "chain-contract", severity: "error", effectiveSeverity: "error", reqId: "S4",
    message: "chain declared as an array but no matching chain contract found in agents/_chain-permitted.yaml",
    file: "skills/example-array/SKILL.md",
    migrationNotice: null,
  };
}
function mixedReport() {
  const err = orphanErrorFinding();
  const warn = cappedFinding();
  return { scope: "plugin", target: "mixed", tier: "convergent", satisfies: ["universal", "convergent"], blocked: {}, summary: { errors: 1, warns: 1 }, findings: [err, warn], byRule: { S4: [err, warn] } };
}

test("renderMarkdown: a mixed error-plus-capped-warning S4 result still surfaces the warning's migrationNotice (Finding 2)", () => {
  const r = mixedReport();
  const md = renderMarkdown(r, optsFor(r));
  const s4Line = md.split("\n").find((l) => l.includes("S4") && l.includes("FAIL"));
  assert.ok(s4Line, "expected an S4 FAIL row (the error outranks the warn for status)");
  assert.match(md, /capped at warn until Standard 0\.13/, "the capped warning's migration notice must still reach the Markdown report even though an uncapped error is the lead finding");
});

test("renderHtml: a mixed error-plus-capped-warning S4 result still surfaces the warning's migrationNotice (Finding 2)", () => {
  const r = mixedReport();
  const html = renderHtml(r, optsFor(r));
  assert.match(html, /capped at warn until Standard 0\.13/, "the capped warning's migration notice must still reach the HTML report even though an uncapped error is the lead finding");
});

test("renderMarkdown: an identical migrationNotice repeated across findings in one requirement renders once, not duplicated", () => {
  const f1 = cappedFinding();
  const f2 = { ...cappedFinding(), file: "skills/other/SKILL.md" }; // same migrationNotice text, different finding
  const r = { scope: "plugin", target: "dup", tier: "convergent", satisfies: ["universal", "convergent"], blocked: {}, summary: { errors: 0, warns: 2 }, findings: [f1, f2], byRule: { S4: [f1, f2] } };
  const md = renderMarkdown(r, optsFor(r));
  const occurrences = md.split("capped at warn until Standard 0.13").length - 1;
  assert.equal(occurrences, 1, "an identical migrationNotice shared by multiple findings must be deduplicated, not repeated");
});

// --- clampNotice (backlog E28, "the published-verdict clamp explanation never reached the shareable
// report"): resolveFindings (scripts/lib/resolve-config.mjs) attaches clampNotice to a finding whose
// severity was clamped from "off" back up to "warn" by published-verdict mode - a published verdict
// cannot let a consumer's own suppression or off-rule silently disable an objective/vendor-cited check
// the reader is trusting the report to surface. check.mjs's terminal format() already surfaces it
// (`[clamped to warn: published-verdict, ...]`); a grep for clampNotice in report-render.mjs returned
// zero matches before this fix. Mirrors the migrationNotice projection above exactly, including
// collecting every unique, non-empty clampNotice across the LIVE findings for a requirement rather than
// only the lead's - the same lead-only bug already fixed once for migrationNotice (round-4 adversarial
// review, Finding 2) must not be reintroduced here. clampNotice and migrationNotice are different
// mechanisms (a published-verdict trust clamp vs. a warn-first migration ceiling) and must be labeled
// distinctly, not merged into one generic note. ---

function clampedFinding() {
  return {
    check: "reference-links", severity: "off", effectiveSeverity: "warn", reqId: "U6",
    message: "reference link does not resolve",
    file: "skills/example/SKILL.md",
    clampNotice: 'clamped to warn in published-verdict mode (provenance objective): a published verdict cannot disable an objective or vendor-cited check',
  };
}
function clampedReport() {
  const f = clampedFinding();
  return { scope: "plugin", target: "clamped", tier: "convergent", satisfies: ["universal", "convergent"], blocked: {}, summary: { errors: 0, warns: 1 }, findings: [f], byRule: { U6: [f] } };
}

test("renderMarkdown projects clampNotice into the evidence-ledger row (E28)", () => {
  const r = clampedReport();
  const md = renderMarkdown(r, optsFor(r));
  const u6Line = md.split("\n").find((l) => l.includes("U6") && l.includes("WARN"));
  assert.ok(u6Line, "expected a U6 WARN row in the evidence ledger");
  assert.match(md, /clamped to warn in published-verdict mode/, "the clamp explanation must reach the Markdown report");
  assert.match(md, /a published verdict cannot disable an objective or vendor-cited check/, "the full clampNotice text must be preserved, not summarized away");
});

test("renderHtml projects clampNotice into the evidence-ledger row (E28)", () => {
  const r = clampedReport();
  const html = renderHtml(r, optsFor(r));
  assert.match(html, /clamped to warn in published-verdict mode/, "the clamp explanation must reach the HTML report");
});

test("renderMarkdown labels a clampNotice distinctly from a migrationNotice (E28)", () => {
  const r = clampedReport();
  const md = renderMarkdown(r, optsFor(r));
  assert.doesNotMatch(md, /Severity capped for U6/, "a clampNotice must not be rendered under the migrationNotice's label");
  assert.match(md, /Published-verdict clamp for U6/, "a clampNotice needs its own distinct label");
});

test("renderHtml labels a clampNotice distinctly from a migrationNotice (E28)", () => {
  const r = clampedReport();
  const html = renderHtml(r, optsFor(r));
  const u6Row = html.slice(html.indexOf('id="row-U6"'));
  const rowSlice = u6Row.slice(0, u6Row.indexOf("</div></div>") + 12);
  assert.ok(!/>Severity capped</.test(rowSlice), "a clampNotice must not reuse the migrationNotice's HTML label");
  assert.match(rowSlice, />Published-verdict clamp</, "a clampNotice needs its own distinct HTML label");
});

// The regression the migrationNotice fix had to be corrected for once already: copying the notice from
// only the LEAD finding of a requirement drops a notice attached to a non-lead finding. A requirement
// whose lead finding is an uncapped error (no clampNotice) but whose non-lead finding IS clamped must
// still surface the clamp.
function orphanErrorFindingNoClamp() {
  return {
    check: "reference-links", severity: "error", effectiveSeverity: "error", reqId: "U6",
    message: "reference link is malformed",
    file: "skills/other/SKILL.md",
    clampNotice: null,
  };
}
function mixedClampReport() {
  const err = orphanErrorFindingNoClamp();
  const warn = clampedFinding();
  return { scope: "plugin", target: "mixed-clamp", tier: "convergent", satisfies: ["universal", "convergent"], blocked: {}, summary: { errors: 1, warns: 1 }, findings: [err, warn], byRule: { U6: [err, warn] } };
}

test("renderMarkdown: a lead error with no clampNotice still surfaces a non-lead finding's clampNotice (E28)", () => {
  const r = mixedClampReport();
  const md = renderMarkdown(r, optsFor(r));
  const u6Line = md.split("\n").find((l) => l.includes("U6") && l.includes("FAIL"));
  assert.ok(u6Line, "the error must still be the lead (FAIL) row");
  assert.match(md, /clamped to warn in published-verdict mode/, "the non-lead warn finding's clampNotice must still reach the Markdown report even though an uncapped error is the lead finding");
});

test("renderHtml: a lead error with no clampNotice still surfaces a non-lead finding's clampNotice (E28)", () => {
  const r = mixedClampReport();
  const html = renderHtml(r, optsFor(r));
  assert.match(html, /clamped to warn in published-verdict mode/, "the non-lead warn finding's clampNotice must still reach the HTML report even though an uncapped error is the lead finding");
});

test("renderMarkdown: an identical clampNotice repeated across findings in one requirement renders once, not duplicated", () => {
  const f1 = clampedFinding();
  const f2 = { ...clampedFinding(), file: "skills/other/SKILL.md" }; // same clampNotice text, different finding
  const r = { scope: "plugin", target: "dup-clamp", tier: "convergent", satisfies: ["universal", "convergent"], blocked: {}, summary: { errors: 0, warns: 2 }, findings: [f1, f2], byRule: { U6: [f1, f2] } };
  const md = renderMarkdown(r, optsFor(r));
  const occurrences = md.split("a published verdict cannot disable an objective or vendor-cited check").length - 1;
  assert.equal(occurrences, 1, "an identical clampNotice shared by multiple findings must be deduplicated, not repeated");
});
