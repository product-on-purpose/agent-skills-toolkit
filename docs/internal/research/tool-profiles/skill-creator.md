---
tool: skill-creator
repo: https://github.com/anthropics/skills/tree/main/skills/skill-creator
author: Anthropic, PBC
license: Apache-2.0
last_verified: 2026-06-10
primary_sources:
  - https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
  - https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/package_skill.py
  - https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_loop.py
  - https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_eval.py
  - https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/aggregate_benchmark.py
  - https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py
  - https://github.com/anthropics/skills/blob/main/skills/skill-creator/eval-viewer/generate_review.py
  - https://github.com/anthropics/skills/blob/main/README.md
  - https://github.com/anthropics/skills/blob/main/.claude-plugin/marketplace.json
  - https://agentskills.io/specification
---

# skill-creator - profile

skill-creator is Anthropic's official meta-skill for authoring, iterating, and packaging Agent Skills. It lives inside the `anthropics/skills` repository as a first-party example skill alongside the document and API skills. Its job is to guide the Claude agent (and the human working with it) through the full skill-development loop: intent capture, drafting, parallel eval runs (with-skill vs. baseline), HTML eval-viewer review, LLM-driven description optimization via `run_loop.py`, and final packaging into a distributable `.skill` file. The eval tooling measures timing and token usage per run and exposes both in a browser-based viewer. Source: `skills/skill-creator/SKILL.md` (fetched 2026-06-10 via GitHub API).

## Dimensions

1. **Unit of evaluation:** Per-skill - the authoring loop and eval harness operate on one skill at a time. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) (Confidence: High)

2. **Tiered and climbable:** None - skill-creator is an authoring tool, not a grader. It has no tiers, no scores, and no burndown. The iterative improvement loop runs until the user is satisfied or feedback is empty, not against a rubric. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) (Confidence: High)

3. **Verdict basis:** Not applicable - skill-creator produces a skill artifact, not a verdict. The tool runs LLM-judge subagents (grader.md, comparator.md) to evaluate assertion pass/fail during iteration, and uses Claude via `claude -p` to test trigger rates in `run_eval.py`, but it renders no quality verdict on the finished skill. That grading is informational for the author, not a gate. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) (Confidence: High)

4. **Lifecycle coverage:** Author/scaffold only. skill-creator covers: intent capture, skill drafting (SKILL.md + optional scripts/references/assets), eval setup (evals.json), iterative testing and improvement, description optimization, and packaging to `.skill`. It does not cover publishing to a registry, versioning policy enforcement, deprecation, or governance. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) (Confidence: High)

5. **Cross-agent emission:** Single-format native. The packager (`package_skill.py`) produces a `.skill` file (a ZIP archive). The README lists Claude Code plugin install and the Claude.ai upload path as the two consumption channels, both consuming the same `.skill` format. No Codex, Gemini, or other agent format is produced. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/package_skill.py) (Confidence: High)

6. **Self-proving / dogfooded:** No CI gate found. skill-creator ships as a skill inside `anthropics/skills` and could in principle be run against itself, but no `.github/workflows` or automated test runs of skill-creator against its own SKILL.md appear in the repo. The `quick_validate.py` bundled inside skill-creator's own `scripts/` is invoked by `package_skill.py` at packaging time (syntax + frontmatter validation only), and the marketplace.json lists skill-creator in the `example-skills` plugin bundle. That is basic distribution inclusion, not CI-driven dogfooding. (Confidence: Medium - absence inference from repo structure scan)

7. **Target spec(s):** Claude-extended and agentskills.io base. The `quick_validate.py` enforces the agentskills.io spec constraints (name kebab-case, max 64 chars; description max 1024 chars). The SKILL.md body and the `run_eval.py` eval mechanism are specific to Claude Code's `claude -p` CLI and the Skill/Read tool-use detection pattern. SKILL.md explicitly calls out Claude.ai vs. Claude Code vs. Cowork behavioral differences. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py) [source](https://agentskills.io/specification) (Confidence: High)

