#!/usr/bin/env node
// what-it-is:   the release-ready CLI (review wave 2, H2)
// what-it-does: runs every release-blocking gate, prints one table, and exits 1 if the tag must not be cut
// why:          `docs/internal/RELEASE.md` asked a HUMAN to confirm that `npm run vendor-watch` was green and its
//               run under 30 days old. That is a checklist line whose entire subject is that people forget to
//               re-read things, and neither release.yml nor publish-npm.yml ran it. A tag, a GitHub release and
//               an npm version could all ship while a sentence this repository publishes as fact had been gone
//               from the vendor's page for a year, and every automated signal would be green
// used-by:      npm run release-ready; .github/workflows/release.yml; .github/workflows/publish-npm.yml;
//               covered by tests/unit/release-ready.test.mjs
//
// It RUNS every gate before reporting, and never stops at the first failure. A release blocked twice by two
// separate causes should cost one run, not two: the operator's cycle time is a real cost and fail-fast spends it
// to save a few seconds of CI.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GATES, summarize, exitCodeFor, renderSummary } from "./lib/release-ready.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: node scripts/release-ready.mjs [options]

  --allow-vendor-unreachable <reason>
                        excuse vendor-watch exit 2 ONLY - a vendor page that could not be FETCHED - and
                        record the stated reason in the output. Exit 1 (a claim is gone or stale) is never
                        overridable: overriding it would publish the false claim the watch exists to catch.
  --json                emit the machine summary instead of the human table
  -h, --help            this message

Exit: 0 releasable | 1 at least one release-blocking gate failed

Gates: ${GATES.map((g) => g.id).join(", ")}`;

function parseArgs(argv) {
  const opts = { overrideReason: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--json") opts.json = true;
    else if (a === "--allow-vendor-unreachable") opts.overrideReason = argv[++i] ?? "";
  }
  return opts;
}

/** Run one gate as a child node process. Its stdout is echoed so a failure is diagnosable from the CI log. */
function runGate(gate) {
  const r = spawnSync(process.execPath, gate.argv, { cwd: REPO, encoding: "utf8" });
  const text = `${r.stdout ?? ""}${r.stderr ?? ""}`.trimEnd();
  if (text) {
    console.log(`--- ${gate.id} ---`);
    console.log(text);
    console.log("");
  }
  // A gate that could not be SPAWNED is not a pass. `status` is null when the process died on a signal or
  // failed to start, and Number(null) is 0 - which would have read as success.
  return { id: gate.id, code: r.status === null ? 127 : r.status };
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  const results = GATES.map(runGate);
  const summary = summarize(results, { overrideReason: opts.overrideReason });
  console.log(opts.json ? JSON.stringify(summary, null, 2) : renderSummary(summary));
  return exitCodeFor(summary);
}

if (process.argv[1]?.endsWith("release-ready.mjs")) process.exit(main());
