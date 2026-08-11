// what-it-is:   release-tag format guard (Finding 1, v1.11.0 pre-release adversarial review, CRITICAL)
// what-it-does: validates a workflow_dispatch-supplied tag string against a strict "vX.Y.Z" pattern
//               and fails closed on anything else, including the shell metacharacters a script-
//               injection payload needs (quotes, semicolons, backticks, "$(...)")
// why:          .github/workflows/publish-npm.yml used to interpolate `${{ inputs.tag }}` directly
//               into a `run:` block's Bash. GitHub Actions expands that expression into literal
//               source text BEFORE Bash ever parses the line, so a tag crafted with shell
//               metacharacters terminated the intended assignment and ran as arbitrary commands -
//               in a job that held `id-token: write`, reachable even with `dry_run: true` since the
//               dry-run guard sits downstream of the injection point. The fix has three parts, of
//               which this script is the second:
//                 1. the workflow now passes the input through a step/job `env:` mapping and
//                    references it as a shell variable ("$TAG"), so the value is always DATA to
//                    Bash, never source text (see the workflow's own comments and job-level env);
//                 2. this script then validates that value against a strict allowlist pattern
//                    before anything downstream trusts it as a real release tag, so even a value
//                    that now reaches Bash safely still cannot mean "not actually a release tag";
//                 3. `id-token: write` moved to a separate job that only the live-publish path
//                    uses, behind a required-reviewer environment.
// used-by:      .github/workflows/publish-npm.yml (the "Validate release tag format" step, run
//               right after checkout + Node setup, before npm ci, the version guard, tests, the
//               gate, or the tag-ancestry check)

// Exact match against the four version-bearing manifests' own format (package.json, library.json,
// .claude-plugin/plugin.json, .codex-plugin/plugin.json all carry a bare "X.Y.Z" semver string with
// no pre-release or build-metadata suffix - see the workflow's own "Guard - tag must equal every
// version-bearing manifest" step). No wildcard, no optional suffix, anchored at both ends: an
// allowlist this narrow cannot match anything a legitimate release tag would not already look like,
// so "reject anything that is not an exact expected semver tag shape" is met by construction rather
// than by trying to enumerate what to reject.
const RELEASE_TAG_RE = /^v\d+\.\d+\.\d+$/;

/** True when `tag` is exactly "v" followed by a three-part numeric semver, nothing else - no
 *  surrounding whitespace, no pre-release/build suffix, no shell metacharacters of any kind. */
export function isValidReleaseTag(tag) {
  return typeof tag === "string" && RELEASE_TAG_RE.test(tag);
}

function main() {
  const tag = process.argv[2] ?? "";
  if (!isValidReleaseTag(tag)) {
    process.stderr.write(
      `verify-release-tag: "${tag}" is not a valid release tag; expected exactly "vX.Y.Z" ` +
      `(e.g. v1.11.0), nothing more. Refusing to check out, build, test, or publish anything for ` +
      `this input.\n`
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`verify-release-tag: OK ("${tag}" matches vX.Y.Z)\n`);
}

// Guarded like every other CLI entry point in this repo (check.mjs, check-release-counts.mjs, ...):
// main() runs only when invoked as a script, never on import, so tests can exercise
// isValidReleaseTag directly without spawning a process.
if (process.argv[1]?.endsWith("verify-release-tag.mjs")) {
  main();
}
