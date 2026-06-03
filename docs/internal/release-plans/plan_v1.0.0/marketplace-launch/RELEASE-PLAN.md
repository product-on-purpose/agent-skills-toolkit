# v1.0.0 marketplace launch - release plan

> Scope packet for the **v1.0.0** cut: the toolkit becomes installable through the `product-on-purpose` marketplace, the README is repositioned and made legible, the Standard reference moves to v0.9, and standardized release CI is added.
> This is a focused sub-plan of the broader [`plan_v1.0.0/`](../) program (whose [`RELEASE-PLAN.md`](../RELEASE-PLAN.md) is the whole-v1 journey). It covers the **release cut itself**, not the catalog build (which is DONE).
> Created 2026-06-02. Owner: maintainer. Live status: [`docs/internal/STATUS.md`](../../../STATUS.md).

## 1. Goal

Turn the Gold-grade `0.x` preview into the tagged **v1.0.0** release the repo has always pointed to: the milestone where the toolkit is installable and registered in a marketplace. Along the way, sharpen the README so the repository reads as what it is - a way to **start, grow, manage, and level up an advanced cross-agent plugin over its whole lifecycle**, not merely a skill builder.

## 2. Decisions (locked 2026-06-02)

| # | Decision | Choice |
|---|---|---|
| D1 | Release version | **v1.0.0** - the first Gold-tagged release; the milestone the README/STATUS have always named. |
| D2 | Marketplace registration depth | **End to end** - land the toolkit release, cut the tag, then register a live listing in `agent-plugins` pinned to the released sha. |
| D3 | Standardized CI | **Release automation + guard** - add `release.yml` (tag -> GitHub release) and a tag/version-consistency guard. Keep the existing validate + site jobs. |
| D4 | Standard version in `library.json` | **Bump 0.8 -> 0.9** - close the known drift against `STANDARD.md` v0.9. Gate-safe (the `library-json` check requires only presence). |

## 3. Scope

**In:**
- README repositioning (lifecycle framing: start / grow / manage / level up) and a legible tier-model section.
- Version bump to `1.0.0` across the version-bearing files; `standard` 0.8 -> 0.9; regenerate the generated manifests + `INDEX.md`.
- `CHANGELOG.md` `[Unreleased]` -> `[1.0.0]`; `RELEASE-NOTES.md` promotion; `STATUS.md` update.
- Marketplace install docs in the README, the site `getting-started.md`, and the site landing.
- Standardized CI: `release.yml` + a version-consistency guard.
- Marketplace registration in `product-on-purpose/agent-plugins` (a separate repo): registry entry pinned to the `v1.0.0` tag, registry `metadata.version` bump, its README + CHANGELOG.

