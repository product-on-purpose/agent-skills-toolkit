#!/usr/bin/env node
// what-it-is:   the dependency-audit gate CLI (#310)
// what-it-does: runs `npm audit --json`, classifies what came back, and exits 0 clean / 1 a blocking
//               advisory / 2 the registry could not be read; `--report <file>` classifies a captured
//               report instead, with no network at all
// why:          `ci.yml` ran a bare `npm audit --audit-level=high` as a plain step, which failed three
//               times on 2026-09-03 during an npm incident. Because it was a plain step in a sequence,
//               every step AFTER it was skipped - the unit tests, the coverage report and the
//               conformance gate never ran - while `validate` is a required check on `main`. So a
//               required check went red on a run that never graded this repository, for a fact about
//               somebody else's uptime. Standard sec 4.1/4.4 puts that decision in a portable script
//               rather than in YAML, and ADR 0053 is the precedent for the exit-code split it makes.
// used-by:      .github/workflows/ci.yml (`Audit dependencies`); covered by tests/unit/audit-deps.test.mjs
//
// WRITE-INCAPABLE, like `vendor-watch` and `action-pin-watch`: it reads, it reports, it exits. Deciding
// whether to upgrade a dependency is a maintainer's call and nothing here makes it.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { classifyAudit, formatVerdict, DEFAULT_LEVEL, SEVERITY_ORDER } from "./lib/audit-report.mjs";

/** A hung registry call must not hold a job open until the runner's own timeout kills it. */
export const AUDIT_TIMEOUT_MS = 120_000;

const USAGE = `Usage: node scripts/audit-deps.mjs [options]

  --level <severity>   block at this severity or above (default: ${DEFAULT_LEVEL})
                       one of: ${SEVERITY_ORDER.join(", ")}
  --report <file>      classify a captured \`npm audit --json\` report instead of running npm.
                       Reads no network, so an outage is reproducible offline.
  --json               print the verdict as JSON as well as the human line
  -h, --help           this message

Exit codes:
  0  clean - no advisory at or above the threshold
  1  BLOCKING - a real advisory at or above the threshold. A defect in this repository's tree.
  2  REFUSED - the audit could not be performed (registry down, endpoint error, npm would not run).
     Not a fact about this repository, and treated as a reported non-blocking condition by ci.yml,
     the same posture vendor-watch and action-pin-watch exit 2 already carry (ADR 0053).`;

export function parseArgs(argv) {
  const opts = { level: DEFAULT_LEVEL, report: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--level") opts.level = argv[++i] ?? "";
    else if (a === "--report") opts.report = argv[++i] ?? "";
    else if (a === "--json") opts.json = true;
    else return { error: `unrecognized argument: ${a}` };
  }
  if (opts.report === "") return { error: "--report requires a file" };
  return opts;
}

/**
 * Run npm, or read a captured report. Either way the caller gets the same shape, so the classifier
 * never learns which one it was looking at.
 */
function collect(opts) {
  if (opts.report) {
    try {
      return { stdout: readFileSync(opts.report, "utf8"), stderr: "", status: 0 };
    } catch (err) {
      return { stdout: "", stderr: "", status: null, spawnError: `cannot read ${opts.report}: ${err.message}` };
    }
  }
  // `npm audit --json` and not `--audit-level=<x>`: the threshold is applied HERE, from the report
  // body, because letting npm apply it means the only thing that comes back is an exit code - and an
  // exit code is precisely what cannot distinguish an outage from a finding.
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npm, ["audit", "--json"], {
    encoding: "utf8",
    timeout: AUDIT_TIMEOUT_MS,
    shell: process.platform === "win32",
  });
  if (r.error) return { stdout: "", stderr: r.stderr ?? "", status: null, spawnError: r.error.message };
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status };
}

if (process.argv[1]?.endsWith("audit-deps.mjs")) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (opts.error) {
    console.error(`${opts.error}\n\n${USAGE}`);
    process.exit(2);
  }

  const verdict = classifyAudit(collect(opts), { level: opts.level });
  console.log(formatVerdict(verdict));
  if (opts.json) console.log(JSON.stringify(verdict, null, 2));
  process.exit(verdict.code);
}
