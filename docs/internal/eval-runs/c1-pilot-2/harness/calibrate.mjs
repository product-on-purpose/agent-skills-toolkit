// Experiment B2's calibration (design section 2, carried over from experiment B section 4).
//
//   node calibrate.mjs [--brief <name>] [--case case-01,case-02] [--label calibration]
//
// Runs every held-out case of the three real briefs with no relevant skill, in the same container image and
// with the same command as experiment B's calibration: experiment B's stub plugin, `--ablation none --runs 3`,
// the brief's agent model and a sonnet judge. A case scoring 0.75 or more cannot be won under the pass rule,
// so it is replaced once. The dry-run brief's decoys are not calibrated, because no score is read from them.
// The cases stay local (design section 3.2), so the suite folders and results are written under
// _local/c1-pilot-2/<label>/. The summary holds case names and scores only.

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../../..');
const LOCAL2 = process.env.C1_LOCAL2 ?? join(REPO, '_local', 'c1-pilot-2');
const LOCAL_B = process.env.C1_LOCAL ?? join(REPO, '_local', 'c1-pilot');
const IMAGE = 'localhost/c1-pilot:1';
const TOKEN_FILE = join(homedir(), '.c1-pilot.env');
const CEILING_USD = '4';

// Design section 2: haiku for the one brief aimed at a smaller model, sonnet for the others.
export const AGENT_MODEL = { 'lease-clause-review': 'sonnet', 'shift-handover-note': 'haiku', 'customer-release-notes': 'sonnet' };
export const SATURATED = 0.75;

const arg = (argv, flag, fallback) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : fallback);

export function suiteFolder(target, brief, only, casesRoot = join(LOCAL2, 'cases')) {
  rmSync(target, { recursive: true, force: true });
  cpSync(join(LOCAL_B, 'plugins', 'stub'), target, { recursive: true });
  mkdirSync(join(target, 'out'), { recursive: true });
  for (const name of readdirSync(join(casesRoot, brief)).sort()) {
    if (only && !only.includes(name)) continue;
    cpSync(join(casesRoot, brief, name), join(target, 'evals', name), { recursive: true });
  }
}

function main(argv) {
  if (!existsSync(TOKEN_FILE)) throw new Error(`No token file at ${TOKEN_FILE}`);
  const only = arg(argv, '--case', null)?.split(',') ?? null;
  const label = arg(argv, '--label', 'calibration');
  const briefs = arg(argv, '--brief', null)?.split(',') ?? Object.keys(AGENT_MODEL);
  const summaryPath = join(LOCAL2, label, 'summary.json');
  const summary = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, 'utf8')) : {};
  for (const brief of briefs) {
    if (!AGENT_MODEL[brief]) throw new Error(`Unknown brief: ${brief}`);
    const dir = join(LOCAL2, label, brief);
    suiteFolder(dir, brief, only);
    const r = spawnSync('podman', [
      'run', '--rm', '--env-file', TOKEN_FILE, '-v', `${dir}:/work`, IMAGE,
      'claude', 'plugin', 'eval', '.', '--ablation', 'none', '--runs', '3',
      '--model', AGENT_MODEL[brief], '--judge-model', 'sonnet', '--threshold', '0', '-j', '4',
      '--no-publish', '--trust-plugin', '--max-cost-usd', CEILING_USD,
      '--output-dir', 'out', '--json', 'out/run.json',
    ], { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
    const resultPath = join(dir, 'out', 'aggregate-result.json');
    if (!existsSync(resultPath)) throw new Error(`${brief}: no result, exit ${r.status}\n${r.stderr.slice(-800)}`);
    const result = JSON.parse(readFileSync(resultPath, 'utf8'));
    summary[brief] = {
      costUsd: result.costUsd, partial: result.partial,
      cases: result.cases.map((c) => ({
        name: c.name, score: c.aggregates.score,
        errors: c.arms.with.filter((x) => x.error).length,
        saturated: c.aggregates.score >= SATURATED,
      })),
    };
    writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    const sat = summary[brief].cases.filter((c) => c.saturated).length;
    console.log(`${brief}: exit ${r.status}, ${summary[brief].cases.length} cases, ${sat} at or above ${SATURATED}, cost $${result.costUsd}, partial ${result.partial}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv);
