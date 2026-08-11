// what-it-is:   tag-reachability guard (Finding 2, v1.11.0 pre-release adversarial review, high)
// what-it-does: verifies a commit is an ancestor of a base ref (default "origin/main") using
//               `git merge-base --is-ancestor`; fails closed - "proved unreachable" and "cannot
//               prove reachable" (unknown revision, shallow history, git error) get the identical
//               refuse-to-publish outcome, never a default-to-trusting-the-input outcome
// why:          .github/workflows/publish-npm.yml checks out whatever tag workflow_dispatch names
//               and only verifies that four version strings inside it agree with the tag - it never
//               proves the tagged commit is reachable from protected `main`. A collaborator who can
//               push a tag and dispatch Actions, but cannot merge to main, could tag an unmerged
//               commit that edits the package AND the tests AND the gate so everything agrees with
//               itself, and publish it - branch protection on `main` never enters the picture. This
//               script is the proof that closes that gap.
// used-by:      .github/workflows/publish-npm.yml (the "Verify tag is reachable from main" step,
//               run after tag-format validation, before npm ci and before any live publish; the
//               checkout step it follows uses fetch-depth: 0 plus an explicit `git fetch origin
//               main`, so the history this walks is actually complete)
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
