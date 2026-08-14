// what-it-is:   the v1.13.0 compatibility matrix - the release gate for ADR 0044 (W1) and the
//               graduations it carries (W2, W3, W4)
// what-it-does: drives 31 (pin x mode x strict x profile-owner x config x subject) combinations through
//               resolveFindings and asserts each one's COMPLETE disposition - severity, suppression,
//               gate result, ceiling shape, configReduced, and the notice text
// why:          every row is here because it fails a DIFFERENT wrong implementation, and three rounds of
//               hand-enumerated prose produced a matrix that was missing G4, missing pin 0.14, missing
//               every subject increase, and could be passed by a wrong implementation. The family
//               measurement cannot substitute for it: six local checkouts exercise a single cell of this
//               grid, all of them "valid pin, default config, askit-library, local mode"
// used-by:      npm test; the release gate in docs/internal/release-plans/plan_v1.13.0/RELEASE-PLAN.md
//
// SCOPE, stated rather than implied. Every row asserts effectiveSeverity, suppressed, whether the
// finding GATES, the ceiling object, configReduced and the notices. Earned tier and the blocked-tier
// list are NOT re-asserted per row: both are pure functions of the gating set and the reqId's tier, and
// they have their own coverage in tier-report tests. What this file owns is the resolution, which is
// where every defect the review found actually lived.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveFindings, gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom, ORIGIN, withGraderOptions } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { SINCE_BY_REQ } from "../../scripts/lib/standard-gate.mjs";

const PROV = provenanceByReq();

// The migration metadata each subject really carries. Asserted against the live check modules by the
// consistency test at the bottom, so this table cannot drift away from what the checks emit.
const U13_MIGRATION = { capAt: "warn", until: "0.13", reason: "ADR 0035: skill-registration drift is newly detected at Standard 0.12." };
const S4_MIGRATION = { capAt: "warn", until: "0.13", reason: "ADR 0041: a string-shaped chain declaration is newly parsed at Standard 0.12." };
const G4_MIGRATION = { capAt: "warn", until: "0.14", reason: "E35: this toolkit generated a self-validation line that named a command the plugin does not have." };
const U1_SUBRULE_MIGRATION = { capAt: "warn", until: "0.13", reason: "E35: library.json gains a selfValidation enum at Standard 0.13; an unknown field was previously ignored." };

/** Every subject as the check that owns it actually emits it: TARGET severity, plus migration if any. */
const SUBJECT = {
  U13: { reqId: "U13", severity: "error", migration: U13_MIGRATION },        // objective, since 0.12
  U14: { reqId: "U14", severity: "error", migration: null },                 // vendor-cited, since 0.13
  U4: { reqId: "U4", severity: "error", migration: null },                   // vendor-cited, since 0.x, UNCAPPED
  U7: { reqId: "U7", severity: "warn", migration: null },                    // vendor-cited, DECLARES warn
  S4_STRING: { reqId: "S4", severity: "error", migration: S4_MIGRATION },    // house, string-derived
  G4_LEGACY: { reqId: "G4", severity: "error", migration: G4_MIGRATION },    // house, OUR drift
  G4_OTHER: { reqId: "G4", severity: "error", migration: null },             // house, the author's drift
  U1_SELFVAL: { reqId: "U1", severity: "error", migration: U1_SUBRULE_MIGRATION }, // house subrule
};

const finding = (s) => ({ check: s.reqId, severity: s.severity, message: `${s.reqId} finding`, file: "f.md", reqId: s.reqId, migration: s.migration, line: null });

/**
 * Build the row's config. `profileOwner` decides whether the profile is the GRADER's choice or the
 * SUBJECT's - the distinction the whole trust step rests on, and the one that was invisible before W1a.
 */
function buildConfig({ mode = "local", profile, profileOwner, rules = {}, ruleOwner = ORIGIN.SUBJECT, suppressions = [] }) {
  let cfg = configFrom({
    mode,
    ...(profile && profileOwner === ORIGIN.SUBJECT ? { profile } : {}),
    rules,
    suppressions,
  }, ruleOwner);
  if (profile && profileOwner === ORIGIN.GRADER) cfg = withGraderOptions(cfg, { profile });
  return cfg;
}

