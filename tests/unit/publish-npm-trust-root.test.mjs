import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

// Round-2 regression, v1.11.0 pre-release adversarial review (CRITICAL). The round-1 fix checked out
// the candidate tag BEFORE running either verifier, so a collaborator who can push a tag and dispatch
// Actions, but cannot merge to main, could tag an unmerged commit whose scripts/verify-release-tag.mjs
// and scripts/verify-tag-ancestry.mjs had been replaced with stubs that always report success - the
// workflow would then run those stubs against themselves. This test builds that exact attack commit in
// a real scratch git repository, materializes it as two real, separate directories on disk (mirroring
// publish-npm.yml's trust-root/ and candidate/ checkouts via `git worktree add`), and proves two
// things: the stub is a genuine working payload when run from the candidate's own tree, and the fixed
// order defeats it anyway because main's real code - never the candidate's - is what makes the call.
//
// This is the regression case the reviewer asked for: "without it the fix is another assertion."

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function commitAll(dir, message) {
  execFileSync("git", ["add", "-A"], { cwd: dir });
  git(
    ["-c", "user.email=test@example.com", "-c", "user.name=askit test", "-c", "commit.gpgsign=false",
      "commit", "-q", "-m", message],
    dir
  );
  return git(["rev-parse", "HEAD"], dir);
}

// A stub verifier that always reports success, regardless of what it is asked to check - the actual
// shape of a candidate-controlled replacement that would defeat a self-referential gate.
const STUB_ALWAYS_OK = [
  "// attack payload: always reports success, regardless of input",
  'process.stdout.write("stub: OK (always)\\n");',
  "process.exitCode = 0;",
  "",
].join("\n");

function makeManifests(dir, version) {
  mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  mkdirSync(path.join(dir, ".codex-plugin"), { recursive: true });
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ version }), "utf8");
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ version }), "utf8");
  writeFileSync(path.join(dir, ".claude-plugin/plugin.json"), JSON.stringify({ version }), "utf8");
  writeFileSync(path.join(dir, ".codex-plugin/plugin.json"), JSON.stringify({ version }), "utf8");
}

test("candidate-controlled stub verifiers cannot bypass the ancestry gate when main's code runs the check", () => {
  // main: the real verifiers, copied from this repo's own working tree (the actual code under
  // test, not a re-implementation of it).
  const origin = mkdtempSync(path.join(os.tmpdir(), "askit-trust-root-origin-"));
  git(["init", "-q", "-b", "main"], origin);
  mkdirSync(path.join(origin, "scripts"), { recursive: true });
  cpSync(path.join(ROOT, "scripts/verify-release-tag.mjs"), path.join(origin, "scripts/verify-release-tag.mjs"));
  cpSync(path.join(ROOT, "scripts/verify-tag-ancestry.mjs"), path.join(origin, "scripts/verify-tag-ancestry.mjs"));
  const mainTip = commitAll(origin, "main: real verifiers");

  // An unmerged branch, never merged into main: the attack commit. Both verifiers are replaced
  // with stubs that always succeed, then tagged - exactly like a real release candidate.
  git(["checkout", "-q", "-b", "attack", "main"], origin);
  writeFileSync(path.join(origin, "scripts/verify-release-tag.mjs"), STUB_ALWAYS_OK, "utf8");
  writeFileSync(path.join(origin, "scripts/verify-tag-ancestry.mjs"), STUB_ALWAYS_OK, "utf8");
  const maliciousSha = commitAll(origin, "attack: stub out both verifiers");
  git(["tag", "v9.9.9", maliciousSha], origin);
  git(["checkout", "-q", "main"], origin);

  // Materialize the two real, separate checkouts publish-npm.yml now produces.
  // Detached checkouts (by commit sha, not branch name) so both worktrees can coexist alongside
  // `origin` itself, which already has "main" checked out - git refuses to check out the same
  // BRANCH into two worktrees at once, but a commit sha in detached HEAD state has no such lock.
  const workDir = mkdtempSync(path.join(os.tmpdir(), "askit-trust-root-work-"));
  const trustRoot = path.join(workDir, "trust-root");
  const candidate = path.join(workDir, "candidate");
  git(["worktree", "add", "-q", trustRoot, mainTip], origin);
  git(["worktree", "add", "-q", candidate, maliciousSha], origin);

  // Sanity: the stub, run from the CANDIDATE's own checked-out tree, wrongly reports success. If
  // this assertion fails, the "attack" is a strawman that could never have fooled anything.
  const stubRun = spawnSync(
    process.execPath,
    [path.join(candidate, "scripts/verify-tag-ancestry.mjs"), maliciousSha, "main"],
    { cwd: candidate, encoding: "utf8" }
  );
  assert.equal(stubRun.status, 0, "the stub must be a working payload that would have wrongly passed");
  assert.match(stubRun.stdout, /stub: OK/);

  // The fixed order: resolve the tag to a sha and run main's real ancestry check from trust-root -
  // never the candidate's tree - against that sha.
  const resolvedSha = git(["rev-parse", "refs/tags/v9.9.9^{commit}"], trustRoot);
  assert.equal(resolvedSha, maliciousSha);

  const formatCheck = spawnSync(
    process.execPath,
    [path.join(trustRoot, "scripts/verify-release-tag.mjs"), "v9.9.9"],
    { cwd: trustRoot, encoding: "utf8" }
  );
  assert.equal(formatCheck.status, 0, "main's real format check should accept a well-formed tag string");

  const realCheck = spawnSync(
    process.execPath,
    [path.join(trustRoot, "scripts/verify-tag-ancestry.mjs"), resolvedSha, "main"],
    { cwd: trustRoot, encoding: "utf8" }
  );
  assert.equal(
    realCheck.status,
    1,
    "main's real verifier must refuse an unmerged commit even though the candidate shipped a stub that would have said OK"
  );
  assert.match(realCheck.stderr, /refusing to publish/i);
  assert.match(realCheck.stderr, /branch protection/i);
});

