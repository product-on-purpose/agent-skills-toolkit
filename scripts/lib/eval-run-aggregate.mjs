// what-it-is:   the record-and-aggregate half of the eval-run pipeline (backlog E11 / F2, R-PIPE-4)
// what-it-does: turns a day's run skeletons into correctly-shaped eval-runs.md rows (scope column included)
//               and widens the machine-maintained measured range in the public token dossier
// why:          recording was hand transcription, which drifts and silently loses runs; the tracked record and
//               the dossier are the durable surfaces, so writing them has to be part of the run, not after it
// used-by:      scripts/eval-run.mjs --aggregate; covered by tests/unit/eval-run-aggregate.test.mjs
import path from "node:path";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { EvalRunError, RUNS_DIR_REL, toPosix } from "./eval-run.mjs";

/** The tracked record this appends to, and the public dossier whose measured range it maintains. */
export const RECORD_REL = "docs/internal/eval-runs/eval-runs.md";
export const DOSSIER_REL = "docs/reference/token-usage-estimates.md";

/**
 * The record's row schema. It is the batch-2 shape (the record's fullest table) plus the Scope column the
 * folder README asks every run to carry, so cost can later be split per scope. Exported so a test asserts
 * the appended rows against the header rather than against a hand-copied string.
 */
export const ROW_HEADER = "| Id | Target (pinned) | Scope | Type | Model | Effort | Tokens (subagent) | Wall-clock | Tool uses | Gate verdict (deterministic) | Advisory result | Output |";
const ROW_DIVIDER = "| " + new Array(12).fill("---").join(" | ") + " |";

/**
 * The dossier's machine-maintained region. Only the two bold thousands figures inside it are rewritten, and
 * only ever WIDER: narrowing a measured range means retiring a recorded run, which is an editorial act a
 * human owns. Every other line of the dossier (including the MEASURED table's Notes prose) stays hand-written.
 */
export const RANGE_BEGIN = "<!-- askit:measured-advisory-range:begin -->";
export const RANGE_END = "<!-- askit:measured-advisory-range:end -->";

const PENDING = "(pending dispatch)";
const refuse = (message, code) => { throw new EvalRunError(message, code); };
const eolOf = (text) => (/\r\n/.test(text) ? "\r\n" : "\n");

/** Read every *-record.json in a day's runs dir, in runKey order. */
export function collectSkeletons(runsDir) {
  if (!existsSync(runsDir)) return [];
  return readdirSync(runsDir)
    .filter((n) => n.endsWith("-record.json"))
    .map((n) => {
      const file = path.join(runsDir, n);
      try {
        return { file, data: JSON.parse(readFileSync(file, "utf8")) };
      } catch (e) {
        refuse(`record skeleton is malformed JSON (${toPosix(file)}): ${e.message}`, "bad-skeleton");
      }
    })
    .sort((a, b) => String(a.data.runKey ?? a.file).localeCompare(String(b.data.runKey ?? b.file)));
}

const REQUIRED = [
  ["runKey", (d) => d.runKey],
  ["scope", (d) => d.scope],
  ["reportType", (d) => d.reportType],
  ["target.label", (d) => d.target?.label],
  ["gate.verdict", (d) => d.gate?.verdict],
  ["outputs.pointer", (d) => d.outputs?.pointer],
];

function assertShaped({ file, data }) {
  const missing = REQUIRED.filter(([, get]) => !get(data)).map(([name]) => name);
  if (missing.length) {
    refuse(`record skeleton ${toPosix(file)} is missing ${missing.join(", ")}; it was not written by the runner or was hand-edited`, "bad-skeleton");
  }
}

