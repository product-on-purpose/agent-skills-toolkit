// what-it-is:   the GitHub Action's outputs bridge
// what-it-does: reads the --json report scripts/check.mjs already produced (buildJsonReport's shape:
//               tierReport.tier, errorCount, warnCount, exitCode, plus the full findings/config
//               check.mjs already computes), VALIDATES that shape, and prints GITHUB_OUTPUT-format
//               "name=value" lines for the three outputs action.yml exposes: tier, errors, warnings
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
  if (report.exitCode !== 0 && report.exitCode !== 1) {
    problems.push(`exitCode: expected 0 or 1, got ${JSON.stringify(report.exitCode)}`);
  }
  return problems;
}

/**
 * Pure: takes the ALREADY-COMPUTED buildJsonReport() object and returns the three GITHUB_OUTPUT lines
 * the Action exposes as outputs. Throws when validateReport() finds any problem, naming every field
 * involved, rather than defaulting - see the file header for why a default here is not an option.
 */
export function toGithubOutputLines(report) {
  const problems = validateReport(report);
  if (problems.length > 0) {
    throw new Error(`gha-action-outputs: report failed schema validation:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  return [`tier=${report.tierReport.tier}`, `errors=${report.errorCount}`, `warnings=${report.warnCount}`];
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
