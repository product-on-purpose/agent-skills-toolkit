import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, configFrom, withGraderOptions, DEFAULT_CONFIG, CONFIG_FILENAME } from "../../scripts/lib/config.mjs";
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
const cfg = (over = {}) => configFrom({ mode: "local", profile: "askit-library", rules: {}, suppressions: [], ...over });

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
    assert.equal(config.profile.value, "askit-library", "unknown profile falls back");
    // ADR 0044: a REJECTED value keeps the default's origin. The subject wrote something, but it is not
    // the value in force, and stamping it `subject` would let a malformed config claim ownership of a
    // setting it never successfully chose - which the published-verdict trust step would then act on.
    assert.equal(config.profile.origin, "default", "a rejected profile is not subject-owned");
    assert.ok(findings.some((x) => /unknown profile/.test(x.message)));
    assert.ok(findings.some((x) => /unknown rule id 'U99'/.test(x.message)));
    assert.ok(findings.some((x) => /'loud' is not error\/warn\/off/.test(x.message)));
    assert.ok(findings.some((x) => /reqId is required/.test(x.message)));
    assert.ok(findings.every((x) => x.severity === "warn"), "soft config problems are warnings, not errors");
  });
});

// --- J: the published-verdict TRUST STEP, which REVERSES the old clamp (E38, ADR 0044) -------------

test("J: a subject cannot weaken a published verdict about itself; the old off-to-warn clamp is reversed", () => {
  // WAS: an off'd objective finding was lifted to `warn` with a clampNotice, and resolve-config.mjs
  // promised in so many words that "turning the mode on can never flip a passing gate to failing".
  // ADR 0044 deliberately REVERSES that guarantee, in this mode only, for subject-owned settings only.
  // A guarantee that protects the subject is the wrong guarantee in the one mode built to publish a
  // verdict ABOUT the subject. This test is rewritten rather than deleted so the reversal is visible in
  // the diff instead of being a test that quietly stopped existing.
  const [restored] = resolveFindings([f("error", "U6")], cfg({ mode: "published-verdict", rules: { U6: "off" } }), PROV);
  assert.equal(restored.effectiveSeverity, "error", "the TRUSTED resolution, not the old warn clamp");
  assert.equal(restored.trust.raised, true);
  assert.ok(restored.trustNotice, "the subject is told which of its own settings was overruled");
  assert.match(restored.trustNotice, /rules\.U6/, "and which one, by name");
  assert.equal(gatingFindings([restored]).length, 1, "it GATES, which the clamp could never make it do");
  assert.equal(restored.clampNotice, null, "the deprecated field cannot describe a gate-failing error truthfully");

  // LOCAL mode is untouched: a subject's own config is authoritative about its own repository.
  const [dropped] = resolveFindings([f("error", "U6")], cfg({ rules: { U6: "off" } }), PROV);
  assert.equal(dropped.effectiveSeverity, "off");
  assert.equal(dropped.trustNotice, null);

  // HOUSE provenance is never touched by the trust step, in any mode.
  const [house] = resolveFindings([f("error", "G10")], cfg({ mode: "published-verdict", rules: { G10: "off" } }), PROV);
  assert.equal(house.effectiveSeverity, "off");
  assert.equal(house.trustNotice, null);

  // Suppression is decided INDEPENDENTLY of severity, and getting this wrong would have left the whole
  // fix bypassable: gatingFindings requires `error` AND `!suppressed`, so a step that only raised
  // severity leaves a subject-owned waiver intact and the finding still publishes green.
  const [waived] = resolveFindings([f("error", "U6", { file: "a.md" })], cfg({ mode: "published-verdict", suppressions: [{ reqId: "U6", reason: "r" }] }), PROV);
  assert.equal(waived.suppressed, false, "the subject's own waiver is cleared");
  assert.equal(waived.effectiveSeverity, "error");
  assert.equal(waived.trust.suppressionCleared, true);
  assert.equal(gatingFindings([waived]).length, 1);
});

test("J-guard: the trust step RAISES ONLY - a stricter subject survives untouched", () => {
  // Without this guard the fix inverts into the defect it exists to prevent. A subject writing
  // rules.U7 = "error" on a check that declares `warn` is being STRICTER about itself; an unconditional
  // recomputation drops it back to warn, turning a deliberately failing published verdict green by way
  // of the mechanism built to stop verdicts being turned green.
  const [stricter] = resolveFindings([f("warn", "U7")], cfg({ mode: "published-verdict", rules: { U7: "error" } }), PROV);
  assert.equal(stricter.effectiveSeverity, "error", "the subject's own stricter setting stands");
  assert.equal(stricter.trust, null, "nothing was overruled, so no trust action is recorded");
  assert.equal(gatingFindings([stricter]).length, 1);
});

test("J-grader: a GRADER-owned reduction passes through; the same value written by the SUBJECT does not", () => {
  // The whole point of config provenance, as one pair. plain-plugin resolves U4 to warn (ADR 0031's
  // calibration), and that is the real use of the mode: publishing an honest verdict about a third-party
  // plugin against a rubric the GRADER chose. A subject writing the same profile into its own config
  // gets no reduction, so the exemption cannot be self-granted.
  const graderChose = withGraderOptions(cfg({ mode: "published-verdict" }), { profile: "plain-plugin" });
  const [byGrader] = resolveFindings([f("error", "U4")], graderChose, PROV);
  assert.equal(byGrader.effectiveSeverity, "warn", "the grader's own rubric is trusted");
  assert.equal(byGrader.trust, null);

  const [bySubject] = resolveFindings([f("error", "U4")], cfg({ mode: "published-verdict", profile: "plain-plugin" }), PROV);
  assert.equal(bySubject.effectiveSeverity, "error", "a self-granted exemption is overruled");
  assert.match(bySubject.trustNotice, /profile/);
});

