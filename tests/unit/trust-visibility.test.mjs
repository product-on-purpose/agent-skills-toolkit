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
import { fileURLToPath, pathToFileURL } from "node:url";
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
import { mdCodeSpan } from "../../scripts/lib/md-escape.mjs";

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

// Every ACTIVE-MARKUP shape a subject can put in a waiver reason, in one fixture. The ones added last
// are the ones an escape-based defence kept missing: an image whose destination is an attacker URL (a
// tracking pixel over our signature), a BARE url that GFM autolinks with no metacharacter present to
// escape at all, a named ENTITY that CommonMark decodes back into the exact bidi control the sanitizer
// strips at build time, and a backtick run that would close a naive code span early.
//
// Deliberately kept UNDER the 200-cluster cap. The first draft ran past it, and the cap then truncated
// away the entity case at the end - so the test failed for a reason that had nothing to do with what it
// was testing. A fixture that trips a different guard proves nothing about the guard it was written for.
const HOSTILE = 'ok\n\n> ## Forged\n<script>alert(1)</script>\n|a|b|\nback\\slash'
  + ' ![img](https://atk.example/px) [c](http://x)'   // link and image destinations
  + ' https://atk.example/bare me@atk.example'        // GFM autolinks these with nothing to escape
  + ' &rlm; *em* ``bt``';                             // an entity CommonMark would decode to U+200F

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
  // NOT a loose bound. The previous assertion was `< 600` against a fixture SHORTER than the cap, so
  // it passed whether or not truncation existed at all. The cap is asserted exactly, on input that
  // actually exceeds it, in the bounded-length case below.
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
      // NOT "the string <script> is absent". It is present, deliberately, and that is the code span
      // working: inside a span the text renders as literal characters instead of as raw HTML, so the
      // subject's words are quoted exactly while being inert. The property that matters is CONTAINMENT,
      // and asserting absence instead would fail against a correct implementation while passing for one
      // that silently deleted what the subject wrote.
      const scriptLines = md.split("\n").filter((l) => l.includes("<script>"));
      assert.equal(scriptLines.length, 1, "raw markup appears on exactly one line, the quoted notice");
      assert.ok(scriptLines[0].includes("Published-verdict trust action"), "and that line is the notice, not report prose");

      // The notice is quoted into a CODE SPAN, and that is checked STRUCTURALLY rather than by looking
      // for the absence of particular characters. A fence at least one backtick longer than any run
      // inside it is exactly CommonMark's condition for the span to close where we put its end, and
      // inside a span nothing can open a link, an autolink, an entity or emphasis - so one assertion
      // about the shape covers every construct at once, including ones added to Markdown later.
      const noticeLine = md.split("\n").find((l) => l.includes("Published-verdict trust action"));
      assert.ok(noticeLine, "the trust-action line is present to inspect");
      const m = /^> Published-verdict trust action for \S+: (`+) (.*) \1$/.exec(noticeLine);
      assert.ok(m, `the notice is wrapped in a matched code-span fence, got: ${noticeLine}`);
      const [, fence, inner] = m;
      const longestRun = Math.max(0, ...(inner.match(/`+/g) ?? []).map((r) => r.length));
      assert.ok(fence.length > longestRun, "the fence outlasts every backtick run it contains, so the span cannot be closed early");
      // Verbatim, not merely inert: a defence that silently rewrote the subject's words would be its own
      // defect, in a report published about that subject.
      assert.ok(inner.includes("![img](https://atk.example/px)"), "the image attack is quoted verbatim");
      assert.ok(inner.includes("https://atk.example/bare"), "the bare URL is inside the span, where GFM does not autolink");
      assert.ok(inner.includes("&rlm;"), "the entity stays literal instead of being decoded back into the bidi control the sanitizer removed");

      // The one thing a code span does NOT do is escape pipes, and it must not: outside a table a
      // backslash-pipe renders as a literal backslash and corrupts the quotation. So the constraint is
      // that a notice never lands in a table ROW - true today only because of where the renderer happens
      // to emit it, which is exactly the kind of accident worth pinning down before someone moves it.
      const rowsWithNotice = md.split("\n").filter((l) => l.trimStart().startsWith("|") && l.includes("Published-verdict trust action"));
      assert.deepEqual(rowsWithNotice, [], "a notice is never emitted into a table row, where its unescaped pipes would break the row");

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

