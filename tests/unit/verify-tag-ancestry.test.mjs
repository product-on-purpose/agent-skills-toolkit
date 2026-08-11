import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { isAncestorOfMain } from "../../scripts/verify-tag-ancestry.mjs";

// v1.11.0 pre-release adversarial review, Finding 2 (high): publish-npm.yml checked out whatever tag
// workflow_dispatch named and only verified that four version strings agreed with the tag - never
// that the tagged commit is reachable from protected `main`. A collaborator who can push a tag and
// dispatch Actions, but cannot merge to main, could tag an unmerged commit, make its versions agree
// with itself, and publish it, bypassing branch protection entirely. This is the guard that closes
// that gap: the checked-out commit must be a proven ancestor of main before any live publish.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/verify-tag-ancestry.mjs");

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function commit(dir, file, message) {
  execFileSync("git", ["add", "-A"], { cwd: dir });
  git(
    ["-c", "user.email=test@example.com", "-c", "user.name=askit test", "-c", "commit.gpgsign=false",
      "commit", "-q", "-m", message],
    dir
  );
  return git(["rev-parse", "HEAD"], dir);
}

/** A scratch repo with:
 *    main:      root -- tip          (two commits on main)
 *    unmerged:  root -- stray        (branches off root, never merged into main)
 *  Mirrors the real shape: a commit reachable from main, and a commit that is not, sharing a
 *  common ancestor so an "is-ancestor" check has something real to distinguish. */
function makeScratchRepo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-tag-ancestry-"));
  git(["init", "-q", "-b", "main"], dir);
  execFileSync(process.execPath, ["-e", "require('fs').writeFileSync('root.txt','root')"], { cwd: dir });
  const root = commit(dir, "root.txt", "root commit");
  execFileSync(process.execPath, ["-e", "require('fs').writeFileSync('tip.txt','tip')"], { cwd: dir });
  const tip = commit(dir, "tip.txt", "main tip");
  git(["checkout", "-q", "-b", "unmerged", root], dir);
  execFileSync(process.execPath, ["-e", "require('fs').writeFileSync('stray.txt','stray')"], { cwd: dir });
  const stray = commit(dir, "stray.txt", "unmerged commit");
  git(["checkout", "-q", "main"], dir);
  return { dir, root, tip, stray };
}

// --- isAncestorOfMain ---

test("a commit reachable from main IS an ancestor", () => {
  const { dir, root, tip } = makeScratchRepo();
  assert.equal(isAncestorOfMain(root, { cwd: dir, baseRef: "main" }), true);
  assert.equal(isAncestorOfMain(tip, { cwd: dir, baseRef: "main" }), true); // a tip is its own ancestor
});

test("a commit on an unmerged branch is NOT an ancestor", () => {
  const { dir, stray } = makeScratchRepo();
  assert.equal(isAncestorOfMain(stray, { cwd: dir, baseRef: "main" }), false);
});

test("an unknown revision fails closed (not proven reachable, not an error thrown)", () => {
  const { dir } = makeScratchRepo();
  assert.equal(isAncestorOfMain("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef", { cwd: dir, baseRef: "main" }), false);
});

test("an empty or non-string commit fails closed without shelling out", () => {
  const { dir } = makeScratchRepo();
  assert.equal(isAncestorOfMain("", { cwd: dir, baseRef: "main" }), false);
  assert.equal(isAncestorOfMain(undefined, { cwd: dir, baseRef: "main" }), false);
});

test("a non-git directory fails closed", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-tag-ancestry-nogit-"));
  assert.equal(isAncestorOfMain("HEAD", { cwd: dir, baseRef: "main" }), false);
});

// --- CLI behavior ---

test("CLI: exits 0 and prints OK for an in-main commit", () => {
  const { dir, root } = makeScratchRepo();
  const r = spawnSync(process.execPath, [SCRIPT, root, "main"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /OK \(".*" is an ancestor of "main"\)/);
});

test("CLI: exits 1 and refuses an unmerged commit, naming branch protection", () => {
  const { dir, stray } = makeScratchRepo();
  const r = spawnSync(process.execPath, [SCRIPT, stray, "main"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /refusing to publish/i);
  assert.match(r.stderr, /branch protection/i);
});

test("CLI: exits 1 with a usage message when no commit is given", () => {
  const { dir } = makeScratchRepo();
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /usage/i);
});