test("J-rollback: the trust step rolls back to the TRUSTED resolution, not to the declared severity", () => {
  // "Restore the declared severity" was wrong. With a grader-owned --profile plain-plugin (which
  // resolves U4 to warn) beneath a subject-owned rules.U4 = "off", an atomic reset to the declared
  // severity yields `error` - discarding the grader's own deliberate warn and violating the rule that
  // grader-owned reductions pass through untouched.
  const cfgMixed = withGraderOptions(cfg({ mode: "published-verdict", rules: { U4: "off" } }), { profile: "plain-plugin" });
  const [out] = resolveFindings([f("error", "U4")], cfgMixed, PROV);
  assert.equal(out.effectiveSeverity, "warn", "the grader asked for warn, and warn is what it gets");
  assert.equal(out.trust.raised, true, "the subject's `off` was still overruled");
});

test("J-compat: clampNotice survives only where it can still be TRUE - a result that really is warn", () => {
  // The deprecated field is populated only where the old clamp would have fired AND the final severity
  // really is `warn`, which is exactly the set of findings whose old semantics it can still state
  // truthfully. Mirroring it onto every trust action would stamp "clamped to warn" on a gate-failing
  // error, and a compatibility field that lies is worse than one that is absent.
  const [w] = resolveFindings([f("warn", "U6")], cfg({ mode: "published-verdict", rules: { U6: "off" } }), PROV);
  assert.equal(w.effectiveSeverity, "warn");
  assert.ok(w.clampNotice, "the old semantics are still true here");
  assert.ok(w.trustNotice, "and the new field is set on every trust action");
});

// --- K: the migration cap (round-2 adversarial review, S4 warn-first findings promoted back to
// errors) - a finding may carry `migration: { capAt, until, reason }`; resolveFindings applies it
// LAST, after per-rule override, profile, and suppression have produced effectiveSeverity, as a
// CEILING that can only lower severity, never raise it. -------------------------------------------

const withMigration = (severity, reqId, migration, extra = {}) => f(severity, reqId, { migration, ...extra });

// ADR 0044: the cap is one cause of a pin-relative ceiling, not an unconditional rule, so these cases
// have to declare a pin to exercise it at all. An UNPINNED target now has no migration window (ADR
// 0027's back-compat rule), which chain-contract-migration-cap.test.mjs measures end to end.
const CAPPED = { pinned: "0.12", sinceByReq: {} };

test("K: a per-rule override that would raise severity past the cap is pulled back down to capAt, and the cap is surfaced (never silent)", () => {
  const migration = { capAt: "warn", until: "0.13", reason: "ADR 0041: warn-first until Standard 0.13" };
  const [out] = resolveFindings([withMigration("warn", "S4", migration)], cfg({ rules: { S4: "error" } }), PROV, CAPPED);
  assert.equal(out.effectiveSeverity, "warn", "the override asked for error; the cap holds it at warn");
  assert.ok(out.migrationNotice, "a consumer whose override was overruled must be told why");
  assert.match(out.migrationNotice, /0\.13/);
  assert.equal(gatingFindings([out]).length, 0, "a capped warn does not gate");
});

test("K2: the cap is a ceiling, never a floor - it does not raise an already-lower severity", () => {
  const migration = { capAt: "warn", until: "0.13", reason: "r" };
  // rules turn it fully off: the cap must not resurrect it to warn.
  const [off] = resolveFindings([withMigration("warn", "S4", migration)], cfg({ rules: { S4: "off" } }), PROV, CAPPED);
  assert.equal(off.effectiveSeverity, "off", "off must still win; the cap never raises off back to warn");
  assert.equal(off.migrationNotice, null, "the cap did not act, so there is nothing to surface");
  // no override at all: severity is already at (not above) the cap, so nothing changes.
  const [atCap] = resolveFindings([withMigration("warn", "S4", migration)], cfg(), PROV, CAPPED);
  assert.equal(atCap.effectiveSeverity, "warn");
  assert.equal(atCap.migrationNotice, null, "a severity already at the cap is not reported as capped");
});

test("K3: a capped finding that is also suppressed stays suppressed and does not reappear as a warning", () => {
  const migration = { capAt: "warn", until: "0.13", reason: "r" };
  const sup = { reqId: "S4", reason: "waived for this fixture" };
  const [out] = resolveFindings([withMigration("warn", "S4", migration)], cfg({ rules: { S4: "error" }, suppressions: [sup] }), PROV, CAPPED);
  assert.equal(out.suppressed, true, "suppression still wins regardless of the cap");
  assert.equal(out.effectiveSeverity, "warn", "the cap still resolves the severity underneath the suppression");
  assert.equal(gatingFindings([out]).length, 0);
  const wouldShowAsWarn = out.effectiveSeverity === "warn" && !out.suppressed;
  assert.equal(wouldShowAsWarn, false, "a suppressed+capped finding must not reappear in a warn count");
});

test("K4: a finding with no migration metadata is completely unaffected by the cap mechanism", () => {
  const [out] = resolveFindings([f("error", "U6")], cfg({ rules: { U6: "error" } }), PROV);
  assert.equal(out.effectiveSeverity, "error");
  assert.equal(out.migrationNotice, null, "no migration field means the cap never runs");
});
