import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSarif } from "../../scripts/lib/sarif-render.mjs";
import { runGate } from "../../scripts/check.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";

// Proves scripts/lib/sarif-render.mjs: a pure SARIF 2.1.0 serialization of what runGate() already
// computes (no new severity, no new verdict - the governing constraint of E9). Hand-rolled structural
// assertions against the SARIF 2.1.0 schema shape (no schema-validation dependency added; see the
// module docblock for the shape verified against docs.oasis-open.org and the oasis-tcs/sarif-spec
// JSON schema).

// A small self-contained plugin, built fresh per test so it is never committed (the mermaid-valid.test.mjs
// precedent). It is deliberately rich enough to exercise every SARIF-shape decision at once: an objective
// error with a known line (U12 mermaid), an objective error with NO line that is then suppressed (U6), and
// a house-provenance warning (U5).
function buildFixture(dir) {
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({
    name: "sarif-fixture", version: "0.1.0",
    description: "temp fixture proving the SARIF renderer's shape decisions end to end.",
    standard: "0.12", tier: "universal",
  }, null, 2));
  writeFileSync(path.join(dir, "AGENTS.md"), "# AGENTS.md\ntemp SARIF fixture.\n");
  mkdirSync(path.join(dir, "skills", "widget"), { recursive: true });
  writeFileSync(path.join(dir, "skills", "widget", "SKILL.md"), [
    "---",
    "name: widget",
    "description: Helps with stuff.",
    "---",
    "# widget",
    "",
    "See [missing](./missing.md) for detail.",
    "",
    "```mermaid",
    "notadiagram",
    "  A --> B",
    "```",
    "",
  ].join("\n"));
  writeFileSync(path.join(dir, "askit.config.json"), JSON.stringify({
    suppressions: [{ reqId: "U6", file: "skills/widget/SKILL.md", reason: "sarif fixture: proving a suppressed finding is not dropped" }],
  }, null, 2));
}

function inFixture(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "sarif-render-"));
  try {
    buildFixture(dir);
    const ctx = loadPlugin(dir);
    const r = runGate(dir, ctx);
    return fn({ dir, ctx, r });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the fixture actually exercises what this test file needs: a suppressed U6, a lined U12, a warn U5", () => {
  inFixture(({ r }) => {
    const u6 = r.findings.find((f) => f.reqId === "U6");
    const u12 = r.findings.find((f) => f.reqId === "U12");
    const u5 = r.findings.find((f) => f.reqId === "U5");
    assert.ok(u6?.suppressed, "U6 must be suppressed by the fixture's askit.config.json");
    assert.equal(u6.effectiveSeverity, "error", "suppression must not change the underlying severity");
    assert.equal(u12?.line, 10, "the mermaid finding must carry the exact line the check computed");
    assert.equal(u5?.effectiveSeverity, "warn");
  });
});

