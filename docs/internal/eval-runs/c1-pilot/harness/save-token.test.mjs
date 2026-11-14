import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanToken, tokenProblem } from './save-token.mjs';

const fake = `sk-ant-${'x'.repeat(100)}`;

test('a token wrapped across lines is joined back together', () => {
  const wrapped = `${fake.slice(0, 40)}\r\n  ${fake.slice(40, 80)}\n${fake.slice(80)}`;
  assert.equal(cleanToken(wrapped), fake);
});

test('a truncated token is refused, and the reason does not repeat it', () => {
  const problem = tokenProblem(fake.slice(0, 40));
  assert.match(problem, /too short/);
  assert.equal(problem.includes('xxxx'), false);
});

test('a stray character inside a token is refused, and a space from wrapping is removed first', () => {
  const stray = `${fake.slice(0, 50)}|${fake.slice(50)}`;
  assert.match(tokenProblem(cleanToken(stray)), /1 character\(s\)/);
  const spaced = `${fake.slice(0, 50)} ${fake.slice(50)}`;
  assert.equal(tokenProblem(cleanToken(spaced)), null);
});

test('a text that is not a token is refused, and a whole token is accepted', () => {
  assert.match(tokenProblem('hello'), /does not start/);
  assert.equal(tokenProblem(fake), null);
});