/** A held finding of `reqId` whose ceiling comes due at `due`. */
const heldAt = (reqId, due) => ({
  ...f("error", reqId),
  effectiveSeverity: "warn",
  ceiling: { pinned: "0.12", from: "error", to: "warn", due, constraints: [{ cause: "until", due }] },
});

test("an above-tier finding's due date cannot set the date the GATE is said to break", () => {
  // The dates were reduced across every held finding and only then split by tier, so the later
  // above-tier date was printed in the gating sentence. A Universal plugin whose gate breaks at 0.13 was
  // told 0.14. Under-warning is the dangerous direction: the reader plans the upgrade around this line.
  const line = standardDebtLine([heldAt("U6", "0.13"), heldAt("G4", "0.14")], "universal");
  assert.match(line, /gate-failing errors at Standard 0\.13/, "the gating sentence names the date the gate actually breaks");
  assert.ok(!/gate-failing errors at Standard 0\.14/.test(line), "not the above-tier finding's later date");
  assert.match(line, /A further 1 held finding\(s\) are above your declared tier and become errors at Standard 0\.14/, "the above-tier clause carries its OWN date");
});

test("the debt line leads with the EARLIEST due version, not the highest", () => {
  // "All of them become errors at 0.14 or later" is true of the maximum and still reads as safe-until-
  // 0.14 to a plugin holding a finding due at 0.13. The first date is the one that costs something, so
  // it leads, and the range is stated rather than the span being collapsed to one end of it.
  const line = standardDebtLine([heldAt("U6", "0.14"), heldAt("U13", "0.13")], "universal");
  assert.match(line, /from Standard 0\.13 onwards \(the last at 0\.14\)/, "earliest leads, latest is still stated");

  // One date is reported as one date, not as a degenerate range.
  const same = standardDebtLine([heldAt("U6", "0.13"), heldAt("U13", "0.13")], "universal");
  assert.match(same, /at Standard 0\.13\./, "a single shared date reads plainly");
  assert.ok(!/onwards/.test(same), "with no range language");

  // Numeric comparison, not lexical: 0.9 is EARLIER than 0.10, and string ordering says the opposite.
  const numeric = standardDebtLine([heldAt("U6", "0.10"), heldAt("U13", "0.9")], "universal");
  assert.match(numeric, /from Standard 0\.9 onwards \(the last at 0\.10\)/, "0.9 precedes 0.10");
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

test("the debt line's tier filter AGREES with the gate's, for every tier including an undeclared one", () => {
  // The debt line makes a claim about the future ("becomes gate-failing"), and the gate decides the
  // present. If those two used different tier logic they would disagree about the same finding, which
  // is the defect round 2 found in its first form. They share ceilingIndex/TIER_ORDER deliberately, and
  // this pins that: for every declared tier, "the debt line says it gates" must equal "the gate would
  // gate on it". `undefined` is in the list because a plugin may declare no tier at all - pm-skills, a
  // live family member, does - and ceilingIndex resolves that to the MAXIMUM tier, so such a plugin
  // really is gated on every tier's errors.
  const held = (reqId) => ({
    check: reqId, severity: "error", reqId, file: "f.md", effectiveSeverity: "warn", suppressed: false,
    ceiling: { pinned: "0.12", from: "error", to: "warn", due: "0.14", constraints: [{ cause: "until", due: "0.14" }] },
  });
  for (const reqId of ["U13", "S4", "G4"]) {
    for (const tier of ["universal", "convergent", "advanced", undefined]) {
      const line = standardDebtLine([held(reqId)], tier);
      const debtSaysItGates = /become gate-failing errors/.test(line);
      // What the gate would do once the ceiling lifts and the finding is an error again.
      const gateWouldFail = gateExitFromFindings([{ ...held(reqId), severity: "error" }], tier).exitCode === 1;
      assert.equal(debtSaysItGates, gateWouldFail, `${reqId} at tier ${String(tier)}: debt line and gate disagree`);
    }
  }
});

test("a hostile reason cannot force malformed UTF-16 or invisible reordering into a notice", () => {
  // Found by probing the sanitizer rather than by reading it. The length cap sliced UTF-16 UNITS, so a
  // reason of 300 emoji was cut through a surrogate pair and left a LONE SURROGATE in the notice -
  // invalid UTF-16 that strict serializers reject, forced into a published report by untrusted input.
  // Bidi overrides and zero-width characters survived too, which can make a notice display as something
  // other than what it says.
  const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  // U+200C and U+200D are EXCLUDED from this range on purpose, and leaving them in was a latent
  // contradiction: the sanitizer now keeps them deliberately, so this assertion asserted the opposite of
  // the intended behavior and passed only because no fixture below happened to contain one. The joiner
  // carve-out has its own case immediately after this test.
  const invisible = /[\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff\u061c]/;
  const cases = {
    "surrogate pairs past the cap": "\uD83D\uDE00".repeat(300),
    "bidi override": "a\u202Eb",
    "line separator U+2028": "a\u2028b",
    "paragraph separator U+2029": "a\u2029b",
    "zero-width space": "a\u200Bb",
  };
  for (const [label, reason] of Object.entries(cases)) {
    const out = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason }] });
    const n = out.trustNotice;
    assert.ok(!lone.test(n), `${label}: a lone surrogate reached the notice`);
    assert.ok(!invisible.test(n), `${label}: an invisible or reordering character reached the notice`);
    assert.ok(!/[\u0000-\u001f\u007f\u2028\u2029]/.test(n), `${label}: a structural character reached the notice`);
    // isWellFormed, NOT a JSON round trip. JSON.stringify escapes a lone surrogate and JSON.parse
    // restores it, so round-trip equality is TRUE for malformed input - the assertion that replaced
    // it could never have caught the very defect this case exists for.
    assert.ok(n.isWellFormed(), `${label}: the notice is not well-formed UTF-16`);
  }
});

