import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import { extractSection } from "../../scripts/lib/release-notes-section.mjs";
import { GATES } from "../../scripts/lib/release-ready.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const CLI = path.join(REPO, "scripts/check-release-notes-section.mjs");
const FIX = path.join(REPO, "tests/fixtures/release-notes-section");

/** Run the gate CLI the way release-ready runs it: a child process, judged by its exit status. */
function runGate(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: REPO, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

// ---------------------------------------------------------------------------------------------
// Proven able to fail, against the real historical defect - not a hand-written approximation of it.
// ---------------------------------------------------------------------------------------------

test("E57: the gate REDS on the tree exactly as v1.17.1 was tagged and published", () => {
  // tests/fixtures/release-notes-section/pre-fix/ is captured verbatim from 754bb68~1 - the tree that
  // was tagged, approved and served from npm as 1.17.1 while its notes heading read a literal printf
  // placeholder, because the script that wrote the entry never applied its own string formatting.
  // `release-ready` passed all five gates immediately before that tag. This gate is the sixth, and
  // this test is the whole reason to believe it: a release gate is worth its exit code only if it can
  // be shown refusing the release that actually got through.
  const { code, out } = runGate(["--root", path.join(FIX, "pre-fix")]);
  assert.equal(code, 1, `expected the gate to refuse the tagged tree; got exit ${code}\n${out}`);
  assert.match(out, /no RELEASE-NOTES\.md section for 1\.17\.1/);
  assert.match(out, /before tagging/, "the message must say WHEN to fix it, since the whole defect is timing");
});

test("E57: the gate PASSES on the same tree once the heading is repaired", () => {
  // The passing case gets a fixture too. A guard demonstrated only on its failing input has not been
  // shown to DISTINGUISH anything - it has been shown to say no. These two fixtures differ in exactly
  // one line, which is what makes the pair evidence rather than two unrelated assertions.
  const { code, out } = runGate(["--root", path.join(FIX, "repaired")]);
  assert.equal(code, 0, `expected the repaired tree to pass; got exit ${code}\n${out}`);
  assert.match(out, /carries a section for 1\.17\.1/);
});

test("E57: the two fixtures differ ONLY in the heading line", () => {
  const a = readFileSync(path.join(FIX, "pre-fix/RELEASE-NOTES.md"), "utf8").split(/\r?\n/);
  const b = readFileSync(path.join(FIX, "repaired/RELEASE-NOTES.md"), "utf8").split(/\r?\n/);
  assert.equal(a.length, b.length);
  const differing = a.map((l, i) => (l === b[i] ? null : i)).filter((i) => i !== null);
  assert.deepEqual(differing, [4], "exactly one line may differ, and it must be the version heading");
  assert.equal(b[4], "## 1.17.1 - 2026-09-01");
});

// ---------------------------------------------------------------------------------------------
// The extraction itself - the half release.yml used to hold in awk.
// ---------------------------------------------------------------------------------------------

test("the section is the heading plus its body, and STOPS at the next version heading", () => {
  const notes = readFileSync(path.join(FIX, "repaired/RELEASE-NOTES.md"), "utf8");
  const { found, text } = extractSection(notes, "1.17.1");
  assert.equal(found, true);
  assert.ok(text.startsWith("## 1.17.1 - 2026-09-01"), "the heading is part of the section");
  assert.ok(!text.includes("## 1.17.0"), "the next version's heading terminates the section");
  assert.ok(text.includes("Three defects in the records are fixed"), "the body travels with the heading");
});

test("an absent version is not found, rather than silently returning the whole file", () => {
  const notes = readFileSync(path.join(FIX, "repaired/RELEASE-NOTES.md"), "utf8");
  const { found, text } = extractSection(notes, "9.9.9");
  assert.equal(found, false);
  assert.equal(text, "", "an empty result is what makes the caller's non-empty-file check equivalent");
});

test("1.17.1 does not match a 1.17.10 heading", () => {
  // The trailing space in the heading-plus-space form is load-bearing. Without it every 1.17.1 request
  // would match the first 1.17.1x section it met and publish the wrong release's notes.
  const notes = "# Release notes\n\n## 1.17.10 - 2026-12-01\n\nA later release.\n";
  assert.equal(extractSection(notes, "1.17.1").found, false);
  assert.equal(extractSection(notes, "1.17.10").found, true);
});

test("CRLF and LF notes extract the same section", () => {
  // A notes file authored on Windows must extract on a Linux runner exactly as it does locally.
  const lf = "# Notes\n\n## 1.0.0 - 2026-01-01\n\nBody.\n\n## 0.9.0 - 2025-12-01\n\nOld.\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  assert.deepEqual(extractSection(crlf, "1.0.0"), extractSection(lf, "1.0.0"));
  assert.ok(!extractSection(crlf, "1.0.0").text.includes("\r"), "the extracted body carries no CR");
});

test("--extract writes the section to --out, and refuses without it", () => {
  // Written to the OS temp dir, never into tests/fixtures/: a test that drops an untracked file into a
  // tracked directory turns every later `git status` into a false positive.
  const outFile = path.join(tmpdir(), `askit-release-body-${process.pid}.md`);
  const ok = runGate(["--root", path.join(FIX, "repaired"), "--extract", "1.17.1", "--out", outFile]);
  assert.equal(ok.code, 0, ok.out);
  const body = readFileSync(outFile, "utf8");
  assert.ok(body.startsWith("## 1.17.1 - 2026-09-01"));
  assert.ok(!body.includes("## 1.17.0"));

  // --out is REQUIRED, so a failing run's ::error:: annotation can never be swallowed by a caller's
  // stdout redirect. The awk this replaced wrote the body to stdout and the error to stdout too.
  const bad = runGate(["--root", path.join(FIX, "repaired"), "--extract", "1.17.1"]);
  assert.equal(bad.code, 2, bad.out);
  assert.match(bad.out, /--extract requires --out/);
});

test("the gate FAILS CLOSED when the notes file cannot be read", () => {
  // A run that proved nothing is not a pass - the same rule every other release gate follows.
  const { code, out } = runGate(["--root", path.join(FIX, "no-such-directory")]);
  assert.equal(code, 1, `expected fail-closed; got ${code}\n${out}`);
  assert.match(out, /::error::/);
});

// ---------------------------------------------------------------------------------------------
// The wiring. E57's defect was not the rule - the rule was correct. It was WHERE the rule lived.
// ---------------------------------------------------------------------------------------------

test("E57: the gate is registered in release-ready, or it runs before nothing", () => {
  const g = GATES.find((x) => x.id === "release-notes-section");
  assert.ok(g, `expected a release-notes-section gate; got ${GATES.map((x) => x.id).join(", ")}`);
  assert.deepEqual(g.argv, ["scripts/check-release-notes-section.mjs"]);
  assert.ok(!g.overridableCodes, "nothing this gate reads is on somebody else's server, so no outage can excuse it");
});

test("E57: release.yml INVOKES the extractor and holds no extraction logic of its own", () => {
  // Standard sec 4.1/4.4: CI configuration must contain no validation logic of its own; it must only
  // invoke the portable scripts. The awk program that used to sit here decided whether a release could
  // publish, which is precisely such logic - and being in YAML it was unreachable from the gate that
  // runs before the tag. Both halves are asserted, because removing the awk WITHOUT wiring the script
  // would delete the second line of defence rather than move it.
  const text = readFileSync(path.join(REPO, ".github/workflows/release.yml"), "utf8");
  assert.ok(text.includes("check-release-notes-section.mjs"), "release.yml must invoke the portable script");
  assert.ok(!text.includes("awk -v ver="), "the extraction must not live in the workflow any more");

  const doc = parseYaml(text);
  const steps = doc.jobs.release.steps;
  const extractIdx = steps.findIndex((s) => JSON.stringify(s).includes("check-release-notes-section.mjs"));
  const createIdx = steps.findIndex((s) => JSON.stringify(s).includes("action-gh-release"));
  assert.ok(extractIdx !== -1, "no step invokes the extractor");
  assert.ok(createIdx !== -1, "no step creates the release");
  assert.ok(extractIdx < createIdx, "the refusal must still come before the release is created");
});

test("E57: both callers reach the SAME decision, because there is only one implementation", () => {
  // Two implementations of "find this version's section" is how they drift, and a pre-tag gate that
  // disagrees with the post-tag refusal is worse than neither: it certifies a tag the next step
  // rejects. Asserted by running the gate and the extractor over one tree and requiring agreement.
  for (const [dir, expected] of [["pre-fix", 1], ["repaired", 0]]) {
    const root = path.join(FIX, dir);
    const gate = runGate(["--root", root]);
    const notes = readFileSync(path.join(root, "RELEASE-NOTES.md"), "utf8");
    const version = JSON.parse(readFileSync(path.join(root, "library.json"), "utf8")).version;
    const direct = extractSection(notes, version);
    assert.equal(gate.code, expected, `${dir}: gate exit`);
    assert.equal(direct.found, expected === 0, `${dir}: the extractor must agree with the gate`);
  }
});
