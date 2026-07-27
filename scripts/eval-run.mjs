// what-it-is:   the eval-run pipeline CLI (backlog E11 / F2)
// what-it-does: runs one or more pinned corpus targets through the free gate and the conformance renderer,
//               writing artifacts plus a record skeleton; with --aggregate it turns a day's skeletons into
//               tracked eval-runs.md rows and widens the measured range in the public token dossier
// why:          an eval run was a hand procedure (clone, remember the pin, get the slashes right, transcribe
//               a row) with a silent-empty-directory trap; making it a command makes a batch reproducible
// used-by:      run by the maintainer for an eval-run batch; covered by tests/unit/eval-run.test.mjs and
//               tests/unit/eval-run-aggregate.test.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EvalRunError, loadCorpus, resolveTarget, planBatch, runOne, toPosix, RUNS_DIR_REL, DISPATCH_TEMPLATES } from "./lib/eval-run.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `eval-run - the deterministic eval-run pipeline (no model call)

  node scripts/eval-run.mjs <target-id|path> [more ids] [options]
  node scripts/eval-run.mjs --all [options]
  node scripts/eval-run.mjs --aggregate <YYYY-MM-DD|today> [options]

Run options
  --profile <name>     gate profile (defaults to the target's manifest profile)
  --report-type <t>    the advisory pass this run is staged for: review (default) or behavioral
  --subpath <rel>      grade a path inside the clone (a marketplace member, a single skill)
  --sha <sha>          required pin for an ad hoc path target (ids carry their pin in the manifest)
  --limit <n>          grade only the first n targets, stating what was dropped (R-PIPE-5)
  --date <YYYY-MM-DD>  run date (defaults to today, UTC)
  --out-dir <dir>      artifact directory (defaults to ${RUNS_DIR_REL}/<date>)
  --manifest <file>    corpus manifest (defaults to the tracked one)

Aggregate options
  --label "<text>"     the batch heading label in the record
  --runs-dir <dir>     where the day's record skeletons live
  --record <file>      the tracked eval-runs record to append to
  --dossier <file>     the public token dossier whose measured range is widened
  --dry-run            print what would change, write nothing

The gate is reached only through the npm script seam, so relocating the checker costs this pipeline a
script definition, not a rewrite. Exit 0 means the pipeline ran; a graded subject's own errors are in the
report and the record row, never in this exit code. Exit 2 means a refusal (an unverified pin, an empty
tree, a seam that could not grade) - a refusal is always loud.`;

const VALUE_FLAGS = new Set(["--profile", "--report-type", "--subpath", "--sha", "--limit", "--date", "--out-dir", "--manifest", "--aggregate", "--label", "--runs-dir", "--record", "--dossier"]);

function parseArgs(argv) {
  const out = { positionals: [], all: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") out.all = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--") && a.includes("=")) {
      const [k, v] = [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)];
      if (!VALUE_FLAGS.has(k)) throw new EvalRunError(`unknown flag ${k}`, "usage");
      out[k.slice(2)] = v;
    } else if (VALUE_FLAGS.has(a)) {
      const v = argv[++i];
      if (v === undefined) throw new EvalRunError(`${a} needs a value`, "usage");
      out[a.slice(2)] = v;
    } else if (a.startsWith("--")) throw new EvalRunError(`unknown flag ${a}`, "usage");
    else out.positionals.push(a);
  }
  return out;
}

const key = (args, name) => args[name] ?? args[name.replace(/-([a-z])/g, (m, c) => c.toUpperCase())];

function runBatch(args) {
  const corpus = loadCorpus(REPO_ROOT, args.manifest);
  const ids = args.all ? corpus.targets.map((t) => t.id) : args.positionals;
  if (ids.length === 0) throw new EvalRunError("no target given; pass a corpus id, a path plus --sha, or --all", "usage");
  const entries = ids.map((id) => resolveTarget(corpus, id, { sha: args.sha, subpath: args.subpath, profile: args.profile }));
  const { selected, dropped, bounds } = planBatch(entries, args.limit);

  // R-PIPE-5: state the bound before the work, so a bounded batch can never read as full coverage.
  for (const b of bounds) console.log(`[bound] ${b.stated}`);
  if (dropped.length) console.log(`[bound] dropped: ${dropped.map((e) => e.id).join(", ")}`);

  const results = [];
  for (const entry of selected) {
    const r = runOne(entry, {
      repoRoot: REPO_ROOT,
      profile: args.profile,
      reportType: key(args, "report-type") ?? "review",
      date: args.date,
      outDir: key(args, "out-dir"),
      bounds,
    });
    results.push(r);
    console.log("");
    console.log(`${r.runKey}: ${r.gate.verdict}  (gate exit ${r.gate.exitCode})`);
    // Printed from the skeleton's own normalized fields, so every path this pipeline shows a human is
    // the same forward-slash form it hands the seams.
    console.log(`  target   ${r.skeleton.target.path} @ ${r.skeleton.target.shortSha}`);
    console.log(`  report   ${r.skeleton.outputs.html}`);
    console.log(`           ${r.skeleton.outputs.md}`);
    console.log(`  skeleton ${toPosix(r.skeletonPath)}`);
    for (const b of r.bounds) console.log(`  [bound] ${b.stated}`);
    const template = r.skeleton.advisory.dispatchTemplate ?? DISPATCH_TEMPLATES.review;
    console.log(`  advisory pending: dispatch with ${template}, then fill the advisory fields in the skeleton`);
  }
  if (results.length) {
    console.log("");
    console.log(`Next: node scripts/eval-run.mjs --aggregate ${results[0].date}   (appends the record rows and widens the dossier range)`);
  }
  return results;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const args = parseArgs(argv);
  if (args.aggregate) {
    const { aggregate, formatAggregateSummary } = await import("./lib/eval-run-aggregate.mjs");
    const date = args.aggregate === "today" ? new Date().toISOString().slice(0, 10) : args.aggregate;
    const summary = aggregate({
      repoRoot: REPO_ROOT,
      date,
      runsDir: key(args, "runs-dir"),
      recordPath: args.record,
      dossierPath: args.dossier,
      label: args.label,
      write: !args.dryRun,
    });
    console.log(formatAggregateSummary(summary, { dryRun: args.dryRun }));
    return 0;
  }
  runBatch(args);
  return 0;
}

if (process.argv[1]?.endsWith("eval-run.mjs")) {
  main().then(
    (code) => process.exit(code ?? 0),
    (e) => {
      console.error(e instanceof EvalRunError ? e.message : `eval-run FAILED: ${e.stack ?? e.message}`);
      process.exit(2);
    }
  );
}