test("the length cap is EXACT, and applies to input that actually exceeds it", () => {
  // The cap is the one behavior the earlier assertions could not see: every fixture was shorter than
  // it, so removing truncation entirely would have passed them.
  const long = "x".repeat(5000);
  const out = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: long }] });
  const quoted = out.trustNotice.match(/waiver reason: (.*)\)\./s);
  assert.ok(quoted, "the reason is quoted back");
  const reason = quoted[1];
  // Clusters, not code points. The claim was accurate when the cap counted code points and went
  // stale silently when it stopped: for this all-ASCII fixture the two numbers are identical, so
  // the old assertion passed either way and could not see the change it was supposed to guard.
  assert.equal(CLUSTERS(reason).length, 200, "exactly the cap, measured in GRAPHEME CLUSTERS");
  assert.ok(reason.endsWith("..."), "and truncation is marked rather than silent");
});

test("a lone surrogate present in the INPUT is removed, not merely never created", () => {
  // The first fix only stopped TRUNCATION from splitting a pair. A reason that already contains a lone
  // surrogate - trivially expressible in JSON as a \uD800 escape - walked straight through.
  for (const [label, reason] of Object.entries({ "lone high": "a\uD800b", "lone low": "a\uDC00b", "high at end": "ab\uD800" })) {
    const n = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason }] }).trustNotice;
    assert.ok(n.isWellFormed(), `${label}: a lone surrogate reached the notice`);
  }
  // A well-formed astral character must SURVIVE - the strip is by category, not a blanket ban.
  const kept = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: "ok \uD83D\uDE00 ok" }] }).trustNotice;
  assert.ok(kept.includes("\uD83D\uDE00"), "a valid emoji is not collateral damage");
});

