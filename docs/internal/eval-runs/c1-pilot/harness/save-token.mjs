// Saves the container sign-in where the harness can pass it to podman, without showing it anywhere.
//
//   node docs/internal/eval-runs/c1-pilot/harness/save-token.mjs
//
// Paste the token that `claude setup-token` printed. The input is hidden. The file is written to the
// home folder, outside this repository, and the harness only ever passes its path to `podman --env-file`.
//
// A terminal wraps a long token across lines, so a copied token can hold line breaks. This script
// therefore keeps reading for a moment after each line break, and it removes all whitespace.

import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const path = join(homedir(), '.c1-pilot.env');
const MINIMUM_LENGTH = 80;
const SETTLE_MS = 700;

/** Remove the line breaks and spaces that terminal wrapping adds to a copied token. */
export function cleanToken(raw) {
  return raw.replace(/\s+/g, '');
}

/** Say why a token is unusable, or return null. The reason never includes the token. */
export function tokenProblem(token) {
  if (!token.startsWith('sk-ant-')) return 'It does not start with sk-ant-.';
  if (token.length < MINIMUM_LENGTH) return `It is ${token.length} characters long, which is too short, so part of it was probably lost in copying.`;
  const stray = token.replace(/[A-Za-z0-9_-]/g, '').length;
  if (stray > 0) return `It holds ${stray} character(s) a token cannot contain, so the copy picked up something extra.`;
  return null;
}

function main() {
  process.stdout.write('Paste the token and press Enter (the input is hidden): ');
  process.stdin.setEncoding('utf8');
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  let raw = '';
  let timer = null;
  const finish = () => {
    const token = cleanToken(raw);
    const problem = tokenProblem(token);
    if (problem) {
      console.error(`\n${problem} Nothing was saved.`);
      process.exit(1);
    }
    writeFileSync(path, `CLAUDE_CODE_OAUTH_TOKEN=${token}\n`, { mode: 0o600 });
    console.log(`\nSaved a ${token.length}-character token to ${path}.`);
    process.exit(0);
  };
  process.stdin.on('data', (chunk) => {
    clearTimeout(timer);
    let sawLineBreak = false;
    for (const character of chunk) {
      if (character === '\u0003') process.exit(130);
      if (character === '\r' || character === '\n') sawLineBreak = true;
      else if (character === '\u007f' || character === '\b') raw = raw.slice(0, -1);
      else raw += character;
    }
    if (sawLineBreak) timer = setTimeout(finish, SETTLE_MS);
  });
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/save-token.mjs')) main();
