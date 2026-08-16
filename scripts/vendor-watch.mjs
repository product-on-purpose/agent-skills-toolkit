#!/usr/bin/env node
// what-it-is:   the vendor-watch CLI
// what-it-does: fetches every vendor page the claims file names, hands the text to the deterministic checker,
//               and prints the report; exits 1 when a claim is gone or stale and 2 when a page could not be read
// why:          this repository cites Claude Code behaviour as fact in STANDARD.md and in four checks, and
//               every one of those citations was a page a person read once. On 2026-08-15 an ADR was ratified
//               on a premise the vendor's own docs contradict. A watch turns "somebody should re-read that"
//               into a scheduled, failing signal
// used-by:      npm run vendor-watch; .github/workflows/vendor-watch.yml; tests/unit/vendor-watch.test.mjs
//
// WRITE-INCAPABLE BY CONSTRUCTION, exactly as standards-watch is. Only readFileSync is imported from node:fs.
// Every output goes to stdout, so redirecting it is the user's explicit act, and a re-pin lands as a reviewed
// file change rather than something a scheduled job did to the repository at 3am. A watcher that can edit the
// claim it is watching is not a watcher. tests/unit/vendor-watch.test.mjs fails the build if any write API
// appears in this file or in scripts/lib/vendor-watch.mjs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildReport, exitCodeFor, renderReport } from "./lib/vendor-watch.mjs";
import { normalizeArgPath } from "./lib/fs-utils.mjs";

export const CLAIMS_REL = "docs/internal/vendor-watch/vendor-claims.json";

const USAGE = `Usage: node scripts/vendor-watch.mjs [root] [options]

  root                  plugin root (default ".")
  --claims <path>       claims document, relative to root (default ${CLAIMS_REL})
  --snapshot-dir <dir>  read pages from a local mirror instead of the network
                        (files at <dir>/<source id>.txt); makes a run reproducible and offline
  --today <YYYY-MM-DD>  treat this as today, for reproducible freshness output
  --json                emit the machine report instead of the human one
  -h, --help            this message

Exit: 0 every claim holds | 1 a human must look (gone or stale) | 2 refused (a page could not be read)

This command never writes a file. It cannot update a claim, a check, or STANDARD.md: when a claim fails,
deciding what the change MEANS is the work, and that decision is an ADR, not a pin bump.`;

function parseArgs(argv) {
  const opts = { root: ".", claims: CLAIMS_REL, snapshotDir: null, today: null, json: false };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--json") opts.json = true;
    else if (a === "--claims") opts.claims = argv[++i];
    else if (a === "--snapshot-dir") opts.snapshotDir = argv[++i];
    else if (a === "--today") opts.today = argv[++i];
    else rest.push(a);
  }
  if (rest.length) opts.root = rest[0];
  return opts;
}

/**
 * Fetch one source, or read it from the snapshot mirror.
 *
 * Returns null on ANY failure rather than throwing, because a single unreachable page must not cost the
 * operator the verdict on every other claim - the same reason gradeMember catches per member. The null is
 * what the checker turns into UNCHECKABLE, and UNCHECKABLE is what turns the exit code into 2.
 */
async function loadSource(source, opts) {
  if (opts.snapshotDir) {
    try {
      return readFileSync(path.join(normalizeArgPath(opts.snapshotDir), `${source.id}.txt`), "utf8");
    } catch {
      return null;
    }
  }
  try {
    const res = await fetch(source.url, { headers: { accept: "text/plain, text/markdown, text/html" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }

  const root = normalizeArgPath(opts.root);
  let pin;
  try {
    pin = JSON.parse(readFileSync(path.join(root, ...opts.claims.split("/")), "utf8"));
  } catch (err) {
    console.error(`vendor-watch: cannot read the claims document (${String(err.message ?? err)})`);
    return 2;
  }

  const pages = {};
  for (const source of pin.sources ?? []) {
    pages[source.id] = await loadSource(source, opts);
  }

  // `--today` exists so a test, and a reproduction, can pin the clock. Without it the freshness column
  // would change under a reader and no run would be comparable to another.
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const report = buildReport(pin, pages, today);

  console.log(opts.json ? JSON.stringify(report, null, 2) : renderReport(report));
  return exitCodeFor(report);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("vendor-watch.mjs")) {
  main().then((code) => process.exit(code));
}
