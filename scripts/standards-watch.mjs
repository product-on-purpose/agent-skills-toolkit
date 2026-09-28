#!/usr/bin/env node
// what-it-is:   the upstream standards-watch CLI (STANDARD.md sec 6)
// what-it-does: fetches every artifact the upstream pin names, hands the bytes to the deterministic
//               differ, and prints the report, the ADR skeleton, or a proposed re-pin to stdout
// why:          sec 6 obliges the Universal tier to track agentskills.io, and nothing pinned the
//               upstream, so the obligation was unauditable; this makes the question answerable and,
//               by printing rather than writing, keeps the answer a proposal a human acts on
// used-by:      npm run standards-watch; skills/askit-standards-watch; tests/unit/standards-watch.test.mjs
//
// WRITE-INCAPABLE BY CONSTRUCTION. Only readFileSync is imported from node:fs. Every output goes to
// stdout, so redirecting it is the user's explicit act, and a re-pin lands as a reviewed file change.
// tests/unit/standards-watch.test.mjs fails the build if any write API appears in this file.
//
// A LOAD FAILURE IS A REFUSAL, NOT A FINDING (issue #323, "the standards-watch false alarm"). ./lib/
// standards-watch.mjs transitively imports the "yaml" package (./lib/registry.mjs -> ../checks/
// chain-contract.mjs -> "yaml"), and that is a STATIC import chain: if "yaml" is not installed, loading
// it fails at MODULE LINK TIME, before a single line of this file runs, so no try/catch inside a
// function could ever see it - Node reports the uncaught ERR_MODULE_NOT_FOUND as exit 1, which is
// exactly what made the standards-watch workflow's issue step title a crash as "the upstream moved".
// A dynamic import(), awaited at the top level with its rejection caught, runs AFTER this file's own
// static links are already resolved, so a failure becomes a value main() can catch and report as
// REFUSED (exit 2) instead. Every node: builtin, and ./lib/fs-utils.mjs (verified dependency-free),
// stay static imports below; only the chain that can pull in a third-party package is dynamic.
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeArgPath } from "./lib/fs-utils.mjs";

let LOAD_ERROR = null;
const {
  PIN_REL, StandardsWatchError, buildReport, emitPin, exitCodeFor,
  readPin, renderAdrDraft, renderReport,
} = await import("./lib/standards-watch.mjs").catch((e) => { LOAD_ERROR = e; return {}; });

const USAGE = `Usage: node scripts/standards-watch.mjs [root] [options]

  root                  plugin root (default ".")
  --pin <path>          pin document, relative to root (default ${PIN_REL})
  --snapshot-dir <dir>  read artifacts from a local mirror instead of the network
                        (files at <dir>/<artifact path>); makes a run reproducible and offline
  --json                emit the machine report instead of the human one
  --adr-draft           emit the ADR skeleton for the detected deltas
  --adr-number <NNNN>   number to put on the ADR skeleton (default NNNN)
  --emit-pin            emit the proposed re-pinned document (review it, then commit it yourself)
  --by <name>           recorded as verified.by when emitting a pin
  -h, --help            this message

Exit: 0 unchanged or cosmetic-only | 1 a human must look | 2 refused - could not verify, OR the run
      could not start at all (for example a missing dependency)

This command never writes a file. It cannot amend a check or STANDARD.md; the Standard grows only
by ADR with the sec 7.7 warn-first burndown.`;

/**
 * Parse the CLI. `root`, `--pin`, and `--snapshot-dir` are all filesystem paths from argv, normalized
 * through normalizeArgPath so a Windows backslash path is not silently misread (the historical defect:
 * docs/how-to/troubleshoot-the-gate.md). Exported for unit testing
 * (tests/unit/argv-path-normalization.test.mjs) - safe to import in isolation because the main() call
 * below is guarded, so importing this module for parseArgs alone never triggers a network fetch.
 */
