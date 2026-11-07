import { test } from 'node:test';
import assert from 'node:assert/strict';
import { to24ths, scoreBrief, outcome, meanDeltas } from './score.mjs';

const run = (error = null) => ({ score: 0.5, error });
const aCase = (name, score, scoreWithout, overrides = {}) => ({
  name,
  arms: { with: [run(), run(), run()], without: [run(), run(), run()] },
  aggregates: { score, scoreWithout },
  ...overrides,
});
const suite = (cases, partial = false) => ({ partial, cases });
const ten = (score, scoreWithout) =>
  Array.from({ length: 10 }, (_, i) => aCase(`case-${String(i + 1).padStart(2, '0')}`, score, scoreWithout));

test('to24ths accepts multiples of 1/24 and refuses anything else', () => {
  assert.equal(to24ths(0.75), 18);
  assert.equal(to24ths(1 / 12), 2);
  assert.equal(to24ths(0.1), null);
  assert.equal(to24ths(undefined), null);
});

test('a difference of exactly 0.25 is not a win, and the next step up is', () => {
  // The baseline is 0.25 in both arms, so exactly 0.25 above it is 0.5.
  const exact = scoreBrief({ toolkit: suite(ten(0.5, 0.25)), 'skill-creator': suite(ten(0.25, 0.25)) });
  assert.equal(exact.wins.toolkit, 0);
  const above = scoreBrief({ toolkit: suite(ten(7 / 12, 0.25)), 'skill-creator': suite(ten(0.25, 0.25)) });
  assert.equal(above.wins.toolkit, 10);
});

test('the pooled baseline is the mean of both arms, compared exactly', () => {
  // Baselines 1/12 and 2/12 pool to 1/8. A score of 3/8 is exactly 0.25 above, so it is no win.
  const atEdge = aCase('case-01', 3 / 8, 1 / 12);
  const other = aCase('case-01', 0, 2 / 12);
  const brief = scoreBrief({ toolkit: suite([atEdge]), 'skill-creator': suite([other]) });
  assert.equal(brief.cases[0].baseline, 1 / 8);
  assert.equal(brief.cases[0].win.toolkit, false);
});

test('a pooled baseline of exactly 0.75 makes the case invalid, and just below keeps it valid', () => {
  const at = scoreBrief({ toolkit: suite([aCase('c', 1, 0.75)]), 'skill-creator': suite([aCase('c', 1, 0.75)]) });
  assert.equal(at.cases[0].valid, false);
  const below = scoreBrief({ toolkit: suite([aCase('c', 1, 8 / 12)]), 'skill-creator': suite([aCase('c', 1, 9 / 12)]) });
  assert.equal(below.cases[0].valid, true);
});

test('a run error invalidates the case in both arms and never counts as a loss', () => {
  const broken = aCase('case-01', 1, 0);
  broken.arms.without[1] = run('timeout');
  const cases = [broken, ...ten(1, 0).slice(1)];
  const brief = scoreBrief({ toolkit: suite(cases), 'skill-creator': suite(ten(0, 0)) });
  assert.equal(brief.cases[0].valid, false);
  assert.equal(brief.validCases, 9);
  assert.equal(brief.wins.toolkit, 9);
});

test('a partial suite invalidates every case in the brief', () => {
  const brief = scoreBrief({ toolkit: suite(ten(1, 0), true), 'skill-creator': suite(ten(0, 0)) });
  assert.equal(brief.valid, false);
  assert.equal(brief.validCases, 0);
  assert.equal(brief.winner, null);
});

test('a score that is not a multiple of 1/24 is reported as malformed', () => {
  const brief = scoreBrief({ toolkit: suite([aCase('c', 0.1, 0)]), 'skill-creator': suite([aCase('c', 0, 0)]) });
  assert.match(brief.cases[0].reason, /malformed/);
});

test('a missing arm invalidates the brief, so a broken build cannot hand over a win', () => {
  const brief = scoreBrief({ toolkit: suite(ten(1, 0)) });
  assert.equal(brief.valid, false);
  assert.equal(brief.winner, null);
});

test('seven valid cases make an invalid brief, and eight make a valid one', () => {
  const withErrors = (count) =>
    ten(1, 0).map((c, i) => (i < count ? { ...c, arms: { ...c.arms, with: [run('x')] } } : c));
  assert.equal(scoreBrief({ toolkit: suite(withErrors(3)), 'skill-creator': suite(ten(0, 0)) }).valid, false);
  assert.equal(scoreBrief({ toolkit: suite(withErrors(2)), 'skill-creator': suite(ten(0, 0)) }).valid, true);
});

test('a brief win needs a margin of two cases', () => {
  const mixed = (winners) => ten(0, 0).map((c, i) => (i < winners ? aCase(c.name, 1, 0) : c));
  const byOne = scoreBrief({ toolkit: suite(mixed(1)), 'skill-creator': suite(ten(0, 0)) });
  assert.equal(byOne.winner, 'tie');
  const byTwo = scoreBrief({ toolkit: suite(mixed(2)), 'skill-creator': suite(ten(0, 0)) });
  assert.equal(byTwo.winner, 'toolkit');
  const other = scoreBrief({ toolkit: suite(ten(0, 0)), 'skill-creator': suite(mixed(2)) });
  assert.equal(other.winner, 'skill-creator');
});

test('the outcome is R1, R2 or R3 as section 9 fixes them', () => {
  const b = (valid, winner) => ({ valid, winner });
  assert.equal(outcome({ a: b(true, 'toolkit'), b: b(true, 'toolkit'), c: b(false, null) }).result, 'R1');
  assert.equal(outcome({ a: b(true, 'toolkit'), b: b(true, 'tie'), c: b(true, 'tie') }).result, 'R2');
  assert.equal(outcome({ a: b(true, 'skill-creator'), b: b(true, 'skill-creator'), c: b(true, 'toolkit') }).result, 'R2');
  assert.equal(outcome({ a: b(true, 'toolkit'), b: b(false, null), c: b(false, null) }).result, 'R3');
  assert.equal(outcome({ a: b(false, null), b: b(false, null), c: b(false, null) }).result, 'R3');
});

test('mean deltas measure each arm against the pooled baseline, for the R4 finding', () => {
  const brief = scoreBrief({ toolkit: suite(ten(0.25, 0.5)), 'skill-creator': suite(ten(0.5, 0.5)) });
  const deltas = meanDeltas(brief);
  assert.equal(deltas.toolkit, -0.25);
  assert.equal(deltas['skill-creator'], 0);
});