8. **Validation depth:** Frontmatter-quality only (at packaging time). `quick_validate.py`, run by `package_skill.py`, checks: SKILL.md presence, valid YAML frontmatter, required `name` and `description` fields, allowed top-level keys, kebab-case name format, name max 64 chars, description max 1024 chars, no angle brackets in description, compatibility max 500 chars. It does not validate body content, referenced file existence, script syntax, or bundle integrity beyond these structural rules. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py) (Confidence: High)

9. **Versioning support:** Metadata.version only (optional). The agentskills.io spec provides an optional `metadata` map that can carry an author-supplied `version` string; this is not enforced or validated beyond being a valid key-value pair. skill-creator's own SKILL.md frontmatter carries no `metadata.version`. There is no semver enforcement, no contract-lock, and no provenance mechanism in the packaging or eval tooling. [source](https://agentskills.io/specification) (Confidence: High)

10. **Eval / test scaffolding:** Strong eval-driven iteration. The eval harness is the tool's central differentiator. Key verified behaviors from primary sources:
    - Parallel with-skill AND baseline subagent runs launched in the same turn for each test case (SKILL.md, "Step 1")
    - `timing.json` captures `total_tokens` and `duration_ms` from each subagent notification (SKILL.md, "Step 3")
    - `aggregate_benchmark.py` computes mean +/- stddev and delta across configurations
    - `run_eval.py` runs trigger-rate tests via `claude -p --output-format stream-json`, detecting Skill/Read tool-use in the event stream
    - `run_loop.py` implements a 60/40 train/test split eval optimization loop: each iteration calls `run_eval.py` then `improve_description.py`, selects best description by held-out test score to prevent overfitting, up to 5 iterations by default
    - `eval-viewer/generate_review.py` produces a browser-based HTML viewer with Outputs and Benchmark tabs; `--static` flag for headless/Cowork environments
    - Blind A/B comparison via `agents/comparator.md` is available but optional
    [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_loop.py) [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_eval.py) (Confidence: High)

11. **Security posture:** Principle-of-lack-of-surprise stated in SKILL.md. The SKILL.md includes an explicit section forbidding malware, exploit code, content designed to facilitate unauthorized access or data exfiltration, and misleading skills. No automated secret-scan, prompt-injection guard, or sandbox mechanism is implemented in the tooling itself. The stated policy is author-side intent enforcement, not toolchain enforcement. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) (Confidence: High)

12. **Output formats:** HTML + JSON. The eval-viewer outputs an HTML page (`generate_review.py` or `--static` standalone file). `run_loop.py` outputs JSON (`results.json` with best_description, history, scores). `aggregate_benchmark.py` produces `benchmark.json` and `benchmark.md`. The `.skill` packaging output is a ZIP archive. No SARIF, no GitHub annotations. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_loop.py) [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/aggregate_benchmark.py) (Confidence: High)