test("the manifest-agreement guard, run from main's own copy against the candidate's files, still catches a real mismatch even when the candidate's own copy of the script is stubbed", () => {
  const origin = mkdtempSync(path.join(os.tmpdir(), "askit-trust-root-manifest-origin-"));
  git(["init", "-q", "-b", "main"], origin);
  mkdirSync(path.join(origin, "scripts"), { recursive: true });
  cpSync(path.join(ROOT, "scripts/verify-tag-matches-manifests.mjs"), path.join(origin, "scripts/verify-tag-matches-manifests.mjs"));
  makeManifests(origin, "1.11.0");
  const mainTip = commitAll(origin, "main: real manifest guard");

  git(["checkout", "-q", "-b", "attack", "main"], origin);
  // The candidate's own copy of the guard is stubbed to always say OK...
  writeFileSync(path.join(origin, "scripts/verify-tag-matches-manifests.mjs"), STUB_ALWAYS_OK, "utf8");
  // ...but the candidate's actual manifests still disagree with the tag it is about to be
  // published under - exactly the drift this guard exists to catch.
  makeManifests(origin, "1.0.0");
  const maliciousSha = commitAll(origin, "attack: stub the manifest guard, leave versions stale");
  git(["tag", "v9.9.9", maliciousSha], origin);
  git(["checkout", "-q", "main"], origin);

  const workDir = mkdtempSync(path.join(os.tmpdir(), "askit-trust-root-manifest-work-"));
  const trustRoot = path.join(workDir, "trust-root");
  const candidate = path.join(workDir, "candidate");
  git(["worktree", "add", "-q", trustRoot, mainTip], origin);
  git(["worktree", "add", "-q", candidate, maliciousSha], origin);

  // The candidate's own stub, run standalone, wrongly reports success.
  const stubRun = spawnSync(
    process.execPath,
    [path.join(candidate, "scripts/verify-tag-matches-manifests.mjs"), "v9.9.9", candidate],
    { encoding: "utf8" }
  );
  assert.equal(stubRun.status, 0, "the stub must be a working payload");

  // main's real script, pointed at the candidate's files via the root argument, still catches it.
  const realCheck = spawnSync(
    process.execPath,
    [path.join(trustRoot, "scripts/verify-tag-matches-manifests.mjs"), "v9.9.9", candidate],
    { encoding: "utf8" }
  );
  assert.equal(realCheck.status, 1, "main's real guard must catch the mismatch even though the candidate's own copy is stubbed");
  assert.match(realCheck.stderr, /package\.json/);
});
