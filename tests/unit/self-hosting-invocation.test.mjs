import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { check as g2, executableText } from "../../scripts/checks/self-hosting.mjs";

/** A throwaway plugin root with one workflow and an optional package.json scripts block. */
function plugin(workflow, scripts) {
  const root = mkdtempSync(path.join(tmpdir(), "askit-g2-"));
  mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
  writeFileSync(path.join(root, ".github", "workflows", "ci.yml"), workflow);
  if (scripts) writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts }));
  return { root };
}

const passes = (wf, scripts) => g2(plugin(wf, scripts)).length === 0;
const wf = (runLine) => `name: ci\njobs:\n  build:\n    steps:\n${runLine}\n`;

// ---------------------------------------------------------------------------------------------
// AC1. The mention cases. E56's documented survivor first - this exact line satisfied a GOLD check.
// ---------------------------------------------------------------------------------------------

test("RS-B3/E56: the documented survivor no longer passes", () => {
  // Verbatim from the backlog entry. Before this change it returned zero findings.
  assert.equal(passes(wf(`    - run: echo "we should add npx agent-skills-toolkit one day"`)), false);
});

test("RS-B3: a gate path mentioned inside an echo does not pass", () => {
  assert.equal(passes(wf(`    - run: echo "one day we should run node scripts/check.mjs here"`)), false);
});

test("RS-B3: printf and print are printers too", () => {
  for (const cmd of ["printf", "print"]) {
    assert.equal(passes(wf(`    - run: ${cmd} "npx agent-skills-toolkit"`)), false, `${cmd} passed`);
  }
});

test("RS-B3: a REAL invocation whose path is quoted still passes - the false positive that was caught", () => {
  // This is product-lifecycle-templates' actual gate step, and it is CORRECT CI. A first version of this
  // tightening blanked every quoted run and moved this member from passing to failing. Quoted paths are
  // ubiquitous in CI, so that rule broke correct plugins to catch a contrived one. Pinned here so the
  // rule cannot come back.
  assert.equal(
    passes(wf(`    - run: node "$RUNNER_TEMP/toolkit/scripts/check.mjs" "$GITHUB_WORKSPACE"`)),
    true
  );
});

test("RS-B3: a gate spelling inside a non-printer's quoted argument is a KNOWN, accepted gap", () => {
  // Asserted as a gap rather than left unstated. The only rule that closed it also erased genuine quoted
  // invocations (the test above), and a false FAIL against a correct plugin costs more than a contrived
  // false PASS. If a future change closes this, it must keep the test above green.
  assert.equal(passes(wf(`    - run: node -e "console.log('npx agent-skills-toolkit')"`)), true);
});

test("RS-B3: a mention after a connector is still a mention", () => {
  assert.equal(passes(wf(`    - run: npm ci && echo "npx agent-skills-toolkit soon"`)), false);
});

// ---------------------------------------------------------------------------------------------
// AC2. Real invocations must still pass - at line start, after a connector, and via an npm script.
// A narrowing that broke these would be worse than the false pass it fixes.
// ---------------------------------------------------------------------------------------------

test("RS-B3: npx at line start still passes", () => {
  assert.equal(passes(wf(`    - run: npx agent-skills-toolkit .`)), true);
});

test("RS-B3: the vendored gate still passes", () => {
  assert.equal(passes(wf(`    - run: node scripts/check.mjs`)), true);
});

test("RS-B3: an invocation after && still passes", () => {
  assert.equal(passes(wf(`    - run: npm ci && node scripts/check.mjs`)), true);
});

test("RS-B3: an invocation after a semicolon and after a pipe still passes", () => {
  assert.equal(passes(wf(`    - run: npm ci ; npx agent-skills-toolkit .`)), true);
  assert.equal(passes(wf(`    - run: cat x | npx agent-skills-toolkit .`)), true);
});