13. **Packaging / install:** Two paths. (1) Skill install via Claude Code plugin marketplace: `git` - run `/plugin marketplace add anthropics/skills` then select the `example-skills` plugin bundle, which includes skill-creator. (2) Manual `.skill` file: `python -m scripts.package_skill <skill-folder>` produces a ZIP-based `.skill` file the user can upload to Claude.ai or install in Claude Code directly. GH Action-based install is not present. [source](https://github.com/anthropics/skills/blob/main/README.md) [source](https://github.com/anthropics/skills/blob/main/.claude-plugin/marketplace.json) (Confidence: High)

14. **Maturity signal:** The `anthropics/skills` repository (which contains skill-creator as one of ~17 skills) had 148,952 stars and 17,569 forks as of 2026-06-10, last pushed 2026-06-09T20:35:19Z, created 2025-09-22. IMPORTANT CAVEAT: this star count is for the entire `anthropics/skills` repo, not for skill-creator alone. The repo has no GitHub releases (releases API returned empty); distribution is via the plugin marketplace and direct git. [source](https://github.com/anthropics/skills) (Confidence: High-dated-snapshot)

15. **Governance / standing:** First-party. skill-creator is authored and maintained by Anthropic (copyright Anthropic, PBC; Apache-2.0 license confirmed in `skills/skill-creator/LICENSE.txt`). The parent repo README states "This repository contains Anthropic's implementation of skills for Claude." The agentskills.io spec it targets is separately governed (spec copyright statement references agentskills/agentskills; not AAIF-governed as of this verification). [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/LICENSE.txt) [source](https://github.com/anthropics/skills/blob/main/README.md) (Confidence: High)

16. **Provenance taxonomy (separates portable-objective from house conventions?):** No formal taxonomy. skill-creator does not distinguish between portable agentskills.io-compliant checks and Claude-specific conventions. The `quick_validate.py` enforces only the shared spec rules (name/description constraints). The larger eval and trigger-testing machinery is explicitly Claude Code-specific (`claude -p` CLI invocation, Skill/Read tool-use stream detection). The SKILL.md body contains Claude.ai-specific and Cowork-specific instruction branches but marks them as such in section headings. No provenance field or labeling separates these concerns in the packaged output. [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py) [source](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) (Confidence: High)

## Notes

**Dim 3 (verdict basis):** skill-creator is explicitly an authoring tool. The question "deterministic vs. LLM-judge vs. hybrid" applies to graders, not scaffolders. Recorded as "not applicable" rather than forcing a value. The description optimization loop (`run_loop.py`) does use Claude as an LLM judge to improve descriptions, and grader subagents judge assertion pass/fail, but neither produces a quality verdict on the finished skill - they are authoring aids.

**Star count caveat (dim 14):** The 148,952 figure belongs to `anthropics/skills` as a whole. skill-creator is one skill among ~17 in that repo. There is no per-skill star count mechanism on GitHub.

**Spec file:** `spec/agent-skills-spec.md` in the repo is a one-line redirect to `https://agentskills.io/specification`. The actual spec lives at agentskills.io. Verified the 1024-char description cap and name constraints against the live spec page (fetched 2026-06-10).

**Sibling skill - claude-api description over-length observation:** The `claude-api` skill (a sibling in the same repo, not part of skill-creator) has a YAML block-scalar `description` field whose parsed value is 1068 characters (verified via GitHub API fetch and Python `len()` on 2026-06-10). This exceeds the 1024-character limit enforced by both `quick_validate.py` and the agentskills.io spec. The over-length description would fail the packager's own validation gate if `package_skill.py` were run against it. Primary source: `skills/claude-api/SKILL.md` fetched via `gh api repos/anthropics/skills/contents/skills/claude-api/SKILL.md` on 2026-06-10.

**No GitHub releases:** The repo ships no tagged releases. Distribution is via the `.claude-plugin/marketplace.json` plugin registry and direct `.skill` packaging.

**eval-viewer:** The viewer at `eval-viewer/generate_review.py` is a Python HTTP server that serves `eval-viewer/viewer.html`. The `--static` flag writes a self-contained HTML file for headless use. The SKILL.md explicitly warns against writing custom HTML instead of using `generate_review.py`.

**Claude.ai limitations:** The SKILL.md documents that on Claude.ai (no subagents), parallel baseline runs and the description optimization loop (`run_loop.py` requires `claude -p`) are both unavailable. The iteration loop degrades to sequential qualitative review only.

## Open items

- **Does skill-creator run in CI against its own SKILL.md?** No CI config was found in `.github/workflows/` (the repo has no releases and no visible workflow files surfaced via the GitHub API contents endpoint). Closing this item would require fetching `.github/workflows/` directly - the absence is inferred, not confirmed by reading a workflows directory.
- **Does `run_eval.py` capture token counts for benchmark aggregation?** The `timing.json` schema (captured from subagent notifications in SKILL.md step 3) stores `total_tokens` and `duration_ms`. How these flow into `aggregate_benchmark.py` was not fully traced in `aggregate_benchmark.py` (the full file was not read end-to-end). The benchmark JSON schema is described in `references/schemas.md` which was not fetched. Token aggregation behavior is asserted as present from the SKILL.md description of `aggregate_benchmark.py` output ("pass_rate, time, and tokens for each configuration, with mean +/- stddev and the delta") - Medium confidence.
