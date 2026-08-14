// what-it-is:   coverage for the ordered disposition partition (ADR 0044, W1c)
// what-it-does: proves the five buckets are exhaustive, mutually exclusive and SUM to the finding count,
//               and that trustActions is orthogonal to them rather than a sixth bucket
// why:          the buckets used to OVERLAP - a live non-house error reduced by config was counted in
//               both realIssues and profileConformance - so "the buckets sum" was never true, which is
//               exactly what every consumer assumed they could do. Making them a partition is a public
//               meaning change and it needs a test that would catch a silent return to overlapping
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom, withGraderOptions } from "../../scripts/lib/config.mjs";
import { dispositions } from "../../scripts/evaluate.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";

const PROV = provenanceByReq();
const f = (severity, reqId, extra = {}) => ({ check: reqId ?? "config", severity, message: "m", file: null, reqId, ...extra });
const cfg = (over = {}) => configFrom({ mode: "local", profile: "askit-library", rules: {}, suppressions: [], ...over });

const sum = (d) => d.realIssues + d.profileConformance + d.suppressed + d.clamped + d.warns;

test("the five buckets sum to the finding count across every shape that used to double-count", () => {
  // Each entry is a counterexample the partition has to survive, and each one landed in TWO buckets
  // under the old predicates.
  const cases = [
    {
      what: "an UNREDUCED house error (stays in profileConformance, exactly as today)",
      findings: [f("error", "G10")],
      config: cfg(),
      expect: { profileConformance: 1 },
    },
    {
      what: "a CEILING-lowered warning (Standard debt is not profile conformance)",
      findings: [f("error", "G10")],
      config: cfg(),
      opts: { pinned: "0.9", sinceByReq: { G10: "0.10" } },
      expect: { warns: 1 },
    },
    {
      what: "a null-reqId config finding",
      findings: [f("warn", null)],
      config: cfg(),
      expect: { warns: 1 },
    },
    {
      what: "a config-REDUCED non-house error (was in realIssues AND profileConformance)",
      findings: [f("error", "U6")],
      config: cfg({ rules: { U6: "warn" } }),
      expect: { profileConformance: 1 },
    },
    {
      what: "a grader-profile-reduced U4 warn (was in warns AND profileConformance - matrix row 2)",
      findings: [f("error", "U4")],
      config: withGraderOptions(cfg({ mode: "published-verdict" }), { profile: "plain-plugin" }),
      expect: { profileConformance: 1 },
    },
    {
      what: "a suppression that also carries clamp metadata (suppressed wins, first match)",
      findings: [f("warn", "U6", { file: "a.md" })],
      config: withGraderOptions(cfg({ mode: "published-verdict" }), {}),
      // A grader-owned suppression is NOT cleared, so the finding stays suppressed while the old clamp
      // condition (a suppression in published mode) is also satisfied.
      suppressionOverride: [{ reqId: "U6", reason: "grader waiver", origin: "grader" }],
      expect: { suppressed: 1 },
    },
  ];

  for (const c of cases) {
    const config = c.suppressionOverride
      ? { ...c.config, suppressions: c.suppressionOverride }
      : c.config;
    const resolved = resolveFindings(c.findings, config, PROV, c.opts ?? {});
    const d = dispositions(resolved);
    assert.equal(sum(d), resolved.length, `${c.what}: the five buckets must sum to ${resolved.length}`);
    for (const [bucket, n] of Object.entries(c.expect)) {
      assert.equal(d[bucket], n, `${c.what}: expected ${n} in ${bucket}, got ${d[bucket]} (all: ${JSON.stringify(d)})`);
    }
  }
});

test("realIssues still EXCLUDES house errors, which is the existing public meaning", () => {
  const resolved = resolveFindings([f("error", "G10"), f("error", "U6")], cfg(), PROV);
  const d = dispositions(resolved);
  assert.equal(d.realIssues, 1, "only the non-house error is a real issue");
  assert.equal(d.profileConformance, 1, "the house error is profile conformance");
  assert.equal(sum(d), 2);
});

test("trustActions is ORTHOGONAL: one finding can increment both counters, so they cannot be buckets", () => {
  // Matrix row 9. A subject-owned rule reduced the severity AND a subject-owned suppression waived it,
  // so the trust step both raises and clears on the SAME finding. Any attempt to make these buckets of
  // the partition is unsatisfiable, which is why they are declared orthogonal and excluded from the sum.
  const config = configFrom({
    mode: "published-verdict",
    rules: { U6: "off" },
    suppressions: [{ reqId: "U6", reason: "waived by the subject" }],
  });
  const resolved = resolveFindings([f("error", "U6")], config, PROV);
  const d = dispositions(resolved);

  assert.equal(d.trustActions.raised, 1);
  assert.equal(d.trustActions.suppressionsCleared, 1);
  assert.equal(sum(d), 1, "the same finding still occupies exactly ONE bucket");
  assert.equal(d.realIssues, 1, "unsuppressed and restored to error, so it is a real issue");
});

test("a subject INCREASE is not profile conformance", () => {
  // The old predicate keyed off `downgradedFrom != null`, which also catches a subject being STRICTER
  // about itself - landing row 11's raised U7 in both realIssues and profileConformance while `clamped`
  // stayed zero, contradicting the documented split three ways at once.
  const resolved = resolveFindings([f("warn", "U7")], cfg({ rules: { U7: "error" } }), PROV);
  const d = dispositions(resolved);
  assert.equal(d.realIssues, 1);
  assert.equal(d.profileConformance, 0, "being stricter about yourself is not a profile downgrade");
  assert.equal(sum(d), 1);
});