test("RS-B3: a fully-quoted YAML scalar is unwrapped, not blanked", () => {
  // `run: "node scripts/check.mjs"` is YAML quoting, not shell string-building. Blanking it would fail a
  // plugin whose CI is correct, which is the expensive direction of this change's risk.
  assert.equal(passes(wf(`    - run: "node scripts/check.mjs"`)), true);
  assert.equal(passes(wf(`    - run: 'npx agent-skills-toolkit .'`)), true);
});

test("RS-B3: the published Action still passes", () => {
  assert.equal(passes(wf(`    - uses: product-on-purpose/agent-skills-toolkit@v1`)), true);
});

test("RS-B3: an npm script that resolves to the gate still passes", () => {
  assert.equal(passes(wf(`    - run: npm test`), { test: "node scripts/check.mjs" }), true);
});

test("RS-B3: the installed bin handed the whole run: value still passes", () => {
  assert.equal(passes(wf(`    - run: agent-skills-toolkit`)), true);
});

// ---------------------------------------------------------------------------------------------
// AC3. Proven able to fail: the anti-fixtures must depend on the tightening, not pass by accident.
// ---------------------------------------------------------------------------------------------

test("RS-B3: restoring mention-anywhere behaviour makes every anti-fixture pass again", () => {
  // The old behaviour was "match the spelling anywhere in the stripped text". If these anti-fixtures
  // passed under the OLD rule too, they would prove nothing about the change. Reconstructed here rather
  // than asserted from memory.
  const NPX = /\bnpx\s+(?:-{1,2}[\w-]+(?:[= ][\w.-]+)?\s+)*agent-skills-toolkit(?:@[\w.^~><=+-]+)?(?![\w-])/;
  const GATE_PATH = /scripts\/check\.mjs(?![\w.])/;
  const oldWouldPass = (text) => NPX.test(text) || GATE_PATH.test(text);

  const antiFixtures = [
    `    - run: echo "we should add npx agent-skills-toolkit one day"`,
    `    - run: echo "one day we should run node scripts/check.mjs here"`,
    `    - run: npm ci && echo "npx agent-skills-toolkit soon"`,
  ];
  for (const line of antiFixtures) {
    assert.equal(oldWouldPass(line), true, `anti-fixture would not have passed the OLD rule: ${line}`);
    assert.equal(passes(wf(line)), false, `anti-fixture passes the NEW rule: ${line}`);
  }
});

// ---------------------------------------------------------------------------------------------
// The migration contract and the honest limits.
// ---------------------------------------------------------------------------------------------

test("RS-B3: the finding is warn-capped until 0.17, and only the mention finding is", () => {
  const out = g2(plugin(wf(`    - run: echo "npx agent-skills-toolkit"`)));
  assert.equal(out.length, 1);
  assert.equal(out[0].migration?.capAt, "warn");
  assert.equal(out[0].migration?.until, "0.17");

  // "no workflow at all" is NOT a tightening - it has always been an error - so it must carry no cap,
  // or every workflow-less plugin gets a free revision.
  const bare = mkdtempSync(path.join(tmpdir(), "askit-g2-bare-"));
  const none = g2({ root: bare });
  assert.equal(none.length, 1);
  // finding() normalizes an absent migration to null rather than leaving it undefined.
  assert.equal(none[0].migration ?? null, null, "the no-workflow finding must not be capped");
});

test("RS-B3: the docblock states the limits rather than implying completeness", () => {
  // A narrowing that claimed to close the category would be the unfalsifiable promise this repository
  // grades other tools on. The named gaps are real and must stay named.
  const src = readFileSync(new URL("../../scripts/checks/self-hosting.mjs", import.meta.url), "utf8");
  const lower = src.toLowerCase();
  for (const limit of ["heredoc", "continuation", "substitution", "indirection"]) {
    assert.ok(lower.includes(limit), `the KNOWN LIMITS list no longer names ${limit}`);
  }
  assert.ok(lower.includes("not a shell parser"), "the docblock must not imply full shell parsing");
});
