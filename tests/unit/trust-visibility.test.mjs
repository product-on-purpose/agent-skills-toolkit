// what-it-is:   review-fix coverage - a trust action must be VISIBLE, and it must not be able to forge
//               a report (ADR 0044)
// what-it-does: drives the REAL formatters - check.mjs format(), evaluate.mjs formatReport(),
//               renderMarkdown() and renderHtml() - over resolved findings, and asserts what a reader
//               actually sees
// why:          round 1 of the review found trustNotice produced and rendered nowhere; round 2 then
//               found that the tests written to prevent that regressing were SOURCE GREPS, which pass
//               as long as the token appears anywhere in the file - including in the comment explaining
//               it. A test that cannot fail is worse than no test, because it advertises coverage that
//               does not exist. Round 2 also found the notice carries SUBJECT-authored text into a
//               report published about that subject
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq, CHECKS } from "../../scripts/lib/registry.mjs";
import { format, standardDebtLine, gateExitFromFindings } from "../../scripts/check.mjs";
import { dispositions, formatReport, evaluate, buildConditional } from "../../scripts/evaluate.mjs";
import { renderMarkdown, renderHtml } from "../../scripts/lib/report-render.mjs";
import { check as indexDrift } from "../../scripts/checks/index-drift.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderIndex, renderLegacyIndex } from "../../scripts/generators/gen-index.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROV = provenanceByReq();
const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));
const f = (severity, reqId, extra = {}) => ({ check: reqId, severity, message: "m", file: "a.md", reqId, migration: null, line: null, ...extra });

/** Resolve one finding under published-verdict with a subject-owned config. */
const published = (finding, plain) => resolveFindings([finding], configFrom({ mode: "published-verdict", ...plain }), PROV)[0];

function withPlugin(build, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-trustvis-"));
  try { build(dir); return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

// --- the terminal surfaces, driven through the real formatters -------------------------------------

test("the GATE terminal prints the trust notice, not just computes it", () => {
  const out = format([published(f("error", "U6"), { rules: { U6: "off" } })], "universal");
  assert.match(out, /published-verdict/, "the reader is told a trust action happened");
  assert.match(out, /rules\.U6/, "and which of the subject's settings was overruled");
});

test("the EVALUATOR terminal prints the notice and the trustActions aggregate", () => {
  const resolved = [published(f("error", "U6"), { rules: { U6: "off" }, suppressions: [{ reqId: "U6", reason: "we decided this is fine" }] })];
  const report = { scope: "plugin", target: ".", findings: resolved, byRule: { U6: resolved }, summary: { errors: 1, warns: 0 }, dispositions: dispositions(resolved), tier: null, blocked: [] };
  const out = formatReport(report);
  assert.match(out, /published-verdict/, "per-finding explanation reaches the terminal");
  assert.match(out, /Trust actions/, "and so does the aggregate a per-finding notice cannot replace");
  assert.match(out, /1 severity restored, 1 suppression/, "with both counters");
});

test("ONE event gets ONE explanation: the deprecated clamp line is not printed beside a trust notice", () => {
  // A declared-warn objective finding the subject turned off: the trust step raises it back to warn,
  // which is also exactly what the old clamp produced - so both fields are populated and a naive
  // renderer prints the same event twice.
  const out = published(f("warn", "U6"), { rules: { U6: "off" } });
  assert.ok(out.clampNotice, "the compatibility field is still populated in the DATA");
  assert.ok(out.trustNotice);
  const text = format([out], "universal");
  assert.ok(!/clamped to warn/.test(text), "but the human surface shows only the trust explanation");
});

test("clampNotice never describes a warn the CEILING produced, which would contradict the trust notice", () => {
  // Subject turns off a check introduced AFTER its pin. Trust restores error; the introduction ceiling
  // then holds it at warn. Keying the legacy field on the post-ceiling severity made the finding say
  // both that published-verdict restored an error and that published-verdict clamped it to warn.
  const out = resolveFindings(
    [f("error", "U14")],
    configFrom({ mode: "published-verdict", rules: { U14: "off" } }),
    PROV,
    { pinned: "0.12", sinceByReq: { U14: "0.13" } }
  )[0];
  assert.equal(out.effectiveSeverity, "warn", "the ceiling had the last word");
  assert.ok(out.trust.raised, "and the trust step really did act");
  assert.equal(out.clampNotice, null, "so the clamp field must stay silent rather than claim the cause");
});

// --- the designed reports, and the untrusted-input boundary ----------------------------------------

const HOSTILE = 'ok\n\n> ## Forged section\n<script>alert(1)</script>\n| a | b |\nback\\slash';

test("a hostile suppression reason cannot forge structure in the published Markdown report", () => {
  const out = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: HOSTILE }] });
  assert.ok(out.trustNotice.includes("waiver reason:"), "the reason is quoted back");
  // Neutralized where the notice is BUILT, so every consumer inherits the guarantee - including
  // external --json readers this repository does not control.
  // The boundary is layered on purpose, and the layers do different jobs. STRUCTURE is flattened here,
  // at build time, because a newline is structural in every text format and no renderer can put it back
  // safely. MARKUP is escaped per format at render, because the correct escape differs between Markdown,
  // HTML and JSON - stripping angle brackets here would corrupt a legitimate reason that contains them.
  assert.ok(!out.trustNotice.includes("\n"), "no newline survives into the notice");
  assert.ok(!out.trustNotice.includes("\r"), "no carriage return either");
  assert.ok(!/[\u0000-\u001f\u007f]/.test(out.trustNotice), "and no control character of any kind");
  assert.ok(out.trustNotice.length < 600, "and it cannot be arbitrarily long");
});

