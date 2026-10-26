// what-it-is:   the GitHub Action's job-summary writer (F-033)
// what-it-does: reads the --json report scripts/check.mjs already produced (the same buildJsonReport
//               shape scripts/gha-action-outputs.mjs validates: tierReport.tier/blocked, errorCount,
//               warnCount, operatorErrorCount, exitCode, findings), VALIDATES that shape the same way,
//               and APPENDS a Markdown job summary to the file named by $GITHUB_STEP_SUMMARY: a headline
//               (tier plus the three counts), what blocks the next tier (tierReport.blocked, verbatim -
//               no new computation), and the top findings grouped by reqId, capped and naming how many
//               groups were omitted. Never truncates the summary file - other steps in the same job may
//               already have written to it, and GitHub's own job summary is itself an append-only
//               concatenation of every step that writes to this path.
// why:          action.yml's "Run the gate" step already writes $RUNNER_TEMP/askit-gate.json and the
//               GITHUB_OUTPUT lines, but a reviewer reading a pull request's Checks tab still has to open
//               a log to learn the tier or what blocks the next one. A job summary puts that on the page
//               the reviewer is already looking at, including on a FAILING run - action.yml's new
//               summary step therefore runs under `if: always()`. Standard sec 4.1/4.4 (CI configuration
//               holds no validation logic; it only invokes a portable script) applies here exactly as it
//               does to gha-action-outputs.mjs: this file is where the decision of what the summary says
//               lives, so action.yml's step is a one-line invocation.
// used-by:      action.yml (this repository's own published GitHub Action)
import { readFileSync, appendFileSync } from "node:fs";
import { validateReport as validateCoreReport } from "./gha-action-outputs.mjs";
import { isOperatorFinding } from "./lib/findings.mjs";
import { TIER_SCOPE_SENTENCE, LIMITATIONS_URL } from "./lib/tier-scope.mjs";

/** How many requirement groups the "top findings" section shows before it states an omission count. */
export const DEFAULT_MAX_FINDINGS = 20;

const cap = (s) => (typeof s === "string" && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Schema check for the ALREADY-COMPUTED buildJsonReport() object, the same fail-closed contract
 * scripts/gha-action-outputs.mjs applies - reused here rather than re-derived, so the two bridges
 * cannot drift apart on what counts as a trustworthy report - PLUS one field gha-action-outputs.mjs
 * never needed: `findings`, the array this file groups into the "top findings" section. Returns an
 * array of human-readable problem strings; empty means the report is safe to render.
 */
export function validateReport(report) {
  const problems = validateCoreReport(report);
  if (report !== null && typeof report === "object" && !Array.isArray(report)) {
    if (!Array.isArray(report.findings)) {
      problems.push(`findings: expected an array, got ${JSON.stringify(report.findings)}`);
    }
  }
  return problems;
}

/**
 * Groups the report's non-suppressed, non-operator findings by reqId, one group per requirement, each
 * carrying its member count, its highest-severity member's severity, and one sample message. Pure;
 * exported for unit testing. Sorted error-before-warn, then by descending count, then by reqId, so the
 * capped head of the list is always the most consequential slice rather than an arbitrary prefix.
 */
export function groupFindingsByReqId(findings) {
  const groups = new Map();
  for (const f of findings) {
    if (isOperatorFinding(f) || f.suppressed) continue;
    const severity = f.effectiveSeverity ?? f.severity;
    if (severity !== "error" && severity !== "warn") continue;
    const key = f.reqId ?? "(no reqId)";
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { reqId: key, severity, count: 1, sample: f.message });
    } else {
      existing.count += 1;
      if (severity === "error") existing.severity = "error";
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
    if (b.count !== a.count) return b.count - a.count;
    return a.reqId.localeCompare(b.reqId);
  });
}

/**
 * Pure: the ALREADY-COMPUTED buildJsonReport() object in, the Markdown job-summary body out. Throws
 * when validateReport() finds any problem, naming every field involved - the same fail-closed contract
 * as gha-action-outputs.mjs, for the same reason (file header, Finding 2 of the pre-release adversarial
 * review): a report this file cannot fully read must never render as a quiet, all-clear summary.
 */
