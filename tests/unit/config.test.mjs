import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, DEFAULT_CONFIG, CONFIG_FILENAME } from "../../scripts/lib/config.mjs";
import { resolveFindings, gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { globToRegExp, matchSuppression } from "../../scripts/lib/suppressions.mjs";
import { runGate } from "../../scripts/check.mjs";
import { evaluate } from "../../scripts/evaluate.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";

// Proves the F3 gate config (config.mjs / profiles.mjs / resolve-config.mjs / suppressions.mjs): per-rule
// severity override and disable, named profiles, a durable suppressions baseline, per-check provenance and
// the real-issues/profile-conformance report split, the minimal published-verdict trust clamp, and the
// hard back-compat contract (no askit.config.json => identical behavior). Pure-resolver cases use the real
// provenance map; integration cases build a minimal plugin in a temp dir.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(REPO_ROOT, "tests/fixtures");
const PROV = provenanceByReq();
const f = (severity, reqId, extra = {}) => ({ check: reqId ?? "x", severity, message: "m", file: null, reqId, ...extra });
const cfg = (over = {}) => ({ mode: "local", profile: "askit-library", rules: {}, suppressions: [], ...over });

// Build a minimal valid plugin (clone of golden/minimal-skill) in a temp dir; run fn(dir); always clean up.
function withPlugin(setup, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-cfg-"));
  try {
    cpSync(path.join(FIXTURES, "golden/minimal-skill"), dir, { recursive: true });
    setup(dir);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const writeConfig = (dir, obj) => writeFileSync(path.join(dir, CONFIG_FILENAME), JSON.stringify(obj, null, 2));

// --- G-BC: the back-compat spine -------------------------------------------------------------------

test("G-BC: no askit.config.json is a no-op (DEFAULT_CONFIG; toolkit + minimal-skill gate unchanged)", () => {
  const empty = mkdtempSync(path.join(tmpdir(), "askit-noconf-"));
  try {
    assert.deepEqual(loadConfig(empty).config, DEFAULT_CONFIG);
    assert.equal(loadConfig(empty).findings.length, 0);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
  const repo = runGate(REPO_ROOT);
  assert.equal(repo.exitCode, 0);
  assert.equal(repo.errorCount, 0);
  assert.equal(repo.warnCount, 0);
  const minimal = runGate(path.join(FIXTURES, "golden/minimal-skill"));
  assert.equal(minimal.exitCode, 0);
  assert.equal(minimal.errorCount, 0);
  // A real finding is unchanged by the no-op resolver: a weak description stays a U5 warn.
  const weak = runGate(path.join(FIXTURES, "anti/weak-description"));
  const u5 = weak.findings.find((x) => x.reqId === "U5");
  assert.ok(u5, "U5 fires on a weak description");
  assert.equal(u5.effectiveSeverity, u5.severity, "no config => effectiveSeverity equals the emitted severity");
});

// --- A / B / I: per-rule override, disable, precedence (pure resolver) -----------------------------

test("A: a per-rule override downgrades a finding (error -> warn) and it is still reported", () => {
  const [out] = resolveFindings([f("error", "U6")], cfg({ rules: { U6: "warn" } }), PROV);
  assert.equal(out.effectiveSeverity, "warn");
  assert.equal(out.downgradedFrom, "error");
  assert.equal(gatingFindings([out]).length, 0, "a warn does not gate");
});

test("B: a disabled rule (off) drops from gating and counts but is still present with downgradedFrom set", () => {
  const [out] = resolveFindings([f("error", "U6")], cfg({ rules: { U6: "off" } }), PROV);
  assert.equal(out.effectiveSeverity, "off");
  assert.equal(out.downgradedFrom, "error");
  assert.equal(gatingFindings([out]).length, 0);
});

test("I: precedence is per-rule override > profile > declared", () => {
  // plain-plugin turns G10 off; an explicit rule re-enables it as an error.
  const [out] = resolveFindings([f("error", "G10")], cfg({ profile: "plain-plugin", rules: { G10: "error" } }), PROV);
  assert.equal(out.effectiveSeverity, "error");
  // and with no rule, the profile wins over the declared severity.
  const [prof] = resolveFindings([f("error", "G10")], cfg({ profile: "plain-plugin" }), PROV);
  assert.equal(prof.effectiveSeverity, "off");
});

// --- C: a profile downgrades the house/library-ladder checks (integration) -------------------------

test("C: the plain-plugin profile turns the house checks off, so a house-only plugin grades clean", () => {
  // A minimal plugin declared at advanced fails only HOUSE checks (S1-S3 convergent, G2/G4/G5 Gold:
  // no agent-targets/prefix/components, no CI, no INDEX, no RELEASE-NOTES) and zero objective/vendor
  // checks. So plain-plugin (all house checks off) grades it clean as Advanced, while real issues stay 0.
  withPlugin(
    (dir) => {
      const lib = JSON.parse(readFileSync(path.join(dir, "library.json"), "utf8"));
      lib.tier = "advanced";
      writeFileSync(path.join(dir, "library.json"), JSON.stringify(lib, null, 2));
    },
    (dir) => {
      const full = evaluate(dir, {}); // default askit-library profile
      const g2 = full.findings.find((x) => x.reqId === "G2");
      assert.ok(g2 && g2.effectiveSeverity === "error", "G2 self-hosting fires as a house error under askit-library");
      assert.notEqual(full.tier, "advanced", "the full ladder blocks the house-incomplete plugin below advanced");
      assert.equal(full.dispositions.realIssues, 0, "all failures are house, so zero objective/vendor real issues");
      assert.ok(full.dispositions.profileConformance >= 1, "the house failures show as profile conformance");

      writeConfig(dir, { profile: "plain-plugin" });
      const plain = evaluate(dir);
      assert.equal(plain.findings.find((x) => x.reqId === "G2").effectiveSeverity, "off", "plain-plugin turns the house G2 check off");
      assert.equal(plain.tier, "advanced", "with the house checks off, the portable-clean plugin grades as Advanced");
      assert.equal(plain.dispositions.realIssues, 0);
    }
  );
});

// --- D / E: suppressions ---------------------------------------------------------------------------

test("D: a matching suppression waives a finding (local mode); a non-matching glob does not", () => {
  const sup = { reqId: "U6", file: "docs/**", reason: "legacy link, waived" };
  const [waived] = resolveFindings([f("error", "U6", { file: "docs/old.md" })], cfg({ suppressions: [sup] }), PROV);
  assert.equal(waived.suppressed, true);
  assert.equal(waived.suppressionReason, "legacy link, waived");
  assert.equal(gatingFindings([waived]).length, 0);
  const [kept] = resolveFindings([f("error", "U6", { file: "src/other.md" })], cfg({ suppressions: [sup] }), PROV);
  assert.equal(kept.suppressed, false, "a file outside the glob is not suppressed");
});

test("E: suppression specificity - message substring, and ** matches a null-file finding", () => {
  assert.ok(globToRegExp("docs/**").test("docs/a/b.md"));
  assert.ok(!globToRegExp("docs/*").test("docs/a/b.md"), "single * does not cross a slash");
  // message-scoped: matches only the finding whose message contains the substring
  const byMsg = { reqId: "U11", message: "bearer", reason: "allowlisted field" };
  assert.ok(matchSuppression(f("error", "U11", { message: "bearer_token present" }), [byMsg]));
  assert.equal(matchSuppression(f("error", "U11", { message: "empty url" }), [byMsg]), null);
  // a "**" (default) file glob matches a null-file finding; a narrower glob does not
  assert.ok(matchSuppression(f("error", "U1", { file: null }), [{ reqId: "U1", file: "**", reason: "r" }]));
  assert.equal(matchSuppression(f("error", "U1", { file: null }), [{ reqId: "U1", file: "library.json", reason: "r" }]), null);
});

// --- F: provenance counts / the report split -------------------------------------------------------

test("F: dispositions splits real issues (objective/vendor) from profile conformance (house)", () => {
  // synthesize a mixed resolved set and re-run it through the shared split via evaluate-shaped logic:
  const resolved = resolveFindings([f("error", "U6"), f("error", "G10")], cfg(), PROV); // U6 objective, G10 house
  const realIssues = resolved.filter((x) => x.effectiveSeverity === "error" && x.provenance !== "house").length;
  const houseErrors = resolved.filter((x) => x.effectiveSeverity === "error" && x.provenance === "house").length;
  assert.equal(realIssues, 1, "U6 (objective) is a real issue");
  assert.equal(houseErrors, 1, "G10 (house) is profile conformance, not a real issue");
});

// --- H: malformed / unknown config is surfaced, never thrown ----------------------------------------

test("H: a malformed or unknown-key config is surfaced as findings and never crashes the gate", () => {
  withPlugin((dir) => writeFileSync(path.join(dir, CONFIG_FILENAME), "{ not json"), (dir) => {
    const { config, findings } = loadConfig(dir);
    assert.deepEqual(config, DEFAULT_CONFIG);
    assert.equal(findings.filter((x) => x.severity === "error").length, 1, "invalid JSON => one config error");
    assert.doesNotThrow(() => runGate(dir));
  });
  withPlugin((dir) => writeConfig(dir, { profile: "nope", rules: { U99: "warn", U6: "loud" }, suppressions: [{ file: "x" }] }), (dir) => {
    const { config, findings } = loadConfig(dir);
    assert.equal(config.profile, "askit-library", "unknown profile falls back");
    assert.ok(findings.some((x) => /unknown profile/.test(x.message)));
    assert.ok(findings.some((x) => /unknown rule id 'U99'/.test(x.message)));
    assert.ok(findings.some((x) => /'loud' is not error\/warn\/off/.test(x.message)));
    assert.ok(findings.some((x) => /reqId is required/.test(x.message)));
    assert.ok(findings.every((x) => x.severity === "warn"), "soft config problems are warnings, not errors");
  });
});

// --- J: the minimal published-verdict trust clamp ---------------------------------------------------

test("J: published-verdict mode clamps an off'd objective finding to warn; local mode drops it; house is never clamped", () => {
  // objective (U6) turned off in published-verdict mode -> surfaced at warn with a clampNotice
  const [clamped] = resolveFindings([f("error", "U6")], cfg({ mode: "published-verdict", rules: { U6: "off" } }), PROV);
  assert.equal(clamped.effectiveSeverity, "warn");
  assert.ok(clamped.clampNotice, "carries a clampNotice");
  assert.equal(gatingFindings([clamped]).length, 0, "clamp is warn-only, never gates");
  // the SAME config in local mode drops it
  const [dropped] = resolveFindings([f("error", "U6")], cfg({ rules: { U6: "off" } }), PROV);
  assert.equal(dropped.effectiveSeverity, "off");
  assert.equal(dropped.clampNotice, null);
  // a house finding (G10) off in published-verdict mode is NOT clamped
  const [house] = resolveFindings([f("error", "G10")], cfg({ mode: "published-verdict", rules: { G10: "off" } }), PROV);
  assert.equal(house.effectiveSeverity, "off");
  assert.equal(house.clampNotice, null);
  // a suppression of an objective finding in published-verdict mode surfaces it at warn (not suppressed)
  const [supClamp] = resolveFindings([f("error", "U6", { file: "a.md" })], cfg({ mode: "published-verdict", suppressions: [{ reqId: "U6", reason: "r" }] }), PROV);
  assert.equal(supClamp.effectiveSeverity, "warn");
  assert.equal(supClamp.suppressed, false, "an objective suppression is surfaced, not hidden, in published-verdict mode");
  assert.ok(supClamp.clampNotice);
});

test("J2: a clamped finding is its OWN disposition, never folded into profile conformance", () => {
  const resolved = resolveFindings([f("error", "U6")], cfg({ mode: "published-verdict", rules: { U6: "off" } }), PROV);
  const clamped = resolved.filter((x) => x.clampNotice != null).length;
  const profileConformance = resolved.filter((x) => x.clampNotice == null && ((x.effectiveSeverity === "error" && x.provenance === "house") || x.downgradedFrom != null)).length;
  assert.equal(clamped, 1);
  assert.equal(profileConformance, 0, "the clamped objective finding must not be counted as profile conformance");
});
