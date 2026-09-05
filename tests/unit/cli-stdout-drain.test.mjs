import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

// Proves a CLI's stdout is never cut short when it is piped. check.mjs and evaluate.mjs used to call
// process.exit(code) right after console.log(bigString). When stdout is a pipe, Node writes to it
// asynchronously on POSIX, so the process exited before the write queue had drained and the consumer
// received one pipe buffer (65536 bytes): `node scripts/check.mjs <plugin> --json | jq` failed to parse
// while `> file` held the whole document. The fix sets process.exitCode and lets the process end on
// its own, which is only safe because nothing runs after the output is written.
//
// The fixture is generated rather than committed: 400 skills whose SKILL.md each carries two dead
// relative links, so U6 alone emits 800 errors and every output mode comfortably exceeds 100 KB.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = path.join(ROOT, "scripts", "check.mjs");
const EVALUATE = path.join(ROOT, "scripts", "evaluate.mjs");
const PIPE_BUFFER = 65536;
const SKILLS = 400;

function buildBigPlugin() {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-drain-"));
  writeFileSync(
    path.join(dir, "library.json"),
    JSON.stringify({
      name: "drain-fixture",
      version: "0.1.0",
      description: "A generated fixture whose gate output exceeds one pipe buffer. Use it to prove piped stdout drains.",
      standard: "0.15",
      tier: "universal",
    }),
  );
  writeFileSync(path.join(dir, "AGENTS.md"), "# drain-fixture\n\nA generated fixture.\n");
  for (let i = 0; i < SKILLS; i++) {
    const name = `drain-skill-${String(i).padStart(3, "0")}`;
    const skillDir = path.join(dir, "skills", name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      path.join(skillDir, "SKILL.md"),
      `---\nname: ${name}\ndescription: Exercises the gate's piped output with dead links. Use when proving stdout drains before exit.\n---\n\n# ${name}\n\n` +
        `See [the missing guide](./reference/missing-guide-for-${name}.md) and ` +
        `[the missing checklist](./reference/missing-checklist-for-${name}.md).\n`,
    );
  }
  return dir;
}

// stdio: "pipe" is the point: a pipe is what a shell `|` or a CI log collector hands the process.
function runPiped(script, dir, args) {
  return spawnSync(process.execPath, [script, dir, ...args], { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

let dir;
before(() => { dir = buildBigPlugin(); });
after(() => { rmSync(dir, { recursive: true, force: true }); });

test("check.mjs --json drains a piped stdout larger than one pipe buffer", () => {
  const r = runPiped(CHECK, dir, ["--json"]);
  assert.equal(r.stderr, "", `no stderr expected, got: ${r.stderr}`);
  assert.ok(Buffer.byteLength(r.stdout) > PIPE_BUFFER, `--json output must exceed ${PIPE_BUFFER} bytes to prove anything, got ${Buffer.byteLength(r.stdout)}`);
  let report;
  assert.doesNotThrow(() => { report = JSON.parse(r.stdout); }, `--json stdout was cut short at ${Buffer.byteLength(r.stdout)} bytes and no longer parses`);
  assert.ok(report.findings.filter((f) => f.reqId === "U6").length >= 2 * SKILLS, "every dead link reached the consumer");
  assert.equal(report.exitCode, 1, "the fixture must actually fail the gate");
  assert.equal(r.status, 1, "the gate exit code survives the switch to process.exitCode");
});

test("check.mjs --sarif drains a piped stdout larger than one pipe buffer", () => {
  const r = runPiped(CHECK, dir, ["--sarif"]);
  assert.ok(Buffer.byteLength(r.stdout) > PIPE_BUFFER, `--sarif output must exceed ${PIPE_BUFFER} bytes, got ${Buffer.byteLength(r.stdout)}`);
  let doc;
  assert.doesNotThrow(() => { doc = JSON.parse(r.stdout); }, `--sarif stdout was cut short at ${Buffer.byteLength(r.stdout)} bytes and no longer parses`);
  assert.ok(doc.runs[0].results.length >= 2 * SKILLS, "every dead link reached the SARIF consumer");
  assert.equal(r.status, 1);
});

test("check.mjs text output drains a piped stdout larger than one pipe buffer, ending with its summary line", () => {
  const r = runPiped(CHECK, dir, []);
  assert.ok(Buffer.byteLength(r.stdout) > PIPE_BUFFER, `text output must exceed ${PIPE_BUFFER} bytes, got ${Buffer.byteLength(r.stdout)}`);
  // The summary line is written after every finding line, so its presence at the very end is the
  // proof that nothing before it was dropped either.
  assert.match(r.stdout, /\n\d+ error\(s\), \d+ warning\(s\)\.\n$/, "the human output must end with its summary line");
  assert.equal(r.status, 1);
});

test("evaluate.mjs --format=json drains a piped stdout larger than one pipe buffer", () => {
  const r = runPiped(EVALUATE, dir, ["--format=json"]);
  assert.ok(Buffer.byteLength(r.stdout) > PIPE_BUFFER, `the report must exceed ${PIPE_BUFFER} bytes, got ${Buffer.byteLength(r.stdout)}`);
  let report;
  assert.doesNotThrow(() => { report = JSON.parse(r.stdout); }, `evaluate stdout was cut short at ${Buffer.byteLength(r.stdout)} bytes and no longer parses`);
  assert.equal(report.scope, "plugin");
  assert.ok(report.findings.filter((f) => f.reqId === "U6").length >= 2 * SKILLS, "every dead link reached the consumer");
  assert.equal(r.status, 1, "the gate exit code survives the switch to process.exitCode");
});