test("mdCodeSpan produces a span that cannot be closed early or decoded", () => {
  // This replaces an assertion that called the escape helper by hand and never rendered anything, so
  // reverting the RENDERER to the old escape would have left it passing. The renderer case above now
  // covers the wiring; this covers the fencing algorithm itself, which is where the subtlety lives.
  const BT = String.fromCharCode(96);
  const spanOf = (text) => {
    const out = mdCodeSpan(text);
    const m = new RegExp(`^(${BT}+) (.*) \\1$`).exec(out);
    assert.ok(m, `not a matched span: ${out}`);
    return { fence: m[1], inner: m[2] };
  };

  // No backticks in the content: the minimum fence is one.
  assert.equal(spanOf("plain reason").fence.length, 1);
  assert.equal(spanOf("plain reason").inner, "plain reason");

  // The fence must GROW past the longest run, not merely differ from it. A fixed fence is the
  // classic way a span is closed by its own content and the rest of the line escapes as markup.
  for (const n of [1, 2, 3, 7]) {
    const content = `a${BT.repeat(n)}b`;
    const { fence, inner } = spanOf(content);
    assert.ok(fence.length > n, `fence ${fence.length} must exceed the ${n}-backtick run inside it`);
    assert.equal(inner, content, "and the content survives byte for byte");
  }

  // Content that begins or ends with a backtick is the case the padding spaces exist for: without
  // them the fence and the content's own backticks merge into one longer run.
  for (const content of [`${BT}leading`, `trailing${BT}`, `${BT}both${BT}`]) {
    assert.equal(spanOf(content).inner, content);
  }

  // Newlines are collapsed here as well as in the sanitizer, because a line ending inside a span
  // becomes a space and would silently alter the quotation.
  assert.ok(!mdCodeSpan("a\nb").includes("\n"), "no line ending survives into the span");
});

test("the rendered notice keeps subject text out of every active Markdown construct", () => {
  // Driven through the REAL notice, not a literal: the value under test has to be the one production
  // builds, or the test proves something about a string this code never sees.
  const notice = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: HOSTILE }] }).trustNotice;
  assert.ok(notice && notice.length > 0, "the fixture must actually produce a notice");
  const out = mdCodeSpan(notice);
  const BT = String.fromCharCode(96);
  const m = new RegExp(`^(${BT}+) (.*) \\1$`).exec(out);
  assert.ok(m, "the notice renders as one matched span");
  const runs = (m[2].match(new RegExp(`${BT}+`, "g")) ?? []).map((r) => r.length);
  assert.ok(m[1].length > Math.max(0, ...runs), "the fence survives the backticks the subject wrote");
});

test("the evaluator SUMMARY does not report one trust action as both clamped and restored", () => {
  // The per-finding label was suppressed in the first pass, but formatReport still printed
  // "Clamped: 1" beside "Trust actions: 1 severity restored" for that same single finding - which
  // describes one event twice and makes the retired mechanism look current. A mutation check caught
  // that the existing case did not cover this surface at all: it asserted only the gate terminal.
  const resolved = resolveFindings([f("warn", "U6")], configFrom({ mode: "published-verdict", rules: { U6: "off" } }), PROV);
  const rep = { scope: "plugin", target: ".", findings: resolved, byRule: { U6: resolved }, summary: { errors: 0, warns: 1 }, dispositions: dispositions(resolved), tier: null, blocked: [] };
  const out = formatReport(rep);
  assert.match(out, /Trust actions/, "the current mechanism is reported");
  assert.ok(!/Clamped \(/.test(out), "and the deprecated one is not reported for the same finding");
  // The machine data is deliberately UNCHANGED, because external readers depend on it.
  assert.equal(rep.dispositions.clamped, 1, "dispositions.clamped still counts it for compatibility");
});


// A grapheme-cluster count, mirroring what the sanitizer uses, so the tests measure the same unit
// the code does rather than a proxy for it.
const CLUSTERS = (s) => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
const CP = (n) => String.fromCodePoint(n);
const ZWNJ_C = CP(0x200c);
const ZWJ_C = CP(0x200d);
// A family emoji: three people bound by two joiners. Five code points, eight UTF-16 units, and ONE
// grapheme cluster - which is the whole point of using it here.
const FAMILY = CP(0x1f468) + ZWJ_C + CP(0x1f469) + ZWJ_C + CP(0x1f467);

test("the two joiners survive the strip, and every other format character still does not", () => {
  // Stripping the whole Cf category was the previous fix, and it was too broad. ZWNJ changes spelling
  // and meaning in Persian and controls conjunct forms in Indic scripts; ZWJ binds an emoji sequence.
  // Removing them misquotes the subject's own words in a report published about that subject - while
  // buying nothing, because neither can reorder or conceal text. Everything else in Cf still goes.
  const reasonOf = (r) => published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: r }] }).trustNotice;

  const persian = `mi${ZWNJ_C}ravad`;
  assert.ok(reasonOf(persian).includes(persian), "ZWNJ survives, so the word is not silently respelled");
  assert.ok(reasonOf(`ok ${FAMILY} ok`).includes(FAMILY), "ZWJ survives, so one family emoji does not become three people");

  // The carve-out is exactly two characters wide.
  for (const [label, cp] of [["RLO bidi override", 0x202e], ["Arabic letter mark", 0x61c], ["BOM", 0xfeff], ["zero-width space", 0x200b], ["invisible separator", 0x2063]]) {
    const n = reasonOf(`a${CP(cp)}b`);
    assert.ok(!n.includes(CP(cp)), `${label} must still be removed`);
  }
});