/** The next sequential run id, continuing from the highest one the record already carries. */
export function nextRunId(recordText) {
  const ids = [...String(recordText).matchAll(/\bR(\d+)\b/g)].map((m) => Number(m[1]));
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

// The BACKSLASH pass must come FIRST (CodeQL js/incomplete-sanitization, high; the same defect this
// release fixed in report-render.mjs escapeMd). Escaping the pipe alone is self-defeating: a skeleton
// field containing the two characters \| becomes \\| , which Markdown reads as ONE literal backslash
// followed by a BARE pipe, so the value walks out of its cell and adds a column to the tracked record.
// The advisory fields in a skeleton are model-authored, so this is reachable, not theoretical.
const escapeCell = (v) =>
  String(v).replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").trim();
const num = (n) => Number(n).toLocaleString("en-US");

/** One record row from one skeleton. Un-dispatched advisory fields read "(pending dispatch)", never 0. */
export function rowFor(data, runId) {
  const a = data.advisory ?? {};
  return "| " + [
    runId,
    escapeCell(data.target.label),
    escapeCell(data.scope),
    escapeCell(data.reportType),
    a.model ? escapeCell(a.model) : PENDING,
    a.effort ? escapeCell(a.effort) : PENDING,
    a.tokens == null ? PENDING : num(a.tokens),
    a.wallClockSeconds == null ? PENDING : `${num(a.wallClockSeconds)} s`,
    a.toolUses == null ? PENDING : num(a.toolUses),
    escapeCell(data.gate.verdict),
    a.result ? escapeCell(a.result) : PENDING,
    "`" + escapeCell(data.outputs.pointer) + "`",
  ].join(" | ") + " |";
}

/** The batch section: heading, provenance, the table, and the coverage bounds (R-PIPE-5). */
export function batchSection({ date, label, runs, bounds, toolkit }) {
  const ids = runs.map((r) => Number(String(r.runId).slice(1)));
  const span = ids.length === 1 ? `run ${ids[0]}` : `runs ${Math.min(...ids)}-${Math.max(...ids)}`;
  const toolkitNote = toolkit?.version ? ` Toolkit at v${toolkit.version}${toolkit.commit ? ` (\`${toolkit.commit}\`)` : ""}, Standard ${toolkit.standard ?? "?"}.` : "";
  const lines = [
    `## Batch ${date} (${span}): ${label}`,
    "",
    `**Context:** appended by the eval-run pipeline (\`node scripts/eval-run.mjs --aggregate ${date}\`). The deterministic ` +
      `columns are reproducible from the pinned corpus manifest ([corpus.json](corpus.json)); the advisory columns are filled ` +
      `by the dispatch pass ([dispatch-reviewer.md](dispatch-reviewer.md), [dispatch-grader.md](dispatch-grader.md)) and read ` +
      `"${PENDING}" until a model has actually run.${toolkitNote}`,
    "",
    ROW_HEADER,
    ROW_DIVIDER,
    ...runs.map((r) => r.row),
    "",
    `**Coverage bounds (what this batch did and did not cover):**`,
    "",
    ...bounds.map((b) => `- ${b}`),
  ];
  return lines.join("\n");
}

/**
 * Insert a batch section newest-first: immediately above the record's current newest batch heading. Spliced
 * rather than split-and-rejoined so every untouched byte (and the file's own line endings) survives verbatim,
 * keeping the diff to the inserted block.
 */
export function insertBatch(recordText, section) {
  const eol = eolOf(recordText);
  const block = section.split("\n").join(eol) + eol + eol;
  const at = /^## Batch /m.exec(recordText);
  if (!at) return recordText + (recordText.endsWith("\n") ? "" : eol) + eol + block;
  return recordText.slice(0, at.index) + block + recordText.slice(at.index);
}

/**
 * Widen the dossier's measured advisory range from this batch's recorded token totals. Monotone by design:
 * the range only grows, so a partial batch can never narrow a measured claim.
 */
export function widenRange(dossierText, tokens) {
  const b = dossierText.indexOf(RANGE_BEGIN);
  const e = dossierText.indexOf(RANGE_END);
  if (b === -1 || e === -1 || e < b) {
    refuse(`the dossier has no ${RANGE_BEGIN} ... ${RANGE_END} region to maintain; restore it or the measured range cannot be updated`, "no-range-region");
  }
  const region = dossierText.slice(b, e);
  const found = [...region.matchAll(/\*\*(\d+)k\*\*/g)];
  if (found.length !== 2) {
    refuse(`the ${RANGE_BEGIN} region must state exactly two bounds as **NNk** (found ${found.length}); the range cannot be updated safely`, "bad-range-region");
  }
  const from = { min: Number(found[0][1]), max: Number(found[1][1]) };
  if (tokens.length === 0) {
    return { text: dossierText, changed: false, from, to: from, reason: "no advisory tokens in this batch, so the measured range cannot move" };
  }
  const ks = tokens.map((t) => Math.round(t / 1000));
  const to = { min: Math.min(from.min, ...ks), max: Math.max(from.max, ...ks) };
  if (to.min === from.min && to.max === from.max) {
    return { text: dossierText, changed: false, from, to, reason: "this batch's measured tokens fall inside the recorded range" };
  }
  let seen = 0;
  const widened = region.replace(/\*\*(\d+)k\*\*/g, () => `**${seen++ === 0 ? to.min : to.max}k**`);
  return {
    text: dossierText.slice(0, b) + widened + dossierText.slice(e),
    changed: true,
    from,
    to,
    reason: `widened from this batch's measured tokens (${ks.map((k) => k + "k").join(", ")})`,
  };
}

