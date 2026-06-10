---
tool: Vercel skills CLI (npx skills)
repo: https://github.com/vercel-labs/skills
author: Vercel / vercel-labs (announced by Guillermo Rauch and Andrew Qu)
license: MIT (declared in package.json and npm registry; no LICENSE file present in repo as of 2026-06-10 - see Notes)
last_verified: 2026-06-10
primary_sources:
  - https://github.com/vercel-labs/skills
  - https://github.com/vercel-labs/skills/blob/main/src/local-lock.ts
  - https://github.com/vercel-labs/skills/blob/main/src/skill-lock.ts
  - https://github.com/vercel-labs/skills/blob/main/src/install.ts
  - https://github.com/vercel-labs/skills/blob/main/src/sync.ts
  - https://github.com/vercel-labs/skills/blob/main/src/agents.ts
  - https://github.com/vercel-labs/skills/blob/main/src/constants.ts
  - https://github.com/vercel-labs/skills/blob/main/package.json
  - https://github.com/vercel-labs/skills/blob/main/.github/workflows/ci.yml
  - https://github.com/vercel-labs/skills/releases
  - https://github.com/vercel-labs/skills/issues/946
  - https://github.com/vercel-labs/skills/issues/503
  - https://github.com/vercel-labs/skills/pull/509
  - https://registry.npmjs.org/skills
  - https://api.npmjs.org/downloads/point/last-week/skills
  - https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem
  - https://vercel.com/docs/agent-resources/skills
  - https://skills.sh
---

# Vercel skills CLI (npx skills) - profile

The `skills` CLI (`npx skills`) is an open-source, cross-agent skill package manager and scaffolder created by Vercel and shipped under the `vercel-labs` GitHub organization. Launched on January 20, 2026, by Guillermo Rauch and Andrew Qu, it lets developers install, update, remove, and discover reusable SKILL.md-based capability packages across 80 AI coding agents including Claude Code, Codex, Cursor, GitHub Copilot, Cline, OpenCode, and Windsurf. It is a package manager and distribution tool, not a grader or quality gate; accordingly, most grading-oriented dimensions in this profile are "not applicable" or "none."

## Dimensions

