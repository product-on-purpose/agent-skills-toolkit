// what-it-is:   the GitHub Action's outputs bridge
// what-it-does: reads the --json report scripts/check.mjs already produced (buildJsonReport's shape:
//               tierReport.tier, errorCount, warnCount, plus the full findings/config check.mjs
//               already computes) and prints GITHUB_OUTPUT-format "name=value" lines for the three
//               outputs action.yml exposes: tier, errors, warnings
// why:          Standard sec 4.1/4.4 (CI-agnostic runner, local/CI parity) requires CI configuration
//               to hold no validation logic of its own, only invoke a portable script; action.yml
//               states the same invariant applies to the published Action. This file is where the
//               decision of what becomes an output lives, so action.yml's own shell step is a pure
//               pipe with nothing left to decide - a straight field projection, no new computation
// used-by:      action.yml (this repository's own published GitHub Action)
import { readFileSync } from "node:fs";

/**
 * Pure: takes the ALREADY-COMPUTED buildJsonReport() object (scripts/check.mjs's --json shape) and
 * returns the three GITHUB_OUTPUT lines the Action exposes as outputs. Defaults rather than throwing
 * on a missing tierReport, so a malformed-but-parseable upstream report still produces safe output
 * lines instead of crashing the Action mid-step.
 */
export function toGithubOutputLines(report) {
  const tier = report?.tierReport?.tier ?? "none";
  const errors = report?.errorCount ?? 0;
  const warnings = report?.warnCount ?? 0;
  return [`tier=${tier}`, `errors=${errors}`, `warnings=${warnings}`];
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
  process.stdout.write(toGithubOutputLines(report).join("\n") + "\n");
}

// Guarded like every other CLI entry point in this repo: main() runs only when invoked as a script,
// never on import, so tests can import toGithubOutputLines without spawning a real process.
if (process.argv[1]?.endsWith("gha-action-outputs.mjs")) {
  main();
}
