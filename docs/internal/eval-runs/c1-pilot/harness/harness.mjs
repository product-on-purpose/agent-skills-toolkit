// The driver for experiment B's containers. Its working data goes in _local/c1-pilot/, which is gitignored.
//
//   node harness.mjs prepare                     Export the arms' plugins and the stub, with zero spend
//   node harness.mjs probe                       Check isolation and the toolkit's commands, with zero spend
//   node harness.mjs auth                        Check that the sign-in works, for a few cents
//   node harness.mjs build <arm> <brief> <id>    Run one build. <arm> is toolkit or skill-creator
//   node harness.mjs denominator                 Test whether --ablation none scores the firing grader
//   node harness.mjs calibrate [--case <glob>]   Run section 4's calibration
//
// Every prompt is cut from the pre-registration, so a builder receives its exact words.

import { spawn, spawnSync } from 'node:child_process';
import { cpSync, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRecord, tallySessions } from './build-record.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = resolve(HERE, '..');
const REPO = resolve(PILOT, '../../../..');
const LOCAL = join(REPO, '_local', 'c1-pilot');
const PREREG = join(PILOT, '..', 'prereg_experiment-b-c1-pilot-20261105.md');
const IMAGE = 'localhost/c1-pilot:1';
const TOKEN_FILE = join(homedir(), '.c1-pilot.env');
// Builds sign in from a login stored in this volume, because Claude Code removes an environment token
// from its Bash tool, and a build's nested sessions start from Bash. Scoring suites keep the token.
const LOGIN_VOLUME = process.env.C1_LOGIN_VOLUME ?? 'c1-pilot-login';
// Without CLAUDE_CONFIG_DIR, Claude Code writes `.claude.json` to the home folder, outside the volume,
// and `--rm` deletes it. Measured 2026-11-08. The setting keeps every login file inside the volume.
const LOGIN_MOUNT = ['-v', `${LOGIN_VOLUME}:/home/node/.claude`, '-e', 'CLAUDE_CONFIG_DIR=/home/node/.claude'];
const TAG = 'v1.23.0';
const SKILL_CREATOR = join(homedir(), '.claude/plugins/cache/anthropic-agent-skills/document-skills/ca45fc496a34/skills/skill-creator');
const CALIBRATION_CEILING_USD = '4';
const WATCH_SECONDS = 60;
const WALL_CLOCK_HOURS = 3;

export const AGENT_MODEL = { 'migration-risk-review': 'sonnet', 'postmortem-from-notes': 'haiku', 'acceptance-criteria-writer': 'sonnet' };
const PROGRESS = 'standup-summary';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options });
  if (result.error) throw result.error;
  return result;
}

function must(command, args, options) {
  const result = run(command, args, options);
  if (result.status !== 0) throw new Error(`${command} ${args.slice(0, 3).join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

/** Cut the unquoted text of the first blockquote after a heading or marker line. */
export function blockquoteAfter(text, marker) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes(marker));
  if (start < 0) throw new Error(`marker not found: ${marker}`);
  let index = start + 1;
  while (index < lines.length && !lines[index].startsWith('>')) index += 1;
  const quoted = [];
  while (index < lines.length && lines[index].startsWith('>')) {
    quoted.push(lines[index].replace(/^> ?/, ''));
    index += 1;
  }
  if (quoted.length === 0) throw new Error(`no blockquote after: ${marker}`);
  return quoted.join('\n').trim();
}

/** Assemble a builder's prompt from the pre-registration's own words. */
export function builderPrompt(prereg, arm, briefName) {
  const brief =
    briefName === PROGRESS
      ? prereg.match(/harness-only brief: "([^"]+)"/)[1]
      : blockquoteAfter(prereg, `: \`${briefName}\``);
  const common = blockquoteAfter(prereg, '**The text every builder receives, after its brief:**');
  const marker = arm === 'toolkit' ? "**Then the toolkit arm's instruction:**" : "**Then the skill-creator arm's instruction:**";
  return `${brief}\n\n${common}\n\n${blockquoteAfter(prereg, marker)}\n`;
}

function needToken() {
  if (!existsSync(TOKEN_FILE)) throw new Error(`No sign-in at ${TOKEN_FILE}. Run save-token.mjs first.`);
}

function normaliseLineEndings(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      normaliseLineEndings(path);
      continue;
    }
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    if (text.includes('\r\n')) writeFileSync(path, text.replace(/\r\n/g, '\n'));
  }
}

function writePlugin(dir, name) {
  mkdirSync(join(dir, '.claude-plugin'), { recursive: true });
  writeFileSync(
    join(dir, '.claude-plugin', 'plugin.json'),
    `${JSON.stringify({ name, version: '0.0.0', description: 'A wrapper used only by experiment B.' }, null, 2)}\n`,
  );
}

