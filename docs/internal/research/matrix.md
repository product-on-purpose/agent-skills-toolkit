# Comparison matrix (sourced)

> Every cell is distilled from the dated profile in `tool-profiles/<tool>.md` and
> carries that profile's citation + confidence. This file is a PROJECTION of the
> profiles; regenerate it when a profile changes (see REFRESH.md). Do not hand-edit
> a cell without updating its profile first.

last_verified: 2026-06-10

## At a glance (the differentiators)

| Tool | Unit of evaluation | Tiered & climbable | Verdict basis | Cross-agent emission | Self-proving |
|---|---|---|---|---|---|
| agent-skills-toolkit | whole-library | tiered-with-burndown | deterministic | multi-format native | yes (self-validates in CI) |
| ccpi | per-plugin | score + badge tiers | hybrid (deterministic gate + advisory LLM) | single-format (Claude) | yes (CI self-grades) |
| plugin-eval | per-skill (per-plugin static-only) | score + badge tiers | hybrid (3-layer + LLM judge) | multi-format native (5 harnesses) | partial |
| skill-check | per-skill | score, no tiers | deterministic | none | no |
| skills-check | per-skill | pass/fail + severity thresholds | hybrid (deterministic core + optional LLM) | none | not confirmed |
| skills-validator | per-skill | pass/fail + 4 severity tiers | deterministic | none | not confirmed |
| agent-skill-linter | per-skill | pass/fail | hybrid (mechanical + semantic LLM) | none | yes |
| skills-ref | per-skill | pass/fail | deterministic | none | not as CI gate (M) |
| skill-creator | per-skill | none (authoring tool) | n/a (authoring tool) | single-format (.skill) | no CI gate (M) |
| vercel-skills-cli | per-skill | n/a (package manager) | n/a (no verdict) | multi-format native (80 agents) | no |

## Full matrix

