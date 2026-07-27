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
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  PIN_REL, StandardsWatchError, buildReport, emitPin, exitCodeFor,
  readPin, renderAdrDraft, renderReport,
} from "./lib/standards-watch.mjs";

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

Exit: 0 unchanged or cosmetic-only | 1 a human must look | 2 refused (could not verify)

This command never writes a file. It cannot amend a check or STANDARD.md; the Standard grows only
by ADR with the sec 7.7 warn-first burndown.`;

function parseArgs(argv) {
  const opts = { root: ".", pin: PIN_REL, snapshotDir: null, json: false, adrDraft: false, adrNumber: "NNNN", emitPin: false, by: "unrecorded" };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { console.log(USAGE); process.exit(0); }
    else if (a === "--pin") opts.pin = argv[++i];
    else if (a === "--snapshot-dir") opts.snapshotDir = argv[++i];
    else if (a === "--json") opts.json = true;
    else if (a === "--adr-draft") opts.adrDraft = true;
    else if (a === "--adr-number") opts.adrNumber = argv[++i];
    else if (a === "--emit-pin") opts.emitPin = true;
    else if (a === "--by") opts.by = argv[++i];
    else if (a.startsWith("-")) { console.error(`unknown option: ${a}\n\n${USAGE}`); process.exit(2); }
    else rest.push(a);
  }
  if (rest.length > 0) opts.root = rest[0];
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

main()
  .then((code) => { process.exitCode = code; })
  .catch((e) => {
    if (e instanceof StandardsWatchError) { console.error(e.message); process.exitCode = 2; return; }
    throw e;
  });
