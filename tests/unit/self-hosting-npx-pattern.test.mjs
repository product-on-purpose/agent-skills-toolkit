import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { check } from "../../scripts/checks/self-hosting.mjs";

// Pins the shape of G2's npx matcher (scripts/checks/self-hosting.mjs NPX_GATE). The original pattern
// backtracked exponentially: `-{1,2}` and `[\w-]+` both accepted hyphens, and a dash-led token could be
// read either as a flag or as the previous flag's value, so a run line of 40 `--a` tokens that never
// names the package made check() run forever. It also failed to match a real invocation whose flag
// value carried `/` or `:` (`npx --registry=https://x agent-skills-toolkit .`). Every case here builds
// its workflow in a temp dir, so nothing adversarial is committed to the fixtures tree.

function withWorkflow(runLine, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-g2-npx-"));
  try {
    mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(
      path.join(dir, ".github", "workflows", "ci.yml"),
      `name: CI\non: [push]\njobs:\n  grade:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v7\n      - run: ${runLine}\n`,
    );
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "g2-npx-fixture", version: "1.0.0", tier: "advanced" }));
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a run line of many dash-led tokens that never names the package is graded promptly and fails G2", () => {
  for (const count of [40, 400]) {
    const runLine = "npx " + "--a ".repeat(count) + "nope";
    withWorkflow(runLine, (root) => {
      const t0 = performance.now();
      const findings = check({ root });
      const ms = performance.now() - t0;
      assert.ok(ms < 500, `check() took ${ms.toFixed(0)} ms on ${count} tokens; the npx matcher is backtracking again`);
      assert.equal(findings.length, 1, "a workflow that runs `nope` does not run the gate");
      assert.match(findings[0].message, /none runs the conformance gate/);
      assert.equal(findings[0].reqId, "G2");
    });
  }
});

test("real npx invocations of the gate satisfy G2, including a flag whose value holds a URL", () => {
  const invocations = [
    "npx --registry=https://registry.npmjs.org agent-skills-toolkit .",
    "npx --registry https://registry.npmjs.org agent-skills-toolkit .",
    "npx --yes agent-skills-toolkit .",
    "npx -y agent-skills-toolkit .",
    "npx -y -- agent-skills-toolkit .",
    "npx agent-skills-toolkit@1.18.0 .",
    "npx agent-skills-toolkit .",
  ];
  for (const runLine of invocations) {
    withWorkflow(runLine, (root) => {
      assert.deepEqual(check({ root }), [], `expected no G2 finding for: ${runLine}`);
    });
  }
});

test("installing the package is still not running the gate", () => {
  withWorkflow("npm install agent-skills-toolkit", (root) => {
    const findings = check({ root });
    assert.equal(findings.length, 1, "npm install runs nothing");
    assert.match(findings[0].message, /none runs the conformance gate/);
  });
});

test("a different package run through npx with the toolkit's name as an argument is not the gate", () => {
  withWorkflow("npx some-other-linter agent-skills-toolkit .", (root) => {
    assert.equal(check({ root }).length, 1, "only flags may sit between npx and the package name");
  });
});
