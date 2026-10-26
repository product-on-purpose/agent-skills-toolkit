// what-it-is:   the GitHub Action's outputs bridge
// what-it-does: reads the --json report scripts/check.mjs already produced (buildJsonReport's shape:
//               tierReport.tier, errorCount, warnCount, exitCode, advisoryLayer, advisoryFindings, plus
//               the full findings/config check.mjs already computes), VALIDATES that shape, and prints
//               GITHUB_OUTPUT-format "name=value" lines for the five outputs action.yml exposes: tier,
//               errors, warnings, operator-errors, advisory-count
// why:          Standard sec 4.1/4.4 (CI-agnostic runner, local/CI parity) requires CI configuration
//               to hold no validation logic of its own, only invoke a portable script; action.yml
//               states the same invariant applies to the published Action. This file is where the
//               decision of what becomes an output lives, so action.yml's own shell step is a pure
//               pipe with nothing left to decide - a straight field projection, no new computation.
//               Validation here is FAIL CLOSED, not decorative: a parseable-but-schema-incomplete
//               report - a JSON contract drift, or output truncated into a differently-shaped-but-
//               still-valid object - must never be read as tier=none/errors=0/warnings=0, because a
//               gate that reports success because it could not find the grade is the worst possible
//               failure mode for this project specifically (pre-release adversarial review, Finding 2).
// used-by:      action.yml (this repository's own published GitHub Action)
import { readFileSync } from "node:fs";

const VALID_TIERS = ["universal", "convergent", "advanced", "none"];

/**
 * Schema check for the ALREADY-COMPUTED buildJsonReport() object (scripts/check.mjs's --json shape).
 * Returns an array of human-readable problem strings, each naming the offending field; an empty array
 * means the report is trustworthy enough to project into outputs. Never substitutes a default for a
 * missing or wrongly-typed field - that is precisely the fail-open behavior this function replaces.
 */
export function validateReport(report) {
  if (report === null || typeof report !== "object" || Array.isArray(report)) {
    return ["report: expected a JSON object"];
  }

  const problems = [];
  const tier = report.tierReport?.tier;
  if (typeof tier !== "string" || !VALID_TIERS.includes(tier)) {
    problems.push(`tierReport.tier: expected one of ${VALID_TIERS.join(", ")}, got ${JSON.stringify(tier)}`);
  }
  if (!Number.isInteger(report.errorCount) || report.errorCount < 0) {
    problems.push(`errorCount: expected a non-negative integer, got ${JSON.stringify(report.errorCount)}`);
  }
  if (!Number.isInteger(report.warnCount) || report.warnCount < 0) {
    problems.push(`warnCount: expected a non-negative integer, got ${JSON.stringify(report.warnCount)}`);
  }
  // 2 joined this domain when a defect in the GRADER's own askit.config.json stopped being counted as
  // a conformance defect of the plugin (F-011, the grader config drags the tier down). check.mjs has
  // always returned 2 for an operator error - an unknown flag, an invalid --mode or --profile, a root
  // that is not a directory - but none of those reach this file, because the Action never gets as far
  // as writing a report for them. An unloadable rubric DOES: the gate grades, writes a full report, and
  // exits 2. Rejecting it here failed the Action's outputs step with "exitCode: expected 0 or 1, got 2",
  // which reads as a toolkit bug rather than as "your askit.config.json does not parse", and left tier,
  // errors, warnings and sarif-path unset for the rest of the job.
  if (![0, 1, 2].includes(report.exitCode)) {
    problems.push(`exitCode: expected 0, 1 or 2, got ${JSON.stringify(report.exitCode)}`);
  }
  // Validated, never defaulted, exactly like the other counts: this file's whole premise is that a
  // report it cannot fully read must not be projected into outputs at all. check.mjs has emitted this
  // field since the same change that introduced exit 2, and the Action runs check.mjs from its own
  // action_path, so there is no version skew for it to be absent across.
  if (!Number.isInteger(report.operatorErrorCount) || report.operatorErrorCount < 0) {
    problems.push(`operatorErrorCount: expected a non-negative integer, got ${JSON.stringify(report.operatorErrorCount)}`);
  }
  // ADR 0063 sec 1: "A missing advisoryLayer, or a value that disagrees with the array, is a
  // validation problem, because a field that silently dropped out of the report must never read as
  // zero." Fail-closed, exactly like every count above: a report missing advisoryLayer entirely (an
  // older toolkit version, or a JSON-contract drift) must never let advisory-count silently read "0"
  // or "" - either reading would claim the layer ran (or did not) when this file actually has no idea.
  const layer = report.advisoryLayer;
  if (layer !== "on" && layer !== "off") {
    problems.push(`advisoryLayer: expected "on" or "off", got ${JSON.stringify(layer)}`);
  } else if (layer === "off" && report.advisoryFindings !== null) {
    problems.push(`advisoryFindings: expected null when advisoryLayer is "off", got ${JSON.stringify(report.advisoryFindings)}`);
  } else if (layer === "on" && !Array.isArray(report.advisoryFindings)) {
    problems.push(`advisoryFindings: expected an array when advisoryLayer is "on", got ${JSON.stringify(report.advisoryFindings)}`);
  }
  return problems;
}

/**
 * Pure: takes the ALREADY-COMPUTED buildJsonReport() object and returns the four GITHUB_OUTPUT lines
 * the Action exposes as outputs. Throws when validateReport() finds any problem, naming every field
 * involved, rather than defaulting - see the file header for why a default here is not an option.
 */
export function toGithubOutputLines(report) {
  const problems = validateReport(report);
  if (problems.length > 0) {
    throw new Error(`gha-action-outputs: report failed schema validation:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  // `operator-errors` is a SEPARATE output rather than folded into `errors`, because the two answer
  // different questions and a workflow running with `fail-on-error: false` reads them. `errors` is what
  // is wrong with the plugin; `operator-errors` is what is wrong with the run. Folding them would put
  // back the very falsehood F-011 removed, in the one place a machine reads it.
  // ADR 0063 sec 1: "`"on"` projects the array's length, and a `0` then means 'ran and found
  // nothing'. `"off"` projects an empty output, not `0`." A consumer's workflow that reads
  // advisory-count as a number must be able to tell "nothing found" from "the layer did not run" -
  // collapsing "off" to "0" would erase exactly that distinction on the one surface a workflow author
  // is most likely to read without opening the JSON report at all.
  const advisoryCount = report.advisoryLayer === "on" ? String(report.advisoryFindings.length) : "";
  return [
    `tier=${report.tierReport.tier}`,
    `errors=${report.errorCount}`,
    `warnings=${report.warnCount}`,
    `operator-errors=${report.operatorErrorCount}`,
    `advisory-count=${advisoryCount}`,
  ];
}

function main() {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write("gha-action-outputs: usage: gha-action-outputs.mjs <path-to-check.mjs---json-output-file>\n");
    process.exitCode = 2;
    return;
  }
  let report;
  try {
    report = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    process.stderr.write(`gha-action-outputs: failed to read/parse ${file}: ${e.message}\n`);
    process.exitCode = 1;
    return;
  }
  let lines;
  try {
    lines = toGithubOutputLines(report);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(lines.join("\n") + "\n");
}

// Guarded like every other CLI entry point in this repo: main() runs only when invoked as a script,
// never on import, so tests can import toGithubOutputLines without spawning a real process.
if (process.argv[1]?.endsWith("gha-action-outputs.mjs")) {
  main();
}
