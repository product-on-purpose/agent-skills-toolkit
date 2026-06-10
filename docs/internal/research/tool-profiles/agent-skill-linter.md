---
tool: agent-skill-linter
repo: https://github.com/William-Yeh/agent-skill-linter
author: William Yeh <william.pjyeh@gmail.com>
license: Apache-2.0
last_verified: 2026-06-10
primary_sources:
  - https://github.com/William-Yeh/agent-skill-linter
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/README.md
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/SKILL.md
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/scripts/rules.py
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/scripts/linter.py
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/scripts/skill-lint.py
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/references/semantic-rules.md
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/docs/adr/0002-semantic-review-in-skill-md.md
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/docs/adr/0003-pep723-script-entry-point.md
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/docs/adr/0004-plugin-layout-support.md
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/.github/workflows/ci.yml
  - https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/pyproject.toml
  - https://api.github.com/repos/William-Yeh/agent-skill-linter
  - https://pypi.org/pypi/skills-ref/json
---

# agent-skill-linter - profile

agent-skill-linter (William Yeh) is a Python-based linter for the agentskills.io open spec that validates a single skill directory or a Claude Code plugin layout for spec compliance and publishing readiness. It operates in two modes - single-skill and plugin - auto-detected by the presence of `.claude-plugin/plugin.json`. It ships 19 active mechanically-checked rules across six categories plus a parallel set of 8 semantic rules (Rules 8, 12, 16, 18, 22, 23, 26, 27) that are deliberately not automated: per ADR 0002, those checks require agent judgment at invocation time and are embedded in the SKILL.md triage workflow rather than in Python code. The tool is installed as a skill via `npx skills add William-Yeh/agent-skill-linter` and executed via `uv run ./scripts/skill-lint.py`; it has no published npm or PyPI package of its own. As of the verification date the repo carries 7 stars and version 0.15.1. [Source: README, SKILL.md, rules.py, ADR 0002-0004, pyproject.toml, GitHub API - all primary]

## Dimensions

1. **Unit of evaluation:** Per-skill, with a plugin-batch mode that iterates over all `skills/*/` entries under a `.claude-plugin/plugin.json` root and deduplicates findings from shared repo artifacts (README, LICENSE, CI). [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/docs/adr/0004-plugin-layout-support.md) (Confidence: High)

2. **Tiered and climbable:** Pass/fail only - exit code 1 for any ERROR-severity finding, 0 otherwise. No tiered scoring or burndown ladder. Rules carry three severity levels (ERROR, WARNING, INFO) but these do not constitute a tier system: all severities appear in every run and no threshold gates a "next tier." [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/SKILL.md) (Confidence: High)

3. **Verdict basis:** Hybrid. The 19 mechanically-checked rules in `rules.py` are fully deterministic (regex, AST, YAML parse, file-existence checks - no LLM API calls anywhere in the Python code). The 8 semantic rules (Rules 8, 12, 16, 18, 22, 23, 26, 27) are intentionally delegated to the invoking agent: they are written as judgment prompts in the SKILL.md triage workflow (Steps 5-9) rather than automated. ADR 0002 states: "four rules were explicitly removed from Python because mechanical proxies produced too many false positives." Quality of the semantic pass therefore scales with the LLM that invokes the skill. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/docs/adr/0002-semantic-review-in-skill-md.md) (Confidence: High)

4. **Lifecycle coverage:** Author and validate only. The tool checks that a skill is correctly structured and ready to publish (author-time quality), but there is no versioning enforcement beyond requiring a `version` field in the frontmatter (Rule 1 via skills-ref) and in the plugin manifest (Rule 24). No release workflow, deprecation, or governance lifecycle coverage. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/SKILL.md) (Confidence: High)

5. **Cross-agent emission:** None. The linter validates skills; it does not generate or emit them for any agent platform. Its README lists Claude Code, Cursor, Gemini CLI, Amp, Roo Code, and Copilot as installation targets for itself (the linter skill), but it produces no output targeting any of those formats. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/README.md) (Confidence: High)

6. **Self-proving / dogfooded:** Yes. The CI workflow (`ci.yml`) contains a dedicated `validate` job that runs `uv run skill/scripts/skill-lint.py check ./skill` on the linter's own skill directory on every push and PR to main. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/.github/workflows/ci.yml) (Confidence: High)

7. **Target spec(s):** agentskills.io base spec, via the `skills-ref` PyPI package (v0.1.1, Keith Lazuka, Anthropic). Rule 1 is explicitly described as "SKILL.md spec compliance via skills-ref delegation" - the linter does not re-implement frontmatter parsing; it calls `skills_ref` for authoritative field and structure validation. No Codex-specific, Gemini-specific, or multi-format targeting observed. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/scripts/rules.py) [source](https://pypi.org/pypi/skills-ref/json) (Confidence: High)

8. **Validation depth:** Frontmatter-quality, refs+budget, and manifest-vs-disk. Rule 1 (via skills-ref) validates SKILL.md frontmatter required fields. Rules 2-7, 11, 13-15, 19, 21 check repo hygiene (LICENSE, CI, README sections, badges), routing signal format, progressive disclosure limits (500-line body cap, 4-backtick fence detection), reference-tier placement, and PEP 723 entry-point declarations. Rules 24-25 validate plugin manifest keys and script import dependencies against declared sources. Syntax linting of the Python scripts themselves runs via Ruff in CI. No SARIF output, no secret scanning, no prompt-injection checks. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/scripts/rules.py) (Confidence: High - our reading of rule list, flagged as Medium for completeness inference)

9. **Versioning support:** Metadata-version presence only. Rule 1 (frontmatter, via skills-ref) requires a `version` field. Rule 24 requires `version` in the plugin manifest. No semver format enforcement, no contract-lock, no provenance tracking. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/SKILL.md) (Confidence: Medium - inferred from rule descriptions; Rule 1 delegates to skills-ref so exact field requirements are governed by that package)