test("the Markdown and HTML reports render the trust action, escaped", () => {
  withPlugin(
    (dir) => {
      mkdirSync(path.join(dir, "skills", "demo"), { recursive: true });
      writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "t", version: "0.1.0", description: "A fixture plugin for the trust-visibility renderer test.", standard: "0.12", tier: "universal" }, null, 2));
      // The frontmatter name deliberately differs from the directory so U4 fires, and U4 is
      // VENDOR-CITED. That is load-bearing: the trust step never touches `house` findings, so a fixture
      // whose findings are all house produces no trust action and this whole case would assert nothing.
      // The first version of this fixture was exactly that, and the acted.length assertion caught it.
      writeFileSync(path.join(dir, "skills", "demo", "SKILL.md"), "---\nname: not-demo\ndescription: A demo skill whose name deliberately differs from its directory.\n---\n\n# demo\n");
      writeFileSync(path.join(dir, "askit.config.json"), JSON.stringify({ suppressions: [{ reqId: "U4", reason: HOSTILE }] }, null, 2));
    },
    (dir) => {
      const r = evaluate(dir, { mode: "published-verdict" });
      const acted = r.findings.filter((x) => x.trustNotice);
      // ASSERTED, not skipped. An early `return` here would make the whole renderer case silently
      // vacuous the moment the fixture stopped producing a waived finding - the same shape of
      // non-failing test this file was rewritten to remove.
      assert.ok(acted.length > 0, "the fixture must actually produce a trust action for this test to mean anything");
      const library = JSON.parse(readFileSync(path.join(dir, "library.json"), "utf8"));
      const forGate = r.findings.filter((x) => !x.suppressed).map((x) => ({ ...x, severity: x.effectiveSeverity ?? x.severity }));
      const opts = { library, spine: SPINE, conditional: buildConditional(dir), date: "2026-01-01", exitCode: gateExitFromFindings(forGate, library.tier).exitCode, reportType: "conformance" };

      const md = renderMarkdown(r, opts);
      assert.match(md, /Published-verdict trust action/, "the Markdown report shows it");
      assert.ok(!/^> ## Forged section/m.test(md), "and a hostile reason cannot open a heading");
      assert.ok(!md.includes("<script>"), "nor inject raw markup");

      const html = renderHtml(r, opts);
      assert.match(html, /Published-verdict trust action/, "the HTML report shows it");
      assert.ok(!html.includes("<script>alert(1)</script>"), "escaped in HTML too");
    }
  );
});

// --- the debt line must not claim an ABOVE-TIER finding will gate ----------------------------------

test("Standard debt does not tell a Convergent plugin that a Gold finding will gate it", () => {
  // G4 is Advanced. A plugin declaring convergent can never be gated by it, at any Standard - and
  // gateExitFromFindings proves that by filtering on the same tier ceiling. Saying otherwise was live
  // on a real family member.
  const held = { ...f("error", "G4"), effectiveSeverity: "warn", ceiling: { pinned: "0.12", from: "error", to: "warn", due: "0.14", constraints: [{ cause: "until", due: "0.14" }] } };
  const line = standardDebtLine([held], "convergent");
  assert.match(line, /above your declared tier/, "it says the debt cannot affect this grade");
  assert.ok(!/become gate-failing errors/.test(line), "and never claims it gates");

  // At advanced, the same finding IS gating debt.
  assert.match(standardDebtLine([held], "advanced"), /become gate-failing errors/);
});

// --- the CLI subcommand, exercised rather than grepped ---------------------------------------------