// --- THE MATRIX ------------------------------------------------------------------------------------
// `pin: undefined` IS --strict: the caller withholds the pin, which is what makes both ceiling causes go
// inert together with no second flag to keep in sync.
const ROWS = [
  { id: "1", pin: "0.13", mode: "published-verdict", subject: "U13", rules: { U13: "warn" },
    sev: "error", sup: false, gate: "fail", kills: "the bypass itself" },

  { id: "2", pin: "0.13", mode: "published-verdict", subject: "U4", profile: "plain-plugin", profileOwner: ORIGIN.GRADER,
    sev: "warn", sup: false, gate: "pass", kills: "a floor that ignores provenance" },

  { id: "3", pin: "0.13", mode: "published-verdict", subject: "U4", profile: "plain-plugin", profileOwner: ORIGIN.SUBJECT,
    sev: "error", sup: false, gate: "fail", kills: "a self-granted exemption" },

  { id: "4", pin: "0.13", mode: "published-verdict", subject: "U7", rules: { U7: "warn" },
    sev: "warn", sup: false, gate: "pass", kills: "a hard-coded error floor" },

  { id: "5", pin: "0.13", mode: "published-verdict", subject: "U13", suppressions: [{ reqId: "U13", reason: "waived" }],
    sev: "error", sup: false, gate: "fail", kills: "a severity-only floor" },

  { id: "6", pin: "0.13", mode: "published-verdict", subject: "S4_STRING", rules: { S4: "off" },
    sev: "off", sup: false, gate: "pass", kills: "a floor that defends house checks" },

  { id: "7a", pin: "0.12", subject: "U13", rules: { U13: "warn" },
    sev: "warn", sup: false, gate: "pass", configReduced: true, ceiling: null, kills: "a floor leaking into local CI" },

  { id: "7b", pin: "0.12", subject: "U13", rules: { U13: "off" },
    sev: "off", sup: false, gate: "pass", configReduced: true, ceiling: null, kills: "a ceiling that fires on an already-off finding" },

  { id: "7c", pin: "0.12", subject: "U13", suppressions: [{ reqId: "U13", reason: "waived" }],
    sev: "warn", sup: true, gate: "pass", configReduced: false, ceilingNonNull: true, kills: "conflating suppression with a config reduction" },

  { id: "8", pin: "0.13", mode: "published-verdict", subject: "U13", ruleOwner: ORIGIN.GRADER,
    suppressions: [{ reqId: "U13", reason: "grader waiver", origin: ORIGIN.GRADER }],
    sev: "error", sup: true, gate: "pass", kills: "clearing the grader's own waiver" },

  { id: "9", pin: "0.13", mode: "published-verdict", subject: "U13", rules: { U13: "warn" },
    suppressions: [{ reqId: "U13", reason: "waived" }],
    sev: "error", sup: false, gate: "fail", kills: "ownership taken from the merged config" },

  { id: "10", pin: "0.13", mode: "published-verdict", subject: "U4", profile: "plain-plugin", profileOwner: ORIGIN.GRADER,
    rules: { U4: "off" },
    sev: "warn", sup: false, gate: "pass", kills: '"restore the declared severity"' },

  { id: "11", pin: "0.13", mode: "published-verdict", subject: "U7", rules: { U7: "error" },
    sev: "error", sup: false, gate: "fail", kills: "an unconditional reset (THE RANK GUARD)" },

  { id: "12", pin: "0.13", mode: "published-verdict", subject: "U4", profile: "plain-plugin", profileOwner: ORIGIN.GRADER,
    rules: { U4: "error" },
    sev: "error", sup: false, gate: "fail", kills: "a rank guard that ignores grader reductions" },

  { id: "13", pin: "0.13", mode: "published-verdict", subject: "U4", profile: "plain-plugin", profileOwner: ORIGIN.GRADER,
    rules: { U4: "error" }, ruleOwner: ORIGIN.GRADER,
    sev: "error", sup: false, gate: "fail", kills: "grader rule vs grader profile precedence" },

  { id: "14", pin: "0.12", mode: "published-verdict", subject: "U13", rules: { U13: "warn" },
    sev: "warn", sup: false, gate: "pass", kills: "THE RED-WARD INVARIANT (trust raises, ceiling lowers)" },

  { id: "15", pin: "0.11", subject: "U13",
    sev: "warn", sup: false, gate: "pass", ceilingNonNull: true, dueIs: "0.13", constraintCount: 2,
    kills: "a singular ceiling cause (due must read 0.13, not 0.12)" },

  { id: "16", pin: undefined, mode: "published-verdict", subject: "U13", rules: { U13: "warn" },
    sev: "error", sup: false, gate: "fail", ceiling: null, kills: "an implementation that ignores --strict" },

  { id: "17", pin: "0.14", subject: "G4_LEGACY",
    sev: "error", sup: false, gate: "fail", ceiling: null, kills: "AN INERT G4 GRADUATION" },

  { id: "18", pin: "0.13", subject: "G4_LEGACY",
    sev: "warn", sup: false, gate: "pass", ceilingNonNull: true, kills: "a G4 cap that never applies" },

  { id: "19", pin: "0.13", subject: "G4_OTHER",
    sev: "error", sup: false, gate: "fail", ceiling: null, kills: "a cap that swallows real drift" },

  { id: "20a", pin: undefined, subject: "U14",
    sev: "error", sup: false, gate: "fail", ceiling: null, kills: "a ceiling that guesses at a missing pin" },

  { id: "20b", pin: "banana", subject: "U14",
    sev: "error", sup: false, gate: "fail", ceiling: null, kills: "a garbage pin parsed as a real one" },

  { id: "21", pin: "0.12", mode: "published-verdict", subject: "U4", profile: "plain-plugin", profileOwner: ORIGIN.SUBJECT,
    sev: "error", sup: false, gate: "fail", ceiling: null,
    kills: 'the false "no red-ward below the graduation pin" guarantee (U4 is UNCAPPED)' },

  { id: "22", pin: undefined, subject: "U13",
    sev: "error", sup: false, gate: "fail", ceiling: null,
    kills: "the claim that published-verdict is the only red-ward path" },

  { id: "23a", pin: "0.12", subject: "U1_SELFVAL",
    sev: "warn", sup: false, gate: "pass", ceilingNonNull: true, migrationNotice: true,
    kills: "A NEW SUBRULE INHERITING ITS CHECK'S since" },

  { id: "23b", pin: "0.13", subject: "U1_SELFVAL",
    sev: "error", sup: false, gate: "fail", ceiling: null, kills: "a cap that never lifts" },

  { id: "23c", pin: undefined, subject: "U1_SELFVAL",
    sev: "error", sup: false, gate: "fail", ceiling: null, migrationNotice: false,
    kills: "an activation-specific reason under strict" },

  { id: "24a", pin: "0.13", subject: "U13",
    sev: "error", sup: false, gate: "fail", kills: "an inert U13 at an adopted pin" },

  { id: "24b", pin: "0.13", subject: "S4_STRING",
    sev: "error", sup: false, gate: "fail",
    kills: "an inert STRING-DERIVED S4, which an array fixture would mask" },

  { id: "24c", pin: "0.13", subject: "U14",
    sev: "error", sup: false, gate: "fail", kills: "an inert U14 at an adopted pin" },
];