10. **Eval / test scaffolding:** None - the tool does not generate eval scaffolding for skills being linted. Its own test suite (pytest, ~150 test methods across Rules 1-25, fixture directories for valid and invalid cases) covers the linter itself but produces no evals, should-trigger files, or regression harness for the skills under test. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/tests/test_rules.py) (Confidence: High)

11. **Security posture:** None explicitly. No secret scanning, no prompt-injection detection, no sandbox. The `--fix` flag modifies files in-place. The tool operates only on local filesystem paths. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/scripts/skill-lint.py) (Confidence: High - absence confirmed by full source review)

12. **Output formats:** Human (Rich-formatted table with color-coded severity, default) and JSON (structured records with rule_id, severity, message, fixable flag, file reference). No SARIF, no GitHub annotations format, no HTML. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/scripts/skill-lint.py) (Confidence: High)

13. **Packaging / install:** No published npm or PyPI package for the linter itself. Install via `npx skills add William-Yeh/agent-skill-linter` (the `npx skills` CLI for the agentskills ecosystem) or by copying the `skill/` directory manually. At runtime the entry-point script (`skill-lint.py`) uses PEP 723 inline metadata (`skills-ref`, `click`, `pyyaml`, `rich`) executed by `uv run`; ADR 0003 explicitly rejected PyPI publishing and Git URL approaches. No GitHub Action wrapper. [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/docs/adr/0003-pep723-script-entry-point.md) (Confidence: High)

14. **Maturity signal:** 7 stars, 2 forks, 1 open issue as of 2026-06-10 (dated snapshot). 14 commits on main. Version 0.15.1 (latest commit May 19, 2026). Git tags present: v0.11.0, v0.10.0, v0.5.0, v0.4.0, v0.3.0, v0.2.0, 0.9.0, 0.8.0 - no tag for current 0.15.1. No GitHub Releases published. Created February 12, 2026. [source](https://api.github.com/repos/William-Yeh/agent-skill-linter) [source](https://github.com/William-Yeh/agent-skill-linter/releases) (Confidence: High-dated-snapshot)

15. **Governance / standing:** Community - individual author (William Yeh). The underlying spec it targets (agentskills.io) is governed by Anthropic (skills-ref author is Keith Lazuka, Anthropic), but the linter itself is an independent community project. No foundation track or organizational affiliation stated. [source](https://github.com/William-Yeh/agent-skill-linter) [source](https://pypi.org/pypi/skills-ref/json) (Confidence: High)

16. **Provenance taxonomy (separates portable-objective from house conventions?):** Partially. The tool separates spec-compliance checks (Rule 1, delegated to skills-ref - portable/objective) from publishing-readiness conventions (badges, CI, README sections - house conventions for a GitHub-hosted skill). The semantic rules reference distinguishes "deterministic elements" (line counts, gerund forms) from "judgment calls" (density assessment, context evaluation). However, there is no formal provenance labeling in the output (e.g., no "spec-required vs. opinionated" tag per finding). [source](https://raw.githubusercontent.com/William-Yeh/agent-skill-linter/main/skill/references/semantic-rules.md) (Confidence: Medium - our reading of the rule design)

## Notes

- The rule count in SKILL.md is stated as 25 total, but rules.py shows 19 active mechanical rules (Rules 1-7, 9-11, 13-15, 17, 19-21, 24-25) plus 8 semantic rules (8, 12, 16, 18, 22, 23, 26-27) that are intentionally absent from the Python linter. Rule numbers are not contiguous because semantic rules were explicitly removed from automation (ADR 0002).

- Dim 3 is correctly classified as hybrid: deterministic in Python, LLM-judged via SKILL.md triage for the semantic slice. This is a deliberate architectural choice documented in ADR 0002, not an oversight.

- The delegation to `skills-ref` for Rule 1 is the key design point for dim 7. The linter does not re-implement frontmatter field requirements; it trusts `skills-ref` (Anthropic-authored) as the authoritative validator. This means any agentskills.io spec changes in `skills-ref` are automatically picked up without changes to the linter itself.

- Plugin mode is triggered automatically by `.claude-plugin/plugin.json` presence - no flag needed. In plugin mode, per-skill rules run for each `skills/*/` entry and findings from shared artifacts (README, LICENSE, CI) are deduplicated.

- The repo was created 2026-02-12 and reached v0.15.1 by 2026-05-19, indicating active but short-lived development (about 3.5 months to 15 minor versions). Co-authored commits with "claude" suggest AI-assisted development.

- There is no evidence of prompt-injection or secret-scanning checks. The tool's security posture is zero for those dimensions.

## Open items

- The exact field list that `skills-ref` enforces for Rule 1 (required vs. optional frontmatter fields) is not visible from this tool's source alone; it requires reading the `skills-ref` package source or docs directly. The profile treats Rule 1 coverage as Medium confidence for that reason.

- Whether `npx skills add` is the canonical install CLI for the agentskills.io ecosystem (who maintains it, where it lives) was not verified from a primary source in this pass. ADR 0003 references it as the recommended approach; the tool's README lists it first, but the `npx skills` CLI itself was not fetched.

- Rule 20 (triage semantic balance) is listed as INFO severity and flags workflows with 3+ numbered steps that lack `ask:` or `"read X and ask"` prompts - this is a heuristic proxy for the semantic-review gap. Whether this constitutes a genuine "hybrid" trigger or merely an INFO nudge is a judgment call; the profile counts the semantic rules (8, 12, 16, 18, 22, 23, 26, 27) as the primary hybrid evidence rather than Rule 20.
