import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import {
  aggregate, collectSkeletons, nextRunId, ROW_HEADER, RANGE_BEGIN, RANGE_END, RECORD_REL, DOSSIER_REL,
} from "../../scripts/lib/eval-run-aggregate.mjs";
import { EvalRunError } from "../../scripts/lib/eval-run.mjs";

// F2 (E11) R-PIPE-4: recording is automation, not hand transcription. The aggregator turns a day's record
// skeletons into correctly-shaped eval-runs.md rows (the existing schema, scope column included) and widens
// the measured range in the public token dossier. Everything here runs against FIXTURE copies of the record
// and the dossier; the last test is the drift guard that the REAL files still carry the anchors it needs.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const FIXTURE_RECORD = `# Evaluation-run record

> One row per model-assisted evaluation run. Newest batch first.

## Batch 2026-06-11 (runs 10-11): the same-target model triple completed

| Id | Model | Effort | Tokens (subagent) | Wall-clock | Tool uses | Advisory result | Output |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R10 | Sonnet 4.6 | high | 71,796 | 321 s | 46 | 13 findings | \`_local/audit/eval-runs/2026-06-11/r10-*\` |
| R11 | Haiku 4.5 | high | 63,646 | 108 s | 44 | 1 finding | \`_local/audit/eval-runs/2026-06-11/r11-*\` |
`;

const FIXTURE_DOSSIER = `# Token usage

## Measured data points

| What | Model | Effort | Tokens | Notes |
| --- | --- | --- | --- | --- |
| Gate, one plugin | n/a | n/a | **0** | deterministic |

${RANGE_BEGIN}
**Measured advisory range:** one advisory run has landed between **33k** and **103k** total tokens across the recorded batches.
${RANGE_END}

## How to estimate your run
`;

function skeleton(over = {}) {
  return {
    schema: "askit-eval-run-skeleton/1",
    runKey: "deanpeters-pm-142530",
    runId: null,
    date: "2026-07-26",
    scope: "plugin",
    reportType: "review",
    profile: "plain-plugin",
    target: {
      id: "deanpeters-pm",
      repo: "https://github.com/deanpeters/Product-Manager-Skills",
      sha: "70fb6c4e41637047e7e4976d39145b1a78397464",
      shortSha: "70fb6c4",
      label: "`deanpeters/Product-Manager-Skills` @ `70fb6c4`",
      subpath: null,
      skillsOnDisk: 49,
    },
    gate: { errors: 11, warns: 12, exitCode: 1, tier: "none", verdict: "11E / 12W, Tier none (plain-plugin)" },
    advisory: { model: null, effort: null, tokens: null, wallClockSeconds: null, toolUses: null, result: null },
    outputs: { pointer: "_local/audit/eval-runs/2026-07-26/deanpeters-pm-142530-*" },
    bounds: [{ kind: "target-limit", stated: "coverage bound: graded 2 of 4 requested targets (--limit 2). Dropped: lenny-skills, phuryn-pm." }],
    toolkit: { version: "1.6.1", standard: "0.12", commit: "7015a9b" },
    seamCommands: ["npm run check --silent -- \"E:/tmp/eval-deanpeters-pm\" --profile plain-plugin"],
    ...over,
  };
}

/** A temp workspace holding a runs dir with the given skeletons plus fixture record and dossier copies. */
function makeWorkspace(skeletons) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-aggregate-"));
  const runsDir = path.join(dir, "runs", "2026-07-26");
  mkdirSync(runsDir, { recursive: true });
  for (const sk of skeletons) {
    writeFileSync(path.join(runsDir, `${sk.runKey}-record.json`), JSON.stringify(sk, null, 2), "utf8");
  }
  const recordPath = path.join(dir, "eval-runs.md");
  const dossierPath = path.join(dir, "token-usage-estimates.md");
  writeFileSync(recordPath, FIXTURE_RECORD, "utf8");
  writeFileSync(dossierPath, FIXTURE_DOSSIER, "utf8");
  return { dir, runsDir, recordPath, dossierPath };
}

const cells = (row) => row.split("|").slice(1, -1).map((c) => c.trim());

// --- R-PIPE-4: two skeletons become two correctly-shaped rows in a fixture record ---