| Dimension | agent-skills-toolkit | ccpi | plugin-eval | skill-check | skills-check | skills-validator | agent-skill-linter | skills-ref | skill-creator | vercel-skills-cli |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 Unit of evaluation | whole-library | per-plugin | per-skill (per-plugin static-only) | per-skill | per-skill | per-skill | per-skill (plugin-batch mode) | per-skill | per-skill | per-skill |
| 2 Tiered & climbable | tiered-with-burndown (Bronze/Silver/Gold) | score + badge tiers (Gold/Silver/Bronze) | score + badge tiers (Bronze/Silver/Gold/Platinum) | score, no tiers | pass/fail + severity thresholds | pass/fail + 4 severity tiers (--strict) | pass/fail (3 severities) | pass/fail | none (authoring tool) | n/a (package manager) |
| 3 Verdict basis | deterministic (model-free gate) | hybrid (deterministic gate + advisory LLM) | hybrid (static + LLM judge + Monte Carlo) | deterministic | hybrid (deterministic core + optional LLM) | deterministic | hybrid (mechanical + semantic LLM) | deterministic | n/a (authoring tool) | n/a (no verdict) |
| 4 Lifecycle coverage | author+validate+version+release+deprecate+govern | author+validate+version+release (M) | evaluate+certify | author only | author+validate+version+release (M) | author+validate | author+validate | validate only | author/scaffold only | author+install+update+remove |
| 5 Cross-agent emission | multi-format native (Claude Code + Codex from one library.json) | single-format (Claude only) | multi-format native (5 harnesses, via parent repo) | none | none | none | none | none | single-format (.skill) | multi-format native (80 agents) |
| 6 Self-proving / dogfooded | yes (self-validates at Gold in CI) | yes (CI self-grades) | partial | no | not confirmed | not confirmed | yes (CI validate job) | not as CI gate (M) | no CI gate (M) | no |
| 7 Target spec(s) | agentskills.io base + Claude-extended + Codex | agentskills.io + Claude-extended | Claude Code + Codex portability | house spec (M) | agentskills.io base | agentskills.io (Claude + OpenCode) | agentskills.io (via skills-ref) | agentskills.io base only | Claude-extended + agentskills.io base | none enforced (M) |
| 8 Validation depth | strict-CI + manifest-vs-disk (29-check spine) | frontmatter + refs + manifest-vs-disk (score advisory) | frontmatter + refs + harness-portability + strict-CI | frontmatter + refs + budget | strict-CI + frontmatter + refs + budget | deep 5-pass pipeline | frontmatter + refs + budget + manifest-vs-disk | frontmatter + structure (base spec) | frontmatter only (at packaging) | minimal frontmatter syntax |
| 9 Versioning support | semver-enforced + provenance | semver-enforced (auto-bump) | none for skills (M) | none | semver-enforced (LLM/heuristic diff) | none | metadata-version presence (M) | none | metadata.version only | lockfile + pinned ref (no semver) |
| 10 Eval / test scaffolding | regression + behavioral (opt-in LLM-judge) | none (UI tests only) | yes (comprehensive: judge + Monte Carlo) | none | yes (eval suites + rubric grading) | none (M) | none | none | strong (eval-driven iteration loop) | none |
| 11 Security posture | secret-scan (U11) + least-privilege settings; no curl-pipe-bash scan | secret-scan + unicode + pattern-scan | none dedicated | delegated external scan (mcp-scan) | multi-layer (injection + dangerous-cmd + pkg + URL) | solid (semgrep + CodeQL + cargo-deny) | none | none | author-side policy only | minimal advisory only |
| 12 Output formats | human + HTML + Markdown report; no SARIF | human + JSON; no SARIF | JSON + Markdown + HTML | text + JSON + SARIF + HTML + GH-annotations | human + JSON + Markdown + SARIF | human + JSON; no SARIF | human + JSON | human + JSON + XML | HTML + JSON | human terminal only |
| 13 Packaging / install | marketplace + plugin bundle | npx-CLI + marketplace + GH Action | Python package via uv (monorepo) | npx-CLI + GH Action + Homebrew | npx-CLI + GH Action | Cargo (binstall / install) | npx skills add (no published pkg) | manual local pip (editable) | marketplace + .skill package | npx-CLI package manager |
| 14 Maturity signal | v1.5.0, 358 tests, gate 0/0 (2026-06-10) | 2,300 stars, v4.33.0 | 36,608 stars, v0.1.0 | 179 stars, v1.2.0 | 9 stars, v1.2.1 | 2 stars, v0.2.1 | 7 stars, v0.15.1 | 20,263 stars (repo) | 148,952 stars (repo) | 22k stars, v1.5.10 |
| 15 Governance / standing | first-party (Product on Purpose), community-open | community single-vendor | community single-maintainer | community single-maintainer | community single-maintainer (Vercel-affil) | community solo | community individual | first-party reference (Anthropic-originated) | first-party (Anthropic) | first-party (Vercel) |
| 16 Provenance taxonomy | yes (objective/vendor-cited/house, ADR 0029) | no (M) | partial (M) | no | partial (M) | partial/implicit (M) | partial (M) | n/a (no house layer) | no | n/a (package manager) |

> Competitor cells trace to `tool-profiles/<tool>.md` (each carries its own per-cell citation and confidence); the agent-skills-toolkit row traces to its `STANDARD.md`, its check files, and ADR 0029 (provenance taxonomy). " (M)" marks a cell the source profile rated Medium confidence; " (unverified)" marks Low / unverified. This matrix is a projection - do not hand-edit a cell without first updating its profile.

## What the matrix shows

Across the ten tools, only agent-skills-toolkit combines all six structural traits at once: whole-library unit, tiered-with-burndown advancement, a deterministic (model-free) gate, multi-format native emission, self-proving in CI, and an explicit provenance taxonomy. ccpi is the closest comparator - it grades with a tiered score and badge and ships a package manager - but its 100-point score is advisory rather than a blocking gate, it emits a single (Claude) format, and it does not separate portable-spec findings from house conventions. plugin-eval is the only other multi-harness emitter, but it grades per-skill with an additive LLM-judge and Monte Carlo layer rather than a deterministic library verdict. skills-ref is the base-spec floor every other tool sits above and is self-described as "for demonstration purposes only," not a production gate. The Vercel skills CLI is the adoption leader by downloads yet ships no grading at all - its proposed `skills validate` command was closed unmerged. The genuine contrasts are therefore in the combination, not in any single dimension where several tools overlap.