export function renderStepSummary(report, { maxFindings = DEFAULT_MAX_FINDINGS } = {}) {
  const problems = validateReport(report);
  if (problems.length > 0) {
    throw new Error(`gha-step-summary: report failed schema validation:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  const { tierReport, errorCount, warnCount, operatorErrorCount, findings } = report;

  const lines = [];
  lines.push("## Agent Skills Toolkit Grader");
  lines.push("");
  lines.push(
    `**Tier: ${cap(tierReport.tier)}** - ${errorCount} error(s), ${warnCount} warning(s), ${operatorErrorCount} operator error(s)`
  );
  lines.push("");
  // Imported verbatim, never paraphrased - the same reason RS-E3 centralized this sentence into one
  // constant every tier-presenting surface inherits (scripts/lib/tier-scope.mjs's own header).
  lines.push(`> ${TIER_SCOPE_SENTENCE} [What a tier does not certify](${LIMITATIONS_URL})`);
  lines.push("");

  const blockedEntries = Object.entries(tierReport.blocked ?? {});
  if (blockedEntries.length === 0) {
    lines.push("No blockers reported for the next tier.");
  } else {
    const [nextTier, blockers] = blockedEntries[0];
    lines.push(`### Blocking ${cap(nextTier)}`);
    lines.push("");
    for (const b of blockers) lines.push(`- ${b}`);
  }
  lines.push("");

  const groups = groupFindingsByReqId(findings);
  if (groups.length === 0) {
    lines.push("No gating or warning findings.");
  } else {
    lines.push("### Top findings, by requirement");
    lines.push("");
    const shown = groups.slice(0, Math.max(0, maxFindings));
    for (const g of shown) {
      lines.push(`- **${g.reqId}** [${g.severity}] (${g.count} finding${g.count === 1 ? "" : "s"}) - ${g.sample}`);
    }
    const omitted = groups.length - shown.length;
    // No silent caps: a cap that drops rows without saying so reads as a complete list when it is not.
    if (omitted > 0) {
      lines.push("");
      lines.push(`_${omitted} further requirement${omitted === 1 ? "" : "s"} omitted; see the full gate output for the rest._`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

function main() {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write("gha-step-summary: usage: gha-step-summary.mjs <path-to-check.mjs---json-output-file> [max-findings]\n");
    process.exitCode = 2;
    return;
  }
  const maxFindingsArg = process.argv[3];
  const maxFindings = maxFindingsArg === undefined ? DEFAULT_MAX_FINDINGS : Number(maxFindingsArg);
  if (!Number.isInteger(maxFindings) || maxFindings < 1) {
    process.stderr.write(`gha-step-summary: max-findings must be a positive integer, got ${JSON.stringify(maxFindingsArg)}\n`);
    process.exitCode = 2;
    return;
  }

  let report;
  try {
    report = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    process.stderr.write(`gha-step-summary: failed to read/parse ${file}: ${e.message}\n`);
    process.exitCode = 1;
    return;
  }

  let markdown;
  try {
    markdown = renderStepSummary(report, { maxFindings });
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exitCode = 1;
    return;
  }

  // DECIDED AND DOCUMENTED: GITHUB_STEP_SUMMARY is unset outside a real job context (a local run, a
  // runner with job summaries disabled). The summary is additive presentation layered on top of the
  // gate's own outputs and annotations, never the grade itself, so its absence is reported to stderr
  // and skipped rather than failing the step - the same non-fatal posture gen-site-reports.mjs takes
  // for a report-publishing step that is not the verdict either.
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    process.stderr.write("gha-step-summary: GITHUB_STEP_SUMMARY is not set; no summary written (not a failure).\n");
    return;
  }

  // APPENDS, never truncates: other steps in the same job may already have written to this file, and
  // GitHub concatenates every step's write into one job summary page.
  appendFileSync(summaryPath, "\n" + markdown + "\n", "utf8");
}

// Guarded like every other CLI entry point in this repo: main() runs only when invoked as a script,
// never on import, so tests can import the pure functions without spawning a real process.
if (process.argv[1]?.endsWith("gha-step-summary.mjs")) {
  main();
}
