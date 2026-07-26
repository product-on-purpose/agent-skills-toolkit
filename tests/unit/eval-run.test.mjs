import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  EvalRunError, toPosix, resolvePosix, loadCorpus, resolveTarget, verifyPin, assertGradeable, planBatch, runOne,
} from "../../scripts/lib/eval-run.mjs";

// F2 (E11), the deterministic half of the eval-run pipeline. The three properties under test are the ones
// that made a hand-run untrustworthy: a tree that is NOT at the pinned sha must fail LOUDLY (the recorded
// Windows trap graded an empty directory and printed a clean pass), a Windows backslash target must be
// normalized to forward slashes BEFORE the gate sees it, and an at-pin run must leave the conformance
// report plus a record skeleton on disk. Plus the relocation ruling: no pipeline source may name the
// checker script - the gate is reached only through the `npm run check` seam.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SILVER = path.join(ROOT, "tests/fixtures/golden/silver-fixture");
const FIXED_NOW = new Date("2026-07-26T14:25:30Z");

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** A temp git repo holding a copy of a fixture plugin, committed once: a stand-in pinned clone. */
function makePinnedClone(fixtureAbs) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-evalrun-"));
  cpSync(fixtureAbs, dir, { recursive: true });
  git(["init", "-q", "-b", "main"], dir);
  git(["add", "-A"], dir);
  git([
    "-c", "user.email=test@example.com", "-c", "user.name=askit test", "-c", "commit.gpgsign=false",
    "commit", "-q", "-m", "pinned fixture",
  ], dir);
  return { dir, sha: git(["rev-parse", "HEAD"], dir) };
}

function entryFor({ dir, sha }, over = {}) {
  return {
    id: "fixture-plugin",
    repo: "https://github.com/example/fixture-plugin",
    sha,
    scope: "plugin",
    clonePath: dir,
    subpath: null,
    profile: "plain-plugin",
    notes: "test fixture",
    ...over,
  };
}

/** A seam stub: records every invocation and honors --out by writing a placeholder file. */
function stubSeam({ gateStdout = "\n0 error(s), 0 warning(s).\n", gateStatus = 0, json = { scope: "plugin", tier: "convergent", profile: "plain-plugin", summary: { errors: 0, warns: 0 } } } = {}) {
  const calls = [];
  const seam = ({ script, args, cwd }) => {
    calls.push({ script, args, cwd });
    const i = args.indexOf("--out");
    if (i >= 0) {
      const out = args[i + 1];
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, out.endsWith(".json") ? JSON.stringify(json) : "placeholder", "utf8");
      return { status: 0, stdout: "", stderr: `Wrote ${out}`, command: `npm run ${script} -- ${args.join(" ")}` };
    }
    return { status: gateStatus, stdout: gateStdout, stderr: "", command: `npm run ${script} -- ${args.join(" ")}` };
  };
  return { seam, calls };
}

function tmpOutDir() {
  return mkdtempSync(path.join(os.tmpdir(), "askit-evalrun-out-"));
}

// --- R-PIPE-2: the pin is verified, and a drifted / empty / missing tree fails LOUDLY ---

test("verifyPin refuses a clone that is not at the pinned sha", () => {
  const clone = makePinnedClone(SILVER);
  try {
    const e = entryFor(clone, { sha: "0".repeat(40) });
    assert.throws(() => verifyPin(e), (err) => {
      assert.ok(err instanceof EvalRunError, "a refusal is an EvalRunError, not a generic crash");
      assert.match(err.message, /REFUSED/);
      assert.match(err.message, /pinned sha/);
      assert.match(err.message, new RegExp(clone.sha.slice(0, 7)), "the refusal names the sha actually on disk");
      return true;
    });
  } finally {
    rmSync(clone.dir, { recursive: true, force: true });
  }
});

