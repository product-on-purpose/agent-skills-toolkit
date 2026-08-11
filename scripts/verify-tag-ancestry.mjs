// what-it-is:   tag-reachability guard (Finding 2, v1.11.0 pre-release adversarial review; round 1
//               "high", round 2 raised this to CRITICAL - see below)
// what-it-does: verifies a commit is an ancestor of a base ref (default "origin/main") using
//               `git merge-base --is-ancestor`; fails closed - "proved unreachable" and "cannot
//               prove reachable" (unknown revision, shallow history, git error) get the identical
//               refuse-to-publish outcome, never a default-to-trusting-the-input outcome
// why:          round 1: .github/workflows/publish-npm.yml checked out whatever tag workflow_dispatch
//               named and only verified that four version strings inside it agreed with the tag - it
//               never proved the tagged commit was reachable from protected `main`. A collaborator
//               who can push a tag and dispatch Actions, but cannot merge to main, could tag an
//               unmerged commit that edits the package AND the tests AND the gate so everything
//               agrees with itself, and publish it - branch protection on `main` never entered the
//               picture. This script's `isAncestorOfMain` function is the proof that closes that gap,
//               and that function has not changed since round 1.
//               round 2 (CRITICAL): what changed is WHERE this script runs from. Round 1 still
//               checked out the candidate tag before invoking this file, so the copy of this script
//               that ran the proof came from the very commit whose trust it was supposed to
//               establish - a malicious tag could ship a stub of this file that always exits 0, and
//               the workflow would run that stub against itself. The fix moved this script's
//               invocation to a checkout of protected `main` (a `trust-root/` directory), run before
//               the candidate is checked out at all, so the code making the ancestry decision is
//               always main's own reviewed copy, never the candidate's.
// used-by:      .github/workflows/publish-npm.yml, the "Verify tag is reachable from main (main's
//               code, before the candidate is ever checked out)" step - run from `trust-root/` (a
//               checkout of `main`, fetch-depth: 0, plus an explicit `git fetch origin main`, so the
//               history this walks is complete) against the tag's resolved commit sha, after
//               tag-format validation and tag-to-sha resolution, before the candidate is checked out,
//               before npm ci, and before any live publish
import { spawnSync } from "node:child_process";

/**
 * True only when `commit` is an ancestor of `baseRef` (default "origin/main") in the git
 * repository at `cwd` (default the current working directory). Any git failure - unknown
 * revision, shallow/incomplete history, `cwd` not a git repository at all - is treated as "not
 * proven reachable", never as "reachable"; a check that cannot answer the question must refuse,
 * not fall back to trusting the input.
 */
export function isAncestorOfMain(commit, { cwd = process.cwd(), baseRef = "origin/main" } = {}) {
  if (typeof commit !== "string" || commit.trim() === "") return false;
  const result = spawnSync("git", ["merge-base", "--is-ancestor", commit, baseRef], { cwd, encoding: "utf8" });
  if (result.error) return false;
  return result.status === 0;
}

function main() {
  const commit = process.argv[2] ?? "";
  const baseRef = process.argv[3] || "origin/main";
  if (!commit) {
    process.stderr.write(
      `verify-tag-ancestry: no commit given (usage: node verify-tag-ancestry.mjs <commit> [baseRef])\n`
    );
    process.exitCode = 1;
    return;
  }
  if (!isAncestorOfMain(commit, { baseRef })) {
    process.stderr.write(
      `verify-tag-ancestry: refusing to publish - commit "${commit}" is not a proven ancestor of ` +
      `"${baseRef}". A tag's version-bearing files can be made to agree with each other without the ` +
      `tagged commit ever having passed branch protection on main; this check exists to close exactly ` +
      `that gap. If this tag is a legitimate release, merge its commit to main first, then re-tag.\n`
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`verify-tag-ancestry: OK ("${commit}" is an ancestor of "${baseRef}")\n`);
}

// Guarded like every other CLI entry point in this repo: main() runs only when invoked as a
// script, never on import, so tests can exercise isAncestorOfMain against a real scratch repo
// without spawning a process wrapper around it.
if (process.argv[1]?.endsWith("verify-tag-ancestry.mjs")) {
  main();
}
