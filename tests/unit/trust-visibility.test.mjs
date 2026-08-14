// what-it-is:   round-1 review fix coverage - a trust action must be VISIBLE (ADR 0044)
// what-it-does: proves trustNotice reaches every output surface that renders clampNotice, that the
//               aggregate reaches the evaluate summary, and that the migration remediation names a
//               command this project actually owns
// why:          the trust step can turn a previously passing PUBLISHED verdict into a failure. Producing
//               the explanation and never displaying it makes that failure look like an ordinary
//               finding, which contradicts the promise ADR 0044, STANDARD.md, gate-config.md and the
//               CHANGELOG all make. Round 1 of the v1.13.0 adversarial review found exactly that
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { dispositions } from "../../scripts/evaluate.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROV = provenanceByReq();
const f = (severity, reqId, extra = {}) => ({ check: reqId, severity, message: "m", file: "a.md", reqId, migration: null, line: null, ...extra });
const src = (rel) => readFileSync(path.join(REPO, rel), "utf8");

// --- the two trust actions, and both must be explained ---------------------------------------------

test("a severity RESTORED by the trust step carries a notice naming the overruled setting", () => {
  const cfg = configFrom({ mode: "published-verdict", rules: { U6: "off" } });
  const [out] = resolveFindings([f("error", "U6")], cfg, PROV);
  assert.equal(out.effectiveSeverity, "error");
  assert.ok(out.trustNotice, "a restored severity must be explained");
  assert.match(out.trustNotice, /rules\.U6/, "and must name WHICH of the subject's settings was overruled");
  assert.equal(out.trust.raised, true);
});

test("a suppression CLEARED by the trust step carries a notice, even when severity did not move", () => {
  // The case a severity-only implementation would leave silent: the subject did not lower the severity,
  // it waived the finding. Both are ways to dodge the same gate and both must be visible.
  const cfg = configFrom({ mode: "published-verdict", suppressions: [{ reqId: "U6", reason: "we decided this is fine" }] });
  const [out] = resolveFindings([f("error", "U6")], cfg, PROV);
  assert.equal(out.suppressed, false);
  assert.equal(out.trust.raised, false, "severity never moved");
  assert.equal(out.trust.suppressionCleared, true);
  assert.ok(out.trustNotice, "a cleared waiver must still be explained");
  assert.match(out.trustNotice, /suppression/i);
});

// --- every surface that shows a clamp must show a trust action ------------------------------------

test("trustNotice is rendered wherever clampNotice is rendered - the parity rule, as a guard", () => {
  // The rule, stated so a future surface cannot quietly diverge: a trust action is visible on exactly
  // the surfaces a clamp is. SARIF and the GitHub Actions annotations are deliberately NOT in this set
  // because they serialize NO notice of any kind today - not clamp, not migration - so adding only this
  // one would surface a single mechanism and hide two, which is worse than the current consistency.
  const surfaces = [
    "scripts/check.mjs",              // the gate's terminal output
    "scripts/evaluate.mjs",           // the evaluator's terminal output
    "scripts/lib/report-render.mjs",  // the Markdown and HTML designed reports
  ];
  for (const rel of surfaces) {
    const text = src(rel);
    assert.ok(text.includes("clampNotice"), `${rel}: sanity, this surface should render clampNotice`);
    assert.ok(text.includes("trustNotice"), `${rel}: renders clampNotice but not trustNotice`);
  }

  // And the two that carry no notice at all stay that way, so the omission above is a rule rather than
  // an oversight someone half-corrected.
  for (const rel of ["scripts/lib/sarif-render.mjs"]) {
    const text = src(rel);
    assert.ok(!text.includes("clampNotice"), `${rel}: carries no notice today`);
    assert.ok(!text.includes("trustNotice"), `${rel}: must not surface one mechanism while hiding the others`);
  }
});

test("the designed-report view model carries trustNotices onto the requirement row", () => {
  const text = src("scripts/lib/report-render.mjs");
  assert.ok(/const trustNotices = /.test(text), "collected per requirement, like clampNotices");
  assert.ok(text.includes("trustNotices }"), "and returned on the row object");
  assert.ok(/Published-verdict trust action for/.test(text), "Markdown labels it distinctly from a clamp");
  assert.ok(/<b>Published-verdict trust action<\/b>/.test(text), "HTML labels it distinctly from a clamp");
});

test("the evaluate summary reports the trustActions AGGREGATE, which a per-finding notice cannot replace", () => {
  const cfg = configFrom({
    mode: "published-verdict",
    rules: { U6: "off" },
    suppressions: [{ reqId: "U6", reason: "waived" }],
  });
  const resolved = resolveFindings([f("error", "U6")], cfg, PROV);
  const d = dispositions(resolved);
  assert.equal(d.trustActions.raised, 1);
  assert.equal(d.trustActions.suppressionsCleared, 1);
  assert.ok(src("scripts/evaluate.mjs").includes("Trust actions (published-verdict"), "and the terminal summary prints it");
});

// --- the migration remediation must name a command this project owns -------------------------------

test("every G4 remediation names an OWNED command, never an unpublished package name", () => {
  // Round 1's high finding. The first version of the E35 migration message offered
  // `npx agent-skills-toolkit-gen-index`, which is not a package or bin this repository publishes:
  // unusable as an instruction, and a package-claim supply-chain risk. It was also E35 itself one level
  // down - a remediation naming a command its reader does not have, inside the finding written to fix
  // exactly that.
  const text = src("scripts/checks/index-drift.mjs");
  assert.ok(!/agent-skills-toolkit-gen-index/.test(text), "no unowned package name may appear in a remediation");
  assert.ok(text.includes("npx agent-skills-toolkit gen-index"), "the remediation uses the owned CLI subcommand");

  const pkg = JSON.parse(src("package.json"));
  const binNames = Object.keys(pkg.bin ?? {});
  assert.deepEqual(binNames, ["agent-skills-toolkit"], "exactly one owned bin; a second name is a claim on someone else's");

  // The subcommand has to exist, and its target has to be in the PUBLISHED artifact - a subcommand that
  // works only from a git checkout is the same defect wearing a different shape.
  const cli = src("bin/agent-skills-toolkit.mjs");
  assert.ok(/"gen-index":/.test(cli), "the CLI dispatches gen-index");
  assert.ok(pkg.files.includes("scripts/generators/gen-index.mjs"), "and the generator ships in the npm package");
});

test("no remediation anywhere assumes the reader has this repository's scripts/ directory", () => {
  // The generalisation of E35: a consumer who installs the toolkit has no scripts/ tree. Any message
  // naming a bare `node scripts/...` path must also offer the owned CLI form.
  const text = src("scripts/checks/index-drift.mjs");
  for (const m of text.matchAll(/"([^"]*node scripts\/[^"]*)"/g)) {
    assert.ok(
      m[1].includes("npx agent-skills-toolkit"),
      `a remediation names a vendored path without the owned CLI alternative: ${m[1].slice(0, 90)}`
    );
  }
});