1. **Unit of evaluation:** Per-skill - each SKILL.md file is the atomic unit that the CLI installs, removes, and tracks individually. [source](https://github.com/vercel-labs/skills/blob/main/src/local-lock.ts) (Confidence: High)

2. **Tiered and climbable:** Not applicable - the tool is a package manager/scaffolder, not a grader. No tier ladder, no burndown, no pass/fail grade exists in the current codebase. A `skills validate` command with severity levels (error/warning/info) was proposed in issue #503 (opened 2026-03-05) and prototyped in PR #509, but PR #509 was closed unmerged on 2026-06-08 and the issue remains open with no assignee. [source](https://github.com/vercel-labs/skills/issues/503) [source](https://github.com/vercel-labs/skills/pull/509) (Confidence: High)

3. **Verdict basis:** Not applicable - no verdict is produced. The tool installs and manages packages; it does not evaluate them. [source](https://github.com/vercel-labs/skills) (Confidence: High)

4. **Lifecycle coverage:** Author (init), install (add), list, find/search, update, remove, use/run (prompt generation). A publish step does not exist: authors push a SKILL.md to any public git repo and that repo becomes installable; no registry submission is required. Deprecation and governance lifecycle steps are absent. [source](https://github.com/vercel-labs/skills) [source](https://vercel.com/docs/agent-resources/skills) (Confidence: High)

5. **Cross-agent emission:** Multi-format native - the `agents.ts` source file defines 80 named agents, each with a `skillsDir` (project-scoped) and `globalSkillsDir` (user-home-scoped) path. The `-a / --agent` flag targets one or more specific agents by name; `--all` installs to every detected agent. A "universal agents" group of 40+ agents shares the `.agents/skills/` directory; non-universal agents use agent-specific paths. [source](https://github.com/vercel-labs/skills/blob/main/src/agents.ts) (Confidence: High)

6. **Self-proving / dogfooded:** The repo runs a CI pipeline (TypeScript type-check, Vitest test suite, Prettier format check) on push to main and on pull requests. The CI does not run the `skills` CLI against the repo itself; there is no self-install or gate run in the workflow. [source](https://github.com/vercel-labs/skills/blob/main/.github/workflows/ci.yml) (Confidence: High)

7. **Target spec(s):** No named specification is enforced. SKILL.md frontmatter requires only `name` and `description`; optional fields (author, license, keywords, repository) align loosely with the agentskills.io base format but no version of a formal spec is cited or checked in the codebase. [source](https://github.com/vercel-labs/skills/blob/main/src/frontmatter.ts) [source](https://vercel.com/kb/guide/agent-skills-creating-installing-and-sharing-reusable-agent-context) (Confidence: Medium - inferred from reading frontmatter.ts and the KB guide)

8. **Validation depth:** Minimal frontmatter syntax only - the CLI parses SKILL.md frontmatter (name + description required) on install, but performs no quality checks, no budget/ref validation, no manifest-vs-disk consistency check, and no strict-CI mode in the shipped code. The unmerged PR #509 proposed error/warning/info severity checking; it did not land. [source](https://github.com/vercel-labs/skills/blob/main/src/frontmatter.ts) [source](https://github.com/vercel-labs/skills/pull/509) (Confidence: High)

9. **Versioning support:** The project-level lockfile `skills-lock.json` tracks `source`, `sourceType`, `ref` (branch or tag), `skillPath`, and a `computedHash` (SHA-256 of all skill-folder files on disk), which enables update detection and reproducible re-installs. A global state file `.skill-lock.json` (stored at `~/.agents/.skill-lock.json` or `$XDG_STATE_HOME/skills/`) stores GitHub tree SHA hashes and timestamps. Semver is not enforced; callers may pin a `ref` to a tag. [source](https://github.com/vercel-labs/skills/blob/main/src/local-lock.ts) [source](https://github.com/vercel-labs/skills/blob/main/src/skill-lock.ts) (Confidence: High)

10. **Eval / test scaffolding:** None - no eval framework, no should-trigger tests, no adversarial harness ships with or is installed by the CLI. The Vitest suite in the repo tests the CLI itself (install, list, update, source-parsing), not the skills it installs. [source](https://github.com/vercel-labs/skills/blob/main/src/install.ts) (Confidence: High)

11. **Security posture:** Minimal advisory only - no secret scanning, no prompt-injection analysis, no sandboxed execution. Official documentation states: "Treat skills like code: read them before installing, be especially careful with scripts/ (they can run commands), pin to known repos and review diffs on updates." One notable incident: v1.4.9 (2026-04-06) added a warning for the `openclaw` source due to detection of malicious skills in that registry. [source](https://github.com/vercel-labs/skills/releases) [source](https://vercel.com/kb/guide/agent-skills-creating-installing-and-sharing-reusable-agent-context) (Confidence: High)

12. **Output formats:** Human-readable terminal output only - install confirmations, list tables, find/search results, and warnings are rendered as interactive CLI text. No JSON, SARIF, GH-annotation, or HTML report format is produced. [source](https://github.com/vercel-labs/skills) (Confidence: High)

13. **Packaging / install:** Full npx-CLI package manager with five operations: `skills add` (install from GitHub, GitLab, git URL, or local path), `skills remove`, `skills list`, `skills update`, `skills find`. Supporting operations: `skills init` (scaffold new SKILL.md), `skills use`/`skills run` (generate prompt or launch agent without installing). Lockfile-based CI restore is provided via `runInstallFromLock`, which reads `skills-lock.json` and re-runs `add` for each locked entry. A `runSync` function handles an experimental node_modules install path (skills embedded in npm packages). Project scope installs to `./<agent>/skills/`; global scope (`-g`) installs to `~/<agent>/skills/`. [source](https://github.com/vercel-labs/skills/blob/main/src/install.ts) [source](https://github.com/vercel-labs/skills/blob/main/src/local-lock.ts) [source](https://github.com/vercel-labs/skills/blob/main/src/sync.ts) (Confidence: High)

14. **Maturity signal:** 22k GitHub stars, 1.8k forks, v1.5.10 latest release (2026-06-03), last commit 2026-06-10, 1,376,225 npm downloads in the week of 2026-05-27 to 2026-06-02. Launched January 20, 2026; over 1,400 pull requests merged as of June 2026. [source](https://github.com/vercel-labs/skills) [source](https://api.npmjs.org/downloads/point/last-week/skills) (Confidence: High, dated snapshot - 2026-06-10)

15. **Governance / standing:** First-party Vercel product, maintained under the `vercel-labs` GitHub organization. No foundation track or external governance body. The package was announced by Vercel CEO Guillermo Rauch; the skills.sh directory is operated by Vercel. No formal skill review or curation process exists for community-submitted skills; the ecosystem is open-submission via public git repos. [source](https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem) [source](https://github.com/vercel-labs) (Confidence: High)

16. **Provenance taxonomy (separates portable-objective from house conventions?):** Not applicable - the tool is a package manager and does not emit or grade provenance categories. No distinction between portable-objective rules and house conventions is modeled. Skills are installed as-authored; their content is not classified by provenance. [source](https://github.com/vercel-labs/skills) (Confidence: High)

## Notes

**License ambiguity.** The npm registry and `package.json` both declare MIT. However, GitHub issue #946 (opened 2026-06-xx) documents that no `LICENSE` file exists in the repository root and that the GitHub API returns `"license": null`. The main page now shows "MIT" in the GitHub UI, which GitHub infers from package.json. Without a root `LICENSE` file the legal standing is contested: the code is likely MIT-intended, but organizations doing license audits may flag the absence. Until a LICENSE file is added and committed, treat the license as "MIT (declared in package.json, unverified by root LICENSE file)."

**Star count discrepancy note.** A prior report in this project flagged a discrepancy between approximately 17.3k and 21.7k stars. As of 2026-06-10 the GitHub page displays "22k stars." The npm download figure (1.37M weekly) is a separate, independently verified figure from the npm registry API. No further discrepancy was observed in this pass, but star counts are volatile and should be treated as a dated snapshot only.

**80 agents in source, "70+" in README.** The `agents.ts` source file defines 80 named agent configurations. The README table lists 71 agents explicitly and the marketing copy says "70+ agents." The source file is the authoritative count; the README may lag behind code additions.

**skills.sh install counts.** The skills.sh page shows per-skill install counts (e.g., 2.0M installs for find-skills over 8 weeks) and a total-skill count of 652,673. These are Vercel-operated telemetry figures with no independent audit. Recorded as-seen, dated 2026-06-10; the methodology behind the counts is not documented in any Tier 1 source.

**"Supports 60+/67 agents" claim.** Earlier secondary reports cited "60+" or "67" agents. The current `agents.ts` source shows 80 entries; the README table shows 71. The lower figures appear to be from launch-era documentation and have not been updated in all secondary sources.

**Lockfile naming.** Two lock files coexist: `skills-lock.json` (project-level, merge-conflict-minimized, SHA-256 content hash) and `.skill-lock.json` (global state, stored in the user home, GitHub tree SHA, with timestamps). The distinction matters for CI restore: `runInstallFromLock` reads `skills-lock.json`.

**No validate command in shipped code.** PR #509 prototyped a `skills validate`/`skills lint` command with three severity tiers. It was closed unmerged on 2026-06-08 (author deleted head branch). Issue #503 remains open. As of 2026-06-10 no validation command ships in the CLI.

**`skills run` command.** The v1.5.10 release notes mention a new `run` command for executing skills without installation. This appears equivalent to (or an alias for) `skills use`. Confirmed present in source; details not separately documented in official docs as of this verification date.

## Open items

1. **LICENSE file.** Issue #946 asks for an explicit LICENSE file. Confirm whether one was added post-issue by checking `git log --all -- LICENSE` against the live repo. If still absent, the "MIT" label should carry the caveat above in any public-facing matrix cell.

2. **`skills validate` / `skills lint` command.** Issue #503 is open; PR #509 was closed. If a new PR lands and merges, dimension 8 (validation depth) and dimension 2 (tiered) would both require updates.

3. **skills.sh install-count methodology.** The 652,673 total-skill count and per-skill install figures are Vercel telemetry. No Tier 1 documentation describes what an "install" event is (is it a unique `skills add` invocation? a lock-file entry write?). Cannot be confirmed or denied as a primary source; treat as Vercel-reported and unaudited.

4. **Author attribution.** The changelog page credits the announcement to "Andrew Qu" but no explicit org affiliation is stated there. The Vercel changelog URL and Guillermo Rauch's public announcement confirm Vercel as the org. The individual author of the CLI codebase was not confirmed from the repo `package.json` (no `author` field) or the changelog.