/**
 * R-PIPE-4: aggregate a day's skeletons into the tracked record and the public dossier. Refuses loudly on a
 * day with no skeletons, a malformed skeleton, a batch already aggregated, or a dossier missing its managed
 * region - and computes both files fully before writing either, so a refusal never leaves a half-recorded batch.
 */
export function aggregate({ repoRoot, date, runsDir, recordPath, dossierPath, label, write = true }) {
  if (!date) refuse("--aggregate needs a date (YYYY-MM-DD or today)", "usage");
  const runs = runsDir ? path.resolve(runsDir) : path.join(repoRoot, RUNS_DIR_REL, date);
  const record = recordPath ? path.resolve(recordPath) : path.join(repoRoot, RECORD_REL);
  const dossier = dossierPath ? path.resolve(dossierPath) : path.join(repoRoot, DOSSIER_REL);

  const all = collectSkeletons(runs);
  if (all.length === 0) refuse(`no record skeleton found under ${toPosix(runs)}; run the pipeline for ${date} first`, "no-skeletons");
  for (const s of all) assertShaped(s);

  const already = all.filter((s) => s.data.runId);
  const pending = all.filter((s) => !s.data.runId);
  if (pending.length === 0) {
    refuse(
      `every skeleton under ${toPosix(runs)} is already aggregated (${already.map((s) => s.data.runId).join(", ")}); ` +
      `nothing to append. Delete or move the aggregated skeletons to re-record a batch deliberately.`,
      "already-aggregated"
    );
  }

  let next = nextRunId(readFileSync(record, "utf8"));
  const assigned = pending.map((s) => {
    const runId = `R${next++}`;
    return { runId, runKey: s.data.runKey, file: s.file, data: s.data, row: rowFor(s.data, runId) };
  });

  const bounds = [...new Set(assigned.flatMap((r) => (r.data.bounds ?? []).map((b) => b.stated ?? String(b))))];
  const section = batchSection({
    date,
    label: label ?? "eval-run pipeline batch",
    runs: assigned,
    bounds: bounds.length ? bounds : ["none applied: every requested target was graded in full by the deterministic gate."],
    toolkit: assigned[0].data.toolkit,
  });

  const recordText = readFileSync(record, "utf8");
  const nextRecordText = insertBatch(recordText, section);
  const tokens = assigned.map((r) => r.data.advisory?.tokens).filter((t) => typeof t === "number");
  const rangeResult = widenRange(readFileSync(dossier, "utf8"), tokens);

  if (write) {
    writeFileSync(record, nextRecordText, "utf8");
    if (rangeResult.changed) writeFileSync(dossier, rangeResult.text, "utf8");
    const stamp = new Date().toISOString();
    for (const r of assigned) {
      writeFileSync(r.file, JSON.stringify({ ...r.data, runId: r.runId, aggregatedAt: stamp }, null, 2) + "\n", "utf8");
    }
  }

  return {
    date,
    label: label ?? "eval-run pipeline batch",
    runsDir: toPosix(runs),
    recordPath: toPosix(record),
    dossierPath: toPosix(dossier),
    runs: assigned.map((r) => ({ runId: r.runId, runKey: r.runKey, row: r.row })),
    skipped: already.map((s) => ({ runId: s.data.runId, runKey: s.data.runKey })),
    bounds,
    section,
    dossier: { changed: rangeResult.changed, from: rangeResult.from, to: rangeResult.to, reason: rangeResult.reason },
    written: write,
  };
}

/** The human summary the CLI prints. */
export function formatAggregateSummary(s, { dryRun = false } = {}) {
  const lines = [
    `${dryRun ? "[dry run] would append" : "Appended"} ${s.runs.length} row(s) to ${s.recordPath} (batch ${s.date}: ${s.label})`,
    ...s.runs.map((r) => `  ${r.runId}  ${r.runKey}`),
    ...(s.skipped.length ? [`  skipped (already aggregated): ${s.skipped.map((r) => `${r.runId} ${r.runKey}`).join(", ")}`] : []),
  ];
  lines.push(
    s.dossier.changed
      ? `${dryRun ? "[dry run] would widen" : "Widened"} the dossier measured range ${s.dossier.from.min}k-${s.dossier.from.max}k -> ${s.dossier.to.min}k-${s.dossier.to.max}k (${s.dossierPath})`
      : `Dossier measured range unchanged at ${s.dossier.from.min}k-${s.dossier.from.max}k: ${s.dossier.reason}`
  );
  for (const b of s.bounds) lines.push(`[bound] ${b}`);
  return lines.join("\n");
}
