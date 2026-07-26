import { test } from "node:test";
import assert from "node:assert/strict";
import { sectionFindings, standardDebtLine, format } from "../../scripts/check.mjs";

// Proves the two gate-display calibrations from the 2026-07-19 portfolio audit (PSR-6, PSR-7; ADR 0036).
// Both are presentation-only: they change what the gate PRINTS, never which findings exist, what
// severity they carry, or what the process exits with.
//
// PSR-7: three independent assessors misread the gate in one day because above-declared-tier findings
// print as an undifferentiated `[error]` stream ahead of a "0 error(s)" summary. Those lines cannot
// affect the grade (gateExitFromFindings filters by the declared-tier ceiling), so they must be
// visually separated from the ones that can.
// PSR-6: a plugin pinned to an old Standard prints "Tier: Advanced (no blockers detected)" with exit 0
// while carrying a large body of post-pin findings that turn into gate-failing errors the moment it
// re-pins. Nothing distinguished "clean" from "clean at an old pin with 122 findings of latent debt".

const err = (reqId, extra = {}) => ({ check: "c", severity: "error", message: `m-${reqId}`, file: "f.md", reqId, ...extra });

test("sectionFindings splits grade-relevant from above-tier by the declared-tier ceiling", () => {
  const findings = [err("U6"), err("S1"), err("G9")];
  const { grading, aboveTier } = sectionFindings(findings, "universal");
  assert.deepEqual(grading.map((f) => f.reqId), ["U6"], "only universal findings can block a universal-declared plugin");
  assert.deepEqual(aboveTier.map((f) => f.reqId), ["S1", "G9"]);
});

test("sectionFindings treats every finding as grade-relevant when no tier is declared", () => {
  const { grading, aboveTier } = sectionFindings([err("U6"), err("G9")], undefined);
  assert.equal(grading.length, 2, "no declared tier means no ceiling, matching gateExitFromFindings");
  assert.equal(aboveTier.length, 0);
});

test("sectionFindings drops suppressed and off findings from both sections", () => {
  const findings = [err("U6", { suppressed: true }), err("G9", { effectiveSeverity: "off" }), err("U1")];
  const { grading, aboveTier } = sectionFindings(findings, "universal");
  assert.deepEqual(grading.map((f) => f.reqId), ["U1"]);
  assert.equal(aboveTier.length, 0);
});

test("sectionFindings sections warnings by tier too, not only errors", () => {
  const { grading, aboveTier } = sectionFindings([{ ...err("G7"), severity: "warn" }], "universal");
  assert.equal(grading.length, 0);
  assert.equal(aboveTier.length, 1, "an above-tier warning is equally unable to affect the grade");
});

test("standardDebtLine is empty when nothing was held back by a pin", () => {
  assert.equal(standardDebtLine([err("U6"), { ...err("S1"), severity: "warn" }]), "");
});

test("standardDebtLine reports the count, the pin, and the Standard the debt comes due at", () => {
  const findings = [
    { ...err("U12"), severity: "warn", downgraded: true, since: "0.10", pinned: "0.8" },
    { ...err("U13"), severity: "warn", downgraded: true, since: "0.12", pinned: "0.8" },
    { ...err("G7"), severity: "warn", downgraded: true, since: "0.9", pinned: "0.8" },
  ];
  const line = standardDebtLine(findings);
  assert.match(line, /3 finding/, "the count of held-back findings");
  assert.match(line, /0\.8/, "the pin they are held back by");
  assert.match(line, /0\.12/, "the Standard at which all of them become gate-failing");
});

test("standardDebtLine compares Standard minors numerically, so 0.10 outranks 0.9", () => {
  const findings = [
    { ...err("U12"), severity: "warn", downgraded: true, since: "0.9", pinned: "0.8" },
    { ...err("U13"), severity: "warn", downgraded: true, since: "0.10", pinned: "0.8" },
  ];
  assert.match(standardDebtLine(findings), /0\.10/, "0.10 > 0.9 numerically, the trap a string compare fails");
});

test("format labels the above-tier section so it cannot be read as blocking (PSR-7)", () => {
  const out = format([err("U6"), err("G9")], "universal");
  assert.match(out, /m-U6/);
  assert.match(out, /m-G9/);
  const header = out.split("\n").find((l) => /above/i.test(l) && /tier/i.test(l));
  assert.ok(header, "an above-tier section header must be present");
  assert.match(header, /informational|does not|cannot/i, "the header must say the section cannot affect the grade");
  assert.ok(out.indexOf("m-U6") < out.indexOf(header), "grade-relevant findings print before the above-tier section");
});

test("format emits no above-tier header when every finding is grade-relevant", () => {
  const out = format([err("U6")], "universal");
  assert.ok(!/above/i.test(out), "no empty section header on the common case");
});

test("format still prints every finding it printed before the sectioning (no finding is hidden)", () => {
  const findings = [err("U6"), err("S1"), err("G9")];
  const out = format(findings, "universal");
  for (const f of findings) assert.match(out, new RegExp(f.message), `${f.reqId} must still appear`);
});
