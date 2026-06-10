---
tool: skills-validator
repo: https://github.com/moutons/skills-validator
author: moutons (sdmouton@gmail.com)
license: Apache-2.0
last_verified: 2026-06-10
primary_sources:
  - https://github.com/moutons/skills-validator
  - https://raw.githubusercontent.com/moutons/skills-validator/main/README.md
  - https://raw.githubusercontent.com/moutons/skills-validator/main/Cargo.toml
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/cli.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/pipeline.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/parse.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/structure.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/content.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/references.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/security.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/config.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/models.rs
  - https://raw.githubusercontent.com/moutons/skills-validator/main/src/formatter.rs
  - https://github.com/moutons/skills-validator/blob/main/.github/workflows/ci.yml
  - https://github.com/moutons/skills-validator/blob/main/.github/workflows/codeql.yml
  - https://github.com/moutons/skills-validator/releases
  - https://raw.githubusercontent.com/moutons/skills-validator/main/docs/specs/2026-04-05-layered-validation-pipeline-design.md
---

# skills-validator - profile

skills-validator is a Rust CLI tool (and Cargo library) that validates Agent Skills directories against the Agent Skills specification, with OpenCode and Claude Code as its primary target implementations. It is authored and maintained by moutons (sdmouton@gmail.com) as a community project. The README states the project "draws inspiration from the agentskills/skills-ref Python reference library, extending it with a layered validation pipeline, configurable severity tiers, and sizeyness-aware escalation." Despite near-zero public adoption (2 stars as of 2026-06-10), the engineering quality is notably high: separate CodeQL scanning workflow, OpenSSF Best Practices badge, cargo-deny dependency auditing, release-plz automation, and a spec-driven development process documented in AGENTS.md. [source](https://github.com/moutons/skills-validator) (README + CI verified)

## Dimensions

1. **Unit of evaluation:** Per-skill (one SKILL.md directory at a time); `scan --all` discovers and validates many skills sequentially, but the pipeline operates on a single skill directory per run. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/pipeline.rs) (Confidence: High)

2. **Tiered and climbable:** Pass/fail per run, but diagnostics carry four severity tiers (Info / Suggestion / Warning / Error) and a `--strict` flag that promotes Suggestions and Warnings to exit-code-1. No burndown ladder or climbing model - the tiers govern individual diagnostic weight, not a library maturity progression. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/models.rs) (Confidence: High)

3. **Verdict basis:** Deterministic. All checks are regex, YAML schema, filesystem, and static analysis rules. The optional semgrep integration is also deterministic (bundled YAML rules, no LLM involvement). [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/security.rs) (Confidence: High)

4. **Lifecycle coverage:** Author and validate only. The tool checks an already-authored skill for compliance, content quality, reference integrity, and security. There is no versioning gate, release workflow, deprecation check, or governance step in the tool itself. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/cli.rs) (Confidence: High)

5. **Cross-agent emission:** None. The tool validates skills; it does not generate or emit skill files into any agent tool format. The `to-prompt` subcommand generates an `<available_skills>` XML snippet for use in agent prompts, but this is a prompt-assembly helper, not cross-agent skill emission. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/cli.rs) (Confidence: High)

6. **Self-proving / dogfooded:** Not confirmed from source. The CI workflow runs `cargo fmt`, `clippy`, `cargo test`, and `cargo-deny` - all generic Rust quality checks, not skills-validator itself run against its own skill directory. No `SKILL.md` exists in the repository that would be a target for self-validation. [source](https://github.com/moutons/skills-validator/blob/main/.github/workflows/ci.yml) (Confidence: High)

7. **Target spec(s):** agentskills.io base spec, informed by Claude Code and OpenCode implementations. The Cargo.toml description reads: "validates agent skills according to the Agent Skills specification, informed by the OpenCode and Claude Code implementations." Extension fields (context, agent, hooks) recognized by Claude Code are surfaced as warnings for cross-tool portability. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/Cargo.toml) + [source](https://raw.githubusercontent.com/moutons/skills-validator/main/docs/specs/2026-04-05-layered-validation-pipeline-design.md) (Confidence: High)

8. **Validation depth:** Deep five-pass pipeline. Confirmed from source (pipeline.rs + individual pass files): Pass 1 - Parse (SKILL.md presence, YAML frontmatter extraction, markdown AST); Pass 2 - Structure (file inventory, binary detection, sizeyness tier computation via configurable file/subdir thresholds); Pass 3 - Content (frontmatter quality, trigger language, examples, behavioral constraints, body length, Windows paths, sizeyness-escalated severity); Pass 4 - References (broken internal links, path traversal, circular references, hop-limit enforcement, orphaned files, hooks script existence); Pass 5 - Security (curl/wget-pipe-bash/sh regex detection, process substitution patterns, optional semgrep with five bundled rule sets). Parse failure halts the pipeline; all other passes run to completion. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/pipeline.rs) + [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/security.rs) (Confidence: High)

9. **Versioning support:** None. No spec-version field, no semver enforcement on skill metadata, no contract-lock or provenance tracking in the frontmatter schema. The `parse.rs` pass does not check any version field. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/parse.rs) (Confidence: High)

10. **Eval / test scaffolding:** None visible in primary sources. No evals.json, should-trigger corpus, regression fixtures, or adversarial test harness found in the repository structure. The `cargo test` suite covers the validator's own code, not skill behavior. [source](https://github.com/moutons/skills-validator) (Confidence: Medium - inferred from absence in repo tree and CI; a private test fixture directory cannot be ruled out)

