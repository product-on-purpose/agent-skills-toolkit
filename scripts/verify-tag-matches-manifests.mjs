// what-it-is:   tag/version-manifest agreement guard
// what-it-does: strips a leading "v" from a release tag and checks it equals the `version` field of
//               all four version-bearing manifests (package.json, library.json,
//               .claude-plugin/plugin.json, .codex-plugin/plugin.json), collecting every
//               disagreement rather than stopping at the first
// why:          publish-npm.yml checks out a commit that already passed tag-format validation
//               (scripts/verify-release-tag.mjs) and the tag-ancestry check
//               (scripts/verify-tag-ancestry.mjs), but must still refuse to publish if a maintainer
//               bumped a version file after tagging, or tagged before bumping it. This was
//               previously an inline `run:` block in publish-npm.yml (correct logic, wrong home per
//               Standard sec 4.4: "the CI configuration MUST contain no validation logic of its
//               own; it MUST only invoke the portable scripts"). Pulled out to match that rule, the
//               same way check-readme-version.mjs and check-release-counts.mjs already do for their
//               own guards.
// note:         release.yml runs the identical comparison at GitHub-release time, as its own inline
//               `run:` block. That duplication is real and pre-existing; unifying the two was
//               judged out of scope here because release.yml was not one of the files this pass
//               touched (see the v1.11.0 pre-release adversarial-review fix for publish-npm.yml and
//               deploy-pages.yml) - flagged rather than silently left unmentioned.
// used-by:      .github/workflows/publish-npm.yml (the "Guard - tag must equal every version-
//               bearing manifest" step, after npm ci, before the test suite)
import { readFileSync } from "node:fs";
import path from "node:path";

export const MANIFESTS = [
  "package.json",
  "library.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
];

/**
 * Compare `tag` (a "vX.Y.Z" string, or already-stripped "X.Y.Z") against every file in MANIFESTS
 * under `root`. Returns `{ stripped, checks }`, where each check is `{ file, ok, detail }`:
 * `detail` is the agreeing version string when `ok`, or a human-readable reason (mismatch, missing
 * file, unparseable JSON, missing "version" field) when not. Never throws - a manifest this cannot
 * read is reported as a failing check, the same fail-closed shape every other check in this repo
 * uses, rather than crashing the caller.
 */
export function verifyTagMatchesManifests(tag, root = process.cwd()) {
  const stripped = String(tag ?? "").replace(/^v/, "");
  const checks = MANIFESTS.map((file) => {
    const abs = path.join(root, file);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(abs, "utf8"));
    } catch (e) {
      return { file, ok: false, detail: `could not read/parse: ${e.message}` };
    }
    if (!parsed.version) return { file, ok: false, detail: `has no "version" field` };
    if (parsed.version !== stripped) {
      return { file, ok: false, detail: `version ${parsed.version} does not match tag ${stripped}` };
    }
    return { file, ok: true, detail: parsed.version };
  });
  return { stripped, checks };
}

function main() {
  const tag = process.argv[2] ?? "";
  const root = process.argv[3] ? path.resolve(process.argv[3]) : process.cwd();
  const { stripped, checks } = verifyTagMatchesManifests(tag, root);
  const failures = checks.filter((c) => !c.ok);
  for (const c of checks) {
    if (c.ok) process.stdout.write(`ok: ${c.file} = ${c.detail}\n`);
    else process.stderr.write(`::error file=${c.file}::${c.detail}\n`);
  }
  if (failures.length > 0) {
    process.stderr.write(
      `verify-tag-matches-manifests: tag/version mismatch (tag ${stripped}); aborting before publishing anything\n`
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`verify-tag-matches-manifests: OK (all ${checks.length} manifests agree with tag ${stripped})\n`);
}

// Guarded like every other CLI entry point in this repo: main() runs only when invoked as a
// script, never on import, so tests can exercise verifyTagMatchesManifests against fixture
// directories without spawning a process.
if (process.argv[1]?.endsWith("verify-tag-matches-manifests.mjs")) {
  main();
}
