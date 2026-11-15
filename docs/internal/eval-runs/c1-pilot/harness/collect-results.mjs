// Copies experiment B's committable build artifacts from _local into c1-pilot/results/, as section 12 of
// the pre-registration requires: every build attempt's skill and build record, the build summary, and the
// leak trace. Transcripts stay in _local, because they can carry machine paths.
//
//   node collect-results.mjs <local-c1-pilot-dir>

import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS = resolve(HERE, '..', 'results');

const local = process.argv[2];
if (!local) throw new Error('usage: node collect-results.mjs <local-c1-pilot-dir>');
const summary = JSON.parse(readFileSync(join(local, 'builds-summary.json'), 'utf8'));
mkdirSync(join(RESULTS, 'builds'), { recursive: true });
writeFileSync(join(RESULTS, 'builds-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
cpSync(join(local, 'leak-trace.json'), join(RESULTS, 'leak-trace.json'));
for (const build of summary.builds) {
  for (const attempt of build.attempts) {
    const run = join(local, 'runs', attempt.id);
    const out = join(RESULTS, 'builds', attempt.id);
    mkdirSync(out, { recursive: true });
    cpSync(join(run, 'build-record.json'), join(out, 'build-record.json'));
    const skill = join(run, 'work', 'skills', build.brief);
    if (existsSync(skill)) cpSync(skill, join(out, 'skill', build.brief), { recursive: true });
    console.log(`${attempt.id}: record${existsSync(skill) ? ', skill ' + readdirSync(skill).join(' ') : ', NO SKILL'}`);
  }
}
