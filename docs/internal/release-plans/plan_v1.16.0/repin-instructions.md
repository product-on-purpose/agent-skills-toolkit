# Marketplace re-pin instructions, v1.16.0

> **APPLIED 2026-08-24** via [agent-plugins PR #83](https://github.com/product-on-purpose/agent-plugins/pull/83),
> registry `metadata.version` 1.67.0 to **1.68.0**. The maintainer waived the boundary rule below for this
> re-pin and directed this program to execute it; the steps are kept as written rather than rewritten in the
> past tense, because the record of what was staged is the point. Verified after merge by reading the LIVE
> registry: entry sha `87108ba`, version `1.16.0`, `strict: true`, five other members untouched, and the
> plugin manifest at that pinned ref reads `1.16.0`.

**Boundary rule: this program never writes to `agent-plugins`.** These steps are staged for the
maintainer to apply in the maintainer's own repository. The orchestrator wrote this file and
performed the read-only verification at the bottom; it executed none of steps 1 through 6.

## The values, read live on 2026-08-22

| | current | set to |
| --- | --- | --- |
| `plugins[].source.sha` | `9133014e25006adb629ac7767af65b1b5136c8e5` | `87108ba182f420a734b14135c781465668fa7798` |
| `plugins[].version` | `1.15.0` | `1.16.0` |
| `metadata.version` | `1.67.0` | `1.68.0` (re-read first, see step 3) |

Note the sha is **nested under `source`**, not a top-level key on the entry.

**Leave `description` alone.** The registry's copy ends "Follows the agentskills.io specification."
where `library.json`'s ends differently. That tail is a marketplace-wide house convention carried by
every entry (`pm-skills` has it too), not drift to be corrected.

## Steps

1. **Isolated clone.**

   ```bash
   git clone https://github.com/product-on-purpose/agent-plugins.git E:/tmp/agent-plugins-repin-v1.16.0
   cd E:/tmp/agent-plugins-repin-v1.16.0
   git checkout -b chore/repin-askit-v1.16.0
   ```

2. **Edit the marketplace entry.** In `.claude-plugin/marketplace.json`, find the
   `agent-skills-toolkit` entry and set `source.sha` and `version` per the table above.

3. **Re-read `metadata.version` before bumping it.** It increments on any member re-pin, not only
   askit re-pins, so it is never a reliable `+1` from the last askit value. It read `1.67.0` when
   this file was written; confirm that is still true, then increment by one.

   ```bash
   gh api repos/product-on-purpose/agent-plugins/contents/.claude-plugin/marketplace.json \
     -q .content | base64 -d | jq '.metadata.version'
   ```

4. **Add the registry CHANGELOG entry** recording this re-pin against the new `metadata.version`.
   Past re-pins left gaps that needed backfilling in v1.5.0 and v1.5.2; keep the record complete.

5. **Validate.**

   ```bash
   export GITHUB_TOKEN=$(gh auth token) && node scripts/validate-registry.mjs
   ```

6. **Publish.** Push the branch, open a PR against `product-on-purpose/agent-plugins`, and merge once
   `validate-registry` is green.

7. **Smoke-verify, only after the re-pin PR merges.**

   ```bash
   gh api repos/product-on-purpose/agent-plugins/contents/.claude-plugin/marketplace.json \
     | jq -r '.content' | base64 -d \
     | jq '.plugins[] | select(.name=="agent-skills-toolkit") | {sha: .source.sha, version}'
   # must print 87108ba182f420a734b14135c781465668fa7798 and "1.16.0"

   gh api "repos/product-on-purpose/agent-skills-toolkit/contents/.claude-plugin/plugin.json?ref=87108ba182f420a734b14135c781465668fa7798" \
     | jq -r '.content' | base64 -d | jq '.version'
   # must print "1.16.0"
   ```

## Already verified by this program (read-only)

Everything upstream of the re-pin is done and was checked from published state, not from the local
clone:

- **Tag live at the right commit.** `git ls-remote origin refs/tags/v1.16.0` returns
  `87108ba182f420a734b14135c781465668fa7798`.
- **GitHub release live and Latest.** `releases/latest` returns `v1.16.0`; draft `false`,
  prerelease `false`. The published body carries the `### One thing worth re-reading` section naming
  `U14` through `U17`.
- **npm published.** Registry reports `1.16.0`, `dist-tags.latest` = `1.16.0`. Trusted publishing
  (OIDC), no stored credential.
- **Published artifact smoke-tested outside the repository.** Installed into a clean directory from
  the registry: the binary reports `1.16.0`, the shipped `README.md` carries the corrected
  `U1-U9`, `U11-U17` / "16 checks", and the gate run from the published artifact grades this
  repository **Advanced, 0 errors, 0 warnings**.
- **Tarball contents confirmed.** 72 files, 212 kB. All nine maintainer-only libraries are absent,
  including the new `check-doc-enumerations.mjs`, which is a maintainer guard and not part of the
  gate a consumer runs.
- **Current registry pin is still v1.15.0**, as expected until step 6 is applied.

## Why the tag is not at the release PR's commit

Step 5 of the choreography says to tag the squashed commit of the release PR, which was #275
(`1fe6afc`). The tag is at `87108ba` instead, two commits later, because #276 and #277 corrected ten
stale check-spine claims across eight public files and recorded that correction in the release notes.
Tagging `1fe6afc` would have published the stale claims to npm and to the GitHub release, which is
the exact defect those PRs existed to remove. All four version-bearing manifests read `1.16.0` at
`87108ba`, and `release-ready` passed there before the tag was cut.
