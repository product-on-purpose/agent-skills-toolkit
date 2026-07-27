import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { CHECKS } from "../../scripts/lib/registry.mjs";
import { REPORT_META, metaFor } from "../../scripts/lib/report-meta.mjs";
import { evaluate, buildConditional } from "../../scripts/evaluate.mjs";
import { gateExitFromFindings } from "../../scripts/check.mjs";
import { renderMarkdown, renderHtml } from "../../scripts/lib/report-render.mjs";

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