test("renderSarif produces version 2.1.0 with a schema URI and exactly one run", () => {
  inFixture(({ ctx, r }) => {
    const doc = renderSarif(ctx, r);
    assert.equal(doc.version, "2.1.0");
    assert.equal(typeof doc.$schema, "string");
    assert.match(doc.$schema, /^https:\/\//);
    assert.ok(Array.isArray(doc.runs) && doc.runs.length === 1);
  });
});

test("renderSarif self-describes the tool and the Standard version", () => {
  inFixture(({ ctx, r }) => {
    const doc = renderSarif(ctx, r);
    const driver = doc.runs[0].tool.driver;
    assert.equal(driver.name, "agent-skills-toolkit");
    assert.equal(typeof driver.version, "string");
    assert.ok(driver.version.length > 0, "tool version must be a real, non-empty string");
    assert.equal(doc.runs[0].properties.standard, "0.12", "the SUBJECT's pinned Standard, not the toolkit's own");
  });
});

test("renderSarif's rule catalog covers every registered check, deduplicated by reqId, each carrying its provenance", () => {
  inFixture(({ ctx, r }) => {
    const rules = renderSarif(ctx, r).runs[0].tool.driver.rules;
    const ids = rules.map((rule) => rule.id);
    assert.equal(new Set(ids).size, ids.length, "rule ids must be deduplicated");
    for (const m of CHECKS) {
      const rule = rules.find((rr) => rr.id === m.meta.reqId);
      assert.ok(rule, `expected a reportingDescriptor for ${m.meta.reqId}`);
      assert.equal(rule.properties.provenance, m.meta.provenance, `${m.meta.reqId} rule must carry the check's real provenance`);
      assert.match(rule.properties.provenance, /^(objective|vendor-cited|house)$/);
    }
  });
});

test("renderSarif maps effectiveSeverity to level: error -> error, warn -> warning", () => {
  inFixture(({ ctx, r }) => {
    const results = renderSarif(ctx, r).runs[0].results;
    const u12 = results.find((res) => res.ruleId === "U12");
    const u5 = results.find((res) => res.ruleId === "U5");
    assert.equal(u12.level, "error");
    assert.equal(u5.level, "warning");
    for (const res of results) assert.match(res.level, /^(error|warning)$/, "no other level may appear");
  });
});

test("renderSarif emits a region.startLine only when the finding carries a line (U12), and a file-level location otherwise (U5)", () => {
  inFixture(({ ctx, r }) => {
    const results = renderSarif(ctx, r).runs[0].results;
    const u12 = results.find((res) => res.ruleId === "U12");
    const loc = u12.locations[0].physicalLocation;
    assert.match(loc.artifactLocation.uri, /skills\/widget\/SKILL\.md$/);
    assert.equal(loc.region.startLine, 10);

    const u5 = results.find((res) => res.ruleId === "U5");
    const u5loc = u5.locations[0].physicalLocation;
    assert.ok(u5loc.artifactLocation.uri, "a file-level location must still be present");
    assert.equal(u5loc.region, undefined, "must NEVER invent a line (e.g. startLine:1) for a finding with none");
  });
});

test("renderSarif never fabricates a line: no result anywhere has region without the source finding carrying one", () => {
  inFixture(({ ctx, r }) => {
    const results = renderSarif(ctx, r).runs[0].results;
    for (const res of results) {
      const region = res.locations?.[0]?.physicalLocation?.region;
      if (region === undefined) continue;
      const src = r.findings.find((f) => (f.reqId ?? f.check) === res.ruleId && f.message === res.message.text);
      assert.equal(region.startLine, src?.line, "a result's region must equal the SOURCE finding's own line, never an invented one");
    }
  });
});

// SARIF 2.1.0 suppressions (verified against docs.oasis-open.org / oasis-tcs/sarif-spec's JSON schema):
// result.suppressions is an array of { kind: "inSource"|"external", status?, justification? }. askit's
// suppression comes from askit.config.json, an EXTERNAL mechanism (not an inline source comment), so
// kind is "external"; it is a deliberately configured baseline, so status is "accepted" (the schema's
// own default for an unreviewed suppression, and the honest read of a maintainer-authored waiver).
test("a suppressed finding (U6) is NOT dropped: it appears as a result with a suppressions entry, honest about what was silenced", () => {
  inFixture(({ ctx, r }) => {
    const results = renderSarif(ctx, r).runs[0].results;
    const u6 = results.find((res) => res.ruleId === "U6");
    assert.ok(u6, "a suppressed finding must still produce a SARIF result, not be dropped");
    assert.equal(u6.level, "error", "suppression must not change what level the finding WOULD be");
    assert.ok(Array.isArray(u6.suppressions) && u6.suppressions.length === 1);
    assert.equal(u6.suppressions[0].kind, "external");
    assert.equal(u6.suppressions[0].status, "accepted");
    assert.match(u6.suppressions[0].justification, /proving a suppressed finding is not dropped/);
  });
});

test("a non-suppressed result carries no suppressions property", () => {
  inFixture(({ ctx, r }) => {
    const results = renderSarif(ctx, r).runs[0].results;
    const u12 = results.find((res) => res.ruleId === "U12");
    assert.equal(u12.suppressions, undefined);
  });
});

test("an 'off' finding (severity disabled by config/profile) produces NO SARIF result at all", () => {
  inFixture(({ dir, ctx }) => {
    const rOff = runGate(dir, ctx, { profile: "plain-plugin" }); // plain-plugin turns U5 (house) off
    const u5Finding = rOff.findings.find((f) => f.reqId === "U5");
    assert.equal(u5Finding.effectiveSeverity, "off", "the fixture must actually exercise an off finding");
    const results = renderSarif(ctx, rOff).runs[0].results;
    assert.ok(!results.some((res) => res.ruleId === "U5"), "an off finding has nothing to report and must not appear");
  });
});

test("every result.ruleId resolves to a declared rule, and the document round-trips through JSON", () => {
  inFixture(({ ctx, r }) => {
    const doc = renderSarif(ctx, r);
    const ruleIds = new Set(doc.runs[0].tool.driver.rules.map((rule) => rule.id));
    for (const res of doc.runs[0].results) assert.ok(ruleIds.has(res.ruleId), `result ruleId ${res.ruleId} must have a matching rule`);
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(doc)));
  });
});

test("renderSarif is a pure projection: it mutates neither ctx nor r", () => {
  inFixture(({ ctx, r }) => {
    const before = JSON.stringify(r.findings);
    renderSarif(ctx, r);
    assert.equal(JSON.stringify(r.findings), before, "findings must be unchanged after rendering SARIF");
  });
});
