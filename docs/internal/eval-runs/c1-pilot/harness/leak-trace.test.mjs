import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NETWORK, parseEntries, classify, firstOrigin, toolCalls } from './leak-trace.mjs';

const line = (o) => JSON.stringify(o);
const transcript = [
  line({ type: 'user', message: { content: 'Build a skill named demo.' } }),
  line({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'cat > evals/a/prompt.md <<EOF\nalter table payments\nEOF' } }] } }),
  line({ type: 'user', message: { content: [{ type: 'tool_result', content: 'read back: secret_table_name' }] } }),
  line({ type: 'system', subtype: 'echo', text: 'secret_table_name alter table payments' }),
].join('\n');

test('an entry is authored, read or prompt by who produced it, and system echoes are not origins', () => {
  const list = parseEntries(transcript);
  assert.deepEqual(list.map(({ e }) => classify(e)), ['prompt', 'authored', 'read', null]);
});

test('firstOrigin names the first producer: model-written text is authored, a tool result is read', () => {
  const list = parseEntries(transcript);
  assert.deepEqual(firstOrigin(list, 'alter table payments'), { line: 1, kind: 'authored' });
  assert.deepEqual(firstOrigin(list, 'secret_table_name'), { line: 2, kind: 'read' });
  assert.equal(firstOrigin(list, 'never written'), null);
});

test('the network pattern catches fetch clients and ignores the English word "requests."', () => {
  for (const cmd of ['curl -s https://x', 'wget x', 'git clone x', 'gh api repos', 'python -c "import requests; requests.get(u)"', 'npm view pkg']) {
    assert.match(cmd, NETWORK, cmd);
  }
  for (const prose of ['Rate limiting of reset requests. EOF', 'a burst of retry requests. About 12,000', 'git status', 'npm test']) {
    assert.doesNotMatch(prose, NETWORK, prose);
  }
});

test('toolCalls lists each tool call, with Bash shown as its command', () => {
  assert.deepEqual(toolCalls(parseEntries(transcript)).map((c) => c.name), ['Bash']);
  assert.match(toolCalls(parseEntries(transcript))[0].text, /^cat > evals/);
});