test("truncation cuts BETWEEN grapheme clusters, never inside one", () => {
  // A code-point boundary was the round-3 fix and is still wrong for anything a reader calls one
  // character: it severs a combining mark from its base and cuts an emoji ZWJ sequence mid-join,
  // leaving a dangling joiner or a stray person emoji in a published report.
  const long = FAMILY.repeat(300);
  const n = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: long }] }).trustNotice;
  const quoted = n.match(/waiver reason: (.*)\)\./s);
  assert.ok(quoted, "the reason is quoted back");
  const reason = quoted[1];
  assert.equal(CLUSTERS(reason).length, 200, "the cap counts clusters, so 300 families become 200 units of output");
  assert.ok(reason.endsWith("..."), "truncation is marked");

  // Every kept cluster is a WHOLE family. A code-point cut would leave a partial sequence here.
  const kept = reason.slice(0, reason.length - 3);
  const segs = CLUSTERS(kept);
  assert.ok(segs.length > 0, "something survived to inspect");
  assert.deepEqual([...new Set(segs)], [FAMILY], "no cluster was severed - every one is the complete sequence");
  assert.ok(!kept.endsWith(ZWJ_C), "and the text does not end on a dangling joiner");
  assert.ok(n.isWellFormed(), "the notice is well-formed UTF-16");
});

test("the cluster cap holds for combining marks and regional-indicator flags too", () => {
  // Two more shapes where one character to a reader is several code points: a base plus a combining
  // mark, and a flag built from a regional-indicator PAIR. Cutting either mid-cluster turns the
  // subject's text into something they did not write.
  const eAcute = `e${CP(0x301)}`;                      // e + combining acute
  const flag = CP(0x1f1eb) + CP(0x1f1f7);              // regional indicators F + R
  for (const [label, unit] of [["combining mark", eAcute], ["regional-indicator flag", flag]]) {
    const n = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: unit.repeat(300) }] }).trustNotice;
    const reason = n.match(/waiver reason: (.*)\)\./s)[1];
    const kept = reason.slice(0, reason.length - 3);
    assert.deepEqual([...new Set(CLUSTERS(kept))], [unit], `${label}: a cluster was split`);
  }
});

test("the help's exit-code contract is checked against what the subcommands actually do", () => {
  // The help said the exit code was the gate's for "check, evaluate and tier-report". tier-report
  // PRINTS and falls through, so Node exits 0 even when the report it just printed names blockers - a
  // CI step following that sentence publishes a false pass. That is the same failure the same
  // paragraph was rewritten to warn about for gen-index, which is why this pairs the CLAIM with the
  // OBSERVED exit rather than trusting either alone.
  withPlugin(
    (dir) => {
      writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "t", version: "0.1.0", description: "A fixture that declares Advanced and earns nothing, so the report has blockers.", standard: "0.13", tier: "advanced" }, null, 2));
    },
    (dir) => {
      const ran = spawnSync(process.execPath, [path.join(REPO, "scripts", "tier-report.mjs"), dir], { encoding: "utf8" });
      assert.ok(/blocked|blocker/i.test(ran.stdout), `the fixture must actually produce blockers, got: ${ran.stdout.slice(0, 200)}`);
      assert.equal(ran.status, 0, "tier-report still exits 0 - it reports, it does not grade");

      const help = spawnSync(process.execPath, [path.join(REPO, "bin", "agent-skills-toolkit.mjs"), "--help"], { encoding: "utf8" }).stdout;
      assert.match(help, /gen-index and tier-report\s+NEVER GRADE/, "and the help says exactly that");
      assert.ok(!/check, evaluate and tier-report it is the gate/.test(help), "never grouping it with the commands that DO return the gate exit");

      // The other half of the claim, verified rather than assumed: check really does return non-zero
      // on the same fixture, so the paragraph's distinction is a real one.
      const gate = spawnSync(process.execPath, [path.join(REPO, "scripts", "check.mjs"), dir], { encoding: "utf8" });
      assert.equal(gate.status, 1, "check returns the gate exit on a plugin that fails its declared tier");
    }
  );
});

