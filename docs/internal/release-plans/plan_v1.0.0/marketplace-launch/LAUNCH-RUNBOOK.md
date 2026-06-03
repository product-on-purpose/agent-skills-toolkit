# v1.0.0 launch runbook (maintainer-gated steps)

> The toolkit-side PR and the marketplace-side branch are both prepared. These are the remaining steps, which involve an **irreversible** tag + public release and branch-protected merges, so they are left to the maintainer. Run them in order: the registry cannot pin until the tag exists.

## Current state (2026-06-02)

- **Toolkit PR #84** (`release-v1.0.0` -> `main`): CI green (`validate` + `build-site`), mergeable.
- **Marketplace branch `add-agent-skills-toolkit`** is pushed to `product-on-purpose/agent-plugins` (commit `374cd8f`): it adds the `agent-skills-toolkit` entry with a `REPLACE_WITH_V1.0.0_TAG_SHA` placeholder, bumps `metadata.version` 1.2.0 -> 1.3.0, updates the README + CHANGELOG, and fixes the `CONTRIBUTING.md` source example. **No PR is open yet** (a PR would fail `validate-registry` on the placeholder); open it in Step 4 after filling the sha.

## Forced order

```
toolkit PR (green)  ->  merge to main  ->  tag v1.0.0 + push  ->  release.yml mints the GitHub release
                                                              ->  read tag sha  ->  fill into agent-plugins registry entry
                                                              ->  agent-plugins PR (green)  ->  merge  ->  listing live  ->  install smoke
```

## Step 1 - merge the toolkit release PR

- Repo: `product-on-purpose/agent-skills-toolkit`, **PR #84** (branch `release-v1.0.0`).
- Confirm `CI` (validate + build-site) is green (it is, as of 2026-06-02).
- Admin-squash merge to `main` (the repo's convention).

## Step 2 - cut the v1.0.0 tag (irreversible)

```bash
# from a fresh main after the merge
git checkout main && git pull
git tag v1.0.0            # annotate if you prefer: git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

- `release.yml` runs: the conformance gate, the version-consistency guard (tag must equal `package.json` / `library.json` / both native manifests), then publishes the GitHub release with notes extracted from `RELEASE-NOTES.md`.
- Verify the release appears at `https://github.com/product-on-purpose/agent-skills-toolkit/releases/tag/v1.0.0`.

## Step 3 - capture the tag commit sha

```bash
git rev-list -n1 v1.0.0
```

## Step 4 - finish + merge the agent-plugins registry PR

- Repo: `product-on-purpose/agent-plugins`, branch `add-agent-skills-toolkit` (already pushed to origin).
- In `.claude-plugin/marketplace.json`, replace the `REPLACE_WITH_V1.0.0_TAG_SHA` placeholder in the `agent-skills-toolkit` entry with the Step 3 sha.
- Validate locally (needs network + token for checks 5 and 7):
  ```bash
  GITHUB_TOKEN=$(gh auth token) node scripts/validate-registry.mjs   # expect exit 0
  ```
- Push, confirm `validate-registry` CI is green, merge.

## Step 5 - install smoke test

```text
/plugin marketplace add product-on-purpose/agent-plugins
/plugin install agent-skills-toolkit@product-on-purpose
```

- Confirm the toolkit's skills load (e.g. `askit-build-skill`, `askit-evaluate`).

## Step 6 - close out

- Update `docs/internal/STATUS.md`: flip "Installable: ... launch in flight" to live, and move the Remaining step 1 to done.
- Write a session log.

## Rollback

- **Pre-tag:** abandon the branches; nothing public changed.
- **Post-tag, pre-registration:** the tag + release exist but no marketplace points at them; fix forward with `v1.0.1` (never force-move a tag).
- **Post-registration broken install:** revert the `agent-plugins` registry entry (or flip the registry private per `agent-plugins/docs/internal/registry-maintenance.md`); the `pm-skills` / `thinking-framework-skills` listings are independent and unaffected.