test("verifyPin refuses an EMPTY directory (the silent-empty-directory trap)", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-evalrun-empty-"));
  try {
    assert.throws(() => verifyPin(entryFor({ dir, sha: "0".repeat(40) })), /REFUSED[\s\S]*empty/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verifyPin refuses a clone path that does not exist", () => {
  const missing = path.join(os.tmpdir(), "askit-evalrun-does-not-exist-" + Date.now());
  assert.throws(() => verifyPin(entryFor({ dir: missing, sha: "0".repeat(40) })), /REFUSED[\s\S]*does not exist/i);
});

test("verifyPin refuses a non-git directory (nothing to verify the pin against)", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-evalrun-nogit-"));
  try {
    writeFileSync(path.join(dir, "README.md"), "not a repo", "utf8");
    assert.throws(() => verifyPin(entryFor({ dir, sha: "0".repeat(40) })), /REFUSED[\s\S]*not a git/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verifyPin refuses a dirty tree (drifted from the pin even when HEAD matches)", () => {
  const clone = makePinnedClone(SILVER);
  try {
    writeFileSync(path.join(clone.dir, "library.json"), "{ }", "utf8");
    assert.throws(() => verifyPin(entryFor(clone)), /REFUSED[\s\S]*uncommitted/i);
  } finally {
    rmSync(clone.dir, { recursive: true, force: true });
  }
});

test("verifyPin accepts the clone at the pin, and accepts a short-sha pin", () => {
  const clone = makePinnedClone(SILVER);
  try {
    assert.equal(verifyPin(entryFor(clone)).head, clone.sha);
    assert.equal(verifyPin(entryFor(clone, { sha: clone.sha.slice(0, 7) })).head, clone.sha);
  } finally {
    rmSync(clone.dir, { recursive: true, force: true });
  }
});

test("assertGradeable refuses a directory with no plugin or skill marker", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-evalrun-bare-"));
  try {
    writeFileSync(path.join(dir, "notes.txt"), "nothing gradeable here", "utf8");
    assert.throws(() => assertGradeable(dir), /REFUSED[\s\S]*library\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runOne on a not-at-pin clone refuses BEFORE it invokes the gate (no vacuous grade)", () => {
  const clone = makePinnedClone(SILVER);
  const out = tmpOutDir();
  const { seam, calls } = stubSeam();
  try {
    assert.throws(
      () => runOne(entryFor(clone, { sha: "0".repeat(40) }), { repoRoot: ROOT, outDir: out }, { seam, now: () => FIXED_NOW }),
      /REFUSED/
    );
    assert.equal(calls.length, 0, "the gate must never run against an unverified tree");
  } finally {
    rmSync(clone.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

// --- R-PIPE-2: Windows path normalization, asserted at the seam boundary ---

test("toPosix normalizes a Windows backslash path to forward slashes", () => {
  assert.equal(toPosix("E:\\tmp\\eval-deanpeters-pm"), "E:/tmp/eval-deanpeters-pm");
  assert.equal(toPosix("E:/tmp/eval-deanpeters-pm"), "E:/tmp/eval-deanpeters-pm");
});

// Caught by Linux CI, invisible on Windows: the separator swap has to happen BEFORE path.resolve.
// On POSIX a backslash is a legal FILENAME character, so resolving a backslash-written absolute path
// yields "<cwd>/" plus that literal name - one relative file - and a trailing toPosix() then launders
// it into a plausible-looking wrong answer. On Windows resolve() understands backslashes, so both
// orders agree and the defect hides. This assertion is platform-independent: on any OS, a path written
// with backslashes must resolve to exactly what its forward-slash twin resolves to.
const BS = String.fromCharCode(92); // a literal backslash, kept out of the source as an escape
test("resolvePosix normalizes separators BEFORE resolving, on every platform", () => {
  const pairs = [
    [`${BS}tmp${BS}askit`, "/tmp/askit"],
    [`a${BS}b${BS}c`, "a/b/c"],
    [`E:${BS}tmp${BS}x`, "E:/tmp/x"],
  ];
  for (const [back, fwd] of pairs) {
    assert.equal(resolvePosix(back), resolvePosix(fwd), `${back} must resolve like ${fwd}`);
  }
  assert.ok(!resolvePosix(`${BS}tmp${BS}askit`).includes(BS), "no backslash survives resolution");
});

test("runOne hands the gate a forward-slash target even when the manifest path uses backslashes", () => {
  const clone = makePinnedClone(SILVER);
  const out = tmpOutDir();
  const { seam, calls } = stubSeam();
  try {
    const backslashed = clone.dir.split("/").join("\\");
    const r = runOne(entryFor(clone, { clonePath: backslashed }), { repoRoot: ROOT, outDir: out, profile: "plain-plugin" }, { seam, now: () => FIXED_NOW });
    assert.ok(calls.length >= 1, "the gate seam ran");
    const gateCall = calls.find((c) => c.script === "check");
    assert.ok(gateCall, "the gate is invoked through the `check` npm script seam");
    const targetArg = gateCall.args[0];
    assert.ok(!targetArg.includes("\\"), `the target handed to the gate must carry no backslash: ${targetArg}`);
    assert.equal(targetArg, toPosix(clone.dir));
    assert.equal(r.skeleton.target.path, toPosix(clone.dir), "the skeleton records the normalized path");
  } finally {
    rmSync(clone.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("runOne refuses when the gate output carries no parseable verdict (a silent no-op)", () => {
  const clone = makePinnedClone(SILVER);
  const out = tmpOutDir();
  const { seam } = stubSeam({ gateStdout: "nothing useful here\n" });
  try {
    assert.throws(
      () => runOne(entryFor(clone), { repoRoot: ROOT, outDir: out }, { seam, now: () => FIXED_NOW }),
      /REFUSED[\s\S]*verdict/i
    );
  } finally {
    rmSync(clone.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

// --- R-PIPE-2 happy path, through the REAL `npm run` seam (no stub): report + record skeleton ---

test("runOne at the pin writes the conformance report and a record skeleton (real npm seam)", () => {
  const clone = makePinnedClone(SILVER);
  const out = tmpOutDir();
  try {
    const r = runOne(entryFor(clone), { repoRoot: ROOT, outDir: out, profile: "plain-plugin", reportType: "review" }, { now: () => FIXED_NOW });
    for (const key of ["html", "md", "json", "gateLog"]) {
      assert.ok(existsSync(r.outputs[key]), `${key} output written: ${r.outputs[key]}`);
    }
    assert.match(readFileSync(r.outputs.html, "utf8"), /<html|<!DOCTYPE|<section/i, "the HTML conformance report rendered");
    assert.ok(readFileSync(r.outputs.md, "utf8").length > 200, "the Markdown twin rendered");
    assert.ok(existsSync(r.skeletonPath), "a record skeleton was written");

    const sk = JSON.parse(readFileSync(r.skeletonPath, "utf8"));
    assert.equal(sk.runId, null, "the run id is assigned by the aggregator, not the runner");
    assert.equal(sk.scope, "plugin");
    assert.equal(sk.reportType, "review");
    assert.equal(sk.profile, "plain-plugin");
    assert.equal(sk.target.sha, clone.sha);
    assert.equal(sk.gate.errors, 0, "the silver fixture grades clean under plain-plugin");
    assert.equal(typeof sk.gate.warns, "number");
    assert.equal(sk.advisory.tokens, null, "the deterministic run makes no model call, so the advisory fields are pending");
    assert.ok(sk.bounds.length >= 1, "coverage bounds are recorded (R-PIPE-5)");
    assert.ok(sk.seamCommands.some((c) => /npm run check\b/.test(c)), `the gate ran through the npm seam: ${JSON.stringify(sk.seamCommands)}`);
    assert.ok(sk.outputs.pointer.includes(path.basename(out)) || sk.outputs.pointer.length > 0);
  } finally {
    rmSync(clone.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

// --- R-PIPE-5: any bound the pipeline applies is stated in the output ---

test("planBatch states what a --limit dropped instead of silently capping", () => {
  const entries = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const full = planBatch(entries, undefined);
  assert.equal(full.selected.length, 3);
  assert.equal(full.bounds.length, 0, "an unbounded batch declares no bound");

  const bounded = planBatch(entries, 2);
  assert.deepEqual(bounded.selected.map((e) => e.id), ["a", "b"]);
  assert.deepEqual(bounded.dropped.map((e) => e.id), ["c"]);
  assert.equal(bounded.bounds.length, 1);
  assert.match(bounded.bounds[0].stated, /2 of 3/);
  assert.match(bounded.bounds[0].stated, /\bc\b/, "the dropped target is named");
});

// --- R-PIPE-1: the tracked pinned-sha corpus manifest ---

test("the corpus manifest lists every reusable anchor with url + sha + scope + clone path", () => {
  const corpus = loadCorpus(ROOT);
  const byId = new Map(corpus.targets.map((t) => [t.id, t]));
  for (const [id, shaPrefix] of [
    ["anthropic-skills", "5754626"],
    ["lenny-skills", "280a57a"],
    ["deanpeters-pm", "70fb6c4"],
    ["phuryn-pm", "d384f0c"],
  ]) {
    const t = byId.get(id);
    assert.ok(t, `the manifest carries the ${id} anchor`);
    assert.ok(t.sha.startsWith(shaPrefix), `${id} is pinned at ${shaPrefix} (got ${t.sha})`);
    assert.match(t.repo, /^https:\/\/github\.com\//, `${id} carries its repo URL`);
    assert.ok(["plugin", "component", "collection", "marketplace-by-hand"].includes(t.scope), `${id} declares a scope (got ${t.scope})`);
    assert.ok(typeof t.clonePath === "string" && t.clonePath.length > 0, `${id} carries a local clone path`);
    assert.ok(!t.clonePath.includes("\\"), `${id} clone path is forward-slash normalized`);
  }
});

test("resolveTarget refuses an unknown id, and refuses a raw path with no pin", () => {
  const corpus = loadCorpus(ROOT);
  assert.throws(() => resolveTarget(corpus, "not-a-real-anchor"), /REFUSED[\s\S]*not in the corpus manifest/);
  assert.throws(() => resolveTarget(corpus, "./some/path"), /REFUSED[\s\S]*--sha/);
  const adhoc = resolveTarget(corpus, "./some/path", { sha: "abc1234" });
  assert.equal(adhoc.sha, "abc1234");
  assert.equal(adhoc.id, "path");
});

// --- the relocation ruling (R1 delta 1): the pipeline never names the checker script ---

test("no eval-run pipeline source hardcodes the checker script path", () => {
  const files = ["scripts/eval-run.mjs", "scripts/lib/eval-run.mjs", "scripts/lib/eval-run-aggregate.mjs"];
  for (const rel of files) {
    const text = readFileSync(path.join(ROOT, rel), "utf8");
    assert.ok(!/check\.mjs/.test(text), `${rel} must reach the gate through the npm run check seam, not a script path`);
  }
});

// --- the CLI surface: a refusal is loud (exit 2 + stderr), not a quiet zero ---

test("CLI eval-run.mjs exits 2 and prints the refusal when the clone is not at the pin", () => {
  const clone = makePinnedClone(SILVER);
  const manifestDir = mkdtempSync(path.join(os.tmpdir(), "askit-evalrun-manifest-"));
  const manifest = path.join(manifestDir, "corpus.json");
  writeFileSync(manifest, JSON.stringify({ schema: "askit-eval-corpus/1", targets: [entryFor(clone, { sha: "0".repeat(40) })] }), "utf8");
  try {
    const r = execFileSync(process.execPath, [
      path.join(ROOT, "scripts/eval-run.mjs"), "fixture-plugin", "--manifest", manifest,
    ], { encoding: "utf8", stdio: "pipe" });
    assert.fail(`expected a non-zero exit, got success:\n${r}`);
  } catch (e) {
    assert.equal(e.status, 2, `expected exit 2, got ${e.status}: ${e.stderr ?? ""}`);
    assert.match(String(e.stderr), /REFUSED[\s\S]*pinned sha/);
  } finally {
    rmSync(clone.dir, { recursive: true, force: true });
    rmSync(manifestDir, { recursive: true, force: true });
  }
});
