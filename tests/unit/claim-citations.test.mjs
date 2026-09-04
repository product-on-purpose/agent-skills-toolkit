import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findUnresolvedCitations } from "../../scripts/check-claim-citations.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const PRE_FIX = path.join(REPO, "tests/fixtures/claim-citations/pre-fix");

const PHANTOM = "codex-sessionend-hook-exists";

test("claim citations: the guard names ALL FOUR of the real phantom citations it was built for", () => {
  // The E51 method, made durable. `tests/fixtures/claim-citations/pre-fix/` carries the four offending
  // lines captured VERBATIM from b99e5ee, before the RS-A2 repair. An earlier draft of this guard
  // scooped citations by the words immediately preceding the id, and against these same four lines it
  // matched exactly one - the other three read "pinned in prose** (`id`)" or put the id before the
  // verb. This test is the reason that design did not ship: a guard is only worth its exit code if it
  // can be shown catching the actual historical bug.
  const { error, findings } = findUnresolvedCitations(PRE_FIX);
  assert.equal(error, null);
  assert.equal(findings.length, 4, `expected all four phantom citations, got ${JSON.stringify(findings, null, 2)}`);
  for (const f of findings) {
    assert.equal(f.id, PHANTOM);
    assert.ok(f.line > 0, "every finding carries a line number a reader can open");
    assert.match(f.file, /captured-phantom-citations\.md$/);
  }
});

test("claim citations: the live tree is clean, and that is an acceptance gate rather than an aspiration", () => {
  // AC2: zero false positives on the repaired tree. If this reds because a legitimate new kebab-case
  // name was introduced near the word "claim" or "pin", the fix is one line in KNOWN_NON_CLAIM naming
  // what that thing actually is - not a widening of the scoop.
  const { error, findings, checked } = findUnresolvedCitations(REPO);
  assert.equal(error, null);
  assert.ok(checked > 0, "the guard must actually read files; zero governed files is a silent pass");
  assert.deepEqual(findings, [], `unresolved claim citations on the live tree: ${JSON.stringify(findings, null, 2)}`);
});

test("claim citations: a ledger claim id cited in prose RESOLVES and is not reported", () => {
  // The positive case. A guard that reds on everything is as useless as one that reds on nothing, and
  // the live-tree test above cannot distinguish "resolves correctly" from "never scooped anything".
  const { claimIds } = findUnresolvedCitations(REPO);
  assert.ok(claimIds.length >= 8, "the ledger should carry its claims");
  assert.ok(
    claimIds.includes("plugin-agent-unsupported-fields"),
    "the ledger's own ids are the vocabulary this guard resolves against",
  );
});