11. **Security posture:** Solid for a skill validator. Confirmed from security.rs source: (a) curl/wget piped to bash/sh detected via regex in both prose and code blocks at Warning severity; (b) process substitution variants (bash `<(curl ...)`) detected; (c) optional semgrep integration with five bundled rule sets (shell-injection, python-exec, env-exfiltration, hardcoded-urls, filesystem-escape) with severity mapped from semgrep levels; (d) binary file detection in structure pass (null-byte scan + extension list) at Error severity; (e) CodeQL scanning via a separate weekly codeql.yml workflow; (f) cargo-deny dependency audit in CI. Prompt injection is not detected. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/passes/security.rs) + [source](https://github.com/moutons/skills-validator/blob/main/.github/workflows/codeql.yml) (Confidence: High)

12. **Output formats:** Human (default, emoji-decorated, severity-grouped) and JSON (schema version 2, kebab-case check names, summary object, exit code embedded). No SARIF, GitHub annotations, or HTML. JSON format confirmed from formatter.rs; `--output-format` flag confirmed from cli.rs. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/formatter.rs) + [source](https://raw.githubusercontent.com/moutons/skills-validator/main/src/cli.rs) (Confidence: High)

13. **Packaging / install:** Cargo (two paths confirmed): `cargo binstall skills-validator --locked` for pre-built binary install; `cargo install skills-validator --locked` for source compilation. Also installable from cloned source. Shell completions available (bash, zsh, fish) via `completions` subcommand. No npm/npx, no GitHub Action wrapper, no marketplace listing found. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/README.md) + [source](https://raw.githubusercontent.com/moutons/skills-validator/main/Cargo.toml) (Confidence: High)

14. **Maturity signal:** 2 stars, 0 forks, 5 releases (v0.1.4 through v0.2.1), latest release v0.2.1 on April 20, 2026. 4 open pull requests as of snapshot date. Engineering quality substantially exceeds adoption signal: separate CodeQL workflow, OpenSSF Best Practices badge, cargo-deny, release-plz automation, spec-driven ADR process, and a five-pass pipeline introduced as a breaking change in v0.2.0. Do not let the star count understate capability. [source](https://github.com/moutons/skills-validator/releases) (Confidence: High-dated-snapshot, 2026-06-10)

15. **Governance / standing:** Community. Solo author (moutons), no organizational affiliation, no foundation track. The spec it validates (agentskills.io) is a Tier 1 external dependency but this tool has no formal relationship to its governance. skills-validator itself carries Apache-2.0 and maintains an ADR process and CONTRIBUTING guide, but governance is informal maintainer-led. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/Cargo.toml) + [source](https://github.com/moutons/skills-validator/blob/main/AGENTS.md) (Confidence: High)

16. **Provenance taxonomy (separates portable-objective from house conventions?):** Partial, implicit. The pipeline spec explicitly distinguishes spec-mandated checks (name format, description length, YAML validity - enforced at Warning/Error) from Claude Code-preferred conventions (trigger language patterns, progressive-disclosure structure, context/agent orchestration fields - surfaced at Suggestion/Warning with explicit cross-tool compatibility notes). There is no formal taxonomy label or separate flag to run only portable checks, but the distinction is architecturally present in the check design and the `extension-field-compatibility` check explicitly signals Claude Code-only fields. [source](https://raw.githubusercontent.com/moutons/skills-validator/main/docs/specs/2026-04-05-layered-validation-pipeline-design.md) (Confidence: Medium - our reading of spec design rationale; no formal "portable" flag exists in CLI)

## Notes

- The "extends skills-ref" claim is confirmed verbatim in the README: "draws inspiration from the agentskills/skills-ref Python reference library, extending it with a layered validation pipeline, configurable severity tiers, and sizeyness-aware escalation." skills-validator does NOT list skills-ref as a Cargo dependency - this is conceptual extension (different language, added capabilities), not library inheritance.

- The sizeyness escalation is fully configurable: `moderate_file_threshold` (default 3), `hefty_file_threshold` (default 6), `moderate_subdir_threshold` (default 1), `hefty_subdir_threshold` (default 3), all overridable via TOML config, environment variables, or CLI. Orchestration frontmatter fields (hooks, agent, context) independently push a skill to Hefty regardless of file count.

- The config.rs `known_models` list defaults to `["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"]` - this is a configurable list, not a hardcoded restriction, and reveals the Claude Code-first orientation of the project.

- crates.io page was unreachable during this research pass (HTTP response returned only the site header). All version and install data sourced from GitHub Cargo.toml and releases page instead.

- The README lists four badges (CI, CodeQL, crates.io version, OpenSSF Best Practices). The first CI fetch of ci.yml did not find CodeQL in that file, but a dedicated `.github/workflows/codeql.yml` was confirmed separately - the CodeQL badge is legitimate.

- No eval/test scaffolding (should-trigger corpus, adversarial fixtures) was found. This is a validation tool, not a testing framework for skill behavior.

## Open items

- The embedded `paths.jsonc` file (which defines the 20+ supported agent tool directories) was not fetchable as a raw URL (returned 404) and not discoverable via the GitHub file finder during this pass. The exact list of supported tools beyond "Claude Code" (confirmed in tests) cannot be asserted from primary source. Closing action: fetch `https://github.com/moutons/skills-validator/blob/main/src/paths.jsonc` directly or clone the repo.

- Whether skills-validator runs itself (via `validate` on its own `.claude/skills/` if it has one) is unverified. No `SKILL.md` was found in the repository, confirming absence of self-validation at time of snapshot.

- The "schema version 2" label in JSON output (confirmed from formatter.rs) implies a version 1 existed. No migration guide or schema changelog was found. Impact on downstream consumers integrating the JSON API is unverified.