**Out (explicitly deferred):**
- New catalog components (the v1 catalog is DONE on disk).
- Mounting the full Diataxis `docs/` tree into the site in-place (a tracked follow-up; the site stays a curated public surface this release).
- A demonstrative hook to make G1 non-vacuous (a named follow-up; does not block the tag).
- Gemini emitter (named v1.x roadmap).
- A release ZIP artifact (install is via marketplace git-clone of the pinned sha; no archive needed - unlike pm-skills' Cowork ZIP).

## 4. The hard ordering constraint (why this is a two-repo, sequenced release)

The marketplace validator (`agent-plugins/scripts/validate-registry.mjs`, check 5) **fails unless the pinned `sha` is the exact commit a release tag points at**, and check 7 reads the pinned commit's `.claude-plugin/plugin.json`. Therefore the listing **cannot** be created before the `v1.0.0` tag exists on a commit reachable on the toolkit's default branch. The sequence is forced:

```
toolkit release PR  ->  merge to main  ->  tag v1.0.0 (release.yml mints the GitHub release)  ->  agent-plugins PR pinned to the tag sha  ->  merge  ->  listing live
```

This is the single most important fact in the plan: registration is the **last** step, gated on a real tag.

## 5. Workstreams

| WS | Name | Repo | Output |
|---|---|---|---|
| A | README reposition + tier legibility | toolkit | rewritten `README.md` sections |
| B | Version + release artifacts | toolkit | `library.json`, `package.json`, regenerated manifests + `INDEX.md`, `CHANGELOG.md`, `RELEASE-NOTES.md`, `STATUS.md`, README badges |
| C | Install docs | toolkit | README Quick start, site `getting-started.md`, site `index.mdx` |
| D | Standardized CI | toolkit | `.github/workflows/release.yml` + version-consistency guard |
| E | Marketplace registration | agent-plugins | `marketplace.json` entry + `metadata.version`, README table, CHANGELOG |

WS A-D ship in one toolkit PR. WS E is a separate PR in `agent-plugins`, opened after the tag.

## 6. Version-bearing file set (WS B)

`library.json` is the version source of truth (Standard sec 5; checks U9/U8/G4). The bump touches:

| File | Change | How |
|---|---|---|
| `library.json` | `version` 0.3.0 -> 1.0.0; `standard` 0.8 -> 0.9 | hand-edit |
| `package.json` | `version` 0.3.0 -> 1.0.0 (U9 requires equality) | hand-edit |
| `.claude-plugin/plugin.json` | `version` -> 1.0.0 | **generated** - `node scripts/generators/gen-manifest.mjs . --write --target=all` |
| `.codex-plugin/plugin.json` | `version` -> 1.0.0 (preserves the load-bearing `skills` + `interface` pointers) | **generated** (same command) |
| `manifest.generated.json` | `version`/`standard` -> new | **generated** (same command) |
| `INDEX.md` | version/tier header | **generated** - `node scripts/generators/gen-index.mjs . --write` |
| `README.md` | version + Standard badges, Status table, "not yet installable" -> installable | hand-edit (WS A/C) |
| `CHANGELOG.md` | `[Unreleased]` -> `[1.0.0] - 2026-06-02` + the launch entries | hand-edit |
| `RELEASE-NOTES.md` | "Unreleased - public Gold-grade preview" -> the `1.0.0` release notes | hand-edit |
| `STATUS.md` | "Installable: not yet" -> installable; remaining-items burndown | hand-edit |

Component versions stay at their own SemVer (they version independently of the library); nothing requires them to be 1.0.0.

After edits: run the generators, then `node scripts/check.mjs` (expect 0/0) and `npm test` (expect all green), then `git diff` to confirm exactly the intended files changed.

## 7. CI design (WS D)

Two additions, modeled on pm-skills but lean for a marketplace-installed (git-clone) plugin:

1. **`release.yml`** - trigger on `push: tags: ['v*']`. Steps: checkout; a **version-consistency guard** (fail unless `vX.Y.Z` == `package.json` == `library.json` == `.claude-plugin/plugin.json` == `.codex-plugin/plugin.json`); create the GitHub release with body sourced from `RELEASE-NOTES.md`. No ZIP build (marketplace installs clone the pinned commit).
2. The existing `ci.yml` (validate: `npm test` + `node scripts/check.mjs`; build-site: Astro build + the 14.11 guards) and `deploy-pages.yml` are unchanged. Intra-repo version agreement is already enforced by the gate (U8/U9); the new guard adds only the tag==manifest assertion the gate cannot see.

Rationale (kept in `IMPL-PLAN.md`): the guard lives in `release.yml` so a tag mismatch aborts **before** a wrong release is published.

## 8. Marketplace registration design (WS E, in agent-plugins)

Add to `.claude-plugin/marketplace.json` `plugins[]`:

```jsonc
{
  "name": "agent-skills-toolkit",
  "source": {
    "source": "url",
    "url": "https://github.com/product-on-purpose/agent-skills-toolkit.git",
    "sha": "<the v1.0.0 tag's 40-char commit>"
  },
  "description": "Toolkit and Standard for authoring, validating, governing, and scaling cross-agent skill libraries (Claude Code and Codex) to a tiered Bronze/Silver/Gold quality bar.",
  "version": "1.0.0",
  "strict": true
}
```

- Use the **https `url`** source form, not the `github` shorthand (the shorthand resolves to an SSH clone, which breaks installs for users without an authorized key; see `agent-plugins/docs/internal/registry-maintenance.md`).
- Bump the registry's own `metadata.version` (1.2.0 -> 1.3.0; a plugin added = minor).
- Update `agent-plugins/README.md` (add the row, status `listed`) and `agent-plugins/CHANGELOG.md`.
- Validate locally: `GITHUB_TOKEN=$(gh auth token) node scripts/validate-registry.mjs` (checks 5 + 7 hit the network).

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **R1** Tag/registration ordering botched (register before tag) | Encoded in sec 4; WS E is explicitly the last step, after the tag and the GitHub release exist. |
| **R2** Version drift across the 5 version-bearing files | Use the generators (single source = `library.json`); the new `release.yml` guard fails the release on any tag/manifest mismatch; the gate's U8/U9 fail the PR on intra-repo drift. |
| **R3** Regenerating manifests strips the Codex `skills`/`interface` pointer | Verified: `gen-manifest` re-derives both (renderer lines 73-85). A round-trip + the gate cover it. |
| **R4** README overclaims a feature that does not exist | The framing was run through a 2-critic accuracy panel; the verification workflow re-checks every claim against the catalog before PR. |
| **R5** `1.0.0` implies stability the Standard (v0.9) does not yet claim | The toolkit version line and the Standard version line are independent (as the registry's own version line is independent of its plugins). README/STATUS state this explicitly. |
| **R6** A dash slips into prose (house rule) | The PreToolUse no-dash hook blocks writes; the gate's U10 no-dashes check fails the PR; the verification workflow scans the diff. |
| **R7** Branch protection / admin-squash merges; git can hang on this Windows setup | Drive each PR to green CI; hand off the merge + tag-push to the maintainer's admin-squash flow where needed; keep steps idempotent. |
| **R8** A broken public listing after the flip | Registry rollback runbook (`registry-maintenance.md`): flip the registry repo private, fix, re-verify install, re-flip. The toolkit tag itself is immutable and unaffected. |

## 10. Rollback

- **Pre-tag:** abandon the branch; nothing public changed.
- **Post-tag, pre-registration:** the `v1.0.0` tag + GitHub release exist but no marketplace points at them; a defect is fixed forward with `v1.0.1` (tags are immutable, never force-moved).
- **Post-registration:** revert the `agent-plugins` registry entry (or flip the registry private per its runbook); existing `pm-skills`/`thinking-framework-skills` listings are untouched (independent entries).

## 11. Definition of Done

- [ ] README repositioned (lifecycle framing) and the tier section is scannable; every claim is accurate; zero dashes.
- [ ] `node scripts/check.mjs` -> 0 errors, 0 warnings; `tier-report` prints `advanced` with an empty burndown.
- [ ] `npm test` green; site builds; the two 14.11 guards pass.
- [ ] All version-bearing files read `1.0.0`; `library.json` `standard` is `0.9`; generated files regenerated and drift-free.
- [ ] `CHANGELOG.md` has a dated `[1.0.0]`; `RELEASE-NOTES.md` reads as the 1.0.0 notes; `STATUS.md` says installable.
- [ ] Install docs present and correct in the README, site `getting-started.md`, and site landing.
- [ ] `release.yml` + the version guard committed; the guard logic is sound (dry-reasoned in the impl plan).
- [ ] Toolkit PR green and merged; `v1.0.0` tagged; the GitHub release exists.
- [ ] `agent-plugins` PR: registry entry pinned to the tag sha, `validate-registry` green, README + CHANGELOG + `metadata.version` updated; merged; install verified (`/plugin marketplace add` + `/plugin install`).

See [`SPEC.md`](./SPEC.md) for the requirement-level acceptance criteria and [`IMPL-PLAN.md`](./IMPL-PLAN.md) for the file-by-file execution order.