// --- round 5: the boundary's own edge cases ------------------------------------------------------

test("the gate still loads AND sanitizes on a Node built without internationalization", () => {
  // The Segmenter was constructed at MODULE LOAD. Every CLI imports this resolver, so on a Node built
  // without Intl the whole tool became a TypeError before any grading ran - and a grading tool that
  // cannot start is a far worse failure than one that truncates a quoted sentence less precisely.
  //
  // Written to a FILE rather than passed as --eval. Three earlier versions of this probe failed for
  // quoting reasons alone: a Windows drive letter read as a URL scheme, then a regex whose backslashes
  // were eaten by the shell, then a hand-built config that was not origin-bearing so trustNotice came
  // back null and the probe asserted on nothing. A file has one level of quoting instead of three.
  //
  // It also exercises SANITIZATION, not just import. An earlier version passed no suppression reason, so
  // the segmentation path never ran - and a mutation that removed the guard while keeping construction
  // lazy passed unnoticed. The import alone was never the interesting half.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-nointl-"));
  try {
    const probe = path.join(dir, "probe.mjs");
    writeFileSync(probe, [
      "delete globalThis.Intl;",
      "const rc = await import(process.argv[2]);",
      "const cfg = await import(process.argv[3]);",
      "const out = rc.resolveFindings(",
      "  [{ check: 'U6', reqId: 'U6', severity: 'error', message: 'm', file: 'a.md', migration: null, line: null }],",
      "  cfg.configFrom({ mode: 'published-verdict', suppressions: [{ reqId: 'U6', reason: 'x'.repeat(500) }] }),",
      "  new Map([['U6', 'objective']])",
      ");",
      "console.log(out.length === 1 ? 'RESOLVED' : 'EMPTY');",
      "console.log(out[0].trustNotice ? 'NOTICE' : 'NO-NOTICE');",
      "console.log(out[0].trustNotice && out[0].trustNotice.includes('...).') ? 'TRUNCATED' : 'NOT-TRUNCATED');",
    ].join("\n"));

    const url = (rel) => pathToFileURL(path.join(REPO, ...rel)).href;
    const r = spawnSync(
      process.execPath,
      [probe, url(["scripts", "lib", "resolve-config.mjs"]), url(["scripts", "lib", "config.mjs"])],
      { encoding: "utf8" },
    );
    assert.equal(r.status, 0, `the resolver failed without Intl: ${r.stderr.slice(0, 600)}`);

    // Exact LINES, never substrings: /TRUNCATED/ also matches "NOT-TRUNCATED", because the word boundary
    // sits happily after the hyphen, and an assertion that passes either way is the shape this whole file
    // exists to eliminate.
    const emitted = r.stdout.split("\n").map((l) => l.trim());
    assert.ok(emitted.includes("RESOLVED"), `findings still resolve; got ${JSON.stringify(r.stdout)}`);
    assert.ok(emitted.includes("NOTICE"), "the trust step still produced a notice, so the fixture is not vacuous");
    assert.ok(emitted.includes("TRUNCATED"), "and the SEGMENTATION path ran, which is where Intl is actually touched");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a waiver reason with nothing visible in it is treated as no reason, not quoted as blank", () => {
  // The price of keeping the joiners: they are zero-width, so a reason made entirely of them survives
  // the trim. Testing the RAW field for truthiness then emitted "(waiver reason: )" with nothing
  // between the parentheses - which reads as a reporting bug rather than as the absence it is.
  const ZWJ_C2 = CP(0x200d);
  const ZWNJ_C2 = CP(0x200c);
  const noticeFor = (reason) => published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason }] }).trustNotice;
  for (const [label, reason] of [["joiners only", ZWJ_C2.repeat(5)], ["joiners and spaces", `${ZWNJ_C2} ${ZWJ_C2}`], ["empty", ""]]) {
    const n = noticeFor(reason);
    assert.ok(!/waiver reason:/.test(n), `${label}: an invisible reason must not produce a waiver clause`);
    assert.match(n, /suppression was cleared/, `${label}: the trust action itself is still reported`);
  }
  // A reason that merely CONTAINS a joiner is real text and is still quoted.
  const persian = `mi${ZWNJ_C2}ravad`;
  assert.ok(noticeFor(persian).includes(persian), "a joiner inside real words is not treated as invisible");
});