test("the compatibility matrix has all 31 rows and no duplicate ids", () => {
  assert.equal(ROWS.length, 31, "a row silently dropped is a wrong implementation silently allowed");
  assert.equal(new Set(ROWS.map((r) => r.id)).size, 31);
});

for (const row of ROWS) {
  test(`matrix row ${row.id}: kills ${row.kills}`, () => {
    const cfg = buildConfig(row);
    const [out] = resolveFindings([finding(SUBJECT[row.subject])], cfg, PROV, {
      pinned: row.pin,
      sinceByReq: SINCE_BY_REQ,
    });

    const where = `row ${row.id} (${row.subject}, pin ${String(row.pin)}, ${row.mode ?? "local"})`;
    assert.equal(out.effectiveSeverity, row.sev, `${where}: effectiveSeverity`);
    assert.equal(out.suppressed, row.sup, `${where}: suppressed`);
    assert.equal(gatingFindings([out]).length > 0 ? "fail" : "pass", row.gate, `${where}: gate`);

    if ("ceiling" in row) assert.equal(out.ceiling, row.ceiling, `${where}: ceiling must be ${row.ceiling}`);
    if (row.ceilingNonNull) assert.ok(out.ceiling, `${where}: a ceiling must be recorded`);
    if ("configReduced" in row) assert.equal(out.configReduced, row.configReduced, `${where}: configReduced`);
    if (row.dueIs) assert.equal(out.ceiling.due, row.dueIs, `${where}: the due version is the LAST constraint to lift`);
    if (row.constraintCount) assert.equal(out.ceiling.constraints.length, row.constraintCount, `${where}: active constraint count`);
    if (row.migrationNotice === true) assert.ok(out.migrationNotice, `${where}: the cap must be explained`);
    if (row.migrationNotice === false) assert.equal(out.migrationNotice, null, `${where}: nothing bound, so nothing is promised`);
  });
}

