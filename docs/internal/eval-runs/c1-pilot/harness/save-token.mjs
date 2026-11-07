// Saves the container sign-in where the harness can pass it to podman, without showing it anywhere.
//
//   node docs/internal/eval-runs/c1-pilot/harness/save-token.mjs
//
// Paste the token that `claude setup-token` printed. The input is hidden. The file is written to the
// home folder, outside this repository, and the harness only ever passes its path to `podman --env-file`.

import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const path = join(homedir(), '.c1-pilot.env');

process.stdout.write('Paste the token and press Enter (the input is hidden): ');
process.stdin.setEncoding('utf8');
if (process.stdin.isTTY) process.stdin.setRawMode(true);

let token = '';
process.stdin.on('data', (chunk) => {
  for (const character of chunk) {
    if (character === '\u0003') process.exit(130);
    if (character === '\r' || character === '\n') {
      const clean = token.trim();
      if (!clean.startsWith('sk-ant-')) {
        console.error('\nThat does not look like a token from `claude setup-token`. Nothing was saved.');
        process.exit(1);
      }
      writeFileSync(path, `CLAUDE_CODE_OAUTH_TOKEN=${clean}\n`, { mode: 0o600 });
      console.log(`\nSaved to ${path}.`);
      process.exit(0);
    }
    if (character === '\u007f' || character === '\b') token = token.slice(0, -1);
    else token += character;
  }
});