test("aggregate appends one correctly-shaped row per skeleton, newest batch first", () => {
  const ws = makeWorkspace([
    skeleton(),
    skeleton({
      runKey: "phuryn-pm-pm-toolkit-143000",
      scope: "plugin",
      target: { ...skeleton().target, id: "phuryn-pm", label: "`phuryn/pm-skills` `pm-toolkit` @ `d384f0c`", subpath: "pm-toolkit", skillsOnDisk: 4 },
      gate: { errors: 0, warns: 0, exitCode: 0, tier: "convergent", verdict: "0E / 0W, Tier convergent (plain-plugin)" },
      advisory: { model: "Sonnet 4.6", effort: "high", tokens: 120400, wallClockSeconds: 240, toolUses: 51, result: "6 findings (1 major)" },
      outputs: { pointer: "_local/audit/eval-runs/2026-07-26/phuryn-pm-pm-toolkit-143000-*" },
      bounds: [],
    }),
  ]);
  try {
    const summary = aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath, label: "pipeline smoke batch" });
    assert.equal(summary.runs.length, 2, "both skeletons were aggregated");
    assert.deepEqual(summary.runs.map((r) => r.runId), ["R12", "R13"], "ids continue from the record's highest");

    const text = readFileSync(ws.recordPath, "utf8");
    const newIdx = text.indexOf("## Batch 2026-07-26");
    const oldIdx = text.indexOf("## Batch 2026-06-11");
    assert.ok(newIdx > 0, "the new batch section was inserted");
    assert.ok(newIdx < oldIdx, "newest batch first: the new section precedes the existing one");
    assert.match(text, /## Batch 2026-07-26 \(runs 12-13\): pipeline smoke batch/);
    assert.ok(text.includes(ROW_HEADER), "the appended table carries the row header");

    const rows = text.split(/\r?\n/).filter((l) => /^\| R1[23] \|/.test(l));
    assert.equal(rows.length, 2, "exactly two rows appended");
    const header = cells(ROW_HEADER);
    assert.ok(header.includes("Scope"), "the schema carries the scope column");
    for (const row of rows) {
      assert.equal(cells(row).length, header.length, `row cell count matches the header: ${row}`);
    }
    const r12 = cells(rows[0]);
    assert.equal(r12[header.indexOf("Id")], "R12");
    assert.equal(r12[header.indexOf("Scope")], "plugin");
    assert.equal(r12[header.indexOf("Type")], "review");
    assert.match(r12[header.indexOf("Target (pinned)")], /deanpeters\/Product-Manager-Skills.*70fb6c4/);
    assert.match(r12[header.indexOf("Gate verdict (deterministic)")], /11E \/ 12W/);
    assert.match(r12[header.indexOf("Output")], /_local\/audit\/eval-runs\/2026-07-26\/deanpeters-pm-142530-\*/);
    assert.match(r12[header.indexOf("Tokens (subagent)")], /pending/i, "an un-dispatched advisory reads as pending, never as zero");

    const r13 = cells(rows[1]);
    assert.equal(r13[header.indexOf("Model")], "Sonnet 4.6");
    assert.equal(r13[header.indexOf("Tokens (subagent)")], "120,400");
    assert.equal(r13[header.indexOf("Wall-clock")], "240 s");
    assert.equal(r13[header.indexOf("Tool uses")], "51");

    // R-PIPE-5: the bound the run applied travels into the tracked record.
    assert.match(text, /Coverage bounds[\s\S]*graded 2 of 4 requested targets/);
    // provenance: a reader can tell the row was machine-appended and reproduce the run
    assert.match(text, /scripts\/eval-run\.mjs/);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

// --- R-PIPE-4: the dossier's measured range widens from the aggregated tokens ---

test("aggregate widens the dossier measured range and leaves it alone when nothing is wider", () => {
  const ws = makeWorkspace([skeleton({ advisory: { ...skeleton().advisory, tokens: 120400 } })]);
  try {
    const summary = aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath });
    assert.equal(summary.dossier.changed, true);
    assert.deepEqual(summary.dossier.from, { min: 33, max: 103 });
    assert.deepEqual(summary.dossier.to, { min: 33, max: 120 });
    const text = readFileSync(ws.dossierPath, "utf8");
    assert.match(text, /between \*\*33k\*\* and \*\*120k\*\*/);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("aggregate leaves the dossier untouched when no aggregated run carries advisory tokens", () => {
  const ws = makeWorkspace([skeleton()]);
  try {
    const summary = aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath });
    assert.equal(summary.dossier.changed, false);
    assert.match(summary.dossier.reason, /no advisory tokens/i);
    assert.equal(readFileSync(ws.dossierPath, "utf8"), FIXTURE_DOSSIER, "an un-dispatched batch cannot move a measured range");
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

// --- no double-append: an aggregated skeleton carries its assigned id and is skipped next time ---

test("aggregate stamps the run id back onto the skeleton and refuses to append it twice", () => {
  const ws = makeWorkspace([skeleton()]);
  try {
    aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath });
    const stamped = JSON.parse(readFileSync(path.join(ws.runsDir, "deanpeters-pm-142530-record.json"), "utf8"));
    assert.equal(stamped.runId, "R12", "the skeleton records the id it was given");
    assert.ok(stamped.aggregatedAt, "and when it was aggregated");

    assert.throws(
      () => aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath }),
      (e) => {
        assert.ok(e instanceof EvalRunError);
        assert.match(e.message, /already aggregated/i);
        return true;
      }
    );
    const rows = readFileSync(ws.recordPath, "utf8").split(/\r?\n/).filter((l) => /^\| R12 \|/.test(l));
    assert.equal(rows.length, 1, "the row was not duplicated");
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("aggregate --dry-run reports the rows without writing either file", () => {
  const ws = makeWorkspace([skeleton({ advisory: { ...skeleton().advisory, tokens: 120400 } })]);
  try {
    const summary = aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath, write: false });
    assert.equal(summary.runs.length, 1);
    assert.equal(readFileSync(ws.recordPath, "utf8"), FIXTURE_RECORD);
    assert.equal(readFileSync(ws.dossierPath, "utf8"), FIXTURE_DOSSIER);
    assert.equal(JSON.parse(readFileSync(path.join(ws.runsDir, "deanpeters-pm-142530-record.json"), "utf8")).runId, null);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

// --- loud refusals ---

test("aggregate refuses a date with no record skeletons", () => {
  const ws = makeWorkspace([]);
  try {
    assert.throws(
      () => aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath }),
      /REFUSED[\s\S]*no record skeleton/i
    );
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("aggregate refuses a dossier with no managed range region", () => {
  const ws = makeWorkspace([skeleton({ advisory: { ...skeleton().advisory, tokens: 120400 } })]);
  try {
    writeFileSync(ws.dossierPath, "# Token usage\n\nno managed region here\n", "utf8");
    assert.throws(
      () => aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath }),
      /REFUSED[\s\S]*measured-advisory-range/
    );
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

test("aggregate refuses a malformed skeleton instead of writing a half-shaped row", () => {
  const ws = makeWorkspace([]);
  try {
    writeFileSync(path.join(ws.runsDir, "broken-record.json"), JSON.stringify({ schema: "askit-eval-run-skeleton/1" }), "utf8");
    assert.throws(
      () => aggregate({ repoRoot: ROOT, date: "2026-07-26", runsDir: ws.runsDir, recordPath: ws.recordPath, dossierPath: ws.dossierPath }),
      /REFUSED[\s\S]*(missing|malformed)/i
    );
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

// --- helpers ---

test("nextRunId continues from the record's highest recorded id", () => {
  assert.equal(nextRunId(FIXTURE_RECORD), 12);
  assert.equal(nextRunId("no runs yet"), 1);
  assert.equal(nextRunId("| R9 (prior batch) | ... |\n| R11 | ... |"), 12);
});

test("collectSkeletons returns the day's skeletons in runKey order", () => {
  const ws = makeWorkspace([skeleton({ runKey: "b-2" }), skeleton({ runKey: "a-1" })]);
  try {
    assert.deepEqual(collectSkeletons(ws.runsDir).map((s) => s.data.runKey), ["a-1", "b-2"]);
  } finally {
    rmSync(ws.dir, { recursive: true, force: true });
  }
});

// --- the drift guard: the REAL record and dossier still carry the anchors the aggregator writes against ---

test("the tracked record and the public dossier carry the aggregator's anchors", () => {
  const record = readFileSync(path.join(ROOT, RECORD_REL), "utf8");
  assert.match(record, /^## Batch /m, "the record has a batch heading to insert the newest batch above");
  const dossier = readFileSync(path.join(ROOT, DOSSIER_REL), "utf8");
  assert.ok(dossier.includes(RANGE_BEGIN), `${DOSSIER_REL} must keep the ${RANGE_BEGIN} marker`);
  assert.ok(dossier.includes(RANGE_END), `${DOSSIER_REL} must keep the ${RANGE_END} marker`);
  const region = dossier.slice(dossier.indexOf(RANGE_BEGIN), dossier.indexOf(RANGE_END));
  assert.equal([...region.matchAll(/\*\*(\d+)k\*\*/g)].length, 2, "the managed region states exactly two bounds (min and max)");
});