// --- properties the rows share, asserted once ------------------------------------------------------

test("rows 14 and 16 differ in EXACTLY one input, and that is the point", () => {
  // Both are U13 at pin 0.12 under published-verdict with a subject-owned rules.U13 = "warn". With
  // strict OFF the trust step raises to error and the active until-ceiling lowers it back to warn
  // (pass). With strict ON the ceiling is inert, so it stays error (fail). An earlier revision put the
  // only strict row at pin 0.13, where U13 has no active constraint in EITHER mode - so an
  // implementation ignoring --strict entirely passed all twenty rows.
  const r14 = ROWS.find((r) => r.id === "14");
  const r16 = ROWS.find((r) => r.id === "16");
  assert.equal(r14.subject, r16.subject);
  assert.equal(r14.mode, r16.mode);
  assert.deepEqual(r14.rules, r16.rules);
  assert.notEqual(r14.pin, r16.pin, "the ONLY difference is whether the pin reaches the resolver");
  assert.notEqual(r14.sev, r16.sev, "and it must change the answer, or the row proves nothing");
});

test("the trust step never lifts a finding above its ceiling, which is why closing E38 cannot break the invariant", () => {
  // Row 14 in one sentence: raised to error by trust, lowered to warn by the ceiling, so the result is
  // what a consumer pinned at 0.12 saw before this release.
  const cfg = buildConfig({ mode: "published-verdict", rules: { U13: "warn" } });
  const [out] = resolveFindings([finding(SUBJECT.U13)], cfg, PROV, { pinned: "0.12", sinceByReq: SINCE_BY_REQ });
  assert.ok(out.trust?.raised, "the trust step DID act");
  assert.equal(out.effectiveSeverity, "warn", "and the ceiling still won");
});

test("the matrix's migration table matches what the live checks actually emit", () => {
  // The rows above synthesize findings. If a check's real migration metadata drifted from this table,
  // every row would keep passing against a fiction - so the table is diffed against source here.
  const src = {
    U13: "scripts/checks/skill-registration.mjs",
    S4: "scripts/checks/chain-contract.mjs",
    G4: "scripts/checks/index-drift.mjs",
    U1: "scripts/checks/library-json.mjs",
  };
  const expect = { U13: U13_MIGRATION, S4: S4_MIGRATION, G4: G4_MIGRATION, U1: U1_SUBRULE_MIGRATION };
  for (const [req, file] of Object.entries(src)) {
    const text = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    assert.ok(text.includes(`until: "${expect[req].until}"`), `${req}: ${file} must declare until ${expect[req].until}`);
    assert.ok(text.includes(expect[req].reason), `${req}: the reason in this matrix must match ${file} verbatim`);
  }
});
