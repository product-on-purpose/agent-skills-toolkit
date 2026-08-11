// what-it-is:   the GitHub Action's SARIF artifact guard
// what-it-does: validates a completed SARIF document (scripts/lib/sarif-render.mjs's --sarif output)
//               before action.yml is allowed to publish sarif-path: structural shape (version,
//               runs[0].results) as its OWN signal, and exit-code agreement with the JSON gate report as
//               a SEPARATE signal. Removes the file on any rejection so a partial or disagreeing
//               artifact cannot survive for a later step or a consumer to pick up.
// why:          round 2 of the pre-release adversarial review (v1.11.0): the SARIF renderer's own exit
//               code is AMBIGUOUS at value 1 - it is both the expected code for a real failing grade
//               (valid SARIF written, runGate().exitCode=1) and the ordinary code for an uncaught
//               exception or a failed write (garbage or partial file, also exit 1). Comparing SARIF_EXIT
//               to GATE_EXIT alone cannot tell these apart when both happen to be 1 - that collision is
//               exactly what let a truncated file through. So operational success gets its OWN signal
//               here (structural content validity, independent of any exit code), and only once THAT is
//               proven does exit-code equality mean anything: check.mjs computes the identical
//               runGate().exitCode for both --json and --sarif from the same call, so comparing those two
//               numbers IS "like with like" - unlike comparing raw error/warning COUNTS, which this
//               module deliberately does NOT do. Verified against this repo's own silver-fixture
//               (declared tier "convergent"): its JSON errorCount is 0 (ceiling-filtered to the declared
//               tier) while its SARIF document legitimately carries 3 error-level results (G2/G4/G5,
//               above the declared ceiling but still real, non-off findings) - a count comparison would
//               have flagged that ordinary, correct run as a "disagreement". An invalid-but-present
//               artifact is worse than an absent one, because a downstream consumer trusts it - so this
//               fails closed and deletes the file rather than half-trusting it.
// used-by:      action.yml (this repository's own published GitHub Action)
import { readFileSync, existsSync, rmSync } from "node:fs";

/**
 * Pure: structural validity ONLY - never an exit code (see file header for why that is kept separate).
 * Returns an array of problem strings; empty means the document's SHAPE is real, i.e. serialization
 * actually completed. This alone cannot prove the CONTENT is the right grade - only that it is not
 * garbage, empty, or truncated.
 */
export function validateSarifShape(doc) {
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    return ["sarif: expected a JSON object"];
  }
  const problems = [];
  if (doc.version !== "2.1.0") {
    problems.push(`sarif.version: expected "2.1.0", got ${JSON.stringify(doc.version)}`);
  }
  const run = Array.isArray(doc.runs) ? doc.runs[0] : undefined;
  if (!run || typeof run !== "object") {
    problems.push("sarif.runs[0]: expected an object; the document is missing its run");
  } else if (!Array.isArray(run.results)) {
    problems.push("sarif.runs[0].results: expected an array");
  }
  return problems;
}

/**
 * Pure: the full decision - validateSarifShape() PLUS exit-code agreement between the two invocations of
 * the same deterministic gate (`check.mjs --sarif` and `check.mjs --json`, both computing the identical
 * runGate().exitCode). Returns an array of problem strings; empty means the artifact is trustworthy
 * enough to publish. Deliberately does NOT compare error/warning counts - see the file header for the
 * real false-positive that comparison would produce.
 */
export function validateSarifResult(doc, sarifExit, gateExit) {
  const problems = validateSarifShape(doc);
  if (String(sarifExit) !== String(gateExit)) {
    problems.push(`exit-code disagreement: check.mjs --sarif exited ${sarifExit}, check.mjs --json exited ${gateExit}, for the same input`);
  }
  return problems;
}

function main() {
  const [sarifFile, sarifExit, gateExit] = process.argv.slice(2);
  if (!sarifFile || sarifExit === undefined || gateExit === undefined) {
    process.stderr.write("gha-sarif-guard: usage: gha-sarif-guard.mjs <sarif-file> <sarif-exit-code> <gate-exit-code>\n");
    process.exitCode = 2;
    return;
  }

  let problems;
  try {
    const doc = JSON.parse(readFileSync(sarifFile, "utf8"));
    problems = validateSarifResult(doc, sarifExit, gateExit);
  } catch (e) {
    problems = [`sarif: failed to read/parse ${sarifFile}: ${e.message}`];
  }

  if (problems.length > 0) {
    process.stderr.write(`gha-sarif-guard: refusing to trust ${sarifFile}, removing it:\n${problems.map((p) => `  - ${p}`).join("\n")}\n`);
    if (existsSync(sarifFile)) rmSync(sarifFile, { force: true });
    process.exitCode = 1;
    return;
  }
}

// Guarded like every other CLI entry point in this repo: main() runs only when invoked as a script,
// never on import, so tests can import the pure functions without spawning a real process.
if (process.argv[1]?.endsWith("gha-sarif-guard.mjs")) {
  main();
}
