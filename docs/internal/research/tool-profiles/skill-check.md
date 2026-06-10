---
tool: skill-check
repo: https://github.com/thedaviddias/skill-check
author: thedaviddias (David Dias)
license: MIT
last_verified: 2026-06-10
primary_sources:
  - https://github.com/thedaviddias/skill-check (README, source, action.yml, releases)
  - https://raw.githubusercontent.com/thedaviddias/skill-check/main/README.md
  - https://github.com/thedaviddias/skill-check/blob/main/package.json
  - https://github.com/thedaviddias/skill-check/blob/main/src/rules/core/frontmatter.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/rules/core/description.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/rules/core/body.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/rules/core/links.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/rules/core/file.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/core/quality-score.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/core/agent-scan.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/core/fix.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/core/html-report.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/types.ts
  - https://github.com/thedaviddias/skill-check/blob/main/src/core/config.ts
  - https://github.com/thedaviddias/skill-check/blob/main/action.yml
  - https://github.com/thedaviddias/skill-check/releases
---

# skill-check - profile

skill-check is a TypeScript CLI linter that validates `SKILL.md` agent-skill files. Authored by David Dias (thedaviddias), it checks frontmatter structure, description quality, body budget, and local link resolution; computes a weighted 0-100 quality score; applies deterministic auto-fixes via `--fix`; and delegates security scanning to the external `mcp-scan` tool through a bundled adapter called `agent-scan`. It ships as an npm package (npx CLI), a GitHub Action (`thedaviddias/skill-check@v1`), and via a Homebrew tap. The project is MIT-licensed and published at v1.2.0 as of the verification date. [source: README](https://github.com/thedaviddias/skill-check) (Confidence: High)

## Dimensions

1. **Unit of evaluation:** Per-skill (validates individual `SKILL.md` files; can batch across a directory tree via `roots` config). [source: README + src/types.ts SkillArtifact](https://github.com/thedaviddias/skill-check/blob/main/src/types.ts) (Confidence: High)

2. **Tiered and climbable:** Score (0-100 continuous quality score per skill; no named tiers or burndown ladder). [source: src/core/quality-score.ts](https://github.com/thedaviddias/skill-check/blob/main/src/core/quality-score.ts) (Confidence: High)

3. **Verdict basis:** Deterministic (all rules are rule-engine checks against parsed YAML/Markdown; no LLM judge). [source: src/core/rule-engine.ts + src/rules/core/](https://github.com/thedaviddias/skill-check/tree/main/src/core) (Confidence: High)

4. **Lifecycle coverage:** Author phase only (validates and scores skill content at write time; no version enforcement, release gate, deprecation, or governance checks). [source: README commands: check, fix, watch, new](https://github.com/thedaviddias/skill-check) (Confidence: High)

5. **Cross-agent emission:** None (outputs text, JSON, SARIF, HTML, or GitHub annotations for CI; no skill serialization or transpilation for Claude, Codex, or Gemini formats). [source: src/types.ts OutputFormat type; README](https://github.com/thedaviddias/skill-check/blob/main/src/types.ts) (Confidence: High)

6. **Self-proving / dogfooded:** No (the CI workflow runs lint, typecheck, tests, and pack, but does not run `skill-check` against the repository's own SKILL.md files). [source: .github/workflows/ci.yml steps enumerated](https://github.com/thedaviddias/skill-check/actions) (Confidence: High)

7. **Target spec(s):** House spec (validates a custom SKILL.md structure defined by thedaviddias; v1.2.0 release notes say "aligned with Agent Skills spec" but the README does not reference agentskills.io or any external governance body). [source: README; v1.2.0 release notes](https://github.com/thedaviddias/skill-check/releases/tag/v1.2.0) (Confidence: Medium - "aligned with Agent Skills spec" is an unresolved claim; the source consulted does not link to a spec URL, so the relationship is our inference from the release note text)

8. **Validation depth:** Frontmatter-quality + refs + budget. Specifically: 11 frontmatter rules (required fields, slug format, field order, unknown fields, compatibility length, metadata types, allowed-tools format); 4 description rules (non-empty, max length, "Use when" phrasing, min recommended length); 2 body rules (max lines, max tokens via whitespace approximation); 2 links rules (local markdown resolves, references/* resolves via fs.existsSync); 1 file rule (single trailing newline). No manifest-vs-disk check; no strict token counting. [source: src/rules/core/*.ts](https://github.com/thedaviddias/skill-check/tree/main/src/rules/core) (Confidence: High)

9. **Versioning support:** None. No `version` field is validated in SKILL.md frontmatter. The `frontmatter.ts` source lists known fields as `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`; a version field would trigger `frontmatter.unknown_fields` warning. Package versioning is managed by semantic-release (Conventional Commits) but that governs the tool's own releases, not skill metadata. [source: src/rules/core/frontmatter.ts](https://github.com/thedaviddias/skill-check/blob/main/src/rules/core/frontmatter.ts) (Confidence: High)

10. **Eval / test scaffolding:** None for skill behavioral testing. The tool provides `skill-check new <name>` to scaffold a SKILL.md template and `watch` for continuous re-validation during development, but no evals.json, should-trigger corpus, or adversarial test harness is present. The tool's own test suite uses Vitest (a unit-test framework for the linter logic itself, not skill behavior). [source: package.json devDependencies; README commands](https://github.com/thedaviddias/skill-check/blob/main/package.json) (Confidence: High)

11. **Security posture:** Delegated external scan. The `agent-scan.ts` adapter invokes the external Python tool `mcp-scan` (via `uvx mcp-scan`, `pipx run mcp-scan`, or a local `mcp-scan` binary) using `spawnSync`. The adapter is bundled inside skill-check but mcp-scan itself is not; it must be installed separately. Security scanning runs by default in the `check` command (skip with `--no-security-scan`). The GitHub Action defaults `security-scan` to `"false"` and supports `security-scan-install-policy: deny|allow` to gate whether dependencies are auto-installed. No prompt-injection or secret-scan logic exists inside skill-check's own TypeScript source. [source: src/core/agent-scan.ts; action.yml](https://github.com/thedaviddias/skill-check/blob/main/src/core/agent-scan.ts) (Confidence: High)

12. **Output formats:** Five formats confirmed from source. text (colorized terminal with ASCII tables, default), json (machine-readable with scores and baseline diffs), sarif (GitHub Code Scanning integration via src/core/sarif.ts), html (self-contained with dark mode via CSS prefers-color-scheme, src/core/html-report.ts), github (::error and ::warning annotations for Actions via src/core/github-formatter.ts). All five are enumerated in src/types.ts OutputFormat and enforced in src/core/config.ts. [source: src/types.ts; src/core/config.ts; src/core/html-report.ts; src/core/sarif.ts](https://github.com/thedaviddias/skill-check/blob/main/src/types.ts) (Confidence: High)

13. **Packaging / install:** Three confirmed channels. npx CLI (`npx skill-check .`) from npm; GitHub Action (`uses: thedaviddias/skill-check@v1` with node20 runtime, action.yml confirmed); Homebrew tap (`brew tap thedaviddias/skill-check https://github.com/thedaviddias/skill-check && brew install skill-check`, from README). A curl-pipe-bash installer script is also documented in the README (`curl -fsSL .../scripts/install.sh | bash`). Note: a search for "homebrew" in the repository source returned zero files, so the Homebrew formula may be inline to the tap URL rather than a separate repository; this does not affect the install command's validity. [source: README install section; action.yml](https://github.com/thedaviddias/skill-check) (Confidence: High)

14. **Maturity signal:** 179 stars, 8 forks, 3 releases (v1.0.0, v1.1.0, v1.2.0 - all released 2026-02-21), latest v1.2.0. Language: TypeScript (86.8%) with Python and Shell components. [source: GitHub repo page, releases page, snapshot 2026-06-10](https://github.com/thedaviddias/skill-check/releases) (Confidence: High-dated-snapshot)

15. **Governance / standing:** Community single-maintainer. The repository is authored and maintained by thedaviddias (David Dias); MIT license with no foundation or organization governance indicated. Publishing uses npm Trusted Publishing (OIDC) via GitHub Actions and semantic-release for automated versioning. [source: package.json; README contributing section](https://github.com/thedaviddias/skill-check/blob/main/package.json) (Confidence: High)

16. **Provenance taxonomy (separates portable-objective from house conventions?):** No. All rules are presented as a single flat list with no labeling to distinguish rules derived from a published external spec versus rules reflecting the author's preferences. The `frontmatter.unknown_fields` rule defines "known fields" as a hardcoded list in the source; no rule carries a `spec` or `source` provenance annotation. The v1.2.0 release note uses the phrase "aligned with Agent Skills spec" for 6 new rules but no URL, registry, or spec-version is cited in the release notes or README. [source: src/rules/core/frontmatter.ts; v1.2.0 release notes](https://github.com/thedaviddias/skill-check/releases/tag/v1.2.0) (Confidence: High)

## Notes

**Scoring mechanics:** The 0-100 score is computed by `quality-score.ts` as a weighted sum over five categories (frontmatter 30%, description 30%, body 20%, links 10%, file 10%). Each diagnostic deducts `severity-weight * category-weight` from that category's contribution, clamped at zero per category and 100 overall. Errors cost 1.0 penalty units; warnings cost 0.5. This is fully deterministic and reproducible.

**agent-scan is not bundled Python:** The security sub-command wires skill-check's CLI to the external `mcp-scan` Python tool. "Agent-scan" is the name of the internal adapter file (`src/core/agent-scan.ts`) that calls mcp-scan via `spawnSync`. The security capability depends entirely on mcp-scan being available in the environment. The GitHub Action defaults the security scan to `"false"` specifically because of this dependency, and its `security-scan-install-policy` input governs whether mcp-scan is auto-installed. This is a meaningful operational gap: security scanning requires a Python environment and an external tool not under skill-check's release cycle.

**No versioning of skill metadata:** The tool has no concept of a `version` field in SKILL.md frontmatter. A skill author who adds `version:` to their frontmatter will receive a `frontmatter.unknown_fields` warning. This is a structural gap relative to tools that enforce semver on skill contracts.

**--fix is not interactive by default:** The `src/core/fix.ts` implementation modifies files in place with `fs.writeFileSync()` without confirmation prompts. The README's description of `--fix --interactive` is stated in the docs but the fix.ts source shows no interactive-mode code path; this warrants independent verification before asserting that the interactive mode is fully implemented.

**Duplicate detection:** The README and initial README fetch mention `duplicates.name` and `duplicates.description` warnings. These rule IDs do not appear in the five `src/rules/core/*.ts` files examined directly. Either they are implemented elsewhere (a `duplicates.ts` not visible in the directory listing) or they are planned/documented but not yet in the rule engine. This is logged as an open item.

**HTML output does not use the same template stack as agent-skills-toolkit:** skill-check's HTML report is generated from `html-report.ts` as an embedded self-contained file (no framework), while agent-skills-toolkit's E1 renderer is a multi-variant plugin-rendered template. The two are architecturally unrelated.

## Open items

1. **"Aligned with Agent Skills spec" (v1.2.0 release notes):** No spec URL, spec version, or governing body is cited. Closing this would require the author to publish a reference or for the agentskills.io spec to list skill-check as a conforming tool.

2. **Duplicate detection rules:** The README describes `duplicates.name` and `duplicates.description` rule IDs, but directory listings of `src/rules/core/` show only five files (body, description, file, frontmatter, links, index). A sixth file (duplicates.ts) may exist but was not visible. Closing this requires fetching `src/rules/core/index.ts` rule exports or the full directory listing with all files enumerated.

3. **`--fix --interactive` mode:** The README documents `--fix --interactive` as prompting before each fix, but `src/core/fix.ts` shows no interactive-mode code path. Verify by reading `src/cli/main.ts` command definitions or the full `fix.ts` source to confirm whether an interactive loop is implemented.

4. **Homebrew formula location:** The README specifies `brew tap thedaviddias/skill-check https://github.com/thedaviddias/skill-check` (tapping the main repo directly), but a search for "homebrew" in the repository source returned zero files. Confirm whether the formula file exists in the repo root or a separate repository.

5. **npm page:** npm registry returned HTTP 403 during verification; package version, weekly downloads, and exact npm metadata could not be verified directly. The version (1.2.0) and license (MIT) are confirmed from `package.json` in the GitHub repo instead.
