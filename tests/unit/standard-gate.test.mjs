import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SINCE_BY_REQ } from "../../scripts/lib/standard-gate.mjs";
import { resolveFindings, gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { runGate, gateExitFromFindings } from "../../scripts/check.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";

const PROV = provenanceByReq();

// Proves the ADR 0027 standard-aware downgrade (scripts/lib/standard-gate.mjs) end to end:
// SINCE_BY_REQ matches the spine; applyStandardDowngrade rewrites only post-pin errors to warn and only
// ever error->warn (never the reverse, so it can never turn a passing plugin into a failing one); the
// downgrade composes with the declared-tier ceiling so the gate exit flips with the pin; the toolkit's
// own gate is unchanged (it pins current, so nothing downgrades); and a real plugin tree pinned below a
// check's `since` passes with a warn where it would otherwise gate-fail.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(REPO_ROOT, "tests/fixtures");
const f = (severity, reqId, extra = {}) => ({ check: "x", severity, message: "m", file: null, reqId, ...extra });

test("SINCE_BY_REQ covers every spine reqId; the ADR 0024 checks are 0.10, U13 is 0.12, U14 is 0.13, U15/U16/U17 are 0.14, U18 is 0.16, the rest baseline", () => {
  assert.equal(Object.keys(SINCE_BY_REQ).length, 35);
  assert.equal(SINCE_BY_REQ["U14"], "0.13", "U14 (agent-restricted-fields) should be 0.13 (ADR 0045)");
  assert.equal(SINCE_BY_REQ["U15"], "0.14", "U15 (agents-dir-registerable) should be 0.14 (ADR 0046)");
  assert.equal(SINCE_BY_REQ["U16"], "0.14", "U16 (metadata-placement) should be 0.14 (ADR 0050)");
  assert.equal(SINCE_BY_REQ["U17"], "0.14", "U17 (catalogue-manifest-shape) should be 0.14 (ADR 0052)");
  assert.equal(SINCE_BY_REQ["U18"], "0.16", "U18 (command-size-cap) should be 0.16 (ADR 0058)");
  for (const r of ["U12", "G7", "G8", "G9", "G10"]) assert.equal(SINCE_BY_REQ[r], "0.10", `${r} should be 0.10`);
  assert.equal(SINCE_BY_REQ["U13"], "0.12", "U13 (skill-registration) should be 0.12 (ADR 0035)");
  for (const r of ["U1", "U8", "S1", "G1", "G6"]) assert.equal(SINCE_BY_REQ[r], "0.x", `${r} should be baseline`);
});

// --- the ceiling, which replaced the pre-pass (ADR 0044) -------------------------------------------
//
// Every property the old applyStandardDowngrade tests asserted is preserved here, against the mechanism
// that replaced it. The difference that matters: the pre-pass REWROTE `severity`, so a downgraded
// finding no longer knew what its check had emitted. The ceiling leaves `severity` alone and lowers
// `effectiveSeverity`, which is what lets a check emit its TARGET severity and the ceiling hold it back.

const resolve1 = (finding, pinned, config = configFrom({})) =>
  resolveFindings([finding], config, PROV, { pinned, sinceByReq: SINCE_BY_REQ })[0];

test("a BASELINE (0.x) check is never held back, at any pin", () => {
  const out = resolve1(f("error", "U1"), "0.9");
  assert.equal(out.effectiveSeverity, "error");
  assert.equal(out.ceiling, null);
});

test("a post-pin check is held at warn, and the ceiling records the cause, the due version and the pin", () => {
  const input = [f("error", "G10")];
  const [out] = resolveFindings(input, configFrom({}), PROV, { pinned: "0.9", sinceByReq: SINCE_BY_REQ });
  assert.equal(out.effectiveSeverity, "warn");
  assert.equal(out.severity, "error", "the EMITTED severity is untouched; only the effective one is lowered");
  assert.deepEqual(out.ceiling, {
    pinned: "0.9",
    from: "error",
    to: "warn",
    due: "0.10",
    constraints: [{ cause: "since", due: "0.10" }],
  });
  assert.equal(out.downgraded, true, "the legacy --json field still says an applied downgrade happened");
  assert.equal(out.since, "0.10", "`since` is emitted because an INTRODUCTION participated");
  assert.equal(input[0].severity, "error", "must not mutate the input array");
});

test("the boundary: a pin EQUAL to the check's since is not after it, so nothing is held", () => {
  const out = resolve1(f("error", "G10"), "0.10");
  assert.equal(out.effectiveSeverity, "error");
  assert.equal(out.ceiling, null);
});

test("no pin, a forward pin, and a garbage pin all grade at full strength", () => {
  for (const pin of [undefined, "0.11", "latest"]) {
    const out = resolve1(f("error", "G10"), pin);
    assert.equal(out.effectiveSeverity, "error", `pin ${String(pin)} must grade at full strength`);
    assert.equal(out.ceiling, null);
  }
});

test("the ceiling NEVER raises: a warn under a warn ceiling stays warn and reports no ceiling", () => {
  const out = resolve1(f("warn", "G10"), "0.9");
  assert.equal(out.effectiveSeverity, "warn");
  assert.equal(out.ceiling, null, "a version condition that changed no outcome is not debt");
  assert.equal(out.downgraded, undefined);
});

test("pinning the BASELINE sentinel '0.x' in library.json is not a back door: a 0.10 error still gates", () => {
  const out = resolve1(f("error", "G10"), "0.x");
  assert.equal(out.effectiveSeverity, "error", "the '0.x' sentinel is not a real pin; grade at full strength");
  assert.equal(out.ceiling, null);
});

test("E26 IS CLOSED: a consumer's own rules override can no longer beat the pin", () => {
  // The whole reason the downgrade moved. As a PRE-pass it ran before configuration resolved, so
  // `rules.G10 = "error"` re-raised a finding for a check that did not exist at the plugin's pin - a
  // verdict moving with no pin change. The ceiling runs LAST, so the override is honoured and then
  // held back, and the consumer is told why rather than seeing their override silently ignored.
  const out = resolve1(f("error", "G10"), "0.9", configFrom({ rules: { G10: "error" } }));
  assert.equal(out.effectiveSeverity, "warn", "the pin wins over the subject's own override");
  assert.ok(out.ceiling, "and the reason is recorded rather than silent");
  assert.equal(out.ceiling.from, "error");
});

test("the ceiling composes with the tier ceiling: the gate exit flips with the pin", () => {
  // Projected exactly as check.mjs projects it, so this measures the real gate path.
  const gate = (finding, pinned, tier) => {
    const resolved = resolveFindings([finding], configFrom({}), PROV, { pinned, sinceByReq: SINCE_BY_REQ });
    const forGate = gatingFindings(resolved).map((x) => ({ ...x, severity: x.effectiveSeverity }));
    return gateExitFromFindings(forGate, tier).exitCode;
  };
  assert.equal(gate(f("error", "G10"), "0.11", "advanced"), 1);
  assert.equal(gate(f("error", "G10"), "0.9", "advanced"), 0);
  assert.equal(gate(f("error", "U12"), "0.11", "universal"), 1);
  assert.equal(gate(f("error", "U12"), "0.9", "universal"), 0);
});

test("the toolkit's own gate is unchanged: Advanced 0/0 with zero downgraded findings (dogfood)", () => {
  const r = runGate(REPO_ROOT);
  assert.equal(r.exitCode, 0);
  assert.equal(r.errorCount, 0);
  assert.ok(!r.findings.some((x) => x.downgraded), "no finding is downgraded (toolkit pins current; every since <= 0.11)");
});

test("a real plugin tree pinned below a check's since passes with a warn, but gate-fails when re-pinned to current", () => {
  // Build a minimal valid universal plugin (clone of golden/minimal-skill) with ONE broken mermaid block,
  // so U12 (since 0.10, universal) is the sole gating defect. Done in a temp dir because U12 scans
  // tests/fixtures/** too, so a committed broken diagram would break the toolkit's own gate.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-std-"));
  try {
    cpSync(path.join(FIXTURES, "golden/minimal-skill"), dir, { recursive: true });
    // A structurally broken mermaid block: no recognized diagram keyword and unbalanced brackets.
    writeFileSync(path.join(dir, "diagram.md"), "# Diagram\n\n```mermaid\nnotadiagram [[[\n```\n");
    const libPath = path.join(dir, "library.json");
    const lib = JSON.parse(readFileSync(libPath, "utf8"));

    lib.standard = "0.9";
    writeFileSync(libPath, JSON.stringify(lib, null, 2));
    const old = runGate(dir);
    const u12 = old.findings.find((x) => x.reqId === "U12");
    assert.ok(u12, "U12 fires on the broken mermaid block");
    // The ceiling lowers the EFFECTIVE severity and leaves the emitted one alone, which is the
    // difference from the pre-pass it replaced: a check now emits its target severity always.
    assert.equal(u12.effectiveSeverity, "warn", "pinned 0.9: U12 is held at warn");
    assert.equal(u12.severity, "error", "the check still emitted its target severity");
    assert.equal(u12.downgraded, true);
    assert.equal(old.exitCode, 0, "pinned 0.9: the downgraded U12 does not gate");

    lib.standard = "0.11";
    writeFileSync(libPath, JSON.stringify(lib, null, 2));
    const cur = runGate(dir);
    const u12cur = cur.findings.find((x) => x.reqId === "U12");
    assert.equal(u12cur.effectiveSeverity, "error", "pinned 0.11: U12 gates as an error");
    assert.ok(!u12cur.downgraded);
    assert.equal(cur.exitCode, 1, "pinned 0.11: the same defect gate-fails");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