test("the gen-index subcommand really runs through the wrapper and writes an index", () => {
  withPlugin(
    (dir) => {
      mkdirSync(path.join(dir, "skills", "demo"), { recursive: true });
      writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "c", version: "0.1.0", description: "A consumer plugin that does not vendor the gate.", standard: "0.12", tier: "universal" }, null, 2));
      writeFileSync(path.join(dir, "skills", "demo", "SKILL.md"), "---\nname: demo\ndescription: A demo skill so the generated index lists something.\n---\n\n# demo\n");
    },
    (dir) => {
      // Spawned exactly as a consumer would reach it. This is what proves the argv guard inside
      // gen-index.mjs fires when the wrapper spawns it - a source grep proves nothing about that.
      const res = spawnSync(process.execPath, [path.join(REPO, "bin", "agent-skills-toolkit.mjs"), "gen-index", dir, "--write"], { encoding: "utf8" });
      assert.equal(res.status, 0, `wrapper failed: ${res.stderr}`);
      assert.ok(existsSync(path.join(dir, "INDEX.md")), "the subcommand actually wrote the file");
      assert.match(readFileSync(path.join(dir, "INDEX.md"), "utf8"), /npx agent-skills-toolkit \./, "with the consumer-safe command");
    }
  );
});

test("the generator the subcommand dispatches to is in the PUBLISHED package", () => {
  // A subcommand that works only from a git checkout is the same defect in a different shape: the
  // remediation is printed to consumers who install from npm.
  const pkg = JSON.parse(readFileSync(path.join(REPO, "package.json"), "utf8"));
  assert.ok(pkg.files.includes("scripts/generators/gen-index.mjs"), "the generator ships");
  assert.deepEqual(Object.keys(pkg.bin), ["agent-skills-toolkit"], "exactly one owned bin name");
});

test("a directory whose name collides with a subcommand is called out, not silently shadowed", () => {
  withPlugin(
    (dir) => {
      const p = path.join(dir, "gen-index", "skills", "demo");
      mkdirSync(p, { recursive: true });
      writeFileSync(path.join(dir, "gen-index", "library.json"), JSON.stringify({ name: "gen-index", version: "0.1.0", description: "A plugin whose directory name collides with a subcommand.", standard: "0.12", tier: "universal" }, null, 2));
      writeFileSync(path.join(p, "SKILL.md"), "---\nname: demo\ndescription: A demo skill so the fixture is a real plugin.\n---\n\n# demo\n");
    },
    (dir) => {
      const cli = path.join(REPO, "bin", "agent-skills-toolkit.mjs");
      const shadowed = spawnSync(process.execPath, [cli, "gen-index"], { cwd: dir, encoding: "utf8" });
      assert.match(shadowed.stderr, /both a subcommand and a directory/, "the ambiguity is loud, not silent");
      assert.match(shadowed.stderr, /\.\/gen-index/, "and the escape hatch is named");

      // And that escape hatch has to actually work.
      const graded = spawnSync(process.execPath, [cli, "./gen-index"], { cwd: dir, encoding: "utf8" });
      assert.match(graded.stdout, /Tier:/, "./<name> grades the directory");
    }
  );
});

// --- all three index-drift branches, through the real check ---------------------------------------

test("index-drift: missing, legacy-match, and other-drift are three distinct outcomes", () => {
  withPlugin(
    (dir) => {
      mkdirSync(path.join(dir, "skills", "demo"), { recursive: true });
      writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "c", version: "0.1.0", description: "A consumer plugin for the three index-drift branches.", standard: "0.12", tier: "advanced" }, null, 2));
      writeFileSync(path.join(dir, "skills", "demo", "SKILL.md"), "---\nname: demo\ndescription: A demo skill so the generated index lists something.\n---\n\n# demo\n");
    },
    (dir) => {
      const missing = indexDrift(loadPlugin(dir))[0];
      assert.match(missing.message, /INDEX\.md is missing/);
      assert.equal(missing.migration, null, "a missing index is not the E35 migration");
      assert.match(missing.message, /npx agent-skills-toolkit gen-index/, "and names an owned command");

      writeFileSync(path.join(dir, "INDEX.md"), renderLegacyIndex(loadPlugin(dir)));
      const legacy = indexDrift(loadPlugin(dir))[0];
      assert.equal(legacy.migration?.until, "0.14", "the legacy rendering earns the cap");

      writeFileSync(path.join(dir, "INDEX.md"), renderIndex(loadPlugin(dir)) + "\n\n## Hand written\n");
      const other = indexDrift(loadPlugin(dir))[0];
      assert.equal(other.migration, null, "every other drift stays a hard error");

      writeFileSync(path.join(dir, "INDEX.md"), renderIndex(loadPlugin(dir)));
      assert.deepEqual(indexDrift(loadPlugin(dir)), [], "and a current index is clean");
    }
  );
});