function prepare() {
  const plugins = join(LOCAL, 'plugins');
  rmSync(plugins, { recursive: true, force: true });
  mkdirSync(plugins, { recursive: true });

  // The toolkit: LF endings as committed, with docs/internal and tests removed.
  const toolkit = join(plugins, 'toolkit');
  mkdirSync(toolkit);
  const archive = join(plugins, 'toolkit.tar');
  must('git', ['-C', REPO, '-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', '-o', archive, TAG]);
  must('tar', ['-xf', archive.replace(/\\/g, '/'), '-C', toolkit.replace(/\\/g, '/')]);
  rmSync(archive);
  rmSync(join(toolkit, 'docs', 'internal'), { recursive: true, force: true });
  rmSync(join(toolkit, 'tests'), { recursive: true, force: true });

  // The toolkit's scripts need their one runtime dependency, installed for Linux in the container.
  must('podman', ['run', '--rm', '-v', `${toolkit}:/plugin`, '-w', '/plugin', IMAGE, 'npm', 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund']);

  // skill-creator: the pinned commit's folder only. The Windows cache holds CRLF endings, and the commit holds LF.
  const wrapper = join(plugins, 'skill-creator');
  writePlugin(wrapper, 'skill-creator-wrapper');
  cpSync(SKILL_CREATOR, join(wrapper, 'skills', 'skill-creator'), { recursive: true });
  normaliseLineEndings(wrapper);

  // The calibration's stub has no skill, so its eval cases run against a bare model.
  writePlugin(join(plugins, 'stub'), 'c1-pilot');
  console.log(`Prepared ${readdirSync(plugins).join(', ')} in ${plugins}`);
}

function probe() {
  const script = [
    'echo "user: $(id -un)"',
    'echo "claude: $(claude --version)"',
    'echo "personal config present: $(ls -A ~/.claude 2>/dev/null | wc -l) entries"',
    'for path in /mnt/e /mnt/c /e /Projects; do [ -e "$path" ] && echo "VISIBLE: $path" || echo "absent: $path"; done',
    'mount | grep -E " /(work|plugin) " | cut -d" " -f3,6 | cut -c1-30',
    'touch /plugin/x 2>/dev/null && echo "PLUGIN WRITABLE" || echo "plugin is read-only"',
    'touch /work/x && echo "work is writable" && rm /work/x',
    'ls /plugin/docs/internal /plugin/tests 2>/dev/null | wc -l | sed "s/^/internal or test entries: /"',
    'cd /work && node /plugin/scripts/evaluate.mjs /plugin 2>&1 | tail -3',
    'cd /tmp && node /plugin/scripts/check.mjs /plugin 2>&1 | tail -2',
  ].join('; ');
  const work = join(LOCAL, 'probe-work');
  mkdirSync(work, { recursive: true });
  console.log(must('podman', ['run', '--rm', '-v', `${work}:/work`, '-v', `${join(LOCAL, 'plugins', 'toolkit')}:/plugin:ro`, IMAGE, 'sh', '-c', script]));
}

function auth() {
  needToken();
  const result = run('podman', ['run', '--rm', '-i', '--env-file', TOKEN_FILE, IMAGE, 'claude', '-p', '--model', 'haiku', '--max-budget-usd', '0.05', '--output-format', 'json'], {
    input: 'Reply with the single word ready.',
  });
  const parsed = JSON.parse(result.stdout);
  console.log({ reply: parsed.result, costUsd: parsed.total_cost_usd, isError: parsed.is_error, exit: result.status });
}

/**
 * Empty the login volume of everything but the stored login, so no build sees another build's files.
 * `.claude.json` also records per-folder history, so only its account fields are kept.
 */
function resetLogin() {
  const trim = [
    "const fs = require('fs'); const f = '/home/node/.claude/.claude.json';",
    'if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, "utf8")); const k = {};',
    "for (const n of ['oauthAccount', 'userID', 'hasCompletedOnboarding']) if (n in j) k[n] = j[n];",
    'fs.writeFileSync(f, JSON.stringify(k)); }',
  ].join(' ');
  const script = [
    'test -f /home/node/.claude/.credentials.json || { echo "no stored login"; exit 3; }',
    'find /home/node/.claude -mindepth 1 -maxdepth 1 ! -name .credentials.json ! -name .claude.json -exec rm -rf {} +',
    `node -e '${trim.replace(/'/g, "'\\''")}'`,
  ].join('; ');
  const result = run('podman', ['run', '--rm', ...LOGIN_MOUNT, IMAGE, 'sh', '-c', script]);
  if (result.status !== 0) throw new Error(`The login volume is not ready: ${result.stdout}${result.stderr}`);
}

/** Check, for a few cents, that a session started from Bash can sign in and run an eval. */
function nested() {
  resetLogin();
  const setup = [
    'mkdir -p /tmp/p/.claude-plugin /tmp/p/evals/c/graders && cd /tmp/p',
    `printf '{"name":"probe","version":"0.0.0","description":"probe"}\\n' > .claude-plugin/plugin.json`,
    "printf 'Reply with the word hello.\\n' > evals/c/prompt.md",
    "printf -- '---\\ntype: llm\\nweight: 1\\n---\\n\\nThe response says hello.\\n' > evals/c/graders/g.md",
  ].join(' && ');
  const inner = [
    'Run exactly this bash command and reply with its raw output only:',
    'cd /tmp/p && claude plugin eval . --runs 1 --model haiku --judge-model haiku --threshold 0 --no-publish --trust-plugin --max-cost-usd 0.1 --output-dir out 2>&1 | tail -3',
  ].join('\n');
  const result = run('podman', [
    'run', '--rm', '-i', ...LOGIN_MOUNT, IMAGE, 'sh', '-c',
    `${setup} && claude -p --model haiku --max-budget-usd 0.08 --allowed-tools Bash`,
  ], { input: inner });
  console.log(result.stdout.slice(-1500), result.stderr.slice(-500));
}

function containerSessions(name) {
  const script = "find /home/node/.claude/projects -name '*.jsonl' 2>/dev/null | xargs -r cat";
  const result = run('podman', ['exec', name, 'sh', '-c', script]);
  return result.status === 0 ? result.stdout : '';
}

async function build(arm, briefName, id, stopAtUsd) {
  resetLogin();
  const prereg = readFileSync(PREREG, 'utf8');
  const prompt = builderPrompt(prereg, arm, briefName);
  const runDir = join(LOCAL, 'runs', id);
  if (existsSync(runDir)) throw new Error(`Run ${id} exists already, and a build always starts fresh.`);
  const work = join(runDir, 'work');
  mkdirSync(work, { recursive: true });
  writePlugin(work, 'c1-build');
  writeFileSync(join(runDir, 'prompt.txt'), prompt);

  const name = `c1-${id}`;
  const args = [
    'run', '-i', '--name', name,
    ...LOGIN_MOUNT,
    '-v', `${work}:/work`, '-v', `${join(LOCAL, 'plugins', arm)}:/plugin:ro`,
    '-e', 'BASH_DEFAULT_TIMEOUT_MS=3600000', '-e', 'BASH_MAX_TIMEOUT_MS=5400000',
    IMAGE,
    'claude', '-p', '--plugin-dir', '/plugin', '--model', 'sonnet', '--max-budget-usd', '15',
    '--no-session-persistence', '--output-format', 'stream-json', '--verbose',
    '--disallowed-tools', 'WebFetch', 'WebSearch',
    '--allowed-tools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'Skill', 'Agent',
  ];
  const started = Date.now();
  const streamPath = join(runDir, 'stream.jsonl');
  const stream = createWriteStream(streamPath);
  const errors = createWriteStream(join(runDir, 'stderr.log'));
  const child = spawn('podman', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.pipe(stream);
  child.stderr.pipe(errors);
  child.stdin.end(prompt);

  let stoppedBy = null;
  const estimate = () => {
    const parent = existsSync(streamPath) ? tallySessions(readFileSync(streamPath, 'utf8')).dollars : 0;
    const children = tallySessions(containerSessions(name)).dollars;
    return { parent, children, total: parent + children };
  };
  const watch = setInterval(() => {
    const current = estimate();
    const minutes = (Date.now() - started) / 60000;
    console.log(`[${minutes.toFixed(0)} min] parent $${current.parent.toFixed(2)}, child sessions $${current.children.toFixed(2)}`);
    if (current.total > stopAtUsd) stoppedBy = `estimate $${current.total.toFixed(2)} passed the stop at $${stopAtUsd}`;
    else if (minutes > WALL_CLOCK_HOURS * 60) stoppedBy = `wall clock passed ${WALL_CLOCK_HOURS} hours`;
    if (stoppedBy) {
      clearInterval(watch);
      console.log(`Stopping: ${stoppedBy}`);
      run('podman', ['stop', '-t', '5', name]);
    }
  }, WATCH_SECONDS * 1000);

  const exit = await new Promise((done) => child.on('close', done));
  clearInterval(watch);
  await new Promise((done) => stream.end(done));

  // Session files are copied out before the container goes, for the spend record.
  // Only the session files leave the container. The stored login stays in its volume.
  const home = join(runDir, 'claude-home');
  mkdirSync(home, { recursive: true });
  run('podman', ['cp', `${name}:/home/node/.claude/projects`, join(home, 'projects')]);
  const children = tallySessions(sessionsOnHost(join(home, 'projects')));
  run('podman', ['rm', '-f', name]);

  const streamText = readFileSync(streamPath, 'utf8');
  const record = buildRecord({ arm, streamText, workDir: work, skillName: briefName });
  record.brief = briefName;
  record.exit = exit;
  record.stoppedBy = stoppedBy;
  record.wallClockMinutes = (Date.now() - started) / 60000;
  record.childSessions = children;
  record.parentTokens = tallySessions(streamText);
  writeFileSync(join(runDir, 'build-record.json'), `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record, null, 2));
}

function sessionsOnHost(dir, collected = []) {
  if (!existsSync(dir)) return '';
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sessionsOnHost(path, collected);
    else if (entry.endsWith('.jsonl')) collected.push(readFileSync(path, 'utf8'));
  }
  return collected.join('\n');
}

/** Copy one brief's cases into a stub plugin. Calibration leaves out fired.md when told to. */
function stubWithCases(target, brief, { keepFired, only }) {
  rmSync(target, { recursive: true, force: true });
  cpSync(join(LOCAL, 'plugins', 'stub'), target, { recursive: true });
  mkdirSync(join(target, 'out'), { recursive: true });
  const source = join(PILOT, 'held-out', brief);
  for (const caseName of readdirSync(source).sort()) {
    if (only && !only.includes(caseName)) continue;
    cpSync(join(source, caseName), join(target, 'evals', caseName), { recursive: true });
    if (!keepFired) rmSync(join(target, 'evals', caseName, 'graders', 'fired.md'));
  }
}

function runSuite(pluginDir, brief, ceiling, label) {
  const output = run('podman', [
    'run', '--rm', '--env-file', TOKEN_FILE, '-v', `${pluginDir}:/work`, IMAGE,
    'claude', 'plugin', 'eval', '.', '--ablation', 'none', '--runs', '3',
    '--model', AGENT_MODEL[brief], '--judge-model', 'sonnet', '--threshold', '0', '-j', '4',
    '--no-publish', '--trust-plugin', '--max-cost-usd', ceiling,
    '--output-dir', 'out', '--json', 'out/run.json',
  ]);
  console.log(`${label}: exit ${output.status}`);
  if (output.status !== 0) console.log(output.stderr.slice(-800));
  return JSON.parse(readFileSync(join(pluginDir, 'out', 'aggregate-result.json'), 'utf8'));
}

/** Run one case under --ablation none with fired.md present, and report how it counted. */
function denominator() {
  needToken();
  const brief = 'postmortem-from-notes';
  const dir = join(LOCAL, 'denominator');
  stubWithCases(dir, brief, { keepFired: true, only: ['case-01'] });
  const result = runSuite(dir, brief, '1', 'denominator');
  const firstRun = result.cases[0].arms.with[0];
  console.log({
    costUsd: result.costUsd,
    score: firstRun.score,
    graders: firstRun.graders.map((g) => ({ name: g.name, passed: g.passed, scored: g.scored, withOnly: g.withOnly })),
  });
}

function calibrate(argv) {
  needToken();
  const only = argv.includes('--case') ? argv[argv.indexOf('--case') + 1].split(',') : null;
  const stamp = argv.includes('--label') ? argv[argv.indexOf('--label') + 1] : 'calibration';
  const out = join(PILOT, 'calibration');
  mkdirSync(out, { recursive: true });
  const summary = {};
  for (const brief of Object.keys(AGENT_MODEL)) {
    const dir = join(LOCAL, stamp, brief);
    stubWithCases(dir, brief, { keepFired: false, only });
    const result = runSuite(dir, brief, CALIBRATION_CEILING_USD, brief);
    writeFileSync(join(out, `${stamp}-${brief}.json`), `${JSON.stringify(result, null, 2)}\n`);
    summary[brief] = {
      costUsd: result.costUsd,
      partial: result.partial,
      cases: result.cases.map((c) => ({
        name: c.name,
        score: c.aggregates.score,
        errors: c.arms.with.filter((r) => r.error).length,
        graders: c.arms.with[0]?.graders.length,
      })),
    };
  }
  writeFileSync(join(out, `${stamp}-summary.json`), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

async function main(argv) {
  const [command, ...rest] = argv.slice(2);
  if (command === 'prepare') return prepare();
  if (command === 'probe') return probe();
  if (command === 'auth') return auth();
  if (command === 'nested') return nested();
  if (command === 'reset-login') return resetLogin();
  if (command === 'denominator') return denominator();
  if (command === 'calibrate') return calibrate(rest);
  if (command === 'build') return build(rest[0], rest[1], rest[2], Number(rest[3] ?? 18));
  console.error('usage: node harness.mjs prepare|probe|auth|reset-login|nested|denominator|calibrate|build');
  process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  await main(process.argv);
}
