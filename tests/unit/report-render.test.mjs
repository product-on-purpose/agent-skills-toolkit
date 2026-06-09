import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { CHECKS } from "../../scripts/lib/registry.mjs";
import { REPORT_META, metaFor } from "../../scripts/lib/report-meta.mjs";
import { evaluate } from "../../scripts/evaluate.mjs";
import { gateExitFromFindings } from "../../scripts/check.mjs";
import { renderMarkdown, renderHtml } from "../../scripts/lib/report-render.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, "../fixtures");
const SF = path.join(FIXTURES, "golden/silver-fixture"); // Convergent (Silver): real tier, real Gold blockers
const LONE = path.join(FIXTURES, "golden/lone-skill"); // a component, no tier
const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));
const CONDITIONAL = new Set(["G1", "G6", "U11"]);
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
  return { library, spine: SPINE, conditional: CONDITIONAL, date: "2026-01-01", exitCode, reportType: "conformance" };
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

test("renderHtml renders all 10 IA section anchors in order", () => {
  const r = evaluate(SF);
  const html = renderHtml(r, optsFor(r, SF));
  let last = -1;
  for (let i = 1; i <= 10; i++) {
    const id = `s${String(i).padStart(2, "0")}`;
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at >= 0, `missing IA section ${id}`);
    assert.ok(at > last, `IA section ${id} out of order`);
    last = at;
  }
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
    assert.equal(out, readFileSync(file, "utf8"), `${name} drifted; re-run with UPDATE_SNAPSHOTS=1 to regenerate and review`);
  });
}
