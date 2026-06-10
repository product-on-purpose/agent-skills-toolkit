---
tool: <name>
repo: <url>
author: <person/org>
license: <SPDX or "unknown">
last_verified: <YYYY-MM-DD>
primary_sources:
  - <url>
  - <url>
---

# <tool> - profile

One-paragraph summary of what the tool is and who makes it, sourced.

## Dimensions

1. **Unit of evaluation:** <per-skill | per-plugin | whole-library>. [source](url) (Confidence: High)
2. **Tiered and climbable:** <none | pass-fail | score | tiered-with-burndown>. [source](url) (Confidence: High)
3. **Verdict basis:** <deterministic | LLM-judge | hybrid>. [source](url) (Confidence: High)
4. **Lifecycle coverage:** <author/validate/version/release/deprecate/govern - which>. [source](url) (Confidence: High)
5. **Cross-agent emission:** <none | single-format | multi-format native>. [source](url) (Confidence: High)
6. **Self-proving / dogfooded:** <does it grade itself / run its own gate in CI>. [source](url) (Confidence: High)
7. **Target spec(s):** <agentskills.io base | Claude-extended | Codex | Gemini | multi>. [source](url) (Confidence: High)
8. **Validation depth:** <syntax | frontmatter-quality | refs+budget | strict-CI | manifest-vs-disk>. [source](url) (Confidence: High)
9. **Versioning support:** <none | metadata.version | semver-enforced | contract-lock | provenance>. [source](url) (Confidence: High)
10. **Eval / test scaffolding:** <none | evals.json | should-trigger | regression | adversarial>. [source](url) (Confidence: High)
11. **Security posture:** <none | secret-scan | prompt-injection | sandbox | curl-pipe-bash>. [source](url) (Confidence: High)
12. **Output formats:** <human | JSON | SARIF | GH-annotations | HTML>. [source](url) (Confidence: High)
13. **Packaging / install:** <manual | git | npx-CLI | marketplace | GH Action>. [source](url) (Confidence: High)
14. **Maturity signal:** <stars / releases / last-commit, dated>. [source](url) (Confidence: High-dated-snapshot)
15. **Governance / standing:** <first-party | community | foundation-track>. [source](url) (Confidence: High)
16. **Provenance taxonomy (separates portable-objective from house conventions?):** <yes/no, detail>. [source](url) (Confidence: High)

## Notes

Caveats, divergences, things checked and found absent.

## Open items

Claims not verifiable in a primary source, and what would close them.