test("a single cluster larger than the raw bound is truncated visibly, not silently", () => {
  // The raw code-unit bound runs BEFORE segmentation. One "a" plus thousands of combining marks is a
  // single cluster: the bound cut it, then the segmenter saw one whole-looking cluster, decided nothing
  // exceeded the 200-cluster cap, and returned a severed prefix with no truncation marker at all.
  const huge = `a${CP(0x301).repeat(7000)}`;
  const n = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: huge }] }).trustNotice;
  const quoted = n.match(/waiver reason: (.*)\)\./s);
  assert.ok(quoted, "the reason is quoted back");
  assert.ok(quoted[1].endsWith("..."), "truncation is stated rather than silent");
  assert.ok(quoted[1].length < huge.length, "and the value really was shortened");
});

test("a raw bound that cut only strippable material does NOT claim a truncation", () => {
  // The other half, and the defect the first version of the fix above introduced. "The bound cut
  // something" is the wrong question: it is true for input whose tail was going to VANISH anyway. A
  // reason of "hello" followed by seven thousand control characters sanitizes to "hello", and the
  // marker-on-any-cut version returned "hell..." - corrupting a short legitimate reason AND claiming a
  // truncation that never happened. The question is whether the cut fell inside surviving material.
  const reasonOf = (r) => {
    const n = published(f("error", "U6", { file: "a.md" }), { suppressions: [{ reqId: "U6", reason: r }] }).trustNotice;
    const q = n.match(/waiver reason: (.*)\)\./s);
    assert.ok(q, "the reason is quoted back");
    return q[1];
  };
  for (const [label, tail] of [["control characters", CP(0x0007)], ["spaces", " "], ["newlines", "\n"]]) {
    assert.equal(reasonOf(`hello${tail.repeat(7000)}`), "hello", `${label}: nothing visible was lost, so nothing is marked`);
  }
  // A boundary landing on a LONE SURROGATE is half a cluster by definition, so that one IS a real cut.
  const severed = reasonOf(`hi${"😀".repeat(4000)}`);
  assert.ok(severed.endsWith("..."), "a cut through surviving material is still stated");
});

test("mdCodeSpan round-trips exactly, including the inputs where padding would lie", () => {
  // CommonMark removes one padding space from each end ONLY when the content is not entirely spaces.
  // Padding unconditionally therefore round-trips ordinary text and silently ADDS two spaces to an
  // all-space value - the single input where this helper's byte-for-byte claim was false.
  assert.equal(mdCodeSpan(""), "", "nothing to quote is not a quotation of nothing");
  const BT2 = String.fromCharCode(96);
  for (const content of [" ", "   "]) {
    const out = mdCodeSpan(content);
    const inner = out.slice(out.indexOf(BT2 + " ") === 0 ? 0 : 0);
    const m2 = new RegExp(`^(${BT2}+)(.*)\\1$`).exec(out);
    assert.ok(m2, `all-space content still forms a span: ${JSON.stringify(out)}`);
    assert.equal(m2[2], content, "and its spaces are neither added to nor eaten");
    assert.ok(inner !== undefined);
  }
  // Ordinary text keeps the padding, because there the spec DOES strip it back off.
  const ord = mdCodeSpan("hello");
  assert.equal(ord, `${BT2} hello ${BT2}`, "ordinary content is padded so the renderer strips it back to exact");
});
