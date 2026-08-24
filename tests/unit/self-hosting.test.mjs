import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/self-hosting.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("meta declares G2 advanced", () => {
  assert.equal(meta.reqId, "G2");
  assert.equal(meta.tier, "advanced");
});

test("a plugin with no CI workflow is a G2 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill")));
  assert.ok(r.some((f) => f.reqId === "G2" && /no CI workflow/.test(f.message)));
});

test("ci-comment-only fixture: the gate mentioned only in a YAML comment does NOT count (G2 error)", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/ci-comment-only")));
  assert.ok(r.some((f) => f.reqId === "G2" && /none runs the conformance gate/.test(f.message)));
});

test("ci-npm-gate fixture: a workflow running the gate via `npm run check` passes (no false positive)", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/ci-npm-gate"))), []);
});

test("the toolkit ships CI that runs the gate -> no G2 findings", () => {
  assert.deepEqual(check(loadPlugin(REPO_ROOT)), []);
});

// --- the npx and Action forms of the same gate ------------------------------------------------------
//
// G2 used to recognise ONE spelling: the literal path scripts/check.mjs, or an npm script resolving to
// it. Both require a VENDORED copy of this toolkit. A plugin that installed the documented way - npm or
// the plugin marketplace - has no scripts/ directory, so the only command it can run in CI was the one
// G2 refused, and Gold was unreachable for it. STANDARD.md sec 2.6 asks for CI that runs the check
// suite "via the portable scripts"; npx runs exactly those scripts from the published package, and the
// GitHub Action runs check.mjs out of its own checkout. All three are the same gate.
//
// This is E35 one level up: "a remediation naming a command its reader does not have", fixed for
// gen-index at v1.13.0 and never swept into G2. library.json's selfValidation enum, whose ABSENT value
// means "npx" and is documented as correct for any plugin that consumes rather than vendors a toolkit,
// had no effect here at all.

test("ci-npx-gate fixture: a workflow running the gate via npx passes G2", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/ci-npx-gate")));
  assert.deepEqual(r, [], "a plugin that installed the documented way must be able to reach Gold");
});

test("ci-action-gate fixture: a workflow using this repository's own GitHub Action passes G2", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/ci-action-gate")));
  assert.deepEqual(r, [], "the Action runs check.mjs from its own checkout - it is the same gate");
});

test("ci-install-only fixture: INSTALLING the package is not RUNNING the gate (G2 error)", () => {
  // The guard on the fix above. Widening the matcher must not let a workflow that merely mentions the
  // package name count as self-hosting CI - the same false-PASS the comment-stripping rule prevents.
  const r = check(loadPlugin(path.join(FIXTURES, "anti/ci-install-only")));
  assert.equal(r.length, 1, "npm install agent-skills-toolkit runs nothing");
});

// --- the contract the reference page states, pinned -------------------------------------------------
//
// The four-lens review before the v1.16.1 cut found the docs and the code disagreeing in two directions:
// gold-checks.md named only `product-on-purpose` as the Action owner while the matcher accepts any, and
// it did not mention the installed bin at all though the matcher accepts that too. Both forms are
// deliberate, so they are pinned here rather than narrowed away.

test("an agent-skills-toolkit Action from ANY owner counts (a fork runs the same gate)", () => {
  // Deliberate, and consistent with the form that predates this: GATE_PATH accepts any
  // scripts/check.mjs, including one the plugin wrote itself. G2 asks whether CI is wired to a
  // conformance gate, not whose copy of it.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-g2-"));
  try {
    mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(path.join(dir, ".github", "workflows", "ci.yml"),
      "jobs:\n  a:\n    steps:\n      - uses: someone-else/agent-skills-toolkit@v1\n");
    writeFileSync(path.join(dir, "library.json"), '{"name":"x","version":"1.0.0","tier":"advanced"}');
    assert.deepEqual(check(loadPlugin(dir)), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the installed bin on a run: line counts, but the same name inside an install line does not", () => {
  const mk = (cmd) => {
    const dir = mkdtempSync(path.join(tmpdir(), "askit-g2-"));
    mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(path.join(dir, ".github", "workflows", "ci.yml"), `jobs:\n  a:\n    steps:\n      - run: ${cmd}\n`);
    writeFileSync(path.join(dir, "library.json"), '{"name":"x","version":"1.0.0","tier":"advanced"}');
    return dir;
  };
  const ok = mk("agent-skills-toolkit ."), no = mk("npm install agent-skills-toolkit");
  try {
    assert.deepEqual(check(loadPlugin(ok)), [], "invoking the bin is running the gate");
    assert.equal(check(loadPlugin(no)).length, 1, "installing it is not");
  } finally {
    rmSync(ok, { recursive: true, force: true }); rmSync(no, { recursive: true, force: true });
  }
});