export function parseArgs(argv) {
  const opts = { root: ".", pin: PIN_REL, snapshotDir: null, json: false, adrDraft: false, adrNumber: "NNNN", emitPin: false, by: "unrecorded" };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { console.log(USAGE); process.exit(0); }
    else if (a === "--pin") opts.pin = normalizeArgPath(argv[++i]);
    else if (a === "--snapshot-dir") opts.snapshotDir = normalizeArgPath(argv[++i]);
    else if (a === "--json") opts.json = true;
    else if (a === "--adr-draft") opts.adrDraft = true;
    else if (a === "--adr-number") opts.adrNumber = argv[++i];
    else if (a === "--emit-pin") opts.emitPin = true;
    else if (a === "--by") opts.by = argv[++i];
    else if (a.startsWith("-")) { console.error(`unknown option: ${a}\n\n${USAGE}`); process.exit(2); }
    else rest.push(a);
  }
  if (rest.length > 0) opts.root = normalizeArgPath(rest[0]);
  return opts;
}

/** Fetch one artifact as bytes plus text, or refuse. A partial fetch must never look like "no change". */
async function fetchArtifact(a, snapshotDir) {
  if (snapshotDir) {
    const local = path.join(snapshotDir, a.path);
    let bytes;
    try {
      bytes = readFileSync(local);
    } catch {
      throw new StandardsWatchError(`snapshot is missing "${a.path}" (looked in ${local})`, "fetch-failed");
    }
    return { bytes, text: bytes.toString("utf8") };
  }
  let res;
  try {
    res = await fetch(a.rawUrl, { headers: { "user-agent": "askit-standards-watch" } });
  } catch (e) {
    throw new StandardsWatchError(`could not fetch ${a.rawUrl}: ${e.message}. Re-run with --snapshot-dir against a local mirror, or check the network.`, "fetch-failed");
  }
  if (!res.ok) throw new StandardsWatchError(`fetching ${a.rawUrl} returned HTTP ${res.status}; the upstream path may have moved, which is itself a material change to investigate by hand`, "fetch-failed");
  const bytes = Buffer.from(await res.arrayBuffer());
  return { bytes, text: bytes.toString("utf8") };
}

async function main() {
  if (LOAD_ERROR) {
    console.error(`standards-watch: REFUSED - the watch could not start (${LOAD_ERROR.code ?? LOAD_ERROR.name}: ${LOAD_ERROR.message}). A run that could not start proved nothing about the pin.`);
    return 2;
  }
  const opts = parseArgs(process.argv.slice(2));
  const root = path.resolve(opts.root);
  const pin = readPin(root, opts.pin);

  const observed = new Map();
  for (const a of pin.artifacts) observed.set(a.path, await fetchArtifact(a, opts.snapshotDir));

  if (opts.emitPin) {
    console.log(JSON.stringify(emitPin(pin, observed, { by: opts.by }), null, 2));
    console.log("");
    console.error(`Review the document above, then save it yourself to ${opts.pin}. This command does not write it.`);
    return 0;
  }

  const report = buildReport({ root, pin, observed });
  if (opts.adrDraft) console.log(renderAdrDraft(report, { number: opts.adrNumber }));
  else if (opts.json) console.log(JSON.stringify(report, null, 2));
  else console.log(renderReport(report));
  return exitCodeFor(report);
}

// Guarded like every other CLI entry point (check.mjs, evaluate.mjs, tier-report.mjs, eval-run.mjs, the
// generators): running main() only when invoked as a script, never on import, means a test can import
// parseArgs() in isolation without triggering a live network fetch.
if (process.argv[1]?.endsWith("standards-watch.mjs")) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((e) => {
      // StandardsWatchError is undefined when LOAD_ERROR fired (the dynamic import failed), so the
      // `StandardsWatchError &&` guard comes first: `e instanceof undefined` throws TypeError, and this
      // catch is the last line of defense, so it must not itself throw. Unreachable today - main()
      // returns 2 directly in the LOAD_ERROR branch rather than throwing - but cheap to guard anyway.
      if (StandardsWatchError && e instanceof StandardsWatchError) { console.error(e.message); process.exitCode = 2; return; }
      // (issue #323) any OTHER unexpected error is a refusal too, never a silently wrong "material
      // change" or "needs review" - a run that did not finish proved nothing about the pin, same as one
      // that never started. The stack trace is appended on its own line, after the REFUSED sentence, so
      // whoever reads the workflow's issue body still has something to debug from.
      console.error(`standards-watch: REFUSED - the watch could not finish (${e?.code ?? e?.name ?? "Error"}: ${e?.message ?? e}). A run that could not finish proved nothing about the pin.`);
      console.error(e?.stack ?? String(e));
      process.exitCode = 2;
    });
}
